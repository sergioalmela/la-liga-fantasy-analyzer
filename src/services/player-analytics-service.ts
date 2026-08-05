import type { Player } from '../entities/player.ts'

const HOUR_IN_MS = 60 * 60 * 1000

export type ClauseUnlockFilter = 'all' | 'unlocked' | '24h' | '48h'

export function calculateSummaryStats(players: Player[]) {
  const totalValue = players.reduce(
    (sum, player) => sum + player.marketValue,
    0
  )
  const totalPoints = players.reduce((sum, player) => sum + player.points, 0)
  const averagePoints =
    players.length > 0
      ? Number.parseFloat((totalPoints / players.length).toFixed(1))
      : 0

  return {
    totalPlayers: players.length,
    totalValue,
    totalPoints,
    averagePoints,
  }
}

export function getPlayersWithLowBuyout(players: Player[]): Player[] {
  return players.filter((player) => {
    if (!player.buyoutClause) return false

    const isBuyoutLowComparedToValue =
      player.buyoutClause < player.marketValue * 1.2
    const protectionExpiresSoon = isProtectionExpiringSoon(player)

    return isBuyoutLowComparedToValue && protectionExpiresSoon
  })
}

export function isProtectionExpiringSoon(player: Player): boolean {
  const remainingHours = getClauseUnlockRemainingHours(player)
  return remainingHours !== null && remainingHours <= 48
}

export function getClauseUnlockRemainingHours(
  player: Player,
  now = Date.now()
): number | null {
  if (!player.buyoutClause) return null
  if (!player.buyoutClauseLockedEndTime) return 0

  const unlockTime = new Date(player.buyoutClauseLockedEndTime).getTime()
  if (!Number.isFinite(unlockTime)) return null

  return (unlockTime - now) / HOUR_IN_MS
}

export function filterPlayersByClauseUnlock(
  players: Player[],
  filter: ClauseUnlockFilter,
  now = Date.now()
): Player[] {
  if (filter === 'all') return players

  const maximumHours = filter === 'unlocked' ? 0 : filter === '24h' ? 24 : 48
  return players.filter((player) => {
    const remainingHours = getClauseUnlockRemainingHours(player, now)
    return remainingHours !== null && remainingHours <= maximumHours
  })
}

export function getClauseUnlockUrgencyBonus(
  player: Player,
  now = Date.now()
): number {
  const remainingHours = getClauseUnlockRemainingHours(player, now)
  if (remainingHours === null || remainingHours > 72) return 0
  if (remainingHours <= 0) return 30
  if (remainingHours <= 12) return 25
  if (remainingHours <= 24) return 18
  if (remainingHours <= 48) return 10
  return 5
}

export function getPlayersWithExpiringProtection(
  players: Player[],
  now = Date.now()
): Player[] {
  return players.filter((player) => {
    const remainingHours = getClauseUnlockRemainingHours(player, now)
    return remainingHours !== null && remainingHours > 0 && remainingHours <= 72
  })
}
