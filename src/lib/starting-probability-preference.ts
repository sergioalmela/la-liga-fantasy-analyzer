'use client'

import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'laliga-fantasy-starting-probabilities'

export function useStartingProbabilityPreference(): {
  enabled: boolean
  setEnabled: (enabled: boolean) => void
} {
  const [enabled, setEnabledState] = useState(false)

  useEffect(() => {
    try {
      setEnabledState(window.localStorage.getItem(STORAGE_KEY) === 'true')
    } catch {
      setEnabledState(false)
    }
  }, [])

  const setEnabled = useCallback((nextEnabled: boolean) => {
    setEnabledState(nextEnabled)
    try {
      window.localStorage.setItem(STORAGE_KEY, String(nextEnabled))
    } catch {
      // The preference still applies to the current page when storage is blocked.
    }
  }, [])

  return { enabled, setEnabled }
}
