import type { Player } from '../entities/player.ts'
import type { ApiResponse } from '../types/api.ts'
import { apiClient, endpoints } from './api-client.ts'

export class MarketService {
  async withdrawPlayer(
    leagueId: string,
    marketId: string
  ): Promise<ApiResponse<unknown>> {
    return apiClient.delete(endpoints.market.withdrawPlayer(leagueId, marketId))
  }

  async listPlayer(
    leagueId: string,
    playerId: string,
    salePrice: number
  ): Promise<ApiResponse<unknown>> {
    return apiClient.post(endpoints.market.sellPlayer(leagueId), {
      playerId,
      salePrice,
    })
  }
}

export const marketService = new MarketService()

export interface MarketRefreshResult {
  renewed: number
  added: number
  failures: string[]
}

interface MarketWriter {
  withdrawPlayer(
    leagueId: string,
    marketId: string
  ): Promise<ApiResponse<unknown>>
  listPlayer(
    leagueId: string,
    playerId: string,
    salePrice: number
  ): Promise<ApiResponse<unknown>>
}

export async function refreshMarketListings(
  leagueId: string,
  players: Player[],
  onProgress: (current: number, total: number, playerName: string) => void,
  writer: MarketWriter = marketService
): Promise<MarketRefreshResult> {
  let renewed = 0
  let added = 0
  const failures: string[] = []

  for (const [index, player] of players.entries()) {
    const playerName = player.nickname || player.name
    const playerId = player.playerTeamId || player.id
    onProgress(index + 1, players.length, playerName)

    try {
      if (
        !playerId ||
        !Number.isSafeInteger(player.marketValue) ||
        player.marketValue <= 0
      ) {
        failures.push(`${playerName}: invalid player or market value`)
        continue
      }

      if (player.saleInfo) {
        const withdrawal = await writer.withdrawPlayer(
          leagueId,
          player.saleInfo.marketId
        )
        if (withdrawal.error) {
          failures.push(`${playerName}: ${withdrawal.error}`)
          continue
        }
      }

      const listing = await writer.listPlayer(
        leagueId,
        playerId,
        player.marketValue
      )
      if (listing.error) {
        failures.push(
          player.saleInfo
            ? `${playerName}: listing was withdrawn but could not be renewed (${listing.error})`
            : `${playerName}: ${listing.error}`
        )
        continue
      }

      if (player.saleInfo) renewed++
      else added++
    } catch (caught) {
      failures.push(
        `${playerName}: ${caught instanceof Error ? caught.message : 'unknown error'}`
      )
    }
  }

  return { renewed, added, failures }
}
