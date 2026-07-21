import type { ApiResponse } from '../types/api.ts'
import type { PlayerDetail } from '../types/dashboard.ts'
import { apiClient, endpoints } from './api-client.ts'
import { parsePlayerDetail, parseTeamsMaster } from './api-contracts.ts'

export class PlayerDetailService {
  async getPlayerDetail(
    playerId: string,
    leagueId: string
  ): Promise<ApiResponse<PlayerDetail>> {
    const [detailResponse, teamsResponse] = await Promise.all([
      apiClient.get<unknown>(
        `${endpoints.player.details(playerId, leagueId)}?x-lang=es`
      ),
      apiClient.get<unknown>(`${endpoints.team.master}?x-lang=es`),
    ])
    if (detailResponse.error || !detailResponse.data) {
      return {
        data: null,
        error: detailResponse.error || 'Fantasy API returned no player data',
        status: detailResponse.status,
      }
    }

    const teams = teamsResponse.data
      ? (parseTeamsMaster(teamsResponse.data).data ?? undefined)
      : undefined
    const parsed = parsePlayerDetail(detailResponse.data, teams)
    return parsed.error
      ? { data: null, error: parsed.error, status: detailResponse.status }
      : { data: parsed.data, error: null, status: detailResponse.status }
  }
}

export const playerDetailService = new PlayerDetailService()
