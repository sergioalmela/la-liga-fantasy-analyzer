import assert from 'node:assert/strict'
import test from 'node:test'
import type { Player } from '../src/entities/player.ts'
import type { StartingProbability } from '../src/lib/starting-probability.ts'
import type { MarketTrend } from '../src/services/market-trend-service.ts'
import {
  buildLineupPayload,
  getSellCandidates,
  getSquadNeeds,
  recommendBestLineup,
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

function probabilities(entries: Array<[string, number]>) {
  return new Map<string, StartingProbability>(
    entries.map(([id, probability]) => [
      id,
      {
        probability,
        sourceName: 'FútbolFantasy',
        sourceUrl: `https://www.futbolfantasy.com/jugadores/${id}`,
      },
    ])
  )
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

test('prioritizes the 50 percent threshold over a higher points average', () => {
  const highProbability = player('safe', 4, 3)
  const highAverage = player('risky', 4, 12)
  const squad = [
    player('gk', 1),
    ...Array.from({ length: 5 }, (_, index) => player(`def-${index}`, 2)),
    ...Array.from({ length: 5 }, (_, index) => player(`mid-${index}`, 3)),
    highProbability,
    highAverage,
    player('fwd-third', 4),
  ]
  const chance = probabilities([
    ['safe', 50],
    ['risky', 49],
    ['fwd-third', 80],
  ])

  const lineup = recommendLineup(squad, '4-4-2', chance)

  assert.ok(lineup.some((entry) => entry.id === 'safe'))
  assert.ok(!lineup.some((entry) => entry.id === 'risky'))
})

test('recommends the formation with the fewest players below 50 percent', () => {
  const squad = [
    player('gk', 1, 5),
    ...Array.from({ length: 5 }, (_, index) => player(`def-${index}`, 2, 4)),
    ...Array.from({ length: 5 }, (_, index) => player(`mid-${index}`, 3, 4)),
    ...Array.from({ length: 3 }, (_, index) => player(`fwd-${index}`, 4, 6)),
  ]
  const chance = probabilities(
    squad.map((entry): [string, number] => [
      entry.id,
      entry.id === 'mid-3' || entry.id === 'mid-4' ? 30 : 80,
    ])
  )

  const recommendation = recommendBestLineup(squad, chance)

  assert.equal(recommendation.formation, '4-3-3')
  assert.equal(recommendation.belowMinimumProbability.length, 0)
  assert.equal(recommendation.lineup.length, 11)
})

test('uses the best sub-50 player only when a position cannot meet the threshold', () => {
  const squad = [
    player('gk', 1),
    ...Array.from({ length: 4 }, (_, index) => player(`def-${index}`, 2)),
    ...Array.from({ length: 4 }, (_, index) => player(`mid-${index}`, 3)),
    player('fwd-safe', 4, 2),
    player('fwd-45', 4, 8),
    player('fwd-20', 4, 12),
  ]
  const chance = probabilities(
    squad.map((entry): [string, number] => {
      if (entry.id === 'fwd-safe') return [entry.id, 90]
      if (entry.id === 'fwd-45') return [entry.id, 45]
      if (entry.id === 'fwd-20') return [entry.id, 20]
      return [entry.id, 80]
    })
  )

  const recommendation = recommendBestLineup(squad, chance)

  assert.equal(recommendation.formation, '4-4-2')
  assert.deepEqual(
    recommendation.belowMinimumProbability.map((entry) => entry.id),
    ['fwd-45']
  )
  assert.deepEqual(
    recommendation.lineup
      .filter((entry) => entry.positionId === 4)
      .map((entry) => entry.id),
    ['fwd-safe', 'fwd-45']
  )
})

test('prefers a known sub-50 probability to a missing prediction when forced', () => {
  const known = player('known', 4, 2)
  const unknown = player('unknown', 4, 20)

  const lineup = recommendLineup(
    [known, unknown],
    '4-5-1',
    probabilities([['known', 49]])
  )

  assert.deepEqual(
    lineup.map((entry) => entry.id),
    ['known']
  )
})

test('considers premium formations when the league enables them', () => {
  const squad = [
    player('gk', 1),
    ...Array.from({ length: 5 }, (_, index) => player(`def-${index}`, 2)),
    ...Array.from({ length: 2 }, (_, index) => player(`mid-${index}`, 3)),
    ...Array.from({ length: 3 }, (_, index) => player(`fwd-${index}`, 4)),
  ]
  const chance = probabilities(
    squad.map((entry): [string, number] => [entry.id, 80])
  )

  const recommendation = recommendBestLineup(squad, chance, new Map(), true)

  assert.equal(recommendation.formation, '5-2-3')
  assert.equal(recommendation.lineup.length, 11)
  const lineupWithTeamIds = recommendation.lineup.map((entry) => ({
    ...entry,
    playerTeamId: `team-${entry.id}`,
  }))
  assert.deepEqual(
    buildLineupPayload(lineupWithTeamIds, recommendation.formation)
      ?.tactical_formation,
    [5, 2, 3]
  )
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
      { days: 1, direction: 'down', change: -100_000, changePercent: -1 },
      { days: 3, direction: 'down', change: -300_000, changePercent: -3 },
      { days: 7, direction: 'down', change: -700_000, changePercent: -7 },
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
