import {TeamPlayer} from "@/types/api";
import {Player} from "@/entities/player";

export class PlayerMapper {
    static fromTeamPlayer(teamPlayer: TeamPlayer): Player {
        return {
            id: teamPlayer.playerMaster.id,
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
            saleInfo: teamPlayer.playerMarket ? {
                salePrice: teamPlayer.playerMarket.salePrice,
                expirationDate: teamPlayer.playerMarket.expirationDate,
                numberOfOffers: teamPlayer.playerMarket.numberOfOffers,
            } : undefined,
        };
    }
}
