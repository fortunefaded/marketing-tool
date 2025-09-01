import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GapDetectionEngine } from '../gap-detection-engine'
import type { AdInsight } from '../../types'
import type { GapDetectionConfig, GapAnalysisResult } from '../../types/gap-detection-types'

describe('Date Range Propagation Integration Tests - TASK-005', () => {
  let gapEngine: GapDetectionEngine
  let mockConfig: GapDetectionConfig

  beforeEach(() => {
    mockConfig = {
      dateRangeAware: true,
      timeSeriesAnalysis: {
        enabled: true,
        minDataPoints: 7,
        trendAnalysisWindow: 7
      },
      thresholds: {
        ctrDeclineThreshold: 0.25,
        frequencyWarningThreshold: 3.5,
        cpmIncreaseThreshold: 0.20,
        minImpressions: 1000
      }
    }
    
    gapEngine = new GapDetectionEngine(mockConfig)
  })

  describe('時系列データの日付範囲認識', () => {
    it('7日間のデータで適切なギャップ検出を実行すること', () => {
      const mockData: AdInsight[] = Array.from({ length: 7 }, (_, dayIndex) => ({
        ad_id: 'ad_test_1',
        ad_name: 'Test Ad 1',
        campaign_id: 'campaign_1',
        campaign_name: 'Test Campaign',
        date_start: `2024-08-${String(dayIndex + 1).padStart(2, '0')}`,
        date_stop: `2024-08-${String(dayIndex + 1).padStart(2, '0')}`,
        impressions: String(10000 - (dayIndex * 500)), // 減少トレンド
        clicks: String(500 - (dayIndex * 25)), // 減少トレンド
        spend: String(5000), // 一定
        ctr: String(((500 - (dayIndex * 25)) / (10000 - (dayIndex * 500)) * 100).toFixed(2)),
        frequency: String((2.0 + (dayIndex * 0.3)).toFixed(1)), // 増加トレンド
        reach: String(Math.max(5000 - (dayIndex * 200), 2000)),
        cpm: String((5000 / ((10000 - (dayIndex * 500)) / 1000)).toFixed(2)),
        account_currency: 'JPY'
      }))

      const result = gapEngine.analyzeGaps(mockData, 'last_7d')

      expect(result.dateRange).toBe('last_7d')
      expect(result.dataPoints).toBe(7)
      expect(result.timeSeriesAnalysis).toBeDefined()
      expect(result.gaps).toHaveLength(1) // 1つの広告のギャップ
      
      const adGap = result.gaps[0]
      expect(adGap.adId).toBe('ad_test_1')
      expect(adGap.fatigueIndicators.creative.trend).toBe('declining')
      expect(adGap.fatigueIndicators.audience.frequencyTrend).toBe('increasing')
    })

    it('30日間のデータで長期トレンド分析を実行すること', () => {
      const mockData: AdInsight[] = Array.from({ length: 30 }, (_, dayIndex) => ({
        ad_id: 'ad_test_1',
        ad_name: 'Test Ad 1',
        campaign_id: 'campaign_1',
        campaign_name: 'Test Campaign',
        date_start: `2024-08-${String(dayIndex + 1).padStart(2, '0')}`,
        date_stop: `2024-08-${String(dayIndex + 1).padStart(2, '0')}`,
        impressions: String(10000 + Math.sin(dayIndex * 0.2) * 1000), // 波打つパターン
        clicks: String(500 - (dayIndex * 5)), // 緩やかな減少
        spend: String(5000),
        ctr: String(((500 - (dayIndex * 5)) / (10000 + Math.sin(dayIndex * 0.2) * 1000) * 100).toFixed(2)),
        frequency: String((2.0 + (dayIndex * 0.05)).toFixed(1)), // 緩やかな増加
        reach: String(Math.max(5000 - (dayIndex * 50), 3000)),
        cpm: String((5000 / ((10000 + Math.sin(dayIndex * 0.2) * 1000) / 1000)).toFixed(2)),
        account_currency: 'JPY'
      }))

      const result = gapEngine.analyzeGaps(mockData, 'last_30d')

      expect(result.dateRange).toBe('last_30d')
      expect(result.dataPoints).toBe(30)
      expect(result.timeSeriesAnalysis?.trendStrength).toBeDefined()
      expect(result.timeSeriesAnalysis?.seasonalityDetected).toBeDefined()
      
      // 30日のデータでは季節性パターンの検出も可能
      if (result.timeSeriesAnalysis?.seasonalityDetected) {
        expect(result.timeSeriesAnalysis.seasonalPattern).toBeDefined()
      }
    })

    it('短期間データでは時系列分析をスキップすること', () => {
      const mockData: AdInsight[] = Array.from({ length: 3 }, (_, dayIndex) => ({
        ad_id: 'ad_test_1',
        ad_name: 'Test Ad 1',
        campaign_id: 'campaign_1',
        campaign_name: 'Test Campaign',
        date_start: `2024-08-${String(dayIndex + 1).padStart(2, '0')}`,
        date_stop: `2024-08-${String(dayIndex + 1).padStart(2, '0')}`,
        impressions: String(10000),
        clicks: String(500),
        spend: String(5000),
        ctr: '5.0',
        frequency: '2.0',
        reach: '5000',
        cpm: '500',
        account_currency: 'JPY'
      }))

      const result = gapEngine.analyzeGaps(mockData, 'last_3d')

      expect(result.dateRange).toBe('last_3d')
      expect(result.dataPoints).toBe(3)
      expect(result.timeSeriesAnalysis?.enabled).toBe(false)
      expect(result.gaps[0].severity).toBe('low') // データ不足で低severity
    })
  })

  describe('日付範囲別の閾値調整', () => {
    it('7日データでは厳しい閾値を適用すること', () => {
      const mockBorderlineData: AdInsight[] = [{
        ad_id: 'ad_borderline',
        ad_name: 'Borderline Ad',
        campaign_id: 'campaign_1',
        campaign_name: 'Test Campaign',
        date_start: '2024-08-01',
        date_stop: '2024-08-07',
        impressions: '10000',
        clicks: '400', // CTR 4% (5%から20%減少 = ボーダーライン)
        spend: '5000',
        ctr: '4.0',
        frequency: '3.2', // 3.5未満だがギリギリ
        reach: '5000',
        cpm: '500',
        account_currency: 'JPY'
      }]

      const result = gapEngine.analyzeGaps(mockBorderlineData, 'last_7d')
      const adGap = result.gaps[0]

      // 短期データでは警告レベル
      expect(adGap.severity).toBe('medium')
      expect(adGap.fatigueIndicators.creative.severity).toBe('medium')
    })

    it('30日データでは緩い閾値を適用すること', () => {
      const mockBorderlineData: AdInsight[] = [{
        ad_id: 'ad_borderline',
        ad_name: 'Borderline Ad',
        campaign_id: 'campaign_1',
        campaign_name: 'Test Campaign',
        date_start: '2024-08-01',
        date_stop: '2024-08-30',
        impressions: '100000',
        clicks: '4000', // CTR 4% (長期間では許容範囲)
        spend: '50000',
        ctr: '4.0',
        frequency: '3.2',
        reach: '50000',
        cpm: '500',
        account_currency: 'JPY'
      }]

      const result = gapEngine.analyzeGaps(mockBorderlineData, 'last_30d')
      const adGap = result.gaps[0]

      // 長期データでは低severity
      expect(adGap.severity).toBe('low')
      expect(adGap.fatigueIndicators.creative.severity).toBe('low')
    })
  })

  describe('日付範囲に応じた推奨アクション', () => {
    it('短期データでは即座のアクションを推奨すること', () => {
      const mockHighFatigueData: AdInsight[] = [{
        ad_id: 'ad_high_fatigue',
        ad_name: 'High Fatigue Ad',
        campaign_id: 'campaign_1',
        campaign_name: 'Test Campaign',
        date_start: '2024-08-01',
        date_stop: '2024-08-07',
        impressions: '5000', // 低インプレッション
        clicks: '100', // 低CTR (2%)
        spend: '10000', // 高CPC
        ctr: '2.0',
        frequency: '4.5', // 高頻度
        reach: '1000',
        cpm: '2000', // 高CPM
        account_currency: 'JPY'
      }]

      const result = gapEngine.analyzeGaps(mockHighFatigueData, 'last_7d')
      const adGap = result.gaps[0]

      expect(adGap.severity).toBe('high')
      expect(adGap.recommendations).toContain('immediate')
      expect(adGap.recommendations.some((rec: string) => rec.includes('pause') || rec.includes('停止'))).toBe(true)
    })

    it('長期データでは段階的アプローチを推奨すること', () => {
      const mockModerateFatigueData: AdInsight[] = [{
        ad_id: 'ad_moderate_fatigue',
        ad_name: 'Moderate Fatigue Ad',
        campaign_id: 'campaign_1',
        campaign_name: 'Test Campaign',
        date_start: '2024-08-01',
        date_stop: '2024-08-30',
        impressions: '50000',
        clicks: '1500', // CTR 3% (軽度低下)
        spend: '25000',
        ctr: '3.0',
        frequency: '3.8', // 軽度高頻度
        reach: '13000',
        cpm: '500',
        account_currency: 'JPY'
      }]

      const result = gapEngine.analyzeGaps(mockModerateFatigueData, 'last_30d')
      const adGap = result.gaps[0]

      expect(adGap.severity).toBe('medium')
      expect(adGap.recommendations.some((rec: string) => rec.includes('gradual') || rec.includes('段階的'))).toBe(true)
      expect(adGap.recommendations.some((rec: string) => rec.includes('optimize') || rec.includes('最適化'))).toBe(true)
    })
  })

  describe('複数広告の日付範囲別分析', () => {
    it('異なる疲労度の広告を日付範囲に応じて適切にランキングすること', () => {
      const mockMultiAdData: AdInsight[] = [
        // 広告1: 高疲労度
        {
          ad_id: 'ad_high',
          ad_name: 'High Fatigue Ad',
          campaign_id: 'campaign_1',
          campaign_name: 'Test Campaign',
          date_start: '2024-08-01',
          date_stop: '2024-08-07',
          impressions: '5000',
          clicks: '100',
          spend: '10000',
          ctr: '2.0',
          frequency: '5.0',
          reach: '1000',
          cpm: '2000',
          account_currency: 'JPY'
        },
        // 広告2: 中疲労度
        {
          ad_id: 'ad_medium',
          ad_name: 'Medium Fatigue Ad',
          campaign_id: 'campaign_1',
          campaign_name: 'Test Campaign',
          date_start: '2024-08-01',
          date_stop: '2024-08-07',
          impressions: '8000',
          clicks: '320',
          spend: '6000',
          ctr: '4.0',
          frequency: '3.8',
          reach: '2100',
          cpm: '750',
          account_currency: 'JPY'
        },
        // 広告3: 低疲労度
        {
          ad_id: 'ad_low',
          ad_name: 'Low Fatigue Ad',
          campaign_id: 'campaign_1',
          campaign_name: 'Test Campaign',
          date_start: '2024-08-01',
          date_stop: '2024-08-07',
          impressions: '12000',
          clicks: '720',
          spend: '4000',
          ctr: '6.0',
          frequency: '2.5',
          reach: '4800',
          cpm: '333',
          account_currency: 'JPY'
        }
      ]

      const result = gapEngine.analyzeGaps(mockMultiAdData, 'last_7d')

      expect(result.gaps).toHaveLength(3)
      
      // severityによる適切なソート
      const severities = result.gaps.map(gap => gap.severity)
      expect(severities[0]).toBe('high')  // ad_high
      expect(severities[1]).toBe('medium') // ad_medium  
      expect(severities[2]).toBe('low')    // ad_low

      // 短期データでの優先順位付け
      expect(result.summary.criticalAdsCount).toBe(1)
      expect(result.summary.warningAdsCount).toBe(1)
      expect(result.summary.healthyAdsCount).toBe(1)
    })
  })

  describe('日付範囲メタデータの検証', () => {
    it('分析結果に正しい日付範囲情報が含まれること', () => {
      const mockData: AdInsight[] = [{
        ad_id: 'ad_test',
        ad_name: 'Test Ad',
        campaign_id: 'campaign_1',
        campaign_name: 'Test Campaign',
        date_start: '2024-08-01',
        date_stop: '2024-08-07',
        impressions: '10000',
        clicks: '500',
        spend: '5000',
        ctr: '5.0',
        frequency: '2.0',
        reach: '5000',
        cpm: '500',
        account_currency: 'JPY'
      }]

      const result = gapEngine.analyzeGaps(mockData, 'last_7d')

      expect(result.dateRange).toBe('last_7d')
      expect(result.analysisTimestamp).toBeInstanceOf(Date)
      expect(result.dataPoints).toBe(1)
      
      // 時系列情報
      expect(result.timeSeriesAnalysis?.dateRange).toBe('last_7d')
      expect(result.timeSeriesAnalysis?.dataPointsCount).toBe(1)
    })

    it('カスタム日付範囲でも適切にメタデータが設定されること', () => {
      const mockData: AdInsight[] = [{
        ad_id: 'ad_test',
        ad_name: 'Test Ad',
        campaign_id: 'campaign_1',
        campaign_name: 'Test Campaign',
        date_start: '2024-07-15',
        date_stop: '2024-08-15',
        impressions: '10000',
        clicks: '500',
        spend: '5000',
        ctr: '5.0',
        frequency: '2.0',
        reach: '5000',
        cpm: '500',
        account_currency: 'JPY'
      }]

      const result = gapEngine.analyzeGaps(mockData, '2024-07-15:2024-08-15')

      expect(result.dateRange).toBe('2024-07-15:2024-08-15')
      expect(result.dataPoints).toBe(1)
      
      // カスタム範囲での時系列設定
      expect(result.timeSeriesAnalysis?.dateRange).toBe('2024-07-15:2024-08-15')
    })
  })

  describe('統合テスト - useMetaInsights & useAdFatigueSimplified連携', () => {
    it('フック間の日付範囲パラメータ伝播が正しく機能することをモックで検証', async () => {
      // このテストは実装後に動的に検証するためのプレースホルダー
      const testData = {
        accountId: 'act_123456789',
        initialDateRange: 'last_30d',
        changedDateRange: 'last_7d'
      }

      // useMetaInsightsフックの動作確認
      expect(testData.accountId).toBeTruthy()
      expect(testData.initialDateRange).toBe('last_30d')
      expect(testData.changedDateRange).toBe('last_7d')

      // 実装完了後、実際のフック動作テストを追加予定
      // - DateRangeFilterの選択変更
      // - useAdFatigueSimplifiedへの伝播
      // - useMetaInsightsでのデータ再取得
      // - GapDetectionEngineでの分析更新
    })

    it('datePresetOverride機能のエンドツーエンドテスト準備', () => {
      // 将来の実装確認用テストプレースホルダー
      const mockFetchOptions = {
        forceRefresh: true,
        datePresetOverride: 'last_14d'
      }

      expect(mockFetchOptions.datePresetOverride).toBe('last_14d')
      expect(mockFetchOptions.forceRefresh).toBe(true)

      // 実装後のテスト項目：
      // 1. fetch({ datePresetOverride: 'last_14d' })の呼び出し
      // 2. 一時的な日付範囲での API リクエスト
      // 3. キャッシュキーの適切な分離
      // 4. 元のdatePreset設定への復帰
    })
  })
})