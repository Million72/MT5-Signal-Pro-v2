import { calculateEMA } from '../../indicators/ema.js'
import { calculateADX, trendStrengthLabel } from '../../indicators/adx.js'
import { calculateSuperTrend } from '../../indicators/supertrend.js'

export function analyzeTrend(highs, lows, closes) {
  const ema20 = calculateEMA(closes, 20)
  const ema50 = calculateEMA(closes, 50)
  const ema200 = calculateEMA(closes, 200)
  const { adx } = calculateADX(highs, lows, closes)
  const { trend: stTrend } = calculateSuperTrend(highs, lows, closes)

  const price = closes[closes.length - 1]
  const currentAdx = adx[adx.length - 1]
  const currentSt = stTrend[stTrend.length - 1]

  let emaBias = 'NEUTRAL'
  if (price > ema20[ema20.length - 1] && ema20[ema20.length - 1] > ema50[ema50.length - 1] && ema50[ema50.length - 1] > ema200[ema200.length - 1]) {
    emaBias = 'BULLISH'
  } else if (price < ema20[ema20.length - 1] && ema20[ema20.length - 1] < ema50[ema50.length - 1] && ema50[ema50.length - 1] < ema200[ema200.length - 1]) {
    emaBias = 'BEARISH'
  }

  const stBias = currentSt === 'UP' ? 'BULLISH' : 'BEARISH'

  // Require EMA stack and SuperTrend to agree — two independent trend
  // methods confirming each other is stronger than either alone.
  const agreement = emaBias !== 'NEUTRAL' && emaBias === stBias

  return {
    emaBias,
    stBias,
    agreement,
    adx: currentAdx,
    strengthLabel: trendStrengthLabel(currentAdx),
    finalBias: agreement ? emaBias : 'NEUTRAL'
  }
}
