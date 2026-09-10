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

export const PREMIUM_FORMATIONS = {
  '3-3-4': { 1: 1, 2: 3, 3: 3, 4: 4 },
  '3-6-1': { 1: 1, 2: 3, 3: 6, 4: 1 },
  '4-2-4': { 1: 1, 2: 4, 3: 2, 4: 4 },
  '4-6-0': { 1: 1, 2: 4, 3: 6, 4: 0 },
  '5-2-3': { 1: 1, 2: 5, 3: 2, 4: 3 },
} as const

const ALL_FORMATIONS = { ...FORMATIONS, ...PREMIUM_FORMATIONS }

export type Formation = keyof typeof ALL_FORMATIONS
export type SquadPosition = 1 | 2 | 3 | 4

export const MINIMUM_STARTING_PROBABILITY = 50

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

export interface LineupRecommendation {
  formation: Formation
  lineup: Player[]
  minimumProbability: number
  belowMinimumProbability: Player[]
  unknownProbability: Player[]
  unavailable: Player[]
}

function availabilityPenalty(status: string): number {
  const normalized = status.toLowerCase()
  if (
    normalized.includes('injur') ||
    normalized.includes('lesion') ||
    normalized.includes('suspend') ||
    normalized.includes('sancion') ||
    normalized.includes('out_of_league')
  ) {
    return -1_000
  }
  if (normalized.includes('doubt') || normalized.includes('duda')) return -80
  return 0
}

export function isPlayerUnavailable(player: Player): boolean {
  return availabilityPenalty(player.playerStatus) <= -1_000
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
  trends: ReadonlyMap<string, MarketTrend> = new Map(),
  minimumProbability = MINIMUM_STARTING_PROBABILITY
): Player[] {
  const slots = ALL_FORMATIONS[formation]
  return ([1, 2, 3, 4] as const).flatMap((positionId) =>
    players
      .filter((player) => player.positionId === positionId)
      .sort((left, right) => {
        const leftProbability = probabilities.get(left.id)
        const rightProbability = probabilities.get(right.id)
        const leftUnavailable = isPlayerUnavailable(left)
        const rightUnavailable = isPlayerUnavailable(right)
        if (leftUnavailable !== rightUnavailable) {
          return leftUnavailable ? 1 : -1
        }

        const probabilityTier = (
          probability: StartingProbability | undefined
        ) => {
          if (!probability) return 0
          return probability.probability >= minimumProbability ? 2 : 1
        }
        const tierDifference =
          probabilityTier(rightProbability) - probabilityTier(leftProbability)
        if (tierDifference !== 0) return tierDifference

        if (
          leftProbability &&
          rightProbability &&
          leftProbability.probability < minimumProbability &&
          rightProbability.probability < minimumProbability &&
          leftProbability.probability !== rightProbability.probability
        ) {
          return rightProbability.probability - leftProbability.probability
        }

        const scoreDifference =
          getPlayerRecommendationScore(
            right,
            rightProbability,
            trends.get(right.id)
          ) -
          getPlayerRecommendationScore(
            left,
            leftProbability,
            trends.get(left.id)
          )
        if (scoreDifference !== 0) return scoreDifference

        return (
          (rightProbability?.probability ?? -1) -
          (leftProbability?.probability ?? -1)
        )
      })
      .slice(0, slots[positionId])
  )
}

export function recommendBestLineup(
  players: Player[],
  probabilities: ReadonlyMap<string, StartingProbability> = new Map(),
  trends: ReadonlyMap<string, MarketTrend> = new Map(),
  includePremiumFormations = false,
  minimumProbability = MINIMUM_STARTING_PROBABILITY
): LineupRecommendation {
  const formations = [
    ...(Object.keys(FORMATIONS) as Array<keyof typeof FORMATIONS>),
    ...(includePremiumFormations
      ? (Object.keys(PREMIUM_FORMATIONS) as Array<
          keyof typeof PREMIUM_FORMATIONS
        >)
      : []),
  ]

  const candidates = formations.map((formation) => {
    const lineup = recommendLineup(
      players,
      formation,
      probabilities,
      trends,
      minimumProbability
    )
    const unavailable = lineup.filter(isPlayerUnavailable)
    const belowMinimumProbability = lineup.filter((player) => {
      const probability = probabilities.get(player.id)
      return Boolean(
        probability && probability.probability < minimumProbability
      )
    })
    const unknownProbability = lineup.filter(
      (player) => !probabilities.has(player.id)
    )
    const riskCount = new Set(
      [...unavailable, ...belowMinimumProbability, ...unknownProbability].map(
        (player) => player.id
      )
    ).size
    const totalProbability = lineup.reduce(
      (total, player) =>
        total + (probabilities.get(player.id)?.probability ?? 0),
      0
    )
    const totalScore = lineup.reduce(
      (total, player) =>
        total +
        getPlayerRecommendationScore(
          player,
          probabilities.get(player.id),
          trends.get(player.id)
        ),
      0
    )

    return {
      formation,
      lineup,
      unavailable,
      belowMinimumProbability,
      unknownProbability,
      riskCount,
      totalProbability,
      totalScore,
    }
  })

  candidates.sort((left, right) => {
    const comparisons = [
      right.lineup.length - left.lineup.length,
      left.riskCount - right.riskCount,
      left.unavailable.length - right.unavailable.length,
      left.unknownProbability.length - right.unknownProbability.length,
      left.belowMinimumProbability.length -
        right.belowMinimumProbability.length,
      right.totalProbability - left.totalProbability,
      right.totalScore - left.totalScore,
    ]
    return comparisons.find((comparison) => comparison !== 0) ?? 0
  })

  const best = candidates[0]
  return {
    formation: best.formation,
    lineup: best.lineup,
    minimumProbability,
    belowMinimumProbability: best.belowMinimumProbability,
    unknownProbability: best.unknownProbability,
    unavailable: best.unavailable,
  }
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
  const expected = ALL_FORMATIONS[formation]
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
