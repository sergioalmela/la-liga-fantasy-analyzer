import assert from 'node:assert/strict'
import test from 'node:test'
import type { Player } from '../src/entities/player.ts'
import {
  filterPlayersByClauseUnlock,
  getClauseUnlockRemainingHours,
  getClauseUnlockUrgencyBonus,
  getPlayersWithExpiringProtection,
} from '../src/services/player-analytics-service.ts'
import { sortOpportunities } from '../src/utils/player-sorting-utils.ts'

const NOW = new Date('2026-08-05T12:00:00Z').getTime()

function player(
  id: string,
  unlockInHours: number | null,
  hasClause = true
): Player {
  return {
    id,
    name: id,
    positionId: 2,
    playerStatus: 'ok',
    team: { id: '1', name: 'Team' },
    marketValue: 10_000_000,
    points: 50,
    averagePoints: 5,
    ...(hasClause ? { buyoutClause: 11_000_000 } : {}),
    ...(unlockInHours === null
      ? {}
      : {
          buyoutClauseLockedEndTime: new Date(
            NOW + unlockInHours * 60 * 60 * 1000
          ).toISOString(),
        }),
  }
}

test('filters players by cumulative clause unlock windows', () => {
  const players = [
    player('unprotected', null),
    player('expired', -2),
    player('soon', 8),
    player('tomorrow', 30),
    player('later', 60),
    player('no-clause', 2, false),
  ]

  assert.deepEqual(
    filterPlayersByClauseUnlock(players, 'unlocked', NOW).map(({ id }) => id),
    ['unprotected', 'expired']
  )
  assert.deepEqual(
    filterPlayersByClauseUnlock(players, '24h', NOW).map(({ id }) => id),
    ['unprotected', 'expired', 'soon']
  )
  assert.deepEqual(
    filterPlayersByClauseUnlock(players, '48h', NOW).map(({ id }) => id),
    ['unprotected', 'expired', 'soon', 'tomorrow']
  )
  assert.equal(filterPlayersByClauseUnlock(players, 'all', NOW), players)
})

test('rejects invalid unlock dates instead of treating them as urgent', () => {
  const invalid = {
    ...player('invalid', null),
    buyoutClauseLockedEndTime: 'not-a-date',
  }

  assert.equal(getClauseUnlockRemainingHours(invalid, NOW), null)
  assert.equal(getClauseUnlockUrgencyBonus(invalid, NOW), 0)
  assert.deepEqual(filterPlayersByClauseUnlock([invalid], '48h', NOW), [])
})

test('assigns a progressive bonus as clause protection approaches', () => {
  assert.equal(getClauseUnlockUrgencyBonus(player('open', null), NOW), 30)
  assert.equal(getClauseUnlockUrgencyBonus(player('12h', 12), NOW), 25)
  assert.equal(getClauseUnlockUrgencyBonus(player('24h', 24), NOW), 18)
  assert.equal(getClauseUnlockUrgencyBonus(player('48h', 48), NOW), 10)
  assert.equal(getClauseUnlockUrgencyBonus(player('72h', 72), NOW), 5)
  assert.equal(getClauseUnlockUrgencyBonus(player('later', 73), NOW), 0)
})

test('counts only active protections expiring within 72 hours', () => {
  const players = [
    player('unprotected', null),
    player('expired', -1),
    player('soon', 12),
    player('three-days', 72),
    player('later', 73),
  ]

  assert.deepEqual(
    getPlayersWithExpiringProtection(players, NOW).map(({ id }) => id),
    ['soon', 'three-days']
  )
})

test('ranks otherwise equal players by clause unlock urgency', () => {
  const players = [
    player('later', 96),
    player('tomorrow', 20),
    player('unlocked', null),
  ]

  assert.deepEqual(
    sortOpportunities(players, undefined, NOW).map(({ id }) => id),
    ['unlocked', 'tomorrow', 'later']
  )
})
