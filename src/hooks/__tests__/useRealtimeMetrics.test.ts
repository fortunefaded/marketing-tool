import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useRealtimeMetrics } from '../useRealtimeMetrics'
import { WebSocketService } from '../../services/websocketService'

// WebSocketServiceのモック
vi.mock('../../services/websocketService', () => ({
  WebSocketService: vi.fn(),
  getWebSocketService: vi.fn()
}))

describe('useRealtimeMetrics', () => {
  let mockWsService: any
  
  beforeEach(() => {
    // WebSocketServiceのモックインスタンス
    mockWsService = {
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn(),
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      isConnected: vi.fn().mockReturnValue(false),
      getConnectionStatus: vi.fn().mockReturnValue('disconnected')
    }
    
    // getWebSocketServiceがモックインスタンスを返すように設定
    const { getWebSocketService } = await import('../../services/websocketService')
    vi.mocked(getWebSocketService).mockReturnValue(mockWsService)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('初期状態が正しく設定される', () => {
    const { result } = renderHook(() => useRealtimeMetrics())
    
    expect(result.current.metrics).toEqual({
      revenue: 0,
      orders: 0,
      visitors: 0,
      conversionRate: 0,
      averageOrderValue: 0
    })
    expect(result.current.isConnected).toBe(false)
    expect(result.current.status).toBe('disconnected')
    expect(result.current.lastUpdate).toBeNull()
  })

  it('WebSocketに接続できる', async () => {
    mockWsService.isConnected.mockReturnValue(true)
    mockWsService.getConnectionStatus.mockReturnValue('connected')
    
    const { result } = renderHook(() => useRealtimeMetrics({ autoConnect: true }))
    
    await waitFor(() => {
      expect(mockWsService.connect).toHaveBeenCalled()
      expect(mockWsService.subscribe).toHaveBeenCalledWith([
        'metrics:revenue',
        'metrics:orders',
        'metrics:visitors'
      ])
    })
    
    expect(result.current.isConnected).toBe(true)
    expect(result.current.status).toBe('connected')
  })

  it('メトリクス更新を受信して処理できる', async () => {
    let metricsUpdateCallback: any
    mockWsService.on.mockImplementation((event, callback) => {
      if (event === 'metrics:update') {
        metricsUpdateCallback = callback
      }
    })
    
    const { result } = renderHook(() => useRealtimeMetrics({ autoConnect: true }))
    
    await waitFor(() => {
      expect(mockWsService.connect).toHaveBeenCalled()
    })
    
    // メトリクス更新をシミュレート
    const updateData = {
      revenue: 100000,
      orders: 250,
      visitors: 5000,
      timestamp: new Date().toISOString()
    }
    
    act(() => {
      metricsUpdateCallback(updateData)
    })
    
    expect(result.current.metrics).toEqual({
      revenue: 100000,
      orders: 250,
      visitors: 5000,
      conversionRate: 5.0, // (250 / 5000) * 100
      averageOrderValue: 400 // 100000 / 250
    })
    expect(result.current.lastUpdate).toBeDefined()
  })

  it('増分更新を処理できる', async () => {
    let deltaCallback: any
    mockWsService.on.mockImplementation((event, callback) => {
      if (event === 'metrics:delta') {
        deltaCallback = callback
      }
    })
    
    const { result } = renderHook(() => useRealtimeMetrics({ autoConnect: true }))
    
    // 初期値を設定
    act(() => {
      result.current.setMetrics({
        revenue: 50000,
        orders: 100,
        visitors: 2000,
        conversionRate: 5.0,
        averageOrderValue: 500
      })
    })
    
    // 増分更新をシミュレート
    act(() => {
      deltaCallback({
        revenue: 5000,
        orders: 10,
        visitors: 200
      })
    })
    
    expect(result.current.metrics.revenue).toBe(55000)
    expect(result.current.metrics.orders).toBe(110)
    expect(result.current.metrics.visitors).toBe(2200)
  })

  it('手動でメトリクスをリセットできる', () => {
    const { result } = renderHook(() => useRealtimeMetrics())
    
    // メトリクスを設定
    act(() => {
      result.current.setMetrics({
        revenue: 100000,
        orders: 200,
        visitors: 4000,
        conversionRate: 5.0,
        averageOrderValue: 500
      })
    })
    
    // リセット
    act(() => {
      result.current.resetMetrics()
    })
    
    expect(result.current.metrics).toEqual({
      revenue: 0,
      orders: 0,
      visitors: 0,
      conversionRate: 0,
      averageOrderValue: 0
    })
  })

  it('接続状態の変更を検知できる', async () => {
    let statusChangeCallback: any
    mockWsService.on.mockImplementation((event, callback) => {
      if (event === 'status:change') {
        statusChangeCallback = callback
      }
    })
    
    const { result } = renderHook(() => useRealtimeMetrics({ autoConnect: true }))
    
    // 接続状態の変更をシミュレート
    act(() => {
      statusChangeCallback({ previous: 'disconnected', current: 'connecting' })
    })
    
    expect(result.current.status).toBe('connecting')
    
    act(() => {
      statusChangeCallback({ previous: 'connecting', current: 'connected' })
    })
    
    expect(result.current.status).toBe('connected')
    expect(result.current.isConnected).toBe(true)
  })

  it('アンマウント時に切断される', () => {
    const { unmount } = renderHook(() => useRealtimeMetrics({ autoConnect: true }))
    
    unmount()
    
    expect(mockWsService.off).toHaveBeenCalled()
    expect(mockWsService.unsubscribe).toHaveBeenCalled()
  })

  it('カスタムチャンネルを購読できる', async () => {
    const { result } = renderHook(() => useRealtimeMetrics({
      autoConnect: true,
      channels: ['custom:metric1', 'custom:metric2']
    }))
    
    await waitFor(() => {
      expect(mockWsService.subscribe).toHaveBeenCalledWith([
        'custom:metric1',
        'custom:metric2'
      ])
    })
  })

  it('メトリクスのフィルタリングができる', async () => {
    let metricsUpdateCallback: any
    mockWsService.on.mockImplementation((event, callback) => {
      if (event === 'metrics:update') {
        metricsUpdateCallback = callback
      }
    })
    
    const { result } = renderHook(() => useRealtimeMetrics({
      autoConnect: true,
      filter: (metrics) => metrics.revenue > 50000
    }))
    
    await waitFor(() => {
      expect(mockWsService.connect).toHaveBeenCalled()
    })
    
    // フィルタに通らない更新
    act(() => {
      metricsUpdateCallback({
        revenue: 30000,
        orders: 100,
        visitors: 2000
      })
    })
    
    expect(result.current.metrics.revenue).toBe(0)
    
    // フィルタに通る更新
    act(() => {
      metricsUpdateCallback({
        revenue: 60000,
        orders: 150,
        visitors: 3000
      })
    })
    
    expect(result.current.metrics.revenue).toBe(60000)
  })

  it('エラーハンドリングができる', async () => {
    const onError = vi.fn()
    mockWsService.connect.mockRejectedValue(new Error('Connection failed'))
    
    const { result } = renderHook(() => useRealtimeMetrics({
      autoConnect: true,
      onError
    }))
    
    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(expect.any(Error))
      expect(result.current.error).toBeDefined()
      expect(result.current.error?.message).toBe('Connection failed')
    })
  })
})