import type { NextRequest } from 'next/server'
import { AUTH_COOKIE_NAME } from '@/lib/auth-session'
import {
  getAllowedFantasyPath,
  preserveUpstreamResponse,
} from '@/lib/fantasy-proxy'

const API_BASE_URL = 'https://fantasy-api.llt-services.com/api'
const MAX_REQUEST_BODY_BYTES = 64 * 1024

async function proxyRequest(request: NextRequest): Promise<Response> {
  const method = request.method.toUpperCase()
  const rawPath = request.nextUrl.searchParams.get('path')
  const path = getAllowedFantasyPath(rawPath, method)

  if (!path) {
    return Response.json(
      { error: 'Fantasy API path or method is not allowed' },
      { status: 403 }
    )
  }

  const contentLength = Number(request.headers.get('content-length') || '0')
  if (contentLength > MAX_REQUEST_BODY_BYTES) {
    return Response.json(
      { error: 'Request body is too large' },
      { status: 413 }
    )
  }

  try {
    const sessionToken = request.cookies.get(AUTH_COOKIE_NAME)?.value
    const authHeader =
      request.headers.get('authorization') ||
      (sessionToken ? `Bearer ${sessionToken}` : null)
    const body = method === 'GET' ? undefined : await request.text()

    if (
      body &&
      new TextEncoder().encode(body).byteLength > MAX_REQUEST_BODY_BYTES
    ) {
      return Response.json(
        { error: 'Request body is too large' },
        { status: 413 }
      )
    }

    const headers = new Headers({ Accept: 'application/json', 'x-lang': 'es' })
    if (authHeader) headers.set('Authorization', authHeader)
    if (body) headers.set('Content-Type', 'application/json')

    const upstream = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body || undefined,
      cache: 'no-store',
    })

    return preserveUpstreamResponse(upstream)
  } catch (error) {
    console.error(
      'Fantasy API proxy request failed',
      error instanceof Error ? error.message : 'Unknown upstream error'
    )
    return Response.json(
      { error: 'Fantasy API is unavailable' },
      { status: 502 }
    )
  }
}

export const GET = proxyRequest
export const POST = proxyRequest
export const PUT = proxyRequest
export const DELETE = proxyRequest
