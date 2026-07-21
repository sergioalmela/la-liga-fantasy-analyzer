import type { NextRequest } from 'next/server'
import { AUTH_COOKIE_NAME } from '@/lib/auth-session'
import {
  getAllowedFantasyPath,
  preserveUpstreamResponse,
  validateFantasyRequestBody,
} from '@/lib/fantasy-proxy'
import { isSameOriginRequest } from '@/lib/request-origin'

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

  if (method !== 'GET' && !isSameOriginRequest(request)) {
    return Response.json(
      { error: 'Request origin is not allowed' },
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
    const rawBody = method === 'GET' ? '' : await request.text()

    if (
      rawBody &&
      new TextEncoder().encode(rawBody).byteLength > MAX_REQUEST_BODY_BYTES
    ) {
      return Response.json(
        { error: 'Request body is too large' },
        { status: 413 }
      )
    }

    if (method !== 'GET' && !authHeader) {
      return Response.json(
        { error: 'Authentication is required' },
        { status: 401 }
      )
    }

    const validatedBody =
      method === 'GET'
        ? { valid: true as const }
        : validateFantasyRequestBody(method, rawBody)
    if (!validatedBody.valid) {
      return Response.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const body = validatedBody.body

    const headers = new Headers({ Accept: 'application/json', 'x-lang': 'es' })
    if (authHeader) headers.set('Authorization', authHeader)
    if (body !== undefined) headers.set('Content-Type', 'application/json')

    const upstream = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body,
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
