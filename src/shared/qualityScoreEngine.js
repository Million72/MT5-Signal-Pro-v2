// Implements the signal engine framework as specified:
//   HTF direction -> MTF structure -> MTF location -> Liquidity ->
//   LTF entry trigger -> Momentum confirmation -> Risk/RR -> Action
//
// Applied identically to forex AND synthetic markets. This is possible
// honestly because every detector used here (BOS, CHoCH, liquidity
// sweep, supply/demand, structure) operates on raw OHLC price data —
// none of them assume anything forex-specific, so there's no faking
// involved in using them on synthetic indices too.
//
// Weights (must sum to 100):
//   HTF direction        20%
//   MTF structure         20%
//   MTF location          20%
//   Liquidity              15%
//   LTF entry trigger      15%
//   Momentum confirmation   5%
//   Risk/RR                 5%
//
// Hard rules: HTF direction, MTF structure, MTF location, and LTF
// entry trigger are gates, not just weighted inputs — if any of them
// fails outright, the result is capped at WAIT regardless of what the
// numeric score would otherwise be. Risk/RR below the minimum forces
// NO_TRADE specifically, overriding even a high score. This mirrors
// the "if any rule is not met, the signal cannot be activated" rule.

import { MTF_CASCADE } from '../constants/timeframes.js'
import { derivService } from '../services/deriv.js'
import { analyzeTrend } from '../forex/analysis/trendAnalysis.js'
import { detectBOS } from '../forex/priceAction/bos.js'
import { detectCHoCH } from '../forex/priceAction/choch.js'
import { detectLiquiditySweep } from '../forex/priceAction/liquiditySweep.js'
import { detectCandlestickPattern } from '../forex/priceAction/candlestickPatterns.js'
import { findSupplyDemandZones, nearestZoneSignal } from '../forex/priceAction/supplyDemand.js'
import { findKeyLevels, priceNearLevel } from '../forex/priceAction/supportResistance.js'
import { calculateRSISeries } from '../indicators/rsi.js'
import { calculateADX } from '../indicators/adx.js'
import { calculateMACD } from '../indicators/macd.js'
import { calculateATR } from '../indicators/atr.js'
import { calculateTpSlLadder } from './tpSlCalculator.js'
import { marketCategory } from '../constants/markets.js'

const WEIGHTS = {
  htfDirection: 20,
  mtfStructure: 20,
  mtfLocation: 20,
  liquidity: 15,
  ltfTrigger: 15,
  momentum: 5,
  riskReward: 5
}

const MIN_RR = 2.5 // consistent with the minimum enforced elsewhere in the app

function biasToDirection(bias) {
  return bias === 'BULLISH' ? 'BUY' : bias === 'BEARISH' ? 'SELL' : null
}

function series(candles) {
  return {
    opens: candles.map((c) => c.open),
    highs: candles.map((c) => c.high),
    lows: candles.map((c) => c.low),
    closes: candles.map((c) => c.close)
  }
}

async function fetchCascade(symbol, entryTimeframe) {
  const cascade = MTF_CASCADE[entryTimeframe] || [entryTimeframe, entryTimeframe, entryTimeframe]
  const [htfTf, mtfTf, ltfTf] = cascade

  const [htfData, mtfData, ltfData] = await Promise.all([
    derivService.getCandles(symbol, htfTf, 120),
    derivService.getCandles(symbol, mtfTf, 120),
    derivService.getCandles(symbol, ltfTf, 150)
  ])

  return { htfTf, mtfTf, ltfTf, htfData, mtfData, ltfData }
}

