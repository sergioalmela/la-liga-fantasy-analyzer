import type {
  ActivityPlayer,
  ApiResponse,
  CurrentWeek,
  LeagueActivity,
  LeagueRanking,
  TeamMoney,
} from '@/types/api'
import { apiClient, endpoints } from './api-client.ts'
import {
  parseActivityPlayers,
  parseCurrentWeek,
  parseLeagueActivity,
  parseLeagueRanking,
  parseTeamMoney,
} from './api-contracts.ts'

export type ActivityDirection = 'expense' | 'income' | 'neutral'

export interface RadarActivity extends LeagueActivity {
  actorName: string | null
  counterpartyName: string | null
  playerName: string | null
  label: string
  direction: ActivityDirection
}

export interface ManagerActivitySummary {
  managerName: string
  activityCount: number
  earned: number
  spent: number
}

export interface ActivityRadar {
  activities: RadarActivity[]
  currentWeek: CurrentWeek
  managerSummaries: ManagerActivitySummary[]
  money: TeamMoney
  totalVolume: number
}

const ACTIVITY_TYPES: Record<
  number,
  { label: string; direction: ActivityDirection }
> = {
  1: { label: 'Compra', direction: 'expense' },
  4: { label: 'Blindaje', direction: 'neutral' },
  6: { label: 'Premio de jornada', direction: 'income' },
  7: { label: 'Alineación incorrecta', direction: 'neutral' },
  9: { label: 'Alta en la liga', direction: 'neutral' },
  31: { label: 'Fichaje', direction: 'expense' },
  32: { label: 'Clausulazo', direction: 'expense' },
  33: { label: 'Venta', direction: 'income' },
}

function buildManagerMap(ranking: LeagueRanking[]): Map<string, string> {
  return new Map(
    ranking.map((entry) => [
      String(entry.team.manager.id),
      entry.team.manager.managerName,
    ])
  )
}

function buildPlayerMap(players: ActivityPlayer[]): Map<string, string> {
  return new Map(players.map((player) => [player.id, player.name]))
}

export function buildActivityRadar(
  activity: LeagueActivity[],
  ranking: LeagueRanking[],
  players: ActivityPlayer[],
  money: TeamMoney,
  currentWeek: CurrentWeek
): ActivityRadar {
  const managers = buildManagerMap(ranking)
  const playerNames = buildPlayerMap(players)
  const summaries = new Map<string, ManagerActivitySummary>()

  const getSummary = (managerName: string): ManagerActivitySummary => {
    const current = summaries.get(managerName)
    if (current) return current

    const created = { managerName, activityCount: 0, earned: 0, spent: 0 }
    summaries.set(managerName, created)
    return created
  }

  const activities = activity
    .map((entry): RadarActivity => {
      const metadata = ACTIVITY_TYPES[entry.activityTypeId] || {
        label: `Actividad ${entry.activityTypeId}`,
        direction: 'neutral' as const,
      }
      const actorName = entry.user1Id
        ? managers.get(entry.user1Id) || null
        : null
      const counterpartyName = entry.user2Id
        ? managers.get(entry.user2Id) || null
        : null
      const amount = Math.abs(entry.amount || 0)

      if (actorName) {
        const summary = getSummary(actorName)
        summary.activityCount++
        if (metadata.direction === 'expense') summary.spent += amount
        if (metadata.direction === 'income') summary.earned += amount
      }

      if (counterpartyName && metadata.direction === 'expense' && amount > 0) {
        getSummary(counterpartyName).earned += amount
      }

      return {
        ...entry,
        actorName,
        counterpartyName,
        playerName: entry.playerMasterId
          ? playerNames.get(entry.playerMasterId) || null
          : null,
        label: metadata.label,
        direction: metadata.direction,
      }
    })
    .sort(
      (left, right) =>
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    )

  return {
    activities,
    currentWeek,
    money,
    totalVolume: activities.reduce(
      (total, entry) => total + Math.abs(entry.amount || 0),
      0
    ),
    managerSummaries: [...summaries.values()].sort(
      (left, right) => right.spent + right.earned - (left.spent + left.earned)
    ),
  }
}

export class ActivityService {
  async getRadar(
    leagueId: string,
    teamId: string
  ): Promise<ApiResponse<ActivityRadar>> {
    const [
      activityResponse,
      rankingResponse,
      playersResponse,
      moneyResponse,
      weekResponse,
    ] = await Promise.all([
      apiClient.get<unknown>(
        `${endpoints.league.activity(leagueId, 0)}?x-lang=es`
      ),
      apiClient.get<unknown>(`${endpoints.league.ranking(leagueId)}?x-lang=es`),
      apiClient.get<unknown>(`${endpoints.player.all}?x-lang=es`),
      apiClient.get<unknown>(`${endpoints.team.money(teamId)}?x-lang=es`),
      apiClient.get<unknown>(`${endpoints.season.currentWeek}?x-lang=es`),
    ])

    const responses = [
      activityResponse,
      rankingResponse,
      playersResponse,
      moneyResponse,
      weekResponse,
    ]
    const failed = responses.find((response) => response.error)
    if (failed) {
      return { data: null, error: failed.error, status: failed.status }
    }

    const activity = parseLeagueActivity(activityResponse.data)
    const ranking = parseLeagueRanking(rankingResponse.data)
    const players = parseActivityPlayers(playersResponse.data)
    const money = parseTeamMoney(moneyResponse.data)
    const currentWeek = parseCurrentWeek(weekResponse.data)
    const invalid = [activity, ranking, players, money, currentWeek].find(
      (result) => result.error
    )

    if (
      invalid ||
      !activity.data ||
      !ranking.data ||
      !players.data ||
      !money.data ||
      !currentWeek.data
    ) {
      return {
        data: null,
        error: invalid?.error || 'Invalid activity radar response',
      }
    }

    return {
      data: buildActivityRadar(
        activity.data,
        ranking.data,
        players.data,
        money.data,
        currentWeek.data
      ),
      error: null,
      status: 200,
    }
  }
}

export const activityService = new ActivityService()
