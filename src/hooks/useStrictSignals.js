import { useState, useCallback, useEffect, useRef } from 'react'
import { scanAllSymbolsStrict } from '../engine/strictScanner.js'
import { clearLock } from '../engine/signalLock.js'
import { ALL_MARKETS } from '../constants/markets.js'

const STRICT_SCAN_INTERVAL_MS = 3 * 60 * 1000

// entryTimeframe is the user's SELECTED timeframe — the strict scanner
// uses it as the LTF (entry) leg of the 3-timeframe cascade. It is
// never substituted for a different timeframe.
export function useStrictSignals(entryTimeframe, isConnected) {
  const [results, setResults] = useState([])
  const [scanning, setScanning] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [lastScan, setLastScan] = useState(null)
  const [, forceTick] = useState(0)
  const scanningRef = useRef(false)

  const scan = useCallback(async () => {
    if (scanningRef.current || !isConnected) return
    scanningRef.current = true
    setScanning(true)
    setProgress({ current: 0, total: ALL_MARKETS.length })

    try {
      const scanResults = await scanAllSymbolsStrict(ALL_MARKETS, entryTimeframe, { onProgress: setProgress })
      setResults(scanResults)
      setLastScan(Date.now())
    } finally {
      setScanning(false)
      scanningRef.current = false
    }
  }, [isConnected, entryTimeframe])

  // Auto-scan on connect
  useEffect(() => {
    if (isConnected) scan()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected])

  // Auto-rescan whenever the entry timeframe changes — the whole
  // cascade shifts (LTF, and therefore its HTF/MTF partners, change).
  const didMountRef = useRef(false)
  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true
      return
    }
    if (isConnected) scan()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entryTimeframe])

  const nextScanAt = lastScan ? lastScan + STRICT_SCAN_INTERVAL_MS : 0
  const cooldownSeconds = Math.max(0, Math.ceil((nextScanAt - Date.now()) / 1000))

  useEffect(() => {
    const timer = setInterval(() => {
      forceTick((t) => t + 1)
      if (lastScan && Date.now() >= lastScan + STRICT_SCAN_INTERVAL_MS && !scanningRef.current && isConnected) {
        scan()
      }
    }, 1000)
    return () => clearInterval(timer)
  }, [lastScan, isConnected, scan])

  const lockedSignals = results
    .filter((r) => r.signal && (r.action === 'NEW' || r.action === 'HELD' || r.action === 'CLOSED_THEN_NEW'))
    .map((r) => ({ ...r.signal, symbol: r.symbol, checkedTimeframe: r.checkedTimeframe, lockAction: r.action }))

  const closePosition = useCallback((symbol) => {
    clearLock(symbol)
    scan() // immediately re-check so the freed symbol can pick up a new signal
  }, [scan])

  return {
    lockedSignals,
    scanning,
    progress,
    cooldownSeconds,
    lastScan,
    scan,
    closePosition,
    scannedCount: results.length,
    lockedCount: lockedSignals.length
  }
}