export async function scoreMarket(symbol, entryTimeframe) {
  const { htfTf, mtfTf, ltfTf, htfData, mtfData, ltfData } = await fetchCascade(symbol, entryTimeframe)

  if (htfData.error || mtfData.error || ltfData.error) {
    return { status: 'WAIT', error: htfData.error || mtfData.error || ltfData.error, symbol, timeframe: entryTimeframe }
  }
  if (htfData.candles.length < 60 || mtfData.candles.length < 60 || ltfData.candles.length < 60) {
    return { status: 'WAIT', error: 'insufficient_data', symbol, timeframe: entryTimeframe }
  }

  const htf = series(htfData.candles)
  const mtf = series(mtfData.candles)
  const ltf = series(ltfData.candles)
  const price = ltf.closes[ltf.closes.length - 1]

  const breakdown = {}
  let earnedScore = 0

  // --- HTF DIRECTION (20%) — hard gate ---
  const htfTrend = analyzeTrend(htf.highs, htf.lows, htf.closes)
  const direction = biasToDirection(htfTrend.finalBias)
  const htfPass = direction !== null
  breakdown.htfDirection = { pass: htfPass, weight: WEIGHTS.htfDirection, detail: htfTrend.finalBias }

  if (!htfPass) {
    return {
      status: 'WAIT', symbol, timeframe: entryTimeframe, htfTf, mtfTf, ltfTf,
      breakdown, qualityScore: 0, reason: 'htf_direction_neutral'
    }
  }
  earnedScore += WEIGHTS.htfDirection

  // --- MTF STRUCTURE (20%) — hard gate ---
  const mtfBos = detectBOS(mtf.highs, mtf.lows, mtf.closes)
  const mtfChoch = detectCHoCH(mtf.highs, mtf.lows, mtf.closes)
  const mtfStructureEvent = mtfBos || mtfChoch
  const mtfStructurePass = mtfStructureEvent?.direction === direction
  breakdown.mtfStructure = { pass: mtfStructurePass, weight: WEIGHTS.mtfStructure, detail: mtfStructureEvent?.type || 'none' }

  if (!mtfStructurePass) {
    return {
      status: 'WAIT', symbol, timeframe: entryTimeframe, htfTf, mtfTf, ltfTf,
      breakdown, qualityScore: earnedScore, reason: 'mtf_structure_not_confirmed', direction
    }
  }
  earnedScore += WEIGHTS.mtfStructure

  // --- MTF LOCATION (20%) — hard gate ---
  const mtfAtr = calculateATR(mtf.highs, mtf.lows, mtf.closes)
  const zones = findSupplyDemandZones(mtf.highs, mtf.lows, mtf.closes, mtf.opens)
  const mtfPrice = mtf.closes[mtf.closes.length - 1]
  const zoneSignal = nearestZoneSignal(zones, mtfPrice, mtfAtr)
  const { resistanceLevels, supportLevels } = findKeyLevels(mtf.highs, mtf.lows)
  const relevantLevels = direction === 'BUY' ? supportLevels : resistanceLevels
  const nearLevel = priceNearLevel(mtfPrice, relevantLevels, mtfAtr)

  const zoneFavorable = zoneSignal?.triggered && zoneSignal.direction === direction
  const locationPass = zoneFavorable || !!nearLevel
  breakdown.mtfLocation = {
    pass: locationPass, weight: WEIGHTS.mtfLocation,
    detail: zoneFavorable ? 'favorable zone' : nearLevel ? 'near key level' : 'no favorable location'
  }

  if (!locationPass) {
    return {
      status: 'WAIT', symbol, timeframe: entryTimeframe, htfTf, mtfTf, ltfTf,
      breakdown, qualityScore: earnedScore, reason: 'mtf_location_not_favorable', direction
    }
  }
  earnedScore += WEIGHTS.mtfLocation

  // --- LIQUIDITY (15%) — soft weighted, not a hard gate ---
  const sweep = detectLiquiditySweep(ltf.highs, ltf.lows, ltf.closes)
  const liquidityPass = sweep?.direction === direction
  breakdown.liquidity = { pass: liquidityPass, weight: WEIGHTS.liquidity, detail: sweep?.type || 'none' }
  if (liquidityPass) earnedScore += WEIGHTS.liquidity

  // --- LTF ENTRY TRIGGER (15%) — hard gate ---
  const ltfBos = detectBOS(ltf.highs, ltf.lows, ltf.closes)
  const ltfChoch = detectCHoCH(ltf.highs, ltf.lows, ltf.closes)
  const candle = detectCandlestickPattern(ltf.opens, ltf.highs, ltf.lows, ltf.closes)
  const ltfTriggerEvent = ltfBos || ltfChoch || candle
  const ltfTriggerPass = ltfTriggerEvent?.direction === direction
  breakdown.ltfTrigger = { pass: ltfTriggerPass, weight: WEIGHTS.ltfTrigger, detail: ltfTriggerEvent?.type || 'none' }

  if (!ltfTriggerPass) {
    return {
      status: 'WAIT', symbol, timeframe: entryTimeframe, htfTf, mtfTf, ltfTf,
      breakdown, qualityScore: earnedScore, reason: 'ltf_trigger_missing', direction
    }
  }
  earnedScore += WEIGHTS.ltfTrigger

  // --- MOMENTUM CONFIRMATION (5%) — soft weighted ---
  const rsiSeries = calculateRSISeries(ltf.closes)
  const rsi = rsiSeries[rsiSeries.length - 1]
  const { plusDI, minusDI } = calculateADX(ltf.highs, ltf.lows, ltf.closes)
  const { histogram } = calculateMACD(ltf.closes)
  const lastHist = histogram[histogram.length - 1]

  let momentumVotes = 0
  if ((direction === 'BUY' && rsi > 50) || (direction === 'SELL' && rsi < 50)) momentumVotes++
  if ((direction === 'BUY' && plusDI[plusDI.length - 1] > minusDI[minusDI.length - 1]) ||
      (direction === 'SELL' && minusDI[minusDI.length - 1] > plusDI[plusDI.length - 1])) momentumVotes++
  if ((direction === 'BUY' && lastHist > 0) || (direction === 'SELL' && lastHist < 0)) momentumVotes++

  const momentumPass = momentumVotes >= 2
  breakdown.momentum = { pass: momentumPass, weight: WEIGHTS.momentum, detail: `${momentumVotes}/3 agree` }
  if (momentumPass) earnedScore += WEIGHTS.momentum

  // --- RISK / RR (5%, graded) — hard override to NO_TRADE if below minimum ---
  const ltfAtr = calculateATR(ltf.highs, ltf.lows, ltf.closes)
  const ladder = calculateTpSlLadder({
    entry: price, direction, atr: ltfAtr,
    slMultiplier: 1.2, tp1Multiplier: 3.2, tp2Multiplier: 5.0
  })

  const rrPass = ladder.riskReward >= MIN_RR
  breakdown.riskReward = { pass: rrPass, weight: WEIGHTS.riskReward, detail: `1:${ladder.riskReward}` }

  if (!rrPass) {
    return {
      status: 'NO_TRADE', symbol, timeframe: entryTimeframe, htfTf, mtfTf, ltfTf,
      breakdown, qualityScore: earnedScore, reason: 'below_minimum_risk_reward', direction,
      riskReward: ladder.riskReward
    }
  }
  // Graded bonus: full 5% only for a genuinely strong payoff (3.0+), half credit above minimum
  earnedScore += ladder.riskReward >= 3.0 ? WEIGHTS.riskReward : WEIGHTS.riskReward / 2

  // --- All hard gates passed — classify by final quality score ---
  let status
  if (earnedScore >= 90) status = direction === 'BUY' ? 'STRONG_BUY' : 'STRONG_SELL'
  else if (earnedScore >= 80) status = direction
  else if (earnedScore >= 70) status = 'WATCH'
  else if (earnedScore >= 60) status = 'WAIT'
  else status = 'NO_TRADE'

  return {
    status,
    direction,
    symbol,
    timeframe: entryTimeframe,
    htfTf, mtfTf, ltfTf,
    breakdown,
    qualityScore: Math.round(earnedScore),
    entry: price,
    stopLoss: ladder.stopLoss,
    takeProfit1: ladder.takeProfit1,
    takeProfit2: ladder.takeProfit2,
    riskReward: ladder.riskReward,
    market: marketCategory(symbol),
    timestamp: Date.now()
  }
}
