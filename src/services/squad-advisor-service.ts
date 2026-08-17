import type { Player } from '../entities/player.ts'
import type { StartingProbability } from '../lib/starting-probability.ts'
import {
  isMarketTrendBearish,
  type MarketTrend,
} from './market-trend-service.ts'

export const FORMATIONS = {
  '3-4-3': { 1: 1, 2: 3, 3: 4, 4: 3 },
  '3-5-2': { 1: 1, 2: 3, 3: 5, 4: 2 },
  '4-3-3': { 1: 1, 2: 4, 3: 3, 4: 3 },
  '4-4-2': { 1: 1, 2: 4, 3: 4, 4: 2 },
  '4-5-1': { 1: 1, 2: 4, 3: 5, 4: 1 },
  '5-3-2': { 1: 1, 2: 5, 3: 3, 4: 2 },
  '5-4-1': { 1: 1, 2: 5, 3: 4, 4: 1 },
} as const

export type Formation = keyof typeof FORMATIONS
export type SquadPosition = 1 | 2 | 3 | 4

export const MINIMUM_SQUAD: Record<SquadPosition, number> = {
  1: 2,
  2: 5,
  3: 5,
  4: 3,
}

export interface SquadNeed {
  positionId: SquadPosition
  missing: number
}

export interface SellCandidate {
  player: Player
  reasons: Array<
    'outside-lineup' | 'falling' | 'low-probability' | 'unavailable'
  >
}

export interface LineupPayload {
  goalkeeper: string
  defender: string[]
  midfield: string[]
  striker: string[]
  tactical_formation: [number, number, number]
}

function availabilityPenalty(status: string): number {
  const normalized = status.toLowerCase()
  if (
    normalized.includes('injur') ||
    normalized.includes('lesion') ||
    normalized.includes('suspend') ||
    normalized.includes('sancion')
  ) {
    return -1_000
  }
  if (normalized.includes('doubt') || normalized.includes('duda')) return -80
  return 0
}

export function getPlayerRecommendationScore(
  player: Player,
  probability?: StartingProbability,
  trend?: MarketTrend
): number {
  const probabilityScore = probability
    ? probability.probability * 1.5
    : Math.min(player.marketValue / 1_000_000, 100) * 0.25
  return (
    probabilityScore +
    player.averagePoints * 12 +
    player.points * 0.05 +
    (trend?.momentumScore ?? 0) * 0.5 +
    availabilityPenalty(player.playerStatus)
  )
}

export function recommendLineup(
  players: Player[],
  formation: Formation,
  probabilities: ReadonlyMap<string, StartingProbability> = new Map(),
  trends: ReadonlyMap<string, MarketTrend> = new Map()
): Player[] {
  const slots = FORMATIONS[formation]
  return ([1, 2, 3, 4] as const).flatMap((positionId) =>
    players
      .filter((player) => player.positionId === positionId)
      .sort(
        (left, right) =>
          getPlayerRecommendationScore(
            right,
            probabilities.get(right.id),
            trends.get(right.id)
          ) -
          getPlayerRecommendationScore(
            left,
            probabilities.get(left.id),
            trends.get(left.id)
          )
      )
      .slice(0, slots[positionId])
  )
}

export function buildLineupPayload(
  lineup: Player[],
  formation: Formation
): LineupPayload | null {
  if (lineup.length !== 11 || lineup.some((player) => !player.playerTeamId)) {
    return null
  }

  const goalkeeper = lineup.find((player) => player.positionId === 1)
  const defender = lineup.filter((player) => player.positionId === 2)
  const midfield = lineup.filter((player) => player.positionId === 3)
  const striker = lineup.filter((player) => player.positionId === 4)
  const expected = FORMATIONS[formation]
  if (
    !goalkeeper?.playerTeamId ||
    defender.length !== expected[2] ||
    midfield.length !== expected[3] ||
    striker.length !== expected[4]
  ) {
    return null
  }

  return {
    goalkeeper: goalkeeper.playerTeamId,
    defender: defender.map((player) => player.playerTeamId as string),
    midfield: midfield.map((player) => player.playerTeamId as string),
    striker: striker.map((player) => player.playerTeamId as string),
    tactical_formation: [expected[2], expected[3], expected[4]],
  }
}

export function getSquadNeeds(players: Player[]): SquadNeed[] {
  return ([1, 2, 3, 4] as const).flatMap((positionId) => {
    const current = players.filter(
      (player) => player.positionId === positionId
    ).length
    const missing = Math.max(0, MINIMUM_SQUAD[positionId] - current)
    return missing > 0 ? [{ positionId, missing }] : []
  })
}

export function getSellCandidates(
  players: Player[],
  lineup: Player[],
  probabilities: ReadonlyMap<string, StartingProbability> = new Map(),
  trends: ReadonlyMap<string, MarketTrend> = new Map()
): SellCandidate[] {
  const lineupIds = new Set(lineup.map((player) => player.id))
  const positionCounts = new Map<number, number>()
  for (const player of players) {
    positionCounts.set(
      player.positionId,
      (positionCounts.get(player.positionId) ?? 0) + 1
    )
  }

  return players.flatMap((player) => {
    if (lineupIds.has(player.id)) return []
    const reasons: SellCandidate['reasons'] = ['outside-lineup']
    const trend = trends.get(player.id)
    if (trend && isMarketTrendBearish(trend)) reasons.push('falling')
    if ((probabilities.get(player.id)?.probability ?? 100) < 50) {
      reasons.push('low-probability')
    }
    if (availabilityPenalty(player.playerStatus) <= -1_000) {
      reasons.push('unavailable')
    }

    const minimum = MINIMUM_SQUAD[player.positionId as SquadPosition]
    const hasPositionSurplus =
      minimum !== undefined &&
      (positionCounts.get(player.positionId) ?? 0) > minimum
    const hasStrongWarning = reasons.some(
      (reason) => reason !== 'outside-lineup'
    )
    return hasPositionSurplus && hasStrongWarning ? [{ player, reasons }] : []
  })
}
