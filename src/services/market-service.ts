import { apiClient, endpoints } from '@/services/api-client'
import { ApiResponse } from '@/types/api'

export class MarketService {
  /**
   * Withdraws a player from the market
   */
  async withdrawPlayer(
    cookie: string,
    leagueId: string,
    marketId: string
  ): Promise<ApiResponse<unknown>> {
    const url = endpoints.market.withdrawPlayer(leagueId, marketId)
    return apiClient.delete(url, cookie)
  }

  /**
   * Sells a player to the market
   */
  async sellPlayer(
    cookie: string,
    leagueId: string,
    playerId: string,
    salePrice: number
  ): Promise<ApiResponse<unknown>> {
    const url = endpoints.market.sellPlayer(leagueId)
    return apiClient.post(url, cookie, {
      playerId,
      salePrice,
    })
  }

  /**
   * Re-markets all players by withdrawing them and putting them back at the same price
   */
  async remarketPlayers(
    cookie: string,
    leagueId: string,
    players: Array<{
      playerId: string
      marketId: string
      salePrice: number
    }>
  ): Promise<ApiResponse<{
    withdrawn: number
    resold: number
    failed: Array<{ playerId: string; error: string }>
  }>> {
    const results = {
      withdrawn: 0,
      resold: 0,
      failed: [] as Array<{ playerId: string; error: string }>,
    }

    for (const player of players) {
      try {
        // Step 1: Withdraw player from market
        const withdrawResult = await this.withdrawPlayer(
          cookie,
          leagueId,
          player.marketId
        )

        if (withdrawResult.error) {
          results.failed.push({
            playerId: player.playerId,
            error: `Withdraw failed: ${withdrawResult.error}`,
          })
          continue
        }

        results.withdrawn++

        // Step 2: Re-sell player to market
        const sellResult = await this.sellPlayer(
          cookie,
          leagueId,
          player.playerId,
          player.salePrice
        )

        if (sellResult.error) {
          results.failed.push({
            playerId: player.playerId,
            error: `Re-sell failed: ${sellResult.error}`,
          })
          continue
        }

        results.resold++
      } catch (error) {
        results.failed.push({
          playerId: player.playerId,
          error:
            error instanceof Error ? error.message : 'Unknown error occurred',
        })
      }
    }

    return {
      data: results,
      error: null,
    }
  }
}

export const marketService = new MarketService()
