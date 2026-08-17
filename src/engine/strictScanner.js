import { derivService } from '../services/deriv.js'
import { marketCategory, ALL_MARKETS } from '../constants/markets.js'
import { analyzeForexMarket } from '../forex/forexEngine.js'
import { analyzeSyntheticMarket } from '../synthetic/syntheticEngine.js'
import { runMultiTimeframeAnalysis } from './multiTimeframeAnalyzer.js'
import { resolveAgainstLock } from './signalLock.js'
import { sleep } from '../utils/helpers.js'

const BATCH_PAUSE_MS = 500

const BIAS_TO_DIRECTION = { BULLISH: 'BUY', BEARISH: 'SELL' }

/**
 * Evaluates ONE symbol against the true 3-timeframe cascade, using the
 * currently selected timeframe as the entry (LTF) — never substituting
 * a different entry timeframe:
 *
 *   HTF (macro)  ─┐
 *   MTF (middle) ─┼─ must all agree, or the symbol fails immediately
 *   LTF (entry)  ─┘   LTF = the timeframe the person has selected
 *
 * The entry-timeframe engine (forex or synthetic) must ALSO produce a
 * direction that matches the HTF/MTF bias — agreement is required at
 * every level, not just two of three.
 */
async function evaluateSymbolStrict(symbol, entryTimeframe) {
  // Step 1: HTF vs MTF must agree before the entry timeframe is even considered.
  const mtf = await runMultiTimeframeAnalysis(symbol, entryTimeframe)
  if (!mtf.aligned) return null

  const requiredDirection = BIAS_TO_DIRECTION[mtf.macroBias]
  if (!requiredDirection) return null

  // Step 2: LTF (the selected/entry timeframe) — full engine, no substitution.
  const candleData = await derivService.getCandles(symbol, entryTimeframe, 150)
  if (candleData.error || candleData.candles.length < 60) return null

  const category = marketCategory(symbol)
  const candidate = category === 'forex'
    ? await analyzeForexMarket(symbol, entryTimeframe, candleData)
    : await analyzeSyntheticMarket(symbol, entryTimeframe, candleData)

  if (!candidate) return null

  // Step 3: LTF direction must match the HTF/MTF bias exactly — true
  // 3-way agreement, not just "the top two timeframes agreed."
  if (candidate.direction !== requiredDirection) return null

  const currentPrice = candleData.candles[candleData.candles.length - 1].close

  return {
    ...candidate,
    timeframe: entryTimeframe,
    htfTimeframe: mtf.htf2Timeframe,
    mtfTimeframe: mtf.htf1Timeframe,
    htfBias: mtf.macroBias,
    mtfBias: mtf.intermediateBias,
    takeProfit1: candidate.takeProfit,
    takeProfit2: candidate.takeProfit,
    currentPrice
  }
}

export async function scanSymbolStrict(symbol, entryTimeframe) {
  let candidate = null
  try {
    candidate = await evaluateSymbolStrict(symbol, entryTimeframe)
  } catch (err) {
    console.error(`Strict scan error for ${symbol} @ ${entryTimeframe}:`, err.message)
  }

  if (candidate) {
    const resolution = resolveAgainstLock(symbol, candidate, candidate.currentPrice)
    return { symbol, checkedTimeframe: entryTimeframe, ...resolution }
  }

  // No candidate cleared all 3 timeframes this pass. Still check whether
  // an existing lock should release because price already hit its own
  // SL/TP — bookkeeping only, never a fabricated new signal.
  let price = null
  try {
    price = await derivService.getCurrentPrice(symbol)
  } catch {
    price = null
  }
  const resolution = resolveAgainstLock(symbol, null, price)
  return { symbol, checkedTimeframe: entryTimeframe, ...resolution }
}

export async function scanAllSymbolsStrict(symbols = ALL_MARKETS, entryTimeframe, { onProgress, batchSize = 1 } = {}) {
  const results = []
  let completed = 0
  let consecutiveErrors = 0
  let systemicBackoffs = 0
  const MAX_SYSTEMIC_BACKOFFS = 2
  const SYSTEMIC_ERROR_THRESHOLD = 4

  for (let i = 0; i < symbols.length; i += batchSize) {
    const batch = symbols.slice(i, i + batchSize)
    const batchResults = await Promise.all(
      batch.map((s) => scanSymbolStrict(s, entryTimeframe).catch((err) => ({ symbol: s, action: 'ERROR', error: err.message, signal: null })))
    )

    for (const r of batchResults) {
      if (r.action === 'ERROR' || r.error) consecutiveErrors += 1
      else consecutiveErrors = 0
    }

    results.push(...batchResults)
    completed += batch.length
    if (typeof onProgress === 'function') {
      onProgress({ current: Math.min(completed, symbols.length), total: symbols.length })
    }

    if (consecutiveErrors >= SYSTEMIC_ERROR_THRESHOLD && systemicBackoffs < MAX_SYSTEMIC_BACKOFFS) {
      systemicBackoffs += 1
      await sleep(7000)
      consecutiveErrors = 0
    } else if (i + batchSize < symbols.length) {
      await sleep(BATCH_PAUSE_MS)
    }
  }

  return results
}
