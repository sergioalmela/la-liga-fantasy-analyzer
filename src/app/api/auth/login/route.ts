import { type NextRequest, NextResponse } from 'next/server'
import { PENDING_LOGIN_COOKIE_NAME } from '@/lib/auth-session'
import { signInWithPassword } from '@/lib/laliga-form-login'
import {
  parseAuthorizationRedirect,
  parsePendingLogin,
  statesMatch,
} from '@/lib/laliga-oauth'
import {
  clearPendingLoginCookie,
  exchangeAuthorizationCode,
  type SessionTokens,
  setSessionCookies,
} from '@/lib/laliga-session'
import { limitLogin } from '@/lib/login-rate-limit'
import { isSameOriginRequest } from '@/lib/request-origin'

const MAX_BODY_BYTES = 8 * 1024

function noStoreJson(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  })
}

function loginError(code: string, error: string, status: number) {
  return noStoreJson({ error, code }, status)
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isSameOriginRequest(request, true)) {
    return noStoreJson({ error: 'Request origin is not allowed' }, 403)
  }

  const retryAfter = limitLogin(
    request.headers,
    process.env.TRUST_PROXY_IP === 'true'
  )
  if (retryAfter) {
    const response = loginError('rate_limited', 'Too many login attempts', 429)
    response.headers.set('Retry-After', String(retryAfter))
    return response
  }

  const contentLength = Number(request.headers.get('content-length') || '0')
  if (contentLength > MAX_BODY_BYTES) {
    return noStoreJson({ error: 'Request body is too large' }, 413)
  }

  let body: unknown
  try {
    const rawBody = await request.text()
    if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
      return noStoreJson({ error: 'Request body is too large' }, 413)
    }
    body = JSON.parse(rawBody)
  } catch {
    return noStoreJson({ error: 'Invalid request body' }, 400)
  }

  if (body && typeof body === 'object') {
    if ('redirectUrl' in body && typeof body.redirectUrl === 'string') {
      return completeRedirectLogin(request, body.redirectUrl)
    }
    if (
      'email' in body &&
      'password' in body &&
      typeof body.email === 'string' &&
      typeof body.password === 'string'
    ) {
      return completePasswordLogin(request, body.email.trim(), body.password)
    }
  }

  return noStoreJson({ error: 'Email and password are required' }, 400)
}

async function completePasswordLogin(
  request: NextRequest,
  email: string,
  password: string
): Promise<NextResponse> {
  if (!email || email.length > 320 || !password || password.length > 1024) {
    return loginError('invalid_credentials', 'Invalid credentials', 400)
  }

  const result = await signInWithPassword(email, password, request.signal)
  if (result.status === 'ok') return sessionResponse(result)
  if (result.status === 'invalid_credentials') {
    return loginError('invalid_credentials', 'Invalid credentials', 401)
  }
  return result.status === 'rate_limited'
    ? loginError('rate_limited', 'Too many login attempts', 429)
    : loginError(
        'provider_unavailable',
        'Authentication provider is unavailable',
        502
      )
}

async function completeRedirectLogin(
  request: NextRequest,
  redirectUrl: string
): Promise<NextResponse> {
  const redirect = parseAuthorizationRedirect(redirectUrl)
  if (redirect.kind === 'denied') {
    return loginError('login_cancelled', 'Login was cancelled', 400)
  }
  if (redirect.kind === 'invalid') {
    return loginError('invalid_redirect', 'Invalid redirect URL', 400)
  }

  const pendingLogin = parsePendingLogin(
    request.cookies.get(PENDING_LOGIN_COOKIE_NAME)?.value
  )
  if (!pendingLogin || !statesMatch(pendingLogin.state, redirect.state)) {
    return loginError('login_expired', 'Login attempt has expired', 400)
  }

  const result = await exchangeAuthorizationCode(
    redirect.code,
    pendingLogin.verifier,
    request.signal
  )
  if (result.status === 'ok') return sessionResponse(result)

  const response =
    result.status === 'rejected'
      ? loginError('login_rejected', 'Login code was rejected', 401)
      : result.status === 'rate_limited'
        ? loginError('rate_limited', 'Too many login attempts', 429)
        : loginError(
            'provider_unavailable',
            'Authentication provider is unavailable',
            502
          )
  if (result.status === 'rejected') clearPendingLoginCookie(response)
  return response
}

function sessionResponse(tokens: SessionTokens): NextResponse {
  const response = noStoreJson({ authenticated: true })
  setSessionCookies(response, tokens)
  clearPendingLoginCookie(response)
  return response
}
