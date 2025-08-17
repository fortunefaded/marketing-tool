import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { DrillDownAnalysis } from '../DrillDownAnalysis'
import { ECForceOrder } from '../../../types/ecforce'

const createMockOrder = (overrides: Partial<ECForceOrder>): ECForceOrder => ({
  受注ID: 'TEST-001',
  受注番号: 'ORDER-001',
  受注日: '2024-01-01 10:00:00',
  顧客番号: 'CUST-001',
  メールアドレス: 'test@example.com',
  購入商品: ['商品A'],
  購入オファー: 'オファー1',
  広告主名: '広告主A',
  ランディングページ: 'LP1',
  購入URL: 'https://example.com',
  小計: 1000,
  支払い合計: 1000,
  定期受注番号: '',
  広告URLグループ名: '',
  顧客購入回数: 1,
  定期ステータス: '無効',
  定期回数: 0,
  ...overrides
})

describe('DrillDownAnalysis', () => {
  const mockOrders: ECForceOrder[] = [
    createMockOrder({ 
      受注ID: '1',
      受注日: '2024-01-01',
      広告主名: '広告主A',
      購入商品: ['商品X'],
      小計: 10000
    }),
    createMockOrder({ 
      受注ID: '2',
      受注日: '2024-01-01',
      広告主名: '広告主A',
      購入商品: ['商品Y'],
      小計: 15000
    }),
    createMockOrder({ 
      受注ID: '3',
      受注日: '2024-01-02',
      広告主名: '広告主B',
      購入商品: ['商品X'],
      小計: 8000
    }),
    createMockOrder({ 
      受注ID: '4',
      受注日: '2024-01-02',
      広告主名: '広告主B',
      購入商品: ['商品Z'],
      小計: 12000
    })
  ]

  it('初期状態で概要レベルのデータが表示される', () => {
    render(<DrillDownAnalysis orders={mockOrders} />)
    
    expect(screen.getByText('ドリルダウン分析')).toBeInTheDocument()
    expect(screen.getByText('広告主A')).toBeInTheDocument()
    expect(screen.getByText('広告主B')).toBeInTheDocument()
    
    // 合計が表示される
    expect(screen.getByText('¥25,000')).toBeInTheDocument() // 広告主A
    expect(screen.getByText('¥20,000')).toBeInTheDocument() // 広告主B
  })

  it('広告主をクリックすると商品レベルにドリルダウンできる', async () => {
    render(<DrillDownAnalysis orders={mockOrders} />)
    
    const advertiserA = screen.getByText('広告主A')
    fireEvent.click(advertiserA)
    
    await waitFor(() => {
      expect(screen.getByText('広告主A > 商品別売上')).toBeInTheDocument()
      expect(screen.getByText('商品X')).toBeInTheDocument()
      expect(screen.getByText('商品Y')).toBeInTheDocument()
      expect(screen.getByText('¥10,000')).toBeInTheDocument()
      expect(screen.getByText('¥15,000')).toBeInTheDocument()
    })
  })

  it('商品をクリックすると日別詳細にドリルダウンできる', async () => {
    render(<DrillDownAnalysis orders={mockOrders} />)
    
    // 広告主をクリック
    fireEvent.click(screen.getByText('広告主A'))
    
    await waitFor(() => {
      // 商品をクリック
      const productX = screen.getByText('商品X')
      fireEvent.click(productX)
    })
    
    await waitFor(() => {
      expect(screen.getByText('広告主A > 商品X > 日別売上')).toBeInTheDocument()
      expect(screen.getByText('2024-01-01')).toBeInTheDocument()
    })
  })

  it('パンくずナビゲーションで前のレベルに戻れる', async () => {
    render(<DrillDownAnalysis orders={mockOrders} />)
    
    // 広告主 > 商品までドリルダウン
    fireEvent.click(screen.getByText('広告主A'))
    await waitFor(() => {
      fireEvent.click(screen.getByText('商品X'))
    })
    
    // パンくずの「広告主A」をクリック
    await waitFor(() => {
      const breadcrumb = screen.getByTestId('breadcrumb-advertiser')
      fireEvent.click(breadcrumb)
    })
    
    // 商品レベルに戻る
    expect(screen.getByText('広告主A > 商品別売上')).toBeInTheDocument()
  })

  it('ドリルダウンレベルに応じて異なるグラフが表示される', () => {
    render(<DrillDownAnalysis orders={mockOrders} />)
    
    // レベル1: 円グラフ
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument()
    
    // 広告主をクリック
    fireEvent.click(screen.getByText('広告主A'))
    
    // レベル2: 棒グラフ
    waitFor(() => {
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
    })
  })

  it('フィルターを適用してドリルダウンできる', () => {
    render(<DrillDownAnalysis orders={mockOrders} />)
    
    // 日付フィルターを適用
    const dateFilter = screen.getByLabelText('期間')
    fireEvent.change(dateFilter, { target: { value: '2024-01-01' } })
    
    // フィルター後のデータでドリルダウン
    fireEvent.click(screen.getByText('広告主A'))
    
    waitFor(() => {
      // 2024-01-01のデータのみ表示
      expect(screen.getByText('¥25,000')).toBeInTheDocument()
      expect(screen.queryByText('¥20,000')).not.toBeInTheDocument()
    })
  })

  it('データエクスポート機能が各レベルで利用できる', () => {
    render(<DrillDownAnalysis orders={mockOrders} />)
    
    // レベル1でエクスポートボタンが存在
    expect(screen.getByText('エクスポート')).toBeInTheDocument()
    
    // ドリルダウン後もエクスポートボタンが存在
    fireEvent.click(screen.getByText('広告主A'))
    
    waitFor(() => {
      expect(screen.getByText('エクスポート')).toBeInTheDocument()
    })
  })

  it('ツールチップで詳細情報が表示される', async () => {
    render(<DrillDownAnalysis orders={mockOrders} />)
    
    // グラフ要素にホバー
    const chartElement = screen.getByTestId('chart-segment-0')
    fireEvent.mouseEnter(chartElement)
    
    await waitFor(() => {
      expect(screen.getByRole('tooltip')).toBeInTheDocument()
      expect(screen.getByText('売上: ¥25,000')).toBeInTheDocument()
      expect(screen.getByText('シェア: 55.6%')).toBeInTheDocument()
    })
  })

  it('空のデータでもエラーが発生しない', () => {
    expect(() => {
      render(<DrillDownAnalysis orders={[]} />)
    }).not.toThrow()
    
    expect(screen.getByText('データがありません')).toBeInTheDocument()
  })

  it('アニメーション付きで遷移する', async () => {
    render(<DrillDownAnalysis orders={mockOrders} />)
    
    const container = screen.getByTestId('drill-down-container')
    
    // 初期状態
    expect(container).toHaveClass('opacity-100')
    
    // ドリルダウン時にフェードアニメーション
    fireEvent.click(screen.getByText('広告主A'))
    
    expect(container).toHaveClass('transition-opacity')
  })
})