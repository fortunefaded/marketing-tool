import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RealtimeDashboard } from '../RealtimeDashboard'
import { BrowserRouter } from 'react-router-dom'

// フックのモック
vi.mock('../../hooks/useRealtimeMetrics', () => ({
  useRealtimeMetrics: vi.fn(() => ({
    metrics: {
      revenue: 150000,
      orders: 320,
      visitors: 8500,
      conversionRate: 3.76,
      averageOrderValue: 468.75
    },
    isConnected: true,
    status: 'connected',
    lastUpdate: new Date('2024-01-20T10:30:00'),
    error: null,
    connect: vi.fn(),
    disconnect: vi.fn(),
    resetMetrics: vi.fn()
  }))
}))

vi.mock('../../hooks/useRealtimeAlerts', () => ({
  useRealtimeAlerts: vi.fn(() => ({
    alerts: [
      {
        id: 'alert-001',
        severity: 'high',
        title: '売上急増',
        message: '過去1時間の売上が通常の200%を超えました',
        timestamp: new Date('2024-01-20T10:15:00'),
        acknowledged: false
      }
    ],
    unreadCount: 1,
    acknowledgeAlert: vi.fn(),
    dismissAlert: vi.fn(),
    clearAll: vi.fn()
  }))
}))

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  )
}

