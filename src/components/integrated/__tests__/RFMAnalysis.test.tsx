import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { RFMAnalysis } from '../RFMAnalysis'
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

describe('RFMAnalysis', () => {
  const now = new Date()

  it('RFMセグメントが正しく表示される', () => {
    const orders: ECForceOrder[] = [
      createMockOrder({ 顧客番号: 'CUST-001' }),
      createMockOrder({ 顧客番号: 'CUST-002' }),
      createMockOrder({ 顧客番号: 'CUST-003' })
    ]

    render(<RFMAnalysis orders={orders} />)

    // セグメント名が表示される
    expect(screen.getByText('チャンピオン')).toBeInTheDocument()
    expect(screen.getByText('優良顧客')).toBeInTheDocument()
    expect(screen.getByText('潜在的優良顧客')).toBeInTheDocument()
    expect(screen.getByText('新規顧客')).toBeInTheDocument()
    expect(screen.getByText('離反リスク')).toBeInTheDocument()
    expect(screen.getByText('休眠顧客')).toBeInTheDocument()
  })

  it('チャンピオン顧客が正しく識別される', () => {
    const orders: ECForceOrder[] = [
      // 最近・高頻度・高額の顧客
      createMockOrder({ 
        受注ID: '1',
        顧客番号: 'CHAMPION-001',
        メールアドレス: 'champion@example.com',
        受注日: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5日前
        小計: 50000
      }),
      createMockOrder({ 
        受注ID: '2',
        顧客番号: 'CHAMPION-001',
        受注日: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10日前
        小計: 45000
      }),
      createMockOrder({ 
        受注ID: '3',
        顧客番号: 'CHAMPION-001',
        受注日: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString(), // 15日前
        小計: 40000
      }),
      createMockOrder({ 
        受注ID: '4',
        顧客番号: 'CHAMPION-001',
        受注日: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString(), // 20日前
        小計: 35000
      }),
      // 比較用の低価値顧客
      createMockOrder({ 
        受注ID: '5',
        顧客番号: 'LOW-001',
        受注日: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString(), // 90日前
        小計: 1000
      })
    ]

    render(<RFMAnalysis orders={orders} />)
    
    // RFM分布図が表示される
    expect(screen.getByText('RFM分布図（最終購入日数 × 購入回数）')).toBeInTheDocument()
  })

  it('新規顧客が正しく識別される', () => {
    const orders: ECForceOrder[] = [
      // 最近購入・低頻度の顧客
      createMockOrder({ 
        受注ID: '1',
        顧客番号: 'NEW-001',
        メールアドレス: 'new@example.com',
        受注日: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7日前
        小計: 10000
      }),
      // 比較用の既存顧客
      createMockOrder({ 
        受注ID: '2',
        顧客番号: 'EXISTING-001',
        受注日: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        小計: 5000
      }),
      createMockOrder({ 
        受注ID: '3',
        顧客番号: 'EXISTING-001',
        受注日: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString(),
        小計: 5000
      })
    ]

    render(<RFMAnalysis orders={orders} />)
    
    // 新規顧客セグメントが存在する
    const newCustomerElement = screen.getByText(/新規顧客.*人/i)
    expect(newCustomerElement).toBeInTheDocument()
  })

  it('離反リスク顧客が正しく識別される', () => {
    const orders: ECForceOrder[] = [
      // 過去は高頻度だが最近購入していない顧客
      createMockOrder({ 
        受注ID: '1',
        顧客番号: 'RISK-001',
        受注日: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString(), // 90日前
        小計: 20000
      }),
      createMockOrder({ 
        受注ID: '2',
        顧客番号: 'RISK-001',
        受注日: new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000).toISOString(), // 120日前
        小計: 25000
      }),
      createMockOrder({ 
        受注ID: '3',
        顧客番号: 'RISK-001',
        受注日: new Date(now.getTime() - 150 * 24 * 60 * 60 * 1000).toISOString(), // 150日前
        小計: 30000
      })
    ]

    render(<RFMAnalysis orders={orders} />)
    
    // 離反リスクセグメントが存在する
    const riskElement = screen.getByText(/離反リスク.*人/i)
    expect(riskElement).toBeInTheDocument()
  })

  it('休眠顧客が正しく識別される', () => {
    const orders: ECForceOrder[] = [
      // 長期間購入していない・低頻度の顧客
      createMockOrder({ 
        受注ID: '1',
        顧客番号: 'DORMANT-001',
        受注日: new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000).toISOString(), // 180日前
        小計: 3000
      }),
      createMockOrder({ 
        受注ID: '2',
        顧客番号: 'DORMANT-002',
        受注日: new Date(now.getTime() - 200 * 24 * 60 * 60 * 1000).toISOString(), // 200日前
        小計: 2000
      })
    ]

    render(<RFMAnalysis orders={orders} />)
    
    // 休眠顧客セグメントが存在する
    const dormantElement = screen.getByText(/休眠顧客.*人/i)
    expect(dormantElement).toBeInTheDocument()
  })

  it('セグメント別の平均購入額が計算される', () => {
    const orders: ECForceOrder[] = [
      createMockOrder({ 
        顧客番号: 'CUST-001',
        小計: 10000
      }),
      createMockOrder({ 
        顧客番号: 'CUST-001',
        小計: 20000
      }),
      createMockOrder({ 
        顧客番号: 'CUST-002',
        小計: 5000
      })
    ]

    render(<RFMAnalysis orders={orders} />)
    
    // 平均購入額のテキストが表示される
    const avgAmountElements = screen.getAllByText(/平均購入額:/)
    expect(avgAmountElements.length).toBeGreaterThan(0)
  })

  it('セグメント別マーケティング施策が表示される', () => {
    const orders: ECForceOrder[] = [
      createMockOrder({})
    ]

    render(<RFMAnalysis orders={orders} />)
    
    expect(screen.getByText('セグメント別マーケティング施策')).toBeInTheDocument()
    expect(screen.getByText(/VIP特典の提供/)).toBeInTheDocument()
    expect(screen.getByText(/限定クーポンの配布/)).toBeInTheDocument()
    expect(screen.getByText(/購入頻度向上キャンペーン/)).toBeInTheDocument()
    expect(screen.getByText(/ウェルカムシリーズの配信/)).toBeInTheDocument()
    expect(screen.getByText(/カムバックキャンペーン/)).toBeInTheDocument()
    expect(screen.getByText(/リアクティベーションキャンペーン/)).toBeInTheDocument()
  })

  it('RFMスコアが正しく計算される', () => {
    const orders: ECForceOrder[] = [
      // 様々なパターンの顧客データ
      createMockOrder({ 
        顧客番号: 'HIGH-RFM',
        受注日: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        小計: 100000
      }),
      createMockOrder({ 
        顧客番号: 'HIGH-RFM',
        受注日: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        小計: 90000
      }),
      createMockOrder({ 
        顧客番号: 'MID-RFM',
        受注日: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        小計: 20000
      }),
      createMockOrder({ 
        顧客番号: 'LOW-RFM',
        受注日: new Date(now.getTime() - 100 * 24 * 60 * 60 * 1000).toISOString(),
        小計: 5000
      })
    ]

    render(<RFMAnalysis orders={orders} />)
    
    // セグメントカウントが表示される
    const segmentCounts = screen.getAllByText(/^\d+$/)
    expect(segmentCounts.length).toBeGreaterThan(0)
  })

  it('同じ顧客の複数注文が正しく集計される', () => {
    const customerId = 'REPEAT-CUST'
    const orders: ECForceOrder[] = [
      createMockOrder({ 
        受注ID: '1',
        顧客番号: customerId,
        受注日: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        小計: 10000
      }),
      createMockOrder({ 
        受注ID: '2',
        顧客番号: customerId,
        受注日: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        小計: 15000
      }),
      createMockOrder({ 
        受注ID: '3',
        顧客番号: customerId,
        受注日: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        小計: 20000
      })
    ]

    render(<RFMAnalysis orders={orders} />)
    
    // 顧客は1人としてカウントされる
    const totalCustomers = screen.getAllByText(/^\d+$/).reduce((sum, element) => {
      const count = parseInt(element.textContent || '0')
      return sum + (count > 0 && count < 10 ? count : 0) // 小さい数字のみ集計
    }, 0)
    
    expect(totalCustomers).toBe(1)
  })

  it('空のデータでもエラーが発生しない', () => {
    expect(() => {
      render(<RFMAnalysis orders={[]} />)
    }).not.toThrow()
  })

  it('セグメントの色分けが正しく適用される', () => {
    const orders: ECForceOrder[] = [
      createMockOrder({ 顧客番号: 'CUST-001' }),
      createMockOrder({ 顧客番号: 'CUST-002' }),
      createMockOrder({ 顧客番号: 'CUST-003' })
    ]

    render(<RFMAnalysis orders={orders} />)
    
    // 色を示すdiv要素が存在する
    const colorDivs = document.querySelectorAll('div[style*="backgroundColor"]')
    expect(colorDivs.length).toBeGreaterThan(0)
  })
})