import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { ABTestAnalysis } from '../ABTestAnalysis'
import { ECForceOrder } from '../../../types/ecforce'

const createMockOrder = (overrides: Partial<ECForceOrder>): ECForceOrder => ({
  受注ID: 'TEST-001',
  受注番号: 'ORDER-001',
  受注日: '2024-01-01 10:00:00',
  顧客番号: 'CUST-001',
  メールアドレス: 'test@example.com',
  購入商品: ['商品A'],
  購入オファー: 'オファーA',
  広告主名: '広告主A',
  ランディングページ: 'LP-A',
  購入URL: 'https://example.com/a',
  小計: 1000,
  消費税: 100,
  送料: 500,
  合計: 1600,
  決済方法: 'クレジットカード',
  定期ステータス: '無効',
  定期回数: 0,
  定期間隔: '',
  配送先郵便番号: '100-0001',
  配送先都道府県: '東京都',
  配送先市区町村: '千代田区',
  配送先住所: '千代田1-1',
  配送先氏名: '山田太郎',
  ...overrides
})

describe('ABTestAnalysis', () => {
  it('テストタイプの切り替えが正しく動作する', () => {
    const orders: ECForceOrder[] = [
      createMockOrder({ 購入オファー: 'オファーA' }),
      createMockOrder({ 購入オファー: 'オファーB' })
    ]

    render(<ABTestAnalysis orders={orders} />)
    
    // デフォルトはオファー別
    expect(screen.getByText('A/Bテスト分析')).toBeInTheDocument()
    const select = screen.getByRole('combobox')
    expect(select).toHaveValue('offer')

    // 広告主別に切り替え
    fireEvent.change(select, { target: { value: 'advertiser' } })
    expect(select).toHaveValue('advertiser')

    // ランディングページ別に切り替え
    fireEvent.change(select, { target: { value: 'landing' } })
    expect(select).toHaveValue('landing')
  })

  it('統計的有意性が正しく計算される', () => {
    const orders: ECForceOrder[] = [
      // バリアントA: 高いコンバージョン率
      ...Array(100).fill(null).map((_, i) => 
        createMockOrder({ 
          受注ID: `A-${i}`,
          購入オファー: 'オファーA',
          合計: 2000
        })
      ),
      // バリアントB: 低いコンバージョン率
      ...Array(50).fill(null).map((_, i) => 
        createMockOrder({ 
          受注ID: `B-${i}`,
          購入オファー: 'オファーB',
          合計: 1500
        })
      )
    ]

    render(<ABTestAnalysis orders={orders} />)
    
    // 勝者が表示される
    expect(screen.getByText(/テスト結果:/)).toBeInTheDocument()
    expect(screen.getByText(/が勝利/)).toBeInTheDocument()
    expect(screen.getByText(/統計的信頼度:/)).toBeInTheDocument()
  })

  it('バリアント詳細比較テーブルが表示される', () => {
    const orders: ECForceOrder[] = [
      createMockOrder({ 購入オファー: 'オファーA' }),
      createMockOrder({ 購入オファー: 'オファーB' }),
      createMockOrder({ 購入オファー: 'オファーC' })
    ]

    render(<ABTestAnalysis orders={orders} />)
    
    expect(screen.getByText('バリアント詳細比較')).toBeInTheDocument()
    expect(screen.getByText('訪問者数')).toBeInTheDocument()
    expect(screen.getByText('コンバージョン')).toBeInTheDocument()
    expect(screen.getByText('CVR')).toBeInTheDocument()
    expect(screen.getByText('売上')).toBeInTheDocument()
    expect(screen.getByText('平均単価')).toBeInTheDocument()
    expect(screen.getByText('信頼度')).toBeInTheDocument()
    expect(screen.getByText('ステータス')).toBeInTheDocument()
  })

  it('コンバージョン率が正しく計算される', () => {
    const orders: ECForceOrder[] = [
      createMockOrder({ 購入オファー: 'オファーA' }),
      createMockOrder({ 購入オファー: 'オファーA' }),
      createMockOrder({ 購入オファー: 'オファーB' })
    ]

    render(<ABTestAnalysis orders={orders} />)
    
    // 仮想的な訪問者数（コンバージョン率20%と仮定）に基づくCVRが表示される
    expect(screen.getByText('20.00%')).toBeInTheDocument()
  })

  it('統計的有意性の説明が表示される', () => {
    const orders: ECForceOrder[] = [
      createMockOrder({})
    ]

    render(<ABTestAnalysis orders={orders} />)
    
    expect(screen.getByText('統計的有意性について')).toBeInTheDocument()
    expect(screen.getByText(/信頼度95%以上:/)).toBeInTheDocument()
    expect(screen.getByText(/信頼度90-95%:/)).toBeInTheDocument()
    expect(screen.getByText(/信頼度90%未満:/)).toBeInTheDocument()
  })

  it('空のデータでもエラーが発生しない', () => {
    expect(() => {
      render(<ABTestAnalysis orders={[]} />)
    }).not.toThrow()
  })

  it('不明なバリアントが適切に処理される', () => {
    const orders: ECForceOrder[] = [
      createMockOrder({ 購入オファー: undefined }),
      createMockOrder({ 購入オファー: '' }),
      createMockOrder({ 購入オファー: 'オファーA' })
    ]

    render(<ABTestAnalysis orders={orders} />)
    
    expect(screen.getByText('不明')).toBeInTheDocument()
    expect(screen.getByText('オファーA')).toBeInTheDocument()
  })

  it('z検定の計算が正しく行われる', () => {
    const orders: ECForceOrder[] = [
      // 統計的に有意な差を作る
      ...Array(200).fill(null).map((_, i) => 
        createMockOrder({ 
          受注ID: `A-${i}`,
          購入オファー: 'オファーA'
        })
      ),
      ...Array(100).fill(null).map((_, i) => 
        createMockOrder({ 
          受注ID: `B-${i}`,
          購入オファー: 'オファーB'
        })
      )
    ]

    render(<ABTestAnalysis orders={orders} />)
    
    // 95%以上の信頼度を示す緑色のバッジが表示される
    const confidenceBadges = screen.getAllByText(/%/)
    const highConfidenceBadge = confidenceBadges.find(badge => 
      badge.parentElement?.classList.contains('bg-green-100')
    )
    expect(highConfidenceBadge).toBeInTheDocument()
  })

  it('広告主別の分析が正しく動作する', () => {
    const orders: ECForceOrder[] = [
      createMockOrder({ 広告主名: '広告主X' }),
      createMockOrder({ 広告主名: '広告主Y' }),
      createMockOrder({ 広告主名: '広告主Z' })
    ]

    render(<ABTestAnalysis orders={orders} />)
    
    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: 'advertiser' } })
    
    expect(screen.getByText('広告主X')).toBeInTheDocument()
    expect(screen.getByText('広告主Y')).toBeInTheDocument()
    expect(screen.getByText('広告主Z')).toBeInTheDocument()
  })

  it('ランディングページ別の分析が正しく動作する', () => {
    const orders: ECForceOrder[] = [
      createMockOrder({ 購入URL: 'https://example.com/lp1' }),
      createMockOrder({ 購入URL: 'https://example.com/lp2' }),
      createMockOrder({ 購入URL: 'https://example.com/lp3' })
    ]

    render(<ABTestAnalysis orders={orders} />)
    
    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: 'landing' } })
    
    expect(screen.getByText('https://example.com/lp1')).toBeInTheDocument()
    expect(screen.getByText('https://example.com/lp2')).toBeInTheDocument()
    expect(screen.getByText('https://example.com/lp3')).toBeInTheDocument()
  })
})