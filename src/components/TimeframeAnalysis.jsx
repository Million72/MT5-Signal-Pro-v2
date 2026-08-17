import React, { useState, useCallback } from 'react'
import { COLORS } from '../constants/colors.js'
import { ALL_MARKETS } from '../constants/markets.js'
import { TIMEFRAMES } from '../constants/timeframes.js'
import { derivService } from '../services/deriv.js'
import { analyzeTrend } from '../forex/analysis/trendAnalysis.js'

export default function TimeframeAnalysis() {
  const [symbol, setSymbol] = useState(ALL_MARKETS[0])
  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState([])

  const run = useCallback(async () => {
    setLoading(true)
    setRows([])
    const results = []

    for (const tf of TIMEFRAMES) {
      const { candles, error } = await derivService.getCandles(symbol, tf.value, 100)
      if (error || candles.length < 60) {
        results.push({ tf: tf.label, bias: 'N/A', adx: null })
        continue
      }
      const trend = analyzeTrend(
        candles.map((c) => c.high),
        candles.map((c) => c.low),
        candles.map((c) => c.close)
      )
      results.push({ tf: tf.label, bias: trend.finalBias, adx: trend.adx })
    }

    setRows(results)
    setLoading(false)
  }, [symbol])

  return (
    <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 24 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <select
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          style={{ flex: 1, minWidth: 140, padding: '10px 12px', borderRadius: 8, background: COLORS.bgAlt, color: COLORS.text, border: `1px solid ${COLORS.border}` }}
        >
          {ALL_MARKETS.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <button
          onClick={run}
          disabled={loading}
          style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: COLORS.accentBlue, color: '#fff', fontWeight: 600, cursor: 'pointer', opacity: loading ? 0.6 : 1 }}
        >
          {loading ? 'Loading...' : 'Compare All'}
        </button>
      </div>

      {rows.length > 0 && (
        <div style={{ display: 'grid', gap: 8 }}>
          {rows.map((row) => {
            const color = row.bias === 'BULLISH' ? COLORS.buy : row.bias === 'BEARISH' ? COLORS.sell : COLORS.textDim
            return (
              <div key={row.tf} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: 'rgba(15,23,42,0.5)', borderRadius: 8 }}>
                <span style={{ color: COLORS.textDim, fontWeight: 600 }}>{row.tf}</span>
                <span style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  {row.adx != null && <span style={{ fontSize: 11, color: COLORS.textFaint }}>ADX {row.adx.toFixed(0)}</span>}
                  <span style={{ color, fontWeight: 700 }}>{row.bias}</span>
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
