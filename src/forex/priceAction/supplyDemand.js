import { calculateATR } from '../../indicators/atr.js'

// Identifies supply/demand zones from strong directional (imbalance)
// candles — a candle with a large body relative to ATR, followed by
// continuation, marks the origin of institutional order flow.
// Zones are checked for staleness using ATR distance so old zones far
// from current price never fire (the bug fixed after live testing).

export function findSupplyDemandZones(highs, lows, closes, opens, { lookback = 40, bodyAtrMultiplier = 1.2 } = {}) {
  const atr = calculateATR(highs, lows, closes)
  const zones = []

  const start = Math.max(1, closes.length - lookback)
  for (let i = start; i < closes.length - 1; i++) {
    const body = Math.abs(closes[i] - opens[i])
    if (body < atr * bodyAtrMultiplier) continue

    const bullish = closes[i] > opens[i]
    zones.push({
      index: i,
      type: bullish ? 'DEMAND' : 'SUPPLY',
      top: Math.max(opens[i], closes[i]),
      bottom: Math.min(opens[i], closes[i])
    })
  }

  return zones
}

export function nearestZoneSignal(zones, currentPrice, atr, maxAtrDistance = 2) {
  if (!zones.length || !atr) return null

  let closest = null
  let closestDistance = Infinity

  for (const zone of zones) {
    const mid = (zone.top + zone.bottom) / 2
    const distance = Math.abs(currentPrice - mid)
    if (distance < closestDistance) {
      closest = zone
      closestDistance = distance
    }
  }

  if (!closest) return null

  // Staleness guard: if the nearest zone is further than maxAtrDistance
  // ATRs away, it's stale and must not fire a signal.
  const distanceInAtr = closestDistance / atr
  if (distanceInAtr > maxAtrDistance) {
    return { staleZone: true, zone: closest }
  }

  const inZone = currentPrice <= closest.top && currentPrice >= closest.bottom
  if (!inZone) return { staleZone: false, zone: closest, triggered: false }

  return {
    staleZone: false,
    zone: closest,
    triggered: true,
    direction: closest.type === 'DEMAND' ? 'BUY' : 'SELL',
    source: 'supplyDemand'
  }
}
