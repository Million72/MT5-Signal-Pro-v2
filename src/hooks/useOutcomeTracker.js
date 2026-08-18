import { useEffect, useState, useCallback, useRef } from 'react'
import { trackSignal, checkOutcomes, getOutcomeStats } from '../engine/outcomeTracker.js'

const CHECK_INTERVAL_MS = 60 * 1000 // check open positions against live price every minute

export function useOutcomeTracker(signals) {
  const [stats, setStats] = useState(() => getOutcomeStats())
  const checkingRef = useRef(false)

  // Record any newly-fired BUY/SELL signals from the live scanner
  useEffect(() => {
    const directional = signals.filter((s) => s.status === 'BUY' || s.status === 'SELL')
    if (directional.length === 0) return
    directional.forEach(trackSignal)
    setStats(getOutcomeStats())
  }, [signals])

  const runCheck = useCallback(async () => {
    if (checkingRef.current) return
    checkingRef.current = true
    try {
      await checkOutcomes()
      setStats(getOutcomeStats())
    } finally {
      checkingRef.current = false
    }
  }, [])

  useEffect(() => {
    runCheck()
    const timer = setInterval(runCheck, CHECK_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [runCheck])

  return { stats, refreshStats: () => setStats(getOutcomeStats()) }
}
