import assert from 'node:assert/strict'
import test from 'node:test'
import {
  calculateMarketTrend,
  parseMarketValueHistory,
} from '../src/services/market-trend-service.ts'

test('parses, sorts and filters Fantasy market-value history', () => {
  assert.deepEqual(
    parseMarketValueHistory([
      {
        marketValue: '90',
        date: '2026-07-23T00:00:00+02:00',
        ignored: 'field',
      },
      { marketValue: 88, date: '2026-07-22T00:00:00+02:00' },
      { marketValue: 0, date: '2026-07-21T00:00:00+02:00' },
      { marketValue: 87, date: 'not-a-date' },
      null,
    ]),
    [
      { marketValue: 88, date: '2026-07-22T00:00:00+02:00' },
      { marketValue: 90, date: '2026-07-23T00:00:00+02:00' },
    ]
  )
})

test('calculates Cubarsi official 1, 3 and 7 day trends and momentum', () => {
  const trend = calculateMarketTrend([
    { marketValue: 75_289_650, date: '2026-07-16T00:00:00+02:00' },
    { marketValue: 77_714_306, date: '2026-07-17T00:00:00+02:00' },
    { marketValue: 80_312_626, date: '2026-07-18T00:00:00+02:00' },
    { marketValue: 82_823_490, date: '2026-07-19T00:00:00+02:00' },
    { marketValue: 84_479_799, date: '2026-07-20T00:00:00+02:00' },
    { marketValue: 87_224_185, date: '2026-07-21T00:00:00+02:00' },
    { marketValue: 88_321_779, date: '2026-07-22T00:00:00+02:00' },
    { marketValue: 90_605_767, date: '2026-07-23T00:00:00+02:00' },
  ])

  assert.deepEqual(trend, {
    direction: 'up',
    momentumScore: 8,
    periods: [
      {
        days: 1,
        direction: 'up',
        change: 2_283_988,
        changePercent: 2.59,
      },
      {
        days: 3,
        direction: 'up',
        change: 6_125_968,
        changePercent: 7.25,
      },
      {
        days: 7,
        direction: 'up',
        change: 15_316_117,
        changePercent: 20.34,
      },
    ],
  })
})

test('detects falling and stable periods', () => {
  const falling = calculateMarketTrend([
    { marketValue: 12_000_000, date: '2026-07-16T00:00:00Z' },
    { marketValue: 10_000_000, date: '2026-07-23T00:00:00Z' },
  ])
  const stable = calculateMarketTrend([
    { marketValue: 10_000_000, date: '2026-07-22T00:00:00Z' },
    { marketValue: 10_000_000, date: '2026-07-23T00:00:00Z' },
  ])

  assert.equal(falling?.direction, 'down')
  assert.equal(falling?.periods[0]?.changePercent, -16.67)
  assert.equal(stable?.direction, 'stable')
  assert.equal(stable?.periods[0]?.changePercent, 0)
})

test('requires at least one previous daily value', () => {
  assert.equal(
    calculateMarketTrend([
      { marketValue: 10_000_000, date: '2026-07-23T00:00:00Z' },
    ]),
    null
  )
})
