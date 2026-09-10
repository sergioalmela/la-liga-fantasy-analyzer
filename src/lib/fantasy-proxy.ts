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
  new RegExp(`^${COMPETITION_PATH}/league/${SEGMENT}/market/history$`),
  new RegExp(`^${COMPETITION_PATH}/players$`),
  new RegExp(`^${COMPETITION_PATH}/player/${SEGMENT}/market-value$`),
  new RegExp(`^${COMPETITION_PATH}/player/${SEGMENT}/league/${SEGMENT}$`),
  new RegExp(
    `^${COMPETITION_PATH}/league/${SEGMENT}/playerTeam/${SEGMENT}/offer$`
  ),
  new RegExp(`^${COMPETITION_PATH}/week/current$`),
  new RegExp(`^${COMPETITION_PATH}/calendar$`),
  new RegExp(
    `^/stats/v1/competition/${FANTASY_COMPETITION_ID}/stats/week/${SEGMENT}$`
  ),
]

const WRITE_PATHS: Partial<Record<string, RegExp[]>> = {
  POST: [
    new RegExp(`^${COMPETITION_PATH}/league/${SEGMENT}/market/sell$`),
    new RegExp(`^${COMPETITION_PATH}/league/${SEGMENT}/buyout/${SEGMENT}/pay$`),
    new RegExp(
      `^${COMPETITION_PATH}/league/${SEGMENT}/buyout/${SEGMENT}/increase$`
    ),
    new RegExp(
      `^${COMPETITION_PATH}/league/${SEGMENT}/market/${SEGMENT}/offer/${SEGMENT}/(?:accept|reject)$`
    ),
  ],
  DELETE: [
    new RegExp(
      `^${COMPETITION_PATH}/league/${SEGMENT}/market/${SEGMENT}/delete$`
    ),
  ],
  PUT: [new RegExp(`^${COMPETITION_PATH}/teams/${SEGMENT}/lineup$`)],
}

const ALLOWED_QUERY_PARAMETERS = new Set(['weekNumber', 'x-lang'])

