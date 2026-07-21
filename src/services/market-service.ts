import { ApiResponse } from '@/types/api'

const MARKET_WRITES_DISABLED =
  'Market writes are disabled until the 2026/27 API contract and confirmation flow are verified'

export class MarketService {
  /**
   * Withdraws a player from the market
   */
  async withdrawPlayer(
    _cookie: string,
    _leagueId: string,
    _marketId: string
  ): Promise<ApiResponse<unknown>> {
    return { data: null, error: MARKET_WRITES_DISABLED }
  }

  /**
   * Sells a player to the market
   */
  async sellPlayer(
    _cookie: string,
    _leagueId: string,
    _playerId: string,
    _salePrice: number
  ): Promise<ApiResponse<unknown>> {
    return { data: null, error: MARKET_WRITES_DISABLED }
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
  ): Promise<
    ApiResponse<{
      withdrawn: number
      resold: number
      failed: Array<{ playerId: string; error: string }>
    }>
  > {
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
