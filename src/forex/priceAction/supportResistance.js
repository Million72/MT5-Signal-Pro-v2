import { findSwingPoints } from './marketStructure.js'

// Clusters nearby swing points into support/resistance levels — a level
// touched multiple times is stronger than a single swing point.
export function findKeyLevels(highs, lows, strength = 3, clusterTolerancePct = 0.15) {
  const { swingHighs, swingLows } = findSwingPoints(highs, lows, strength)

  const cluster = (points) => {
    const levels = []
    for (const p of points) {
      const existing = levels.find((l) => Math.abs(l.price - p.price) / p.price * 100 < clusterTolerancePct)
      if (existing) {
        existing.touches += 1
        existing.price = (existing.price + p.price) / 2
      } else {
        levels.push({ price: p.price, touches: 1 })
      }
    }
    return levels.sort((a, b) => b.touches - a.touches)
  }

  return {
    resistanceLevels: cluster(swingHighs),
    supportLevels: cluster(swingLows)
  }
}

export function priceNearLevel(price, levels, atr, maxAtrDistance = 0.5) {
  for (const level of levels) {
    if (Math.abs(price - level.price) <= atr * maxAtrDistance) {
      return level
    }
  }
  return null
}
