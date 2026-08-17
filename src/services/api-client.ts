import { FANTASY_COMPETITION_PATH } from '../config/fantasy-api.ts'
import type { ApiResponse } from '../types/api'

const CMP = FANTASY_COMPETITION_PATH

export const endpoints = {
  user: {
    info: '/v4/user/me',
    leagues: `${CMP}/leagues`,
  },
  player: {
    all: `${CMP}/players`,
    marketValue: (playerId: string) => `${CMP}/player/${playerId}/market-value`,
    details: (playerId: string, leagueId: string) =>
      `${CMP}/player/${playerId}/league/${leagueId}`,
    offers: (playerTeamId: string, leagueId: string) =>
      `${CMP}/league/${leagueId}/playerTeam/${playerTeamId}/offer`,
  },
  team: {
    master: '/v3/teams-master',
    info: (teamId: string, leagueId: string) =>
      `${CMP}/leagues/${leagueId}/teams/${teamId}`,
    money: (teamId: string) => `${CMP}/teams/${teamId}/money`,
    lineup: (teamId: string) => `${CMP}/teams/${teamId}/lineup`,
    lineupByWeek: (teamId: string, weekId: string) =>
      `${CMP}/teams/${teamId}/lineup/week/${weekId}`,
  },
  league: {
    ranking: (leagueId: string) => `${CMP}/leagues/${leagueId}/standing`,
    rankingByWeek: (leagueId: string, weekId: number) =>
      `${CMP}/leagues/${leagueId}/standing/${weekId}`,
    activity: (leagueId: string, page: number) =>
      `${CMP}/leagues/${leagueId}/activity/${page}`,
    marketHistory: (leagueId: string) =>
      `${CMP}/league/${leagueId}/market/history`,
    team: (teamId: string, leagueId: string) =>
      `${CMP}/leagues/${leagueId}/teams/${teamId}`,
    market: (leagueId: string) => `${CMP}/league/${leagueId}/market`,
  },
  market: {
    sellPlayer: (leagueId: string) =>
      `${CMP}/league/${leagueId}/market/sell?x-lang=es`,
    withdrawPlayer: (leagueId: string, marketId: string) =>
      `${CMP}/league/${leagueId}/market/${marketId}/delete?x-lang=es`,
    payBuyout: (leagueId: string, playerId: string) =>
      `${CMP}/league/${leagueId}/buyout/${playerId}/pay?x-lang=es`,
    increaseBuyout: (leagueId: string, playerId: string) =>
      `${CMP}/league/${leagueId}/buyout/${playerId}/increase?x-lang=es`,
    acceptOffer: (leagueId: string, marketId: string, offerId: string) =>
      `${CMP}/league/${leagueId}/market/${marketId}/offer/${offerId}/accept?x-lang=es`,
    rejectOffer: (leagueId: string, marketId: string, offerId: string) =>
      `${CMP}/league/${leagueId}/market/${marketId}/offer/${offerId}/reject?x-lang=es`,
  },
  stats: {
    weekMatches: (weekId: string) => `/stats${CMP}/stats/week/${weekId}`,
  },
  season: {
    currentWeek: `${CMP}/week/current`,
    calendar: (weekNumber: number) =>
      `${CMP}/calendar?weekNumber=${weekNumber}&x-lang=es`,
  },
}

function getErrorMessage(data: unknown, status: number): string {
  if (typeof data === 'object' && data !== null) {
    const record = data as Record<string, unknown>
    if (typeof record.message === 'string') return record.message
    if (typeof record.error === 'string') return record.error
  }
  return `Fantasy API request failed with HTTP ${status}`
}

export class ApiClient {
  private async makeRequest<T>(
    endpoint: string,
    options: {
      method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
      body?: unknown
    } = {}
  ): Promise<ApiResponse<T>> {
    try {
      const startedAt = Date.now()
      const headers = new Headers()
      if (options.body !== undefined)
        headers.set('Content-Type', 'application/json')

      const response = await fetch(
        `/api/fantasy?path=${encodeURIComponent(endpoint)}`,
        {
          method: options.method || 'GET',
          headers,
          credentials: 'same-origin',
          ...(options.body !== undefined
            ? { body: JSON.stringify(options.body) }
            : {}),
        }
      )
      const finishedAt = Date.now()
      const upstreamDate = response.headers.get('x-fantasy-upstream-date')
      const parsedUpstreamDate = upstreamDate
        ? Date.parse(upstreamDate)
        : Number.NaN
      const clockOffsetMs = Number.isFinite(parsedUpstreamDate)
        ? parsedUpstreamDate - (startedAt + finishedAt) / 2
        : undefined

      const text = await response.text()
      let data: unknown = null
      if (text.trim()) {
        try {
          data = JSON.parse(text)
        } catch {
          return {
            data: null,
            error: `Fantasy API returned an invalid response (HTTP ${response.status})`,
            status: response.status,
            ...(clockOffsetMs !== undefined ? { clockOffsetMs } : {}),
          }
        }
      }

      if (!response.ok) {
        return {
          data: null,
          error: getErrorMessage(data, response.status),
          status: response.status,
          ...(clockOffsetMs !== undefined ? { clockOffsetMs } : {}),
        }
      }

      return {
        data: data as T,
        error: null,
        status: response.status,
        ...(clockOffsetMs !== undefined ? { clockOffsetMs } : {}),
      }
    } catch (error) {
      return {
        data: null,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      }
    }
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { method: 'GET' })
  }

  async post<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { method: 'POST', body })
  }

  async put<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { method: 'PUT', body })
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { method: 'DELETE' })
  }
}

export const apiClient = new ApiClient()
