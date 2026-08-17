import React, { useState, useCallback } from 'react'
import { COLORS } from '../constants/colors.js'
import { ALL_MARKETS, marketCategory } from '../constants/markets.js'
import { derivService } from '../services/deriv.js'
import { classifyRegime } from '../forex/analysis/marketRegime.js'
import { analyzeMomentum } from '../forex/analysis/momentumAnalysis.js'
import { analyzeVolatility } from '../forex/analysis/volatilityAnalysis.js'

export default function MarketAnalysis({ timeframe }) {
  const [symbol, setSymbol] = useState(ALL_MARKETS[0])
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState(null)
  const [err, setErr] = useState(null)

  const runAnalysis = useCallback(async () => {
    setLoading(true)
    setErr(null)
    setData(null)
    try {
      const { candles, error } = await derivService.getCandles(symbol, timeframe, 150)
      if (error || candles.length < 60) {
        setErr('Not enough data returned for this symbol/timeframe.')
        return
      }
      const highs = candles.map((c) => c.high)
      const lows = candles.map((c) => c.low)
      const closes = candles.map((c) => c.close)

      const regime = classifyRegime(highs, lows, closes)
      const momentum = analyzeMomentum(closes)
      const volatility = analyzeVolatility(highs, lows, closes)

      setData({ regime, momentum, volatility, price: closes[closes.length - 1] })
    } catch (e) {
      setErr(e.message)
    } finally {
      setLoading(false)
    }
  }, [symbol, timeframe])

  return (
    <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 24 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <select
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          style={{
            flex: 1, minWidth: 140, padding: '10px 12px', borderRadius: 8,
            background: COLORS.bgAlt, color: COLORS.text, border: `1px solid ${COLORS.border}`
          }}
        >
          {ALL_MARKETS.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <button
          onClick={runAnalysis}
          disabled={loading}
          style={{
            padding: '10px 20px', borderRadius: 8, border: 'none',
            background: COLORS.accentBlue, color: '#fff', fontWeight: 600, cursor: 'pointer',
            opacity: loading ? 0.6 : 1
          }}
        >
          {loading ? 'Analyzing...' : 'Analyze'}
        </button>
      </div>

      {err && <div style={{ color: COLORS.sell, fontSize: 13 }}>{err}</div>}

      {data && (
        <div style={{ display: 'grid', gap: 12 }}>
          <InfoRow label="Category" value={marketCategory(symbol)} />
          <InfoRow label="Price" value={data.price.toFixed(4)} />
          <InfoRow label="Regime" value={data.regime.regime} highlight={data.regime.tradeable} />
          <InfoRow label="Trend Bias" value={data.regime.trend.finalBias} />
          <InfoRow label="ADX" value={data.regime.trend.adx.toFixed(1)} />
          <InfoRow label="Momentum Bias" value={data.momentum.momentumBias} />
          <InfoRow label="RSI" value={data.momentum.rsi.toFixed(1)} />
          {data.momentum.divergence && <InfoRow label="Divergence" value={data.momentum.divergence} highlight />}
          <InfoRow label="Volatility Regime" value={data.volatility.regime} />
          <InfoRow label="ATR %" value={`${data.volatility.atrPct.toFixed(2)}%`} />
        </div>
      )}
    </div>
  )
}

function InfoRow({ label, value, highlight }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', padding: '8px 12px',
      background: 'rgba(15,23,42,0.5)', borderRadius: 8
    }}>
      <span style={{ color: COLORS.textDim, fontSize: 13 }}>{label}</span>
      <span style={{ color: highlight ? COLORS.accentPurple : COLORS.text, fontWeight: 600, fontSize: 13 }}>{value}</span>
    </div>
  )
      }
          
