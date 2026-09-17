import assert from 'node:assert/strict'
import test from 'node:test'
import type { Player } from '../src/entities/player.ts'
import {
  getEffectivePointsAverage,
  getRecentForm,
} from '../src/services/recent-form-service.ts'

const player: Player = {
  id: 'example',
  name: 'Example',
  positionId: 2,
  playerStatus: 'ok',
  team: { id: 'team', name: 'Team' },
  marketValue: 10_000_000,
  points: 60,
  averagePoints: 6,
}

test('falls back to season average when recent scores are unavailable', () => {
  assert.equal(getRecentForm(player), null)
  assert.equal(getEffectivePointsAverage(player), 6)
})

test('weighs the latest three scores by recency and blends with season average', () => {
  const form = getRecentForm({
    ...player,
    recentPoints: [
      { weekNumber: 2, totalPoints: 8 },
      { weekNumber: 3, totalPoints: 1 },
      { weekNumber: 1, totalPoints: 8 },
    ],
  })
  assert.ok(form)
  assert.deepEqual(
    form.games.map(({ weekNumber }) => weekNumber),
    [3, 2, 1]
  )
  assert.equal(form.average, 4.5)
  assert.ok(Math.abs(form.effectiveAverage - 4.95) < 0.0001)
  assert.equal(form.direction, 'down')
})

test('one recent score influences ranking less than three scores', () => {
  const one = getRecentForm({
    ...player,
    recentPoints: [{ weekNumber: 3, totalPoints: 0 }],
  })
  const three = getRecentForm({
    ...player,
    recentPoints: [
      { weekNumber: 3, totalPoints: 0 },
      { weekNumber: 2, totalPoints: 0 },
      { weekNumber: 1, totalPoints: 0 },
    ],
  })
  assert.ok(one && Math.abs(one.effectiveAverage - 4.2) < 0.0001)
  assert.ok(three && Math.abs(three.effectiveAverage - 1.8) < 0.0001)
})