describe('RealtimeDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('ダッシュボードが表示される', () => {
    renderWithRouter(<RealtimeDashboard />)
    
    expect(screen.getByText('リアルタイムダッシュボード')).toBeInTheDocument()
    expect(screen.getByText('ライブデータ監視と即時アラート')).toBeInTheDocument()
  })

  it('接続状態が表示される', () => {
    renderWithRouter(<RealtimeDashboard />)
    
    const statusIndicator = screen.getByTestId('connection-status')
    expect(statusIndicator).toHaveClass('bg-green-500')
    expect(screen.getByText('接続中')).toBeInTheDocument()
  })

  it('リアルタイムメトリクスが表示される', () => {
    renderWithRouter(<RealtimeDashboard />)
    
    // 売上
    expect(screen.getByText('¥150,000')).toBeInTheDocument()
    expect(screen.getByText('売上')).toBeInTheDocument()
    
    // 注文数
    expect(screen.getByText('320')).toBeInTheDocument()
    expect(screen.getByText('注文数')).toBeInTheDocument()
    
    // 訪問者数
    expect(screen.getByText('8,500')).toBeInTheDocument()
    expect(screen.getByText('訪問者数')).toBeInTheDocument()
    
    // コンバージョン率
    expect(screen.getByText('3.76%')).toBeInTheDocument()
    expect(screen.getByText('コンバージョン率')).toBeInTheDocument()
    
    // 平均注文額
    expect(screen.getByText('¥469')).toBeInTheDocument()
    expect(screen.getByText('平均注文額')).toBeInTheDocument()
  })

  it('最終更新時刻が表示される', () => {
    renderWithRouter(<RealtimeDashboard />)
    
    expect(screen.getByText(/最終更新: 2024\/01\/20 10:30/)).toBeInTheDocument()
  })

  it('アラートが表示される', () => {
    renderWithRouter(<RealtimeDashboard />)
    
    expect(screen.getByText('売上急増')).toBeInTheDocument()
    expect(screen.getByText('過去1時間の売上が通常の200%を超えました')).toBeInTheDocument()
    
    const alertBadge = screen.getByTestId('alert-badge')
    expect(alertBadge).toHaveTextContent('1')
  })

  it('アラートを確認できる', async () => {
    const { useRealtimeAlerts } = await import('../../hooks/useRealtimeAlerts')
    const mockAcknowledge = vi.fn()
    vi.mocked(useRealtimeAlerts).mockReturnValue({
      alerts: [{
        id: 'alert-001',
        severity: 'high',
        title: '売上急増',
        message: '過去1時間の売上が通常の200%を超えました',
        timestamp: new Date('2024-01-20T10:15:00'),
        acknowledged: false
      }],
      unreadCount: 1,
      acknowledgeAlert: mockAcknowledge,
      dismissAlert: vi.fn(),
      clearAll: vi.fn()
    })
    
    renderWithRouter(<RealtimeDashboard />)
    
    const acknowledgeButton = screen.getByText('確認')
    fireEvent.click(acknowledgeButton)
    
    expect(mockAcknowledge).toHaveBeenCalledWith('alert-001')
  })

  it('切断状態が表示される', async () => {
    const { useRealtimeMetrics } = await import('../../hooks/useRealtimeMetrics')
    vi.mocked(useRealtimeMetrics).mockReturnValue({
      metrics: {
        revenue: 0,
        orders: 0,
        visitors: 0,
        conversionRate: 0,
        averageOrderValue: 0
      },
      isConnected: false,
      status: 'disconnected',
      lastUpdate: null,
      error: null,
      connect: vi.fn(),
      disconnect: vi.fn(),
      resetMetrics: vi.fn()
    })
    
    renderWithRouter(<RealtimeDashboard />)
    
    const statusIndicator = screen.getByTestId('connection-status')
    expect(statusIndicator).toHaveClass('bg-gray-500')
    expect(screen.getByText('切断中')).toBeInTheDocument()
    
    // 再接続ボタンが表示される
    expect(screen.getByText('再接続')).toBeInTheDocument()
  })

  it('再接続ボタンが機能する', async () => {
    const { useRealtimeMetrics } = await import('../../hooks/useRealtimeMetrics')
    const mockConnect = vi.fn()
    vi.mocked(useRealtimeMetrics).mockReturnValue({
      metrics: initialMetrics(),
      isConnected: false,
      status: 'disconnected',
      lastUpdate: null,
      error: null,
      connect: mockConnect,
      disconnect: vi.fn(),
      resetMetrics: vi.fn()
    })
    
    renderWithRouter(<RealtimeDashboard />)
    
    const reconnectButton = screen.getByText('再接続')
    fireEvent.click(reconnectButton)
    
    expect(mockConnect).toHaveBeenCalled()
  })

  it('エラー状態が表示される', async () => {
    const { useRealtimeMetrics } = await import('../../hooks/useRealtimeMetrics')
    vi.mocked(useRealtimeMetrics).mockReturnValue({
      metrics: initialMetrics(),
      isConnected: false,
      status: 'error',
      lastUpdate: null,
      error: new Error('Connection failed'),
      connect: vi.fn(),
      disconnect: vi.fn(),
      resetMetrics: vi.fn()
    })
    
    renderWithRouter(<RealtimeDashboard />)
    
    expect(screen.getByText('接続エラー')).toBeInTheDocument()
    expect(screen.getByText('Connection failed')).toBeInTheDocument()
  })

  it('リアルタイムチャートが表示される', () => {
    renderWithRouter(<RealtimeDashboard />)
    
    expect(screen.getByTestId('realtime-revenue-chart')).toBeInTheDocument()
    expect(screen.getByTestId('realtime-orders-chart')).toBeInTheDocument()
    expect(screen.getByTestId('realtime-visitors-chart')).toBeInTheDocument()
  })

  it('全画面モードに切り替えできる', () => {
    renderWithRouter(<RealtimeDashboard />)
    
    const fullscreenButton = screen.getByLabelText('全画面表示')
    fireEvent.click(fullscreenButton)
    
    const dashboard = screen.getByTestId('realtime-dashboard')
    expect(dashboard).toHaveClass('fullscreen')
  })

  it('自動更新の設定ができる', () => {
    renderWithRouter(<RealtimeDashboard />)
    
    const autoRefreshToggle = screen.getByLabelText('自動更新')
    expect(autoRefreshToggle).toBeChecked()
    
    fireEvent.click(autoRefreshToggle)
    expect(autoRefreshToggle).not.toBeChecked()
  })

  it('メトリクスをリセットできる', async () => {
    const { useRealtimeMetrics } = await import('../../hooks/useRealtimeMetrics')
    const mockReset = vi.fn()
    vi.mocked(useRealtimeMetrics).mockReturnValue({
      metrics: {
        revenue: 150000,
        orders: 320,
        visitors: 8500,
        conversionRate: 3.76,
        averageOrderValue: 468.75
      },
      isConnected: true,
      status: 'connected',
      lastUpdate: new Date(),
      error: null,
      connect: vi.fn(),
      disconnect: vi.fn(),
      resetMetrics: mockReset
    })
    
    renderWithRouter(<RealtimeDashboard />)
    
    const resetButton = screen.getByText('リセット')
    fireEvent.click(resetButton)
    
    // 確認ダイアログが表示される
    expect(screen.getByText('メトリクスをリセットしますか？')).toBeInTheDocument()
    
    const confirmButton = screen.getByText('確認')
    fireEvent.click(confirmButton)
    
    expect(mockReset).toHaveBeenCalled()
  })

  it('アラート音の設定ができる', () => {
    renderWithRouter(<RealtimeDashboard />)
    
    const soundToggle = screen.getByLabelText('アラート音')
    expect(soundToggle).toBeChecked()
    
    fireEvent.click(soundToggle)
    expect(soundToggle).not.toBeChecked()
  })

  it('重要度別にアラートがフィルタリングできる', () => {
    renderWithRouter(<RealtimeDashboard />)
    
    const filterSelect = screen.getByLabelText('アラートフィルター')
    fireEvent.change(filterSelect, { target: { value: 'high' } })
    
    // high以上のアラートのみ表示される
    expect(screen.getByText('売上急増')).toBeInTheDocument()
  })
})

function initialMetrics() {
  return {
    revenue: 0,
    orders: 0,
    visitors: 0,
    conversionRate: 0,
    averageOrderValue: 0
  }
}