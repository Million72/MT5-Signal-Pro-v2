// Synthetic indices (Volatility/Boom/Crash/Jump) are algorithmically
// generated — they have no news, no sessions, no real order flow, and
// no meaningful volume. ICT/SMC concepts built for human-driven forex
// order flow don't transfer cleanly. Live testing showed a SIMPLER
// architecture with a small, fixed set of indicators and a strict
// unanimous-agreement gate outperformed the complex multi-model
// approach used for forex. This engine deliberately stays small.

import { calculateEMA } from '../indicators/ema.js'
import { calculateRSISeries } from '../indicators/rsi.js'
import { calculateATR, calculateATRSeries } from '../indicators/atr.js'
import { calculateMACD, macdCrossover } from '../indicators/macd.js'
import { calculateADX } from '../indicators/adx.js'
import { calculateSuperTrend } from '../indicators/supertrend.js'
import { mean, stddev } from '../utils/math.js'
import { calculateTpSl } from '../shared/tpSlCalculator.js'
import { validateSignal } from '../shared/signalValidator.js'
import { BOOM_CRASH_SYMBOLS, marketCategory } from '../constants/markets.js'
import { genId } from '../utils/helpers.js'

// The 9 indicators used for the unanimous-agreement gate.
// Every single one must agree on direction, or no signal fires.
function runIndicatorVotes(highs, lows, closes) {
  const votes = {}
  const price = closes[closes.length - 1]

  // 1. EMA20 vs EMA50
  const ema20 = calculateEMA(closes, 20)
  const ema50 = calculateEMA(closes, 50)
  votes.emaCross = ema20[ema20.length - 1] > ema50[ema50.length - 1] ? 'BUY' : 'SELL'

  // 2. Price vs EMA20
  votes.priceVsEma20 = price > ema20[ema20.length - 1] ? 'BUY' : 'SELL'

  // 3. EMA50 vs EMA200
  const ema200 = calculateEMA(closes, 200)
  votes.emaLongTerm = ema50[ema50.length - 1] > ema200[ema200.length - 1] ? 'BUY' : 'SELL'

  // 4. RSI midline
  const rsiSeries = calculateRSISeries(closes)
  const rsi = rsiSeries[rsiSeries.length - 1]
  votes.rsiMidline = rsi > 50 ? 'BUY' : 'SELL'

  // 5. RSI trajectory (last 4 bars)
  const rsiSlice = rsiSeries.slice(-4)
  votes.rsiTrajectory = rsiSlice[rsiSlice.length - 1] > rsiSlice[0] ? 'BUY' : 'SELL'

  // 6. MACD histogram sign
  const { histogram } = calculateMACD(closes)
  votes.macdHistogram = histogram[histogram.length - 1] > 0 ? 'BUY' : 'SELL'

  // 7. ADX directional (+DI vs -DI)
  const { plusDI, minusDI } = calculateADX(highs, lows, closes)
  votes.dmiDirection = plusDI[plusDI.length - 1] > minusDI[minusDI.length - 1] ? 'BUY' : 'SELL'

  // 8. SuperTrend
  const { trend } = calculateSuperTrend(highs, lows, closes)
  votes.superTrend = trend[trend.length - 1] === 'UP' ? 'BUY' : 'SELL'

  // 9. Short-term price momentum (last 5 closes slope direction)
  const recent5 = closes.slice(-5)
  votes.priceMomentum = recent5[recent5.length - 1] > recent5[0] ? 'BUY' : 'SELL'

  return votes
}

function unanimousDirection(votes) {
  const values = Object.values(votes)
  const allBuy = values.every((v) => v === 'BUY')
  const allSell = values.every((v) => v === 'SELL')
  if (allBuy) return 'BUY'
  if (allSell) return 'SELL'
  return null // any disagreement kills the signal — zero tolerance
}

// Boom/Crash indices spike unpredictably by design. We never claim to
// predict spike timing — only apply the same trend-following logic to
// the non-spike drift between spikes, with an honest confidence cap.
function isBoomCrash(symbol) {
  return BOOM_CRASH_SYMBOLS.includes(symbol)
}

export async function analyzeSyntheticMarket(symbol, timeframe, candleData) {
  const { candles } = candleData
  if (!candles || candles.length < 60) return null

  const highs = candles.map((c) => c.high)
  const lows = candles.map((c) => c.low)
  const closes = candles.map((c) => c.close)
  const currentPrice = closes[closes.length - 1]

  const votes = runIndicatorVotes(highs, lows, closes)
  const direction = unanimousDirection(votes)
  if (!direction) return null

  // Volatility sanity check: ATR must not be in an abnormal spike state
  // relative to its own recent history (protects against firing right
  // as a Boom/Crash spike or an anomalous synthetic tick event occurs).
  const atrSeries = calculateATRSeries(highs, lows, closes)
  const currentAtr = atrSeries[atrSeries.length - 1]
  const baselineAtr = mean(atrSeries.slice(-30))
  const atrStd = stddev(atrSeries.slice(-30))
  const zScore = atrStd === 0 ? 0 : (currentAtr - baselineAtr) / atrStd

  const abnormalVolatility = Math.abs(zScore) > 2.5
  if (abnormalVolatility) return null

  const { stopLoss, takeProfit, riskReward } = calculateTpSl({
    entry: currentPrice,
    direction,
    atr: currentAtr,
    slMultiplier: 1.5,
    tpMultiplier: 2.5
  })

  // Confidence: unanimous 9/9 agreement is itself the primary signal of
  // quality. Boom/Crash gets a confidence cap since spike timing is
  // fundamentally unpredictable — the trend read only covers drift
  // between spikes, never the spike event itself.
  let confidence = 92
  if (isBoomCrash(symbol)) {
    confidence = Math.min(confidence, 80)
  }

  const candidate = {
    id: genId('sig'),
    symbol,
    market: 'synthetic',
    category: marketCategory(symbol),
    timeframe,
    direction,
    entry: currentPrice,
    stopLoss,
    takeProfit,
    riskReward,
    confidence,
    confidenceBreakdown: { unanimousVote: true, votes },
    entryModelConfirmed: true, // the unanimous vote itself IS the entry model
    entryModels: ['UNANIMOUS_9_INDICATOR_VOTE'],
    htfAligned: true, // single-timeframe by design; MTF layered on separately
    conflictingSignal: false,
    staleZone: false,
    atrZScore: Number(zScore.toFixed(2)),
    honestNote: isBoomCrash(symbol)
      ? 'Spike timing is not predictable — this signal reflects trend drift only, confidence capped accordingly.'
      : null,
    timestamp: Date.now()
  }

  const validation = validateSignal(candidate)
  if (!validation.valid) return null

  return candidate
}
