import type { Player } from '@/entities/player'
import type {
  StartingProbability,
  StartingProbabilityRequestPlayer,
} from '@/lib/starting-probability'

function asStartingProbability(value: unknown): StartingProbability | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const record = value as Record<string, unknown>
  if (
    typeof record.probability !== 'number' ||
    !Number.isInteger(record.probability) ||
    record.probability < 0 ||
    record.probability > 100 ||
    record.sourceName !== 'FútbolFantasy' ||
    typeof record.sourceUrl !== 'string' ||
    !record.sourceUrl.startsWith('https://www.futbolfantasy.com/jugadores/')
  ) {
    return null
  }

  return {
    probability: record.probability,
    sourceName: record.sourceName,
    sourceUrl: record.sourceUrl,
  }
}

export async function getStartingProbabilities(
  players: Player[]
): Promise<Map<string, StartingProbability>> {
  if (players.length === 0) return new Map()

  const requestPlayers: StartingProbabilityRequestPlayer[] = players.map(
    (player) => ({
      id: player.id,
      name: player.name,
      ...(player.nickname ? { nickname: player.nickname } : {}),
      teamId: player.team.id,
      marketValue: player.marketValue,
    })
  )

  try {
    const response = await fetch('/api/starting-probabilities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ players: requestPlayers }),
    })
    if (!response.ok) return new Map()

    const body = (await response.json()) as unknown
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return new Map()
    }
    const probabilities = (body as Record<string, unknown>).probabilities
    if (
      !probabilities ||
      typeof probabilities !== 'object' ||
      Array.isArray(probabilities)
    ) {
      return new Map()
    }

    const parsed = new Map<string, StartingProbability>()
    for (const [playerId, value] of Object.entries(probabilities)) {
      const probability = asStartingProbability(value)
      if (probability) parsed.set(playerId, probability)
    }
    return parsed
  } catch {
    return new Map()
  }
}
