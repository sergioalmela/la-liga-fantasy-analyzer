import type { Player } from '@/entities/player'

const STORAGE_KEY = 'laliga-fantasy-market-values-v1'
const RETENTION_DAYS = 14
const TREND_WINDOW_DAYS = 7
const DAY_IN_MS = 24 * 60 * 60 * 1000

export interface MarketValueSnapshot {
  day: string
  values: Record<string, number>
}

export interface MarketValueHistory {
  version: 1
  snapshots: MarketValueSnapshot[]
}

export interface MarketTrend {
  direction: 'up' | 'down' | 'stable'
  change: number
  changePercent: number
  days: number
}

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function dayTimestamp(day: string): number {
  return Date.parse(`${day}T00:00:00.000Z`)
}

function isValidHistory(value: unknown): value is MarketValueHistory {
  if (!value || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  if (record.version !== 1 || !Array.isArray(record.snapshots)) return false

  return record.snapshots.every((snapshot) => {
    if (!snapshot || typeof snapshot !== 'object') return false
    const entry = snapshot as Record<string, unknown>
    if (
      typeof entry.day !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(entry.day)
    ) {
      return false
    }
    if (!entry.values || typeof entry.values !== 'object') return false
    return Object.values(entry.values).every(
      (marketValue) =>
        typeof marketValue === 'number' &&
        Number.isSafeInteger(marketValue) &&
        marketValue > 0
    )
  })
}

export function updateMarketValueHistory(
  history: MarketValueHistory,
  players: Player[],
  now: Date
): MarketValueHistory {
  const today = dayKey(now)
  const minimumTimestamp =
    dayTimestamp(today) - (RETENTION_DAYS - 1) * DAY_IN_MS
  const snapshots = history.snapshots
    .filter((snapshot) => dayTimestamp(snapshot.day) >= minimumTimestamp)
    .map((snapshot) => ({ ...snapshot, values: { ...snapshot.values } }))
  let current = snapshots.find((snapshot) => snapshot.day === today)

  if (!current) {
    current = { day: today, values: {} }
    snapshots.push(current)
  }

  for (const player of players) {
    if (Number.isSafeInteger(player.marketValue) && player.marketValue > 0) {
      current.values[player.id] = player.marketValue
    }
  }

  return {
    version: 1,
    snapshots: snapshots.sort((left, right) =>
      left.day.localeCompare(right.day)
    ),
  }
}

export function buildMarketTrends(
  history: MarketValueHistory,
  players: Player[],
  now: Date
): Map<string, MarketTrend> {
  const trends = new Map<string, MarketTrend>()
  const today = dayKey(now)
  const todayTimestamp = dayTimestamp(today)
  const minimumTimestamp = todayTimestamp - TREND_WINDOW_DAYS * DAY_IN_MS

  for (const player of players) {
    const baseline = history.snapshots.find((snapshot) => {
      const timestamp = dayTimestamp(snapshot.day)
      return (
        timestamp >= minimumTimestamp &&
        timestamp < todayTimestamp &&
        snapshot.values[player.id] !== undefined
      )
    })
    const previousValue = baseline?.values[player.id]
    if (!baseline || !previousValue || player.marketValue <= 0) continue

    const change = player.marketValue - previousValue
    const changePercent = Number(((change / previousValue) * 100).toFixed(2))
    const days = Math.max(
      1,
      Math.round((todayTimestamp - dayTimestamp(baseline.day)) / DAY_IN_MS)
    )
    trends.set(player.id, {
      direction: change > 0 ? 'up' : change < 0 ? 'down' : 'stable',
      change,
      changePercent,
      days,
    })
  }

  return trends
}

export function recordAndBuildMarketTrends(
  players: Player[],
  now = new Date()
): Map<string, MarketTrend> {
  if (typeof window === 'undefined') return new Map()

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    const parsed: unknown = stored ? JSON.parse(stored) : null
    const history: MarketValueHistory = isValidHistory(parsed)
      ? parsed
      : { version: 1, snapshots: [] }
    const updated = updateMarketValueHistory(history, players, now)
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    return buildMarketTrends(updated, players, now)
  } catch {
    return new Map()
  }
}
