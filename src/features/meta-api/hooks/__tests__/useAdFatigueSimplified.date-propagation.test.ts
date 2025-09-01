import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useAdFatigueSimplified } from '../useAdFatigueSimplified'
import type { UseAdFatigueOptions } from '../useAdFatigueSimplified'

// Mock useMetaInsights
const mockMetaInsights = {
  insights: null,
  isLoading: false,
  error: null,
  fetch: vi.fn(),
  currentDatePreset: 'last_30d',
  lastFetchTime: null
}

vi.mock('../useMetaInsights', () => ({
  useMetaInsights: vi.fn(() => mockMetaInsights)
}))

vi.mock('../../../lib/vibelogger', () => ({
  vibe: {
    debug: vi.fn(),
    warn: vi.fn(),
    bad: vi.fn(),
    good: vi.fn()
  }
}))

describe('useAdFatigueSimplified - Date Range Propagation Tests', () => {
  const mockAccountId = 'act_123456789'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('日付範囲の伝播テスト', () => {
    it('dateRangeパラメータがuseMetaInsightsのdatePresetに正しく伝播されること', () => {
      const { useMetaInsights } = require('../useMetaInsights')
      
      renderHook(
        () => useAdFatigueSimplified({ 
          accountId: mockAccountId, 
          dateRange: 'last_14d' 
        }),
        {
          wrapper: ({ children }) => <div>{children}</div>
        }
      )

      // useMetaInsightsが正しいパラメータで呼ばれているか確認
      expect(useMetaInsights).toHaveBeenCalledWith({
        accountId: mockAccountId,
        autoFetch: true,
        datePreset: 'last_14d'
      })
    })

    it('dateRangeのデフォルト値が"last_30d"であることを確認', () => {
      const { useMetaInsights } = require('../useMetaInsights')
      
      renderHook(
        () => useAdFatigueSimplified({ accountId: mockAccountId }),
        {
          wrapper: ({ children }) => <div>{children}</div>
        }
      )

      expect(useMetaInsights).toHaveBeenCalledWith({
        accountId: mockAccountId,
        autoFetch: true,
        datePreset: 'last_30d'
      })
    })

    it('dateRange変更時にfetchが呼ばれることを確認', async () => {
      let dateRange = 'last_30d'
      const { rerender } = renderHook(
        () => useAdFatigueSimplified({ 
          accountId: mockAccountId, 
          dateRange 
        }),
        {
          wrapper: ({ children }) => <div>{children}</div>
        }
      )

      // 初期状態でのfetch呼び出し回数を記録
      const initialFetchCalls = mockMetaInsights.fetch.mock.calls.length

      // dateRangeを変更
      dateRange = 'last_7d'
      rerender()

      // fetchが追加で呼ばれたことを確認
      await waitFor(() => {
        expect(mockMetaInsights.fetch.mock.calls.length).toBeGreaterThan(initialFetchCalls)
      })

      // 最後のfetch呼び出しでdatePresetOverrideが使われていることを確認
      const lastFetchCall = mockMetaInsights.fetch.mock.calls.at(-1)
      expect(lastFetchCall[0]).toEqual({
        forceRefresh: true,
        datePresetOverride: 'last_7d'
      })
    })

    it('初回レンダリング時にはfetchが呼ばれないこと', () => {
      renderHook(
        () => useAdFatigueSimplified({ 
          accountId: mockAccountId, 
          dateRange: 'last_30d' 
        }),
        {
          wrapper: ({ children }) => <div>{children}</div>
        }
      )

      // 初回レンダリングではfetchは呼ばれない（autoFetch: trueに任せる）
      expect(mockMetaInsights.fetch).not.toHaveBeenCalled()
    })

    it('同じdateRangeで再レンダリングしてもfetchが呼ばれないこと', async () => {
      const { rerender } = renderHook(
        () => useAdFatigueSimplified({ 
          accountId: mockAccountId, 
          dateRange: 'last_30d' 
        }),
        {
          wrapper: ({ children }) => <div>{children}</div>
        }
      )

      const initialFetchCalls = mockMetaInsights.fetch.mock.calls.length

      // 同じpropsで再レンダリング
      rerender()
      rerender()

      // fetchが余計に呼ばれていないことを確認
      await new Promise(resolve => setTimeout(resolve, 100))
      expect(mockMetaInsights.fetch.mock.calls.length).toBe(initialFetchCalls)
    })
  })

  describe('疲労度計算への日付範囲影響テスト', () => {
    const mockInsightsLast30d = [
      {
        ad_id: 'ad_1',
        ad_name: 'Test Ad 1',
        campaign_id: 'campaign_1',
        date_start: '2024-08-01',
        date_stop: '2024-08-01',
        impressions: 10000,
        clicks: 500,
        spend: 5000,
        ctr: 5.0,
        frequency: 2.0,
        cpm: 500,
        account_currency: 'JPY'
      }
    ]

    const mockInsightsLast7d = [
      {
        ad_id: 'ad_1',
        ad_name: 'Test Ad 1',
        campaign_id: 'campaign_1',
        date_start: '2024-08-25',
        date_stop: '2024-08-25',
        impressions: 3000,
        clicks: 120,
        spend: 1500,
        ctr: 4.0,
        frequency: 3.0,
        cpm: 500,
        account_currency: 'JPY'
      }
    ]

    it('30日データと7日データで疲労度スコアが異なることを確認', async () => {
      // 30日データでテスト
      const mockMetaInsights30d = {
        ...mockMetaInsights,
        insights: mockInsightsLast30d,
        currentDatePreset: 'last_30d'
      }
      
      const { useMetaInsights } = require('../useMetaInsights')
      useMetaInsights.mockReturnValue(mockMetaInsights30d)

      const { result: result30d } = renderHook(
        () => useAdFatigueSimplified({ 
          accountId: mockAccountId, 
          dateRange: 'last_30d' 
        }),
        {
          wrapper: ({ children }) => <div>{children}</div>
        }
      )

      await waitFor(() => {
        expect(result30d.current.fatigueData).toBeTruthy()
      })

      const fatigue30d = result30d.current.fatigueData?.[0]

      // 7日データでテスト
      const mockMetaInsights7d = {
        ...mockMetaInsights,
        insights: mockInsightsLast7d,
        currentDatePreset: 'last_7d'
      }
      
      useMetaInsights.mockReturnValue(mockMetaInsights7d)

      const { result: result7d } = renderHook(
        () => useAdFatigueSimplified({ 
          accountId: mockAccountId, 
          dateRange: 'last_7d' 
        }),
        {
          wrapper: ({ children }) => <div>{children}</div>
        }
      )

      await waitFor(() => {
        expect(result7d.current.fatigueData).toBeTruthy()
      })

      const fatigue7d = result7d.current.fatigueData?.[0]

      // データ期間によって疲労度が異なることを確認
      expect(fatigue30d?.totalScore).toBeDefined()
      expect(fatigue7d?.totalScore).toBeDefined()
      
      // Frequencyが上昇しているため7日データの方が疲労度が高いはず
      expect(fatigue7d?.totalScore).toBeGreaterThan(fatigue30d?.totalScore || 0)
    })

    it('日付範囲変更時に統計情報が正しく更新されることを確認', async () => {
      // 初期データ（30日）
      const mockMetaInsights30d = {
        ...mockMetaInsights,
        insights: mockInsightsLast30d,
        currentDatePreset: 'last_30d'
      }
      
      const { useMetaInsights } = require('../useMetaInsights')
      useMetaInsights.mockReturnValue(mockMetaInsights30d)

      let dateRange = 'last_30d'
      const { result, rerender } = renderHook(
        () => useAdFatigueSimplified({ 
          accountId: mockAccountId, 
          dateRange 
        }),
        {
          wrapper: ({ children }) => <div>{children}</div>
        }
      )

      await waitFor(() => {
        expect(result.current.stats).toBeTruthy()
      })

      const stats30d = result.current.stats
      expect(stats30d?.totalAds).toBe(1)
      expect(stats30d?.totalSpend).toBe(5000)

      // 7日データに変更
      const mockMetaInsights7d = {
        ...mockMetaInsights,
        insights: mockInsightsLast7d,
        currentDatePreset: 'last_7d'
      }
      
      useMetaInsights.mockReturnValue(mockMetaInsights7d)

      dateRange = 'last_7d'
      rerender()

      await waitFor(() => {
        const stats7d = result.current.stats
        expect(stats7d?.totalSpend).toBe(1500) // 新しいデータの値
      })
    })
  })

  describe('デバッグ情報の日付範囲対応', () => {
    it('日付範囲変更がログに記録されることを確認', async () => {
      const { vibe } = require('../../../lib/vibelogger')

      let dateRange = 'last_30d'
      const { rerender } = renderHook(
        () => useAdFatigueSimplified({ 
          accountId: mockAccountId, 
          dateRange 
        }),
        {
          wrapper: ({ children }) => <div>{children}</div>
        }
      )

      // dateRangeを変更
      dateRange = 'last_14d'
      rerender()

      await waitFor(() => {
        expect(vibe.debug).toHaveBeenCalledWith(
          expect.stringContaining('📅 日付範囲変更検知'),
          expect.objectContaining({
            oldRange: 'last_30d',
            newRange: 'last_14d'
          })
        )
      })
    })

    it('processTimeに日付範囲が含まれることを確認', async () => {
      const mockMetaInsightsWithData = {
        ...mockMetaInsights,
        insights: [
          {
            ad_id: 'ad_1',
            ad_name: 'Test Ad',
            impressions: 1000,
            clicks: 50,
            spend: 500,
            ctr: 5.0,
            frequency: 2.0,
            cpm: 500,
            account_currency: 'JPY'
          }
        ],
        currentDatePreset: 'last_14d'
      }
      
      const { useMetaInsights } = require('../useMetaInsights')
      useMetaInsights.mockReturnValue(mockMetaInsightsWithData)

      const { result } = renderHook(
        () => useAdFatigueSimplified({ 
          accountId: mockAccountId, 
          dateRange: 'last_14d' 
        }),
        {
          wrapper: ({ children }) => <div>{children}</div>
        }
      )

      await waitFor(() => {
        expect(result.current.processTime).toBeTruthy()
      })

      // processTimeにdateRangeの情報が含まれていることを確認
      const processTime = result.current.processTime
      expect(processTime?.dateRange).toBe('last_14d')
      expect(processTime?.dataCount).toBe(1)
      expect(processTime?.processingDuration).toBeDefined()
    })
  })

  describe('エラーハンドリングの日付範囲対応', () => {
    it('日付範囲変更時のエラーが適切にハンドリングされることを確認', async () => {
      const mockErrorMetaInsights = {
        ...mockMetaInsights,
        error: new Error('Invalid date preset: last_invalid'),
        currentDatePreset: 'last_invalid'
      }
      
      const { useMetaInsights } = require('../useMetaInsights')
      useMetaInsights.mockReturnValue(mockErrorMetaInsights)

      const { result } = renderHook(
        () => useAdFatigueSimplified({ 
          accountId: mockAccountId, 
          dateRange: 'last_invalid' 
        }),
        {
          wrapper: ({ children }) => <div>{children}</div>
        }
      )

      await waitFor(() => {
        expect(result.current.error).toBeTruthy()
        expect(result.current.error?.message).toContain('Invalid date preset')
      })

      // エラー時でもprocessTimeは生成される
      expect(result.current.processTime).toBeTruthy()
      expect(result.current.processTime?.error).toBe(true)
    })

    it('日付範囲変更中のローディング状態が適切に管理されることを確認', async () => {
      const mockLoadingMetaInsights = {
        ...mockMetaInsights,
        isLoading: true,
        currentDatePreset: 'last_7d'
      }
      
      const { useMetaInsights } = require('../useMetaInsights')
      useMetaInsights.mockReturnValue(mockLoadingMetaInsights)

      const { result } = renderHook(
        () => useAdFatigueSimplified({ 
          accountId: mockAccountId, 
          dateRange: 'last_7d' 
        }),
        {
          wrapper: ({ children }) => <div>{children}</div>
        }
      )

      expect(result.current.isLoading).toBe(true)
      expect(result.current.fatigueData).toBe(null)
      expect(result.current.stats).toBe(null)
    })
  })
})