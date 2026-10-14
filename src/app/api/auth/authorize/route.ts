import { type NextRequest, NextResponse } from 'next/server'
import { PENDING_LOGIN_COOKIE_NAME } from '@/lib/auth-session'
import {
  buildAuthorizeUrl,
  createPendingLogin,
  serializePendingLogin,
} from '@/lib/laliga-oauth'
import { PENDING_LOGIN_COOKIE_PATH } from '@/lib/laliga-session'
import { isSameOriginRequest } from '@/lib/request-origin'

const PENDING_LOGIN_MAX_AGE_SECONDS = 15 * 60

export function POST(request: NextRequest): NextResponse {
  if (!isSameOriginRequest(request, true)) {
    return NextResponse.json(
      { error: 'Request origin is not allowed' },
      { status: 403, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  const pendingLogin = createPendingLogin()
  const response = NextResponse.json(
    { url: buildAuthorizeUrl(pendingLogin) },
    { headers: { 'Cache-Control': 'no-store' } }
  )
  response.cookies.set(
    PENDING_LOGIN_COOKIE_NAME,
    serializePendingLogin(pendingLogin),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: PENDING_LOGIN_COOKIE_PATH,
      maxAge: PENDING_LOGIN_MAX_AGE_SECONDS,
    }
  )
  return response
}
