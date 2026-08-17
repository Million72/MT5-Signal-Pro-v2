import React, { useState, useEffect } from 'react'

import Header from './components/Header.jsx'
import TimeframeSelector from './components/TimeframeSelector.jsx'
import LiveStatusBar from './components/LiveStatusBar.jsx'
import CategoryTabs from './components/CategoryTabs.jsx'
import FilterBar from './components/FilterBar.jsx'
import ActiveSignals from './components/ActiveSignals.jsx'
import MarketTabs from './components/MarketTabs.jsx'
import MarketAnalysis from './components/MarketAnalysis.jsx'
import MTFAnalysis from './components/MTFAnalysis.jsx'
import TimeframeAnalysis from './components/TimeframeAnalysis.jsx'
import SignalHistory from './components/SignalHistory.jsx'
import PerformanceMetrics from './components/PerformanceMetrics.jsx'
import StrictSignalCard from './components/StrictSignalCard.jsx'

import { useMarketData } from './hooks/useMarketData.js'
import { useSignalEngine } from './hooks/useSignalEngine.js'
import { useStrictSignals } from './hooks/useStrictSignals.js'
import { COLORS } from './constants/colors.js'
import { formatCooldown } from './utils/formatters.js'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('App Error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: COLORS.bg, color: COLORS.text, fontFamily: 'system-ui, sans-serif'
        }}>
          <div style={{ textAlign: 'center', padding: 40 }}>
            <h1 style={{ fontSize: 24, marginBottom: 16 }}>Something went wrong</h1>
            <p style={{ color: COLORS.textDim, marginBottom: 24 }}>
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button
              onClick={() => { this.setState({ hasError: false }); window.location.reload() }}
              style={{ padding: '12px 32px', background: COLORS.accentBlue, color: 'white', border: 'none', borderRadius: 8, fontSize: 16, cursor: 'pointer' }}
            >
              Reload App
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

