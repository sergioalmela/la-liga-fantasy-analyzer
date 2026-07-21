import assert from 'node:assert/strict'
import test from 'node:test'
import type { Player } from '../src/entities/player.ts'
import {
  buildMarketTrends,
  type MarketValueHistory,
  updateMarketValueHistory,
} from '../src/services/market-trend-service.ts'

function player(id: string, marketValue: number): Player {
  return {
    id,
    name: `Player ${id}`,
    positionId: 1,
    playerStatus: 'ok',
    team: { id: 'team', name: 'Team' },
    marketValue,
    points: 0,
    averagePoints: 0,
  }
}

test('builds a current seven-day trend from daily Fantasy values', () => {
  const initial: MarketValueHistory = { version: 1, snapshots: [] }
  const firstDay = updateMarketValueHistory(
    initial,
    [player('up', 10_000_000), player('down', 20_000_000)],
    new Date('2026-07-18T12:00:00Z')
  )
  const currentPlayers = [player('up', 11_000_000), player('down', 18_000_000)]
  const current = updateMarketValueHistory(
    firstDay,
    currentPlayers,
    new Date('2026-07-21T12:00:00Z')
  )
  const trends = buildMarketTrends(
    current,
    currentPlayers,
    new Date('2026-07-21T12:00:00Z')
  )

  assert.deepEqual(trends.get('up'), {
    direction: 'up',
    change: 1_000_000,
    changePercent: 10,
    days: 3,
  })
  assert.deepEqual(trends.get('down'), {
    direction: 'down',
    change: -2_000_000,
    changePercent: -10,
    days: 3,
  })
})

test('does not invent a trend before a previous daily snapshot exists', () => {
  const players = [player('new', 10_000_000)]
  const history = updateMarketValueHistory(
    { version: 1, snapshots: [] },
    players,
    new Date('2026-07-21T12:00:00Z')
  )

  assert.equal(
    buildMarketTrends(history, players, new Date('2026-07-21T12:00:00Z')).size,
    0
  )
})

test('merges market and opportunity values recorded on the same day', () => {
  const initial: MarketValueHistory = { version: 1, snapshots: [] }
  const market = updateMarketValueHistory(
    initial,
    [player('market', 10_000_000)],
    new Date('2026-07-21T10:00:00Z')
  )
  const merged = updateMarketValueHistory(
    market,
    [player('opportunity', 20_000_000)],
    new Date('2026-07-21T18:00:00Z')
  )

  assert.deepEqual(merged.snapshots[0].values, {
    market: 10_000_000,
    opportunity: 20_000_000,
  })
})
