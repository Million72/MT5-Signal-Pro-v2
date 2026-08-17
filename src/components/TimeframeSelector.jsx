import React from 'react'
import { TIMEFRAMES } from '../constants/timeframes.js'
import { COLORS } from '../constants/colors.js'

export default function TimeframeSelector({ timeframe, onChange }) {
  return (
    <div style={{
      display: 'flex', gap: 4, background: COLORS.bgAlt,
      borderRadius: 12, padding: 4, flexWrap: 'wrap', justifyContent: 'center'
    }}>
      {TIMEFRAMES.map((tf) => (
        <button
          key={tf.value}
          onClick={() => onChange(tf.value)}
          style={{
            padding: '8px 16px', borderRadius: 8, border: 'none',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
            background: timeframe === tf.value ? COLORS.accentBlue : 'transparent',
            color: timeframe === tf.value ? '#fff' : COLORS.textDim
          }}
        >
          {tf.label}
        </button>
      ))}
    </div>
  )
}
