import { findSwingPoints } from './marketStructure.js'

// Break of Structure: price closes beyond the most recent swing high
// (bullish BOS, continuation) or swing low (bearish BOS).
export function detectBOS(highs, lows, closes, strength = 3) {
  const { swingHighs, swingLows } = findSwingPoints(highs, lows, strength)
  const lastClose = closes[closes.length - 1]
  const lastIndex = closes.length - 1

  const priorHighs = swingHighs.filter((s) => s.index < lastIndex - 1)
  const priorLows = swingLows.filter((s) => s.index < lastIndex - 1)

  if (priorHighs.length === 0 && priorLows.length === 0) return null

  const lastSwingHigh = priorHighs[priorHighs.length - 1]
  const lastSwingLow = priorLows[priorLows.length - 1]

  if (lastSwingHigh && lastClose > lastSwingHigh.price) {
    return { type: 'BOS', direction: 'BUY', brokenLevel: lastSwingHigh.price, source: 'bos' }
  }
  if (lastSwingLow && lastClose < lastSwingLow.price) {
    return { type: 'BOS', direction: 'SELL', brokenLevel: lastSwingLow.price, source: 'bos' }
  }

  return null
}
