import { type NextRequest, NextResponse } from 'next/server'
import { PENDING_LOGIN_COOKIE_NAME } from '@/lib/auth-session'
import {
  parseAuthorizationRedirect,
  parsePendingLogin,
  statesMatch,
} from '@/lib/laliga-oauth'
import {
  clearPendingLoginCookie,
  exchangeAuthorizationCode,
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

  if (
    !body ||
    typeof body !== 'object' ||
    !('redirectUrl' in body) ||
    typeof body.redirectUrl !== 'string'
  ) {
    return noStoreJson({ error: 'Redirect URL is required' }, 400)
  }

  const redirect = parseAuthorizationRedirect(body.redirectUrl)
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
  if (result.status !== 'ok') {
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

  const response = noStoreJson({ authenticated: true })
  setSessionCookies(response, result)
  clearPendingLoginCookie(response)
  return response
}
