// Thin, reusable WebSocket wrapper: handles connect, reconnect with
// backoff, and routes incoming messages to listeners keyed by req_id.

export class ReconnectingSocket {
  constructor(url) {
    this.url = url
    this.ws = null
    this.isConnected = false
    this.listeners = new Map()
    this.reconnectAttempts = 0
    this.maxReconnectDelay = 15000
    this.shouldReconnect = true
    this.onStatusChange = null
  }

  connect() {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url)

        this.ws.onopen = () => {
          this.isConnected = true
          this.reconnectAttempts = 0
          this._notifyStatus('connected')
          resolve()
        }

        this.ws.onmessage = (event) => {
          let data
          try {
            data = JSON.parse(event.data)
          } catch {
            return
          }
          if (data.req_id && this.listeners.has(data.req_id)) {
            this.listeners.get(data.req_id).forEach((cb) => cb(data))
          }
          if (this.listeners.has('*')) {
            this.listeners.get('*').forEach((cb) => cb(data))
          }
        }

        this.ws.onerror = () => {
          this._notifyStatus('error')
        }

        this.ws.onclose = () => {
          this.isConnected = false
          this._notifyStatus('disconnected')
          if (this.shouldReconnect) this._scheduleReconnect()
        }

        setTimeout(() => {
          if (!this.isConnected) reject(new Error('Connection timeout'))
        }, 15000)
      } catch (err) {
        reject(err)
      }
    })
  }

  _scheduleReconnect() {
    this.reconnectAttempts += 1
    const delay = Math.min(1000 * 2 ** this.reconnectAttempts, this.maxReconnectDelay)
    setTimeout(() => {
      if (this.shouldReconnect && !this.isConnected) {
        this.connect().catch(() => {})
      }
    }, delay)
  }

  _notifyStatus(status) {
    if (typeof this.onStatusChange === 'function') this.onStatusChange(status)
  }

  send(payload) {
    if (this.ws && this.isConnected) {
      this.ws.send(JSON.stringify(payload))
      return true
    }
    return false
  }

  addListener(key, cb) {
    if (!this.listeners.has(key)) this.listeners.set(key, [])
    this.listeners.get(key).push(cb)
  }

  removeListener(key, cb) {
    const arr = this.listeners.get(key)
    if (arr) this.listeners.set(key, arr.filter((f) => f !== cb))
  }

  disconnect() {
    this.shouldReconnect = false
    if (this.ws) this.ws.close()
    this.isConnected = false
  }
}
