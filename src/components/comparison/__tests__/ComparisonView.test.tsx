import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { ComparisonView } from '../ComparisonView'
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

describe('ComparisonView', () => {
  const mockData = {
    period1: {
      label: '2024年1月',
      orders: [
        createMockOrder({ 受注ID: '1', 受注日: '2024-01-15', 小計: 10000 }),
        createMockOrder({ 受注ID: '2', 受注日: '2024-01-20', 小計: 15000 })
      ]
    },
    period2: {
      label: '2023年12月',
      orders: [
        createMockOrder({ 受注ID: '3', 受注日: '2023-12-15', 小計: 8000 }),
        createMockOrder({ 受注ID: '4', 受注日: '2023-12-20', 小計: 12000 })
      ]
    }
  }

  it('2つの期間を並べて比較表示できる', () => {
    render(<ComparisonView data={mockData} />)
    
    expect(screen.getByText('比較分析')).toBeInTheDocument()
    expect(screen.getByText('2024年1月')).toBeInTheDocument()
    expect(screen.getByText('2023年12月')).toBeInTheDocument()
  })

  it('主要KPIの比較が表示される', () => {
    render(<ComparisonView data={mockData} />)
    
    // 売上合計
    expect(screen.getByText('¥25,000')).toBeInTheDocument() // 期間1
    expect(screen.getByText('¥20,000')).toBeInTheDocument() // 期間2
    
    // 注文数
    expect(screen.getByText('2件')).toBeInTheDocument() // 両期間とも
    
    // 平均単価
    expect(screen.getByText('¥12,500')).toBeInTheDocument() // 期間1
    expect(screen.getByText('¥10,000')).toBeInTheDocument() // 期間2
  })

  it('変化率と増減が表示される', () => {
    render(<ComparisonView data={mockData} />)
    
    // 売上の変化率（25%増）
    expect(screen.getByText('+25.0%')).toBeInTheDocument()
    expect(screen.getByText('+¥5,000')).toBeInTheDocument()
    
    // 増加は緑色、減少は赤色で表示
    const increaseElement = screen.getByText('+25.0%').parentElement
    expect(increaseElement).toHaveClass('text-green-600')
  })

  it('比較タイプを切り替えできる', () => {
    render(<ComparisonView data={mockData} />)
    
    const typeSelector = screen.getByLabelText('比較タイプ')
    
    // 期間比較から顧客セグメント比較に切り替え
    fireEvent.change(typeSelector, { target: { value: 'segment' } })
    
    expect(screen.getByText('セグメント比較')).toBeInTheDocument()
    expect(screen.getByText('新規顧客')).toBeInTheDocument()
    expect(screen.getByText('既存顧客')).toBeInTheDocument()
  })

  it('カスタム期間を選択できる', () => {
    render(<ComparisonView data={mockData} />)
    
    // カスタム期間選択ボタン
    fireEvent.click(screen.getByText('期間を変更'))
    
    // 期間選択モーダル
    expect(screen.getByText('比較期間を選択')).toBeInTheDocument()
    
    // プリセット期間
    expect(screen.getByText('前月比')).toBeInTheDocument()
    expect(screen.getByText('前年同月比')).toBeInTheDocument()
    expect(screen.getByText('前四半期比')).toBeInTheDocument()
    
    // カスタム日付選択
    const startDate1 = screen.getByLabelText('期間1開始日')
    const endDate1 = screen.getByLabelText('期間1終了日')
    
    fireEvent.change(startDate1, { target: { value: '2024-01-01' } })
    fireEvent.change(endDate1, { target: { value: '2024-01-31' } })
  })

  it('比較グラフが表示される', () => {
    render(<ComparisonView data={mockData} />)
    
    // グラフタイプ選択
    const chartTypeSelector = screen.getByLabelText('グラフタイプ')
    
    // 棒グラフ（デフォルト）
    expect(screen.getByTestId('bar-chart-comparison')).toBeInTheDocument()
    
    // 折れ線グラフに切り替え
    fireEvent.change(chartTypeSelector, { target: { value: 'line' } })
    expect(screen.getByTestId('line-chart-comparison')).toBeInTheDocument()
    
    // レーダーチャートに切り替え
    fireEvent.change(chartTypeSelector, { target: { value: 'radar' } })
    expect(screen.getByTestId('radar-chart-comparison')).toBeInTheDocument()
  })

  it('詳細な比較テーブルが表示される', () => {
    render(<ComparisonView data={mockData} />)
    
    // テーブルヘッダー
    expect(screen.getByText('指標')).toBeInTheDocument()
    expect(screen.getByText('期間1')).toBeInTheDocument()
    expect(screen.getByText('期間2')).toBeInTheDocument()
    expect(screen.getByText('差分')).toBeInTheDocument()
    expect(screen.getByText('変化率')).toBeInTheDocument()
    
    // テーブル行
    const rows = screen.getAllByRole('row')
    expect(rows.length).toBeGreaterThan(5) // ヘッダー + データ行
  })

  it('フィルターを適用して比較できる', () => {
    render(<ComparisonView data={mockData} />)
    
    // フィルターパネルを開く
    fireEvent.click(screen.getByText('フィルター'))
    
    // 商品でフィルター
    const productFilter = screen.getByLabelText('商品')
    fireEvent.change(productFilter, { target: { value: '商品A' } })
    
    // フィルター適用
    fireEvent.click(screen.getByText('適用'))
    
    // フィルター後のデータで比較が更新される
    waitFor(() => {
      expect(screen.getByText('フィルター適用中')).toBeInTheDocument()
    })
  })

  it('比較結果をエクスポートできる', () => {
    render(<ComparisonView data={mockData} />)
    
    fireEvent.click(screen.getByText('エクスポート'))
    
    // エクスポートオプション
    expect(screen.getByText('比較レポート（PDF）')).toBeInTheDocument()
    expect(screen.getByText('詳細データ（Excel）')).toBeInTheDocument()
    expect(screen.getByText('サマリー（CSV）')).toBeInTheDocument()
  })

  it('インサイトと推奨事項が表示される', () => {
    render(<ComparisonView data={mockData} />)
    
    // AIインサイトセクション
    expect(screen.getByText('インサイト')).toBeInTheDocument()
    
    // 自動生成されたインサイト
    expect(screen.getByText(/売上が25%増加しています/)).toBeInTheDocument()
    expect(screen.getByText(/平均単価が向上しています/)).toBeInTheDocument()
    
    // 推奨アクション
    expect(screen.getByText('推奨アクション')).toBeInTheDocument()
    expect(screen.getByText(/好調な商品の在庫を確保/)).toBeInTheDocument()
  })

  it('複数指標の同時比較ができる', () => {
    render(<ComparisonView data={mockData} />)
    
    // 指標選択
    fireEvent.click(screen.getByText('指標を選択'))
    
    const metrics = ['売上', '注文数', '平均単価', 'CVR', 'LTV']
    metrics.forEach(metric => {
      const checkbox = screen.getByRole('checkbox', { name: metric })
      expect(checkbox).toBeInTheDocument()
    })
    
    // 複数選択
    fireEvent.click(screen.getByRole('checkbox', { name: '売上' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'CVR' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'LTV' }))
    
    // 選択した指標が比較表示される
    expect(screen.getByTestId('multi-metric-comparison')).toBeInTheDocument()
  })

  it('アニメーション付きで値が変化する', async () => {
    render(<ComparisonView data={mockData} />)
    
    // 初期表示
    const valueElement = screen.getByTestId('animated-value-revenue')
    expect(valueElement).toHaveTextContent('¥0')
    
    // アニメーション後
    await waitFor(() => {
      expect(valueElement).toHaveTextContent('¥25,000')
    }, { timeout: 2000 })
  })
})