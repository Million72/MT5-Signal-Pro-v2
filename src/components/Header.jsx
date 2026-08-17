import React from 'react'
import { COLORS } from '../constants/colors.js'
import { ALL_MARKETS } from '../constants/markets.js'

export default function Header({ connectionStatus }) {
  const statusConfig = {
    connected: { text: '✅ Connected to Deriv API - Real market data', color: COLORS.buy, bg: '#10b98122' },
    connecting: { text: '⏳ Connecting to Deriv API...', color: COLORS.warn, bg: '#f59e0b22' },
    error: { text: '❌ Connection failed - Tap to retry', color: COLORS.sell, bg: '#ef444422' },
    disconnected: { text: '⚪ Disconnected', color: COLORS.textDim, bg: '#64748b22' }
  }
  const status = statusConfig[connectionStatus] || statusConfig.disconnected

  return (
    <>
      <div style={{
        padding: '6px 24px',
        textAlign: 'center',
        fontSize: 12,
        fontWeight: 500,
        background: status.bg,
        color: status.color,
        borderBottom: `1px solid ${status.color}33`
      }}>
        {status.text}
      </div>

      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(15, 23, 42, 0.95)',
        backdropFilter: 'blur(20px)',
        borderBottom: `1px solid ${COLORS.border}`,
        padding: '0 24px'
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          height: 64, maxWidth: 1400, margin: '0 auto'
        }}>
          <span style={{ fontSize: 28 }}>⚡</span>
          <div>
            <h1 style={{
              fontSize: 22, fontWeight: 700, margin: 0,
              background: COLORS.gradientHeader,
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
            }}>
              MT5 Signal Pro v2
            </h1>
            <p style={{ fontSize: 11, color: COLORS.textFaint, margin: 0 }}>
              Real-time Deriv API • {ALL_MARKETS.length} Markets
            </p>
          </div>
        </div>
      </header>
    </>
  )
}

