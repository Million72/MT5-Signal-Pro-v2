// Returns a full RSI series (Wilder's smoothing), not just the last value,
// so callers can check RSI slope/direction, not only its current level.
export function calculateRSISeries(closes, period = 14) {
  if (!closes || closes.length < period + 1) {
    return closes.map(() => 50)
  }

  const rsi = new Array(closes.length).fill(50)
  let gains = 0
  let losses = 0

  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1]
    if (diff >= 0) gains += diff
    else losses -= diff
  }

  let avgGain = gains / period
  let avgLoss = losses / period
  rsi[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss)

  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1]
    const gain = diff >= 0 ? diff : 0
    const loss = diff < 0 ? -diff : 0

    avgGain = (avgGain * (period - 1) + gain) / period
    avgLoss = (avgLoss * (period - 1) + loss) / period

    rsi[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss)
  }

  // Backfill leading values so array length matches input
  for (let i = 0; i < period; i++) rsi[i] = rsi[period]

  return rsi
}

export function calculateRSI(closes, period = 14) {
  const series = calculateRSISeries(closes, period)
  return series[series.length - 1]
}

export function rsiDivergence(closes, rsiSeries, lookback = 20) {
  // Simple divergence check: price makes a lower low while RSI makes a
  // higher low (bullish), or price higher high while RSI lower high (bearish).
  const priceSlice = closes.slice(-lookback)
  const rsiSlice = rsiSeries.slice(-lookback)
  if (priceSlice.length < lookback) return null

  const priceMinIdx = priceSlice.indexOf(Math.min(...priceSlice))
  const priceMaxIdx = priceSlice.indexOf(Math.max(...priceSlice))

  const midPoint = Math.floor(lookback / 2)

  if (priceMinIdx > midPoint) {
    const earlierLow = Math.min(...priceSlice.slice(0, midPoint))
    const laterLow = priceSlice[priceMinIdx]
    const earlierRsiLow = Math.min(...rsiSlice.slice(0, midPoint))
    const laterRsiLow = rsiSlice[priceMinIdx]
    if (laterLow < earlierLow && laterRsiLow > earlierRsiLow) return 'BULLISH_DIVERGENCE'
  }

  if (priceMaxIdx > midPoint) {
    const earlierHigh = Math.max(...priceSlice.slice(0, midPoint))
    const laterHigh = priceSlice[priceMaxIdx]
    const earlierRsiHigh = Math.max(...rsiSlice.slice(0, midPoint))
    const laterRsiHigh = rsiSlice[priceMaxIdx]
    if (laterHigh > earlierHigh && laterRsiHigh < earlierRsiHigh) return 'BEARISH_DIVERGENCE'
  }

  return null
}
