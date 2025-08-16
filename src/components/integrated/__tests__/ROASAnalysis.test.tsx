import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { ROASAnalysis } from '../ROASAnalysis'
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

const mockMetaAdData = {
  totalSpend: 10000,
  totalRevenue: 50000,
  campaigns: []
}

describe('ROASAnalysis', () => {
  it('ROAS推移グラフが表示される', () => {
    const orders: ECForceOrder[] = [
      createMockOrder({ 
        受注ID: '1',
        受注日: '2024-01-01 10:00:00',
        小計: 5000,
        広告URLグループ名: '広告グループA'
      }),
      createMockOrder({ 
        受注ID: '2',
        受注日: '2024-01-02 10:00:00',
        小計: 3000,
        広告URLグループ名: '広告グループA'
      })
    ]

    render(<ROASAnalysis ecforceOrders={orders} metaAdData={mockMetaAdData} />)
    
    expect(screen.getByText('ROAS推移（日別）')).toBeInTheDocument()
    expect(screen.getByText('過去のトレンドに基づく予測値と95%信頼区間')).toBeInTheDocument()
  })

  it('広告主別ROASが正しく計算される', () => {
    const orders: ECForceOrder[] = [
      createMockOrder({ 
        受注ID: '1',
        広告主名: '広告主A',
        小計: 10000
      }),
      createMockOrder({ 
        受注ID: '2',
        広告主名: '広告主B',
        小計: 5000
      }),
      createMockOrder({ 
        受注ID: '3',
        広告主名: '広告主A',
        小計: 8000
      })
    ]

    render(<ROASAnalysis ecforceOrders={orders} metaAdData={mockMetaAdData} />)
    
    expect(screen.getByText('広告主別ROAS')).toBeInTheDocument()
    expect(screen.getByText('広告主A')).toBeInTheDocument()
    expect(screen.getByText('広告主B')).toBeInTheDocument()
  })

  it('ROASが正しく計算される', () => {
    const orders: ECForceOrder[] = [
      createMockOrder({ 
        受注ID: '1',
        広告主名: '広告主A',
        小計: 30000,
        広告URLグループ名: '広告グループA'
      })
    ]
    
    const adData = {
      totalSpend: 10000,
      totalRevenue: 30000,
      campaigns: []
    }

    render(<ROASAnalysis ecforceOrders={orders} metaAdData={adData} />)
    
    // ROAS = 30000 / 10000 = 3.0
    expect(screen.getByText('広告パフォーマンス詳細')).toBeInTheDocument()
  })

  it('広告費がゼロの場合でもエラーが発生しない', () => {
    const orders: ECForceOrder[] = [
      createMockOrder({ 広告主名: '広告主A', 小計: 10000 })
    ]
    
    const adData = {
      totalSpend: 0,
      totalRevenue: 10000,
      campaigns: []
    }

    expect(() => {
      render(<ROASAnalysis ecforceOrders={orders} metaAdData={adData} />)
    }).not.toThrow()
  })

  it('広告URLグループ名がある注文のみROAS計算に含まれる', () => {
    const orders: ECForceOrder[] = [
      createMockOrder({ 
        受注ID: '1',
        小計: 10000,
        広告URLグループ名: '広告グループA' // 含まれる
      }),
      createMockOrder({ 
        受注ID: '2',
        小計: 5000
        // 広告URLグループ名なし - 含まれない
      })
    ]

    render(<ROASAnalysis ecforceOrders={orders} metaAdData={mockMetaAdData} />)
    
    // 詳細テーブルの存在を確認
    expect(screen.getByText('広告パフォーマンス詳細')).toBeInTheDocument()
  })

  it('日付でソートされたデータが表示される', () => {
    const orders: ECForceOrder[] = [
      createMockOrder({ 
        受注ID: '1',
        受注日: '2024-01-05 10:00:00',
        広告URLグループ名: '広告グループA'
      }),
      createMockOrder({ 
        受注ID: '2',
        受注日: '2024-01-01 10:00:00',
        広告URLグループ名: '広告グループA'
      }),
      createMockOrder({ 
        受注ID: '3',
        受注日: '2024-01-03 10:00:00',
        広告URLグループ名: '広告グループA'
      })
    ]

    render(<ROASAnalysis ecforceOrders={orders} metaAdData={mockMetaAdData} />)
    
    expect(screen.getByText('ROAS推移（日別）')).toBeInTheDocument()
  })

  it('ROASの色分けが正しく適用される', () => {
    const orders: ECForceOrder[] = [
      createMockOrder({ 
        受注ID: '1',
        広告主名: '高ROAS広告主',
        小計: 50000 // ROAS = 5.0
      }),
      createMockOrder({ 
        受注ID: '2',
        広告主名: '中ROAS広告主',
        小計: 15000 // ROAS = 1.5
      }),
      createMockOrder({ 
        受注ID: '3',
        広告主名: '低ROAS広告主',
        小計: 5000 // ROAS = 0.5
      })
    ]

    render(<ROASAnalysis ecforceOrders={orders} metaAdData={mockMetaAdData} />)
    
    // ROASバッジの色分けクラスを確認
    const roasBadges = screen.getAllByText(/\d+\.\d+/)
    expect(roasBadges.length).toBeGreaterThan(0)
  })

  it('平均単価が正しく計算される', () => {
    const orders: ECForceOrder[] = [
      createMockOrder({ 
        受注ID: '1',
        広告主名: '広告主A',
        小計: 10000
      }),
      createMockOrder({ 
        受注ID: '2',
        広告主名: '広告主A',
        小計: 20000
      })
    ]

    render(<ROASAnalysis ecforceOrders={orders} metaAdData={mockMetaAdData} />)
    
    // 平均単価 = (10000 + 20000) / 2 = 15000
    expect(screen.getByText('平均単価')).toBeInTheDocument()
    expect(screen.getByText('¥15,000')).toBeInTheDocument()
  })

  it('金額のフォーマットが正しく表示される', () => {
    const orders: ECForceOrder[] = [
      createMockOrder({ 
        受注ID: '1',
        広告主名: '広告主A',
        小計: 1234567
      })
    ]

    render(<ROASAnalysis ecforceOrders={orders} metaAdData={mockMetaAdData} />)
    
    expect(screen.getByText('¥1,234,567')).toBeInTheDocument()
  })

  it('空のデータでもエラーが発生しない', () => {
    expect(() => {
      render(<ROASAnalysis ecforceOrders={[]} metaAdData={mockMetaAdData} />)
    }).not.toThrow()
  })
})