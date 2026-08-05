import 'server-only'

import {
  matchStartingProbability,
  parseStartingProbabilityPage,
  type SourceStartingProbability,
  type StartingProbability,
  type StartingProbabilityRequestPlayer,
} from '@/lib/starting-probability'

const SOURCE_BASE_URL = 'https://www.futbolfantasy.com/laliga/equipos'
const CACHE_TTL_MS = 6 * 60 * 60 * 1_000
const FAILURE_CACHE_TTL_MS = 5 * 60 * 1_000
const FETCH_TIMEOUT_MS = 10_000
const MAX_RESPONSE_BYTES = 2_000_000
const MAX_CONCURRENT_REQUESTS = 4

const TEAM_SLUG_BY_ID: Record<string, string> = {
  '2': 'atletico',
  '3': 'athletic',
  '4': 'barcelona',
  '5': 'betis',
  '6': 'celta',
  '7': 'elche',
  '8': 'espanyol',
  '9': 'getafe',
  '11': 'levante',
  '12': 'malaga',
  '13': 'osasuna',
  '14': 'rayo-vallecano',
  '15': 'real-madrid',
  '16': 'real-sociedad',
  '17': 'sevilla',
  '18': 'valencia',
  '20': 'villarreal',
  '21': 'alaves',
  '26': 'deportivo',
  '49': 'racing',
}

interface CachedTeamProbability {
  expiresAt: number
  promise: Promise<SourceStartingProbability[]>
}

const teamCache = new Map<string, CachedTeamProbability>()

async function fetchTeamProbabilities(
  teamSlug: string
): Promise<SourceStartingProbability[]> {
  const cached = teamCache.get(teamSlug)
  if (cached && cached.expiresAt > Date.now()) return cached.promise

  const promise = (async () => {
    const response = await fetch(`${SOURCE_BASE_URL}/${teamSlug}`, {
      headers: {
        Accept: 'text/html',
        'User-Agent':
          'LaLigaFantasyAnalyzer/1.0 (+https://github.com/sergioalmela/la-liga-fantasy-analyzer)',
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })
    if (!response.ok) {
      throw new Error(`FútbolFantasy returned HTTP ${response.status}`)
    }

    const contentLength = Number(response.headers.get('content-length') || '0')
    if (contentLength > MAX_RESPONSE_BYTES) {
      throw new Error('FútbolFantasy response is too large')
    }

    const html = await response.text()
    if (html.length > MAX_RESPONSE_BYTES) {
      throw new Error('FútbolFantasy response is too large')
    }

    const players = parseStartingProbabilityPage(html)
    if (players.length === 0) {
      throw new Error('FútbolFantasy response did not contain player data')
    }
    return players
  })()

  teamCache.set(teamSlug, {
    expiresAt: Date.now() + CACHE_TTL_MS,
    promise,
  })

  try {
    return await promise
  } catch (error) {
    teamCache.set(teamSlug, {
      expiresAt: Date.now() + FAILURE_CACHE_TTL_MS,
      promise: Promise.resolve([]),
    })
    throw error
  }
}

async function loadRequestedTeams(
  teamSlugs: string[]
): Promise<Map<string, SourceStartingProbability[]>> {
  const teams = new Map<string, SourceStartingProbability[]>()
  let nextIndex = 0

  const worker = async () => {
    while (nextIndex < teamSlugs.length) {
      const teamSlug = teamSlugs[nextIndex]
      nextIndex += 1
      try {
        teams.set(teamSlug, await fetchTeamProbabilities(teamSlug))
      } catch (error) {
        console.warn(
          `Starting-probability source unavailable for ${teamSlug}:`,
          error instanceof Error ? error.message : 'Unknown error'
        )
      }
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(MAX_CONCURRENT_REQUESTS, teamSlugs.length) },
      worker
    )
  )
  return teams
}

export async function getStartingProbabilities(
  players: StartingProbabilityRequestPlayer[]
): Promise<Record<string, StartingProbability>> {
  const teamSlugs = [
    ...new Set(
      players.flatMap((player) => {
        const slug = TEAM_SLUG_BY_ID[player.teamId]
        return slug ? [slug] : []
      })
    ),
  ]
  const sourceTeams = await loadRequestedTeams(teamSlugs)
  const probabilities: Record<string, StartingProbability> = {}

  for (const player of players) {
    const teamSlug = TEAM_SLUG_BY_ID[player.teamId]
    const candidates = teamSlug ? sourceTeams.get(teamSlug) : undefined
    if (!candidates) continue

    const probability = matchStartingProbability(player, candidates)
    if (probability) probabilities[player.id] = probability
  }

  return probabilities
}
