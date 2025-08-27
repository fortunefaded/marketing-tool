/**
 * AdDataAggregator テスト
 * 小規模データセットで動作確認
 */

import { describe, it, expect } from 'vitest'
import { AdDataAggregator } from '../ad-data-aggregator'
import type { MetaApiInsight } from '../../../../docs/design/meta-api-data-aggregation/interfaces'

describe('AdDataAggregator', () => {
  // テスト用の小規模データセット
  const createMockInsights = (): MetaApiInsight[] => {
    const insights: MetaApiInsight[] = []
    
    // 1つの広告、3日間、2プラットフォームのデータ
    // 合計: 1 ad × 3 days × 2 platforms = 6 rows
    const adId = 'ad_123'
    const dates = ['2025-08-25', '2025-08-26', '2025-08-27']
    const platforms = ['facebook', 'instagram']
    
    for (const date of dates) {
      for (const platform of platforms) {
        insights.push({
          ad_id: adId,
          ad_name: 'Test Ad 123',
          campaign_id: 'campaign_001',
          campaign_name: 'Summer Campaign',
          adset_id: 'adset_001',
          adset_name: 'Target Audience A',
          account_id: 'act_123456',
          
          date_start: date,
          date_stop: date,
          
          publisher_platform: platform,
          
          impressions: '1000',
          clicks: '50',
          spend: '10.50',
          reach: '800',
          frequency: '1.25',
          unique_clicks: '45',
          ctr: '5.0',
          cpm: '10.50',
          cpc: '0.21',
          
          conversions: '5',
          conversion_values: '150.00',
          first_conversions: '3',
          
          creative_id: 'creative_001',
          creative_name: 'Summer Sale Creative',
          creative_type: 'IMAGE',
          thumbnail_url: 'https://example.com/thumb.jpg',
          object_type: 'SHARE',
        })
      }
    }
    
    return insights
  }

  describe('基本的な集約機能', () => {
    it('6行のデータを1つのAdPerformanceDataに集約できる', () => {
      const mockInsights = createMockInsights()
      console.log('Input data:', {
        totalRows: mockInsights.length,
        uniqueAds: new Set(mockInsights.map(i => i.ad_id)).size,
      })
      
      const result = AdDataAggregator.aggregate(mockInsights)
      
      expect(result.data).toHaveLength(1)
      expect(result.metadata.processedRows).toBe(6)
      expect(result.metadata.errors).toHaveLength(0)
      
      const ad = result.data[0]
      expect(ad.ad_id).toBe('ad_123')
      expect(ad.ad_name).toBe('Test Ad 123')
      
      console.log('Aggregated result:', {
        adId: ad.ad_id,
        totalImpressions: ad.summary.metrics.impressions,
        totalSpend: ad.summary.metrics.spend,
        aggregationTime: result.metadata.aggregationTime + 'ms',
      })
    })
    
    it('サマリーメトリクスが正しく計算される', () => {
      const mockInsights = createMockInsights()
      const result = AdDataAggregator.aggregate(mockInsights)
      
      const metrics = result.data[0].summary.metrics
      
      // 6行分のデータが合計される
      expect(metrics.impressions).toBe(6000) // 1000 × 6
      expect(metrics.clicks).toBe(300) // 50 × 6
      expect(metrics.spend).toBeCloseTo(63, 1) // 10.50 × 6
      expect(metrics.conversions).toBe(30) // 5 × 6
      expect(metrics.first_conversions).toBe(18) // 3 × 6
      
      // 比率が再計算される
      expect(metrics.ctr).toBeCloseTo(5.0, 1) // 300/6000 × 100
      expect(metrics.cpc).toBeCloseTo(0.21, 2) // 63/300
      expect(metrics.cpm).toBeCloseTo(10.5, 1) // 63/6000 × 1000
      
      console.log('Calculated metrics:', metrics)
    })
    
    it('日別データが正しく集約される', () => {
      const mockInsights = createMockInsights()
      const result = AdDataAggregator.aggregate(mockInsights, {
        includeDailyBreakdown: true,
      })
      
      const dailyBreakdown = result.data[0].dailyBreakdown
      
      // 3日分のデータ
      expect(dailyBreakdown).toHaveLength(3)
      
      // 日付順にソートされている
      expect(dailyBreakdown[0].date).toBe('2025-08-25')
      expect(dailyBreakdown[1].date).toBe('2025-08-26')
      expect(dailyBreakdown[2].date).toBe('2025-08-27')
      
      // 各日のデータは2プラットフォーム分が合計される
      expect(dailyBreakdown[0].impressions).toBe(2000) // 1000 × 2 platforms
      expect(dailyBreakdown[0].clicks).toBe(100) // 50 × 2 platforms
      
      console.log('Daily breakdown:', dailyBreakdown.map(d => ({
        date: d.date,
        impressions: d.impressions,
        ctr: d.ctr.toFixed(2) + '%',
      })))
    })
    
    it('プラットフォーム別データが正しく集約される', () => {
      const mockInsights = createMockInsights()
      const result = AdDataAggregator.aggregate(mockInsights, {
        includePlatformBreakdown: true,
      })
      
      const platformBreakdown = result.data[0].summary.platformBreakdown
      
      expect(platformBreakdown).toBeDefined()
      expect(platformBreakdown?.facebook).toBeDefined()
      expect(platformBreakdown?.instagram).toBeDefined()
      
      // 各プラットフォーム3日分のデータ
      expect(platformBreakdown?.facebook?.impressions).toBe(3000) // 1000 × 3 days
      expect(platformBreakdown?.instagram?.impressions).toBe(3000) // 1000 × 3 days
      
      console.log('Platform breakdown:', {
        facebook: platformBreakdown?.facebook?.impressions,
        instagram: platformBreakdown?.instagram?.impressions,
      })
    })
  })
  
  describe('複数広告の集約', () => {
    it('複数の広告を個別に集約できる', () => {
      const insights: MetaApiInsight[] = []
      
      // 3つの広告、各2日間のデータ
      const adIds = ['ad_001', 'ad_002', 'ad_003']
      
      for (const adId of adIds) {
        for (const date of ['2025-08-26', '2025-08-27']) {
          insights.push({
            ad_id: adId,
            ad_name: `Ad ${adId}`,
            campaign_id: 'campaign_001',
            campaign_name: 'Test Campaign',
            date_start: date,
            date_stop: date,
            impressions: '500',
            clicks: '25',
            spend: '5.00',
            reach: '400',
            frequency: '1.25',
          })
        }
      }
      
      const result = AdDataAggregator.aggregate(insights)
      
      expect(result.data).toHaveLength(3)
      expect(result.metadata.processedRows).toBe(6)
      
      // 各広告が個別に集約されている
      expect(result.data[0].ad_id).toBe('ad_001')
      expect(result.data[1].ad_id).toBe('ad_002')
      expect(result.data[2].ad_id).toBe('ad_003')
      
      // 全体サマリーが正しい
      expect(result.summary.totalAds).toBe(3)
      expect(result.summary.totalImpressions).toBe(3000) // 500 × 2 × 3
      
      console.log('Multiple ads summary:', result.summary)
    })
  })
  
  describe('エラーハンドリング', () => {
    it('欠損データがあっても処理を継続する', () => {
      const insights: MetaApiInsight[] = [
        {
          ad_id: 'ad_001',
          ad_name: 'Ad with missing data',
          date_start: '2025-08-27',
          date_stop: '2025-08-27',
          // impressionsとclicksが欠損
          spend: '10.00',
        },
        {
          ad_id: 'ad_001',
          date_start: '2025-08-26',
          date_stop: '2025-08-26',
          impressions: '1000',
          clicks: '50',
          spend: '10.00',
        },
      ]
      
      const result = AdDataAggregator.aggregate(insights)
      
      expect(result.data).toHaveLength(1)
      expect(result.data[0].summary.metrics.impressions).toBe(1000)
      expect(result.data[0].metadata.dataQuality).toBe('partial')
      
      console.log('Data quality:', result.data[0].metadata.dataQuality)
      console.log('Warnings:', result.data[0].metadata.warnings)
    })
    
    it('異常に高いCTRを検出して警告を出す', () => {
      const insights: MetaApiInsight[] = [
        {
          ad_id: 'ad_001',
          date_start: '2025-08-27',
          date_stop: '2025-08-27',
          impressions: '100',
          clicks: '90',
          ctr: '90.0', // 異常に高いCTR
          spend: '10.00',
        },
      ]
      
      const result = AdDataAggregator.aggregate(insights)
      
      expect(result.data[0].metadata.warnings).toContain('Unusually high CTR detected: 90%')
      
      console.log('Warnings detected:', result.data[0].metadata.warnings)
    })
  })
  
  describe('パフォーマンス測定', () => {
    it('1000広告のデータを3秒以内に処理できる（シミュレーション）', () => {
      const insights: MetaApiInsight[] = []
      const adCount = 100 // テストでは100広告で確認
      const daysCount = 7
      const platformCount = 2
      
      // 100 ads × 7 days × 2 platforms = 1,400 rows
      for (let adIndex = 1; adIndex <= adCount; adIndex++) {
        for (let day = 1; day <= daysCount; day++) {
          for (const platform of ['facebook', 'instagram']) {
            insights.push({
              ad_id: `ad_${adIndex.toString().padStart(4, '0')}`,
              ad_name: `Ad ${adIndex}`,
              campaign_id: 'campaign_001',
              date_start: `2025-08-${day.toString().padStart(2, '0')}`,
              date_stop: `2025-08-${day.toString().padStart(2, '0')}`,
              publisher_platform: platform,
              impressions: String(Math.floor(Math.random() * 10000)),
              clicks: String(Math.floor(Math.random() * 500)),
              spend: String((Math.random() * 100).toFixed(2)),
            })
          }
        }
      }
      
      console.log(`Testing with ${insights.length} rows...`)
      
      const startTime = performance.now()
      const result = AdDataAggregator.aggregate(insights)
      const endTime = performance.now()
      
      const processingTime = endTime - startTime
      
      expect(result.data).toHaveLength(adCount)
      expect(result.metadata.processedRows).toBe(insights.length)
      expect(processingTime).toBeLessThan(1000) // 1秒以内（テスト環境）
      
      console.log('Performance test results:', {
        inputRows: insights.length,
        outputAds: result.data.length,
        processingTime: `${processingTime.toFixed(2)}ms`,
        rowsPerSecond: Math.floor(insights.length / (processingTime / 1000)),
      })
    })
  })
})