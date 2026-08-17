// Detects a small set of high-reliability candlestick patterns on the
// most recent 1-3 candles. Kept deliberately small — pattern-matching
// dozens of obscure candle shapes adds noise, not signal quality.

function body(o, c) { return Math.abs(c - o) }
function range(h, l) { return h - l }
function upperWick(o, h, c) { return h - Math.max(o, c) }
function lowerWick(o, l, c) { return Math.min(o, c) - l }

export function detectCandlestickPattern(opens, highs, lows, closes) {
  const n = closes.length
  if (n < 3) return null

  const o2 = opens[n - 1], h2 = highs[n - 1], l2 = lows[n - 1], c2 = closes[n - 1]
  const o1 = opens[n - 2], h1 = highs[n - 2], l1 = lows[n - 2], c1 = closes[n - 2]

  const r2 = range(h2, l2)
  if (r2 === 0) return null

  const b2 = body(o2, c2)
  const uw2 = upperWick(o2, h2, c2)
  const lw2 = lowerWick(o2, l2, c2)

  // Bullish/Bearish Engulfing
  const bullEngulf = c1 < o1 && c2 > o2 && c2 >= o1 && o2 <= c1
  const bearEngulf = c1 > o1 && c2 < o2 && c2 <= o1 && o2 >= c1
  if (bullEngulf) return { type: 'ENGULFING', direction: 'BUY', source: 'candlestick' }
  if (bearEngulf) return { type: 'ENGULFING', direction: 'SELL', source: 'candlestick' }

  // Hammer (bullish) / Shooting Star (bearish): small body, long opposite wick
  const isHammer = lw2 >= b2 * 2 && uw2 <= b2 * 0.5 && b2 / r2 < 0.4
  const isShootingStar = uw2 >= b2 * 2 && lw2 <= b2 * 0.5 && b2 / r2 < 0.4
  if (isHammer) return { type: 'HAMMER', direction: 'BUY', source: 'candlestick' }
  if (isShootingStar) return { type: 'SHOOTING_STAR', direction: 'SELL', source: 'candlestick' }

  // Pin bar variants (similar to hammer/star but not requiring tiny body)
  const bullPinBar = lw2 >= r2 * 0.6 && c2 > o2
  const bearPinBar = uw2 >= r2 * 0.6 && c2 < o2
  if (bullPinBar) return { type: 'PIN_BAR', direction: 'BUY', source: 'candlestick' }
  if (bearPinBar) return { type: 'PIN_BAR', direction: 'SELL', source: 'candlestick' }

  return null
    }
