import { MTF_CASCADE } from '../constants/timeframes.js'
import { derivService } from '../services/deriv.js'
import { analyzeTrend } from '../forex/analysis/trendAnalysis.js'
import { marketCategory } from '../constants/markets.js'

// Fetches candles for all 3 timeframes in the cascade and checks that
// the macro bias (HTF2) agrees with the intermediate bias (HTF1) before
// the entry timeframe (LTF) is even considered. This mirrors the
// HTF2 -> HTF1 -> LTF confirmation cascade used in the original design.
export async function runMultiTimeframeAnalysis(symbol, entryTimeframe) {
  const cascade = MTF_CASCADE[entryTimeframe] || [entryTimeframe, entryTimeframe, entryTimeframe]
  const [htf2Tf, htf1Tf, ltfTf] = cascade

  const [htf2Data, htf1Data] = await Promise.all([
    derivService.getCandles(symbol, htf2Tf, 100),
    derivService.getCandles(symbol, htf1Tf, 100)
  ])

  if (htf2Data.error || htf1Data.error || htf2Data.candles.length < 60 || htf1Data.candles.length < 60) {
    return { aligned: false, reason: 'insufficient_htf_data' }
  }

  const htf2Trend = analyzeTrend(
    htf2Data.candles.map((c) => c.high),
    htf2Data.candles.map((c) => c.low),
    htf2Data.candles.map((c) => c.close)
  )
  const htf1Trend = analyzeTrend(
    htf1Data.candles.map((c) => c.high),
    htf1Data.candles.map((c) => c.low),
    htf1Data.candles.map((c) => c.close)
  )

  const macroBias = htf2Trend.finalBias
  const intermediateBias = htf1Trend.finalBias

  const aligned = macroBias !== 'NEUTRAL' && macroBias === intermediateBias

  return {
    aligned,
    macroBias,
    intermediateBias,
    htf2Timeframe: htf2Tf,
    htf1Timeframe: htf1Tf,
    ltfTimeframe: ltfTf,
    reason: aligned ? null : 'htf_disagreement'
  }
}

// Synthetic indices don't need the same macro-bias cascade (no
// news-driven multi-day trends the way forex has); the caller should
// skip this for synthetic symbols and rely on the synthetic engine's
// own single-timeframe unanimous gate instead.
export function requiresMtfCascade(symbol) {
  return marketCategory(symbol) === 'forex'
}
