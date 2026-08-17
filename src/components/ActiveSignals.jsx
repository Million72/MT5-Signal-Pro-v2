import React from 'react'
import SignalCard from './SignalCard.jsx'
import { COLORS } from '../constants/colors.js'

export default function ActiveSignals({ signals, category, statusFilter }) {
  const filtered = signals.filter((s) => {
    const catMatch = category === 'forex' ? s.market === 'forex' : s.market !== 'forex'
    const statusMatch = statusFilter === 'ALL' || s.status === statusFilter
    return catMatch && statusMatch
  })

  if (filtered.length === 0) {
    return (
      <div style={{ textAlign: 'center', color: COLORS.textFaint, padding: 40 }}>
        No markets match the current filter.
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {filtered.map((signal) => (
        <SignalCard key={signal.id} signal={signal} />
      ))}
    </div>
  )
}
