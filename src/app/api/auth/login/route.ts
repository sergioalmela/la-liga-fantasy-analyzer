import { type NextRequest, NextResponse } from 'next/server'
import {
  AUTH_COOKIE_NAME,
  getTokenLifetimeSeconds,
  getTokenPayload,
} from '@/lib/auth-session'

const CLIENT_ID = 'af88bcff-1157-40a0-b579-030728aacf0b'
const TOKEN_URL =
  'https://login.laliga.es/laligadspprob2c.onmicrosoft.com/oauth2/v2.0/token?p=B2C_1A_ResourceOwnerv2'
const EXPECTED_ISSUER =
  'https://login.laliga.es/335316eb-f606-4361-bb86-35a7edddcec1/v2.0/'
const MAX_BODY_BYTES = 8 * 1024

function noStoreJson(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  })
}

function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin')
  return !origin || origin === request.nextUrl.origin
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isSameOrigin(request)) {
    return noStoreJson({ error: 'Request origin is not allowed' }, 403)
  }

  const contentLength = Number(request.headers.get('content-length') || '0')
  if (contentLength > MAX_BODY_BYTES) {
    return noStoreJson({ error: 'Request body is too large' }, 413)
  }

  let credentials: unknown
  try {
    const rawBody = await request.text()
    if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
      return noStoreJson({ error: 'Request body is too large' }, 413)
    }
    credentials = JSON.parse(rawBody)
  } catch {
    return noStoreJson({ error: 'Invalid request body' }, 400)
  }

  if (
    !credentials ||
    typeof credentials !== 'object' ||
    !('email' in credentials) ||
    !('password' in credentials) ||
    typeof credentials.email !== 'string' ||
    typeof credentials.password !== 'string'
  ) {
    return noStoreJson({ error: 'Email and password are required' }, 400)
  }

  const email = credentials.email.trim()
  const password = credentials.password
  if (!email || email.length > 320 || !password || password.length > 1024) {
    return noStoreJson({ error: 'Invalid credentials' }, 400)
  }

  try {
    const upstream = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'password',
        client_id: CLIENT_ID,
        scope: `openid ${CLIENT_ID} offline_access`,
        redirect_uri: 'authredirect://com.lfp.laligafantasy',
        username: email,
        password,
        response_type: 'id_token',
      }),
      cache: 'no-store',
    })

    if (!upstream.ok) {
      return noStoreJson(
        { error: 'Authentication failed' },
        upstream.status === 429 ? 429 : 401
      )
    }

    const payload = (await upstream.json()) as Record<string, unknown>
    const accessToken = payload.access_token
    if (typeof accessToken !== 'string') {
      return noStoreJson({ error: 'Authentication provider failed' }, 502)
    }

    const tokenPayload = getTokenPayload(accessToken)
    const maxAge = getTokenLifetimeSeconds(accessToken)
    const notBefore = tokenPayload?.nbf
    const now = Math.floor(Date.now() / 1000)
    if (
      !maxAge ||
      tokenPayload?.aud !== CLIENT_ID ||
      tokenPayload.iss !== EXPECTED_ISSUER ||
      (typeof notBefore === 'number' && notBefore > now + 60)
    ) {
      return noStoreJson({ error: 'Authentication provider failed' }, 502)
    }

    const response = noStoreJson({ authenticated: true })
    response.cookies.set(AUTH_COOKIE_NAME, accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge,
    })
    return response
  } catch {
    return noStoreJson({ error: 'Authentication provider is unavailable' }, 502)
  }
}
