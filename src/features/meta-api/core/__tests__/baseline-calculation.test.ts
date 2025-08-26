import { describe, it, expect, beforeEach, vi, MockedFunction } from 'vitest'
import { BaselineCalculationService } from '../baseline-calculation'
import { MetaAdInsights, BaselineMetrics } from '../types'

// Mock the dependencies
vi.mock('../api-client')
vi.mock('../../../../modules/shared/utils/logger')

describe('BaselineCalculationService', () => {
  let service: BaselineCalculationService
  let mockMetaApiService: {
    getAdInsights: MockedFunction<any>
  }
  let mockConvexClient: {
    mutation: MockedFunction<any>
    query: MockedFunction<any>
  }

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks()
    
    // Create mock services
    mockMetaApiService = {
      getAdInsights: vi.fn()
    }
    
    mockConvexClient = {
      mutation: vi.fn(),
      query: vi.fn()
    }

    // Initialize service with mocks
    service = new BaselineCalculationService(
      mockMetaApiService as any,
      mockConvexClient as any
    )
  })

  describe('正常系 - 完全データでのベースライン計算', () => {
    it('should calculate CTR baseline from 30-day history', async () => {
      // Given: 30日分の完全なデータ
      const mockData = generateMockAdInsights(30, {
        ctr: 2.5,
        cpm: 450,
        frequency: 2.8
      })
      mockMetaApiService.getAdInsights.mockResolvedValue(mockData)
      
      // When: ベースライン計算実行
      const result = await service.calculateBaseline('ad_123', 'act_456')
      
      // Then: 期待値の確認
      expect(result.ctr).toBeCloseTo(2.5, 1)
      expect(result.cpm).toBeCloseTo(450, 10)
      expect(result.frequency).toBeCloseTo(2.8, 1)
      expect(result.confidence).toBeGreaterThan(0.7)
      expect(result.isIndustryAverage).toBe(false)
      expect(result.calculationPeriod.daysIncluded).toBe(30)
    })

    it('should calculate high confidence score for stable data', async () => {
      // Given: 安定した30日データ（標準偏差小）
      const stableData = generateStableAdInsights(30, {
        ctr: 2.5,
        stdDev: 0.1  // 低い標準偏差
      })
      mockMetaApiService.getAdInsights.mockResolvedValue(stableData)
      
      // When: ベースライン計算
      const result = await service.calculateBaseline('stable_ad', 'act_456')
      
      // Then: 高い信頼度スコア
      expect(result.confidence).toBeGreaterThanOrEqual(0.8)
      expect(result.dataQuality).toBeGreaterThan(0.9)
    })
  })

  describe('フォールバック系 - データ不足時の業界平均使用', () => {
    it('should fallback to industry average when insufficient data', async () => {
      // Given: 5日分のデータのみ存在
      const insufficientData = generateMockAdInsights(5)
      mockMetaApiService.getAdInsights.mockResolvedValue(insufficientData)
      
      // When: ベースライン計算
      const result = await service.calculateBaseline('new_ad', 'act_456')
      
      // Then: 業界平均使用
      expect(result.isIndustryAverage).toBe(true)
      expect(result.confidence).toBeLessThan(0.7)
      expect(result.ctr).toBeCloseTo(2.0, 1)  // Facebook業界平均
      expect(result.cpm).toBeCloseTo(500, 50)
      expect(result.frequency).toBeCloseTo(2.5, 1)
    })

    it('should use platform-specific industry averages', async () => {
      // Given: Instagram広告の不十分データ
      // When: フォールバック実行
      const result = await service.applyIndustryFallback('video' as any, 'instagram' as any)
      
      // Then: Instagram Reel用基準値
      expect(result.ctr).toBeCloseTo(1.2, 1)  // Instagram平均
      expect(result.cpm).toBeCloseTo(600, 50)
      expect(result.engagementRate).toBeCloseTo(1.23, 2)  // Reel基準
    })

    it('should fallback when data quality is poor', async () => {
      // Given: 30日データだが品質が低い（異常値多数）
      const poorQualityData = generateAnomalousData(30)
      mockMetaApiService.getAdInsights.mockResolvedValue(poorQualityData)
      
      // When: ベースライン計算
      const result = await service.calculateBaseline('anomalous_ad', 'act_456')
      
      // Then: 信頼度低下、フォールバック推奨
      expect(result.confidence).toBeLessThan(0.5)
      expect(result.dataQuality).toBeLessThan(0.6)
    })
  })

  describe('断続配信対応 - 配信停止期間の処理', () => {
    it('should exclude delivery pause periods', async () => {
      // Given: 30日中10日間の配信停止
      const dataWithPause = generateDataWithDeliveryPause(30, [
        { start: '2024-01-10', end: '2024-01-15' },  // 6日間停止
        { start: '2024-01-25', end: '2024-01-28' }   // 4日間停止
      ])
      mockMetaApiService.getAdInsights.mockResolvedValue(dataWithPause)
      
      // When: ベースライン計算
      const result = await service.calculateBaseline('paused_ad', 'act_456')
      
      // Then: 実際の配信日数でベースライン計算
      expect(result.calculationPeriod.daysIncluded).toBe(20)  // 30 - 10
      expect(result.confidence).toBeLessThan(0.8)  // 日数不足による信頼度低下
    })

    it('should detect and handle budget changes', async () => {
      // Given: 期間中に50%以上の予算変更
      const dataWithBudgetChange = generateDataWithBudgetChange(30, {
        changeDate: '2024-01-15',
        beforeBudget: 10000,
        afterBudget: 20000  // 100%増加
      })
      mockMetaApiService.getAdInsights.mockResolvedValue(dataWithBudgetChange)
      
      // When: ベースライン計算
      const result = await service.calculateBaseline('budget_changed_ad', 'act_456')
      
      // Then: 予算変更を考慮した計算
      expect(result.confidence).toBeLessThan(0.8)
      expect(result.calculationPeriod.daysIncluded).toBeGreaterThan(15)
    })
  })

  describe('異常系 - エラーハンドリング', () => {
    it('should handle Meta API timeout gracefully', async () => {
      // Given: Meta API タイムアウト
      mockMetaApiService.getAdInsights.mockRejectedValue(
        new Error('REQUEST_TIMEOUT')
      )
      
      // When & Then: エラー処理
      await expect(service.calculateBaseline('timeout_ad', 'act_456'))
        .rejects.toThrow('REQUEST_TIMEOUT')
    })

    it('should validate input parameters', async () => {
      // Given: 無効なパラメーター
      const invalidParams = [
        { adId: '', accountId: 'act_456' },         // 空のadId
        { adId: 'ad_123', accountId: '' },         // 空のaccountId
        { adId: null as any, accountId: 'act_456' },      // null値
      ]
      
      // When & Then: バリデーションエラー
      for (const params of invalidParams) {
        await expect(service.calculateBaseline(params.adId, params.accountId))
          .rejects.toThrow('INVALID_PARAMETERS')
      }
    })

    it('should handle database connection errors', async () => {
      // Given: データベース接続失敗
      const mockBaselineData = generateMockBaselineMetrics()
      mockConvexClient.mutation.mockRejectedValue(
        new Error('DATABASE_CONNECTION_ERROR')
      )
      
      // When & Then: エラーハンドリング
      await expect(service.storeBaseline(mockBaselineData))
        .rejects.toThrow('DATABASE_CONNECTION_ERROR')
    })
  })

  describe('境界値テスト', () => {
    it('should handle minimum data threshold (7 days)', async () => {
      // Given: 境界値の7日データ
      const minData = generateMockAdInsights(7)
      mockMetaApiService.getAdInsights.mockResolvedValue(minData)
      
      // When: ベースライン計算
      const result = await service.calculateBaseline('min_data_ad', 'act_456')
      
      // Then: 低信頼度での計算実行
      expect(result.confidence).toBeLessThan(0.7)
      expect(result.calculationPeriod.daysIncluded).toBe(7)
    })

    it('should handle extremely high/low metric values', async () => {
      // Given: 異常に高い/低いメトリクス値
      const extremeData = [
        generateMockAdInsights(1, { ctr: 15.0, cpm: 10000, frequency: 20.0 }),  // 異常に高い値
        generateMockAdInsights(1, { ctr: 0.01, cpm: 1, frequency: 0.1 })        // 異常に低い値
      ]
      
      for (const data of extremeData) {
        const result = await service.validateDataSufficiency(data)
        expect(result.confidence).toBeLessThan(0.5)  // 低信頼度
      }
    })
  })

  describe('パフォーマンステスト', () => {
    it('should complete calculation within 500ms', async () => {
      // Given: 30日分の標準データ
      const standardData = generateMockAdInsights(30)
      mockMetaApiService.getAdInsights.mockResolvedValue(standardData)
      
      // When: 計算時間測定
      const startTime = Date.now()
      const result = await service.calculateBaseline('perf_test_ad', 'act_456')
      const duration = Date.now() - startTime
      
      // Then: 500ms以内で完了
      expect(duration).toBeLessThan(500)
      expect(result).toBeDefined()
    })

    it('should handle concurrent calculations efficiently', async () => {
      // Given: 10個の並行計算要求（テストでは小さくする）
      const mockData = generateMockAdInsights(30)
      mockMetaApiService.getAdInsights.mockResolvedValue(mockData)
      
      const requests = Array.from({ length: 10 }, (_, i) => 
        service.calculateBaseline(`concurrent_ad_${i}`, 'act_456')
      )
      
      // When: 並行実行
      const startTime = Date.now()
      const results = await Promise.all(requests)
      const duration = Date.now() - startTime
      
      // Then: 効率的な処理
      expect(results).toHaveLength(10)
      expect(duration).toBeLessThan(5000)  // 5秒以内
    })
  })

  describe('データ検証機能', () => {
    it('should validate data sufficiency correctly', async () => {
      // Given: 様々な品質のデータセット
      const sufficientData = generateMockAdInsights(30)
      const insufficientData = generateMockAdInsights(5)
      
      // When: データ検証実行
      const sufficientResult = await service.validateDataSufficiency(sufficientData)
      const insufficientResult = await service.validateDataSufficiency(insufficientData)
      
      // Then: 適切な判定結果
      expect(sufficientResult.isValid).toBe(true)
      expect(sufficientResult.confidence).toBeGreaterThan(0.7)
      
      expect(insufficientResult.isValid).toBe(false)
      expect(insufficientResult.confidence).toBeLessThan(0.7)
    })
  })
})

