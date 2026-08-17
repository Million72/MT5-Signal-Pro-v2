import { classifyRegime } from './analysis/marketRegime.js'
import { trendFilter } from './filters/trendFilter.js'
import { momentumFilter } from './filters/momentumFilter.js'
import { volatilityFilter } from './filters/volatilityFilter.js'
import { sessionFilter } from './filters/sessionFilter.js'

import { detectBOS } from './priceAction/bos.js'
import { detectCHoCH } from './priceAction/choch.js'
import { detectRangeBreakout } from './priceAction/breakout.js'
import { detectLiquiditySweep } from './priceAction/liquiditySweep.js'
import { findSupplyDemandZones, nearestZoneSignal } from './priceAction/supplyDemand.js'
import { detectCandlestickPattern } from './priceAction/candlestickPatterns.js'
import { detectDoubleTopBottom } from './priceAction/chartPatterns.js'
import { detectRetest } from './priceAction/retest.js'
import { nearestSwingLevels } from './priceAction/marketStructure.js'

import { calculateATR } from '../indicators/atr.js'
import { buildConfirmation, detectConflict } from '../shared/confirmationEngine.js'
import { buildConfidenceScore } from '../shared/confidenceScore.js'
import { calculateTpSl } from '../shared/tpSlCalculator.js'
import { validateSignal } from '../shared/signalValidator.js'
import { genId } from '../utils/helpers.js'

// Runs every entry-model detector once and returns only the ones that
// actually fired. Each detector is independent — a model firing on an
// unrelated historical zone (a past bug) is prevented because every
// detector only looks at the CURRENT last candle relative to recent
// structure, never a stale historical index.
function runEntryModels({ highs, lows, closes, opens }) {
  const models = []

  const bos = detectBOS(highs, lows, closes)
  if (bos) models.push(bos)

  const choch = detectCHoCH(highs, lows, closes)
  if (choch) models.push(choch)

  // Breakout only counted if BOS didn't already fire in the same
  // direction — prevents the double-counting bug from before.
  const breakout = detectRangeBreakout(highs, lows, closes)
  if (breakout && !(bos && bos.direction === breakout.direction)) {
    models.push(breakout)
  }

  const sweep = detectLiquiditySweep(highs, lows, closes)
  if (sweep) models.push(sweep)

  const candle = detectCandlestickPattern(opens, highs, lows, closes)
  if (candle) models.push(candle)

  const chartPattern = detectDoubleTopBottom(highs, lows, closes)
  if (chartPattern) models.push(chartPattern)

  const atr = calculateATR(highs, lows, closes)
  const zones = findSupplyDemandZones(highs, lows, closes, opens)
  const currentPrice = closes[closes.length - 1]
  const zoneSignal = nearestZoneSignal(zones, currentPrice, atr)
  const staleZone = zoneSignal?.staleZone === true
  if (zoneSignal?.triggered) models.push({ type: 'SUPPLY_DEMAND', direction: zoneSignal.direction, source: 'supplyDemand' })

  return { models, staleZone }
}

export async function analyzeForexMarket(symbol, timeframe, candleData) {
  const { candles } = candleData
  if (!candles || candles.length < 60) return null

  const opens = candles.map((c) => c.open)
  const highs = candles.map((c) => c.high)
  const lows = candles.map((c) => c.low)
  const closes = candles.map((c) => c.close)
  const currentPrice = closes[closes.length - 1]

  // --- Regime gate: only look for entries in a trending regime ---
  const regime = classifyRegime(highs, lows, closes)
  if (!regime.tradeable) return null

  // --- Session gate ---
  const session = sessionFilter()
  if (!session.passed) return null

  const direction = regime.trend.finalBias
  if (direction === 'NEUTRAL') return null

  // --- Filters ---
  const trend = trendFilter(closes, highs, lows)
  const momentum = momentumFilter(closes, direction)
  const volatility = volatilityFilter(highs, lows, closes)

  if (!trend.passed || !momentum.passed || !volatility.passed) return null

  // --- Entry models (hard gate: zero models = no signal) ---
  const { models, staleZone } = runEntryModels({ highs, lows, closes, opens })
  const modelsInDirection = models.filter((m) => m.direction === direction)
  const conflictingSignal = detectConflict(models)

  if (modelsInDirection.length === 0) return null

  // --- Multi-timeframe confirmation is layered on by multiTimeframeAnalyzer
  //     upstream; here we confirm against this single timeframe's structure ---
  const confirmation = buildConfirmation({
    htfBias: direction,
    ltfBias: direction,
    entryModels: modelsInDirection,
    structureFilterPassed: true
  })

  if (!confirmation.confirmed) return null

  // --- Confidence scoring ---
  const { score, breakdown } = buildConfidenceScore({
    trendAlignment: trend.passed,
    momentum: momentum.passed,
    structureConfirmed: confirmation.entryModelConfirmed,
    volatilityOk: volatility.passed,
    multiTimeframe: confirmation.htfAligned
  })

  // --- TP/SL using ATR + nearest structural level ---
  const { nearestSwingHigh, nearestSwingLow } = nearestSwingLevels(highs, lows, closes.length - 1)
  const { stopLoss, takeProfit, riskReward } = calculateTpSl({
    entry: currentPrice,
    direction,
    atr: volatility.atr,
    nearestSwingHigh,
    nearestSwingLow
  })

  // Check for a retest pattern on the primary entry model (bonus context, not a gate)
  const primaryModel = modelsInDirection[0]
  const isRetestEntry = primaryModel?.brokenLevel != null
    ? detectRetest(highs, lows, closes, primaryModel.brokenLevel, direction, volatility.atr)
    : false

  const candidate = {
    id: genId('sig'),
    symbol,
    market: 'forex',
    timeframe,
    direction,
    entry: currentPrice,
    stopLoss,
    takeProfit,
    riskReward,
    confidence: score,
    confidenceBreakdown: breakdown,
    entryModelConfirmed: confirmation.entryModelConfirmed,
    entryModels: modelsInDirection.map((m) => m.type),
    htfAligned: confirmation.htfAligned,
    conflictingSignal,
    staleZone,
    isRetestEntry,
    regime: regime.regime,
    rsi: Math.round(momentum.rsi ?? 0),
    adx: Math.round(trend.adx),
    timestamp: Date.now()
  }

  const validation = validateSignal(candidate)
  if (!validation.valid) return null

  return candidate
      }
  
