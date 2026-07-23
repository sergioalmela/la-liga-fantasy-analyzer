import type { Player } from '@/entities/player'
import { apiClient, endpoints } from './api-client.ts'

const TREND_PERIODS = [1, 3, 7] as const
const PERIOD_WEIGHTS = { 1: 0.4, 3: 0.4, 7: 0.2 } as const
const DAY_IN_MS = 24 * 60 * 60 * 1000
const MAX_CONCURRENT_REQUESTS = 6
const CACHE_TTL_MS = 6 * 60 * 60 * 1000

export type MarketTrendDays = (typeof TREND_PERIODS)[number]

export interface MarketValuePoint {
  marketValue: number
  date: string
}

export interface MarketTrendPeriod {
  days: MarketTrendDays
  direction: 'up' | 'down' | 'stable'
  change: number
  changePercent: number
}

export interface MarketTrend {
  direction: 'up' | 'down' | 'stable'
  momentumScore: number
  periods: MarketTrendPeriod[]
}

interface CachedTrend {
  expiresAt: number
  promise: Promise<MarketTrend | null>
}

const trendCache = new Map<string, CachedTrend>()

function asPositiveInteger(value: unknown): number | null {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim()
        ? Number(value)
        : Number.NaN

  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null
}

export function parseMarketValueHistory(value: unknown): MarketValuePoint[] {
  if (!Array.isArray(value)) return []

  const byTimestamp = new Map<number, MarketValuePoint>()
  for (const entry of value) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue

    const record = entry as Record<string, unknown>
    const marketValue = asPositiveInteger(record.marketValue)
    const date = typeof record.date === 'string' ? record.date : ''
    const timestamp = Date.parse(date)
    if (!marketValue || !date || !Number.isFinite(timestamp)) continue

    byTimestamp.set(timestamp, { marketValue, date })
  }

  return [...byTimestamp.entries()]
    .sort(([left], [right]) => left - right)
    .map(([, point]) => point)
}

export function calculateMarketTrend(history: unknown): MarketTrend | null {
  const points = parseMarketValueHistory(history)
  const latest = points.at(-1)
  if (!latest) return null

  const latestTimestamp = Date.parse(latest.date)
  const periods = TREND_PERIODS.flatMap((days): MarketTrendPeriod[] => {
    const targetTimestamp = latestTimestamp - days * DAY_IN_MS
    const baseline = points.findLast(
      (point) => Date.parse(point.date) <= targetTimestamp
    )
    if (!baseline) return []

    const change = latest.marketValue - baseline.marketValue
    const changePercent = Number(
      ((change / baseline.marketValue) * 100).toFixed(2)
    )

    return [
      {
        days,
        direction: change > 0 ? 'up' : change < 0 ? 'down' : 'stable',
        change,
        changePercent,
      },
    ]
  })

  if (periods.length === 0) return null

  const availableWeight = periods.reduce(
    (total, period) => total + PERIOD_WEIGHTS[period.days],
    0
  )
  const momentumScore = Number(
    (
      periods.reduce(
        (total, period) =>
          total + period.changePercent * PERIOD_WEIGHTS[period.days],
        0
      ) / availableWeight
    ).toFixed(2)
  )

  return {
    direction: momentumScore > 0 ? 'up' : momentumScore < 0 ? 'down' : 'stable',
    momentumScore,
    periods,
  }
}

async function fetchPlayerMarketTrend(
  playerId: string
): Promise<MarketTrend | null> {
  const cached = trendCache.get(playerId)
  if (cached && cached.expiresAt > Date.now()) return cached.promise

  const promise = apiClient
    .get<unknown>(endpoints.player.marketValue(playerId))
    .then((result) => calculateMarketTrend(result.data))

  trendCache.set(playerId, {
    expiresAt: Date.now() + CACHE_TTL_MS,
    promise,
  })

  const trend = await promise
  if (!trend) trendCache.delete(playerId)
  return trend
}

export async function getMarketTrends(
  players: Player[]
): Promise<Map<string, MarketTrend>> {
  const playerIds = [...new Set(players.map((player) => player.id))]
  const trends = new Map<string, MarketTrend>()
  let nextIndex = 0

  const worker = async () => {
    while (nextIndex < playerIds.length) {
      const playerId = playerIds[nextIndex]
      nextIndex += 1
      const trend = await fetchPlayerMarketTrend(playerId)
      if (trend) trends.set(playerId, trend)
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(MAX_CONCURRENT_REQUESTS, playerIds.length) },
      worker
    )
  )

  return trends
}
