import assert from 'node:assert/strict'
import test from 'node:test'
import type { Player } from '../src/entities/player.ts'
import type { MarketTrend } from '../src/services/market-trend-service.ts'
import {
  buildLineupPayload,
  getSellCandidates,
  getSquadNeeds,
  projectMarketValue,
  recommendLineup,
} from '../src/services/squad-advisor-service.ts'

function player(id: string, positionId: number, averagePoints = 1): Player {
  return {
    id,
    name: id,
    positionId,
    playerStatus: 'ok',
    team: { id: 'club', name: 'Club' },
    marketValue: 10_000_000,
    points: averagePoints * 10,
    averagePoints,
  }
}

test('recommends a position-valid lineup for the selected formation', () => {
  const players = [
    ...Array.from({ length: 2 }, (_, index) => player(`gk-${index}`, 1, index)),
    ...Array.from({ length: 6 }, (_, index) =>
      player(`def-${index}`, 2, index)
    ),
    ...Array.from({ length: 6 }, (_, index) =>
      player(`mid-${index}`, 3, index)
    ),
    ...Array.from({ length: 4 }, (_, index) =>
      player(`fwd-${index}`, 4, index)
    ),
  ]
  const lineup = recommendLineup(players, '4-3-3')

  assert.equal(lineup.length, 11)
  assert.deepEqual(
    [1, 2, 3, 4].map(
      (positionId) =>
        lineup.filter((entry) => entry.positionId === positionId).length
    ),
    [1, 4, 3, 3]
  )
  assert.ok(lineup.some((entry) => entry.id === 'def-5'))
  const withTeamIds = lineup.map((entry) => ({
    ...entry,
    playerTeamId: `team-${entry.id}`,
  }))
  const payload = buildLineupPayload(withTeamIds, '4-3-3')
  assert.deepEqual(payload?.tactical_formation, [4, 3, 3])
  assert.equal(payload?.defender.length, 4)
})

test('reports minimum squad gaps without inventing players', () => {
  assert.deepEqual(getSquadNeeds([player('gk', 1), player('def', 2)]), [
    { positionId: 1, missing: 1 },
    { positionId: 2, missing: 4 },
    { positionId: 3, missing: 5 },
    { positionId: 4, missing: 3 },
  ])
})

test('only suggests selling surplus non-lineup players with a warning signal', () => {
  const players = Array.from({ length: 6 }, (_, index) =>
    player(`def-${index}`, 2, 6 - index)
  )
  const lineup = players.slice(0, 4)
  const falling: MarketTrend = {
    direction: 'down',
    momentumScore: -2,
    periods: [
      { days: 3, direction: 'down', change: -300_000, changePercent: -3 },
    ],
  }
  const trends = new Map([[players[5].id, falling]])

  assert.deepEqual(
    getSellCandidates(players, lineup, new Map(), trends).map(
      (candidate) => candidate.player.id
    ),
    ['def-5']
  )
})

test('projects seven days conservatively and caps extreme changes', () => {
  const trend: MarketTrend = {
    direction: 'up',
    momentumScore: 10,
    periods: [
      { days: 3, direction: 'up', change: 3_000_000, changePercent: 30 },
      { days: 7, direction: 'up', change: 7_000_000, changePercent: 70 },
    ],
  }
  assert.deepEqual(projectMarketValue(10_000_000, trend), {
    value: 12_000_000,
    change: 2_000_000,
    confidence: 'medium',
  })
})
