import React, { useMemo } from 'react'
import { COLORS } from '../constants/colors.js'
import { marketCategory } from '../constants/markets.js'
import { formatPrice } from '../utils/formatters.js'
import { isBullish } from '../utils/statusHelpers.js'

export default function PerformanceMetrics({ history, outcomeStats }) {
  const sessionStats = useMemo(() => {
    if (!history || history.length === 0) return null

    const byCategory = {}
    for (const h of history) {
      const cat = marketCategory(h.symbol)
      byCategory[cat] = byCategory[cat] || { count: 0, avgConfidence: 0, totalConfidence: 0 }
      byCategory[cat].count += 1
      byCategory[cat].totalConfidence += (h.confluence || 0)
    }
    for (const cat of Object.keys(byCategory)) {
      byCategory[cat].avgConfidence = Math.round(byCategory[cat].totalConfidence / byCategory[cat].count)
    }

    const avgConfidence = Math.round(history.reduce((s, h) => s + (h.confluence || 0), 0) / history.length)
    const avgRR = (history.reduce((s, h) => s + Number(h.riskReward || 0), 0) / history.length).toFixed(2)
    const buyRatio = Math.round((history.filter((h) => isBullish(h.direction) || isBullish(h.status)).length / history.length) * 100)

    return { byCategory, avgConfidence, avgRR, buyRatio, total: history.length }
  }, [history])

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      {/* REAL TRACK RECORD — evidence-based, not a confidence score */}
      <div>
        <h3 style={{ fontSize: 14, color: COLORS.textDim, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Real Track Record
        </h3>

        {!outcomeStats || outcomeStats.closedCount === 0 ? (
          <div style={{
            background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 12,
            padding: 16, fontSize: 13, color: COLORS.textFaint
          }}>
            {outcomeStats && outcomeStats.openCount > 0
              ? `${outcomeStats.openCount} signal(s) currently open and being tracked — no closed outcomes yet. Win rate will appear here once positions hit TP or SL.`
              : 'No signals tracked yet. Once BUY/SELL signals fire, this tracks whether they actually hit take-profit or stop-loss — a real number, not a confidence estimate.'}
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginBottom: 12 }}>
              <MetricBox label="Win Rate" value={`${outcomeStats.winRate}%`} color={outcomeStats.winRate >= 50 ? COLORS.buy : COLORS.sell} />
              <MetricBox label="Wins" value={outcomeStats.wins} color={COLORS.buy} />
              <MetricBox label="Losses" value={outcomeStats.losses} color={COLORS.sell} />
              <MetricBox label="Open" value={outcomeStats.openCount} color={COLORS.warn} />
            </div>

            <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 16, marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: COLORS.textFaint, marginBottom: 10 }}>Win rate by confluence at signal time</div>
              {outcomeStats.byConfluence.map((b) => (
                <div key={b.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${COLORS.border}` }}>
                  <span style={{ fontSize: 13, color: COLORS.textDim }}>{b.label} ({b.count} closed)</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: b.winRate == null ? COLORS.textFaint : b.winRate >= 50 ? COLORS.buy : COLORS.sell }}>
                    {b.winRate == null ? 'no data yet' : `${b.winRate}%`}
                  </span>
                </div>
              ))}
            </div>

            {outcomeStats.recentClosed.length > 0 && (
              <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 16 }}>
                <div style={{ fontSize: 12, color: COLORS.textFaint, marginBottom: 10 }}>Recent closed signals</div>
                {outcomeStats.recentClosed.map((r) => (
                  <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${COLORS.border}` }}>
                    <span style={{ fontSize: 12, color: COLORS.textDim }}>{r.symbol} {r.direction}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: r.outcome === 'TP_HIT' ? COLORS.buy : COLORS.sell }}>
                      {r.outcome === 'TP_HIT' ? '✓ TP hit' : '✗ SL hit'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        <p style={{ fontSize: 11, color: COLORS.textFaint, marginTop: 10 }}>
          Checked against live price roughly once a minute. Win rate is real and evidence-based —
          it will start near zero data and only becomes meaningful after enough closed signals accumulate.
        </p>
      </div>

      {/* Session-level generation stats (separate from real outcomes above) */}
      {sessionStats && (
        <div>
          <h3 style={{ fontSize: 14, color: COLORS.textDim, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            This Session's Signal Generation
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 12 }}>
            <MetricBox label="Total Signals" value={sessionStats.total} color={COLORS.accentBlueLight} />
            <MetricBox label="Avg Confluence" value={`${sessionStats.avgConfidence}%`} color={COLORS.accentPurple} />
            <MetricBox label="Avg R:R" value={`1:${sessionStats.avgRR}`} color={COLORS.buy} />
            <MetricBox label="Buy Ratio" value={`${sessionStats.buyRatio}%`} color={COLORS.warn} />
          </div>
          <p style={{ fontSize: 11, color: COLORS.textFaint }}>
            These reflect signal generation only — not verified outcomes. See Real Track Record above for that.
          </p>
        </div>
      )}
    </div>
  )
}

function MetricBox({ label, value, color }) {
  return (
    <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 16, textAlign: 'center' }}>
      <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 12, color: COLORS.textDim, marginTop: 4 }}>{label}</div>
    </div>
  )
}
