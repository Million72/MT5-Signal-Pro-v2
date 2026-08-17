import { findSwingPoints, structureBias } from './marketStructure.js'

// Change of Character: structure was trending one way, then breaks the
// most recent counter-trend swing point, signaling a potential reversal.
// This differs from BOS which confirms continuation of existing structure.
export function detectCHoCH(highs, lows, closes, strength = 3) {
  const { swingHighs, swingLows } = findSwingPoints(highs, lows, strength)
  if (swingHighs.length < 2 || swingLows.length < 2) return null

  const priorBias = structureBias(swingHighs.slice(0, -1), swingLows.slice(0, -1))
  const lastClose = closes[closes.length - 1]
  const lastIndex = closes.length - 1

  const priorHighs = swingHighs.filter((s) => s.index < lastIndex - 1)
  const priorLows = swingLows.filter((s) => s.index < lastIndex - 1)
  const lastSwingHigh = priorHighs[priorHighs.length - 1]
  const lastSwingLow = priorLows[priorLows.length - 1]

  // Was bearish, now breaks above the last swing high -> bullish CHoCH
  if (priorBias === 'BEARISH' && lastSwingHigh && lastClose > lastSwingHigh.price) {
    return { type: 'CHOCH', direction: 'BUY', brokenLevel: lastSwingHigh.price, source: 'choch' }
  }

  // Was bullish, now breaks below the last swing low -> bearish CHoCH
  if (priorBias === 'BULLISH' && lastSwingLow && lastClose < lastSwingLow.price) {
    return { type: 'CHOCH', direction: 'SELL', brokenLevel: lastSwingLow.price, source: 'choch' }
  }

  return null
}
