// Computes stop-loss and take-profit using ATR distance, optionally
// clamped to the nearest structural level (swing high/low) if one is
// closer than the ATR-based stop — this avoids placing stops inside
// obvious structure where price is likely to sweep them.

export function calculateTpSl({
  entry,
  direction,
  atr,
  slMultiplier = 1.5,
  tpMultiplier = 2.5,
  nearestSwingHigh = null,
  nearestSwingLow = null
}) {
  const slDistance = atr * slMultiplier
  const tpDistance = atr * tpMultiplier

  let stopLoss = direction === 'BUY' ? entry - slDistance : entry + slDistance
  let takeProfit = direction === 'BUY' ? entry + tpDistance : entry - tpDistance

  // If a structural swing level is closer than the ATR stop and still
  // gives a sane R:R, prefer it — it's a more defensible stop location.
  if (direction === 'BUY' && nearestSwingLow != null) {
    const structDistance = entry - nearestSwingLow
    if (structDistance > 0 && structDistance < slDistance) {
      stopLoss = nearestSwingLow
    }
  }
  if (direction === 'SELL' && nearestSwingHigh != null) {
    const structDistance = nearestSwingHigh - entry
    if (structDistance > 0 && structDistance < slDistance) {
      stopLoss = nearestSwingHigh
    }
  }

  const finalSlDistance = Math.abs(entry - stopLoss)
  const finalTpDistance = Math.abs(takeProfit - entry)
  const riskReward = finalSlDistance === 0 ? 0 : finalTpDistance / finalSlDistance

  return {
    stopLoss,
    takeProfit,
    riskReward: Number(riskReward.toFixed(2))
  }
}

export const MIN_ACCEPTABLE_RR = 1.5

export function riskRewardAcceptable(rr) {
  return rr >= MIN_ACCEPTABLE_RR
}

// Produces a two-target ladder (TP1 conservative, TP2 extended) plus a
// single stop-loss, matching the dashboard's TP1/TP2/SL/PIPS display.
export function calculateTpSlLadder({ entry, direction, atr, slMultiplier = 1.2, tp1Multiplier = 1.6, tp2Multiplier = 2.8 }) {
  const slDistance = atr * slMultiplier
  const tp1Distance = atr * tp1Multiplier
  const tp2Distance = atr * tp2Multiplier

  const stopLoss = direction === 'BUY' ? entry - slDistance : entry + slDistance
  const takeProfit1 = direction === 'BUY' ? entry + tp1Distance : entry - tp1Distance
  const takeProfit2 = direction === 'BUY' ? entry + tp2Distance : entry - tp2Distance

  const riskReward = slDistance === 0 ? 0 : Number((tp1Distance / slDistance).toFixed(2))

  return { stopLoss, takeProfit1, takeProfit2, riskReward, slDistance }
}

// Converts a raw price distance into "pips" for display. Forex uses the
// standard pip definition (0.0001 for most pairs, 0.01 for JPY pairs).
// Synthetic indices have no pip convention, so distance is expressed in
// index points instead — callers should label the unit accordingly.
export function distanceToPips(distance, symbol) {
  const isJpy = symbol.includes('JPY')
  const pipSize = isJpy ? 0.01 : 0.0001
  return Number((distance / pipSize).toFixed(1))
}
