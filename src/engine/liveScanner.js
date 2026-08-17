import { derivService } from '../services/deriv.js'
import { runFactorVotes, classifyStatus } from '../shared/factorVotes.js'
import { calculateTpSlLadder, distanceToPips } from '../shared/tpSlCalculator.js'
import { analyzeTrend } from '../forex/analysis/trendAnalysis.js'
import { marketCategory } from '../constants/markets.js'
import { genId, sleep } from '../utils/helpers.js'

const BATCH_PAUSE_MS = 400 // paces requests so a shared rate-limited app_id doesn't reject a whole burst

/**
 * Scans a single symbol and returns a full snapshot regardless of
 * whether it qualifies for a directional call — WAIT symbols are still
 * returned so the dashboard can show every market live, matching a
 * real scanner's "27 live" behavior.
 */
export async function scanMarketSnapshot(symbol, timeframe) {
  const { candles, error } = await derivService.getCandles(symbol, timeframe, 150)

  if (error || !candles || candles.length < 60) {
    return {
      id: genId('snap'),
      symbol,
      market: marketCategory(symbol),
      timeframe,
      status: 'WAIT',
      error: error || 'insufficient_data',
      price: null,
      timestamp: Date.now()
    }
  }

  const opens = candles.map((c) => c.open)
  const highs = candles.map((c) => c.high)
  const lows = candles.map((c) => c.low)
  const closes = candles.map((c) => c.close)
  const price = closes[closes.length - 1]

  const factorResult = runFactorVotes({ opens, highs, lows, closes })
  const { status, confluence } = classifyStatus(factorResult)

  // HTF bias + structure badge (HH/HL vs LH/LL), for display badges
  const trend = analyzeTrend(highs, lows, closes)
  const htfBadge = trend.finalBias === 'BULLISH' ? 'HTF BULL' : trend.finalBias === 'BEARISH' ? 'HTF BEAR' : 'HTF FLAT'
  const structureBadge = factorResult.structureBias === 'BULLISH' ? 'HH/HL' : factorResult.structureBias === 'BEARISH' ? 'LH/LL' : null

  let ladder = null
  let pips = null
  let riskReward = null

  if (status !== 'WAIT') {
    const direction = status
    ladder = calculateTpSlLadder({ entry: price, direction, atr: factorResult.atr })
    riskReward = ladder.riskReward
    pips = marketCategory(symbol) === 'forex'
      ? distanceToPips(ladder.slDistance, symbol)
      : Number(ladder.slDistance.toFixed(2)) // synthetic: raw index points
  }

  return {
    id: genId('snap'),
    symbol,
    market: marketCategory(symbol),
    timeframe,
    status,
    direction: status !== 'WAIT' ? status : null,
    price,
    confluence,
    bullVotes: factorResult.bullVotes,
    bearVotes: factorResult.bearVotes,
    totalFactors: factorResult.totalFactors,
    directionalTotal: factorResult.directionalTotal,
    votes: factorResult.votes,
    paPatternsCount: factorResult.paPatternsCount,
    chartPatternsCount: factorResult.chartPatternsCount,
    rsi: factorResult.rsi,
    atr: factorResult.atr,
    adx: factorResult.adx,
    macdDirection: factorResult.macdDirection,
    htfBadge,
    structureBadge,
    entry: price,
    stopLoss: ladder?.stopLoss ?? null,
    takeProfit1: ladder?.takeProfit1 ?? null,
    takeProfit2: ladder?.takeProfit2 ?? null,
    riskReward,
    pips,
    timestamp: Date.now()
  }
}

export async function scanAllMarketsLive(symbols, timeframe, { onProgress, batchSize = 2 } = {}) {
  const results = []
  let completed = 0
  let consecutiveErrors = 0
  let systemicBackoffs = 0
  const MAX_SYSTEMIC_BACKOFFS = 2
  const SYSTEMIC_ERROR_THRESHOLD = 4 // this many failures in a row = not bad luck, it's rate-limiting

  for (let i = 0; i < symbols.length; i += batchSize) {
    const batch = symbols.slice(i, i + batchSize)
    const batchResults = await Promise.all(
      batch.map((symbol) => scanMarketSnapshot(symbol, timeframe).catch((err) => ({
        id: genId('snap'),
        symbol,
        market: marketCategory(symbol),
        timeframe,
        status: 'WAIT',
        error: err.message,
        price: null,
        timestamp: Date.now()
      })))
    )

    for (const r of batchResults) {
      if (r.error) consecutiveErrors += 1
      else consecutiveErrors = 0
    }

    results.push(...batchResults)
    completed += batch.length
    if (typeof onProgress === 'function') {
      onProgress({ current: Math.min(completed, symbols.length), total: symbols.length })
    }

    // A run of failures this long isn't isolated bad luck — it's the
    // shared rate limit rejecting the burst. Stop hammering it and back
    // off hard so the limiter has room to reset before continuing,
    // instead of racing through the remaining symbols and returning 27
    // identical failures.
    if (consecutiveErrors >= SYSTEMIC_ERROR_THRESHOLD && systemicBackoffs < MAX_SYSTEMIC_BACKOFFS) {
      systemicBackoffs += 1
      await sleep(6000)
      consecutiveErrors = 0
    } else if (i + batchSize < symbols.length) {
      await sleep(BATCH_PAUSE_MS)
    }
  }

  // BUY/SELL first (highest confluence first), WAIT last
  return results.sort((a, b) => {
    if (a.status === 'WAIT' && b.status !== 'WAIT') return 1
    if (a.status !== 'WAIT' && b.status === 'WAIT') return -1
    return (b.confluence || 0) - (a.confluence || 0)
  })
}
