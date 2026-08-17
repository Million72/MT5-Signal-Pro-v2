export function calculateEMA(closes, period) {
  if (!closes || closes.length === 0) return []
  if (closes.length < period) {
    // Not enough data for a true EMA seed — fall back to SMA seed on what we have
    const k = 2 / (closes.length + 1)
    const ema = [closes[0]]
    for (let i = 1; i < closes.length; i++) {
      ema.push(closes[i] * k + ema[i - 1] * (1 - k))
    }
    return ema
  }

  const k = 2 / (period + 1)
  const ema = new Array(closes.length).fill(null)

  // Seed with SMA of the first `period` closes for a stable start
  const seed = closes.slice(0, period).reduce((a, b) => a + b, 0) / period
  ema[period - 1] = seed

  for (let i = period; i < closes.length; i++) {
    ema[i] = closes[i] * k + ema[i - 1] * (1 - k)
  }

  // Backfill leading nulls with the seed so array length matches input
  for (let i = 0; i < period - 1; i++) ema[i] = seed

  return ema
}

export function emaCrossover(fastEMA, slowEMA) {
  const n = fastEMA.length
  if (n < 2) return null
  const prevFast = fastEMA[n - 2]
  const prevSlow = slowEMA[n - 2]
  const curFast = fastEMA[n - 1]
  const curSlow = slowEMA[n - 1]

  if (prevFast <= prevSlow && curFast > curSlow) return 'BULLISH_CROSS'
  if (prevFast >= prevSlow && curFast < curSlow) return 'BEARISH_CROSS'
  return null
}
