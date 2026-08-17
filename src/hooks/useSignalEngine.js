import { useState, useCallback, useEffect, useRef } from 'react'
import { scanAllMarketsLive } from '../engine/liveScanner.js'
import { ALL_MARKETS } from '../constants/markets.js'

const SCAN_INTERVAL_MS = 10 * 60 * 1000 // matches the "next X:XX" countdown

export function useSignalEngine(timeframe, isConnected) {
  const [signals, setSignals] = useState([])
  const [scanning, setScanning] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [lastScan, setLastScan] = useState(null)
  const [error, setError] = useState(null)
  const [, forceTick] = useState(0)

  const scanningRef = useRef(false)

  const scan = useCallback(async () => {
    if (scanningRef.current || !isConnected) return
    scanningRef.current = true
    setScanning(true)
    setError(null)
    setProgress({ current: 0, total: ALL_MARKETS.length })

    try {
      const results = await scanAllMarketsLive(ALL_MARKETS, timeframe, {
        onProgress: setProgress
      })
      setSignals(results)
      setLastScan(Date.now())
    } catch (err) {
      console.error('Scan failed:', err)
      setError(err.message || 'Scan failed')
    } finally {
      setScanning(false)
      scanningRef.current = false
    }
  }, [timeframe, isConnected])

  // Auto-scan the moment the connection is ready — no button click needed.
  useEffect(() => {
    if (isConnected) scan()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected])

  // Auto-scan whenever the timeframe changes (only after the initial
  // connect-triggered scan has already happened at least once).
  const didMountRef = useRef(false)
  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true
      return
    }
    if (isConnected) scan()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeframe])

  const nextScanAt = lastScan ? lastScan + SCAN_INTERVAL_MS : 0
  const cooldownSeconds = Math.max(0, Math.ceil((nextScanAt - Date.now()) / 1000))

  // Countdown ticks every second; when it reaches zero, auto-rescan
  // without waiting for the person to press anything.
  useEffect(() => {
    const timer = setInterval(() => {
      forceTick((t) => t + 1)
      if (lastScan && Date.now() >= lastScan + SCAN_INTERVAL_MS && !scanningRef.current && isConnected) {
        scan()
      }
    }, 1000)
    return () => clearInterval(timer)
  }, [lastScan, isConnected, scan])

  const buyCount = signals.filter((s) => s.status === 'BUY').length
  const sellCount = signals.filter((s) => s.status === 'SELL').length
  const waitCount = signals.filter((s) => s.status === 'WAIT').length

  // If nearly everything came back as an error, this is a systemic
  // connectivity/rate-limit issue, not "the market has no data" —
  // surfaced as one clear banner instead of many identical broken cards.
  const errorCount = signals.filter((s) => s.error).length
  const isSystemicFailure = signals.length > 0 && errorCount / signals.length > 0.7

  return {
    signals,
    scanning,
    progress,
    error,
    scan, // still exposed for a manual "Scan Now" override
    cooldownSeconds,
    lastScan,
    liveCount: signals.length,
    buyCount,
    sellCount,
    waitCount,
    isSystemicFailure
  }
    }
