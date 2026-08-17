// Detects a "retest" entry pattern: price broke a level (from BOS or
// breakout), pulled back to retest it, and is now showing rejection
// (a wick back in the breakout direction). This is generally a
// higher-quality, lower-risk entry than chasing the initial break.

export function detectRetest(highs, lows, closes, brokenLevel, direction, atr, tolerance = 0.3) {
  if (brokenLevel == null || !atr) return false

  const lastIndex = closes.length - 1
  const lastLow = lows[lastIndex]
  const lastHigh = highs[lastIndex]
  const lastClose = closes[lastIndex]
  const distance = atr * tolerance

  if (direction === 'BUY') {
    const touchedLevel = lastLow <= brokenLevel + distance && lastLow >= brokenLevel - distance
    const rejectedUp = lastClose > brokenLevel
    return touchedLevel && rejectedUp
  }

  if (direction === 'SELL') {
    const touchedLevel = lastHigh >= brokenLevel - distance && lastHigh <= brokenLevel + distance
    const rejectedDown = lastClose < brokenLevel
    return touchedLevel && rejectedDown
  }

  return false
}
