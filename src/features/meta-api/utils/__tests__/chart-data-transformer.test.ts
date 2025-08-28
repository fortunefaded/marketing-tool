/**
 * TASK-203: Chart Data Transformer - TDD Tests
 * 要件: REQ-002, REQ-003 (媒体別グラフ表示)
 * 
 * RED Phase: チャートデータ変換機能のテスト作成
 */

import { describe, test, expect } from 'vitest'
import { ChartDataTransformer } from '../chart-data-transformer'
import type {
  EnhancedAdPerformanceData,
  GraphDataPoint
} from '../../types/enhanced-data-structure'

describe('TASK-203: Chart Data Transformer', () => {
  
  // テスト用モックデータ
  const mockEnhancedData: EnhancedAdPerformanceData = {
    ad_id: 'ad_123',
    ad_name: 'Test Ad',
    campaign_id: 'camp_123',
    campaign_name: 'Test Campaign',
    adset_id: 'adset_123',
    adset_name: 'Test Adset',
    
    summary: {
      dateRange: { start: '2025-08-01', end: '2025-08-03' },
      metrics: {
        impressions: 3600, clicks: 150, spend: 300, reach: 2880, frequency: 1.25,
        ctr: 4.17, cpm: 83.33, cpc: 2.0, conversions: 15, first_conversions: 10,
        cpa: 20, roas: 2.5, cvr: 10
      }
    },
    
    dailyBreakdown: [],
    platformBreakdown: {},
    
    // プラットフォーム別グラフデータ
    platformGraphs: {
      ctr: [
        { date: '2025-08-01', facebook: 5.0, instagram: 4.0, audience_network: 3.0 },
        { date: '2025-08-02', facebook: 5.2, instagram: 3.8, audience_network: 3.2 },
        { date: '2025-08-03', facebook: 4.8, instagram: 4.2, audience_network: 2.9 }
      ],
      cpm: [
        { date: '2025-08-01', facebook: 100, instagram: 75, audience_network: 120 },
        { date: '2025-08-02', facebook: 95, instagram: 78, audience_network: 115 },
        { date: '2025-08-03', facebook: 105, instagram: 72, audience_network: 125 }
      ]
    }
  }

  describe('基本変換機能', () => {
    test('TC-203-001: Rechartsライン用データ形式に正しく変換される', () => {
      // Given: プラットフォーム別グラフデータ
      const graphData = mockEnhancedData.platformGraphs.ctr!
      
      // When: Rechartsライン形式に変換
      const rechartsData = ChartDataTransformer.toRechartsLineData(graphData)
      
      // Then: Recharts形式のデータ配列が生成される
      expect(rechartsData).toHaveLength(3) // 3日分
      expect(rechartsData[0]).toEqual({
        date: '2025-08-01',
        Facebook: 5.0,
        Instagram: 4.0,
        'Audience Network': 3.0
      })
      expect(rechartsData[1]).toEqual({
        date: '2025-08-02',
        Facebook: 5.2,
        Instagram: 3.8,
        'Audience Network': 3.2
      })
    })
    
    test('TC-203-002: プラットフォーム名の日本語ラベル化が正しく動作する', () => {
      // Given: プラットフォーム別データ
      const graphData: GraphDataPoint[] = [
        { date: '2025-08-01', facebook: 100, instagram: 80, audience_network: 60, messenger: 40 }
      ]
      
      // When: 日本語ラベル付きで変換
      const rechartsData = ChartDataTransformer.toRechartsLineData(graphData, { useJapaneseLabels: true })
      
      // Then: 日本語ラベルが適用される
      expect(rechartsData[0]).toEqual({
        date: '2025-08-01',
        'Facebook': 100,
        'Instagram': 80,
        'Audience Network': 60,
        'Messenger': 40
      })
    })
  })

  describe('複数指標変換機能', () => {
    test('TC-203-003: 複数指標のチャートデータセットが正しく生成される', () => {
      // Given: 複数指標のプラットフォームグラフデータ
      const platformGraphs = mockEnhancedData.platformGraphs
      
      // When: 複数指標データセットを生成
      const chartDatasets = ChartDataTransformer.createMultiMetricDatasets(platformGraphs, ['ctr', 'cpm'])
      
      // Then: 各指標のデータセットが生成される
      expect(chartDatasets).toHaveProperty('ctr')
      expect(chartDatasets).toHaveProperty('cpm')
      expect(chartDatasets.ctr).toHaveLength(3) // 3日分
      expect(chartDatasets.cpm).toHaveLength(3)
      
      // CTRデータの確認
      expect(chartDatasets.ctr[0]).toEqual({
        date: '2025-08-01',
        Facebook: 5.0,
        Instagram: 4.0,
        'Audience Network': 3.0
      })
      
      // CPMデータの確認
      expect(chartDatasets.cpm[0]).toEqual({
        date: '2025-08-01',
        Facebook: 100,
        Instagram: 75,
        'Audience Network': 120
      })
    })
    
    test('TC-203-004: 指標別カスタム設定が適用される', () => {
      // Given: カスタム設定付きの変換オプション
      const options = {
        metricConfigs: {
          ctr: { color: 'blue', unit: '%', decimals: 1 },
          cpm: { color: 'red', unit: '円', decimals: 0 }
        }
      }
      
      // When: カスタム設定で変換
      const result = ChartDataTransformer.createMultiMetricDatasets(
        mockEnhancedData.platformGraphs, 
        ['ctr', 'cpm'], 
        options
      )
      
      // Then: メタデータにカスタム設定が含まれる
      expect(result._metadata).toBeDefined()
      expect(result._metadata.ctr).toEqual({
        color: 'blue',
        unit: '%',
        decimals: 1
      })
    })
  })

  describe('プラットフォーム色分け機能', () => {
    test('TC-203-005: プラットフォーム別デフォルト色設定が適用される', () => {
      // Given: プラットフォーム別データ
      const graphData = mockEnhancedData.platformGraphs.ctr!
      
      // When: 色設定付きで変換
      const result = ChartDataTransformer.toRechartsLineDataWithColors(graphData)
      
      // Then: プラットフォーム別色設定が含まれる
      expect(result.data).toHaveLength(3)
      expect(result.colors).toEqual({
        Facebook: '#1877F2', // Facebook Blue
        Instagram: '#E4405F', // Instagram Pink
        'Audience Network': '#42B883', // Audience Network Green
        Messenger: '#0084FF' // Messenger Blue
      })
    })
    
    test('TC-203-006: カスタム色設定が正しく適用される', () => {
      // Given: カスタム色設定
      const customColors = {
        Facebook: '#FF0000',
        Instagram: '#00FF00',
        'Audience Network': '#0000FF'
      }
      
      // When: カスタム色で変換
      const result = ChartDataTransformer.toRechartsLineDataWithColors(
        mockEnhancedData.platformGraphs.ctr!, 
        { customColors }
      )
      
      // Then: カスタム色が適用される
      expect(result.colors.Facebook).toBe('#FF0000')
      expect(result.colors.Instagram).toBe('#00FF00')
      expect(result.colors['Audience Network']).toBe('#0000FF')
    })
  })

  describe('エラーハンドリングと境界値テスト', () => {
    test('TC-203-007: 空のグラフデータに対する適切な処理', () => {
      // Given: 空のグラフデータ
      const emptyData: GraphDataPoint[] = []
      
      // When: 変換実行
      const result = ChartDataTransformer.toRechartsLineData(emptyData)
      
      // Then: 空配列が返される
      expect(result).toEqual([])
    })
    
    test('TC-203-008: 不完全なプラットフォームデータの処理', () => {
      // Given: 一部プラットフォームのみのデータ
      const partialData: GraphDataPoint[] = [
        { date: '2025-08-01', facebook: 5.0 }, // instagram, audience_network は未定義
        { date: '2025-08-02', facebook: 5.2, instagram: 3.8 } // audience_network は未定義
      ]
      
      // When: 変換実行
      const result = ChartDataTransformer.toRechartsLineData(partialData)
      
      // Then: 未定義のプラットフォームは除外される
      expect(result[0]).toEqual({
        date: '2025-08-01',
        Facebook: 5.0
      })
      expect(result[1]).toEqual({
        date: '2025-08-02',
        Facebook: 5.2,
        Instagram: 3.8
      })
    })
    
    test('TC-203-009: 無効な日付フォーマットに対するフォールバック処理', () => {
      // Given: 無効な日付を含むデータ
      const invalidDateData: GraphDataPoint[] = [
        { date: '2025-08-01', facebook: 5.0, instagram: 4.0 },
        { date: 'invalid-date', facebook: 5.2, instagram: 3.8 },
        { date: '2025-08-03', facebook: 4.8, instagram: 4.2 }
      ]
      
      // When: 変換実行
      const result = ChartDataTransformer.toRechartsLineData(invalidDateData)
      
      // Then: 無効な日付のエントリは除外されるか、適切にフォールバックされる
      expect(result).toHaveLength(3) // すべてのエントリが保持される（日付はそのまま）
      expect(result[1].date).toBe('invalid-date') // 無効でも保持
    })
  })

  describe('パフォーマンステスト', () => {
    test('TC-203-010: 大量データの変換パフォーマンス', () => {
      // Given: 大量の時系列データ（30日分）
      const largeDataset: GraphDataPoint[] = Array.from({ length: 30 }, (_, i) => ({
        date: `2025-08-${String(i + 1).padStart(2, '0')}`,
        facebook: Math.random() * 10,
        instagram: Math.random() * 10,
        audience_network: Math.random() * 10,
        messenger: Math.random() * 10
      }))
      
      // When: パフォーマンス測定付きで変換
      const startTime = performance.now()
      const result = ChartDataTransformer.toRechartsLineData(largeDataset)
      const endTime = performance.now()
      
      // Then: 適切な時間内で処理が完了する（100ms以内）
      expect(endTime - startTime).toBeLessThan(100)
      expect(result).toHaveLength(30)
    })
  })
})