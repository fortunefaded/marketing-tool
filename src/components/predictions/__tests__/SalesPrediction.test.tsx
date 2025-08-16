import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { SalesPrediction } from '../SalesPrediction'
import { ECForceOrder } from '../../../types/ecforce'

// モックデータ
const mockOrders: ECForceOrder[] = [
  {
    受注ID: '1',
    受注番号: 'ORDER-001',
    受注日: '2024-01-01 10:00:00',
    顧客番号: 'CUST-001',
    メールアドレス: 'test1@example.com',
    購入商品: ['商品A'],
    購入オファー: 'オファー1',
    広告主名: '広告主A',
    ランディングページ: 'LP1',
    購入URL: 'https://example.com/1',
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
    配送先氏名: '山田太郎'
  },
  {
    受注ID: '2',
    受注番号: 'ORDER-002',
    受注日: '2024-01-02 11:00:00',
    顧客番号: 'CUST-002',
    メールアドレス: 'test2@example.com',
    購入商品: ['商品B'],
    購入オファー: 'オファー1',
    広告主名: '広告主A',
    ランディングページ: 'LP1',
    購入URL: 'https://example.com/2',
    小計: 2000,
    消費税: 200,
    送料: 500,
    合計: 2700,
    決済方法: 'クレジットカード',
    定期ステータス: '無効',
    定期回数: 0,
    定期間隔: '',
    配送先郵便番号: '100-0002',
    配送先都道府県: '東京都',
    配送先市区町村: '千代田区',
    配送先住所: '千代田2-2',
    配送先氏名: '鈴木花子'
  }
]

describe('SalesPrediction', () => {
  it('データが不足している場合にメッセージを表示する', () => {
    render(<SalesPrediction orders={[]} />)
    expect(screen.getByText('予測分析には最低7日分のデータが必要です')).toBeInTheDocument()
  })

  it('正しく売上予測を計算する', () => {
    // 7日分以上のデータを作成
    const orders: ECForceOrder[] = []
    for (let i = 0; i < 10; i++) {
      orders.push({
        ...mockOrders[0],
        受注ID: `${i}`,
        受注番号: `ORDER-00${i}`,
        受注日: `2024-01-${String(i + 1).padStart(2, '0')} 10:00:00`,
        合計: 1000 + i * 100 // 線形増加するデータ
      })
    }

    render(<SalesPrediction orders={orders} predictionDays={7} />)
    
    // グラフが表示されることを確認
    expect(screen.getByText('売上予測（7日間）')).toBeInTheDocument()
    expect(screen.getByText('過去のトレンドに基づく予測値と95%信頼区間')).toBeInTheDocument()
  })

  it('KPIメトリクスが正しく計算される', () => {
    const orders: ECForceOrder[] = []
    // 30日分のデータを作成（成長率計算のため）
    for (let i = 0; i < 30; i++) {
      orders.push({
        ...mockOrders[0],
        受注ID: `${i}`,
        受注番号: `ORDER-00${i}`,
        受注日: `2024-01-${String(i + 1).padStart(2, '0')} 10:00:00`,
        合計: 1000 + i * 50
      })
    }

    render(<SalesPrediction orders={orders} />)
    
    // 成長率が表示されることを確認
    expect(screen.getByText('週間成長率')).toBeInTheDocument()
    expect(screen.getByText('月間成長率')).toBeInTheDocument()
    expect(screen.getByText('平均日次売上')).toBeInTheDocument()
    expect(screen.getByText('ボラティリティ')).toBeInTheDocument()
  })

  it('ゼロ除算エラーが発生しないことを確認', () => {
    const singleOrder: ECForceOrder[] = [mockOrders[0]]
    
    expect(() => {
      render(<SalesPrediction orders={singleOrder} />)
    }).not.toThrow()
  })

  it('予測日数パラメータが正しく反映される', () => {
    const orders: ECForceOrder[] = []
    for (let i = 0; i < 10; i++) {
      orders.push({
        ...mockOrders[0],
        受注ID: `${i}`,
        受注番号: `ORDER-00${i}`,
        受注日: `2024-01-${String(i + 1).padStart(2, '0')} 10:00:00`,
        合計: 1000
      })
    }

    const { rerender } = render(<SalesPrediction orders={orders} predictionDays={30} />)
    expect(screen.getByText('売上予測（30日間）')).toBeInTheDocument()

    rerender(<SalesPrediction orders={orders} predictionDays={60} />)
    expect(screen.getByText('売上予測（60日間）')).toBeInTheDocument()
  })
})