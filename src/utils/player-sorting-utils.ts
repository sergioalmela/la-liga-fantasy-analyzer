import type { Player } from '../entities/player.ts'
import type { MarketTrend } from '../services/market-trend-service.ts'
import { getClauseUnlockUrgencyBonus } from '../services/player-analytics-service.ts'
import { getEffectivePointsAverage } from '../services/recent-form-service.ts'

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
 * Priority: Low buyouts > Clause urgency > High value > Market momentum
 */
export function sortOpportunities(
  players: Player[],
  trends?: ReadonlyMap<string, MarketTrend>,
  now = Date.now()
): Player[] {
  return [...players].sort((a, b) => {
    const scoreA = calculateOpportunityScore(a, trends?.get(a.id), now)
    const scoreB = calculateOpportunityScore(b, trends?.get(b.id), now)

    return scoreB - scoreA
  })
}

function calculateOpportunityScore(
  player: Player,
  trend: MarketTrend | undefined,
  now: number
): number {
  let score = 0

  // 1. Only plausible clauses receive the low-buyout bonus.
  if (player.buyoutClause && player.marketValue) {
    const buyoutRatio = player.buyoutClause / player.marketValue
    if (buyoutRatio >= 1 && buyoutRatio < 1.2) {
      score += 40
    }
  }

  // 2. Clause unlock urgency (0-30 points)
  score += getClauseUnlockUrgencyBonus(player, now)

  // 3. Market value importance (0-20 points, normalized)
  const normalizedValue = Math.min(player.marketValue / 50000000, 1) // Cap at 50M
  score += normalizedValue * 20

  // 4. Recent market momentum (-10 to 15 points)
  if (trend) {
    score +=
      trend.momentumScore > 0
        ? Math.min(trend.momentumScore * 0.5, 15)
        : Math.max(trend.momentumScore * 0.3, -10)
  }

  // 5. Recent matchday form is more informative than the season average alone.
  const effectivePoints = getEffectivePointsAverage(player)
  score += Math.max(0, Math.min(effectivePoints, 10)) * 2.5

  // 6. Sale urgency bonus (0-5 points)
  if (player.saleInfo?.expirationDate) {
    const expirationTime = new Date(player.saleInfo.expirationDate).getTime()
    const hoursLeft = (expirationTime - now) / (1000 * 60 * 60)

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
