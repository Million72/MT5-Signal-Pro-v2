import React from 'react'
import { COLORS } from '../constants/colors.js'
import { formatPrice, formatTime, directionColor } from '../utils/formatters.js'

export default function SignalHistory({ history }) {
  if (!history || history.length === 0) {
    return (
      <div style={{ textAlign: 'center', color: COLORS.textFaint, padding: 40 }}>
        No scan history yet this session. Run a scan to build history.
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {history.map((entry) => (
        <div key={entry.id} style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '12px 16px', background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 10
        }}>
          <div>
            <span style={{ fontWeight: 700 }}>{entry.symbol}</span>
            <span style={{ color: COLORS.textFaint, fontSize: 12, marginLeft: 8 }}>{formatTime(entry.timestamp)}</span>
          </div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <span style={{ color: directionColor(entry.direction), fontWeight: 700, fontSize: 13 }}>{entry.direction}</span>
            <span style={{ color: COLORS.textDim, fontSize: 13 }}>{formatPrice(entry.entry, entry.symbol)}</span>
            <span style={{ color: COLORS.accentPurple, fontSize: 13, fontWeight: 600 }}>{entry.confluence}%</span>
          </div>
        </div>
      ))}
    </div>
  )
}
