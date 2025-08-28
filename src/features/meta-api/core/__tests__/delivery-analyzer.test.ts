// TASK-102: 配信日数分析ロジック - TDD テストスイート
// 詳細な配信パターン分析の単体テスト

import { describe, it, expect } from 'vitest'
import { analyzeDeliveryPattern } from '../delivery-analyzer'
import type { MetaAdInsight } from '../../types'

describe('TASK-102: Delivery Days Analysis Logic', () => {
  
  // テスト用のサンプルデータ生成ヘルパー
  const createTestInsight = (date: string, adId: string = 'ad_123'): MetaAdInsight => ({
    ad_id: adId,
    ad_name: `Test Ad ${adId}`,
    campaign_id: 'campaign_123',
    campaign_name: 'Test Campaign',
    adset_id: 'adset_123',
    adset_name: 'Test Adset',
    date_start: date,
    date_stop: date,
    impressions: '1000',
    clicks: '50',
    spend: '100.00',
    reach: '800',
    frequency: '1.25',
    ctr: '5.0',
    cpc: '2.0',
    cpm: '125.0',
    cpp: '0.125',
    actions: [],
    action_values: []
  })

  describe('配信日数カウント機能', () => {
    
    it('should count actual delivery days correctly - 連続7日間配信', () => {
      const data = [
        createTestInsight('2024-01-01'),
        createTestInsight('2024-01-02'),
        createTestInsight('2024-01-03'),
        createTestInsight('2024-01-04'),
        createTestInsight('2024-01-05'),
        createTestInsight('2024-01-06'),
        createTestInsight('2024-01-07')
      ]
      
      const result = analyzeDeliveryPattern(data, {
        start: '2024-01-01',
        end: '2024-01-07'
      })
      
      expect(result.actualDeliveryDays).toBe(7)
      expect(result.totalRequestedDays).toBe(7)
      expect(result.deliveryRatio).toBe(1.0)
    })

    it('should count actual delivery days correctly - 部分配信', () => {
      const data = [
        createTestInsight('2024-01-01'),
        createTestInsight('2024-01-03'),
        createTestInsight('2024-01-05')
      ]
      
      const result = analyzeDeliveryPattern(data, {
        start: '2024-01-01',
        end: '2024-01-07'
      })
      
      expect(result.actualDeliveryDays).toBe(3)
      expect(result.totalRequestedDays).toBe(7)
      expect(result.deliveryRatio).toBe(3/7)
    })

    it('should handle 30-day period correctly', () => {
      // 30日のうち20日配信のケース
      const data = Array.from({ length: 20 }, (_, i) => 
        createTestInsight(`2024-01-${String(i + 1).padStart(2, '0')}`)
      )
      
      const result = analyzeDeliveryPattern(data, {
        start: '2024-01-01',
        end: '2024-01-30'
      })
      
      expect(result.actualDeliveryDays).toBe(20)
      expect(result.totalRequestedDays).toBe(30)
      expect(result.deliveryRatio).toBeCloseTo(20/30)
    })
  })

  describe('配信パターン判定機能', () => {
    
    it('should identify CONTINUOUS delivery pattern', () => {
      const data = [
        createTestInsight('2024-01-01'),
        createTestInsight('2024-01-02'),
        createTestInsight('2024-01-03'),
        createTestInsight('2024-01-04'),
        createTestInsight('2024-01-05')
      ]
      
      const result = analyzeDeliveryPattern(data, {
        start: '2024-01-01',
        end: '2024-01-05'
      })
      
      expect(result.deliveryPattern).toBe('continuous')
      expect(result.deliveryRatio).toBe(1.0)
    })

    it('should identify PARTIAL delivery pattern (>70% coverage)', () => {
      // 10日中8日配信 = 80%
      const data = Array.from({ length: 8 }, (_, i) => 
        createTestInsight(`2024-01-${String(i + 1).padStart(2, '0')}`)
      )
      
      const result = analyzeDeliveryPattern(data, {
        start: '2024-01-01',
        end: '2024-01-10'
      })
      
      expect(result.deliveryPattern).toBe('partial')
      expect(result.deliveryRatio).toBe(0.8)
    })

    it('should identify INTERMITTENT delivery pattern (<70% coverage)', () => {
      // 10日中5日配信 = 50%
      const data = [
        createTestInsight('2024-01-01'),
        createTestInsight('2024-01-03'),
        createTestInsight('2024-01-05'),
        createTestInsight('2024-01-07'),
        createTestInsight('2024-01-09')
      ]
      
      const result = analyzeDeliveryPattern(data, {
        start: '2024-01-01',
        end: '2024-01-10'
      })
      
      expect(result.deliveryPattern).toBe('intermittent')
      expect(result.deliveryRatio).toBe(0.5)
    })

    it('should identify SINGLE delivery pattern', () => {
      const data = [createTestInsight('2024-01-05')]
      
      const result = analyzeDeliveryPattern(data, {
        start: '2024-01-01',
        end: '2024-01-10'
      })
      
      expect(result.deliveryPattern).toBe('single')
      expect(result.actualDeliveryDays).toBe(1)
    })

    it('should identify NONE delivery pattern', () => {
      const data: MetaAdInsight[] = []
      
      const result = analyzeDeliveryPattern(data, {
        start: '2024-01-01',
        end: '2024-01-10'
      })
      
      expect(result.deliveryPattern).toBe('none')
      expect(result.actualDeliveryDays).toBe(0)
      expect(result.deliveryRatio).toBe(0)
    })
  })

  describe('カバレッジ率計算機能', () => {
    
    it('should calculate coverage ratio correctly for various scenarios', () => {
      const testCases = [
        { days: 30, delivered: 30, expectedRatio: 1.0 },
        { days: 30, delivered: 25, expectedRatio: 25/30 },
        { days: 30, delivered: 15, expectedRatio: 0.5 },
        { days: 30, delivered: 10, expectedRatio: 10/30 },
        { days: 7, delivered: 5, expectedRatio: 5/7 },
        { days: 1, delivered: 1, expectedRatio: 1.0 },
        { days: 10, delivered: 0, expectedRatio: 0.0 }
      ]

      testCases.forEach(({ days, delivered, expectedRatio }) => {
        const data = Array.from({ length: delivered }, (_, i) => 
          createTestInsight(`2024-01-${String(i + 1).padStart(2, '0')}`)
        )
        
        const endDate = new Date('2024-01-01')
        endDate.setDate(endDate.getDate() + days - 1)
        
        const result = analyzeDeliveryPattern(data, {
          start: '2024-01-01',
          end: endDate.toISOString().split('T')[0]
        })
        
        expect(result.deliveryRatio).toBeCloseTo(expectedRatio, 3)
      })
    })
  })

  describe('エッジケース処理', () => {
    
    it('should handle 0-day delivery correctly', () => {
      const result = analyzeDeliveryPattern([], {
        start: '2024-01-01',
        end: '2024-01-30'
      })
      
      expect(result.actualDeliveryDays).toBe(0)
      expect(result.deliveryPattern).toBe('none')
      expect(result.deliveryRatio).toBe(0)
      expect(result.firstDeliveryDate).toBeUndefined()
      expect(result.lastDeliveryDate).toBeUndefined()
    })

    it('should handle full-period delivery correctly', () => {
      const data = Array.from({ length: 30 }, (_, i) => 
        createTestInsight(`2024-01-${String(i + 1).padStart(2, '0')}`)
      )
      
      const result = analyzeDeliveryPattern(data, {
        start: '2024-01-01',
        end: '2024-01-30'
      })
      
      expect(result.actualDeliveryDays).toBe(30)
      expect(result.deliveryPattern).toBe('continuous')
      expect(result.deliveryRatio).toBe(1.0)
      expect(result.firstDeliveryDate).toBe('2024-01-01')
      expect(result.lastDeliveryDate).toBe('2024-01-30')
    })

    it('should handle single-day analysis', () => {
      const data = [createTestInsight('2024-01-01')]
      
      const result = analyzeDeliveryPattern(data, {
        start: '2024-01-01',
        end: '2024-01-01'
      })
      
      expect(result.actualDeliveryDays).toBe(1)
      expect(result.totalRequestedDays).toBe(1)
      expect(result.deliveryPattern).toBe('continuous') // 1日中1日配信 = 100%
      expect(result.deliveryRatio).toBe(1.0)
    })

    it('should handle cross-month analysis', () => {
      const data = [
        createTestInsight('2024-01-30'),
        createTestInsight('2024-01-31'),
        createTestInsight('2024-02-01'),
        createTestInsight('2024-02-02')
      ]
      
      const result = analyzeDeliveryPattern(data, {
        start: '2024-01-30',
        end: '2024-02-02'
      })
      
      expect(result.actualDeliveryDays).toBe(4)
      expect(result.totalRequestedDays).toBe(4)
      expect(result.deliveryPattern).toBe('continuous')
      expect(result.firstDeliveryDate).toBe('2024-01-30')
      expect(result.lastDeliveryDate).toBe('2024-02-02')
    })
  })

  describe('配信期間特定機能', () => {
    
    it('should identify first and last delivery dates correctly', () => {
      const data = [
        createTestInsight('2024-01-03'),
        createTestInsight('2024-01-01'), // 最初（ソート後）
        createTestInsight('2024-01-07'),
        createTestInsight('2024-01-05'),
        createTestInsight('2024-01-09')  // 最後（ソート後）
      ]
      
      const result = analyzeDeliveryPattern(data, {
        start: '2024-01-01',
        end: '2024-01-10'
      })
      
      expect(result.firstDeliveryDate).toBe('2024-01-01')
      expect(result.lastDeliveryDate).toBe('2024-01-09')
    })

    it('should handle same first and last delivery date', () => {
      const data = [createTestInsight('2024-01-05')]
      
      const result = analyzeDeliveryPattern(data, {
        start: '2024-01-01',
        end: '2024-01-10'
      })
      
      expect(result.firstDeliveryDate).toBe('2024-01-05')
      expect(result.lastDeliveryDate).toBe('2024-01-05')
    })
  })

  describe('実際のMeta APIデータを想定した統合テスト', () => {
    
    it('should analyze typical Meta campaign delivery pattern', () => {
      // 典型的なMeta広告の配信パターン：30日のうち25日配信
      const deliveryDays = [1, 2, 3, 4, 5, 8, 9, 10, 11, 12, 15, 16, 17, 18, 19, 22, 23, 24, 25, 26, 29, 30, 31]
      const data = deliveryDays.map(day => 
        createTestInsight(`2024-01-${String(day).padStart(2, '0')}`)
      )
      
      const result = analyzeDeliveryPattern(data, {
        start: '2024-01-01',
        end: '2024-01-31'
      })
      
      expect(result.actualDeliveryDays).toBe(23)
      expect(result.totalRequestedDays).toBe(31)
      expect(result.deliveryRatio).toBeCloseTo(23/31, 3)
      expect(result.deliveryPattern).toBe('partial') // 74% > 70%
      expect(result.firstDeliveryDate).toBe('2024-01-01')
      expect(result.lastDeliveryDate).toBe('2024-01-31')
    })

    it('should handle weekend-skipping delivery pattern', () => {
      // 平日のみ配信パターン（土日をスキップ）
      const weekdayDelivery = ['01', '02', '03', '04', '05', '08', '09', '10', '11', '12', '15', '16', '17', '18', '19', '22', '23', '24', '25', '26', '29', '30', '31']
      const data = weekdayDelivery.map(day => 
        createTestInsight(`2024-01-${day}`)
      )
      
      const result = analyzeDeliveryPattern(data, {
        start: '2024-01-01',
        end: '2024-01-31'
      })
      
      expect(result.actualDeliveryDays).toBe(23)
      expect(result.deliveryPattern).toBe('partial')
    })
  })
})