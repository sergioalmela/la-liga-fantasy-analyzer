import { Player } from '@/entities/player'
import { apiClient, endpoints } from '@/services/api-client'
import { ApiResponse, MarketValuePoint } from '@/types/api'

export class PlayerAnalyticsService {
  async getPlayerMarketTrend(
    cookie: string,
    playerId: string
  ): Promise<ApiResponse<MarketValuePoint[]>> {
    return apiClient.get<MarketValuePoint[]>(
      endpoints.player.marketValue(playerId),
      cookie
    )
  }

  private calculateTrendPercentage(
    marketValueData: MarketValuePoint[],
    days: number
  ): number {
    if (!marketValueData || marketValueData.length === 0) return 0

    const sortedData = marketValueData
      .filter((item) => item.marketValue > 0)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, days + 1)

    if (sortedData.length < 2) return 0

    const latestValue = sortedData[0].marketValue
    const oldestValue = sortedData[sortedData.length - 1].marketValue
    const changePercent = ((latestValue - oldestValue) / oldestValue) * 100

    return Number.parseFloat(changePercent.toFixed(2))
  }

  private calculateMomentumScore(trends: {
    last1Days: number
    last3Days: number
    last7Days: number
  }): number {
    // Recent momentum (40%) + Short trend (40%) + Weekly context (20%)
    const momentum = trends.last1Days * 0.4
    const shortTrend = trends.last3Days * 0.4
    const weeklyContext = trends.last7Days * 0.2

    return Number.parseFloat((momentum + shortTrend + weeklyContext).toFixed(2))
  }

  async enrichPlayerWithAnalysis(
    cookie: string,
    player: Player
  ): Promise<Player> {
    const marketTrendResult = await this.getPlayerMarketTrend(cookie, player.id)

    if (!marketTrendResult.data) {
      return player
    }

    const trends = {
      last1Days: this.calculateTrendPercentage(marketTrendResult.data, 1),
      last3Days: this.calculateTrendPercentage(marketTrendResult.data, 3),
      last7Days: this.calculateTrendPercentage(marketTrendResult.data, 7),
    }

    const momentumScore = this.calculateMomentumScore(trends)

    return {
      ...player,
      analysis: {
        trends,
        momentumScore,
      },
    }
  }

  async enrichPlayersWithAnalysis(
    cookie: string,
    players: Player[]
  ): Promise<Player[]> {
    return await Promise.all(
      players.map((player) => this.enrichPlayerWithAnalysis(cookie, player))
    )
  }

  static calculateSummaryStats(players: Player[]) {
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

  static getPlayersWithLowBuyout(players: Player[]): Player[] {
    return players.filter((player) => {
      if (!player.buyoutClause) return false

      const isBuyoutLowComparedToValue =
        player.buyoutClause < player.marketValue * 1.2
      const isProtectionExpiringSoon =
        PlayerAnalyticsService.isProtectionExpiringSoon(player)

      return isBuyoutLowComparedToValue && isProtectionExpiringSoon
    })
  }

  private static isProtectionExpiringSoon(player: Player): boolean {
    if (!player.buyoutClauseLockedEndTime) return true

    const protectionEndTime = new Date(
      player.buyoutClauseLockedEndTime
    ).getTime()
    const currentTime = Date.now()
    const twoDaysInMs = 2 * 24 * 60 * 60 * 1000

    return protectionEndTime - currentTime <= twoDaysInMs
  }

  static getPlayersWithExpiringProtection(players: Player[]): Player[] {
    return players.filter((p) => {
      if (!p.buyoutClauseLockedEndTime) return false
      const protectionEnd = new Date(p.buyoutClauseLockedEndTime)
      const hoursLeft =
        (protectionEnd.getTime() - Date.now()) / (1000 * 60 * 60)

      return hoursLeft <= 72
    })
  }

  static getTrendingUpPlayers(
    players: Player[],
    minimumMomentum = 5
  ): Player[] {
    return players.filter(
      (p) =>
        p.analysis?.momentumScore && p.analysis.momentumScore > minimumMomentum
    )
  }
}

export const playerAnalyticsService = new PlayerAnalyticsService()