// ヘルパー関数定義
function generateMockAdInsights(
  days: number, 
  baseMetrics: Partial<MetaAdInsights> = {}
): MetaAdInsights[] {
  return Array.from({ length: days }, (_, i) => ({
    adId: baseMetrics.adId || 'mock_ad_123',
    adName: baseMetrics.adName || 'Mock Ad',
    campaignId: 'mock_campaign_123',
    campaignName: 'Mock Campaign',
    adsetId: 'mock_adset_123',
    adsetName: 'Mock Adset',
    accountId: 'act_123456789',
    adSpend: baseMetrics.adSpend || 1000 + Math.random() * 500,
    impressions: baseMetrics.impressions || 10000 + Math.random() * 5000,
    clicks: baseMetrics.clicks || 250 + Math.random() * 100,
    conversions: baseMetrics.conversions || 25 + Math.random() * 10,
    reach: baseMetrics.reach || 8000 + Math.random() * 2000,
    ctr: baseMetrics.ctr || 2.5 + (Math.random() - 0.5) * 0.5,
    uniqueCtr: baseMetrics.uniqueCtr || 1.8 + (Math.random() - 0.5) * 0.3,
    inlineLinkClickCtr: baseMetrics.inlineLinkClickCtr || 2.1 + (Math.random() - 0.5) * 0.4,
    cpc: baseMetrics.cpc || 40 + (Math.random() - 0.5) * 10,
    cpm: baseMetrics.cpm || 450 + (Math.random() - 0.5) * 50,
    frequency: baseMetrics.frequency || 2.8 + (Math.random() - 0.5) * 0.3,
    adType: baseMetrics.adType || 'video',
    platform: baseMetrics.platform || ['facebook'],
    dateStart: new Date(Date.now() - (days - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    dateStop: new Date(Date.now() - (days - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    dataCompleteness: baseMetrics.dataCompleteness || 0.95,
    apiVersion: 'v23.0',
    retrievedAt: new Date().toISOString()
  }))
}

function generateStableAdInsights(
  days: number, 
  config: { ctr: number; stdDev: number }
): MetaAdInsights[] {
  return Array.from({ length: days }, (_, i) => ({
    ...generateMockAdInsights(1)[0],
    ctr: config.ctr + (Math.random() - 0.5) * config.stdDev * 2,
    cpm: 450 + (Math.random() - 0.5) * config.stdDev * 20,
    frequency: 2.8 + (Math.random() - 0.5) * config.stdDev,
    dateStart: new Date(Date.now() - (days - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    dateStop: new Date(Date.now() - (days - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  }))
}

function generateAnomalousData(days: number): MetaAdInsights[] {
  return Array.from({ length: days }, (_, i) => ({
    ...generateMockAdInsights(1)[0],
    // 20%のデータに異常値を設定
    ctr: Math.random() < 0.2 ? Math.random() * 10 : 2.5,
    cpm: Math.random() < 0.2 ? Math.random() * 5000 : 450,
    frequency: Math.random() < 0.2 ? Math.random() * 15 : 2.8,
    dateStart: new Date(Date.now() - (days - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    dateStop: new Date(Date.now() - (days - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  }))
}

function generateDataWithDeliveryPause(
  days: number, 
  pausePeriods: Array<{ start: string; end: string }>
): MetaAdInsights[] {
  const data = generateMockAdInsights(days)
  
  // 配信停止期間のデータは impressions = 0 に設定
  return data.map((item) => {
    const currentDate = item.dateStart
    const isPauseDay = pausePeriods.some(period => 
      currentDate >= period.start && currentDate <= period.end
    )
    
    return {
      ...item,
      impressions: isPauseDay ? 0 : item.impressions,
      clicks: isPauseDay ? 0 : item.clicks,
      adSpend: isPauseDay ? 0 : item.adSpend
    }
  })
}

function generateDataWithBudgetChange(
  days: number,
  change: { changeDate: string; beforeBudget: number; afterBudget: number }
): MetaAdInsights[] {
  const data = generateMockAdInsights(days)
  
  return data.map(item => {
    const budgetMultiplier = item.dateStart >= change.changeDate 
      ? change.afterBudget / change.beforeBudget 
      : 1
    
    return {
      ...item,
      adSpend: item.adSpend * budgetMultiplier,
      impressions: item.impressions * budgetMultiplier * 0.8  // 効率低下を考慮
    }
  })
}

function generateMockBaselineMetrics(): BaselineMetrics {
  return {
    ctr: 2.5,
    uniqueCtr: 1.8,
    inlineLinkClickCtr: 2.1,
    cpm: 450,
    frequency: 2.8,
    calculationPeriod: {
      start: '2024-01-01',
      end: '2024-01-31',
      daysIncluded: 30
    },
    dataQuality: 0.95,
    isIndustryAverage: false,
    confidence: 0.85,
    calculatedAt: new Date().toISOString(),
    version: '1.0'
  }
}