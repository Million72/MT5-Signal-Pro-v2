import React from 'react'
import { COLORS } from '../constants/colors.js'
import { formatCooldown } from '../utils/formatters.js'

export default function LiveStatusBar({ liveCount, buyCount, sellCount, waitCount, cooldownSeconds, scanning, isConnected, onScanNow }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            width: 9, height: 9, borderRadius: '50%',
            background: isConnected ? COLORS.buy : COLORS.textFaint,
            boxShadow: isConnected ? `0 0 8px ${COLORS.buy}` : 'none'
          }} />
          <span style={{ fontSize: 13, color: COLORS.textDim }}>
            {scanning ? 'Scanning…' : `next ${formatCooldown(cooldownSeconds)}`} · {liveCount} live
          </span>
        </div>

        <button
          onClick={onScanNow}
          disabled={scanning || !isConnected}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '10px 18px', borderRadius: 10, border: 'none',
            background: scanning ? '#334155' : COLORS.gradientButton,
            color: '#fff', fontWeight: 700, fontSize: 13,
            cursor: scanning || !isConnected ? 'not-allowed' : 'pointer',
            opacity: !isConnected ? 0.5 : 1
          }}
        >
          {scanning ? '⏳ Scanning' : '🔄 Scan'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        <StatPill label="LIVE" value={liveCount} color={COLORS.accentBlueLight} />
        <StatPill label="BUY" value={buyCount} color={COLORS.buy} />
        <StatPill label="SELL" value={sellCount} color={COLORS.sell} />
        <StatPill label="WAIT" value={waitCount} color={COLORS.warn} />
      </div>
    </div>
  )
}

function StatPill({ label, value, color }) {
  return (
    <div style={{
      background: COLORS.panel, border: `1px solid ${COLORS.border}`,
      borderRadius: 12, padding: '14px 8px', textAlign: 'center'
    }}>
      <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 10, color: COLORS.textFaint, letterSpacing: 0.5, marginTop: 2 }}>{label}</div>
    </div>
  )
}

