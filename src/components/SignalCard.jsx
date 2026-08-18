import React, { useState } from 'react'
import { COLORS } from '../constants/colors.js'
import { formatPrice } from '../utils/formatters.js'
import { DRIFT_STATE_LABELS } from '../shared/driftCalculator.js'

const FACTOR_LABELS = {
  emaFastSlow: 'EMA 20/50', emaSlowLong: 'EMA 50/200', priceVsEma20: 'Price vs EMA20',
  superTrend: 'SuperTrend', dmiDirection: 'DMI Direction', rsiMidline: 'RSI Midline',
  rsiTrajectory: 'RSI Trajectory', macdHistogram: 'MACD Histogram', macdCross: 'MACD Cross',
  priceMomentum: 'Price Momentum', structure: 'Structure Bias', bos: 'Break of Structure',
  choch: 'Change of Character', liquiditySweep: 'Liquidity Sweep', candlestick: 'Candlestick Pattern',
  breakout: 'Range Breakout', doubleTopBottom: 'Double Top/Bottom', supplyDemand: 'Supply/Demand Zone'
}

export default function SignalCard({ signal, drift }) {
  const [showFactors, setShowFactors] = useState(false)
  const isBuy = signal.status === 'BUY'
  const isSell = signal.status === 'SELL'
  const isWait = signal.status === 'WAIT'

  const statusColor = isBuy ? COLORS.buy : isSell ? COLORS.sell : COLORS.warn
  const borderColor = isBuy ? 'rgba(16,185,129,0.4)' : isSell ? 'rgba(239,68,68,0.4)' : 'rgba(245,158,11,0.3)'

  if (signal.error) {
    return (
      <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: 16, opacity: 0.6 }}>
        <div style={{ fontWeight: 700 }}>{signal.symbol}</div>
        <div style={{ fontSize: 12, color: COLORS.textFaint, marginTop: 4 }}>
          {errorMessage(signal.error)}
        </div>
      </div>
    )
  }

  return (
    <div style={{
      background: COLORS.panel,
      borderLeft: `4px solid ${statusColor}`,
      border: `1px solid ${COLORS.border}`,
      borderLeftWidth: 4,
      borderRadius: 14, padding: 20
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor }} />
          <span style={{ fontSize: 17, fontWeight: 700 }}>{signal.symbol}</span>
          <StatusBadge status={signal.status} color={statusColor} />
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: statusColor }}>
            {formatPrice(signal.price, signal.symbol)}
          </div>
          {signal.riskReward != null && (
            <div style={{ fontSize: 12, color: COLORS.buy, fontWeight: 600 }}>R:R {signal.riskReward.toFixed(2)}</div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
        {signal.htfBadge && <Badge text={signal.htfBadge} tone={signal.htfBadge.includes('BULL') ? 'buy' : signal.htfBadge.includes('BEAR') ? 'sell' : 'neutral'} />}
        {signal.structureBadge && <Badge text={signal.structureBadge} tone={signal.structureBadge === 'HH/HL' ? 'buy' : 'sell'} />}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <div style={{
          flex: 1, textAlign: 'center', padding: '8px 0', borderRadius: 8,
          background: 'rgba(16,185,129,0.1)', color: COLORS.buy, fontWeight: 700, fontSize: 13
        }}>
          ▲ {signal.bullVotes} bull
        </div>
        <div style={{
          flex: 1, textAlign: 'center', padding: '8px 0', borderRadius: 8,
          background: 'rgba(239,68,68,0.1)', color: COLORS.sell, fontWeight: 700, fontSize: 13
        }}>
          ▼ {signal.bearVotes} bear
        </div>
        <div style={{
          padding: '8px 12px', borderRadius: 8, background: 'rgba(148,163,184,0.1)',
          color: COLORS.textFaint, fontSize: 12, display: 'flex', alignItems: 'center'
        }}>
          /{signal.totalFactors}
        </div>
      </div>

      {!isWait && (
        <>
          {/* Unmissable stop-loss callout — the exact level the R:R math
              was built around. A tighter manual stop gets clipped by
              normal noise even when the direction is correct. */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '10px 14px', marginBottom: 10, borderRadius: 10,
            background: 'rgba(239,68,68,0.12)', border: `1.5px solid ${COLORS.sell}`
          }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: COLORS.sell }}>
              🛑 USE THIS EXACT STOP-LOSS
            </span>
            <span style={{ fontSize: 16, fontWeight: 800, color: COLORS.sell }}>
              {formatPrice(signal.stopLoss, signal.symbol)}
            </span>
          </div>

          {drift && drift.state !== 'FRESH' && drift.state !== 'UNKNOWN' && (
            <div style={{
              padding: '10px 14px', marginBottom: 10, borderRadius: 10,
              background: 'rgba(245,158,11,0.12)', border: `1.5px solid ${COLORS.warn}`
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.warn, marginBottom: 4 }}>
                ⚠️ {DRIFT_STATE_LABELS[drift.state]}
              </div>
              {drift.state === 'DEGRADED' && (
                <div style={{ fontSize: 11, color: COLORS.warn }}>
                  Price has moved {drift.driftPct}% of the original stop distance since this fired.
                  Entering now gives roughly 1:{drift.currentRR} — below the 2.5 minimum this signal
                  needed to qualify. Consider skipping this one.
                </div>
              )}
            </div>
          )}
          {drift && drift.state === 'FRESH' && (
            <div style={{ fontSize: 11, color: COLORS.textFaint, marginBottom: 10 }}>
              ✓ Still fresh — current R:R ≈ 1:{drift.currentRR}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <MiniStat label="TP1" value={formatPrice(signal.takeProfit1, signal.symbol)} color={COLORS.buy} />
            <MiniStat label="TP2" value={formatPrice(signal.takeProfit2, signal.symbol)} color={COLORS.buy} />
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <MiniStat label="SL (again)" value={formatPrice(signal.stopLoss, signal.symbol)} color={COLORS.sell} />
            <MiniStat label={signal.market === 'forex' ? 'PIPS' : 'PTS'} value={signal.pips} color={COLORS.accentPurple} />
          </div>
        </>
      )}

      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: COLORS.textDim, marginBottom: 4 }}>
          <span>Confluence</span>
          <span style={{ color: statusColor, fontWeight: 700 }}>{signal.confluence}%</span>
        </div>
        <div style={{ height: 5, background: 'rgba(51,65,85,0.5)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${signal.confluence}%`, background: statusColor, borderRadius: 3 }} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 14, fontSize: 12, color: COLORS.textDim, marginBottom: 12, flexWrap: 'wrap' }}>
        <span>RSI: <b style={{ color: COLORS.text }}>{signal.rsi?.toFixed(1)}</b></span>
        <span>ATR: <b style={{ color: COLORS.text }}>{signal.atr?.toFixed(3)}</b></span>
        <span>MACD: <b style={{ color: signal.macdDirection === 'UP' ? COLORS.buy : COLORS.sell }}>{signal.macdDirection === 'UP' ? '▲' : '▼'}</b></span>
      </div>

      <button
        onClick={() => setShowFactors((s) => !s)}
        style={{
          width: '100%', padding: '10px 0', background: 'transparent',
          border: `1px solid ${COLORS.border}`, borderRadius: 8,
          color: COLORS.accentBlueLight, fontSize: 12, fontWeight: 600, cursor: 'pointer'
        }}
      >
        {showFactors ? 'Hide factors ▲' : `Show all factors (${signal.totalFactors}) ▼`}
      </button>

      {showFactors && (
        <div style={{ marginTop: 10, display: 'grid', gap: 4 }}>
          {Object.entries(signal.votes || {}).map(([key, dir]) => (
            <div key={key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '4px 8px', background: 'rgba(15,23,42,0.5)', borderRadius: 6 }}>
              <span style={{ color: COLORS.textDim }}>{FACTOR_LABELS[key] || key}</span>
              <span style={{ color: dir === 'BUY' ? COLORS.buy : dir === 'SELL' ? COLORS.sell : COLORS.textFaint, fontWeight: 700 }}>
                {dir || '—'}
              </span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginTop: 4, color: COLORS.textFaint }}>
            <span>PA Patterns ({signal.paPatternsCount})</span>
            <span>Chart Patterns ({signal.chartPatternsCount})</span>
          </div>
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status, color }) {
  const icon = status === 'BUY' ? '▲' : status === 'SELL' ? '▼' : '◆'
  return (
    <span style={{
      display: 'flex', alignItems: 'center', gap: 4,
      padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700,
      background: `${color}22`, color, border: `1px solid ${color}55`
    }}>
      {icon} {status}
    </span>
  )
}

function Badge({ text, tone }) {
  const color = tone === 'buy' ? COLORS.buy : tone === 'sell' ? COLORS.sell : COLORS.textDim
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
      background: `${color}18`, color, border: `1px solid ${color}40`
    }}>
      {text}
    </span>
  )
}

function MiniStat({ label, value, color }) {
  return (
    <div style={{ flex: 1, background: 'rgba(15,23,42,0.5)', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
      <div style={{ fontSize: 10, color: COLORS.textFaint }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color }}>{value ?? '—'}</div>
    </div>
  )
}

function errorMessage(rawError) {
  if (rawError === 'timeout') return 'Request timed out — likely rate-limited (shared demo app_id). Retried automatically, will retry again next scan.'
  if (rawError === 'not_connected') return 'Not connected to Deriv — reconnecting…'
  if (rawError === 'no_data' || rawError === 'insufficient_data') return 'Deriv returned no candles for this symbol/timeframe right now.'
  return `Deriv error: ${rawError}`
}
