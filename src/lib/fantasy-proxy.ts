import { FANTASY_COMPETITION_ID } from '../config/fantasy-api.ts'

const SEGMENT = '[A-Za-z0-9_-]+'
const COMPETITION_PATH = `/v1/competition/${FANTASY_COMPETITION_ID}`

const READ_PATHS = [
  /^\/v4\/user\/me$/,
  /^\/v3\/teams-master$/,
  new RegExp(`^${COMPETITION_PATH}/leagues$`),
  new RegExp(
    `^${COMPETITION_PATH}/leagues/${SEGMENT}/standing(?:/${SEGMENT})?$`
  ),
  new RegExp(`^${COMPETITION_PATH}/leagues/${SEGMENT}/activity/${SEGMENT}$`),
  new RegExp(`^${COMPETITION_PATH}/leagues/${SEGMENT}/teams/${SEGMENT}$`),
  new RegExp(`^${COMPETITION_PATH}/teams/${SEGMENT}/money$`),
  new RegExp(
    `^${COMPETITION_PATH}/teams/${SEGMENT}/lineup(?:/week/${SEGMENT})?$`
  ),
  new RegExp(`^${COMPETITION_PATH}/league/${SEGMENT}/market$`),
  new RegExp(`^${COMPETITION_PATH}/players$`),
  new RegExp(`^${COMPETITION_PATH}/player/${SEGMENT}/league/${SEGMENT}$`),
  new RegExp(`^${COMPETITION_PATH}/week/current$`),
  new RegExp(`^${COMPETITION_PATH}/calendar$`),
  new RegExp(
    `^/stats/v1/competition/${FANTASY_COMPETITION_ID}/stats/week/${SEGMENT}$`
  ),
]

const ALLOWED_QUERY_PARAMETERS = new Set(['weekNumber', 'x-lang'])

export function getAllowedFantasyPath(
  rawPath: string | null,
  method: string
): string | null {
  if (!rawPath || method !== 'GET') return null

  const withoutApiPrefix = rawPath.startsWith('/api/')
    ? rawPath.slice(4)
    : rawPath

  if (!withoutApiPrefix.startsWith('/') || withoutApiPrefix.includes('\\')) {
    return null
  }

  if (withoutApiPrefix.includes('..')) return null

  let parsed: URL
  try {
    parsed = new URL(withoutApiPrefix, 'https://fantasy-proxy.invalid')
  } catch {
    return null
  }

  if (parsed.origin !== 'https://fantasy-proxy.invalid') return null
  if (!READ_PATHS.some((pattern) => pattern.test(parsed.pathname))) return null

  const seenQueryParameters = new Set<string>()
  for (const [key, value] of parsed.searchParams.entries()) {
    if (!ALLOWED_QUERY_PARAMETERS.has(key)) return null
    if (seenQueryParameters.has(key)) return null
    if (key === 'x-lang' && value !== 'es') return null
    if (key === 'weekNumber' && !/^\d+$/.test(value)) return null
    seenQueryParameters.add(key)
  }

  return `${parsed.pathname}${parsed.search}`
}

export async function preserveUpstreamResponse(
  upstream: Response
): Promise<Response> {
  const body = await upstream.text()
  const headers = new Headers({ 'Cache-Control': 'no-store' })
  const contentType = upstream.headers.get('content-type')

  if (contentType) headers.set('Content-Type', contentType)

  return new Response(body || null, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers,
  })
}