function AppInner() {
  const [timeframe, setTimeframe] = useState('1h')
  const [activeTab, setActiveTab] = useState('signals')
  const [category, setCategory] = useState('forex')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [history, setHistory] = useState([])

  const { connectionStatus, isConnected, reconnect } = useMarketData()
  const {
    signals, scanning, progress, error, scan,
    cooldownSeconds, liveCount, buyCount, sellCount, waitCount, isSystemicFailure
  } = useSignalEngine(timeframe, isConnected)

  const {
    lockedSignals, scanning: strictScanning, progress: strictProgress,
    cooldownSeconds: strictCooldown, scan: strictScan, closePosition, scannedCount, lockedCount
  } = useStrictSignals(timeframe, isConnected)

  // Append newly generated directional signals (BUY/SELL only) to
  // session history — WAIT entries aren't actionable, so they're
  // excluded from the history/performance views.
  useEffect(() => {
    const directional = signals.filter((s) => s.status === 'BUY' || s.status === 'SELL')
    if (directional.length > 0) {
      setHistory((prev) => {
        const existingIds = new Set(prev.map((h) => h.id))
        const additions = directional.filter((s) => !existingIds.has(s.id))
        return [...additions, ...prev].slice(0, 100)
      })
    }
  }, [signals])

  // Track strict locked signals in history too, tagged so they're
  // distinguishable from live-scan entries.
  useEffect(() => {
    if (lockedSignals.length > 0) {
      setHistory((prev) => {
        const existingIds = new Set(prev.map((h) => h.id))
        const additions = lockedSignals
          .filter((s) => !existingIds.has(s.id))
          .map((s) => ({ ...s, strict: true, confluence: s.confidence, entry: s.entry }))
        return [...additions, ...prev].slice(0, 100)
      })
    }
  }, [lockedSignals])

  const handleScan = () => {
    if (connectionStatus === 'error') {
      reconnect()
      return
    }
    scan()
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: `linear-gradient(135deg, ${COLORS.bg} 0%, ${COLORS.bgAlt} 100%)`,
      color: COLORS.text
    }}>
      <Header connectionStatus={connectionStatus} />

      <main style={{ maxWidth: 1400, margin: '0 auto', padding: 20 }}>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center' }}>
          <TimeframeSelector timeframe={timeframe} onChange={setTimeframe} />
        </div>

        <MarketTabs active={activeTab} onChange={setActiveTab} />

        {activeTab === 'signals' && (
          <>
            <LiveStatusBar
              liveCount={liveCount}
              buyCount={buyCount}
              sellCount={sellCount}
              waitCount={waitCount}
              cooldownSeconds={cooldownSeconds}
              scanning={scanning}
              isConnected={isConnected}
              onScanNow={handleScan}
            />

            {error && (
              <div style={{
                marginBottom: 16, padding: 12,
                background: '#ef444411', border: '1px solid #ef444433',
                borderRadius: 8, color: COLORS.sell, fontSize: 13
              }}>
                {error}
              </div>
            )}

            {isSystemicFailure && (
              <div style={{
                marginBottom: 16, padding: 14,
                background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)',
                borderRadius: 10, color: COLORS.warn, fontSize: 13
              }}>
                <strong>Deriv is rate-limiting requests right now</strong> — most symbols failed to
                return data on this pass, which means the connection got throttled, not that the
                market has no data. This is almost always caused by the shared demo <code>app_id=1089</code>.
                It should recover on its own (the scanner already backs off automatically), but for a
                permanent fix, register your own free app_id at api.deriv.com — see the README.
              </div>
            )}

            <CategoryTabs signals={signals} active={category} onChange={setCategory} />
            <FilterBar statusFilter={statusFilter} onChange={setStatusFilter} />

            {scanning && signals.length === 0 ? (
              <div style={{ textAlign: 'center', color: COLORS.textDim, padding: 40 }}>
                Scanning {progress.current}/{progress.total || '—'} markets…
              </div>
            ) : (
              <ActiveSignals signals={signals} category={category} statusFilter={statusFilter} />
            )}
          </>
        )}

        {activeTab === 'strict' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
              <div style={{ fontSize: 13, color: COLORS.textDim }}>
                {strictScanning
                  ? `Checking ${strictProgress.current}/${strictProgress.total || '—'} · HTF → MTF → ${timeframe} (entry)…`
                  : `${lockedCount} locked · ${scannedCount} symbols checked · next check ${formatCooldown(strictCooldown)}`}
              </div>
              <button
                onClick={strictScan}
                disabled={strictScanning || !isConnected}
                style={{
                  padding: '8px 16px', borderRadius: 8, border: 'none',
                  background: strictScanning ? '#334155' : COLORS.gradientButton,
                  color: '#fff', fontWeight: 700, fontSize: 12, cursor: strictScanning ? 'not-allowed' : 'pointer'
                }}
              >
                {strictScanning ? '⏳' : '🔄 Recheck'}
              </button>
            </div>

            <div style={{
              marginBottom: 16, padding: 12, borderRadius: 8,
              background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.25)',
              fontSize: 12, color: COLORS.accentPurple
            }}>
              Zero-tolerance mode: your selected timeframe ({timeframe}) is the entry (LTF). It must agree with the
              middle timeframe (MTF) and the high timeframe (HTF) above it — all three levels required, no
              substitutions. A locked signal releases ONLY when price hits its take-profit — a stop-loss hit does
              NOT unlock it. Use "Close Position" on a card to manually release a stalled lock. Empty here is a
              legitimate, honest result, not an error.
            </div>

            {lockedSignals.length === 0 ? (
              <div style={{ textAlign: 'center', color: COLORS.textFaint, padding: 40 }}>
                {strictScanning ? 'Checking every timeframe…' : 'No symbol currently clears every gate on any timeframe.'}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {lockedSignals.map((s) => (
                  <StrictSignalCard key={`${s.symbol}-${s.id || s.timestamp}`} signal={s} onClose={closePosition} />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'analysis' && (
          <div style={{ display: 'grid', gap: 20 }}>
            <MarketAnalysis timeframe={timeframe} />
            <TimeframeAnalysis />
          </div>
        )}
        {activeTab === 'mtf' && <MTFAnalysis timeframe={timeframe} />}
        {activeTab === 'history' && <SignalHistory history={history} />}
        {activeTab === 'performance' && <PerformanceMetrics history={history} />}

        <p style={{ textAlign: 'center', fontSize: 11, color: COLORS.textFaint, marginTop: 30 }}>
          Educational only · Trading involves risk · Use proper risk management
        </p>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppInner />
    </ErrorBoundary>
  )
}
