import { apiClient, endpoints } from '@/services/api-client'
import { parseLeagueRanking, parseLeagues } from '@/services/api-contracts'
import { ApiResponse, League, LeagueRanking } from '@/types/api'

export class LeagueService {
  async getLeagues(cookie: string): Promise<ApiResponse<League[]>> {
    const response = await apiClient.get<unknown>(
      endpoints.user.leagues,
      cookie
    )
    if (response.error) {
      return {
        data: null,
        error: response.error,
        status: response.status,
      }
    }

    const parsed = parseLeagues(response.data)
    return { ...parsed, status: response.status }
  }

  async getUsers(
    cookie: string,
    leagueId: string
  ): Promise<ApiResponse<LeagueRanking[]>> {
    const leagueRankingUrl = `${endpoints.league.ranking(leagueId)}?x-lang=es`

    const response = await apiClient.get<unknown>(leagueRankingUrl, cookie)
    if (response.error) {
      return {
        data: null,
        error: response.error,
        status: response.status,
      }
    }

    const parsed = parseLeagueRanking(response.data)
    return { ...parsed, status: response.status }
  }
}

export const leagueService = new LeagueService()
