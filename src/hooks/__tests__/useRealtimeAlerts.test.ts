import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useRealtimeAlerts } from '../useRealtimeAlerts'
import { WebSocketService } from '../../services/websocketService'

// WebSocketServiceのモック
vi.mock('../../services/websocketService', () => ({
  getWebSocketService: vi.fn()
}))

describe('useRealtimeAlerts', () => {
  let mockWsService: any

  beforeEach(() => {
    mockWsService = {
      on: vi.fn(),
      off: vi.fn(),
      acknowledgeAlert: vi.fn(),
      isConnected: vi.fn().mockReturnValue(true)
    }

    const { getWebSocketService } = await import('../../services/websocketService')
    vi.mocked(getWebSocketService).mockReturnValue(mockWsService)
  })

  it('初期状態で空のアラート配列を返す', () => {
    const { result } = renderHook(() => useRealtimeAlerts())
    
    expect(result.current.alerts).toEqual([])
    expect(result.current.unreadCount).toBe(0)
  })

  it('新しいアラートを受信できる', async () => {
    let alertCallback: any
    mockWsService.on.mockImplementation((event, callback) => {
      if (event === 'alert') {
        alertCallback = callback
      }
    })

    const { result } = renderHook(() => useRealtimeAlerts())

    const newAlert = {
      id: 'alert-001',
      severity: 'high',
      title: '売上急増',
      message: '過去1時間の売上が通常の200%を超えました',
      timestamp: new Date().toISOString()
    }

    act(() => {
      alertCallback(newAlert)
    })

    expect(result.current.alerts).toHaveLength(1)
    expect(result.current.alerts[0]).toMatchObject({
      ...newAlert,
      acknowledged: false
    })
    expect(result.current.unreadCount).toBe(1)
  })

  it('重複したアラートIDを無視する', () => {
    let alertCallback: any
    mockWsService.on.mockImplementation((event, callback) => {
      if (event === 'alert') {
        alertCallback = callback
      }
    })

    const { result } = renderHook(() => useRealtimeAlerts())

    const alert1 = {
      id: 'alert-001',
      severity: 'high',
      title: 'アラート1',
      message: 'メッセージ1',
      timestamp: new Date().toISOString()
    }

    const alert2 = {
      id: 'alert-001', // 同じID
      severity: 'low',
      title: 'アラート2',
      message: 'メッセージ2',
      timestamp: new Date().toISOString()
    }

    act(() => {
      alertCallback(alert1)
      alertCallback(alert2)
    })

    expect(result.current.alerts).toHaveLength(1)
    expect(result.current.alerts[0].title).toBe('アラート1')
  })

  it('アラートを確認できる', async () => {
    let alertCallback: any
    mockWsService.on.mockImplementation((event, callback) => {
      if (event === 'alert') {
        alertCallback = callback
      }
    })

    const { result } = renderHook(() => useRealtimeAlerts())

    const alert = {
      id: 'alert-001',
      severity: 'high',
      title: 'テストアラート',
      message: 'テストメッセージ',
      timestamp: new Date().toISOString()
    }

    act(() => {
      alertCallback(alert)
    })

    expect(result.current.unreadCount).toBe(1)

    act(() => {
      result.current.acknowledgeAlert('alert-001')
    })

    expect(mockWsService.acknowledgeAlert).toHaveBeenCalledWith('alert-001')
    expect(result.current.alerts[0].acknowledged).toBe(true)
    expect(result.current.unreadCount).toBe(0)
  })

  it('アラートを削除できる', () => {
    let alertCallback: any
    mockWsService.on.mockImplementation((event, callback) => {
      if (event === 'alert') {
        alertCallback = callback
      }
    })

    const { result } = renderHook(() => useRealtimeAlerts())

    const alerts = [
      {
        id: 'alert-001',
        severity: 'high',
        title: 'アラート1',
        message: 'メッセージ1',
        timestamp: new Date().toISOString()
      },
      {
        id: 'alert-002',
        severity: 'medium',
        title: 'アラート2',
        message: 'メッセージ2',
        timestamp: new Date().toISOString()
      }
    ]

    act(() => {
      alerts.forEach(alert => alertCallback(alert))
    })

    expect(result.current.alerts).toHaveLength(2)

    act(() => {
      result.current.dismissAlert('alert-001')
    })

    expect(result.current.alerts).toHaveLength(1)
    expect(result.current.alerts[0].id).toBe('alert-002')
  })

  it('すべてのアラートをクリアできる', () => {
    let alertCallback: any
    mockWsService.on.mockImplementation((event, callback) => {
      if (event === 'alert') {
        alertCallback = callback
      }
    })

    const { result } = renderHook(() => useRealtimeAlerts())

    const alerts = Array.from({ length: 5 }, (_, i) => ({
      id: `alert-${i}`,
      severity: 'medium',
      title: `アラート${i}`,
      message: `メッセージ${i}`,
      timestamp: new Date().toISOString()
    }))

    act(() => {
      alerts.forEach(alert => alertCallback(alert))
    })

    expect(result.current.alerts).toHaveLength(5)

    act(() => {
      result.current.clearAll()
    })

    expect(result.current.alerts).toHaveLength(0)
    expect(result.current.unreadCount).toBe(0)
  })

  it('最大アラート数を超えた場合、古いアラートを削除する', () => {
    let alertCallback: any
    mockWsService.on.mockImplementation((event, callback) => {
      if (event === 'alert') {
        alertCallback = callback
      }
    })

    const { result } = renderHook(() => useRealtimeAlerts({ maxAlerts: 3 }))

    const alerts = Array.from({ length: 5 }, (_, i) => ({
      id: `alert-${i}`,
      severity: 'medium',
      title: `アラート${i}`,
      message: `メッセージ${i}`,
      timestamp: new Date(Date.now() - i * 1000).toISOString() // 古い順
    }))

    act(() => {
      alerts.forEach(alert => alertCallback(alert))
    })

    expect(result.current.alerts).toHaveLength(3)
    // 新しいアラートが残る
    expect(result.current.alerts[0].id).toBe('alert-0')
    expect(result.current.alerts[1].id).toBe('alert-1')
    expect(result.current.alerts[2].id).toBe('alert-2')
  })

  it('重要度でフィルタリングできる', () => {
    let alertCallback: any
    mockWsService.on.mockImplementation((event, callback) => {
      if (event === 'alert') {
        alertCallback = callback
      }
    })

    const { result } = renderHook(() => useRealtimeAlerts({ 
      severityFilter: ['high', 'critical'] 
    }))

    const alerts = [
      {
        id: 'alert-001',
        severity: 'low',
        title: 'Low Alert',
        message: 'Low severity',
        timestamp: new Date().toISOString()
      },
      {
        id: 'alert-002',
        severity: 'high',
        title: 'High Alert',
        message: 'High severity',
        timestamp: new Date().toISOString()
      },
      {
        id: 'alert-003',
        severity: 'critical',
        title: 'Critical Alert',
        message: 'Critical severity',
        timestamp: new Date().toISOString()
      }
    ]

    act(() => {
      alerts.forEach(alert => alertCallback(alert))
    })

    expect(result.current.alerts).toHaveLength(2)
    expect(result.current.alerts.every(a => ['high', 'critical'].includes(a.severity))).toBe(true)
  })

  it('アラート受信時にコールバックを実行する', () => {
    const onNewAlert = vi.fn()
    let alertCallback: any
    mockWsService.on.mockImplementation((event, callback) => {
      if (event === 'alert') {
        alertCallback = callback
      }
    })

    renderHook(() => useRealtimeAlerts({ onNewAlert }))

    const alert = {
      id: 'alert-001',
      severity: 'high',
      title: 'New Alert',
      message: 'Test message',
      timestamp: new Date().toISOString()
    }

    act(() => {
      alertCallback(alert)
    })

    expect(onNewAlert).toHaveBeenCalledWith(expect.objectContaining({
      ...alert,
      acknowledged: false
    }))
  })

  it('音声通知を再生できる', () => {
    const playSound = vi.fn()
    window.Audio = vi.fn().mockImplementation(() => ({
      play: playSound
    }))

    let alertCallback: any
    mockWsService.on.mockImplementation((event, callback) => {
      if (event === 'alert') {
        alertCallback = callback
      }
    })

    renderHook(() => useRealtimeAlerts({ 
      playSound: true,
      soundUrl: '/alert.mp3'
    }))

    const alert = {
      id: 'alert-001',
      severity: 'high',
      title: 'Sound Alert',
      message: 'Should play sound',
      timestamp: new Date().toISOString()
    }

    act(() => {
      alertCallback(alert)
    })

    expect(window.Audio).toHaveBeenCalledWith('/alert.mp3')
    expect(playSound).toHaveBeenCalled()
  })

  it('アンマウント時にクリーンアップされる', () => {
    const { unmount } = renderHook(() => useRealtimeAlerts())

    unmount()

    expect(mockWsService.off).toHaveBeenCalledWith('alert', expect.any(Function))
  })
})