// Core numeric helpers shared across indicators and engines

export function mean(arr) {
  if (!arr || arr.length === 0) return 0
  return arr.reduce((a, b) => a + b, 0) / arr.length
}

export function stddev(arr) {
  if (!arr || arr.length < 2) return 0
  const m = mean(arr)
  const variance = mean(arr.map((v) => (v - m) ** 2))
  return Math.sqrt(variance)
}

export function highest(arr, period) {
  const slice = arr.slice(-period)
  return Math.max(...slice)
}

export function lowest(arr, period) {
  const slice = arr.slice(-period)
  return Math.min(...slice)
}

export function slope(arr, lookback = 5) {
  // Simple linear-regression slope over the last `lookback` points.
  const data = arr.slice(-lookback)
  const n = data.length
  if (n < 2) return 0
  const xMean = (n - 1) / 2
  const yMean = mean(data)
  let num = 0
  let den = 0
  for (let i = 0; i < n; i++) {
    num += (i - xMean) * (data[i] - yMean)
    den += (i - xMean) ** 2
  }
  return den === 0 ? 0 : num / den
}

export function round(value, decimals = 2) {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

export function pctChange(from, to) {
  if (from === 0) return 0
  return ((to - from) / from) * 100
}

export function isRising(arr, lookback = 3) {
  const s = arr.slice(-lookback)
  for (let i = 1; i < s.length; i++) {
    if (s[i] <= s[i - 1]) return false
  }
  return true
}

export function isFalling(arr, lookback = 3) {
  const s = arr.slice(-lookback)
  for (let i = 1; i < s.length; i++) {
    if (s[i] >= s[i - 1]) return false
  }
  return true
}
