// Once a zero-tolerance signal fires for a symbol, its direction is
// LOCKED. A new opposite-direction candidate is rejected outright,
// even if it would otherwise pass every gate. The lock releases ONLY
// when price hits the take-profit target — a stop-loss hit does NOT
// release it, by design. This means a losing trade that never returns
// to its TP will stay locked indefinitely; use clearLock() (exposed to
// the UI as "Close Position") to manually release a stuck lock.
//
// A same-direction candidate on a locked symbol is also rejected as a
// *new* signal (to avoid spamming duplicates) — the existing lock is
// simply returned unchanged.

const locks = new Map() // symbol -> { signal, lockedAt }

function isInvalidated(lock, currentPrice) {
  const { direction, takeProfit1, takeProfit2 } = lock.signal
  if (currentPrice == null) return false

  const finalTarget = takeProfit2 ?? takeProfit1

  // TP-only release. SL is intentionally NOT checked here — a losing
  // trade does not unlock the symbol.
  if (direction === 'BUY') {
    return currentPrice >= finalTarget
  }
  if (direction === 'SELL') {
    return currentPrice <= finalTarget
  }
  return false
}

/**
 * Resolves a freshly-scanned candidate against any existing lock for
 * that symbol. Returns one of:
 *   { action: 'NEW', signal }        — no prior lock, candidate accepted and locked
 *   { action: 'HELD', signal }       — existing lock still valid, unchanged, returned as-is
 *   { action: 'REJECTED_REVERSAL' }  — opposite-direction candidate rejected, lock intact
 *   { action: 'CLOSED_THEN_NEW', signal } — prior lock hit TP, released, new candidate locked
 */
export function resolveAgainstLock(symbol, candidate, currentPrice) {
  const existing = locks.get(symbol)

  if (!existing) {
    if (candidate) {
      locks.set(symbol, { signal: candidate, lockedAt: Date.now() })
      return { action: 'NEW', signal: candidate }
    }
    return { action: 'NONE', signal: null }
  }

  const invalidated = isInvalidated(existing, currentPrice)

  if (invalidated) {
    locks.delete(symbol)
    if (candidate) {
      locks.set(symbol, { signal: candidate, lockedAt: Date.now() })
      return { action: 'CLOSED_THEN_NEW', signal: candidate }
    }
    return { action: 'CLOSED', signal: null }
  }

  // Lock still active and not invalidated — hold it regardless of what
  // the fresh candidate says, even if the fresh candidate is opposite.
  if (candidate && candidate.direction !== existing.signal.direction) {
    return { action: 'REJECTED_REVERSAL', signal: existing.signal }
  }

  return { action: 'HELD', signal: existing.signal }
}

export function getLockedSignal(symbol) {
  return locks.get(symbol)?.signal ?? null
}

export function getAllLocks() {
  return [...locks.entries()].map(([symbol, data]) => ({ symbol, ...data }))
}

export function clearLock(symbol) {
  locks.delete(symbol)
}

export function clearAllLocks() {
  locks.clear()
}

