import assert from 'node:assert/strict'
import test from 'node:test'
import type { Player } from '../src/entities/player.ts'
import {
  CLAUSE_WATCH_STORAGE_VERSION,
  type ClauseWatchTarget,
  evaluateClausePreflight,
  getClauseCheckInterval,
  parseStoredClauseWatches,
} from '../src/lib/clause-watch.ts'

const NOW = Date.parse('2026-08-17T12:00:00Z')

const target: ClauseWatchTarget = {
  version: CLAUSE_WATCH_STORAGE_VERSION,
  leagueId: 'league',
  teamId: 'mine',
  ownerTeamId: 'rival',
  playerId: 'player',
  playerTeamId: 'player-team',
  playerName: 'Player',
  expectedClause: 20_000_000,
  unlockAt: '2026-08-17T12:01:00Z',
  automatic: false,
  createdAt: '2026-08-17T10:00:00Z',
}

const player: Player = {
  id: 'player',
  playerTeamId: 'player-team',
  name: 'Player',
  positionId: 2,
  playerStatus: 'ok',
  team: { id: 'club', name: 'Club' },
  marketValue: 18_000_000,
  points: 0,
  averagePoints: 0,
  buyoutClause: 20_000_000,
  buyoutClauseLockedEndTime: target.unlockAt ?? undefined,
}

test('preflight waits for the exact upstream unlock instant', () => {
  assert.deepEqual(evaluateClausePreflight(target, player, 30_000_000, NOW), {
    code: 'waiting',
    ready: false,
    remainingMs: 60_000,
  })
  assert.deepEqual(
    evaluateClausePreflight(target, player, 30_000_000, NOW + 60_000),
    { code: 'ready', ready: true, remainingMs: 0 }
  )
  assert.equal(
    evaluateClausePreflight(
      target,
      { ...player, buyoutClauseLockedEndTime: undefined },
      30_000_000,
      NOW + 60_000
    ).code,
    'ready'
  )
})

test('preflight stops when price, owner, unlock or balance changes', () => {
  assert.equal(
    evaluateClausePreflight(
      target,
      { ...player, buyoutClause: 21_000_000 },
      30_000_000,
      NOW
    ).code,
    'clause-changed'
  )
  assert.equal(
    evaluateClausePreflight(target, null, 30_000_000, NOW).code,
    'player-moved'
  )
  assert.equal(
    evaluateClausePreflight(
      target,
      { ...player, playerTeamId: 'another-player-team' },
      30_000_000,
      NOW
    ).code,
    'player-moved'
  )
  assert.equal(
    evaluateClausePreflight(
      target,
      { ...player, buyoutClauseLockedEndTime: '2026-08-18T12:00:00Z' },
      30_000_000,
      NOW
    ).code,
    'unlock-changed'
  )
  assert.equal(
    evaluateClausePreflight(target, player, 19_999_999, NOW).code,
    'insufficient-balance'
  )
})

test('stored watches reject malformed or obsolete entries', () => {
  assert.deepEqual(parseStoredClauseWatches('not-json'), [])
  assert.deepEqual(
    parseStoredClauseWatches(JSON.stringify([{ ...target, version: 99 }])),
    []
  )
  assert.deepEqual(parseStoredClauseWatches(JSON.stringify([target])), [target])
})

test('network checks only become frequent near the unlock', () => {
  assert.equal(getClauseCheckInterval(60_001), null)
  assert.equal(getClauseCheckInterval(60_000), 5_000)
  assert.equal(getClauseCheckInterval(10_000), 1_000)
  assert.equal(getClauseCheckInterval(0), null)
})
