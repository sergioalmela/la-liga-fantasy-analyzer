import type { NextRequest } from 'next/server'
import { AUTH_COOKIE_NAME } from '@/lib/auth-session'
import { isSameOriginRequest } from '@/lib/request-origin'
import type { StartingProbabilityRequestPlayer } from '@/lib/starting-probability'
import { getStartingProbabilities } from '@/services/futbol-fantasy-service'

const MAX_REQUEST_BODY_BYTES = 128 * 1024
const MAX_PLAYERS = 600

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parsePlayer(value: unknown): StartingProbabilityRequestPlayer | null {
  if (!isRecord(value)) return null

  const { id, name, nickname, teamId, marketValue } = value
  if (
    typeof id !== 'string' ||
    !/^[a-zA-Z0-9_-]{1,64}$/.test(id) ||
    typeof name !== 'string' ||
    name.length < 1 ||
    name.length > 120 ||
    (nickname !== undefined &&
      (typeof nickname !== 'string' || nickname.length > 120)) ||
    typeof teamId !== 'string' ||
    !/^\d{1,4}$/.test(teamId) ||
    typeof marketValue !== 'number' ||
    !Number.isSafeInteger(marketValue) ||
    marketValue < 0
  ) {
    return null
  }

  return {
    id,
    name,
    ...(nickname ? { nickname } : {}),
    teamId,
    marketValue,
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  if (!isSameOriginRequest(request)) {
    return Response.json(
      { error: 'Request origin is not allowed' },
      { status: 403 }
    )
  }
  if (!request.cookies.get(AUTH_COOKIE_NAME)?.value) {
    return Response.json(
      { error: 'Authentication is required' },
      { status: 401 }
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
    const rawBody = await request.text()
    if (new TextEncoder().encode(rawBody).byteLength > MAX_REQUEST_BODY_BYTES) {
      return Response.json(
        { error: 'Request body is too large' },
        { status: 413 }
      )
    }

    const body = JSON.parse(rawBody) as unknown
    if (!isRecord(body) || !Array.isArray(body.players)) {
      return Response.json({ error: 'Invalid request body' }, { status: 400 })
    }
    if (body.players.length > MAX_PLAYERS) {
      return Response.json({ error: 'Too many players' }, { status: 413 })
    }

    const players = body.players.map(parsePlayer)
    if (players.some((player) => player === null)) {
      return Response.json({ error: 'Invalid player data' }, { status: 400 })
    }

    const probabilities = await getStartingProbabilities(
      players as StartingProbabilityRequestPlayer[]
    )
    return Response.json(
      { probabilities },
      { headers: { 'Cache-Control': 'private, no-store' } }
    )
  } catch (error) {
    console.error(
      'Starting-probability request failed:',
      error instanceof Error ? error.message : 'Unknown error'
    )
    return Response.json(
      { error: 'Starting probabilities are unavailable' },
      { status: 502 }
    )
  }
}
