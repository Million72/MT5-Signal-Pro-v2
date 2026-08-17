import React from 'react'
import { COLORS } from '../constants/colors.js'

const OPTIONS = [
  { value: 'ALL', label: 'ALL' },
  { value: 'BUY', label: 'BUY' },
  { value: 'SELL', label: 'SELL' },
  { value: 'WAIT', label: 'WAIT' }
]

export default function FilterBar({ statusFilter, onChange }) {
  const toneColor = (v) => v === 'BUY' ? COLORS.buy : v === 'SELL' ? COLORS.sell : v === 'WAIT' ? COLORS.warn : COLORS.accentBlue

  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          style={{
            flex: '1 0 auto', padding: '8px 0', borderRadius: 20, border: 'none',
            fontSize: 12, fontWeight: 700, cursor: 'pointer',
            background: statusFilter === opt.value ? toneColor(opt.value) : COLORS.bgAlt,
            color: statusFilter === opt.value ? '#04101f' : COLORS.textDim
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

