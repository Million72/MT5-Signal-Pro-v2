import React from 'react'
import { COLORS } from '../constants/colors.js'

export default function StatsBar({ signals }) {
  const buyCount = signals.filter((s) => s.direction === 'BUY').length
  const sellCount = signals.filter((s) => s.direction === 'SELL').length
  const avgConf = signals.length > 0
    ? Math.round(signals.reduce((sum, s) => sum + s.confidence, 0) / signals.length)
    : 0

  const stats = [
    { label: 'Total', value: signals.length, color: COLORS.accentBlueLight },
    { label: 'Buy', value: buyCount, color: COLORS.buy },
    { label: 'Sell', value: sellCount, color: COLORS.sell },
    { label: 'Avg Confidence', value: `${avgConf}%`, color: COLORS.accentPurple }
  ]

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
      gap: 12, marginBottom: 24
    }}>
      {stats.map((stat) => (
        <div key={stat.label} style={{
          background: COLORS.panel,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 12,
          padding: 16,
          textAlign: 'center'
        }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: stat.color }}>{stat.value}</div>
          <div style={{ fontSize: 12, color: COLORS.textDim, marginTop: 4 }}>{stat.label}</div>
        </div>
      ))}
    </div>
  )
}
