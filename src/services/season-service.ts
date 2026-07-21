import type { ApiResponse, CurrentWeek, LeagueRanking } from '../types/api.ts'
import type {
  CalendarMatch,
  LineupSnapshot,
  MatchStats,
  RankingEvolution,
} from '../types/dashboard.ts'
import { apiClient, endpoints } from './api-client.ts'
import {
  buildRankingEvolution,
  parseCalendar,
  parseCurrentWeek,
  parseLeagueRanking,
  parseLineup,
  parseMatchStats,
  parseTeamsMaster,
} from './api-contracts.ts'

function invalidResponse<T>(error: string, status?: number): ApiResponse<T> {
  return { data: null, error, ...(status ? { status } : {}) }
}

function failedResponse<T>(response: ApiResponse<unknown>): ApiResponse<T> {
  return invalidResponse(
    response.error || 'Fantasy API returned no data',
    response.status
  )
}

export class SeasonService {
  async getCurrentWeek(): Promise<ApiResponse<CurrentWeek>> {
    const response = await apiClient.get<unknown>(
      `${endpoints.season.currentWeek}?x-lang=es`
    )
    if (response.error || !response.data) return failedResponse(response)

    const parsed = parseCurrentWeek(response.data)
    return parsed.error
      ? invalidResponse(parsed.error, response.status)
      : { data: parsed.data, error: null, status: response.status }
  }

  async getLineup(
    teamId: string,
    weekNumber: number
  ): Promise<ApiResponse<LineupSnapshot>> {
    const [lineupResponse, teamsResponse] = await Promise.all([
      apiClient.get<unknown>(
        `${endpoints.team.lineupByWeek(teamId, String(weekNumber))}?x-lang=es`
      ),
      apiClient.get<unknown>(`${endpoints.team.master}?x-lang=es`),
    ])
    if (lineupResponse.error || !lineupResponse.data) {
      return failedResponse(lineupResponse)
    }

    const teams = teamsResponse.data
      ? (parseTeamsMaster(teamsResponse.data).data ?? undefined)
      : undefined
    const parsed = parseLineup(lineupResponse.data, weekNumber, teams)
    return parsed.error
      ? invalidResponse(parsed.error, lineupResponse.status)
      : { data: parsed.data, error: null, status: lineupResponse.status }
  }

  async getCalendar(weekNumber: number): Promise<ApiResponse<CalendarMatch[]>> {
    const [calendarResponse, teamsResponse] = await Promise.all([
      apiClient.get<unknown>(endpoints.season.calendar(weekNumber)),
      apiClient.get<unknown>(`${endpoints.team.master}?x-lang=es`),
    ])
    if (calendarResponse.error || !calendarResponse.data) {
      return failedResponse(calendarResponse)
    }
    if (teamsResponse.error || !teamsResponse.data) {
      return failedResponse(teamsResponse)
    }

    const teams = parseTeamsMaster(teamsResponse.data)
    if (teams.error || !teams.data) {
      return invalidResponse(
        teams.error || 'Invalid teams response',
        teamsResponse.status
      )
    }

    const parsed = parseCalendar(calendarResponse.data, teams.data)
    return parsed.error
      ? invalidResponse(parsed.error, calendarResponse.status)
      : { data: parsed.data, error: null, status: calendarResponse.status }
  }

  async getMatchStats(weekNumber: number): Promise<ApiResponse<MatchStats[]>> {
    const response = await apiClient.get<unknown>(
      `${endpoints.stats.weekMatches(String(weekNumber))}?x-lang=es`
    )
    if (response.status === 404) {
      return { data: [], error: null, status: 404 }
    }
    if (response.error || !response.data) return failedResponse(response)

    const parsed = parseMatchStats(response.data)
    return parsed.error
      ? invalidResponse(parsed.error, response.status)
      : { data: parsed.data, error: null, status: response.status }
  }

  async getRanking(
    leagueId: string,
    weekNumber: number
  ): Promise<ApiResponse<LeagueRanking[]>> {
    const response = await apiClient.get<unknown>(
      `${endpoints.league.rankingByWeek(leagueId, weekNumber)}?x-lang=es`
    )
    if (response.error || !response.data) return failedResponse(response)

    const parsed = parseLeagueRanking(response.data)
    return parsed.error
      ? invalidResponse(parsed.error, response.status)
      : { data: parsed.data, error: null, status: response.status }
  }

  async getRankingEvolution(
    leagueId: string,
    currentWeek: number
  ): Promise<ApiResponse<RankingEvolution>> {
    const weeks = Array.from(
      { length: Math.max(0, Math.min(currentWeek, 38)) },
      (_, index) => index + 1
    )
    const weeklyRankings: Array<{ week: number; ranking: LeagueRanking[] }> = []

    for (let index = 0; index < weeks.length; index += 5) {
      const chunk = weeks.slice(index, index + 5)
      const responses = await Promise.all(
        chunk.map((week) => this.getRanking(leagueId, week))
      )
      responses.forEach((response, responseIndex) => {
        if (response.data) {
          weeklyRankings.push({
            week: chunk[responseIndex],
            ranking: response.data,
          })
        }
      })
    }

    return {
      data: buildRankingEvolution(weeklyRankings),
      error: null,
    }
  }
}

export const seasonService = new SeasonService()
