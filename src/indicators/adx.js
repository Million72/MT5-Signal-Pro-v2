import { trueRangeSeries } from './atr.js'

// Wilder's ADX/DMI. Returns { adx, plusDI, minusDI } series aligned to input length.
export function calculateADX(highs, lows, closes, period = 14) {
  const n = highs.length
  if (n < period + 1) {
    return { adx: new Array(n).fill(20), plusDI: new Array(n).fill(0), minusDI: new Array(n).fill(0) }
  }

  const tr = trueRangeSeries(highs, lows, closes)
  const plusDM = [0]
  const minusDM = [0]

  for (let i = 1; i < n; i++) {
    const upMove = highs[i] - highs[i - 1]
    const downMove = lows[i - 1] - lows[i]
    plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0)
    minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0)
  }

  // Wilder smoothing
  const smooth = (arr) => {
    const out = new Array(n).fill(0)
    let seed = arr.slice(0, period).reduce((a, b) => a + b, 0)
    out[period - 1] = seed
    for (let i = period; i < n; i++) {
      out[i] = out[i - 1] - out[i - 1] / period + arr[i]
    }
    for (let i = 0; i < period - 1; i++) out[i] = seed
    return out
  }

  const smoothTR = smooth(tr)
  const smoothPlusDM = smooth(plusDM)
  const smoothMinusDM = smooth(minusDM)

  const plusDI = smoothTR.map((trv, i) => (trv === 0 ? 0 : (smoothPlusDM[i] / trv) * 100))
  const minusDI = smoothTR.map((trv, i) => (trv === 0 ? 0 : (smoothMinusDM[i] / trv) * 100))

  const dx = plusDI.map((p, i) => {
    const sum = p + minusDI[i]
    return sum === 0 ? 0 : (Math.abs(p - minusDI[i]) / sum) * 100
  })

  // ADX = Wilder-smoothed DX
  const adx = new Array(n).fill(0)
  const dxSeed = dx.slice(period, period * 2).reduce((a, b) => a + b, 0) / period
  const startIdx = Math.min(period * 2 - 1, n - 1)
  adx[startIdx] = dxSeed
  for (let i = startIdx + 1; i < n; i++) {
    adx[i] = (adx[i - 1] * (period - 1) + dx[i]) / period
  }
  for (let i = 0; i < startIdx; i++) adx[i] = dxSeed

  return { adx, plusDI, minusDI }
}

export function trendStrengthLabel(adxValue) {
  if (adxValue >= 40) return 'VERY_STRONG'
  if (adxValue >= 25) return 'STRONG'
  if (adxValue >= 20) return 'MODERATE'
  return 'WEAK'
}
