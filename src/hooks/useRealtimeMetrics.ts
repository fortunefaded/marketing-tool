import { useState, useEffect, useCallback, useRef } from 'react'
import { getWebSocketService, WebSocketService, ConnectionStatus } from '../services/websocketService'

export interface RealtimeMetrics {
  revenue: number
  orders: number
  visitors: number
  conversionRate: number
  averageOrderValue: number
}

export interface UseRealtimeMetricsOptions {
  autoConnect?: boolean
  wsUrl?: string
  channels?: string[]
  filter?: (metrics: Partial<RealtimeMetrics>) => boolean
  onError?: (error: Error) => void
}

export interface UseRealtimeMetricsReturn {
  metrics: RealtimeMetrics
  isConnected: boolean
  status: ConnectionStatus
  lastUpdate: Date | null
  error: Error | null
  setMetrics: (metrics: RealtimeMetrics) => void
  resetMetrics: () => void
  connect: () => Promise<void>
  disconnect: () => void
}

const initialMetrics: RealtimeMetrics = {
  revenue: 0,
  orders: 0,
  visitors: 0,
  conversionRate: 0,
  averageOrderValue: 0,
}

export function useRealtimeMetrics(options: UseRealtimeMetricsOptions = {}): UseRealtimeMetricsReturn {
  const {
    autoConnect = false,
    wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8080',
    channels = ['metrics:revenue', 'metrics:orders', 'metrics:visitors'],
    filter,
    onError,
  } = options

  const [metrics, setMetrics] = useState<RealtimeMetrics>(initialMetrics)
  const [isConnected, setIsConnected] = useState(false)
  const [status, setStatus] = useState<ConnectionStatus>('disconnected')
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [error, setError] = useState<Error | null>(null)
  
  const wsServiceRef = useRef<WebSocketService | null>(null)

  // メトリクスの計算
  const calculateDerivedMetrics = useCallback((baseMetrics: Partial<RealtimeMetrics>): RealtimeMetrics => {
    const revenue = baseMetrics.revenue ?? metrics.revenue
    const orders = baseMetrics.orders ?? metrics.orders
    const visitors = baseMetrics.visitors ?? metrics.visitors
    
    const conversionRate = visitors > 0 ? (orders / visitors) * 100 : 0
    const averageOrderValue = orders > 0 ? revenue / orders : 0
    
    return {
      revenue,
      orders,
      visitors,
      conversionRate: Math.round(conversionRate * 100) / 100,
      averageOrderValue: Math.round(averageOrderValue * 100) / 100,
    }
  }, [metrics])

  // メトリクス更新ハンドラー
  const handleMetricsUpdate = useCallback((data: any) => {
    if (filter && !filter(data)) {
      return
    }
    
    const newMetrics = calculateDerivedMetrics({
      revenue: data.revenue,
      orders: data.orders,
      visitors: data.visitors,
    })
    
    setMetrics(newMetrics)
    setLastUpdate(new Date())
  }, [calculateDerivedMetrics, filter])

  // 増分更新ハンドラー
  const handleMetricsDelta = useCallback((data: any) => {
    setMetrics(current => {
      const updated = {
        revenue: current.revenue + (data.revenue || 0),
        orders: current.orders + (data.orders || 0),
        visitors: current.visitors + (data.visitors || 0),
      }
      
      if (filter && !filter(updated)) {
        return current
      }
      
      return calculateDerivedMetrics(updated)
    })
    setLastUpdate(new Date())
  }, [calculateDerivedMetrics, filter])

  // 接続状態変更ハンドラー
  const handleStatusChange = useCallback((data: { previous: ConnectionStatus; current: ConnectionStatus }) => {
    setStatus(data.current)
    setIsConnected(data.current === 'connected')
  }, [])

  // エラーハンドラー
  const handleError = useCallback((err: Error) => {
    setError(err)
    onError?.(err)
  }, [onError])

  // WebSocket接続
  const connect = useCallback(async () => {
    try {
      if (!wsServiceRef.current) {
        wsServiceRef.current = getWebSocketService(wsUrl)
      }
      
      const ws = wsServiceRef.current
      
      // イベントリスナー登録
      ws.on('metrics:update', handleMetricsUpdate)
      ws.on('metrics:delta', handleMetricsDelta)
      ws.on('status:change', handleStatusChange)
      ws.on('error', handleError)
      
      await ws.connect()
      ws.subscribe(channels)
      
      setError(null)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Connection failed')
      setError(error)
      onError?.(error)
    }
  }, [wsUrl, channels, handleMetricsUpdate, handleMetricsDelta, handleStatusChange, handleError, onError])

  // WebSocket切断
  const disconnect = useCallback(() => {
    if (wsServiceRef.current) {
      const ws = wsServiceRef.current
      
      ws.off('metrics:update', handleMetricsUpdate)
      ws.off('metrics:delta', handleMetricsDelta)
      ws.off('status:change', handleStatusChange)
      ws.off('error', handleError)
      
      ws.unsubscribe(channels)
      ws.disconnect()
    }
  }, [channels, handleMetricsUpdate, handleMetricsDelta, handleStatusChange, handleError])

  // メトリクスリセット
  const resetMetrics = useCallback(() => {
    setMetrics(initialMetrics)
    setLastUpdate(null)
  }, [])

  // 自動接続
  useEffect(() => {
    if (autoConnect) {
      connect()
    }
    
    return () => {
      disconnect()
    }
  }, [autoConnect]) // connectとdisconnectは依存配列に含めない

  return {
    metrics,
    isConnected,
    status,
    lastUpdate,
    error,
    setMetrics,
    resetMetrics,
    connect,
    disconnect,
  }
}