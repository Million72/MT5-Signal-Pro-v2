// A signal's confluence/R:R is calculated once, at the moment it fires,
// using the price at that instant. If you act on it minutes later,
// price has moved — sometimes in the signal's own direction, which
// means you're now entering CLOSER to the target and FURTHER from a
// sensible stop than the original math assumed. This recomputes the
// real, current risk:reward using live price against the *same*
// SL/TP levels the signal calculated, so staleness is measured in the
// thing that actually matters (is this still a good trade to take),
// not just "price moved."

export function computeDrift({ direction, entry, stopLoss, takeProfit1, takeProfit2, currentPrice }) {
  if (currentPrice == null || entry == null || stopLoss == null || takeProfit1 == null) {
    return { state: 'UNKNOWN', driftPoints: null, driftPct: null, currentRR: null }
  }

  const driftPoints = currentPrice - entry
  const finalTarget = takeProfit2 ?? takeProfit1

  // Has this trade's own SL or TP already been hit since it fired?
  // If so, taking it now at "signal price" is fiction — it's already over.
  if (direction === 'BUY') {
    if (currentPrice <= stopLoss) {
      return { state: 'INVALIDATED', driftPoints, driftPct: null, currentRR: null }
    }
    if (currentPrice >= finalTarget) {
      return { state: 'TARGET_ALREADY_HIT', driftPoints, driftPct: null, currentRR: null }
    }
  } else {
    if (currentPrice >= stopLoss) {
      return { state: 'INVALIDATED', driftPoints, driftPct: null, currentRR: null }
    }
    if (currentPrice <= finalTarget) {
      return { state: 'TARGET_ALREADY_HIT', driftPoints, driftPct: null, currentRR: null }
    }
  }

  // Recompute R:R as if entering RIGHT NOW, using the same SL/TP1
  // levels the signal originally calculated. This is the real,
  // honest answer to "is this still worth taking."
  const risk = Math.abs(currentPrice - stopLoss)
  const reward = Math.abs(takeProfit1 - currentPrice)
  const currentRR = risk === 0 ? 0 : Number((reward / risk).toFixed(2))

  const originalRisk = Math.abs(entry - stopLoss)
  const driftPct = originalRisk === 0 ? 0 : Math.round((Math.abs(driftPoints) / originalRisk) * 100)

  const MIN_ACCEPTABLE_LIVE_RR = 2.5
  const state = currentRR < MIN_ACCEPTABLE_LIVE_RR ? 'DEGRADED' : 'FRESH'

  return { state, driftPoints, driftPct, currentRR }
}

export const DRIFT_STATE_LABELS = {
  FRESH: 'Entry still valid',
  DEGRADED: 'Entry has degraded — R:R no longer meets minimum',
  INVALIDATED: 'Already hit stop-loss since firing — this trade is over',
  TARGET_ALREADY_HIT: 'Already hit take-profit since firing — too late to enter',
  UNKNOWN: 'Live price unavailable'
}
