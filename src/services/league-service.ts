import { apiClient, endpoints } from '@/services/api-client'
import { ApiResponse, League, LeagueRanking } from '@/types/api'

export class LeagueService {
  async getLeagues(cookie: string): Promise<ApiResponse<League[]>> {
    return apiClient.get<League[]>(endpoints.user.leagues, cookie)
  }

  async getUsers(
    cookie: string,
    leagueId: string
  ): Promise<ApiResponse<LeagueRanking[]>> {
    const leagueRankingUrl = `${endpoints.league.ranking(leagueId)}?x-lang=es`

    return await apiClient.get<LeagueRanking[]>(leagueRankingUrl, cookie)
  }
}

export const leagueService = new LeagueService()
