import { useState, useEffect, useCallback, useRef } from 'react'
import { derivService } from '../services/deriv.js'
import { computeDrift } from '../shared/driftCalculator.js'
import { sleep } from '../utils/helpers.js'
import { isActionable } from '../utils/statusHelpers.js'

const CHECK_INTERVAL_MS = 45 * 1000
const REQUEST_PAUSE_MS = 300 // gentle pacing, same reasoning as the scanner's batch pauses

export function useLiveDrift(signals) {
  const [driftMap, setDriftMap] = useState({}) // symbol -> drift info
  const checkingRef = useRef(false)

  const directional = signals.filter((s) => isActionable(s.status))
  // Stable key so the effect doesn't re-run every render when the same
  // symbols are still showing, only when the actual set changes.
  const symbolKey = directional.map((s) => s.symbol).sort().join(',')

  const runCheck = useCallback(async () => {
    if (checkingRef.current || directional.length === 0) return
    checkingRef.current = true

    const updates = {}
    for (const signal of directional) {
      let currentPrice = null
      try {
        currentPrice = await derivService.getCurrentPrice(signal.symbol)
      } catch {
        currentPrice = null
      }

      updates[signal.symbol] = computeDrift({
        direction: signal.direction,
        entry: signal.entry,
        stopLoss: signal.stopLoss,
        takeProfit1: signal.takeProfit1,
        takeProfit2: signal.takeProfit2,
        currentPrice
      })

      await sleep(REQUEST_PAUSE_MS)
    }

    setDriftMap(updates)
    checkingRef.current = false
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbolKey])

  useEffect(() => {
    if (directional.length === 0) {
      setDriftMap({})
      return
    }
    runCheck()
    const timer = setInterval(runCheck, CHECK_INTERVAL_MS)
    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbolKey, runCheck])

  return driftMap
}
