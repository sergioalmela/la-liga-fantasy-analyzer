import type { Player } from '../entities/player.ts'

export const CLAUSE_WATCH_STORAGE_VERSION = 2

export interface ClauseWatchTarget {
  version: typeof CLAUSE_WATCH_STORAGE_VERSION
  leagueId: string
  teamId: string
  ownerTeamId: string
  playerId: string
  playerTeamId: string
  playerName: string
  expectedClause: number
  unlockAt: string | null
  automatic: boolean
  createdAt: string
}

export type ClausePreflightCode =
  | 'waiting'
  | 'ready'
  | 'player-moved'
  | 'clause-changed'
  | 'unlock-changed'
  | 'insufficient-balance'
  | 'invalid-unlock'

export interface ClausePreflight {
  code: ClausePreflightCode
  ready: boolean
  remainingMs: number | null
}

export function getClauseWatchStorageKey(leagueId: string): string {
  return `laliga-fantasy:clause-watch:v${CLAUSE_WATCH_STORAGE_VERSION}:${leagueId}`
}

export function getUnlockTimestamp(unlockAt: string | null): number | null {
  if (!unlockAt) return 0
  const timestamp = Date.parse(unlockAt)
  return Number.isFinite(timestamp) ? timestamp : null
}

export function evaluateClausePreflight(
  target: ClauseWatchTarget,
  currentPlayer: Player | null,
  teamMoney: number,
  now: number
): ClausePreflight {
  if (!currentPlayer || currentPlayer.playerTeamId !== target.playerTeamId) {
    return { code: 'player-moved', ready: false, remainingMs: null }
  }

  if (currentPlayer.buyoutClause !== target.expectedClause) {
    return { code: 'clause-changed', ready: false, remainingMs: null }
  }

  if (teamMoney < target.expectedClause) {
    return { code: 'insufficient-balance', ready: false, remainingMs: null }
  }

  const expectedUnlock = getUnlockTimestamp(target.unlockAt)
  const currentUnlock = getUnlockTimestamp(
    currentPlayer.buyoutClauseLockedEndTime ?? null
  )
  if (expectedUnlock === null || currentUnlock === null) {
    return { code: 'invalid-unlock', ready: false, remainingMs: null }
  }

  const upstreamRemovedExpiredLock =
    currentUnlock === 0 && expectedUnlock > 0 && now >= expectedUnlock
  if (expectedUnlock !== currentUnlock && !upstreamRemovedExpiredLock) {
    return { code: 'unlock-changed', ready: false, remainingMs: null }
  }

  const remainingMs = Math.max(
    0,
    (upstreamRemovedExpiredLock ? expectedUnlock : currentUnlock) - now
  )
  return {
    code: remainingMs === 0 ? 'ready' : 'waiting',
    ready: remainingMs === 0,
    remainingMs,
  }
}

export function parseStoredClauseWatches(
  value: string | null
): ClauseWatchTarget[] {
  if (!value) return []

  try {
    const parsed = JSON.parse(value) as unknown
    if (!Array.isArray(parsed)) return []

    return parsed.filter((entry): entry is ClauseWatchTarget => {
      if (!entry || typeof entry !== 'object') return false
      const record = entry as Record<string, unknown>
      return (
        record.version === CLAUSE_WATCH_STORAGE_VERSION &&
        typeof record.leagueId === 'string' &&
        typeof record.teamId === 'string' &&
        typeof record.ownerTeamId === 'string' &&
        typeof record.playerId === 'string' &&
        typeof record.playerTeamId === 'string' &&
        typeof record.playerName === 'string' &&
        typeof record.expectedClause === 'number' &&
        Number.isSafeInteger(record.expectedClause) &&
        record.expectedClause > 0 &&
        (record.unlockAt === null || typeof record.unlockAt === 'string') &&
        typeof record.automatic === 'boolean' &&
        typeof record.createdAt === 'string'
      )
    })
  } catch {
    return []
  }
}

export function getClauseCheckInterval(remainingMs: number): number | null {
  if (remainingMs <= 0) return null
  if (remainingMs > 60_000) return null
  if (remainingMs > 10_000) return 5_000
  return 1_000
}
