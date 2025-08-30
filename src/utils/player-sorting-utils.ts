import { Player } from '@/entities/player'

export type PlayerSortField =
  | 'name'
  | 'marketValue'
  | 'points'
  | 'averagePoints'
  | 'position'
  | 'buyoutClause'
  | 'salePrice'

export type SortOrder = 'asc' | 'desc'

/**
 * Smart sorting for opportunities page - prioritizes best deals
 * Priority: Low buyout opportunities > High value players > Trending up > Negative trends
 */
export function sortOpportunities(players: Player[]): Player[] {
  return [...players].sort((a, b) => {
    const scoreA = calculateOpportunityScore(a)
    const scoreB = calculateOpportunityScore(b)

    return scoreB - scoreA
  })
}

function calculateOpportunityScore(player: Player): number {
  let score = 0

  // 1. Low buyout opportunities get massive boost (40 points)
  if (player.buyoutClause && player.marketValue) {
    const buyoutRatio = player.buyoutClause / player.marketValue
    if (buyoutRatio < 1.2) {
      score += 40
      if (buyoutRatio < 1.0) score += 20
    }
  }

  // 2. Market value importance (0-20 points, normalized)
  const normalizedValue = Math.min(player.marketValue / 50000000, 1) // Cap at 50M
  score += normalizedValue * 20

  // 3. Momentum trending (0-15 points)
  if (player.analysis?.momentumScore) {
    const momentum = player.analysis.momentumScore
    if (momentum > 0) {
      score += Math.min(momentum * 0.5, 15)
    } else {
      score += Math.max(momentum * 0.3, -10)
    }
  }

  // 4. Points performance (0-10 points)
  const normalizedPoints = Math.min(player.averagePoints / 10, 1)
  score += normalizedPoints * 10

  // 5. Sale urgency bonus (0-5 points)
  if (player.saleInfo?.expirationDate) {
    const expirationTime = new Date(player.saleInfo.expirationDate).getTime()
    const hoursLeft = (expirationTime - Date.now()) / (1000 * 60 * 60)

    if (hoursLeft <= 12) score += 5
    else if (hoursLeft <= 24) score += 3
    else if (hoursLeft <= 48) score += 1
  }

  return score
}

export function sortPlayers(
  players: Player[],
  sortBy: PlayerSortField,
  order: SortOrder = 'desc'
): Player[] {
  const sortedPlayers = [...players]

  return sortedPlayers.sort((a, b) => {
    let comparison = 0

    switch (sortBy) {
      case 'name':
        comparison = (a.nickname || a.name).localeCompare(b.nickname || b.name)
        break

      case 'marketValue':
        comparison = a.marketValue - b.marketValue
        break

      case 'points':
        comparison = a.points - b.points
        break

      case 'averagePoints':
        comparison = a.averagePoints - b.averagePoints
        break

      case 'position':
        comparison = a.positionId - b.positionId
        break

      case 'buyoutClause': {
        const aBuyout = a.buyoutClause || 0
        const bBuyout = b.buyoutClause || 0
        comparison = aBuyout - bBuyout
        break
      }

      case 'salePrice': {
        const aSalePrice = a.saleInfo?.salePrice || 0
        const bSalePrice = b.saleInfo?.salePrice || 0
        comparison = aSalePrice - bSalePrice
        break
      }

      default:
        return 0
    }

    return order === 'asc' ? comparison : -comparison
  })
}
