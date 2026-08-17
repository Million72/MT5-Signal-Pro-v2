import { analyzeTrend } from './trendAnalysis.js'
import { analyzeVolatility } from './volatilityAnalysis.js'

// Classifies the overall market regime so the engine can decide whether
// to even look for trend-following entries at all — trading a trend
// system in a ranging/choppy regime is a primary source of bad signals.
export function classifyRegime(highs, lows, closes) {
  const trend = analyzeTrend(highs, lows, closes)
  const volatility = analyzeVolatility(highs, lows, closes)

  let regime = 'RANGING'
  if (trend.finalBias !== 'NEUTRAL' && trend.adx >= 25) {
    regime = 'TRENDING'
  }
  if (volatility.regime === 'EXPANDING' && trend.adx < 20) {
    regime = 'VOLATILE_CHOP'
  }

  return {
    regime,
    trend,
    volatility,
    tradeable: regime === 'TRENDING'
  }
}
