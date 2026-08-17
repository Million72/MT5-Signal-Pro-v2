// Portfolio-level guardrails that sit above individual signal quality.
// A single signal can be perfect and still be a bad idea to take if
// it violates portfolio-level risk rules (too many correlated positions,
// re-signaling the same symbol too soon, etc).

const MAX_CONCURRENT_SIGNALS = 5
const SYMBOL_COOLDOWN_MS = 15 * 60 * 1000 // don't re-signal the same symbol within 15 min
const MAX_SAME_DIRECTION_CORRELATED = 3 // cap on correlated same-direction positions

export class RiskManager {
  constructor() {
    this.activeSignals = new Map() // symbol -> { direction, timestamp }
  }

  canAcceptSignal(candidate) {
    const reasons = []

    if (this.activeSignals.size >= MAX_CONCURRENT_SIGNALS) {
      reasons.push('max_concurrent_signals_reached')
    }

    const existing = this.activeSignals.get(candidate.symbol)
    if (existing && Date.now() - existing.timestamp < SYMBOL_COOLDOWN_MS) {
      reasons.push('symbol_on_cooldown')
    }

    const sameDirectionCount = [...this.activeSignals.values()].filter(
      (s) => s.direction === candidate.direction
    ).length
    if (sameDirectionCount >= MAX_SAME_DIRECTION_CORRELATED) {
      reasons.push('too_many_correlated_positions')
    }

    return { accepted: reasons.length === 0, reasons }
  }

  register(candidate) {
    this.activeSignals.set(candidate.symbol, {
      direction: candidate.direction,
      timestamp: Date.now()
    })
  }

  expireOld(maxAgeMs = 4 * 60 * 60 * 1000) {
    const now = Date.now()
    for (const [symbol, data] of this.activeSignals.entries()) {
      if (now - data.timestamp > maxAgeMs) {
        this.activeSignals.delete(symbol)
      }
    }
  }

  reset() {
    this.activeSignals.clear()
  }
}

export const riskManager = new RiskManager()
