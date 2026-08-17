import { SYNTHETIC_DECIMALS, FOREX_DECIMALS } from '../constants/markets.js'

export function formatPrice(value, symbol) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—'
  const decimals = SYNTHETIC_DECIMALS[symbol] ?? FOREX_DECIMALS[symbol] ?? 4
  return value.toFixed(decimals)
}

export function formatPct(value, decimals = 1) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—'
  return `${value.toFixed(decimals)}%`
}

export function formatTime(ms) {
  const d = new Date(ms)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function formatCooldown(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export function directionColor(direction) {
  return direction === 'BUY' ? '#10b981' : direction === 'SELL' ? '#ef4444' : '#94a3b8'
}

export function confidenceColor(confidence) {
  if (confidence >= 90) return '#10b981'
  if (confidence >= 75) return '#f59e0b'
  return '#ef4444'
}
