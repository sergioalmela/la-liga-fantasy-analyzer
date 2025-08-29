import { Player } from '@/entities/player'
import { endpoints } from '@/lib/api'
import { PlayerMapper } from '@/mappers/player-mapper'
import { apiClient } from '@/services/api-client'
import { ApiResponse, MarketPlayer, MarketPlayerType, Team } from '@/types/api'

export class TeamService {
  async getPlayers(
    cookie: string,
    leagueId: string,
    teamId: string
  ): Promise<ApiResponse<Player[]>> {
    const url = `${endpoints.league.team(leagueId, teamId)}?x-lang=es`

    const result = await apiClient.get<Team>(url, cookie)

    if (result.data) {
      const players = result.data.players.map(PlayerMapper.fromTeamPlayer)
      return { data: players, error: null }
    }

    return { data: [], error: result.error }
  }

  async getOfficialMarketPlayers(
    cookie: string,
    leagueId: string
  ): Promise<ApiResponse<Player[]>> {
    const url = `${endpoints.league.market(leagueId)}?x-lang=es`

    const result = await apiClient.get<MarketPlayer[]>(url, cookie)

    if (result.data && Array.isArray(result.data)) {
      const officialMarketPlayers = result.data.filter(
        (marketPlayer) => marketPlayer.discr === MarketPlayerType.LEAGUE
      )

      const players = officialMarketPlayers.map((marketPlayer) =>
        PlayerMapper.fromMarketPlayer(marketPlayer)
      )
      return { data: players, error: null }
    }

    return { data: [], error: result.error }
  }
}

export const teamService = new TeamService()
