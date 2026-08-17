import { CONFIDENCE_FLOOR } from './confidenceScore.js'
import { MIN_ACCEPTABLE_RR } from './tpSlCalculator.js'

// Zero-tolerance gate: ANY one of these failing kills the signal
// entirely. This mirrors the philosophy that worked in practice —
// one disqualifying condition kills the trade, no partial credit.

export function validateSignal(candidate) {
  const failures = []

  if (!candidate) {
    return { valid: false, failures: ['no_candidate'] }
  }

  if (!candidate.direction || candidate.direction === 'NEUTRAL') {
    failures.push('no_direction')
  }

  if (typeof candidate.confidence !== 'number' || candidate.confidence < CONFIDENCE_FLOOR) {
    failures.push('below_confidence_floor')
  }

  if (typeof candidate.riskReward !== 'number' || candidate.riskReward < MIN_ACCEPTABLE_RR) {
    failures.push('rr_too_low')
  }

  if (!candidate.entryModelConfirmed) {
    failures.push('no_entry_model')
  }

  if (candidate.conflictingSignal) {
    failures.push('conflicting_direction_detected')
  }

  if (candidate.staleZone) {
    failures.push('stale_zone_out_of_range')
  }

  if (!candidate.htfAligned) {
    failures.push('htf_not_aligned')
  }

  if (typeof candidate.entry !== 'number' || typeof candidate.stopLoss !== 'number' || typeof candidate.takeProfit !== 'number') {
    failures.push('invalid_price_levels')
  }

  // Sanity: SL and TP must sit on the correct side of entry for the direction
  if (candidate.direction === 'BUY') {
    if (candidate.stopLoss >= candidate.entry) failures.push('sl_wrong_side')
    if (candidate.takeProfit <= candidate.entry) failures.push('tp_wrong_side')
  }
  if (candidate.direction === 'SELL') {
    if (candidate.stopLoss <= candidate.entry) failures.push('sl_wrong_side')
    if (candidate.takeProfit >= candidate.entry) failures.push('tp_wrong_side')
  }

  return {
    valid: failures.length === 0,
    failures
  }
}

