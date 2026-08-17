import React, { useRef, useEffect } from 'react'
import { calculateEMA } from '../indicators/ema.js'

// Lightweight canvas-based candlestick renderer. Avoids pulling in a
// heavy charting library — this is a PWA on a mobile connection, and a
// simple canvas draw is enough to give visual context for a signal.
export default function TradingView({ candles, height = 220 }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    if (!candles || candles.length < 2) return
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    const width = canvas.clientWidth
    canvas.width = width * window.devicePixelRatio
    canvas.height = height * window.devicePixelRatio
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    ctx.clearRect(0, 0, width, height)

    const visible = candles.slice(-80)
    const highs = visible.map((c) => c.high)
    const lows = visible.map((c) => c.low)
    const closes = visible.map((c) => c.close)
    const maxPrice = Math.max(...highs)
    const minPrice = Math.min(...lows)
    const range = maxPrice - minPrice || 1

    const padding = 8
    const candleWidth = (width - padding * 2) / visible.length
    const toY = (price) => padding + (1 - (price - minPrice) / range) * (height - padding * 2)

    // Draw candles
    visible.forEach((c, i) => {
      const x = padding + i * candleWidth
      const isUp = c.close >= c.open
      ctx.strokeStyle = isUp ? '#10b981' : '#ef4444'
      ctx.fillStyle = isUp ? '#10b981' : '#ef4444'

      ctx.beginPath()
      ctx.moveTo(x + candleWidth / 2, toY(c.high))
      ctx.lineTo(x + candleWidth / 2, toY(c.low))
      ctx.stroke()

      const bodyTop = toY(Math.max(c.open, c.close))
      const bodyBottom = toY(Math.min(c.open, c.close))
      ctx.fillRect(x + 1, bodyTop, Math.max(candleWidth - 2, 1), Math.max(bodyBottom - bodyTop, 1))
    })

    // EMA20 overlay
    if (closes.length >= 20) {
      const ema20 = calculateEMA(closes, 20)
      ctx.strokeStyle = '#60a5fa'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ema20.forEach((v, i) => {
        const x = padding + i * candleWidth + candleWidth / 2
        const y = toY(v)
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      })
      ctx.stroke()
    }
  }, [candles, height])

  if (!candles || candles.length < 2) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: 12 }}>
        No chart data
      </div>
    )
  }

  return <canvas ref={canvasRef} style={{ width: '100%', height, display: 'block' }} />
}
