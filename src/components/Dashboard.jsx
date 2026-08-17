import React from 'react'
import { COLORS } from '../constants/colors.js'
import { formatCooldown } from '../utils/formatters.js'
import { ALL_MARKETS } from '../constants/markets.js'

export default function Dashboard({ timeframe, scanning, progress, canScan, cooldownSeconds, isConnected, error, onScan }) {
  return (
    <div style={{
      background: COLORS.panel,
      border: `1px solid ${COLORS.border}`,
      borderRadius: 16, padding: 32, textAlign: 'center', marginBottom: 24
    }}>
      <h2 style={{ fontSize: 26, marginBottom: 8 }}>{timeframe} Scanner</h2>
      <p style={{ color: COLORS.textDim, marginBottom: 24 }}>
        Scanning {ALL_MARKETS.length} markets • zero-tolerance confidence gate
      </p>

      <button
        onClick={onScan}
        disabled={!canScan}
        style={{
          padding: '16px 48px', fontSize: 18, fontWeight: 700,
          border: 'none', borderRadius: 12, color: 'white',
          background: canScan ? COLORS.gradientButton : '#334155',
          opacity: canScan ? 1 : 0.5,
          cursor: canScan ? 'pointer' : 'not-allowed'
        }}
      >
        {scanning ? '⏳ Scanning Markets...' :
         !isConnected ? '🔄 Waiting for connection...' :
         canScan ? '🔍 Scan All Markets Now' :
         `⏰ Next scan in ${formatCooldown(cooldownSeconds)}`}
      </button>

      {scanning && (
        <div style={{ marginTop: 16 }}>
          <div style={{ color: COLORS.textDim, marginBottom: 8 }}>
            Scanning {progress.current}/{progress.total || ALL_MARKETS.length} markets
          </div>
          <div style={{ height: 4, background: COLORS.bgAlt, borderRadius: 2, maxWidth: 400, margin: '0 auto', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              background: COLORS.gradientButton,
              borderRadius: 2,
              width: `${progress.total ? (progress.current / progress.total) * 100 : 0}%`,
              transition: 'width 0.3s'
            }} />
          </div>
        </div>
      )}

      {error && (
        <div style={{
          marginTop: 16, padding: 12,
          background: '#ef444411', border: '1px solid #ef444433',
          borderRadius: 8, color: COLORS.sell
        }}>
          Error: {error}
          <button onClick={onScan} style={{
            marginLeft: 12, padding: '6px 16px',
            background: COLORS.accentBlue, color: 'white',
            border: 'none', borderRadius: 6, cursor: 'pointer'
          }}>
            Retry
          </button>
        </div>
      )}
    </div>
  )
}
