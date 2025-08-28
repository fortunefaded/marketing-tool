/**
 * TASK-201: Enhanced Data Structure - TDD Tests
 * 要件: REQ-003 (媒体別指標表示), REQ-006, REQ-007 (データ整合性)
 * 
 * RED Phase: 新しい型定義のテスト作成
 */

import { describe, test, expect } from 'vitest'
import type {
  EnhancedAdPerformanceData,
  PlatformSpecificMetrics,
  DataConsistencyResult,
  GraphDataPoint,
  PlatformBreakdownGraph
} from '../enhanced-data-structure'

describe('TASK-201: Enhanced Data Structure Types', () => {
  
  describe('PlatformSpecificMetrics型定義', () => {
    test('TC-201-001: Facebook/Instagram/Audience Network別のメトリクス構造が正しい', () => {
      // Given: プラットフォーム別メトリクス
      const platformMetrics: PlatformSpecificMetrics = {
        facebook: {
          impressions: 1000,
          clicks: 50,
          spend: 100,
          reach: 800,
          frequency: 1.25,
          ctr: 5.0,
          cpm: 100,
          cpc: 2.0,
          conversions: 5,
          first_conversions: 3,
          cpa: 20,
          roas: 2.5,
          cvr: 10
        },
        instagram: {
          impressions: 2000,
          clicks: 80,
          spend: 150,
          reach: 1600,
          frequency: 1.25,
          ctr: 4.0,
          cpm: 75,
          cpc: 1.875,
          conversions: 8,
          first_conversions: 6,
          cpa: 18.75,
          roas: 2.67,
          cvr: 10
        },
        audience_network: {
          impressions: 500,
          clicks: 15,
          spend: 50,
          reach: 400,
          frequency: 1.25,
          ctr: 3.0,
          cpm: 100,
          cpc: 3.33,
          conversions: 2,
          first_conversions: 1,
          cpa: 25,
          roas: 2.0,
          cvr: 13.33
        }
      }
      
      // Then: 型定義が正しく機能する
      expect(platformMetrics.facebook.impressions).toBe(1000)
      expect(platformMetrics.instagram.ctr).toBe(4.0)
      expect(platformMetrics.audience_network.conversions).toBe(2)
    })
    
    test('TC-201-002: オプショナルプラットフォーム（messenger）が正しく処理される', () => {
      // Given: messenger含むプラットフォームメトリクス
      const platformMetrics: PlatformSpecificMetrics = {
        facebook: {
          impressions: 1000, clicks: 50, spend: 100, reach: 800, frequency: 1.25,
          ctr: 5.0, cpm: 100, cpc: 2.0, conversions: 5, first_conversions: 3,
          cpa: 20, roas: 2.5, cvr: 10
        },
        instagram: {
          impressions: 2000, clicks: 80, spend: 150, reach: 1600, frequency: 1.25,
          ctr: 4.0, cpm: 75, cpc: 1.875, conversions: 8, first_conversions: 6,
          cpa: 18.75, roas: 2.67, cvr: 10
        },
        audience_network: {
          impressions: 500, clicks: 15, spend: 50, reach: 400, frequency: 1.25,
          ctr: 3.0, cpm: 100, cpc: 3.33, conversions: 2, first_conversions: 1,
          cpa: 25, roas: 2.0, cvr: 13.33
        },
        messenger: {
          impressions: 100, clicks: 3, spend: 10, reach: 80, frequency: 1.25,
          ctr: 3.0, cpm: 100, cpc: 3.33, conversions: 1, first_conversions: 1,
          cpa: 10, roas: 1.5, cvr: 33.33
        }
      }
      
      // Then: messenger プラットフォームも正しく処理される
      expect(platformMetrics.messenger?.impressions).toBe(100)
    })
  })

  describe('EnhancedAdPerformanceData型定義', () => {
    test('TC-201-003: 拡張されたAdPerformanceDataがplatformGraphsを含む', () => {
      // Given: 拡張されたAdPerformanceData
      const enhancedData: EnhancedAdPerformanceData = {
        // 既存フィールド
        ad_id: 'ad_123',
        ad_name: 'Test Ad',
        campaign_id: 'camp_123',
        campaign_name: 'Test Campaign',
        adset_id: 'adset_123',
        adset_name: 'Test Adset',
        
        summary: {
          dateRange: { start: '2025-08-01', end: '2025-08-28' },
          metrics: {
            impressions: 3500, clicks: 145, spend: 300, reach: 2880, frequency: 1.25,
            ctr: 4.14, cpm: 85.71, cpc: 2.07, conversions: 15, first_conversions: 10,
            cpa: 20, roas: 2.5, cvr: 10.34
          }
        },
        
        dailyBreakdown: [],
        platformBreakdown: {},
        
        // 新規フィールド: プラットフォーム別グラフデータ
        platformGraphs: {
          ctr: [
            { date: '2025-08-01', facebook: 5.0, instagram: 4.0, audience_network: 3.0 },
            { date: '2025-08-02', facebook: 5.2, instagram: 3.8, audience_network: 3.2 }
          ],
          cpm: [
            { date: '2025-08-01', facebook: 100, instagram: 75, audience_network: 100 },
            { date: '2025-08-02', facebook: 95, instagram: 78, audience_network: 98 }
          ]
        }
      }
      
      // Then: 拡張データ構造が正しく機能する
      expect(enhancedData.platformGraphs.ctr).toHaveLength(2)
      expect(enhancedData.platformGraphs.ctr[0].facebook).toBe(5.0)
      expect(enhancedData.platformGraphs.cpm[1].instagram).toBe(78)
    })
  })

  describe('GraphDataPoint型定義', () => {
    test('TC-201-004: 日別プラットフォーム別データポイントの構造が正しい', () => {
      // Given: グラフデータポイント
      const dataPoint: GraphDataPoint = {
        date: '2025-08-28',
        facebook: 5.5,
        instagram: 4.2,
        audience_network: 3.1,
        messenger: 2.8
      }
      
      // Then: 全プラットフォームのデータが格納される
      expect(dataPoint.date).toBe('2025-08-28')
      expect(dataPoint.facebook).toBe(5.5)
      expect(dataPoint.instagram).toBe(4.2)
      expect(dataPoint.audience_network).toBe(3.1)
      expect(dataPoint.messenger).toBe(2.8)
    })
    
    test('TC-201-005: オプショナルプラットフォームが未定義でも動作する', () => {
      // Given: 一部プラットフォームのみのデータポイント
      const dataPoint: GraphDataPoint = {
        date: '2025-08-28',
        facebook: 5.5,
        instagram: 4.2,
        audience_network: 3.1
        // messenger は未定義
      }
      
      // Then: オプショナルフィールドがundefinedでも型エラーにならない
      expect(dataPoint.messenger).toBeUndefined()
      expect(dataPoint.facebook).toBe(5.5)
    })
  })

  describe('DataConsistencyResult型定義', () => {
    test('TC-201-006: データ整合性チェック結果の構造が正しい', () => {
      // Given: データ整合性チェック結果
      const consistencyResult: DataConsistencyResult = {
        isConsistent: false,
        discrepancies: [
          {
            platform: 'facebook',
            metric: 'impressions',
            expected: 1000,
            actual: 950,
            variance: -5.0,
            severity: 'medium'
          }
        ],
        summary: {
          totalChecks: 12,
          passedChecks: 11,
          failedChecks: 1,
          overallVariance: 0.42
        }
      }
      
      // Then: 整合性結果の構造が正しく機能する
      expect(consistencyResult.isConsistent).toBe(false)
      expect(consistencyResult.discrepancies).toHaveLength(1)
      expect(consistencyResult.discrepancies[0].platform).toBe('facebook')
      expect(consistencyResult.summary.totalChecks).toBe(12)
    })
  })

  describe('型安全性テスト', () => {
    test('TC-201-007: 既存AdPerformanceDataとの互換性確認', () => {
      // Given: 既存のAdPerformanceDataを拡張
      const baseData = {
        ad_id: 'ad_123',
        ad_name: 'Test Ad',
        campaign_id: 'camp_123',
        campaign_name: 'Test Campaign',
        adset_id: 'adset_123',
        adset_name: 'Test Adset',
        
        summary: {
          dateRange: { start: '2025-08-01', end: '2025-08-28' },
          metrics: {
            impressions: 3500, clicks: 145, spend: 300, reach: 2880, frequency: 1.25,
            ctr: 4.14, cpm: 85.71, cpc: 2.07, conversions: 15, first_conversions: 10,
            cpa: 20, roas: 2.5, cvr: 10.34
          }
        },
        
        dailyBreakdown: [],
        platformBreakdown: {}
      }
      
      // When: EnhancedAdPerformanceDataとして拡張
      const enhancedData: EnhancedAdPerformanceData = {
        ...baseData,
        platformGraphs: {
          ctr: [
            { date: '2025-08-01', facebook: 5.0, instagram: 4.0, audience_network: 3.0 }
          ]
        }
      }
      
      // Then: 既存フィールドが保持されている
      expect(enhancedData.ad_id).toBe('ad_123')
      expect(enhancedData.summary.metrics.impressions).toBe(3500)
      expect(enhancedData.platformGraphs.ctr![0].facebook).toBe(5.0)
    })
    
    test('TC-201-008: プラットフォーム別メトリクス必須フィールドの確認', () => {
      // Given: 完全なプラットフォーム別メトリクス
      const metrics: PlatformSpecificMetrics = {
        facebook: {
          impressions: 1000, clicks: 50, spend: 100, reach: 800, frequency: 1.25,
          ctr: 5.0, cpm: 100, cpc: 2.0, conversions: 5, first_conversions: 3,
          cpa: 20, roas: 2.5, cvr: 10
        },
        instagram: {
          impressions: 2000, clicks: 80, spend: 150, reach: 1600, frequency: 1.25,
          ctr: 4.0, cpm: 75, cpc: 1.875, conversions: 8, first_conversions: 6,
          cpa: 18.75, roas: 2.67, cvr: 10
        },
        audience_network: {
          impressions: 500, clicks: 15, spend: 50, reach: 400, frequency: 1.25,
          ctr: 3.0, cpm: 100, cpc: 3.33, conversions: 2, first_conversions: 1,
          cpa: 25, roas: 2.0, cvr: 13.33
        }
      }
      
      // Then: 全必須プラットフォームが存在する
      expect(metrics.facebook).toBeDefined()
      expect(metrics.instagram).toBeDefined()
      expect(metrics.audience_network).toBeDefined()
      expect(typeof metrics.messenger).toBe('undefined') // オプショナル
    })
    
    test('TC-201-009: EnhancedAggregationOptionsの既存互換性', () => {
      // Given: 拡張されたAggregationOptions
      const options: EnhancedAggregationOptions = {
        // 既存フィールド
        groupBy: 'ad',
        includePlatformBreakdown: true,
        includeDailyBreakdown: true,
        calculateFatigue: false,
        
        // 新規拡張フィールド
        includeGraphData: true,
        performConsistencyCheck: true,
        graphMetrics: ['ctr', 'cpm', 'cpa']
      }
      
      // Then: 既存オプションと新規オプション両方が機能する
      expect(options.groupBy).toBe('ad')
      expect(options.includePlatformBreakdown).toBe(true)
      expect(options.includeGraphData).toBe(true)
      expect(options.graphMetrics).toContain('ctr')
    })
  })
})