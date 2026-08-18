// Tracks what actually happens after a signal fires — did price hit
// TP or SL first — and persists it across sessions in localStorage.
// This is the honest alternative to a static confidence number: a
// real, evidence-based win rate that updates as outcomes come in.

import { derivService } from '../services/deriv.js'
import { marketCategory } from '../constants/markets.js'

const STORAGE_KEY = 'signal-outcomes-v1'
const MAX_TRACKED = 300

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function save(records) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records.slice(-MAX_TRACKED)))
  } catch {
    // localStorage unavailable (private browsing etc) — fail silently,
    // tracking just won't persist across sessions this time.
  }
}

/**
 * Records a newly-fired BUY/SELL signal for tracking, but only if
 * there isn't already an OPEN tracked entry for that symbol — this
 * prevents spamming a new tracked row every scan cycle while a signal
 * is still live.
 */
export function trackSignal(signal) {
  if (!signal || (signal.status !== 'BUY' && signal.status !== 'SELL')) return
  if (signal.takeProfit1 == null || signal.stopLoss == null) return

  const records = load()
  const alreadyOpen = records.some((r) => r.symbol === signal.symbol && r.outcome === 'OPEN')
  if (alreadyOpen) return

  records.push({
    id: signal.id,
    symbol: signal.symbol,
    market: marketCategory(signal.symbol),
    direction: signal.status,
    entry: signal.entry,
    stopLoss: signal.stopLoss,
    takeProfit1: signal.takeProfit1,
    takeProfit2: signal.takeProfit2,
    confluence: signal.confluence,
    riskReward: signal.riskReward,
    openedAt: signal.timestamp || Date.now(),
    outcome: 'OPEN', // OPEN | TP_HIT | SL_HIT
    closedAt: null
  })

  save(records)
}

/**
 * Checks every currently-OPEN tracked signal against the live price
 * and marks it TP_HIT or SL_HIT if either level has been reached.
 * Uses the FINAL target (TP2 if present, else TP1) as the win
 * condition — a partial TP1 touch alone doesn't count as a full win.
 */
export async function checkOutcomes() {
  const records = load()
  const openRecords = records.filter((r) => r.outcome === 'OPEN')
  if (openRecords.length === 0) return { checked: 0, updated: 0 }

  let updated = 0

  for (const record of openRecords) {
    let price = null
    try {
      price = await derivService.getCurrentPrice(record.symbol)
    } catch {
      continue
    }
    if (price == null) continue

    const finalTarget = record.takeProfit2 ?? record.takeProfit1
    let outcome = null

    if (record.direction === 'BUY') {
      if (price <= record.stopLoss) outcome = 'SL_HIT'
      else if (price >= finalTarget) outcome = 'TP_HIT'
    } else {
      if (price >= record.stopLoss) outcome = 'SL_HIT'
      else if (price <= finalTarget) outcome = 'TP_HIT'
    }

    if (outcome) {
      record.outcome = outcome
      record.closedAt = Date.now()
      updated += 1
    }
  }

  save(records)
  return { checked: openRecords.length, updated }
}

/**
 * Computes real win-rate statistics, both overall and bucketed by
 * confluence at the time the signal fired — the honest, evidence-based
 * counterpart to the static confidence number shown on each card.
 */
export function getOutcomeStats() {
  const records = load()
  const closed = records.filter((r) => r.outcome !== 'OPEN')
  const open = records.filter((r) => r.outcome === 'OPEN')

  const wins = closed.filter((r) => r.outcome === 'TP_HIT').length
  const losses = closed.filter((r) => r.outcome === 'SL_HIT').length
  const winRate = closed.length > 0 ? Math.round((wins / closed.length) * 100) : null

  const buckets = [
    { label: '85-90%', min: 85, max: 90 },
    { label: '90-95%', min: 90, max: 95 },
    { label: '95-100%', min: 95, max: 101 }
  ]

  const byConfluence = buckets.map((b) => {
    const inBucket = closed.filter((r) => r.confluence >= b.min && r.confluence < b.max)
    const bucketWins = inBucket.filter((r) => r.outcome === 'TP_HIT').length
    return {
      label: b.label,
      count: inBucket.length,
      winRate: inBucket.length > 0 ? Math.round((bucketWins / inBucket.length) * 100) : null
    }
  })

  return {
    totalTracked: records.length,
    openCount: open.length,
    closedCount: closed.length,
    wins,
    losses,
    winRate,
    byConfluence,
    recentClosed: closed.slice(-15).reverse()
  }
}

export function clearOutcomeHistory() {
  save([])
}
