import type { NextRequest, NextResponse } from 'next/server'
import {
  AUTH_COOKIE_NAME,
  getTokenLifetimeSeconds,
  PENDING_LOGIN_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
} from './auth-session.ts'
import {
  getRefreshTokenLifetimeSeconds,
  LALIGA_CLIENT_ID,
  LALIGA_REDIRECT_URI,
  LALIGA_SCOPE,
  LALIGA_TOKEN_URL,
  selectSessionToken,
} from './laliga-oauth.ts'

const TOKEN_TIMEOUT_MS = 15000
const REFRESH_COOKIE_PATH = '/api'
export const PENDING_LOGIN_COOKIE_PATH = '/api/auth'

export interface SessionTokens {
  sessionToken: string
  sessionMaxAge: number
  refreshToken: string | null
  refreshMaxAge: number
}

export type TokenResult =
  | ({ status: 'ok' } & SessionTokens)
  | { status: 'rejected' | 'rate_limited' | 'unavailable' }

async function requestTokens(
  grant: Record<string, string>,
  signal?: AbortSignal
): Promise<TokenResult> {
  try {
    const timeout = AbortSignal.timeout(TOKEN_TIMEOUT_MS)
    const upstream = await fetch(LALIGA_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: LALIGA_CLIENT_ID,
        scope: LALIGA_SCOPE,
        ...grant,
      }),
      cache: 'no-store',
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    })
    const payload = (await upstream.json().catch(() => ({}))) as Record<
      string,
      unknown
    >

    if (upstream.status === 429) return { status: 'rate_limited' }
    if (!upstream.ok) {
      return {
        status: payload.error === 'invalid_grant' ? 'rejected' : 'unavailable',
      }
    }

    const sessionToken = selectSessionToken(payload)
    const sessionMaxAge = sessionToken && getTokenLifetimeSeconds(sessionToken)
    if (!sessionToken || !sessionMaxAge) return { status: 'unavailable' }

    return {
      status: 'ok',
      sessionToken,
      sessionMaxAge,
      refreshToken:
        typeof payload.refresh_token === 'string'
          ? payload.refresh_token
          : null,
      refreshMaxAge: getRefreshTokenLifetimeSeconds(payload),
    }
  } catch {
    return { status: 'unavailable' }
  }
}

export function exchangeAuthorizationCode(
  code: string,
  verifier: string,
  signal?: AbortSignal
): Promise<TokenResult> {
  return requestTokens(
    {
      grant_type: 'authorization_code',
      code,
      code_verifier: verifier,
      redirect_uri: LALIGA_REDIRECT_URI,
    },
    signal
  )
}

// Parallel API calls after expiry share one refresh per token.
const refreshes = new Map<string, Promise<TokenResult>>()

function refreshTokens(refreshToken: string): Promise<TokenResult> {
  let pending = refreshes.get(refreshToken)
  if (!pending) {
    pending = requestTokens({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }).finally(() => refreshes.delete(refreshToken))
    refreshes.set(refreshToken, pending)
  }
  return pending
}

export interface ResolvedSession {
  token: string | null
  renewed?: SessionTokens
  revoked?: boolean
}

/** Returns a usable session token, refreshing it when it is about to expire. */
export async function resolveSession(
  request: NextRequest,
  minLifetimeSeconds: number
): Promise<ResolvedSession> {
  const current = request.cookies.get(AUTH_COOKIE_NAME)?.value || null
  const lifetime = current ? getTokenLifetimeSeconds(current) || 0 : 0
  const token = lifetime > 0 ? current : null
  if (token && lifetime > minLifetimeSeconds) return { token }

  const refreshToken = request.cookies.get(REFRESH_COOKIE_NAME)?.value
  if (!refreshToken) return { token }

  const result = await refreshTokens(refreshToken)
  if (result.status === 'ok') {
    const { status: _status, ...renewed } = result
    return {
      token: renewed.sessionToken,
      renewed: {
        ...renewed,
        refreshToken: renewed.refreshToken ?? refreshToken,
      },
    }
  }
  return result.status === 'rejected'
    ? { token: null, revoked: true }
    : { token }
}

function secure(): boolean {
  return process.env.NODE_ENV === 'production'
}

export function setSessionCookies(
  response: NextResponse,
  tokens: SessionTokens
): void {
  response.cookies.set(AUTH_COOKIE_NAME, tokens.sessionToken, {
    httpOnly: true,
    secure: secure(),
    sameSite: 'strict',
    path: '/',
    maxAge: tokens.sessionMaxAge,
  })
  if (tokens.refreshToken) {
    response.cookies.set(REFRESH_COOKIE_NAME, tokens.refreshToken, {
      httpOnly: true,
      secure: secure(),
      sameSite: 'strict',
      path: REFRESH_COOKIE_PATH,
      maxAge: tokens.refreshMaxAge,
    })
  }
}

export function clearSessionCookies(response: NextResponse): void {
  const expired = { httpOnly: true, secure: secure(), maxAge: 0 }
  response.cookies.set(AUTH_COOKIE_NAME, '', { ...expired, path: '/' })
  response.cookies.set(REFRESH_COOKIE_NAME, '', {
    ...expired,
    path: REFRESH_COOKIE_PATH,
  })
}

export function clearPendingLoginCookie(response: NextResponse): void {
  response.cookies.set(PENDING_LOGIN_COOKIE_NAME, '', {
    httpOnly: true,
    secure: secure(),
    path: PENDING_LOGIN_COOKIE_PATH,
    maxAge: 0,
  })
}

export function applyResolvedSession(
  response: NextResponse,
  session: ResolvedSession
): void {
  if (session.renewed) setSessionCookies(response, session.renewed)
  else if (session.revoked) clearSessionCookies(response)
}
