export function trueRangeSeries(highs, lows, closes) {
  const tr = [highs[0] - lows[0]]
  for (let i = 1; i < highs.length; i++) {
    tr.push(Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1])
    ))
  }
  return tr
}

export function calculateATRSeries(highs, lows, closes, period = 14) {
  const tr = trueRangeSeries(highs, lows, closes)
  if (tr.length < period) return tr.map(() => tr.reduce((a, b) => a + b, 0) / tr.length)

  const atr = new Array(tr.length).fill(null)
  const seed = tr.slice(0, period).reduce((a, b) => a + b, 0) / period
  atr[period - 1] = seed

  for (let i = period; i < tr.length; i++) {
    atr[i] = (atr[i - 1] * (period - 1) + tr[i]) / period
  }
  for (let i = 0; i < period - 1; i++) atr[i] = seed

  return atr
}

export function calculateATR(highs, lows, closes, period = 14) {
  const series = calculateATRSeries(highs, lows, closes, period)
  return series[series.length - 1]
}

// ATR as a percentage of price — used to compare volatility across
// symbols that trade at very different absolute price scales.
export function atrPercent(atr, price) {
  if (!price) return 0
  return (atr / price) * 100
}
