import type { Player, PlayerOffer } from '@/entities/player'
import { apiClient, endpoints } from '@/services/api-client'
import {
  parsePlayerOffers,
  parsePlayerPurchaseHistory,
} from '@/services/api-contracts'

const MAX_CONCURRENT_REQUESTS = 4

export async function getPlayerOffers(
  leagueId: string,
  players: Player[]
): Promise<Map<string, PlayerOffer[]>> {
  const listedPlayers = players.filter(
    (player) =>
      player.playerTeamId &&
      player.saleInfo &&
      player.saleInfo.numberOfOffers > 0
  )
  const offersByPlayer = new Map<string, PlayerOffer[]>()
  let nextIndex = 0

  const worker = async () => {
    while (nextIndex < listedPlayers.length) {
      const player = listedPlayers[nextIndex]
      nextIndex += 1
      if (!player.playerTeamId) continue

      const result = await apiClient.get<unknown>(
        endpoints.player.offers(player.playerTeamId, leagueId)
      )
      if (result.error) continue

      const parsed = parsePlayerOffers(result.data)
      if (parsed.data) offersByPlayer.set(player.id, parsed.data)
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(MAX_CONCURRENT_REQUESTS, listedPlayers.length) },
      worker
    )
  )

  return offersByPlayer
}

export async function getPlayerPurchasePrices(
  leagueId: string,
  players: Player[]
): Promise<Map<string, number>> {
  if (players.length === 0) return new Map()

  const result = await apiClient.get<unknown>(
    endpoints.league.marketHistory(leagueId)
  )
  if (result.error) return new Map()

  const parsed = parsePlayerPurchaseHistory(result.data)
  if (!parsed.data) return new Map()

  const currentPlayerIds = new Set(players.map((player) => player.id))
  const purchasePrices = new Map<string, number>()
  for (const entry of parsed.data) {
    if (
      currentPlayerIds.has(entry.playerId) &&
      !purchasePrices.has(entry.playerId)
    ) {
      purchasePrices.set(entry.playerId, entry.amount)
    }
  }

  return purchasePrices
}

export async function acceptPlayerOffer(
  leagueId: string,
  marketId: string,
  offer: PlayerOffer
) {
  return apiClient.post<unknown>(
    endpoints.market.acceptOffer(leagueId, marketId, offer.id),
    { offerMoney: offer.amount }
  )
}

export async function rejectPlayerOffer(
  leagueId: string,
  marketId: string,
  offerId: string
) {
  return apiClient.post<unknown>(
    endpoints.market.rejectOffer(leagueId, marketId, offerId)
  )
}

export async function increasePlayerBuyout(
  leagueId: string,
  playerId: string,
  buyoutClause: number
) {
  return apiClient.post<unknown>(
    endpoints.market.increaseBuyout(leagueId, playerId),
    { buyoutClause }
  )
}
