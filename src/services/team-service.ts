import type { Player, RecentPlayerPoints } from '@/entities/player'
import { apiClient, endpoints } from '@/services/api-client'
import {
  parseOfficialMarketPlayers,
  parsePlayerRecentPoints,
  parseTeamMoney,
  parseTeamPlayers,
  parseTeamsMaster,
} from '@/services/api-contracts'
import type { ApiResponse, TeamMoney } from '@/types/api'

const RECENT_POINTS_CACHE_TTL_MS = 3 * 60 * 60 * 1000

interface RecentPointsCache {
  expiresAt: number
  promise: Promise<Map<string, RecentPlayerPoints[]> | null>
}

let recentPointsCache: RecentPointsCache | null = null

async function getAllRecentPoints(): Promise<Map<
  string,
  RecentPlayerPoints[]
> | null> {
  if (recentPointsCache && recentPointsCache.expiresAt > Date.now()) {
    return recentPointsCache.promise
  }

  const promise = apiClient
    .get<unknown>(`${endpoints.player.all}?x-lang=es`)
    .then((result) => {
      if (result.error || !result.data) return null
      return parsePlayerRecentPoints(result.data).data
    })

  recentPointsCache = {
    expiresAt: Date.now() + RECENT_POINTS_CACHE_TTL_MS,
    promise,
  }

  const points = await promise
  if (!points) recentPointsCache = null
  return points
}

export class TeamService {
  async getPlayers(
    leagueId: string,
    teamId: string
  ): Promise<ApiResponse<Player[]>> {
    const url = `${endpoints.league.team(teamId, leagueId)}?x-lang=es`

    const result = await apiClient.get<unknown>(url)
    if (result.error) {
      return { data: null, error: result.error, status: result.status }
    }

    const parsed = parseTeamPlayers(result.data)
    return {
      ...parsed,
      status: result.status,
      ...(result.clockOffsetMs !== undefined
        ? { clockOffsetMs: result.clockOffsetMs }
        : {}),
    }
  }

  async getMoney(teamId: string): Promise<ApiResponse<TeamMoney>> {
    const result = await apiClient.get<unknown>(endpoints.team.money(teamId))
    if (result.error) {
      return {
        data: null,
        error: result.error,
        status: result.status,
        ...(result.clockOffsetMs !== undefined
          ? { clockOffsetMs: result.clockOffsetMs }
          : {}),
      }
    }

    const parsed = parseTeamMoney(result.data)
    return {
      ...parsed,
      status: result.status,
      ...(result.clockOffsetMs !== undefined
        ? { clockOffsetMs: result.clockOffsetMs }
        : {}),
    }
  }

  async getOfficialMarketPlayers(
    leagueId: string
  ): Promise<ApiResponse<Player[]>> {
    const url = `${endpoints.league.market(leagueId)}?x-lang=es`

    const [marketResult, teamsResult] = await Promise.all([
      apiClient.get<unknown>(url),
      apiClient.get<unknown>(`${endpoints.team.master}?x-lang=es`),
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

  async getMarketRecentPoints(
    playerIds: ReadonlySet<string>
  ): Promise<Map<string, RecentPlayerPoints[]>> {
    if (playerIds.size === 0) return new Map()

    const recentPoints = await getAllRecentPoints()
    if (!recentPoints) return new Map()

    return new Map(
      [...recentPoints].filter(([playerId]) => playerIds.has(playerId))
    )
  }
}

export const teamService = new TeamService()
