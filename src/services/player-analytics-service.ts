import { Player } from '@/entities/player'

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
  if (!player.buyoutClauseLockedEndTime) return true

  const protectionEndTime = new Date(player.buyoutClauseLockedEndTime).getTime()
  const currentTime = Date.now()
  const twoDaysInMs = 2 * 24 * 60 * 60 * 1000

  return protectionEndTime - currentTime <= twoDaysInMs
}

export function getPlayersWithExpiringProtection(players: Player[]): Player[] {
  return players.filter((player) => {
    if (!player.buyoutClauseLockedEndTime) return false
    const protectionEnd = new Date(player.buyoutClauseLockedEndTime)
    const hoursLeft = (protectionEnd.getTime() - Date.now()) / (1000 * 60 * 60)

    return hoursLeft <= 72
  })
}
