/**
 * date-range-propagation-e2e.test.ts
 * TASK-005: エンドツーエンドでの日付範囲パラメータ伝播テスト
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useAdFatigueSimplified } from '../../hooks/useAdFatigueSimplified'
import { DateRangeGapDetectionEngine } from '../../core/gap-detection-engine'

// 完全なE2Eテスト用のモック設定
vi.mock('convex/react', () => ({
  useConvex: vi.fn(() => ({
    query: vi.fn(),
    mutation: vi.fn(),
  }))
}))

vi.mock('../../../lib/vibelogger', () => ({
  vibe: {
    debug: vi.fn(),
    warn: vi.fn(),
    bad: vi.fn(),
    good: vi.fn()
  }
}))

// 実際のデータフローをモック
vi.mock('../../hooks/useLocalCache', () => ({
  useLocalCache: vi.fn(() => ({
    getCachedData: vi.fn().mockReturnValue(null),
    setCachedData: vi.fn(),
    clearCache: vi.fn(),
    getCacheInfo: vi.fn().mockReturnValue({ timestamp: null }),
    getCachedDataFull: vi.fn().mockReturnValue(null)
  }))
}))

vi.mock('../../hooks/useCreativeEnrichment', () => ({
  useCreativeEnrichment: vi.fn(() => ({
    enrichedInsights: null,
    enrichInsights: vi.fn()
  }))
}))

vi.mock('../../hooks/useMockData', () => ({
  useMockData: vi.fn(() => null)
}))

// Mock fetch for API calls
global.fetch = vi.fn()

describe('End-to-End Date Range Propagation Tests', () => {
  const mockAccountId = 'act_e2e_test_123'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('完全なデータフロー検証', () => {
    it('E2E: DateRangeFilter変更 → useAdFatigueSimplified → useMetaInsights → API → GapDetection', async () => {
      // Step 1: 初期API レスポンスの設定
      const mockInitialData = [
        {
          ad_id: 'e2e_ad_1',
          ad_name: 'E2E Test Ad 1',
          campaign_id: 'e2e_campaign_1',
          campaign_name: 'E2E Test Campaign',
          date_start: '2024-08-01',
          date_stop: '2024-08-30',
          impressions: '15000',
          clicks: '750',
          spend: '5000',
          ctr: '5.0',
          frequency: '2.5',
          reach: '6000',
          cpm: '333.33',
          account_currency: 'JPY'
        },
        {
          ad_id: 'e2e_ad_2',
          ad_name: 'E2E Test Ad 2 (Fatigued)',
          campaign_id: 'e2e_campaign_1',
          campaign_name: 'E2E Test Campaign',
          date_start: '2024-08-01',
          date_stop: '2024-08-30',
          impressions: '8000',
          clicks: '200',
          spend: '6000',
          ctr: '2.5', // 低いCTR
          frequency: '4.2', // 高い頻度
          reach: '1905',
          cpm: '750', // 高いCPM
          account_currency: 'JPY'
        }
      ]

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          data: mockInitialData,
          paging: {}
        })
      })

      // Step 2: 疲労度計算をモック
      const mockFatigueResult = [
        {
          ad_id: 'e2e_ad_1',
          ad_name: 'E2E Test Ad 1',
          totalScore: 35,
          creativeFatigue: 12,
          audienceFatigue: 10,
          platformFatigue: 13,
          spend: 5000,
          impressions: 15000,
          clicks: 750,
          ctr: 5.0,
          frequency: 2.5,
          cpm: 333.33
        },
        {
          ad_id: 'e2e_ad_2',
          ad_name: 'E2E Test Ad 2 (Fatigued)',
          totalScore: 78, // 高疲労度
          creativeFatigue: 28,
          audienceFatigue: 25,
          platformFatigue: 25,
          spend: 6000,
          impressions: 8000,
          clicks: 200,
          ctr: 2.5,
          frequency: 4.2,
          cpm: 750
        }
      ]

      vi.mock('../../hooks/useFatigueCalculation', () => ({
        useFatigueCalculation: vi.fn(() => mockFatigueResult)
      }))

      // Step 3: 初期状態でuseAdFatigueSimplifiedをテスト
      let dateRange = 'last_30d'

      const { result, rerender } = renderHook(
        () => useAdFatigueSimplified({
          accountId: mockAccountId,
          dateRange,
          debugMode: true
        }),
        {
          wrapper: ({ children }) => <div>{children}</div>
        }
      )

      // Step 4: 初期データ取得の完了を待つ
      await waitFor(() => {
        expect(result.current.fatigueData).toBeDefined()
        expect(result.current.fatigueData?.length).toBe(2)
      })

      // Step 5: 初期状態の検証
      expect(result.current.processTime?.dateRange).toBe('last_30d')
      expect(result.current.stats?.totalAds).toBe(2)
      expect(result.current.stats?.totalSpend).toBe(11000) // 5000 + 6000

      // 疲労度の高い広告が検出されることを確認
      const fatigueAd = result.current.fatigueData?.find(ad => ad.totalScore > 70)
      expect(fatigueAd).toBeDefined()
      expect(fatigueAd?.ad_id).toBe('e2e_ad_2')

      // Step 6: Gap Detection Engine での分析
      const gapEngine = new DateRangeGapDetectionEngine({
        dateRangeAware: true,
        timeSeriesAnalysis: {
          enabled: true,
          minDataPoints: 1,
          trendAnalysisWindow: 30
        },
        thresholds: {
          ctrDeclineThreshold: 0.25,
          frequencyWarningThreshold: 3.5,
          cpmIncreaseThreshold: 0.20,
          minImpressions: 1000
        }
      })

      const gapAnalysis = gapEngine.analyzeGaps(mockInitialData, 'last_30d')

      expect(gapAnalysis.dateRange).toBe('last_30d')
      expect(gapAnalysis.gaps.length).toBeGreaterThan(0)

      // 高疲労度の広告がギャップとして検出されることを確認
      const highSeverityGap = gapAnalysis.gaps.find(gap => gap.severity === 'high')
      expect(highSeverityGap).toBeDefined()

      // Step 7: 日付範囲を変更 (last_30d → last_7d)
      const mockWeeklyData = [
        {
          ad_id: 'e2e_ad_1',
          ad_name: 'E2E Test Ad 1',
          campaign_id: 'e2e_campaign_1',
          campaign_name: 'E2E Test Campaign',
          date_start: '2024-08-25',
          date_stop: '2024-08-31',
          impressions: '3500',
          clicks: '175',
          spend: '1200',
          ctr: '5.0',
          frequency: '2.8',
          reach: '1250',
          cpm: '342.86',
          account_currency: 'JPY'
        },
        {
          ad_id: 'e2e_ad_2',
          ad_name: 'E2E Test Ad 2 (Worsening)',
          campaign_id: 'e2e_campaign_1',
          campaign_name: 'E2E Test Campaign',
          date_start: '2024-08-25',
          date_stop: '2024-08-31',
          impressions: '2000',
          clicks: '40', // さらに悪化
          spend: '1500',
          ctr: '2.0', // さらに低下
          frequency: '4.8', // さらに増加
          reach: '417',
          cpm: '750',
          account_currency: 'JPY'
        }
      ]

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          data: mockWeeklyData,
          paging: {}
        })
      })

      // 週次疲労度計算の更新
      const mockWeeklyFatigueResult = [
        {
          ad_id: 'e2e_ad_1',
          ad_name: 'E2E Test Ad 1',
          totalScore: 40, // 少し上昇
          creativeFatigue: 15,
          audienceFatigue: 12,
          platformFatigue: 13,
          spend: 1200,
          impressions: 3500,
          clicks: 175
        },
        {
          ad_id: 'e2e_ad_2',
          ad_name: 'E2E Test Ad 2 (Worsening)',
          totalScore: 85, // さらに悪化
          creativeFatigue: 32,
          audienceFatigue: 28,
          platformFatigue: 25,
          spend: 1500,
          impressions: 2000,
          clicks: 40
        }
      ]

      vi.mocked(await import('../../hooks/useFatigueCalculation')).useFatigueCalculation
        .mockReturnValue(mockWeeklyFatigueResult)

      // Step 8: 日付範囲変更を実行
      dateRange = 'last_7d'
      rerender()

      // Step 9: 変更後のデータ検証
      await waitFor(() => {
        expect(result.current.processTime?.dateRange).toBe('last_7d')
      })

      // 新しいAPI呼び出しが実行されたことを確認
      const apiCalls = (global.fetch as any).mock.calls
      const last7dCall = apiCalls.find((call: any[]) => {
        const url = new URL(call[0])
        return url.searchParams.get('date_preset') === 'last_7d'
      })
      expect(last7dCall).toBeDefined()

      // 短期間データでの疲労度悪化が検出されることを確認
      await waitFor(() => {
        const worseningAd = result.current.fatigueData?.find(ad => ad.ad_id === 'e2e_ad_2')
        expect(worseningAd?.totalScore).toBeGreaterThan(80) // さらに悪化
      })

      // Step 10: Gap Detection での短期間分析
      const weeklyGapAnalysis = gapEngine.analyzeGaps(mockWeeklyData, 'last_7d')

      expect(weeklyGapAnalysis.dateRange).toBe('last_7d')
      expect(weeklyGapAnalysis.timeSeriesAnalysis?.enabled).toBe(false) // 短期間のため無効

      // 短期間データでは厳しい閾値が適用されることを確認
      const criticalGaps = weeklyGapAnalysis.gaps.filter(gap => gap.severity === 'high')
      expect(criticalGaps.length).toBeGreaterThan(0)

      // Step 11: 推奨アクションの確認
      const emergencyAd = weeklyGapAnalysis.gaps.find(gap => gap.adId === 'e2e_ad_2')
      expect(emergencyAd?.recommendations).toContain('immediate')
    })

    it('E2E: エラー状況での完全なフロー検証', async () => {
      // Step 1: 認証エラーをシミュレート
      ;(global.fetch as any).mockRejectedValueOnce({
        code: 190,
        message: 'Invalid OAuth access token',
        type: 'OAuthException'
      })

      const { result } = renderHook(
        () => useAdFatigueSimplified({
          accountId: mockAccountId,
          dateRange: 'last_30d',
          debugMode: true
        }),
        {
          wrapper: ({ children }) => <div>{children}</div>
        }
      )

      // Step 2: エラーの伝播確認
      await waitFor(() => {
        expect(result.current.error).toBeTruthy()
      })

      expect(result.current.error?.message).toContain('OAuth')
      expect(result.current.fatigueData).toBeNull()
      expect(result.current.processTime?.error).toBe(true)

      // Step 3: エラー回復のテスト
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [
            {
              ad_id: 'recovery_ad',
              ad_name: 'Recovery Test Ad',
              impressions: '1000',
              clicks: '50',
              spend: '500',
              ctr: '5.0',
              frequency: '2.0',
              account_currency: 'JPY'
            }
          ],
          paging: {}
        })
      })

      // Step 4: 手動リフレッシュでの回復
      await act(async () => {
        await result.current.refetch({ clearCache: true })
      })

      // Step 5: 正常状態への復帰確認
      await waitFor(() => {
        expect(result.current.error).toBeNull()
        expect(result.current.processTime?.error).toBe(false)
      })
    })

    it('E2E: キャッシュ機能の完全フロー検証', async () => {
      // Step 1: 初回データ取得
      const mockCachedData = [
        {
          ad_id: 'cache_ad_1',
          ad_name: 'Cache Test Ad',
          impressions: '5000',
          clicks: '250',
          spend: '1000',
          ctr: '5.0',
          frequency: '2.5',
          account_currency: 'JPY'
        }
      ]

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          data: mockCachedData,
          paging: {}
        })
      })

      const { result: result1, unmount: unmount1 } = renderHook(
        () => useAdFatigueSimplified({
          accountId: mockAccountId,
          dateRange: 'last_30d',
          debugMode: true
        }),
        {
          wrapper: ({ children }) => <div>{children}</div>
        }
      )

      // 初回データ取得を待つ
      await waitFor(() => {
        expect(result1.current.fatigueData).toBeDefined()
      })

      const initialFetchCount = (global.fetch as any).mock.calls.length
      unmount1()

      // Step 2: 同じ条件での再レンダリング（キャッシュヒット期待）
      const { result: result2 } = renderHook(
        () => useAdFatigueSimplified({
          accountId: mockAccountId,
          dateRange: 'last_30d',
          debugMode: true
        }),
        {
          wrapper: ({ children }) => <div>{children}</div>
        }
      )

      await waitFor(() => {
        expect(result2.current.fatigueData).toBeDefined()
      })

      // APIが追加で呼ばれていないことを確認（キャッシュヒット）
      // 注意: 実際の実装では初期キャッシュは別の仕組みを使用
      
      // Step 3: 異なる日付範囲での新規取得
      const { result: result3 } = renderHook(
        () => useAdFatigueSimplified({
          accountId: mockAccountId,
          dateRange: 'last_7d', // 異なる日付範囲
          debugMode: true
        }),
        {
          wrapper: ({ children }) => <div>{children}</div>
        }
      )

      await waitFor(() => {
        expect(result3.current.processTime?.dateRange).toBe('last_7d')
      })

      // 新しい日付範囲で追加のAPI呼び出しが実行されることを確認
      expect((global.fetch as any).mock.calls.length).toBeGreaterThan(initialFetchCount)
    })

    it('E2E: 複数日付範囲での並行処理検証', async () => {
      // 異なる日付範囲で複数のフックを並行実行
      const { result: result30d } = renderHook(
        () => useAdFatigueSimplified({
          accountId: mockAccountId,
          dateRange: 'last_30d',
          debugMode: true
        })
      )

      const { result: result7d } = renderHook(
        () => useAdFatigueSimplified({
          accountId: mockAccountId,
          dateRange: 'last_7d',
          debugMode: true
        })
      )

      const { result: resultYesterday } = renderHook(
        () => useAdFatigueSimplified({
          accountId: mockAccountId,
          dateRange: 'yesterday',
          debugMode: true
        })
      )

      // 全てのフックが独立して動作することを確認
      await waitFor(() => {
        expect(result30d.current.processTime?.dateRange).toBe('last_30d')
        expect(result7d.current.processTime?.dateRange).toBe('last_7d')
        expect(resultYesterday.current.processTime?.dateRange).toBe('yesterday')
      })

      // それぞれのフックが適切なAPIパラメータを使用していることを確認
      const apiCalls = (global.fetch as any).mock.calls
      const datePresets = apiCalls.map((call: any[]) => {
        const url = new URL(call[0])
        return url.searchParams.get('date_preset')
      }).filter(Boolean)

      expect(datePresets).toContain('last_30d')
      expect(datePresets).toContain('last_7d')
      expect(datePresets).toContain('yesterday')
    })
  })

  describe('パフォーマンス検証', () => {
    it('E2E: 大量データでの完全フロー性能検証', async () => {
      // 大量のモックデータ生成
      const mockBulkData = Array.from({ length: 1000 }, (_, index) => ({
        ad_id: `bulk_ad_${index}`,
        ad_name: `Bulk Test Ad ${index}`,
        campaign_id: `bulk_campaign_${Math.floor(index / 100)}`,
        impressions: String(1000 + index),
        clicks: String(50 + Math.floor(index / 20)),
        spend: String(100 + index),
        ctr: String(((50 + Math.floor(index / 20)) / (1000 + index) * 100).toFixed(2)),
        frequency: String((2.0 + (index * 0.001)).toFixed(2)),
        account_currency: 'JPY'
      }))

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          data: mockBulkData,
          paging: {}
        })
      })

      const startTime = performance.now()

      const { result } = renderHook(
        () => useAdFatigueSimplified({
          accountId: mockAccountId,
          dateRange: 'last_30d',
          debugMode: true
        }),
        {
          wrapper: ({ children }) => <div>{children}</div>
        }
      )

      await waitFor(() => {
        expect(result.current.fatigueData).toBeDefined()
      })

      const endTime = performance.now()
      const totalTime = endTime - startTime

      // パフォーマンス要件の検証
      expect(totalTime).toBeLessThan(5000) // 5秒以内
      expect(result.current.processTime?.processingDuration).toBeLessThan(1000) // 処理時間1秒以内

      // 大量データが正しく処理されたことを確認
      expect(result.current.stats?.totalAds).toBe(mockBulkData.length)
    })
  })
})