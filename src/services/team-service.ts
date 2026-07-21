import { Player } from '@/entities/player'
import { apiClient, endpoints } from '@/services/api-client'
import {
  parseOfficialMarketPlayers,
  parseTeamPlayers,
  parseTeamsMaster,
} from '@/services/api-contracts'
import { ApiResponse } from '@/types/api'

export class TeamService {
  async getPlayers(
    cookie: string,
    leagueId: string,
    teamId: string
  ): Promise<ApiResponse<Player[]>> {
    const url = `${endpoints.league.team(teamId, leagueId)}?x-lang=es`

    const result = await apiClient.get<unknown>(url, cookie)
    if (result.error) {
      return { data: null, error: result.error, status: result.status }
    }

    const parsed = parseTeamPlayers(result.data)
    return { ...parsed, status: result.status }
  }

  async getOfficialMarketPlayers(
    cookie: string,
    leagueId: string
  ): Promise<ApiResponse<Player[]>> {
    const url = `${endpoints.league.market(leagueId)}?x-lang=es`

    const [marketResult, teamsResult] = await Promise.all([
      apiClient.get<unknown>(url, cookie),
      apiClient.get<unknown>(`${endpoints.team.master}?x-lang=es`, cookie),
    ])
    if (marketResult.error) {
      return {
        data: null,
        error: marketResult.error,
        status: marketResult.status,
      }
    }
    if (teamsResult.error) {
      return {
        data: null,
        error: teamsResult.error,
        status: teamsResult.status,
      }
    }

    const teams = parseTeamsMaster(teamsResult.data)
    if (!teams.data) {
      return {
        data: null,
        error: teams.error ?? 'Invalid teams response',
        status: teamsResult.status,
      }
    }

    const parsed = parseOfficialMarketPlayers(marketResult.data, teams.data)
    return { ...parsed, status: marketResult.status }
  }
}

export const teamService = new TeamService()
