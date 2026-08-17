import { calculateATRSeries, atrPercent } from '../../indicators/atr.js'
import { mean, stddev } from '../../utils/math.js'

export function analyzeVolatility(highs, lows, closes, lookback = 30) {
  const atrSeries = calculateATRSeries(highs, lows, closes)
  const recent = atrSeries.slice(-lookback)
  const currentAtr = atrSeries[atrSeries.length - 1]
  const avgAtr = mean(recent)
  const atrStd = stddev(recent)
  const price = closes[closes.length - 1]

  const zScore = atrStd === 0 ? 0 : (currentAtr - avgAtr) / atrStd

  let regime = 'NORMAL'
  if (zScore > 1.5) regime = 'EXPANDING'
  else if (zScore < -1) regime = 'CONTRACTING'

  return {
    atr: currentAtr,
    atrPct: atrPercent(currentAtr, price),
    avgAtr,
    zScore: Number(zScore.toFixed(2)),
    regime
  }
}
