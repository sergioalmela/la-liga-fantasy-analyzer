import type { Player } from '@/entities/player'
import {
  type ClausePreflight,
  type ClauseWatchTarget,
  evaluateClausePreflight,
} from '@/lib/clause-watch'
import { apiClient, endpoints } from '@/services/api-client'
import { teamService } from '@/services/team-service'
import type { ApiResponse } from '@/types/api'

export interface ClauseCheckResult {
  player: Player | null
  teamMoney: number | null
  preflight: ClausePreflight | null
  checkedAt: number
  clockOffsetMs: number
  error: string | null
}

export async function checkClauseTarget(
  target: ClauseWatchTarget
): Promise<ClauseCheckResult> {
  const [ownerResult, moneyResult] = await Promise.all([
    teamService.getPlayers(target.leagueId, target.ownerTeamId),
    teamService.getMoney(target.teamId),
  ])
  const clockOffsetMs = ownerResult.clockOffsetMs ?? 0
  const checkedAt = Date.now() + clockOffsetMs

  if (ownerResult.error || moneyResult.error) {
    return {
      player: null,
      teamMoney: moneyResult.data?.teamMoney ?? null,
      preflight: null,
      checkedAt,
      clockOffsetMs,
      error: ownerResult.error || moneyResult.error || 'Clause check failed',
    }
  }

  const player =
    ownerResult.data?.find((candidate) => candidate.id === target.playerId) ??
    null
  const teamMoney = moneyResult.data?.teamMoney ?? null
  if (teamMoney === null) {
    return {
      player,
      teamMoney: null,
      preflight: null,
      checkedAt,
      clockOffsetMs,
      error: 'Team balance is unavailable',
    }
  }

  return {
    player,
    teamMoney,
    preflight: evaluateClausePreflight(target, player, teamMoney, checkedAt),
    checkedAt,
    clockOffsetMs,
    error: null,
  }
}

export async function payBuyoutClause(
  target: ClauseWatchTarget
): Promise<ApiResponse<unknown>> {
  return apiClient.post<unknown>(
    endpoints.market.payBuyout(target.leagueId, target.playerTeamId),
    { buyoutClauseToPay: target.expectedClause }
  )
}
