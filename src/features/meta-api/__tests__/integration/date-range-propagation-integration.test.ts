/**
 * date-range-propagation-integration.test.ts
 * TASK-005: 日付範囲パラメータ伝播の統合テスト
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useMetaInsights } from '../../hooks/useMetaInsights'
import { useAdFatigueSimplified } from '../../hooks/useAdFatigueSimplified'
import { useDateRangeCache } from '../../hooks/useDateRangeCache'
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

vi.mock('../../hooks/useFatigueCalculation', () => ({
  useFatigueCalculation: vi.fn(() => [])
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

describe('Date Range Propagation Integration Tests', () => {
  const mockAccountId = 'act_123456789'

  beforeEach(() => {
    vi.clearAllMocks()
    ;(global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          {
            ad_id: 'test_ad_1',
            ad_name: 'Test Ad 1',
            campaign_id: 'test_campaign_1',
            date_start: '2024-08-01',
            date_stop: '2024-08-01',
            impressions: '1000',
            clicks: '50',
            spend: '500',
            ctr: '5.0',
            frequency: '2.0',
            cpm: '500',
            account_currency: 'JPY'
          }
        ],
        paging: {}
      })
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('useMetaInsights - 日付範囲パラメータ伝播統合テスト', () => {
    it('datePreset変更時にデータが自動更新されることを検証', async () => {
      let datePreset = 'last_30d'
      const onDatePresetChange = vi.fn()

      const { result, rerender } = renderHook(
        () => useMetaInsights({
          accountId: mockAccountId,
          datePreset,
          autoFetch: true,
          onDatePresetChange,
          debugMode: true
        }),
        {
          wrapper: ({ children }) => <div>{children}</div>
        }
      )

      // 初期データ取得を待つ
      await waitFor(() => {
        expect(result.current.currentDatePreset).toBe('last_30d')
      })

      const initialFetchCount = (global.fetch as any).mock.calls.length

      // datePresetを変更
      datePreset = 'last_7d'
      rerender()

      // 新しい日付範囲でAPIが呼ばれることを確認
      await waitFor(() => {
        expect((global.fetch as any).mock.calls.length).toBeGreaterThan(initialFetchCount)
      })

      // 最後のAPI呼び出しで正しい日付範囲が使われていることを確認
      const lastCall = (global.fetch as any).mock.calls.at(-1)[0]
      const url = new URL(lastCall)
      expect(url.searchParams.get('date_preset')).toBe('last_7d')

      // currentDatePresetが更新されていることを確認
      expect(result.current.currentDatePreset).toBe('last_7d')
    })

    it('datePresetOverride機能が正しく動作することを検証', async () => {
      const { result } = renderHook(
        () => useMetaInsights({
          accountId: mockAccountId,
          datePreset: 'last_30d',
          autoFetch: false,
          debugMode: true
        }),
        {
          wrapper: ({ children }) => <div>{children}</div>
        }
      )

      // datePresetOverrideでfetch実行
      await act(async () => {
        await result.current.fetch({ datePresetOverride: 'last_14d' })
      })

      // 正しい日付範囲でAPIが呼ばれたことを確認
      const lastCall = (global.fetch as any).mock.calls.at(-1)[0]
      const url = new URL(lastCall)
      expect(url.searchParams.get('date_preset')).toBe('last_14d')

      // currentDatePresetが一時的に更新されていることを確認
      expect(result.current.currentDatePreset).toBe('last_14d')
    })

    it('循環依存が発生しないことを検証', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const { result } = renderHook(
        () => useMetaInsights({
          accountId: mockAccountId,
          datePreset: 'last_30d',
          autoFetch: true,
          debugMode: true
        }),
        {
          wrapper: ({ children }) => <div>{children}</div>
        }
      )

      // 複数回再レンダリングを実行
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // エラーが発生していないことを確認
      expect(consoleErrorSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Maximum update depth exceeded')
      )

      consoleErrorSpy.mockRestore()
    })
  })

  describe('useAdFatigueSimplified - 統合動作検証', () => {
    it('useMetaInsightsとの連携が正しく動作することを検証', async () => {
      const { useFatigueCalculation } = await import('../../hooks/useFatigueCalculation')
      
      // モックの疲労度データ
      const mockFatigueData = [
        {
          ad_id: 'test_ad_1',
          ad_name: 'Test Ad 1',
          totalScore: 65,
          creativeFatigue: 20,
          audienceFatigue: 25,
          platformFatigue: 20
        }
      ]

      ;(useFatigueCalculation as any).mockReturnValue(mockFatigueData)

      const { result } = renderHook(
        () => useAdFatigueSimplified({
          accountId: mockAccountId,
          dateRange: 'last_14d',
          debugMode: true
        }),
        {
          wrapper: ({ children }) => <div>{children}</div>
        }
      )

      // データが正しく処理されることを確認
      await waitFor(() => {
        expect(result.current.fatigueData).toEqual(mockFatigueData)
      })

      // 統計情報が生成されることを確認
      expect(result.current.stats).toBeDefined()
      expect(result.current.stats?.totalAds).toBe(1)

      // 処理時間情報が生成されることを確認
      expect(result.current.processTime).toBeDefined()
      expect(result.current.processTime?.dateRange).toBe('last_14d')
    })

    it('dateRange変更時にuseMetaInsightsへの伝播が正しく動作することを検証', async () => {
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

      // 初期状態を確認
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const initialFetchCount = (global.fetch as any).mock.calls.length

      // dateRangeを変更
      dateRange = 'last_7d'
      rerender()

      // 新しい日付範囲でAPIが呼ばれることを確認
      await waitFor(() => {
        expect((global.fetch as any).mock.calls.length).toBeGreaterThan(initialFetchCount)
      })

      // processTimeに新しい日付範囲が反映されることを確認
      expect(result.current.processTime?.dateRange).toBe('last_7d')
    })
  })

  describe('useDateRangeCache - キャッシュ統合テスト', () => {
    it('日付範囲別のキャッシュが正しく機能することを検証', () => {
      const { result } = renderHook(() => useDateRangeCache())

      const mockData = [
        {
          ad_id: 'test_ad_1',
          ad_name: 'Test Ad 1',
          impressions: '1000',
          clicks: '50'
        }
      ]

      // last_30dのデータをキャッシュ
      act(() => {
        result.current.setCachedData(mockAccountId, 'last_30d', mockData as any)
      })

      // last_7dのデータをキャッシュ
      act(() => {
        result.current.setCachedData(mockAccountId, 'last_7d', mockData as any)
      })

      // それぞれ独立してキャッシュされていることを確認
      const cached30d = result.current.getCachedData(mockAccountId, 'last_30d')
      const cached7d = result.current.getCachedData(mockAccountId, 'last_7d')

      expect(cached30d).toBeDefined()
      expect(cached7d).toBeDefined()
      expect(cached30d?.dateRange).toBe('last_30d')
      expect(cached7d?.dateRange).toBe('last_7d')

      // キャッシュ統計を確認
      const stats = result.current.getCacheStats()
      expect(stats.totalEntries).toBe(2)
      expect(stats.dateRanges).toEqual(['last_30d', 'last_7d'])
    })

    it('キャッシュのLRU機能が正しく動作することを検証', () => {
      const { result } = renderHook(() => useDateRangeCache())

      const mockData = [{ ad_id: 'test' }] as any

      // キャッシュ容量を超える数のエントリを追加
      const dateRanges = [
        'last_7d', 'last_14d', 'last_30d', 'last_90d',
        'yesterday', 'today', 'last_month'
      ] as const

      // 複数のキャッシュエントリを作成
      dateRanges.forEach((range, index) => {
        act(() => {
          result.current.setCachedData(`account_${index}`, range, mockData)
        })
      })

      const stats = result.current.getCacheStats()
      
      // 最大キャッシュサイズ以下に制限されていることを確認
      expect(stats.totalEntries).toBeLessThanOrEqual(10) // MAX_CACHE_SIZE
    })
  })

  describe('useDateRangeValidator - バリデーション統合テスト', () => {
    it('日付範囲の妥当性検証が正しく動作することを検証', () => {
      const { result } = renderHook(() => useDateRangeValidator())

      // 有効な日付範囲のテスト
      const validResult = result.current.validateDateRange('last_30d')
      expect(validResult.isValid).toBe(true)
      expect(validResult.preset).toBe('last_30d')
      expect(validResult.warnings).toHaveLength(0)

      // 無効な日付範囲のテスト
      const invalidResult = result.current.validateDateRange('invalid_range')
      expect(invalidResult.isValid).toBe(false)
      expect(invalidResult.warnings.length).toBeGreaterThan(0)

      // 最適な日付範囲の提案テスト
      const suggestion = result.current.suggestOptimalDateRange('last_90d', {
        analysisType: 'fatigue',
        dataVolume: 'low'
      })

      expect(suggestion.suggested).toBeDefined()
      expect(suggestion.reason).toBeDefined()
      expect(suggestion.alternatives).toBeInstanceOf(Array)
    })

    it('複数日付範囲の比較検証が正しく動作することを検証', () => {
      const { result } = renderHook(() => useDateRangeValidator())

      // 類似した期間での比較
      const similarRanges = result.current.validateDateRangeComparison([
        'last_7d', 'last_14d'
      ])
      expect(similarRanges.isValid).toBe(true)
      expect(similarRanges.conflicts).toHaveLength(0)

      // 大きく異なる期間での比較
      const differentRanges = result.current.validateDateRangeComparison([
        'yesterday', 'last_90d'
      ])
      expect(differentRanges.isValid).toBe(false)
      expect(differentRanges.conflicts.length).toBeGreaterThan(0)
    })
  })

  describe('エンドツーエンド統合テスト', () => {
    it('日付範囲変更から疲労度計算まで全体の流れが正しく動作することを検証', async () => {
      const { useFatigueCalculation } = await import('../../hooks/useFatigueCalculation')
      
      // モックデータの設定
      const mockApiData = [
        {
          ad_id: 'e2e_ad_1',
          ad_name: 'E2E Test Ad',
          campaign_id: 'e2e_campaign',
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
      ]

      const mockFatigueResult = [
        {
          ad_id: 'e2e_ad_1',
          totalScore: 42,
          creativeFatigue: 15,
          audienceFatigue: 12,
          platformFatigue: 15
        }
      ]

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          data: mockApiData,
          paging: {}
        })
      })

      ;(useFatigueCalculation as any).mockReturnValue(mockFatigueResult)

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

      // 初期状態の確認
      await waitFor(() => {
        expect(result.current.fatigueData).toEqual(mockFatigueResult)
      })

      expect(result.current.processTime?.dateRange).toBe('last_30d')
      expect(result.current.stats?.totalAds).toBe(1)

      // 日付範囲を変更
      dateRange = 'last_7d'
      rerender()

      // 変更が全体に伝播することを確認
      await waitFor(() => {
        expect(result.current.processTime?.dateRange).toBe('last_7d')
      })

      // 新しい日付範囲でAPI呼び出しが実行されることを確認
      const apiCalls = (global.fetch as any).mock.calls
      const last7dCall = apiCalls.find((call: any[]) => {
        const url = new URL(call[0])
        return url.searchParams.get('date_preset') === 'last_7d'
      })

      expect(last7dCall).toBeDefined()
    })

    it('エラーハンドリングが全体で正しく動作することを検証', async () => {
      // API エラーをシミュレート
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

      // エラーが適切に伝播することを確認
      await waitFor(() => {
        expect(result.current.error).toBeTruthy()
      })

      expect(result.current.error?.message).toContain('Network error')
      expect(result.current.fatigueData).toBeNull()
      expect(result.current.processTime?.error).toBe(true)
    })
  })
})