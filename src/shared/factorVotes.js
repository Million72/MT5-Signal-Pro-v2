// Every indicator and price-action detector casts one vote: 'BUY',
// 'SELL', or null (no read). This powers the live dashboard's
// confluence bar and bull/bear counts. Unlike the strict engines
// (forexEngine/syntheticEngine), this NEVER hides a market — every
// scanned symbol gets a status (BUY/SELL/WAIT) so the dashboard can
// show all of them live, the way a real scanner does.

import { calculateEMA } from '../indicators/ema.js'
import { calculateRSISeries } from '../indicators/rsi.js'
import { calculateATR } from '../indicators/atr.js'
import { calculateMACD, macdCrossover } from '../indicators/macd.js'
import { calculateADX } from '../indicators/adx.js'
import { calculateSuperTrend } from '../indicators/supertrend.js'
import { isRising, isFalling } from '../utils/math.js'

import { findSwingPoints, structureBias } from '../forex/priceAction/marketStructure.js'
import { detectBOS } from '../forex/priceAction/bos.js'
import { detectCHoCH } from '../forex/priceAction/choch.js'
import { detectRangeBreakout } from '../forex/priceAction/breakout.js'
import { detectLiquiditySweep } from '../forex/priceAction/liquiditySweep.js'
import { detectCandlestickPattern } from '../forex/priceAction/candlestickPatterns.js'
import { detectDoubleTopBottom } from '../forex/priceAction/chartPatterns.js'
import { findSupplyDemandZones, nearestZoneSignal } from '../forex/priceAction/supplyDemand.js'

// PA_PATTERN factors (order-flow / structure-break style)
const PA_PATTERN_KEYS = ['bos', 'choch', 'liquiditySweep', 'candlestick']
// CHART_PATTERN factors (classic chart-pattern style)
const CHART_PATTERN_KEYS = ['breakout', 'doubleTopBottom', 'supplyDemand']

export function runFactorVotes({ opens, highs, lows, closes }) {
  const votes = {}
  const price = closes[closes.length - 1]

  // --- Trend indicators ---
  const ema20 = calculateEMA(closes, 20)
  const ema50 = calculateEMA(closes, 50)
  const ema200 = calculateEMA(closes, 200)
  votes.emaFastSlow = ema20[ema20.length - 1] > ema50[ema50.length - 1] ? 'BUY' : 'SELL'
  votes.emaSlowLong = ema50[ema50.length - 1] > ema200[ema200.length - 1] ? 'BUY' : 'SELL'
  votes.priceVsEma20 = price > ema20[ema20.length - 1] ? 'BUY' : 'SELL'

  const { trend: stTrend } = calculateSuperTrend(highs, lows, closes)
  votes.superTrend = stTrend[stTrend.length - 1] === 'UP' ? 'BUY' : 'SELL'

  const { plusDI, minusDI, adx } = calculateADX(highs, lows, closes)
  votes.dmiDirection = plusDI[plusDI.length - 1] > minusDI[minusDI.length - 1] ? 'BUY' : 'SELL'
  const currentAdx = adx[adx.length - 1]

  // --- Momentum indicators ---
  const rsiSeries = calculateRSISeries(closes)
  const rsi = rsiSeries[rsiSeries.length - 1]
  votes.rsiMidline = rsi > 50 ? 'BUY' : 'SELL'
  votes.rsiTrajectory = isRising(rsiSeries, 4) ? 'BUY' : isFalling(rsiSeries, 4) ? 'SELL' : null

  const { macdLine, signalLine, histogram } = calculateMACD(closes)
  votes.macdHistogram = histogram[histogram.length - 1] > 0 ? 'BUY' : 'SELL'
  const cross = macdCrossover(macdLine, signalLine)
  votes.macdCross = cross === 'BULLISH_CROSS' ? 'BUY' : cross === 'BEARISH_CROSS' ? 'SELL' : null

  // --- Price momentum ---
  const recent5 = closes.slice(-5)
  votes.priceMomentum = recent5[recent5.length - 1] > recent5[0] ? 'BUY' : 'SELL'

  // --- Structure ---
  const { swingHighs, swingLows } = findSwingPoints(highs, lows, 3)
  const bias = structureBias(swingHighs, swingLows)
  votes.structure = bias === 'BULLISH' ? 'BUY' : bias === 'BEARISH' ? 'SELL' : null

  // --- Price-action pattern detectors ---
  const bos = detectBOS(highs, lows, closes)
  votes.bos = bos ? bos.direction : null

  const choch = detectCHoCH(highs, lows, closes)
  votes.choch = choch ? choch.direction : null

  const sweep = detectLiquiditySweep(highs, lows, closes)
  votes.liquiditySweep = sweep ? sweep.direction : null

  const candle = detectCandlestickPattern(opens, highs, lows, closes)
  votes.candlestick = candle ? candle.direction : null

  const breakout = detectRangeBreakout(highs, lows, closes)
  votes.breakout = (breakout && !(bos && bos.direction === breakout.direction)) ? breakout.direction : null

  const chartPattern = detectDoubleTopBottom(highs, lows, closes)
  votes.doubleTopBottom = chartPattern ? chartPattern.direction : null

  const atr = calculateATR(highs, lows, closes)
  const zones = findSupplyDemandZones(highs, lows, closes, opens)
  const zoneSignal = nearestZoneSignal(zones, price, atr)
  votes.supplyDemand = zoneSignal?.triggered ? zoneSignal.direction : null

  // --- Tally ---
  const entries = Object.entries(votes)
  const bullVotes = entries.filter(([, v]) => v === 'BUY').length
  const bearVotes = entries.filter(([, v]) => v === 'SELL').length
  const totalFactors = entries.length
  const directionalTotal = bullVotes + bearVotes

  const paPatternsCount = PA_PATTERN_KEYS.filter((k) => votes[k]).length
  const chartPatternsCount = CHART_PATTERN_KEYS.filter((k) => votes[k]).length

  return {
    votes,
    bullVotes,
    bearVotes,
    totalFactors,
    directionalTotal,
    paPatternsCount,
    chartPatternsCount,
    rsi,
    atr,
    adx: currentAdx,
    macdDirection: histogram[histogram.length - 1] > 0 ? 'UP' : 'DOWN',
    structureBias: bias
  }
}

// Classifies BUY / SELL / WAIT from the vote tally. A market only gets
// a directional call when one side clearly dominates (>=65% confluence
// among factors that gave a read at all); otherwise it's WAIT — visible
// on the dashboard, but not actionable.
const CONFLUENCE_THRESHOLD = 0.85
const MIN_DIRECTIONAL_COVERAGE = 0.5 // at least 50% of factors must give a directional read

export function classifyStatus({ bullVotes, bearVotes, totalFactors, directionalTotal }) {
  if (directionalTotal === 0 || directionalTotal / totalFactors < MIN_DIRECTIONAL_COVERAGE) {
    return { status: 'WAIT', confluence: 0 }
  }

  const bullRatio = bullVotes / directionalTotal
  const bearRatio = bearVotes / directionalTotal

  if (bullRatio >= CONFLUENCE_THRESHOLD) {
    return { status: 'BUY', confluence: Math.round(bullRatio * 100) }
  }
  if (bearRatio >= CONFLUENCE_THRESHOLD) {
    return { status: 'SELL', confluence: Math.round(bearRatio * 100) }
  }
  return { status: 'WAIT', confluence: Math.round(Math.max(bullRatio, bearRatio) * 100) }
}
