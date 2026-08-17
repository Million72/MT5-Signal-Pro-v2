// General-purpose helpers used across the app

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function genId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

// Splits candles returned by the Deriv API and strips the still-forming
// (last) candle, which is not closed yet and will repaint if analyzed.
export function stripUnclosedCandle(candles) {
  if (!Array.isArray(candles) || candles.length === 0) return candles
  return candles.slice(0, -1)
}

export function chunk(arr, size) {
  const out = []
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size))
  }
  return out
}

export function extractSeries(candles) {
  return {
    opens: candles.map((c) => c.open),
    highs: candles.map((c) => c.high),
    lows: candles.map((c) => c.low),
    closes: candles.map((c) => c.close),
    times: candles.map((c) => c.time)
  }
}

export function safeDivide(a, b, fallback = 0) {
  if (!b || Number.isNaN(b)) return fallback
  return a / b
}

export function last(arr, n = 1) {
  if (!arr || arr.length === 0) return n === 1 ? undefined : []
  return n === 1 ? arr[arr.length - 1] : arr.slice(-n)
}
