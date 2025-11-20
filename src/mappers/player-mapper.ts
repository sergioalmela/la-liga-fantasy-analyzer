import { Player } from '@/entities/player'
import { MarketPlayer, TeamPlayer } from '@/types/api'

export function mapTeamPlayerToPlayer(teamPlayer: TeamPlayer): Player {
  return {
    id: teamPlayer.playerMaster.id,
    playerTeamId: teamPlayer.playerTeamId,
    name: teamPlayer.playerMaster.name,
    nickname: teamPlayer.playerMaster.nickname,
    positionId: teamPlayer.playerMaster.positionId,
    playerStatus: teamPlayer.playerMaster.playerStatus,
    team: {
      id: teamPlayer.playerMaster.team.id,
      name: teamPlayer.playerMaster.team.name,
    },
    marketValue: teamPlayer.playerMaster.marketValue,
    points: teamPlayer.playerMaster.points,
    averagePoints: teamPlayer.playerMaster.averagePoints,
    buyoutClause: teamPlayer.buyoutClause,
    buyoutClauseLockedEndTime: teamPlayer.buyoutClauseLockedEndTime,
    saleInfo: teamPlayer.playerMarket
      ? {
          marketId: teamPlayer.playerMarket.id,
          salePrice: teamPlayer.playerMarket.salePrice,
          expirationDate: teamPlayer.playerMarket.expirationDate,
          numberOfOffers: teamPlayer.playerMarket.numberOfOffers,
        }
      : undefined,
  }
}

export function mapMarketPlayerToPlayer(marketPlayer: MarketPlayer): Player {
  return {
    id: marketPlayer.playerMaster.id,
    name: marketPlayer.playerMaster.name,
    nickname: marketPlayer.playerMaster.nickname,
    positionId: marketPlayer.playerMaster.positionId,
    playerStatus: marketPlayer.playerMaster.playerStatus,
    team: {
      id: marketPlayer.playerMaster.team.id,
      name: marketPlayer.playerMaster.team.name,
    },
    marketValue: marketPlayer.playerMaster.marketValue,
    points: marketPlayer.playerMaster.points,
    averagePoints: marketPlayer.playerMaster.averagePoints,
    saleInfo: {
      marketId: marketPlayer.id,
      salePrice: marketPlayer.salePrice,
      expirationDate: marketPlayer.expirationDate,
      numberOfOffers: marketPlayer.numberOfBids,
    },
  }
}
