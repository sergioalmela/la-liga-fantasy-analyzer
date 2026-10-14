import { type NextRequest, NextResponse } from 'next/server'
import { AUTH_COOKIE_NAME, REFRESH_COOKIE_NAME } from '@/lib/auth-session'
import {
  applyResolvedSession,
  clearPendingLoginCookie,
  clearSessionCookies,
  resolveSession,
} from '@/lib/laliga-session'
import { isSameOriginRequest } from '@/lib/request-origin'

// Renew ahead of expiry so a page load is not followed by failing API calls.
const RENEW_BEFORE_SECONDS = 5 * 60

function response(authenticated: boolean): NextResponse {
  return NextResponse.json(
    { authenticated },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = await resolveSession(request, RENEW_BEFORE_SECONDS)
  const result = response(Boolean(session.token))
  applyResolvedSession(result, session)

  // An expired session without a refresh token cannot be renewed.
  if (
    !session.token &&
    request.cookies.has(AUTH_COOKIE_NAME) &&
    !request.cookies.has(REFRESH_COOKIE_NAME)
  ) {
    clearSessionCookies(result)
  }

  return result
}

export function DELETE(request: NextRequest): NextResponse {
  if (!isSameOriginRequest(request, true)) {
    return NextResponse.json(
      { error: 'Request origin is not allowed' },
      { status: 403, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  const result = response(false)
  clearSessionCookies(result)
  clearPendingLoginCookie(result)
  return result
}
