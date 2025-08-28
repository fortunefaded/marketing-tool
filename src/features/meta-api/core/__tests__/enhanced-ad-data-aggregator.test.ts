/**
 * TASK-202: Enhanced AdDataAggregator - TDD Tests
 * 要件: REQ-003 (媒体別集約), REQ-006, REQ-007 (データ整合性)
 * 
 * RED Phase: 拡張集約機能のテスト作成
 */

import { describe, test, expect, beforeEach } from 'vitest'
import { EnhancedAdDataAggregator } from '../enhanced-ad-data-aggregator'
import type {
  EnhancedAggregationOptions,
  EnhancedAggregationResult,
  EnhancedAdPerformanceData,
  DataConsistencyResult
} from '../../types/enhanced-data-structure'
import type { MetaApiInsight } from '../ad-data-aggregator'

describe('TASK-202: Enhanced AdDataAggregator', () => {
  
  // テスト用モックデータ
  let mockInsights: MetaApiInsight[]
  
  beforeEach(() => {
    mockInsights = [
      // Facebook - Day 1
      {
        ad_id: 'ad_123', ad_name: 'Test Ad', campaign_id: 'camp_123',
        campaign_name: 'Test Campaign', adset_id: 'adset_123', adset_name: 'Test Adset',
        account_id: 'acc_123', date_start: '2025-08-01', date_stop: '2025-08-01',
        publisher_platform: 'facebook',
        impressions: '1000', clicks: '50', spend: '100',
        reach: '800', frequency: '1.25', unique_clicks: '45',
        ctr: '5.0', cpm: '100', cpc: '2.0',
        conversions: '5', conversion_values: '125', first_conversions: '3'
      },
      // Instagram - Day 1
      {
        ad_id: 'ad_123', ad_name: 'Test Ad', campaign_id: 'camp_123',
        campaign_name: 'Test Campaign', adset_id: 'adset_123', adset_name: 'Test Adset',
        account_id: 'acc_123', date_start: '2025-08-01', date_stop: '2025-08-01',
        publisher_platform: 'instagram',
        impressions: '2000', clicks: '80', spend: '150',
        reach: '1600', frequency: '1.25', unique_clicks: '70',
        ctr: '4.0', cpm: '75', cpc: '1.875',
        conversions: '8', conversion_values: '200', first_conversions: '6'
      },
      // Audience Network - Day 1
      {
        ad_id: 'ad_123', ad_name: 'Test Ad', campaign_id: 'camp_123',
        campaign_name: 'Test Campaign', adset_id: 'adset_123', adset_name: 'Test Adset',
        account_id: 'acc_123', date_start: '2025-08-01', date_stop: '2025-08-01',
        publisher_platform: 'audience_network',
        impressions: '500', clicks: '15', spend: '50',
        reach: '400', frequency: '1.25', unique_clicks: '12',
        ctr: '3.0', cpm: '100', cpc: '3.33',
        conversions: '2', conversion_values: '40', first_conversions: '1'
      },
      // Facebook - Day 2
      {
        ad_id: 'ad_123', ad_name: 'Test Ad', campaign_id: 'camp_123',
        campaign_name: 'Test Campaign', adset_id: 'adset_123', adset_name: 'Test Adset',
        account_id: 'acc_123', date_start: '2025-08-02', date_stop: '2025-08-02',
        publisher_platform: 'facebook',
        impressions: '1100', clicks: '55', spend: '110',
        reach: '850', frequency: '1.29', unique_clicks: '50',
        ctr: '5.0', cpm: '100', cpc: '2.0',
        conversions: '6', conversion_values: '150', first_conversions: '4'
      }
    ]
  })

  describe('基本拡張集約機能', () => {
    test('TC-202-001: EnhancedAggregationOptionsによる拡張集約が正常動作する', () => {
      // Given: 拡張集約オプション
      const options: EnhancedAggregationOptions = {
        groupBy: 'ad',
        includePlatformBreakdown: true,
        includeDailyBreakdown: true,
        calculateFatigue: false,
        includeGraphData: true,
        performConsistencyCheck: true,
        graphMetrics: ['ctr', 'cpm', 'cpa']
      }
      
      // When: 拡張集約実行
      const result: EnhancedAggregationResult = EnhancedAdDataAggregator.aggregateEnhanced(
        mockInsights,
        options
      )
      
      // Then: 拡張機能が正常動作する
      expect(result.data).toHaveLength(1) // 1つの広告
      expect(result.data[0].platformGraphs).toBeDefined()
      expect(result.data[0].platformGraphs.ctr).toHaveLength(2) // 2日分
      expect(result.consistencyResults).toHaveLength(1)
      expect(result.metadata.graphDataGenerated).toBe(true)
      expect(result.metadata.consistencyCheckPerformed).toBe(true)
    })
    
    test('TC-202-002: プラットフォーム別グラフデータが正しく生成される', () => {
      // Given: グラフデータ生成オプション
      const options: EnhancedAggregationOptions = {
        groupBy: 'ad', includePlatformBreakdown: true, includeDailyBreakdown: true,
        calculateFatigue: false, includeGraphData: true, performConsistencyCheck: false,
        graphMetrics: ['ctr', 'cpm']
      }
      
      // When: 集約実行
      const result = EnhancedAdDataAggregator.aggregateEnhanced(mockInsights, options)
      const adData = result.data[0]
      
      // Then: プラットフォーム別グラフデータが正しく生成される
      expect(adData.platformGraphs.ctr).toBeDefined()
      expect(adData.platformGraphs.cpm).toBeDefined()
      
      // Day 1のCTRデータ
      const day1Ctr = adData.platformGraphs.ctr![0]
      expect(day1Ctr.date).toBe('2025-08-01')
      expect(day1Ctr.facebook).toBe(5.0)
      expect(day1Ctr.instagram).toBe(4.0)
      expect(day1Ctr.audience_network).toBe(3.0)
      
      // Day 1のCPMデータ
      const day1Cpm = adData.platformGraphs.cpm![0]
      expect(day1Cpm.facebook).toBe(100)
      expect(day1Cpm.instagram).toBe(75)
      expect(day1Cpm.audience_network).toBe(100)
    })
  })

  describe('データ整合性チェック機能', () => {
    test('TC-202-003: データ整合性チェックが正常に実行される', () => {
      // Given: 整合性チェックオプション
      const options: EnhancedAggregationOptions = {
        groupBy: 'ad', includePlatformBreakdown: true, includeDailyBreakdown: true,
        calculateFatigue: false, includeGraphData: false, performConsistencyCheck: true,
        graphMetrics: []
      }
      
      // When: 集約実行（整合性チェック有効）
      const result = EnhancedAdDataAggregator.aggregateEnhanced(mockInsights, options)
      
      // Then: 整合性チェック結果が生成される
      expect(result.consistencyResults).toHaveLength(1)
      const consistencyResult = result.consistencyResults[0]
      expect(consistencyResult.isConsistent).toBeDefined()
      expect(consistencyResult.summary.totalChecks).toBeGreaterThan(0)
      expect(result.metadata.consistencyCheckPerformed).toBe(true)
    })
    
    test('TC-202-004: 丸め誤差調整機能が動作する', () => {
      // Given: 丸め誤差が含まれるデータ（意図的に作成）
      const inconsistentData = [...mockInsights]
      // Facebookのspendを微調整してわずかな誤差を作成
      inconsistentData[0].spend = '99.99' // 100から99.99に変更
      
      const options: EnhancedAggregationOptions = {
        groupBy: 'ad', includePlatformBreakdown: true, includeDailyBreakdown: true,
        calculateFatigue: false, includeGraphData: false, performConsistencyCheck: true,
        graphMetrics: []
      }
      
      // When: 集約実行
      const result = EnhancedAdDataAggregator.aggregateEnhanced(inconsistentData, options)
      
      // Then: 丸め誤差調整が実行される
      const consistencyResult = result.consistencyResults[0]
      // 軽微な誤差は自動調整されるか警告レベルで報告される
      expect(consistencyResult.discrepancies.filter(d => d.severity === 'high')).toHaveLength(0)
    })
  })

  describe('プラットフォーム別メトリクス計算', () => {
    test('TC-202-005: プラットフォーム別の詳細メトリクスが正しく計算される', () => {
      // Given: 詳細メトリクス生成オプション
      const options: EnhancedAggregationOptions = {
        groupBy: 'ad', includePlatformBreakdown: true, includeDailyBreakdown: true,
        calculateFatigue: false, includeGraphData: false, performConsistencyCheck: false,
        graphMetrics: []
      }
      
      // When: 集約実行
      const result = EnhancedAdDataAggregator.aggregateEnhanced(mockInsights, options)
      const adData = result.data[0]
      
      // Then: プラットフォーム別詳細メトリクスが正しく計算される
      expect(adData.detailedPlatformMetrics).toBeDefined()
      const platformMetrics = adData.detailedPlatformMetrics!
      
      // Facebook合計（Day1 + Day2）
      expect(platformMetrics.facebook.impressions).toBe(2100) // 1000 + 1100
      expect(platformMetrics.facebook.clicks).toBe(105) // 50 + 55
      expect(platformMetrics.facebook.spend).toBe(210) // 100 + 110
      expect(platformMetrics.facebook.ctr).toBeCloseTo(5.0, 1) // 105/2100*100
      
      // Instagram（Day1のみ）
      expect(platformMetrics.instagram.impressions).toBe(2000)
      expect(platformMetrics.instagram.clicks).toBe(80)
      expect(platformMetrics.instagram.ctr).toBe(4.0)
    })
    
    test('TC-202-006: 複数指標の時系列グラフデータが正確に生成される', () => {
      // Given: 複数指標のグラフ生成オプション
      const options: EnhancedAggregationOptions = {
        groupBy: 'ad', includePlatformBreakdown: true, includeDailyBreakdown: true,
        calculateFatigue: false, includeGraphData: true, performConsistencyCheck: false,
        graphMetrics: ['ctr', 'cpm', 'cpa', 'roas']
      }
      
      // When: 集約実行
      const result = EnhancedAdDataAggregator.aggregateEnhanced(mockInsights, options)
      const adData = result.data[0]
      
      // Then: 指定された全指標のグラフデータが生成される
      expect(adData.platformGraphs.ctr).toBeDefined()
      expect(adData.platformGraphs.cpm).toBeDefined()
      expect(adData.platformGraphs.cpa).toBeDefined()
      expect(adData.platformGraphs.roas).toBeDefined()
      
      // 各指標に2日分のデータが存在
      expect(adData.platformGraphs.ctr).toHaveLength(2)
      expect(adData.platformGraphs.cpm).toHaveLength(2)
      
      // Day2のFacebookデータが正しく計算されている
      const day2Data = adData.platformGraphs.ctr![1]
      expect(day2Data.date).toBe('2025-08-02')
      expect(day2Data.facebook).toBe(5.0) // 55/1100*100
    })
  })

  describe('エラーハンドリングと境界値テスト', () => {
    test('TC-202-007: 空のinsightsデータに対する適切なエラーハンドリング', () => {
      // Given: 空のデータ
      const emptyInsights: MetaApiInsight[] = []
      const options: EnhancedAggregationOptions = {
        groupBy: 'ad', includePlatformBreakdown: true, includeDailyBreakdown: true,
        calculateFatigue: false, includeGraphData: true, performConsistencyCheck: true,
        graphMetrics: ['ctr']
      }
      
      // When: 集約実行
      const result = EnhancedAdDataAggregator.aggregateEnhanced(emptyInsights, options)
      
      // Then: エラーハンドリングが適切に動作する
      expect(result.data).toHaveLength(0)
      expect(result.metadata.totalInputRows).toBe(0)
      expect(result.metadata.graphDataGenerated).toBe(false)
    })
    
    test('TC-202-008: 不完全なプラットフォームデータに対する処理', () => {
      // Given: 一部プラットフォームのみのデータ
      const partialData = mockInsights.filter(insight => 
        insight.publisher_platform === 'facebook'
      )
      
      const options: EnhancedAggregationOptions = {
        groupBy: 'ad', includePlatformBreakdown: true, includeDailyBreakdown: true,
        calculateFatigue: false, includeGraphData: true, performConsistencyCheck: true,
        graphMetrics: ['ctr', 'cpm']
      }
      
      // When: 集約実行
      const result = EnhancedAdDataAggregator.aggregateEnhanced(partialData, options)
      
      // Then: 利用可能なプラットフォームのみでグラフデータが生成される
      const adData = result.data[0]
      const day1Ctr = adData.platformGraphs.ctr![0]
      expect(day1Ctr.facebook).toBe(5.0)
      expect(day1Ctr.instagram).toBeUndefined()
      expect(day1Ctr.audience_network).toBeUndefined()
    })
  })
})