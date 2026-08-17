import React from 'react'
import { COLORS } from '../constants/colors.js'
import { formatPrice } from '../utils/formatters.js'

export default function StrictSignalCard({ signal, onClose }) {
  const isBuy = signal.direction === 'BUY'
  const color = isBuy ? COLORS.buy : COLORS.sell

  return (
    <div style={{
      background: COLORS.panel,
      border: `1px solid ${color}55`,
      borderLeft: `4px solid ${color}`,
      borderRadius: 14, padding: 20
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 17, fontWeight: 700 }}>{signal.symbol}</span>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
            background: `${color}22`, color, border: `1px solid ${color}55`
          }}>
            🔒 LOCKED {signal.direction}
          </span>
        </div>
        <span style={{ fontSize: 11, color: COLORS.textFaint }}>{signal.timeframe}</span>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
        {signal.htfTimeframe && (
          <CascadeBadge label={`HTF ${signal.htfTimeframe}`} bias={signal.htfBias} />
        )}
        {signal.mtfTimeframe && (
          <CascadeBadge label={`MTF ${signal.mtfTimeframe}`} bias={signal.mtfBias} />
        )}
        <CascadeBadge label={`LTF ${signal.timeframe} (entry)`} bias={signal.direction === 'BUY' ? 'BULLISH' : 'BEARISH'} />
      </div>

      <div style={{
        background: 'rgba(15,23,42,0.6)', borderRadius: 10, padding: '14px 16px',
        textAlign: 'center', marginBottom: 14
      }}>
        <div style={{ fontSize: 28, fontWeight: 800, color }}>{signal.confidence}%</div>
        <div style={{ fontSize: 12, color: COLORS.textDim }}>Confidence · every gate passed</div>
      </div>

      <Row label="Entry" value={formatPrice(signal.entry, signal.symbol)} />
      <Row label="Stop Loss" value={formatPrice(signal.stopLoss, signal.symbol)} valueColor={COLORS.sell} />
      <Row label="Take Profit" value={formatPrice(signal.takeProfit1, signal.symbol)} valueColor={COLORS.buy} />
      <Row label="R:R" value={`1:${signal.riskReward}`} valueColor={COLORS.accentPurple} />

      <div style={{ marginTop: 12, padding: 10, borderRadius: 8, background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.25)', fontSize: 11, color: COLORS.accentBlueLight }}>
        Direction is locked — releases only on take-profit. A stop-loss hit does NOT unlock this symbol.
      </div>

      {onClose && (
        <button
          onClick={() => onClose(signal.symbol)}
          style={{
            width: '100%', marginTop: 10, padding: '10px 0',
            background: 'transparent', border: `1px solid ${COLORS.sell}55`,
            borderRadius: 8, color: COLORS.sell, fontSize: 12, fontWeight: 700, cursor: 'pointer'
          }}
        >
          ✕ Close Position (manual override)
        </button>
      )}

      {signal.honestNote && (
        <div style={{ marginTop: 8, padding: 10, borderRadius: 8, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', fontSize: 11, color: COLORS.warn }}>
          ⚠️ {signal.honestNote}
        </div>
      )}
    </div>
  )
}

function Row({ label, value, valueColor }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${COLORS.border}` }}>
      <span style={{ color: COLORS.textDim, fontSize: 13 }}>{label}</span>
      <span style={{ color: valueColor || COLORS.text, fontWeight: 700, fontSize: 13 }}>{value}</span>
    </div>
  )
}

function CascadeBadge({ label, bias }) {
  const color = bias === 'BULLISH' ? COLORS.buy : bias === 'BEARISH' ? COLORS.sell : COLORS.textDim
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
      background: `${color}18`, color, border: `1px solid ${color}40`
    }}>
      {label} · {bias === 'BULLISH' ? '▲' : '▼'}
    </span>
  )
              }
