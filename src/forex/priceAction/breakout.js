import { highest, lowest, stddev } from '../../utils/math.js'

// Detects a breakout from a tight consolidation range — distinct from
// BOS (which breaks a swing point). This only fires when price has been
// genuinely ranging (low volatility) and then expands out of it, so it
// does not double-count the same move that BOS already flagged.
export function detectRangeBreakout(highs, lows, closes, { rangeLookback = 20, consolidationThreshold = 0.35 } = {}) {
  if (closes.length < rangeLookback + 2) return null

  const rangeHighs = highs.slice(-rangeLookback - 1, -1)
  const rangeLows = lows.slice(-rangeLookback - 1, -1)
  const rangeCloses = closes.slice(-rangeLookback - 1, -1)

  const rangeHigh = highest(rangeHighs, rangeLookback)
  const rangeLow = lowest(rangeLows, rangeLookback)
  const rangeSize = rangeHigh - rangeLow
  const volatility = stddev(rangeCloses)

  // Require the prior range to actually be tight (low relative stddev)
  const relativeVol = rangeSize === 0 ? 1 : volatility / rangeSize
  const wasConsolidating = relativeVol < consolidationThreshold

  if (!wasConsolidating) return null

  const lastClose = closes[closes.length - 1]

  if (lastClose > rangeHigh) {
    return { type: 'BREAKOUT', direction: 'BUY', brokenLevel: rangeHigh, source: 'breakout' }
  }
  if (lastClose < rangeLow) {
    return { type: 'BREAKOUT', direction: 'SELL', brokenLevel: rangeLow, source: 'breakout' }
  }

  return null
}

