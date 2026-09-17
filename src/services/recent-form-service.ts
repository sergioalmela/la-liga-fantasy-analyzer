import type { Player, RecentPlayerPoints } from '../entities/player.ts'

export interface RecentForm {
  games: RecentPlayerPoints[]
  average: number
  effectiveAverage: number
  direction: 'up' | 'down' | 'steady'
}

export function getRecentForm(player: Player): RecentForm | null {
  const games = [...(player.recentPoints ?? [])]
    .filter(
      (entry) =>
        Number.isSafeInteger(entry.weekNumber) &&
        entry.weekNumber > 0 &&
        Number.isFinite(entry.totalPoints)
    )
    .sort((left, right) => right.weekNumber - left.weekNumber)
    .slice(0, 3)
  if (games.length === 0) return null

  const weights = [3, 2, 1]
  const weightedSum = games.reduce(
    (total, game, index) => total + game.totalPoints * weights[index],
    0
  )
  const weightSum = weights.slice(0, games.length).reduce((a, b) => a + b, 0)
  const average = weightedSum / weightSum
  const recentWeight = [0, 0.3, 0.5, 0.7][games.length]
  const effectiveAverage =
    player.averagePoints * (1 - recentWeight) + average * recentWeight
  const difference = average - player.averagePoints

  return {
    games,
    average,
    effectiveAverage,
    direction: difference > 1 ? 'up' : difference < -1 ? 'down' : 'steady',
  }
}

export function getEffectivePointsAverage(player: Player): number {
  return getRecentForm(player)?.effectiveAverage ?? player.averagePoints
}
