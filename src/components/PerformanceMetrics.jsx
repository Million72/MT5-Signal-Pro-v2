import React, { useMemo } from 'react'
import { COLORS } from '../constants/colors.js'
import { marketCategory } from '../constants/markets.js'

export default function PerformanceMetrics({ history }) {
  const stats = useMemo(() => {
    if (!history || history.length === 0) return null

    const byCategory = {}
    for (const h of history) {
      const cat = marketCategory(h.symbol)
      byCategory[cat] = byCategory[cat] || { count: 0, avgConfidence: 0, totalConfidence: 0 }
      byCategory[cat].count += 1
      byCategory[cat].totalConfidence += (h.confluence || 0)
    }
    for (const cat of Object.keys(byCategory)) {
      byCategory[cat].avgConfidence = Math.round(byCategory[cat].totalConfidence / byCategory[cat].count)
    }

    const avgConfidence = Math.round(history.reduce((s, h) => s + (h.confluence || 0), 0) / history.length)
    const avgRR = (history.reduce((s, h) => s + Number(h.riskReward || 0), 0) / history.length).toFixed(2)
    const buyRatio = Math.round((history.filter((h) => h.direction === 'BUY').length / history.length) * 100)

    return { byCategory, avgConfidence, avgRR, buyRatio, total: history.length }
  }, [history])

  if (!stats) {
    return (
      <div style={{ textAlign: 'center', color: COLORS.textFaint, padding: 40 }}>
        No signals generated yet this session — performance metrics will populate after scans.
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
        <MetricBox label="Total Signals" value={stats.total} color={COLORS.accentBlueLight} />
        <MetricBox label="Avg Confidence" value={`${stats.avgConfidence}%`} color={COLORS.accentPurple} />
        <MetricBox label="Avg R:R" value={`1:${stats.avgRR}`} color={COLORS.buy} />
        <MetricBox label="Buy Ratio" value={`${stats.buyRatio}%`} color={COLORS.warn} />
      </div>

      <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 20 }}>
        <h3 style={{ fontSize: 15, marginBottom: 12, color: COLORS.textDim }}>By Category</h3>
        {Object.entries(stats.byCategory).map(([cat, data]) => (
          <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${COLORS.border}` }}>
            <span style={{ textTransform: 'capitalize' }}>{cat.replace('_', ' ')}</span>
            <span style={{ color: COLORS.textDim }}>{data.count} signals · {data.avgConfidence}% avg</span>
          </div>
        ))}
      </div>

      <p style={{ fontSize: 11, color: COLORS.textFaint, textAlign: 'center' }}>
        These metrics reflect signal generation quality this session only — not verified trade outcomes.
      </p>
    </div>
  )
}

function MetricBox({ label, value, color }) {
  return (
    <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 16, textAlign: 'center' }}>
      <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 12, color: COLORS.textDim, marginTop: 4 }}>{label}</div>
    </div>
  )
}
