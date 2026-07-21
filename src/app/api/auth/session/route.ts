import { type NextRequest, NextResponse } from 'next/server'
import { AUTH_COOKIE_NAME, getTokenLifetimeSeconds } from '@/lib/auth-session'
import { isSameOriginRequest } from '@/lib/request-origin'

function response(authenticated: boolean): NextResponse {
  return NextResponse.json(
    { authenticated },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}

export function GET(request: NextRequest): NextResponse {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value
  const authenticated = Boolean(token && getTokenLifetimeSeconds(token))
  const result = response(authenticated)

  if (token && !authenticated) {
    result.cookies.delete(AUTH_COOKIE_NAME)
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
  result.cookies.delete(AUTH_COOKIE_NAME)
  return result
}
