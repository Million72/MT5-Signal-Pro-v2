import { scoreMarket } from '../shared/qualityScoreEngine.js'
import { marketCategory } from '../constants/markets.js'
import { genId, sleep } from '../utils/helpers.js'

// scoreMarket fetches 3 timeframes per symbol (HTF+MTF+LTF), so this
// scan does 3x the network calls of the old single-timeframe version.
// Batching is eased accordingly to avoid re-tripping the rate limit.
const BATCH_PAUSE_MS = 700

export async function scanMarketSnapshot(symbol, timeframe) {
  try {
    const result = await scoreMarket(symbol, timeframe)

    return {
      id: genId('snap'),
      symbol,
      market: result.market || marketCategory(symbol),
      timeframe,
      status: result.status,
      direction: result.direction || null,
      price: result.entry ?? null,
      qualityScore: result.qualityScore ?? 0,
      confluence: result.qualityScore ?? 0, // kept for backward-compat with any code still reading `confluence`
      breakdown: result.breakdown || {},
      htfTf: result.htfTf,
      mtfTf: result.mtfTf,
      ltfTf: result.ltfTf,
      reason: result.reason || null,
      error: result.error || null,
      entry: result.entry ?? null,
      stopLoss: result.stopLoss ?? null,
      takeProfit1: result.takeProfit1 ?? null,
      takeProfit2: result.takeProfit2 ?? null,
      riskReward: result.riskReward ?? null,
      timestamp: Date.now()
    }
  } catch (err) {
    return {
      id: genId('snap'),
      symbol,
      market: marketCategory(symbol),
      timeframe,
      status: 'WAIT',
      error: err.message,
      price: null,
      timestamp: Date.now()
    }
  }
}

export async function scanAllMarketsLive(symbols, timeframe, { onProgress, batchSize = 2 } = {}) {
  const results = []
  let completed = 0
  let consecutiveErrors = 0
  let systemicBackoffs = 0
  const MAX_SYSTEMIC_BACKOFFS = 2
  const SYSTEMIC_ERROR_THRESHOLD = 4

  for (let i = 0; i < symbols.length; i += batchSize) {
    const batch = symbols.slice(i, i + batchSize)
    const batchResults = await Promise.all(batch.map((symbol) => scanMarketSnapshot(symbol, timeframe)))

    for (const r of batchResults) {
      if (r.error) consecutiveErrors += 1
      else consecutiveErrors = 0
    }

    results.push(...batchResults)
    completed += batch.length
    if (typeof onProgress === 'function') {
      onProgress({ current: Math.min(completed, symbols.length), total: symbols.length })
    }

    if (consecutiveErrors >= SYSTEMIC_ERROR_THRESHOLD && systemicBackoffs < MAX_SYSTEMIC_BACKOFFS) {
      systemicBackoffs += 1
      await sleep(6000)
      consecutiveErrors = 0
    } else if (i + batchSize < symbols.length) {
      await sleep(BATCH_PAUSE_MS)
    }
  }

  // Rank: STRONG > BUY/SELL > WATCH > WAIT > NO_TRADE, highest quality score first within each tier
  const statusRank = { STRONG_BUY: 0, STRONG_SELL: 0, BUY: 1, SELL: 1, WATCH: 2, WAIT: 3, NO_TRADE: 4 }
  return results.sort((a, b) => {
    const rankDiff = (statusRank[a.status] ?? 5) - (statusRank[b.status] ?? 5)
    if (rankDiff !== 0) return rankDiff
    return (b.qualityScore || 0) - (a.qualityScore || 0)
  })
  }
