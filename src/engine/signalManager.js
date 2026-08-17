import { derivService } from '../services/deriv.js'
import { marketCategory, ALL_MARKETS } from '../constants/markets.js'
import { analyzeForexMarket } from '../forex/forexEngine.js'
import { analyzeSyntheticMarket } from '../synthetic/syntheticEngine.js'
import { runMultiTimeframeAnalysis, requiresMtfCascade } from './multiTimeframeAnalyzer.js'
import { riskManager } from './riskManager.js'
import { chunk } from '../utils/helpers.js'

// Routes a symbol to the correct engine and applies every gate in order:
// 1. Fetch candles (fails closed — no data means no signal, never a guess)
// 2. Multi-timeframe cascade (forex only)
// 3. Market-specific engine (forex or synthetic)
// 4. Portfolio-level risk manager
async function analyzeOneMarket(symbol, timeframe) {
  const category = marketCategory(symbol)

  const candleData = await derivService.getCandles(symbol, timeframe, 150)
  if (candleData.error || candleData.candles.length < 60) return null

  let mtf = { aligned: true } // default true for synthetics, which skip the cascade
  if (requiresMtfCascade(symbol)) {
    mtf = await runMultiTimeframeAnalysis(symbol, timeframe)
    if (!mtf.aligned) return null
  }

  const candidate = category === 'forex'
    ? await analyzeForexMarket(symbol, timeframe, candleData)
    : await analyzeSyntheticMarket(symbol, timeframe, candleData)

  if (!candidate) return null

  const riskCheck = riskManager.canAcceptSignal(candidate)
  if (!riskCheck.accepted) return null

  riskManager.register(candidate)
  return candidate
}

export async function scanAllMarkets(timeframe, { onProgress, batchSize = 3 } = {}) {
  riskManager.expireOld()
  const batches = chunk(ALL_MARKETS, batchSize)
  const results = []
  let completed = 0

  for (const batch of batches) {
    const batchResults = await Promise.all(
      batch.map((symbol) => analyzeOneMarket(symbol, timeframe).catch((err) => {
        console.error(`Error analyzing ${symbol}:`, err.message)
        return null
      }))
    )

    results.push(...batchResults.filter(Boolean))
    completed += batch.length
    if (typeof onProgress === 'function') {
      onProgress({ current: Math.min(completed, ALL_MARKETS.length), total: ALL_MARKETS.length })
    }
  }

  return results.sort((a, b) => b.confidence - a.confidence)
}

export async function scanSingleMarket(symbol, timeframe) {
  return analyzeOneMarket(symbol, timeframe)
}
