import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CustomKPIBuilder } from '../CustomKPIBuilder'
import type { KPIField } from '../CustomKPIBuilder'

describe('CustomKPIBuilder', () => {
  const mockOnSave = vi.fn()
  const mockAvailableFields: KPIField[] = [
    { name: 'revenue', label: '売上', type: 'number' },
    { name: 'orders', label: '注文数', type: 'number' },
    { name: 'customers', label: '顧客数', type: 'number' },
    { name: 'adSpend', label: '広告費', type: 'number' },
    { name: 'impressions', label: 'インプレッション', type: 'number' },
    { name: 'clicks', label: 'クリック数', type: 'number' }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('KPI名と説明を入力できる', () => {
    render(<CustomKPIBuilder availableFields={mockAvailableFields} onSave={mockOnSave} />)
    
    const nameInput = screen.getByLabelText('KPI名')
    const descriptionInput = screen.getByLabelText('説明')
    
    fireEvent.change(nameInput, { target: { value: 'カスタムROAS' } })
    fireEvent.change(descriptionInput, { target: { value: '広告費対効果の独自指標' } })
    
    expect(nameInput).toHaveValue('カスタムROAS')
    expect(descriptionInput).toHaveValue('広告費対効果の独自指標')
  })

  test('計算式をビジュアルに構築できる', () => {
    render(<CustomKPIBuilder availableFields={mockAvailableFields} onSave={mockOnSave} />)
    
    // フィールドを追加
    fireEvent.click(screen.getByText('売上'))
    expect(screen.getByTestId('formula-display')).toHaveTextContent('売上')
    
    // 演算子を追加
    fireEvent.click(screen.getByText('÷'))
    expect(screen.getByTestId('formula-display')).toHaveTextContent('売上')
    expect(screen.getByTestId('formula-display')).toHaveTextContent('/')
    
    // 別のフィールドを追加
    fireEvent.click(screen.getByText('広告費'))
    expect(screen.getByTestId('formula-display')).toHaveTextContent('売上')
    expect(screen.getByTestId('formula-display')).toHaveTextContent('/')
    expect(screen.getByTestId('formula-display')).toHaveTextContent('広告費')
  })

  test('括弧を使った複雑な計算式を作成できる', () => {
    render(<CustomKPIBuilder availableFields={mockAvailableFields} onSave={mockOnSave} />)
    
    fireEvent.click(screen.getByText('('))
    
    // 売上フィールドボタンをクリック
    const revenueButtons = screen.getAllByRole('button', { name: '売上' })
    fireEvent.click(revenueButtons[0])
    
    fireEvent.click(screen.getByText('-'))
    
    // 広告費フィールドボタンをクリック
    const adSpendButtons = screen.getAllByRole('button', { name: '広告費' })
    fireEvent.click(adSpendButtons[0])
    
    fireEvent.click(screen.getByText(')'))
    fireEvent.click(screen.getByText('÷'))
    
    // 再度広告費フィールドボタンをクリック
    fireEvent.click(adSpendButtons[0])
    
    expect(screen.getByTestId('formula-display')).toHaveTextContent('(')
    expect(screen.getByTestId('formula-display')).toHaveTextContent('売上')
    expect(screen.getByTestId('formula-display')).toHaveTextContent('-')
    expect(screen.getByTestId('formula-display')).toHaveTextContent('広告費')
    expect(screen.getByTestId('formula-display')).toHaveTextContent(')')
    expect(screen.getByTestId('formula-display')).toHaveTextContent('/')
  })

  test('計算式のプレビューが表示される', async () => {
    const mockData = {
      revenue: 100000,
      adSpend: 20000
    }
    
    render(
      <CustomKPIBuilder 
        availableFields={mockAvailableFields} 
        onSave={mockOnSave}
        previewData={mockData}
      />
    )
    
    // 計算式を構築
    fireEvent.click(screen.getByText('売上'))
    fireEvent.click(screen.getByText('÷'))
    fireEvent.click(screen.getByText('広告費'))
    
    // プレビューボタンをクリック
    fireEvent.click(screen.getByText('プレビュー'))
    
    await waitFor(() => {
      expect(screen.getByText('計算結果: 5.00')).toBeInTheDocument()
    })
  })

  test('無効な計算式の場合エラーが表示される', () => {
    render(<CustomKPIBuilder availableFields={mockAvailableFields} onSave={mockOnSave} />)
    
    // 不完全な式
    fireEvent.click(screen.getByText('売上'))
    fireEvent.click(screen.getByText('÷'))
    
    fireEvent.click(screen.getByText('検証'))
    
    expect(screen.getByText('計算式が不完全です')).toBeInTheDocument()
  })

  test('ゼロ除算のチェックが行われる', async () => {
    const mockData = {
      revenue: 100000,
      adSpend: 0
    }
    
    render(
      <CustomKPIBuilder 
        availableFields={mockAvailableFields} 
        onSave={mockOnSave}
        previewData={mockData}
      />
    )
    
    fireEvent.click(screen.getByText('売上'))
    fireEvent.click(screen.getByText('÷'))
    fireEvent.click(screen.getByText('広告費'))
    
    fireEvent.click(screen.getByText('プレビュー'))
    
    await waitFor(() => {
      expect(screen.getByText('エラー: ゼロ除算')).toBeInTheDocument()
    })
  })

  test('数式テンプレートから選択できる', () => {
    render(<CustomKPIBuilder availableFields={mockAvailableFields} onSave={mockOnSave} />)
    
    fireEvent.click(screen.getByText('テンプレート'))
    
    expect(screen.getByText('ROAS (売上 ÷ 広告費)')).toBeInTheDocument()
    expect(screen.getByText('CTR (クリック ÷ インプレッション × 100)')).toBeInTheDocument()
    expect(screen.getByText('CPA (広告費 ÷ 注文数)')).toBeInTheDocument()
    
    // テンプレートを選択
    fireEvent.click(screen.getByText('ROAS (売上 ÷ 広告費)'))
    
    expect(screen.getByTestId('formula-display')).toHaveTextContent('売上')
    expect(screen.getByTestId('formula-display')).toHaveTextContent('/')
    expect(screen.getByTestId('formula-display')).toHaveTextContent('広告費')
  })

  test('計算式の履歴から元に戻す・やり直しができる', () => {
    render(<CustomKPIBuilder availableFields={mockAvailableFields} onSave={mockOnSave} />)
    
    // 操作を実行
    fireEvent.click(screen.getByText('売上'))
    fireEvent.click(screen.getByText('+'))
    fireEvent.click(screen.getByText('注文数'))
    
    expect(screen.getByTestId('formula-display')).toHaveTextContent('売上')
    expect(screen.getByTestId('formula-display')).toHaveTextContent('+')
    expect(screen.getByTestId('formula-display')).toHaveTextContent('注文数')
    
    // 元に戻す
    fireEvent.click(screen.getByTestId('undo-button'))
    expect(screen.getByTestId('formula-display')).toHaveTextContent('売上')
    expect(screen.getByTestId('formula-display')).toHaveTextContent('+')
    
    // やり直し
    fireEvent.click(screen.getByTestId('redo-button'))
    expect(screen.getByTestId('formula-display')).toHaveTextContent('売上')
    expect(screen.getByTestId('formula-display')).toHaveTextContent('+')
    expect(screen.getByTestId('formula-display')).toHaveTextContent('注文数')
  })

  test('集計関数を使用できる', () => {
    render(<CustomKPIBuilder availableFields={mockAvailableFields} onSave={mockOnSave} />)
    
    fireEvent.click(screen.getByText('関数'))
    
    expect(screen.getByText('SUM (合計)')).toBeInTheDocument()
    expect(screen.getByText('AVG (平均)')).toBeInTheDocument()
    expect(screen.getByText('MAX (最大)')).toBeInTheDocument()
    expect(screen.getByText('MIN (最小)')).toBeInTheDocument()
    expect(screen.getByText('COUNT (件数)')).toBeInTheDocument()
    
    // 関数を選択
    fireEvent.click(screen.getByText('AVG (平均)'))
    fireEvent.click(screen.getByText('売上'))
    
    expect(screen.getByTestId('formula-display')).toHaveTextContent('AVG')
    expect(screen.getByTestId('formula-display')).toHaveTextContent('売上')
  })

  test('フォーマット設定ができる', () => {
    render(<CustomKPIBuilder availableFields={mockAvailableFields} onSave={mockOnSave} />)
    
    const formatSelect = screen.getByLabelText('表示形式')
    fireEvent.change(formatSelect, { target: { value: 'percentage' } })
    
    const decimalInput = screen.getByLabelText('小数点以下桁数')
    fireEvent.change(decimalInput, { target: { value: '2' } })
    
    expect(formatSelect).toHaveValue('percentage')
    expect(decimalInput).toHaveValue(2)
  })

  test('保存時にバリデーションが実行される', () => {
    render(<CustomKPIBuilder availableFields={mockAvailableFields} onSave={mockOnSave} />)
    
    // 名前を入力せずに保存
    fireEvent.click(screen.getByText('保存'))
    
    expect(screen.getByText('KPI名を入力してください')).toBeInTheDocument()
    expect(mockOnSave).not.toHaveBeenCalled()
    
    // 必要な情報を入力
    fireEvent.change(screen.getByLabelText('KPI名'), { target: { value: 'テストKPI' } })
    fireEvent.click(screen.getByText('売上'))
    
    fireEvent.click(screen.getByText('保存'))
    
    expect(mockOnSave).toHaveBeenCalledWith({
      name: 'テストKPI',
      description: '',
      formula: 'revenue', // APIは内部フィールド名を使用
      format: 'number',
      decimals: 0
    })
  })

  test('計算式をクリアできる', () => {
    render(<CustomKPIBuilder availableFields={mockAvailableFields} onSave={mockOnSave} />)
    
    // 計算式を作成
    fireEvent.click(screen.getByText('売上'))
    fireEvent.click(screen.getByText('+'))
    fireEvent.click(screen.getByText('注文数'))
    
    expect(screen.getByTestId('formula-display')).toHaveTextContent('売上')
    expect(screen.getByTestId('formula-display')).toHaveTextContent('+')
    expect(screen.getByTestId('formula-display')).toHaveTextContent('注文数')
    
    // クリア
    fireEvent.click(screen.getByText('クリア'))
    
    expect(screen.getByTestId('formula-display')).toHaveTextContent('')
  })
})