export function getAllowedFantasyPath(
  rawPath: string | null,
  method: string
): string | null {
  if (!rawPath) return null

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

  const normalizedMethod = method.toUpperCase()
  const allowedPatterns =
    normalizedMethod === 'GET' ? READ_PATHS : WRITE_PATHS[normalizedMethod]
  if (!allowedPatterns?.some((pattern) => pattern.test(parsed.pathname))) {
    return null
  }

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

export interface ValidatedRequestBody {
  valid: boolean
  body?: string
}

export function validateFantasyRequestBody(
  method: string,
  rawBody: string,
  path?: string
): ValidatedRequestBody {
  const normalizedMethod = method.toUpperCase()

  if (normalizedMethod === 'DELETE') {
    return rawBody.trim() ? { valid: false } : { valid: true }
  }

  if (normalizedMethod === 'PUT' && path?.includes('/teams/')) {
    try {
      const value = JSON.parse(rawBody) as unknown
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return { valid: false }
      }
      const record = value as Record<string, unknown>
      const keys = Object.keys(record).sort().join(',')
      if (keys !== 'defender,goalkeeper,midfield,striker,tactical_formation') {
        return { valid: false }
      }

      const goalkeeper = record.goalkeeper
      const defender = record.defender
      const midfield = record.midfield
      const striker = record.striker
      const tacticalFormation = record.tactical_formation
      if (
        typeof goalkeeper !== 'string' ||
        !new RegExp(`^${SEGMENT}$`).test(goalkeeper) ||
        !Array.isArray(defender) ||
        !Array.isArray(midfield) ||
        !Array.isArray(striker) ||
        !Array.isArray(tacticalFormation) ||
        tacticalFormation.length !== 3 ||
        !tacticalFormation.every(Number.isSafeInteger)
      ) {
        return { valid: false }
      }

      const [defenders, midfielders, strikers] = tacticalFormation as number[]
      const validFormation = [
        [3, 4, 3],
        [3, 5, 2],
        [4, 3, 3],
        [4, 4, 2],
        [4, 5, 1],
        [5, 3, 2],
        [5, 4, 1],
        [3, 3, 4],
        [3, 6, 1],
        [4, 2, 4],
        [4, 6, 0],
        [5, 2, 3],
      ].some(
        ([d, m, s]) => d === defenders && m === midfielders && s === strikers
      )
      const positionIds = [defender, midfield, striker]
      if (
        !validFormation ||
        defender.length !== defenders ||
        midfield.length !== midfielders ||
        striker.length !== strikers ||
        !positionIds
          .flat()
          .every(
            (id) =>
              typeof id === 'string' && new RegExp(`^${SEGMENT}$`).test(id)
          )
      ) {
        return { valid: false }
      }

      const allPlayerIds = [goalkeeper, ...defender, ...midfield, ...striker]
      if (new Set(allPlayerIds).size !== 11) return { valid: false }

      return {
        valid: true,
        body: JSON.stringify({
          goalkeeper,
          defender,
          midfield,
          striker,
          tactical_formation: tacticalFormation,
        }),
      }
    } catch {
      return { valid: false }
    }
  }

  if (normalizedMethod !== 'POST') return { valid: false }

  if (path?.includes('/offer/') && path.endsWith('/reject?x-lang=es')) {
    return rawBody.trim() ? { valid: false } : { valid: true }
  }

  try {
    const value = JSON.parse(rawBody) as unknown
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return { valid: false }
    }

    const record = value as Record<string, unknown>
    const keys = Object.keys(record).sort()

    if (path?.includes('/buyout/') && path.endsWith('/pay?x-lang=es')) {
      if (keys.join(',') !== 'buyoutClauseToPay') return { valid: false }
      const buyoutClauseToPay = record.buyoutClauseToPay
      if (
        typeof buyoutClauseToPay !== 'number' ||
        !Number.isSafeInteger(buyoutClauseToPay) ||
        buyoutClauseToPay <= 0
      ) {
        return { valid: false }
      }

      return {
        valid: true,
        body: JSON.stringify({ buyoutClauseToPay }),
      }
    }

    if (path?.includes('/buyout/') && path.endsWith('/increase?x-lang=es')) {
      if (keys.join(',') !== 'buyoutClause') return { valid: false }
      const buyoutClause = record.buyoutClause
      if (
        typeof buyoutClause !== 'number' ||
        !Number.isSafeInteger(buyoutClause) ||
        buyoutClause <= 0
      ) {
        return { valid: false }
      }
      return { valid: true, body: JSON.stringify({ buyoutClause }) }
    }

    if (path?.includes('/offer/') && path.endsWith('/accept?x-lang=es')) {
      if (keys.join(',') !== 'offerMoney') return { valid: false }
      const offerMoney = record.offerMoney
      if (
        typeof offerMoney !== 'number' ||
        !Number.isSafeInteger(offerMoney) ||
        offerMoney <= 0
      ) {
        return { valid: false }
      }
      return { valid: true, body: JSON.stringify({ offerMoney }) }
    }

    if (keys.join(',') !== 'playerId,salePrice') return { valid: false }

    const playerId = record.playerId
    const salePrice = record.salePrice
    if (
      typeof playerId !== 'string' ||
      !new RegExp(`^${SEGMENT}$`).test(playerId) ||
      typeof salePrice !== 'number' ||
      !Number.isSafeInteger(salePrice) ||
      salePrice <= 0
    ) {
      return { valid: false }
    }

    return {
      valid: true,
      body: JSON.stringify({ playerId, salePrice }),
    }
  } catch {
    return { valid: false }
  }
}

export async function preserveUpstreamResponse(
  upstream: Response
): Promise<Response> {
  const body = await upstream.text()
  const headers = new Headers({ 'Cache-Control': 'no-store' })
  const contentType = upstream.headers.get('content-type')

  if (contentType) headers.set('Content-Type', contentType)
  const upstreamDate = upstream.headers.get('date')
  if (upstreamDate) headers.set('X-Fantasy-Upstream-Date', upstreamDate)

  return new Response(body || null, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers,
  })
}
