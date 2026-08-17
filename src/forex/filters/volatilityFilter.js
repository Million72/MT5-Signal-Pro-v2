import { calculateATRSeries, atrPercent } from '../../indicators/atr.js'
import { mean } from '../../utils/math.js'

// Rejects both dead markets (ATR too low relative to its own recent
// history — spread/cost will dominate any edge) and chaotic spikes
// (ATR far above its recent average — unreliable stop placement).
export function volatilityFilter(highs, lows, closes, { lowMultiplier = 0.5, highMultiplier = 2.5, lookback = 30 } = {}) {
  const atrSeries = calculateATRSeries(highs, lows, closes)
  const currentAtr = atrSeries[atrSeries.length - 1]
  const baselineAtr = mean(atrSeries.slice(-lookback))
  const price = closes[closes.length - 1]

  const tooLow = currentAtr < baselineAtr * lowMultiplier
  const tooHigh = currentAtr > baselineAtr * highMultiplier

  return {
    atr: currentAtr,
    atrPct: atrPercent(currentAtr, price),
    baselineAtr,
    tooLow,
    tooHigh,
    passed: !tooLow && !tooHigh
  }
}
