// Central place for interpreting the quality-score engine's expanded
// status vocabulary (STRONG_BUY/STRONG_SELL/BUY/SELL/WATCH/WAIT/NO_TRADE)
// so every component/hook agrees on what counts as "bullish," what
// goes in the BUY filter bucket, etc., instead of each file re-deriving
// its own rules.

export function isBullish(status) {
  return status === 'BUY' || status === 'STRONG_BUY'
}

export function isBearish(status) {
  return status === 'SELL' || status === 'STRONG_SELL'
}

export function isActionable(status) {
  return isBullish(status) || isBearish(status)
}

// Coarse bucket used by the ALL/BUY/SELL/WAIT filter pills — WATCH and
// NO_TRADE both fall under "WAIT" since neither is something to act on.
export function toFilterBucket(status) {
  if (isBullish(status)) return 'BUY'
  if (isBearish(status)) return 'SELL'
  return 'WAIT'
}

export function statusLabel(status) {
  const labels = {
    STRONG_BUY: 'STRONG BUY',
    STRONG_SELL: 'STRONG SELL',
    BUY: 'BUY',
    SELL: 'SELL',
    WATCH: 'WATCH',
    WAIT: 'WAIT',
    NO_TRADE: 'NO TRADE'
  }
  return labels[status] || status
}

export function statusColor(status, colors) {
  if (status === 'STRONG_BUY' || status === 'BUY') return colors.buy
  if (status === 'STRONG_SELL' || status === 'SELL') return colors.sell
  if (status === 'WATCH') return colors.accentBlueLight
  if (status === 'NO_TRADE') return colors.textFaint
  return colors.warn // WAIT
}

export function statusIcon(status) {
  if (isBullish(status)) return '▲'
  if (isBearish(status)) return '▼'
  if (status === 'WATCH') return '◐'
  if (status === 'NO_TRADE') return '✕'
  return '◆'
}
