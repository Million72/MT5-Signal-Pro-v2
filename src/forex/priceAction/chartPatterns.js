import { findSwingPoints } from './marketStructure.js'

// Double top / double bottom — the most reliable, least ambiguous chart
// pattern to detect algorithmically. Deliberately not attempting head &
// shoulders, triangles, wedges etc., which are too subjective to detect
// reliably without false positives.
export function detectDoubleTopBottom(highs, lows, closes, strength = 3, tolerancePct = 0.25) {
  const { swingHighs, swingLows } = findSwingPoints(highs, lows, strength)
  const lastClose = closes[closes.length - 1]

  if (swingHighs.length >= 2) {
    const [a, b] = swingHighs.slice(-2)
    const diffPct = Math.abs(a.price - b.price) / a.price * 100
    if (diffPct < tolerancePct && lastClose < Math.min(a.price, b.price)) {
      return { type: 'DOUBLE_TOP', direction: 'SELL', source: 'chartPattern' }
    }
  }

  if (swingLows.length >= 2) {
    const [a, b] = swingLows.slice(-2)
    const diffPct = Math.abs(a.price - b.price) / a.price * 100
    if (diffPct < tolerancePct && lastClose > Math.max(a.price, b.price)) {
      return { type: 'DOUBLE_BOTTOM', direction: 'BUY', source: 'chartPattern' }
    }
  }

  return null
}
