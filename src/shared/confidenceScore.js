// Confidence is built from named, weighted factors rather than one
// opaque number. Every factor must be explicitly present to count —
// missing data contributes zero, never a guessed default.

export const FACTOR_WEIGHTS = {
  trendAlignment: 25,    // HTF and LTF trend agree
  momentum: 20,          // RSI/MACD support the direction
  structureConfirmed: 20, // entry model / price-action confirms
  volatilityOk: 15,      // ATR in an acceptable range (not dead, not chaotic)
  multiTimeframe: 20      // 3-timeframe cascade agrees
}

export function buildConfidenceScore(factors) {
  let total = 0
  const breakdown = {}

  for (const [key, weight] of Object.entries(FACTOR_WEIGHTS)) {
    const passed = !!factors[key]
    breakdown[key] = passed
    if (passed) total += weight
  }

  return {
    score: Math.round(total),
    breakdown
  }
}

// Hard floor: below this, a signal is discarded entirely rather than
// shown as "low confidence." Mick's own philosophy: sniper entries only.
export const CONFIDENCE_FLOOR = 75

export function passesConfidenceFloor(score) {
  return score >= CONFIDENCE_FLOOR
}
