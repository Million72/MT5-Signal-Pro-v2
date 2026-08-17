import { useState, useEffect, useCallback } from 'react'
import { derivService } from '../services/deriv.js'

export function useMarketData() {
  const [connectionStatus, setConnectionStatus] = useState('disconnected')

  useEffect(() => {
    derivService.onStatusChange((status) => setConnectionStatus(status))

    setConnectionStatus('connecting')
    derivService.connect()
      .then(() => setConnectionStatus('connected'))
      .catch(() => setConnectionStatus('error'))

    return () => derivService.disconnect()
  }, [])

  const reconnect = useCallback(async () => {
    setConnectionStatus('connecting')
    try {
      await derivService.connect()
      setConnectionStatus('connected')
    } catch {
      setConnectionStatus('error')
    }
  }, [])

  return {
    connectionStatus,
    isConnected: connectionStatus === 'connected',
    reconnect
  }
}
