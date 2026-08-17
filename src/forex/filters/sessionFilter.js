import { FOREX_SESSIONS } from '../../constants/markets.js'

function isWithinUtcWindow(hour, start, end) {
  if (start < end) return hour >= start && hour < end
  // Window wraps midnight (e.g. Sydney 21 -> 6)
  return hour >= start || hour < end
}

// Forex synthetic-free filter: avoids the low-liquidity dead zone
// between NY close and Sydney open where spreads widen and moves are
// unreliable. Synthetic indices trade 24/7 with no sessions and should
// skip this filter entirely (handled by the caller).
export function sessionFilter(timestampMs = Date.now()) {
  const hourUtc = new Date(timestampMs).getUTCHours()

  const activeSessions = Object.entries(FOREX_SESSIONS)
    .filter(([, window]) => isWithinUtcWindow(hourUtc, window.start, window.end))
    .map(([name]) => name)

  // London/NY overlap (12:00-16:00 UTC) is the highest-liquidity window
  const isOverlap = activeSessions.includes('london') && activeSessions.includes('newYork')

  return {
    hourUtc,
    activeSessions,
    isOverlap,
    passed: activeSessions.length > 0
  }
}
