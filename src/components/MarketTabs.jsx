import React from 'react'
import { COLORS } from '../constants/colors.js'

const TABS = [
  { value: 'signals', label: 'Signals' },
  { value: 'strict', label: '🔒 Strict' },
  { value: 'analysis', label: 'Market Analysis' },
  { value: 'mtf', label: 'MTF' },
  { value: 'history', label: 'History' },
  { value: 'performance', label: 'Performance' }
]

export default function MarketTabs({ active, onChange }) {
  return (
    <div style={{
      display: 'flex', gap: 4, overflowX: 'auto', marginBottom: 20,
      background: COLORS.bgAlt, borderRadius: 12, padding: 4
    }}>
      {TABS.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          style={{
            flex: '1 0 auto', padding: '10px 16px', borderRadius: 8, border: 'none',
            fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
            background: active === tab.value ? COLORS.accentBlue : 'transparent',
            color: active === tab.value ? '#fff' : COLORS.textDim
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
