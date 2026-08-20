import React, { useState } from 'react'
import { COLORS } from '../constants/colors.js'
import { formatPrice } from '../utils/formatters.js'
import { DRIFT_STATE_LABELS } from '../shared/driftCalculator.js'
import { isActionable, statusLabel, statusColor, statusIcon } from '../utils/statusHelpers.js'

const COMPONENT_LABELS = {
  htfDirection: 'HTF Direction',
  mtfStructure: 'MTF Structure',
  mtfLocation: 'MTF Location',
  liquidity: 'Liquidity',
  ltfTrigger: 'LTF Entry Trigger',
  momentum: 'Momentum Confirmation',
  riskReward: 'Risk / RR'
}

export default function SignalCard({ signal, drift }) {
  const [showBreakdown, setShowBreakdown] = useState(false)
  const actionable = isActionable(signal.status)
  const color = statusColor(signal.status, COLORS)

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
      borderLeft: `4px solid ${color}`,
      border: `1px solid ${COLORS.border}`,
      borderLeftWidth: 4,
      borderRadius: 14, padding: 20
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
          <span style={{ fontSize: 17, fontWeight: 700 }}>{signal.symbol}</span>
          <span style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700,
            background: `${color}22`, color, border: `1px solid ${color}55`
          }}>
            {statusIcon(signal.status)} {statusLabel(signal.status)}
          </span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 20, fontWeight: 800, color }}>{formatPrice(signal.price, signal.symbol)}</div>
          {signal.riskReward != null && (
            <div style={{ fontSize: 12, color: COLORS.buy, fontWeight: 600 }}>R:R {signal.riskReward.toFixed(2)}</div>
          )}
        </div>
      </div>

      {/* HTF -> MTF -> LTF pipeline strip */}
      <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', fontSize: 10, color: COLORS.textFaint }}>
        {signal.htfTf && <PipelineStep label={`HTF ${signal.htfTf}`} pass={signal.breakdown?.htfDirection?.pass} />}
        <Arrow />
        {signal.mtfTf && <PipelineStep label={`MTF ${signal.mtfTf}`} pass={signal.breakdown?.mtfStructure?.pass && signal.breakdown?.mtfLocation?.pass} />}
        <Arrow />
        {signal.ltfTf && <PipelineStep label={`LTF ${signal.ltfTf}`} pass={signal.breakdown?.ltfTrigger?.pass} />}
        <Arrow />
        <PipelineStep label={`Score ${signal.qualityScore ?? 0}`} pass={actionable} />
      </div>

      {/* Quality score bar */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: COLORS.textDim, marginBottom: 4 }}>
          <span>Quality Score</span>
          <span style={{ color, fontWeight: 700 }}>{signal.qualityScore ?? 0}/100</span>
        </div>
        <div style={{ height: 5, background: 'rgba(51,65,85,0.5)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${signal.qualityScore ?? 0}%`, background: color, borderRadius: 3 }} />
        </div>
      </div>

      {signal.reason && !actionable && (
        <div style={{ fontSize: 11, color: COLORS.textFaint, marginBottom: 10 }}>
          Held at {statusLabel(signal.status)}: {reasonText(signal.reason)}
        </div>
      )}

      {actionable && (
        <>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '10px 14px', marginBottom: 10, borderRadius: 10,
            background: 'rgba(239,68,68,0.12)', border: `1.5px solid ${COLORS.sell}`
          }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: COLORS.sell }}>🛑 USE THIS EXACT STOP-LOSS</span>
            <span style={{ fontSize: 16, fontWeight: 800, color: COLORS.sell }}>{formatPrice(signal.stopLoss, signal.symbol)}</span>
          </div>

          {drift && drift.state !== 'FRESH' && drift.state !== 'UNKNOWN' && (
            <div style={{ padding: '10px 14px', marginBottom: 10, borderRadius: 10, background: 'rgba(245,158,11,0.12)', border: `1.5px solid ${COLORS.warn}` }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.warn, marginBottom: 4 }}>⚠️ {DRIFT_STATE_LABELS[drift.state]}</div>
              {drift.state === 'DEGRADED' && (
                <div style={{ fontSize: 11, color: COLORS.warn }}>
                  Price has moved {drift.driftPct}% of the original stop distance. Entering now gives roughly
                  1:{drift.currentRR} — below minimum. Consider skipping this one.
                </div>
              )}
            </div>
          )}
          {drift && drift.state === 'FRESH' && (
            <div style={{ fontSize: 11, color: COLORS.textFaint, marginBottom: 10 }}>✓ Still fresh — current R:R ≈ 1:{drift.currentRR}</div>
          )}

          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <MiniStat label="TP1" value={formatPrice(signal.takeProfit1, signal.symbol)} color={COLORS.buy} />
            <MiniStat label="TP2" value={formatPrice(signal.takeProfit2, signal.symbol)} color={COLORS.buy} />
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <MiniStat label="SL (again)" value={formatPrice(signal.stopLoss, signal.symbol)} color={COLORS.sell} />
            <MiniStat label="Entry" value={formatPrice(signal.entry, signal.symbol)} color={COLORS.accentBlueLight} />
          </div>
        </>
      )}

      <button
        onClick={() => setShowBreakdown((s) => !s)}
        style={{
          width: '100%', padding: '10px 0', background: 'transparent',
          border: `1px solid ${COLORS.border}`, borderRadius: 8,
          color: COLORS.accentBlueLight, fontSize: 12, fontWeight: 600, cursor: 'pointer'
        }}
      >
        {showBreakdown ? 'Hide breakdown ▲' : 'Show component breakdown ▼'}
      </button>

      {showBreakdown && (
        <div style={{ marginTop: 10, display: 'grid', gap: 4 }}>
          {Object.entries(signal.breakdown || {}).map(([key, comp]) => (
            <div key={key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '6px 8px', background: 'rgba(15,23,42,0.5)', borderRadius: 6 }}>
              <span style={{ color: COLORS.textDim }}>{COMPONENT_LABELS[key] || key} ({comp.weight}%)</span>
              <span style={{ color: comp.pass ? COLORS.buy : COLORS.sell, fontWeight: 700 }}>
                {comp.pass ? '✓' : '✗'} {comp.detail}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function PipelineStep({ label, pass }) {
  return (
    <span style={{
      padding: '3px 8px', borderRadius: 6, fontWeight: 700,
      background: pass ? 'rgba(16,185,129,0.15)' : 'rgba(148,163,184,0.1)',
      color: pass ? COLORS.buy : COLORS.textFaint
    }}>
      {label}
    </span>
  )
}

function Arrow() {
  return <span style={{ color: COLORS.textFaint }}>→</span>
}

function MiniStat({ label, value, color }) {
  return (
    <div style={{ flex: 1, background: 'rgba(15,23,42,0.5)', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
      <div style={{ fontSize: 10, color: COLORS.textFaint }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color }}>{value ?? '—'}</div>
    </div>
  )
}

function reasonText(reason) {
  const map = {
    htf_direction_neutral: 'no clear higher-timeframe trend right now',
    mtf_structure_not_confirmed: 'middle-timeframe structure has not confirmed the HTF direction',
    at_opposite_zone_reversal_risk: 'price is sitting right at the opposite zone/level — elevated reversal risk',
    mid_move_monitor_only: 'price has moved a moderate distance from the favorable zone — worth watching, not yet actionable',
    extended_move_no_chase: 'price has moved too far from the favorable zone to chase',
    ltf_trigger_missing: 'no entry trigger has fired yet on the entry timeframe',
    below_minimum_risk_reward: 'risk:reward does not meet the minimum required'
  }
  return map[reason] || reason
}

function errorMessage(rawError) {
  if (rawError === 'timeout') return 'Request timed out — retrying next scan.'
  if (rawError === 'not_connected') return 'Not connected to Deriv — reconnecting…'
  if (rawError === 'no_data' || rawError === 'insufficient_data') return 'Deriv returned no candles for this symbol/timeframe right now.'
  return `Deriv error: ${rawError}`
}
