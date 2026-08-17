import { calculateEMA } from '../../indicators/ema.js'
import { calculateADX } from '../../indicators/adx.js'

export function trendFilter(closes, highs, lows) {
  const ema20 = calculateEMA(closes, 20)
  const ema50 = calculateEMA(closes, 50)
  const ema200 = calculateEMA(closes, 200)
  const { adx } = calculateADX(highs, lows, closes)

  const price = closes[closes.length - 1]
  const e20 = ema20[ema20.length - 1]
  const e50 = ema50[ema50.length - 1]
  const e200 = ema200[ema200.length - 1]
  const currentAdx = adx[adx.length - 1]

  let bias = 'NEUTRAL'
  if (price > e20 && e20 > e50 && e50 > e200) bias = 'BULLISH'
  else if (price < e20 && e20 < e50 && e50 < e200) bias = 'BEARISH'

  // Require at least moderate trend strength — a flat ADX invalidates
  // even a correctly-stacked EMA (chop, not a real trend).
  const trendStrong = currentAdx >= 20

  return {
    bias,
    adx: currentAdx,
    trendStrong,
    passed: bias !== 'NEUTRAL' && trendStrong
  }
}
