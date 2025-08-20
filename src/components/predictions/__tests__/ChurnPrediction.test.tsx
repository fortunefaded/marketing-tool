import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { ChurnPrediction } from '../ChurnPrediction'
import { ECForceOrder } from '../../../types/ecforce'

// テスト用のモックデータ生成関数
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
  消費税: 100,
  送料: 500,
  合計: 1600,
  支払い合計: 1600,
  決済方法: 'クレジットカード',
  定期受注番号: '',
  定期ステータス: '無効',
  定期回数: 0,
  定期間隔: '',
  広告URLグループ名: 'グループA',
  顧客購入回数: 1,
  配送先郵便番号: '100-0001',
  配送先都道府県: '東京都',
  配送先市区町村: '千代田区',
  配送先住所: '千代田1-1',
  配送先氏名: '山田太郎',
  ...overrides,
})

describe('ChurnPrediction', () => {
  it('リスクレベル統計が正しく表示される', () => {
    const orders: ECForceOrder[] = [
      // 高リスク顧客（長期間購入なし）
      createMockOrder({
        顧客番号: 'CUST-001',
        受注日: '2023-10-01 10:00:00', // 3ヶ月以上前
      }),
      // 低リスク顧客（最近購入）
      createMockOrder({
        顧客番号: 'CUST-002',
        受注日: new Date().toISOString(),
      }),
      // 中リスク顧客（定期購入者で遅延）
      createMockOrder({
        顧客番号: 'CUST-003',
        受注日: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000).toISOString(), // 50日前
        定期ステータス: '有効',
      }),
    ]

    render(<ChurnPrediction orders={orders} />)

    expect(screen.getByText('高リスク顧客')).toBeInTheDocument()
    expect(screen.getByText('中リスク顧客')).toBeInTheDocument()
    expect(screen.getByText('低リスク顧客')).toBeInTheDocument()
    expect(screen.getByText('総顧客数')).toBeInTheDocument()
  })

  it('離脱リスクの高い顧客が正しくリストアップされる', () => {
    const now = new Date()
    const orders: ECForceOrder[] = [
      // 初回購入のみの顧客
      createMockOrder({
        顧客番号: 'CUST-001',
        メールアドレス: 'single@example.com',
        受注日: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString(), // 60日前
      }),
      // 購入頻度が低下した顧客
      createMockOrder({
        顧客番号: 'CUST-002',
        メールアドレス: 'declining@example.com',
        受注日: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10日前
      }),
      createMockOrder({
        顧客番号: 'CUST-002',
        メールアドレス: 'declining@example.com',
        受注日: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString(), // 20日前
      }),
      createMockOrder({
        顧客番号: 'CUST-002',
        メールアドレス: 'declining@example.com',
        受注日: new Date(now.getTime() - 100 * 24 * 60 * 60 * 1000).toISOString(), // 100日前
      }),
    ]

    render(<ChurnPrediction orders={orders} />)

    expect(screen.getByText('離脱リスクの高い顧客')).toBeInTheDocument()
    expect(screen.getByText('single@example.com')).toBeInTheDocument()
    expect(screen.getByText('初回購入のみ')).toBeInTheDocument()
  })

  it('定期購入者の遅延を正しく検出する', () => {
    const orders: ECForceOrder[] = [
      createMockOrder({
        顧客番号: 'CUST-SUB',
        メールアドレス: 'subscriber@example.com',
        受注日: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000).toISOString(), // 50日前
        定期ステータス: '有効',
      }),
    ]

    render(<ChurnPrediction orders={orders} />)

    expect(screen.getByText('定期購入が滞っている可能性')).toBeInTheDocument()
    expect(screen.getByText('定期購入者')).toBeInTheDocument()
  })

  it('チャーン確率が正しく計算される', () => {
    const orders: ECForceOrder[] = [
      // 高リスク顧客（複数のリスクファクター）
      createMockOrder({
        顧客番号: 'HIGH-RISK',
        メールアドレス: 'highrisk@example.com',
        受注日: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(), // 120日前
      }),
    ]

    render(<ChurnPrediction orders={orders} />)

    // チャーン確率のプログレスバーが表示される
    const progressBar = screen.getByRole('progressbar')
    expect(progressBar).toBeInTheDocument()
  })

  it('推奨アクションが表示される', () => {
    const orders: ECForceOrder[] = [createMockOrder({})]

    render(<ChurnPrediction orders={orders} />)

    expect(screen.getByText('推奨アクション')).toBeInTheDocument()
    expect(screen.getByText(/高リスク顧客：/)).toBeInTheDocument()
    expect(screen.getByText(/定期購入の遅延：/)).toBeInTheDocument()
    expect(screen.getByText(/初回購入のみの顧客：/)).toBeInTheDocument()
  })

  it('空のデータでもエラーが発生しない', () => {
    expect(() => {
      render(<ChurnPrediction orders={[]} />)
    }).not.toThrow()
  })

  it('日付計算が正しく行われる', () => {
    const testDate = new Date('2024-01-01')
    const orders: ECForceOrder[] = [
      createMockOrder({
        顧客番号: 'DATE-TEST',
        受注日: testDate.toISOString(),
      }),
    ]

    render(<ChurnPrediction orders={orders} />)

    // 最終購入からの経過日数が表示される
    const daysSinceLastOrder = Math.floor((Date.now() - testDate.getTime()) / (1000 * 60 * 60 * 24))
    expect(screen.getByText(`${daysSinceLastOrder}日前`)).toBeInTheDocument()
  })
})
