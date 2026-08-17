'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Player } from '@/entities/player'
import {
  CLAUSE_WATCH_STORAGE_VERSION,
  type ClausePreflightCode,
  type ClauseWatchTarget,
  getClauseCheckInterval,
  getClauseWatchStorageKey,
  getUnlockTimestamp,
  parseStoredClauseWatches,
} from '@/lib/clause-watch'
import { checkClauseTarget, payBuyoutClause } from '@/services/clause-service'

export type ClauseWatchPhase =
  | 'idle'
  | 'checking'
  | ClausePreflightCode
  | 'purchasing'
  | 'purchased'
  | 'failed'

export interface ClauseWatchRuntime {
  phase: ClauseWatchPhase
  checkedAt?: number
  teamMoney?: number
  error?: string
}

interface UseClauseWatchOptions {
  leagueId: string
  teamId: string
  onPurchased: (target: ClauseWatchTarget) => void | Promise<void>
}

function normalizeClockOffset(offset: number): number {
  // HTTP dates only have one-second precision. Small differences are more
  // likely rounding noise than a clock that needs correcting.
  return Math.abs(offset) < 1_500 ? 0 : offset
}

export function useClauseWatch({
  leagueId,
  teamId,
  onPurchased,
}: UseClauseWatchOptions) {
  const [watches, setWatches] = useState<ClauseWatchTarget[]>([])
  const [runtime, setRuntime] = useState<Record<string, ClauseWatchRuntime>>({})
  const [now, setNow] = useState(Date.now())
  const [clockOffsetMs, setClockOffsetMs] = useState(0)
  const loadedRef = useRef(false)
  const watchesRef = useRef(watches)
  const clockOffsetRef = useRef(clockOffsetMs)
  const checkingRef = useRef(new Set<string>())
  const attemptedRef = useRef(new Set<string>())
  const lastCheckRef = useRef(new Map<string, number>())
  const lastSafePreflightRef = useRef(new Map<string, number>())
  const purchaseInFlightRef = useRef(false)
  const notifiedRef = useRef(new Set<string>())
  const originalTitleRef = useRef<string | null>(null)

  useEffect(() => {
    watchesRef.current = watches
  }, [watches])

  useEffect(() => {
    clockOffsetRef.current = clockOffsetMs
  }, [clockOffsetMs])

  useEffect(() => {
    loadedRef.current = false
    let stored: ClauseWatchTarget[] = []
    try {
      stored = parseStoredClauseWatches(
        window.localStorage.getItem(getClauseWatchStorageKey(leagueId))
      ).filter((target) => target.teamId === teamId)
    } catch {
      stored = []
    }
    setWatches(stored)
    setRuntime({})
    loadedRef.current = true
  }, [leagueId, teamId])

  useEffect(() => {
    if (!loadedRef.current) return
    try {
      window.localStorage.setItem(
        getClauseWatchStorageKey(leagueId),
        JSON.stringify(
          watches.map((target) => ({ ...target, automatic: false }))
        )
      )
    } catch {
      // Watching still works for the current tab when storage is unavailable.
    }
  }, [leagueId, watches])

  useEffect(() => {
    const timer = window.setInterval(
      () => setNow(Date.now() + clockOffsetRef.current),
      100
    )
    return () => window.clearInterval(timer)
  }, [])

  const setTargetRuntime = useCallback(
    (playerId: string, value: ClauseWatchRuntime) => {
      setRuntime((current) => ({ ...current, [playerId]: value }))
    },
    []
  )

  const checkTarget = useCallback(
    async (target: ClauseWatchTarget) => {
      if (checkingRef.current.has(target.playerId)) return null
      checkingRef.current.add(target.playerId)
      setTargetRuntime(target.playerId, { phase: 'checking' })

      try {
        const result = await checkClauseTarget(target)
        const correctedOffset = normalizeClockOffset(result.clockOffsetMs)
        setClockOffsetMs(correctedOffset)
        lastCheckRef.current.set(target.playerId, Date.now())

        if (result.error || !result.preflight) {
          lastSafePreflightRef.current.delete(target.playerId)
          setTargetRuntime(target.playerId, {
            phase: 'failed',
            checkedAt: result.checkedAt,
            ...(result.teamMoney !== null
              ? { teamMoney: result.teamMoney }
              : {}),
            error: result.error || 'Clause check failed',
          })
          return result
        }

        setTargetRuntime(target.playerId, {
          phase: result.preflight.code,
          checkedAt: result.checkedAt,
          ...(result.teamMoney !== null ? { teamMoney: result.teamMoney } : {}),
        })
        if (
          result.preflight.code === 'waiting' ||
          result.preflight.code === 'ready'
        ) {
          lastSafePreflightRef.current.set(target.playerId, Date.now())
        } else {
          lastSafePreflightRef.current.delete(target.playerId)
        }
        return result
      } finally {
        checkingRef.current.delete(target.playerId)
      }
    },
    [setTargetRuntime]
  )

  const performPurchase = useCallback(
    async (target: ClauseWatchTarget) => {
      if (purchaseInFlightRef.current) return
      purchaseInFlightRef.current = true
      setTargetRuntime(target.playerId, { phase: 'purchasing' })

      try {
        const result = await payBuyoutClause(target)
        if (result.error) {
          setTargetRuntime(target.playerId, {
            phase: 'failed',
            error: result.error,
          })
          return
        }

        setTargetRuntime(target.playerId, { phase: 'purchased' })
        setWatches((current) =>
          current.map((entry) =>
            entry.playerId === target.playerId
              ? { ...entry, automatic: false }
              : entry
          )
        )
        await onPurchased(target)
      } finally {
        purchaseInFlightRef.current = false
      }
    },
    [onPurchased, setTargetRuntime]
  )

  useEffect(() => {
    for (const target of watches) {
      const unlockTimestamp = getUnlockTimestamp(target.unlockAt)
      if (unlockTimestamp === null) continue
      const remainingMs = Math.max(0, unlockTimestamp - now)
      const interval = getClauseCheckInterval(remainingMs)
      const lastCheck = lastCheckRef.current.get(target.playerId) ?? 0

      if (interval !== null && Date.now() - lastCheck >= interval) {
        void checkTarget(target)
      }

      if (remainingMs > 0) continue

      if (!notifiedRef.current.has(target.playerId)) {
        notifiedRef.current.add(target.playerId)
        if (originalTitleRef.current === null) {
          originalTitleRef.current = document.title
        }
        document.title = `⚡ ${target.playerName} · ${originalTitleRef.current}`
        if ('Notification' in window && Notification.permission === 'granted') {
          try {
            new Notification(target.playerName, {
              body: 'La cláusula debería estar desbloqueada.',
            })
          } catch {
            // The visible countdown and title still work when notifications fail.
          }
        }
      }

      if (!target.automatic) continue
      const attemptKey = `${target.playerId}:${target.createdAt}`
      if (attemptedRef.current.has(attemptKey)) continue

      const lastSafePreflight =
        lastSafePreflightRef.current.get(target.playerId) ?? 0
      if (Date.now() - lastSafePreflight > 3_000) continue

      attemptedRef.current.add(attemptKey)
      void performPurchase(target)
    }
  }, [checkTarget, now, performPurchase, watches])

  useEffect(
    () => () => {
      if (originalTitleRef.current !== null) {
        document.title = originalTitleRef.current
      }
    },
    []
  )

  const addWatch = useCallback(
    (player: Player) => {
      if (!player.buyoutClause || !player.owner?.teamId) return false
      const target: ClauseWatchTarget = {
        version: CLAUSE_WATCH_STORAGE_VERSION,
        leagueId,
        teamId,
        ownerTeamId: player.owner.teamId,
        playerId: player.id,
        playerName: player.nickname || player.name,
        expectedClause: player.buyoutClause,
        unlockAt: player.buyoutClauseLockedEndTime ?? null,
        automatic: false,
        createdAt: new Date().toISOString(),
      }
      setWatches((current) => [
        ...current.filter((entry) => entry.playerId !== player.id),
        target,
      ])
      void checkTarget(target)
      return true
    },
    [checkTarget, leagueId, teamId]
  )

  const removeWatch = useCallback((playerId: string) => {
    setWatches((current) =>
      current.filter((target) => target.playerId !== playerId)
    )
    setRuntime((current) => {
      const next = { ...current }
      delete next[playerId]
      return next
    })
  }, [])

  const setAutomatic = useCallback(
    (playerId: string, automatic: boolean) => {
      setWatches((current) =>
        current.map((target) => ({
          ...target,
          automatic: target.playerId === playerId ? automatic : false,
        }))
      )
      if (automatic) {
        const target = watchesRef.current.find(
          (entry) => entry.playerId === playerId
        )
        if (target) void checkTarget(target)
      }
    },
    [checkTarget]
  )

  const buyNow = useCallback(
    async (playerId: string) => {
      const target = watchesRef.current.find(
        (entry) => entry.playerId === playerId
      )
      if (!target) return false

      const result = await checkTarget(target)
      if (!result?.preflight?.ready) return false
      await performPurchase(target)
      return true
    },
    [checkTarget, performPurchase]
  )

  return {
    watches,
    runtime,
    now,
    clockOffsetMs,
    addWatch,
    removeWatch,
    setAutomatic,
    buyNow,
    checkTarget,
  }
}

export type ClauseWatchController = ReturnType<typeof useClauseWatch>
