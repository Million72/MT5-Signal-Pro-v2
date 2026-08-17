import React, { useState, useCallback } from 'react'
import { COLORS } from '../constants/colors.js'
import { MARKETS } from '../constants/markets.js'
import { runMultiTimeframeAnalysis } from '../engine/multiTimeframeAnalyzer.js'

export default function MTFAnalysis({ timeframe }) {
  const [symbol, setSymbol] = useState(MARKETS.forex[0])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)

  const run = useCallback(async () => {
    setLoading(true)
    setResult(null)
    try {
      const res = await runMultiTimeframeAnalysis(symbol, timeframe)
      setResult(res)
    } finally {
      setLoading(false)
    }
  }, [symbol, timeframe])

  return (
    <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 24 }}>
      <p style={{ color: COLORS.textDim, fontSize: 13, marginBottom: 16 }}>
        Multi-timeframe cascade: macro (HTF2) → intermediate (HTF1) → entry ({timeframe}).
        Forex only — synthetics use a single-timeframe unanimous vote instead.
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <select
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          style={{
            flex: 1, minWidth: 140, padding: '10px 12px', borderRadius: 8,
            background: COLORS.bgAlt, color: COLORS.text, border: `1px solid ${COLORS.border}`
          }}
        >
          {MARKETS.forex.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <button
          onClick={run}
          disabled={loading}
          style={{
            padding: '10px 20px', borderRadius: 8, border: 'none',
            background: COLORS.accentBlue, color: '#fff', fontWeight: 600, cursor: 'pointer',
            opacity: loading ? 0.6 : 1
          }}
        >
          {loading ? 'Checking...' : 'Run Cascade'}
        </button>
      </div>

      {result && (
        <div style={{ display: 'grid', gap: 10 }}>
          <StepRow label={`Macro (${result.htf2Timeframe || '—'})`} bias={result.macroBias} />
          <StepRow label={`Intermediate (${result.htf1Timeframe || '—'})`} bias={result.intermediateBias} />
          <div style={{
            marginTop: 8, padding: 12, borderRadius: 10, textAlign: 'center', fontWeight: 700,
            background: result.aligned ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
            color: result.aligned ? COLORS.buy : COLORS.sell
          }}>
            {result.aligned ? '✓ Timeframes aligned' : `✗ Not aligned (${result.reason})`}
          </div>
        </div>
      )}
    </div>
  )
}

function StepRow({ label, bias }) {
  const color = bias === 'BULLISH' ? COLORS.buy : bias === 'BEARISH' ? COLORS.sell : COLORS.textDim
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: 'rgba(15,23,42,0.5)', borderRadius: 8 }}>
      <span style={{ color: COLORS.textDim, fontSize: 13 }}>{label}</span>
      <span style={{ color, fontWeight: 700, fontSize: 13 }}>{bias || '—'}</span>
    </div>
  )
}
