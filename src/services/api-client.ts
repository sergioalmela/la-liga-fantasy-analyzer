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
    details: (playerId: string, leagueId: string) =>
      `${CMP}/player/${playerId}/league/${leagueId}`,
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
    team: (teamId: string, leagueId: string) =>
      `${CMP}/leagues/${leagueId}/teams/${teamId}`,
    market: (leagueId: string) => `${CMP}/league/${leagueId}/market`,
  },
  stats: {
    weekMatches: (weekId: string) => `/stats${CMP}/stats/week/${weekId}`,
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
    token: string,
    options: {
      method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
      body?: unknown
    } = {}
  ): Promise<ApiResponse<T>> {
    try {
      const headers = new Headers({ Authorization: `Bearer ${token}` })
      if (options.body !== undefined)
        headers.set('Content-Type', 'application/json')

      const response = await fetch(
        `/api/fantasy?path=${encodeURIComponent(endpoint)}`,
        {
          method: options.method || 'GET',
          headers,
          ...(options.body !== undefined
            ? { body: JSON.stringify(options.body) }
            : {}),
        }
      )

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
          }
        }
      }

      if (!response.ok) {
        return {
          data: null,
          error: getErrorMessage(data, response.status),
          status: response.status,
        }
      }

      return { data: data as T, error: null, status: response.status }
    } catch (error) {
      return {
        data: null,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      }
    }
  }

  async get<T>(endpoint: string, token: string): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, token, { method: 'GET' })
  }

  async post<T>(
    endpoint: string,
    token: string,
    body?: unknown
  ): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, token, { method: 'POST', body })
  }

  async put<T>(
    endpoint: string,
    token: string,
    body?: unknown
  ): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, token, { method: 'PUT', body })
  }

  async delete<T>(endpoint: string, token: string): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, token, { method: 'DELETE' })
  }
}

export const apiClient = new ApiClient()
