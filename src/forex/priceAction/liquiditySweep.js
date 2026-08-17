import { findSwingPoints } from './marketStructure.js'

// A liquidity sweep: price wicks beyond a prior swing high/low (grabbing
// stop-loss liquidity resting there) but the candle CLOSES back inside
// the range — signaling a likely reversal/trap rather than a genuine break.
export function detectLiquiditySweep(highs, lows, closes, strength = 3) {
  const { swingHighs, swingLows } = findSwingPoints(highs, lows, strength)
  const lastIndex = closes.length - 1
  const lastHigh = highs[lastIndex]
  const lastLow = lows[lastIndex]
  const lastClose = closes[lastIndex]

  const priorHighs = swingHighs.filter((s) => s.index < lastIndex - 1)
  const priorLows = swingLows.filter((s) => s.index < lastIndex - 1)
  const lastSwingHigh = priorHighs[priorHighs.length - 1]
  const lastSwingLow = priorLows[priorLows.length - 1]

  // Wicked above a swing high but closed back below it -> bearish sweep
  if (lastSwingHigh && lastHigh > lastSwingHigh.price && lastClose < lastSwingHigh.price) {
    return { type: 'LIQUIDITY_SWEEP', direction: 'SELL', sweptLevel: lastSwingHigh.price, source: 'liquiditySweep' }
  }

  // Wicked below a swing low but closed back above it -> bullish sweep
  if (lastSwingLow && lastLow < lastSwingLow.price && lastClose > lastSwingLow.price) {
    return { type: 'LIQUIDITY_SWEEP', direction: 'BUY', sweptLevel: lastSwingLow.price, source: 'liquiditySweep' }
  }

  return null
}
