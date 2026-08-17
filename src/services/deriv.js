import { ReconnectingSocket } from './websocket.js'
import { GRANULARITY_MAP } from '../constants/timeframes.js'
import { toDerivSymbol } from '../constants/markets.js'
import { sleep } from '../utils/helpers.js'

// Endpoint confirmed WORKING via live testing (not just docs) — the
// "Legacy API retired" messaging found in Deriv's docs evidently
// applies to authenticated trading/options endpoints, not this basic
// public ticks_history market-data call, which is still live on v3.
const DERIV_APP_ID = 1089
const DERIV_WS_URL = `wss://ws.binaryws.com/websockets/v3?app_id=${DERIV_APP_ID}`

const MAX_RETRIES = 3
const RETRY_BASE_DELAY_MS = 1000

class DerivService {
  constructor() {
    // A persistent connection is kept ONLY to show accurate "Connected/
    // Disconnected" status in the UI. Actual data requests below use
    // their own fresh one-shot WebSocket each — see _fetchOnce.
    this.socket = new ReconnectingSocket(DERIV_WS_URL)
  }

  get isConnected() {
    return this.socket.isConnected
  }

  onStatusChange(cb) {
    this.socket.onStatusChange = cb
  }

  async connect() {
    if (this.isConnected) return
    await this.socket.connect()
  }

  disconnect() {
    this.socket.disconnect()
  }

  /**
   * Opens a brand-new WebSocket for a single request, resolves on the
   * first message received, then closes it. No req_id/echo_req
   * matching needed at all — since exactly one request is ever sent
   * per socket, whatever comes back IS the answer to it. This avoids
   * an entire class of response-routing bugs that a shared, multiplexed
   * connection is exposed to.
   */
  _fetchOnce(payload, timeoutMs = 12000) {
    return new Promise((resolve) => {
      let settled = false
      let ws
      const timer = setTimeout(() => {
        if (settled) return
        settled = true
        try { ws && ws.close() } catch { /* noop */ }
        resolve({ data: null, error: 'timeout' })
      }, timeoutMs)

      try {
        ws = new WebSocket(DERIV_WS_URL)
      } catch (err) {
        clearTimeout(timer)
        resolve({ data: null, error: err.message })
        return
      }

      ws.onopen = () => {
        ws.send(JSON.stringify(payload))
      }

      ws.onmessage = (event) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        try { ws.close() } catch { /* noop */ }

        let data
        try {
          data = JSON.parse(event.data)
        } catch (err) {
          resolve({ data: null, error: 'parse_error' })
          return
        }

        if (data.error) {
          resolve({ data: null, error: data.error.message })
          return
        }

        resolve({ data, error: null })
      }

      ws.onerror = () => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        resolve({ data: null, error: 'ws_error' })
      }
    })
  }

  /**
   * Fetch closed candles for a display symbol (e.g. 'VOL10').
   * Translates to the real Deriv symbol internally, drops any trailing
   * candle(s) that haven't fully closed yet (time-based check, not
   * just "always drop the last array element" — more robust against
   * a Deriv response that's already fully closed), and retries with
   * backoff on failure.
   */
  async getCandles(displaySymbol, timeframe, count = 150) {
    const derivSymbol = toDerivSymbol(displaySymbol)
    const granularity = GRANULARITY_MAP[timeframe] || 60

    let lastError = 'unknown'

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const { data, error } = await this._fetchOnce({
        ticks_history: derivSymbol,
        adjust_start_time: 1,
        count: count + 5, // small buffer; trimmed precisely by time below
        end: 'latest',
        style: 'candles',
        granularity
      })

      if (error) {
        lastError = error
        console.error(`Deriv error for ${displaySymbol} (${derivSymbol}):`, error)
      } else if (!data.candles || data.candles.length === 0) {
        lastError = 'no_data'
      } else {
        const nowSeconds = Date.now() / 1000
        let candles = data.candles.map((c) => ({
          open: parseFloat(c.open),
          high: parseFloat(c.high),
          low: parseFloat(c.low),
          close: parseFloat(c.close),
          time: parseInt(c.epoch, 10) * 1000,
          epoch: parseInt(c.epoch, 10)
        }))

        // Drop any trailing candle(s) that haven't fully closed yet —
        // a candle is only "closed" once real time has passed its full
        // duration (epoch + granularity <= now). This is the anti-
        // repaint fix: analyzing a still-forming candle produces a
        // signal that can silently flip as price moves within the bar.
        while (candles.length > 0 && candles[candles.length - 1].epoch + granularity > nowSeconds) {
          candles.pop()
        }

        if (candles.length > count) {
          candles = candles.slice(candles.length - count)
        }

        if (candles.length < 60) {
          lastError = 'insufficient_closed_candles'
        } else {
          return {
            candles: candles.map(({ open, high, low, close, time }) => ({ open, high, low, close, time })),
            error: null
          }
        }
      }

      if (attempt < MAX_RETRIES) {
        const jitter = Math.random() * 300
        await sleep(RETRY_BASE_DELAY_MS * (attempt + 1) + jitter)
      }
    }

    return { candles: [], error: lastError }
  }

  /**
   * Fetch the current spot price for a display symbol via a single tick.
   */
  async getCurrentPrice(displaySymbol) {
    const derivSymbol = toDerivSymbol(displaySymbol)
    const { data, error } = await this._fetchOnce({ ticks: derivSymbol, subscribe: 0 }, 8000)

    if (error || !data || !data.tick) return null
    return parseFloat(data.tick.quote)
  }
}

export const derivService = new DerivService()
