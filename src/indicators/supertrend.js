import { calculateATRSeries } from './atr.js'

// Returns { trend: 'UP'|'DOWN' series, line: numeric series }
export function calculateSuperTrend(highs, lows, closes, period = 10, multiplier = 3) {
  const n = closes.length
  const atr = calculateATRSeries(highs, lows, closes, period)

  const upperBasic = new Array(n)
  const lowerBasic = new Array(n)
  for (let i = 0; i < n; i++) {
    const hl2 = (highs[i] + lows[i]) / 2
    upperBasic[i] = hl2 + multiplier * atr[i]
    lowerBasic[i] = hl2 - multiplier * atr[i]
  }

  const upperFinal = new Array(n).fill(0)
  const lowerFinal = new Array(n).fill(0)
  const trend = new Array(n).fill('UP')
  const line = new Array(n).fill(0)

  upperFinal[0] = upperBasic[0]
  lowerFinal[0] = lowerBasic[0]
  trend[0] = closes[0] > upperBasic[0] ? 'UP' : 'DOWN'
  line[0] = trend[0] === 'UP' ? lowerFinal[0] : upperFinal[0]

  for (let i = 1; i < n; i++) {
    upperFinal[i] = (upperBasic[i] < upperFinal[i - 1] || closes[i - 1] > upperFinal[i - 1])
      ? upperBasic[i] : upperFinal[i - 1]

    lowerFinal[i] = (lowerBasic[i] > lowerFinal[i - 1] || closes[i - 1] < lowerFinal[i - 1])
      ? lowerBasic[i] : lowerFinal[i - 1]

    if (trend[i - 1] === 'UP') {
      trend[i] = closes[i] < lowerFinal[i] ? 'DOWN' : 'UP'
    } else {
      trend[i] = closes[i] > upperFinal[i] ? 'UP' : 'DOWN'
    }

    line[i] = trend[i] === 'UP' ? lowerFinal[i] : upperFinal[i]
  }

  return { trend, line }
}

export function superTrendFlipped(trendSeries) {
  const n = trendSeries.length
  if (n < 2) return null
  if (trendSeries[n - 2] !== trendSeries[n - 1]) {
    return trendSeries[n - 1] === 'UP' ? 'FLIPPED_BULLISH' : 'FLIPPED_BEARISH'
  }
  return null
}
