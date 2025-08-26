import { describe, it, expect } from 'vitest'
import { ECForceDuplicateHandler } from '../ecforce-duplicate-handler'
import { ECForceOrder } from '@/types'

describe('ECForceDuplicateHandler', () => {
  const createOrder = (id: string, date: string = '2025/08/09 10:00'): ECForceOrder => ({
    受注ID: id,
    受注番号: `order_${id}`,
    顧客番号: 'customer_001',
    購入URL: 'test_url',
    購入オファー: '通常',
    定期受注番号: 'sub_001',
    メールアドレス: 'test@example.com',
    小計: 1000,
    支払い合計: 1000,
    受注日: date,
    購入商品: ['product1'],
    広告URLグループ名: 'Google',
    広告主名: 'インハウス',
    顧客購入回数: 1,
    定期ステータス: '有効',
    定期回数: 1,
  })

  describe('handleDuplicates', () => {
    it('新規データのみの場合、すべてインポートされること', () => {
      const existingOrders: ECForceOrder[] = [createOrder('001'), createOrder('002')]
      const newOrders: ECForceOrder[] = [createOrder('003'), createOrder('004')]

      const result = ECForceDuplicateHandler.handleDuplicates(existingOrders, newOrders, 'skip')

      expect(result.imported).toHaveLength(4)
      expect(result.skipped).toHaveLength(0)
      expect(result.replaced).toHaveLength(0)
      expect(result.total).toBe(2)
    })

    it('重複データがある場合、skip戦略でスキップされること', () => {
      const existingOrders: ECForceOrder[] = [createOrder('001'), createOrder('002')]
      const newOrders: ECForceOrder[] = [
        createOrder('002', '2025/08/09 11:00'), // 重複
        createOrder('003'), // 新規
      ]

      const result = ECForceDuplicateHandler.handleDuplicates(existingOrders, newOrders, 'skip')

      expect(result.imported).toHaveLength(3) // 001, 002(既存), 003
      expect(result.skipped).toHaveLength(1) // 002(新規)
      expect(result.replaced).toHaveLength(0)

      // 既存のデータが保持されていることを確認
      const order002 = result.imported.find((o) => o.受注ID === '002')
      expect(order002?.受注日).toBe('2025/08/09 10:00')
    })

    it('重複データがある場合、replace戦略で置き換えられること', () => {
      const existingOrders: ECForceOrder[] = [
        createOrder('001'),
        createOrder('002', '2025/08/09 10:00'),
      ]
      const newOrders: ECForceOrder[] = [
        createOrder('002', '2025/08/09 11:00'), // 重複
        createOrder('003'), // 新規
      ]

      const result = ECForceDuplicateHandler.handleDuplicates(existingOrders, newOrders, 'replace')

      expect(result.imported).toHaveLength(3)
      expect(result.skipped).toHaveLength(0)
      expect(result.replaced).toHaveLength(1)

      // 新しいデータで置き換えられていることを確認
      const order002 = result.imported.find((o) => o.受注ID === '002')
      expect(order002?.受注日).toBe('2025/08/09 11:00')
    })

    it('すべて重複データの場合の処理', () => {
      const existingOrders: ECForceOrder[] = [createOrder('001'), createOrder('002')]
      const newOrders: ECForceOrder[] = [createOrder('001'), createOrder('002')]

      const result = ECForceDuplicateHandler.handleDuplicates(existingOrders, newOrders, 'skip')

      expect(result.imported).toHaveLength(2)
      expect(result.skipped).toHaveLength(2)
      expect(result.replaced).toHaveLength(0)
    })
  })

  describe('getDuplicateStats', () => {
    it('重複統計を正しく計算すること', () => {
      const existingOrders: ECForceOrder[] = [
        createOrder('001'),
        createOrder('002'),
        createOrder('003'),
      ]
      const newOrders: ECForceOrder[] = [
        createOrder('002'), // 重複
        createOrder('003'), // 重複
        createOrder('004'), // 新規
        createOrder('005'), // 新規
      ]

      const stats = ECForceDuplicateHandler.getDuplicateStats(existingOrders, newOrders)

      expect(stats.totalNew).toBe(4)
      expect(stats.duplicates).toBe(2)
      expect(stats.unique).toBe(2)
    })

    it('重複がない場合の統計', () => {
      const existingOrders: ECForceOrder[] = [createOrder('001'), createOrder('002')]
      const newOrders: ECForceOrder[] = [createOrder('003'), createOrder('004')]

      const stats = ECForceDuplicateHandler.getDuplicateStats(existingOrders, newOrders)

      expect(stats.totalNew).toBe(2)
      expect(stats.duplicates).toBe(0)
      expect(stats.unique).toBe(2)
    })

    it('既存データがない場合の統計', () => {
      const existingOrders: ECForceOrder[] = []
      const newOrders: ECForceOrder[] = [createOrder('001'), createOrder('002')]

      const stats = ECForceDuplicateHandler.getDuplicateStats(existingOrders, newOrders)

      expect(stats.totalNew).toBe(2)
      expect(stats.duplicates).toBe(0)
      expect(stats.unique).toBe(2)
    })
  })
})
