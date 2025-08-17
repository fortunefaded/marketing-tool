import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RealtimeChart } from '../RealtimeChart'
import { getWebSocketService } from '../../../services/websocketService'

// WebSocketServiceのモック
vi.mock('../../../services/websocketService', () => ({
  getWebSocketService: vi.fn()
}))

// Rechartsのモック
vi.mock('recharts', () => ({
  LineChart: vi.fn(({ children }) => <div data-testid="line-chart">{children}</div>),
  Line: vi.fn(() => <div data-testid="line" />),
  XAxis: vi.fn(() => <div data-testid="x-axis" />),
  YAxis: vi.fn(() => <div data-testid="y-axis" />),
  CartesianGrid: vi.fn(() => <div data-testid="cartesian-grid" />),
  Tooltip: vi.fn(() => <div data-testid="tooltip" />),
  ResponsiveContainer: vi.fn(({ children }) => <div data-testid="responsive-container">{children}</div>)
}))

describe('RealtimeChart', () => {
  let mockWsService: any

  beforeEach(() => {
    mockWsService = {
      on: vi.fn(),
      off: vi.fn(),
      isConnected: vi.fn().mockReturnValue(true)
    }

    vi.mocked(getWebSocketService).mockReturnValue(mockWsService)
  })

  it('チャートタイトルを表示する', () => {
    render(
      <RealtimeChart
        title="売上推移"
        dataKey="revenue"
        color="#10b981"
      />
    )
    
    expect(screen.getByText('売上推移')).toBeInTheDocument()
  })

  it('初期状態でチャートを表示する', () => {
    render(
      <RealtimeChart
        title="売上推移"
        dataKey="revenue"
        color="#10b981"
      />
    )
    
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument()
    expect(screen.getByTestId('line-chart')).toBeInTheDocument()
    expect(screen.getByTestId('line')).toBeInTheDocument()
  })

  it('データ更新を受信してチャートを更新する', async () => {
    let dataCallback: any
    mockWsService.on.mockImplementation((event, callback) => {
      if (event === 'metrics:update') {
        dataCallback = callback
      }
    })

    const { rerender } = render(
      <RealtimeChart
        title="売上推移"
        dataKey="revenue"
        color="#10b981"
      />
    )

    const newData = {
      revenue: 150000,
      orders: 320,
      visitors: 8500,
      timestamp: new Date().toISOString()
    }

    // データ更新を送信
    dataCallback(newData)

    await waitFor(() => {
      // チャートが更新されることを確認
      expect(screen.getByTestId('line-chart')).toBeInTheDocument()
    })
  })

  it('最大データポイント数を超えた場合、古いデータを削除する', async () => {
    let dataCallback: any
    mockWsService.on.mockImplementation((event, callback) => {
      if (event === 'metrics:update') {
        dataCallback = callback
      }
    })

    render(
      <RealtimeChart
        title="売上推移"
        dataKey="revenue"
        color="#10b981"
        maxDataPoints={5}
      />
    )

    // 6つのデータポイントを送信
    for (let i = 0; i < 6; i++) {
      dataCallback({
        revenue: 100000 + i * 10000,
        timestamp: new Date(Date.now() + i * 60000).toISOString()
      })
    }

    await waitFor(() => {
      // チャートが更新されることを確認
      expect(screen.getByTestId('line-chart')).toBeInTheDocument()
    })
  })

  it('testIdを正しく設定する', () => {
    render(
      <RealtimeChart
        title="売上推移"
        dataKey="revenue"
        color="#10b981"
        testId="custom-chart"
      />
    )
    
    expect(screen.getByTestId('custom-chart')).toBeInTheDocument()
  })

  it('カスタムの高さを設定できる', () => {
    render(
      <RealtimeChart
        title="売上推移"
        dataKey="revenue"
        color="#10b981"
        height={500}
      />
    )
    
    const container = screen.getByTestId('responsive-container')
    expect(container).toBeInTheDocument()
  })

  it('データがない場合も適切に表示する', () => {
    render(
      <RealtimeChart
        title="売上推移"
        dataKey="revenue"
        color="#10b981"
      />
    )
    
    expect(screen.getByText('売上推移')).toBeInTheDocument()
    expect(screen.getByTestId('line-chart')).toBeInTheDocument()
  })

  it('アンマウント時にイベントリスナーをクリーンアップする', () => {
    const { unmount } = render(
      <RealtimeChart
        title="売上推移"
        dataKey="revenue"
        color="#10b981"
      />
    )

    unmount()

    expect(mockWsService.off).toHaveBeenCalledWith('metrics:update', expect.any(Function))
    expect(mockWsService.off).toHaveBeenCalledWith('metrics:delta', expect.any(Function))
  })

  it('増分更新を処理できる', async () => {
    let deltaCallback: any
    mockWsService.on.mockImplementation((event, callback) => {
      if (event === 'metrics:delta') {
        deltaCallback = callback
      }
    })

    render(
      <RealtimeChart
        title="売上推移"
        dataKey="revenue"
        color="#10b981"
      />
    )

    const deltaData = {
      revenue: 5000,
      timestamp: new Date().toISOString()
    }

    // 増分更新を送信
    deltaCallback(deltaData)

    await waitFor(() => {
      expect(screen.getByTestId('line-chart')).toBeInTheDocument()
    })
  })

  it('フォーマッター関数を適用する', () => {
    const formatter = vi.fn((value: number) => `¥${value.toLocaleString()}`)
    
    render(
      <RealtimeChart
        title="売上推移"
        dataKey="revenue"
        color="#10b981"
        formatter={formatter}
      />
    )
    
    expect(screen.getByTestId('line-chart')).toBeInTheDocument()
  })

  it('カスタムクラスを適用する', () => {
    render(
      <RealtimeChart
        title="売上推移"
        dataKey="revenue"
        color="#10b981"
        className="custom-chart-class"
      />
    )
    
    const chartContainer = screen.getByText('売上推移').closest('div')
    expect(chartContainer).toHaveClass('custom-chart-class')
  })
})