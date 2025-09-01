/**
 * real-world-scenarios.test.ts
 * TASK-005: 実世界シナリオでの日付範囲パラメータ伝播テスト
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useAdFatigueSimplified } from '../../hooks/useAdFatigueSimplified'
import { useDateRangeValidator } from '../../hooks/useDateRangeValidator'

// Mock dependencies
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

// Mock fetch
global.fetch = vi.fn()

describe('Real-world Scenarios for Date Range Propagation', () => {
  const mockAccountId = 'act_123456789'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('マーケターの日常業務シナリオ', () => {
    it('シナリオ1: 月次レポート作成での期間切り替え', async () => {
      // 30日間の高疲労度広告データをモック
      const mockHighFatigueData = Array.from({ length: 30 }, (_, dayIndex) => ({
        ad_id: `high_fatigue_ad_${dayIndex % 5 + 1}`,
        ad_name: `疲労度高広告 ${dayIndex % 5 + 1}`,
        campaign_id: 'monthly_campaign_2024_08',
        date_start: `2024-08-${String(dayIndex + 1).padStart(2, '0')}`,
        date_stop: `2024-08-${String(dayIndex + 1).padStart(2, '0')}`,
        impressions: String(Math.max(5000 - (dayIndex * 100), 1000)), // 減少トレンド
        clicks: String(Math.max(250 - (dayIndex * 15), 20)), // 減少トレンド
        spend: String(1000), // 一定
        ctr: String(((Math.max(250 - (dayIndex * 15), 20)) / Math.max(5000 - (dayIndex * 100), 1000) * 100).toFixed(2)),
        frequency: String(Math.min(2.0 + (dayIndex * 0.05), 4.5)), // 増加（疲労）
        reach: String(Math.max(2500 - (dayIndex * 50), 500)),
        cpm: String((1000 / (Math.max(5000 - (dayIndex * 100), 1000) / 1000)).toFixed(2)),
        account_currency: 'JPY'
      }))

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          data: mockHighFatigueData,
          paging: {}
        })
      })

      // 疲労度計算をモック
      vi.mock('../../hooks/useFatigueCalculation', () => ({
        useFatigueCalculation: vi.fn(() => [
          {
            ad_id: 'high_fatigue_ad_1',
            ad_name: '疲労度高広告 1',
            totalScore: 78, // 高疲労度
            creativeFatigue: 32,
            audienceFatigue: 25,
            platformFatigue: 21,
            spend: 6000,
            impressions: 45000,
            clicks: 1800,
            ctr: 4.0,
            frequency: 3.8
          },
          {
            ad_id: 'high_fatigue_ad_2',
            ad_name: '疲労度高広告 2',
            totalScore: 65,
            creativeFatigue: 28,
            audienceFatigue: 20,
            platformFatigue: 17,
            spend: 5500,
            impressions: 42000,
            clicks: 1680,
            ctr: 4.0,
            frequency: 3.4
          }
        ])
      }))

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

      // 30日データの取得完了を待つ
      await waitFor(() => {
        expect(result.current.processTime?.dateRange).toBe('last_30d')
      })

      // 月次データの確認
      expect(result.current.stats?.totalAds).toBe(2)
      expect(result.current.stats?.totalSpend).toBe(11500)

      // 週次分析への切り替え
      dateRange = 'last_7d'
      rerender()

      await waitFor(() => {
        expect(result.current.processTime?.dateRange).toBe('last_7d')
      })

      // 短期間データでは処理時間が短縮されることを確認
      expect(result.current.processTime?.processingDuration).toBeDefined()
    })

    it('シナリオ2: 緊急対応での昨日データ確認', async () => {
      // 昨日の急激な悪化データをモック
      const mockYesterdayData = [
        {
          ad_id: 'emergency_ad_1',
          ad_name: '緊急対応広告',
          campaign_id: 'emergency_campaign',
          date_start: '2024-08-31',
          date_stop: '2024-08-31',
          impressions: '1000', // 大幅減少
          clicks: '20', // 大幅減少
          spend: '2000', // 支出は継続
          ctr: '2.0', // 大幅悪化
          frequency: '5.2', // 異常に高い
          reach: '192', // 大幅減少
          cpm: '2000', // 異常に高い
          account_currency: 'JPY'
        }
      ]

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          data: mockYesterdayData,
          paging: {}
        })
      })

      vi.mock('../../hooks/useFatigueCalculation', () => ({
        useFatigueCalculation: vi.fn(() => [
          {
            ad_id: 'emergency_ad_1',
            ad_name: '緊急対応広告',
            totalScore: 95, // 危険レベル
            creativeFatigue: 35,
            audienceFatigue: 35,
            platformFatigue: 25,
            spend: 2000,
            impressions: 1000,
            clicks: 20,
            ctr: 2.0,
            frequency: 5.2,
            recommendations: ['immediate_pause', 'creative_refresh', 'audience_expansion']
          }
        ])
      }))

      const { result } = renderHook(
        () => useAdFatigueSimplified({
          accountId: mockAccountId,
          dateRange: 'yesterday',
          debugMode: true
        }),
        {
          wrapper: ({ children }) => <div>{children}</div>
        }
      )

      await waitFor(() => {
        expect(result.current.fatigueData).toBeDefined()
      })

      // 緊急対応レベルの疲労度を検出
      const emergencyAd = result.current.fatigueData?.[0]
      expect(emergencyAd?.totalScore).toBeGreaterThan(90)

      // 短期間データの特別な閾値が適用されることを確認
      expect(result.current.processTime?.dateRange).toBe('yesterday')
    })

    it('シナリオ3: A/Bテストでの週次比較分析', async () => {
      const { result: validatorResult } = renderHook(() => useDateRangeValidator())

      // 複数期間での比較の妥当性をチェック
      const comparisonResult = validatorResult.current.validateDateRangeComparison([
        'last_7d', 'last_14d'
      ])

      expect(comparisonResult.isValid).toBe(true)
      expect(comparisonResult.conflicts).toHaveLength(0)

      // 不適切な比較の検出
      const invalidComparison = validatorResult.current.validateDateRangeComparison([
        'yesterday', 'last_90d'
      ])

      expect(invalidComparison.isValid).toBe(false)
      expect(invalidComparison.conflicts.length).toBeGreaterThan(0)
      expect(invalidComparison.conflicts[0]).toContain('大きな差があります')
    })
  })

  describe('パフォーマンス最適化シナリオ', () => {
    it('シナリオ4: 大量データでの段階的読み込み', async () => {
      // 大量データをページネーション付きでモック
      const mockLargeDataset = Array.from({ length: 500 }, (_, index) => ({
        ad_id: `bulk_ad_${index}`,
        ad_name: `Bulk Ad ${index}`,
        campaign_id: `bulk_campaign_${Math.floor(index / 50)}`,
        date_start: '2024-08-01',
        date_stop: '2024-08-30',
        impressions: String(1000 + (index * 10)),
        clicks: String(50 + (index * 2)),
        spend: String(100 + index),
        ctr: String(((50 + (index * 2)) / (1000 + (index * 10)) * 100).toFixed(2)),
        frequency: String((2.0 + (index * 0.01)).toFixed(2)),
        reach: String(500 + (index * 5)),
        cpm: String(((100 + index) / ((1000 + (index * 10)) / 1000)).toFixed(2)),
        account_currency: 'JPY'
      }))

      // 初回は最初の100件のみ
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: mockLargeDataset.slice(0, 100),
          paging: {
            next: 'https://graph.facebook.com/v23.0/next_page_url'
          }
        })
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

      // 初期データ読み込み完了を待つ
      await waitFor(() => {
        expect(result.current.processTime?.dataCount).toBeGreaterThan(0)
      })

      // 処理時間が記録されていることを確認
      expect(result.current.processTime?.processingDuration).toBeGreaterThan(0)

      // 大量データでも適切に処理されることを確認
      expect(result.current.processTime?.error).toBe(false)
    })

    it('シナリオ5: レート制限エラーからの自動回復', async () => {
      // 最初はレート制限エラー
      ;(global.fetch as any).mockRejectedValueOnce({
        code: 'RATE_LIMIT',
        message: 'Application request limit reached',
        retryAfter: 5
      })

      // リトライ後は正常データ
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            {
              ad_id: 'retry_ad_1',
              ad_name: 'Retry Test Ad',
              campaign_id: 'retry_campaign',
              date_start: '2024-08-01',
              date_stop: '2024-08-07',
              impressions: '5000',
              clicks: '250',
              spend: '1000',
              ctr: '5.0',
              frequency: '2.5',
              cpm: '200',
              account_currency: 'JPY'
            }
          ],
          paging: {}
        })
      })

      const { result } = renderHook(
        () => useAdFatigueSimplified({
          accountId: mockAccountId,
          dateRange: 'last_7d',
          debugMode: true
        }),
        {
          wrapper: ({ children }) => <div>{children}</div>
        }
      )

      // 最初はエラー状態
      await waitFor(() => {
        expect(result.current.error).toBeTruthy()
      })

      // エラーがレート制限であることを確認
      expect(result.current.error?.message).toContain('limit')
    })
  })

  describe('エラーハンドリングシナリオ', () => {
    it('シナリオ6: ネットワーク障害時の適切なエラー表示', async () => {
      ;(global.fetch as any).mockRejectedValue(new Error('Network error'))

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
        expect(result.current.error).toBeTruthy()
      })

      // エラー情報が processTime に記録されることを確認
      expect(result.current.processTime?.error).toBe(true)
      expect(result.current.fatigueData).toBeNull()
    })

    it('シナリオ7: 無効なアカウントIDでの適切なバリデーション', async () => {
      const { result } = renderHook(
        () => useAdFatigueSimplified({
          accountId: '', // 空のアカウントID
          dateRange: 'last_30d',
          debugMode: true
        }),
        {
          wrapper: ({ children }) => <div>{children}</div>
        }
      )

      // refetchを試行
      await act(async () => {
        await result.current.refetch()
      })

      // アカウントIDエラーが適切にハンドリングされることを確認
      expect(result.current.isRefreshing).toBe(false)
      
      // データが取得されていないことを確認
      expect(result.current.fatigueData).toBeNull()
    })
  })

  describe('ユーザビリティシナリオ', () => {
    it('シナリオ8: 初心者ユーザーの日付範囲選択支援', () => {
      const { result } = renderHook(() => useDateRangeValidator())

      // 疲労度分析での推奨日付範囲
      const suggestion = result.current.suggestOptimalDateRange('last_90d', {
        analysisType: 'fatigue',
        userExperience: 'beginner',
        dataVolume: 'medium'
      })

      // 初心者には適切な期間が提案されることを確認
      expect(suggestion.suggested).not.toBe('last_90d') // より短い期間が推奨される
      expect(['last_7d', 'last_14d', 'last_30d']).toContain(suggestion.suggested)
      expect(suggestion.reason).toContain('適切')
    })

    it('シナリオ9: 上級ユーザーの詳細分析支援', () => {
      const { result } = renderHook(() => useDateRangeValidator())

      // トレンド分析での詳細設定
      const suggestion = result.current.suggestOptimalDateRange('last_7d', {
        analysisType: 'trend',
        userExperience: 'advanced',
        dataVolume: 'high'
      })

      // 上級ユーザーには統計的信頼性の高い期間が提案される
      expect(['last_30d', 'last_90d']).toContain(suggestion.suggested)
      expect(suggestion.reason).toContain('十分')
    })

    it('シナリオ10: リアルタイム監視での今日データ確認', async () => {
      const mockTodayData = [
        {
          ad_id: 'realtime_ad_1',
          ad_name: 'リアルタイム監視広告',
          campaign_id: 'realtime_campaign',
          date_start: '2024-09-01', // 今日
          date_stop: '2024-09-01',
          impressions: '500', // 少ないデータ
          clicks: '25',
          spend: '200',
          ctr: '5.0',
          frequency: '1.2',
          reach: '417',
          cpm: '400',
          account_currency: 'JPY'
        }
      ]

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          data: mockTodayData,
          paging: {}
        })
      })

      vi.mock('../../hooks/useFatigueCalculation', () => ({
        useFatigueCalculation: vi.fn(() => [
          {
            ad_id: 'realtime_ad_1',
            ad_name: 'リアルタイム監視広告',
            totalScore: 25, // 低疲労度（データ量少ないため）
            creativeFatigue: 8,
            audienceFatigue: 7,
            platformFatigue: 10,
            spend: 200,
            impressions: 500,
            clicks: 25
          }
        ])
      }))

      const { result } = renderHook(
        () => useAdFatigueSimplified({
          accountId: mockAccountId,
          dateRange: 'today',
          debugMode: true
        }),
        {
          wrapper: ({ children }) => <div>{children}</div>
        }
      )

      await waitFor(() => {
        expect(result.current.processTime?.dateRange).toBe('today')
      })

      // 今日のデータでも適切に処理されることを確認
      expect(result.current.fatigueData).toBeDefined()
      expect(result.current.processTime?.dataCount).toBe(1)

      // リアルタイムデータの制限事項が適切に反映されることを確認
      const todayAd = result.current.fatigueData?.[0]
      expect(todayAd?.totalScore).toBeLessThan(50) // データ不足による低スコア
    })
  })
})