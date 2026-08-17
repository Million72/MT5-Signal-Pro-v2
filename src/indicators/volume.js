import { mean } from '../utils/math.js'

// Deriv synthetic indices are algorithmically generated and don't carry
// meaningful traded volume. This indicator only produces a signal when
// real volume data is present (e.g. some forex feeds); otherwise it
// returns a neutral result so it never falsely gates a trade.
export function hasVolumeData(volumes) {
  return Array.isArray(volumes) && volumes.length > 0 && volumes.some((v) => v > 0)
}

export function volumeSpike(volumes, period = 20, threshold = 1.5) {
  if (!hasVolumeData(volumes) || volumes.length < period + 1) {
    return { isSpike: false, ratio: 1, available: false }
  }
  const recent = volumes[volumes.length - 1]
  const baseline = mean(volumes.slice(-period - 1, -1))
  const ratio = baseline === 0 ? 1 : recent / baseline
  return { isSpike: ratio >= threshold, ratio, available: true }
}

export function volumeTrendConfirms(volumes, direction, period = 10) {
  if (!hasVolumeData(volumes) || volumes.length < period) {
    return { confirms: true, available: false } // neutral, never blocks
  }
  const recent = volumes.slice(-period)
  const firstHalf = mean(recent.slice(0, Math.floor(period / 2)))
  const secondHalf = mean(recent.slice(Math.floor(period / 2)))
  const rising = secondHalf > firstHalf

  // Rising volume should accompany the move in either direction for confirmation
  return { confirms: rising, available: true }
}
