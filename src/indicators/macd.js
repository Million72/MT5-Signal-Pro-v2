import { calculateEMA } from './ema.js'

export function calculateMACD(closes, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
  const fastEMA = calculateEMA(closes, fastPeriod)
  const slowEMA = calculateEMA(closes, slowPeriod)

  const macdLine = closes.map((_, i) => fastEMA[i] - slowEMA[i])
  const signalLine = calculateEMA(macdLine, signalPeriod)
  const histogram = macdLine.map((v, i) => v - signalLine[i])

  return { macdLine, signalLine, histogram }
}

export function macdCrossover(macdLine, signalLine) {
  const n = macdLine.length
  if (n < 2) return null
  const prevMacd = macdLine[n - 2]
  const prevSignal = signalLine[n - 2]
  const curMacd = macdLine[n - 1]
  const curSignal = signalLine[n - 1]

  if (prevMacd <= prevSignal && curMacd > curSignal) return 'BULLISH_CROSS'
  if (prevMacd >= prevSignal && curMacd < curSignal) return 'BEARISH_CROSS'
  return null
}

export function histogramExpanding(histogram, lookback = 3) {
  const slice = histogram.slice(-lookback)
  if (slice.length < lookback) return false
  const abs = slice.map(Math.abs)
  for (let i = 1; i < abs.length; i++) {
    if (abs[i] <= abs[i - 1]) return false
  }
  return true
}
