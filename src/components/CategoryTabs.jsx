import React from 'react'
import { COLORS } from '../constants/colors.js'

export default function CategoryTabs({ signals, active, onChange }) {
  const forexCount = signals.filter((s) => s.market === 'forex').length
  const syntheticCount = signals.filter((s) => s.market !== 'forex').length

  const tabs = [
    { value: 'forex', label: 'Forex', count: forexCount },
    { value: 'synthetic', label: 'Synthetic', count: syntheticCount }
  ]

  return (
    <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: `1px solid ${COLORS.border}` }}>
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          style={{
            flex: 1, padding: '12px 0', border: 'none', background: 'transparent',
            fontSize: 14, fontWeight: 700, cursor: 'pointer',
            color: active === tab.value ? COLORS.buy : COLORS.textDim,
            borderBottom: active === tab.value ? `2px solid ${COLORS.buy}` : '2px solid transparent'
          }}
        >
          {tab.label.toUpperCase()} ({tab.count})
        </button>
      ))}
    </div>
  )
}

