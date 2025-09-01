import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useMetaInsights } from '../useMetaInsights'
import type { UseMetaInsightsOptions } from '../useMetaInsights'

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

// Mock Meta API
const mockApiResponse = {
  data: [
    {
      ad_id: 'test_ad_1',
      ad_name: 'Test Ad 1',
      campaign_id: 'test_campaign_1',
      date_start: '2024-08-01',
      date_stop: '2024-08-01',
      impressions: '1000',
      clicks: '50',
      spend: '5000',
      ctr: '5.0',
      account_currency: 'JPY'
    }
  ],
  paging: {}
}

global.fetch = vi.fn()

describe('useMetaInsights - Date Range Propagation Tests', () => {
  const mockAccountId = 'act_123456789'

  beforeEach(() => {
    vi.clearAllMocks()
    ;(global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockApiResponse
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('基本的な日付範囲パラメータ伝播', () => {
    it('datePresetが変更された時に自動的にデータを再取得すること', async () => {
      let datePreset = 'last_30d'
      const { result, rerender } = renderHook(
        () => useMetaInsights({ accountId: mockAccountId, datePreset, autoFetch: true }),
        {
          wrapper: ({ children }) => <div>{children}</div>
        }
      )

      // 初回レンダリング後の状態確認
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const initialCallCount = (global.fetch as any).mock.calls.length

      // datePresetを変更
      datePreset = 'last_7d'
      rerender()

      // 新しいdatePresetで再度APIが呼ばれることを確認
      await waitFor(() => {
        expect((global.fetch as any).mock.calls.length).toBeGreaterThan(initialCallCount)
      })

      // 最後のAPI呼び出しで正しいdatePresetが使われていることを確認
      const lastCall = (global.fetch as any).mock.calls.at(-1)[0]
      const url = new URL(lastCall)
      expect(url.searchParams.get('date_preset')).toBe('last_7d')
    })

    it('datePresetOverrideを使用してfetch時に一時的な日付範囲を指定できること', async () => {
      const { result } = renderHook(
        () => useMetaInsights({ accountId: mockAccountId, datePreset: 'last_30d', autoFetch: false }),
        {
          wrapper: ({ children }) => <div>{children}</div>
        }
      )

      // datePresetOverrideを使用してfetch実行
      await result.current.fetch({ datePresetOverride: 'last_14d' })

      // APIが正しいdatePresetで呼ばれたことを確認
      const lastCall = (global.fetch as any).mock.calls.at(-1)[0]
      const url = new URL(lastCall)
      expect(url.searchParams.get('date_preset')).toBe('last_14d')
    })

    it('currentDatePresetが現在の有効なdatePresetを返すこと', async () => {
      const { result } = renderHook(
        () => useMetaInsights({ accountId: mockAccountId, datePreset: 'last_30d', autoFetch: true }),
        {
          wrapper: ({ children }) => <div>{children}</div>
        }
      )

      await waitFor(() => {
        expect(result.current.currentDatePreset).toBe('last_30d')
      })
    })
  })

  describe('循環依存回避のテスト', () => {
    it('同じdatePresetで複数回useEffectが実行されても無限ループにならないこと', async () => {
      const { result, rerender } = renderHook(
        () => useMetaInsights({ accountId: mockAccountId, datePreset: 'last_30d', autoFetch: true }),
        {
          wrapper: ({ children }) => <div>{children}</div>
        }
      )

      // 初回レンダリング完了を待つ
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const initialCallCount = (global.fetch as any).mock.calls.length

      // 同じpropsで複数回rerender
      rerender()
      rerender()
      rerender()

      // APIが余計に呼ばれていないことを確認
      await new Promise(resolve => setTimeout(resolve, 100))
      expect((global.fetch as any).mock.calls.length).toBe(initialCallCount)
    })

    it('fetch関数の依存配列にdatePresetが含まれていても循環依存にならないこと', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      const { result } = renderHook(
        () => useMetaInsights({ accountId: mockAccountId, datePreset: 'last_30d', autoFetch: true }),
        {
          wrapper: ({ children }) => <div>{children}</div>
        }
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // 循環依存エラーが発生していないことを確認
      expect(consoleErrorSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Maximum update depth exceeded')
      )

      consoleErrorSpy.mockRestore()
    })
  })

  describe('キャッシュキー管理', () => {
    it('日付範囲ごとに異なるキャッシュキーを使用すること', async () => {
      // 最初のdatePresetでデータ取得
      const { result: result1 } = renderHook(
        () => useMetaInsights({ accountId: mockAccountId, datePreset: 'last_30d', autoFetch: true }),
        {
          wrapper: ({ children }) => <div>{children}</div>
        }
      )

      await waitFor(() => {
        expect(result1.current.isLoading).toBe(false)
      })

      // 異なるdatePresetでデータ取得
      const { result: result2 } = renderHook(
        () => useMetaInsights({ accountId: mockAccountId, datePreset: 'last_7d', autoFetch: true }),
        {
          wrapper: ({ children }) => <div>{children}</div>
        }
      )

      await waitFor(() => {
        expect(result2.current.isLoading).toBe(false)
      })

      // 両方のAPIコールが実行されたことを確認（キャッシュが分離されているため）
      expect((global.fetch as any).mock.calls.length).toBe(2)
      
      // 異なるdatePresetが使われていることを確認
      const call1 = new URL((global.fetch as any).mock.calls[0][0])
      const call2 = new URL((global.fetch as any).mock.calls[1][0])
      
      expect(call1.searchParams.get('date_preset')).toBe('last_30d')
      expect(call2.searchParams.get('date_preset')).toBe('last_7d')
    })

    it('forceRefreshオプションでキャッシュを無視して再取得すること', async () => {
      const { result } = renderHook(
        () => useMetaInsights({ accountId: mockAccountId, datePreset: 'last_30d', autoFetch: true }),
        {
          wrapper: ({ children }) => <div>{children}</div>
        }
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const initialCallCount = (global.fetch as any).mock.calls.length

      // forceRefreshでfetch実行
      await result.current.fetch({ forceRefresh: true })

      // 追加のAPIコールが実行されたことを確認
      expect((global.fetch as any).mock.calls.length).toBe(initialCallCount + 1)
    })
  })

  describe('エラーハンドリング', () => {
    it('datePreset変更時にAPIエラーが発生しても適切にエラー状態を管理すること', async () => {
      // 最初は成功レスポンス
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse
      })

      let datePreset = 'last_30d'
      const { result, rerender } = renderHook(
        () => useMetaInsights({ accountId: mockAccountId, datePreset, autoFetch: true }),
        {
          wrapper: ({ children }) => <div>{children}</div>
        }
      )

      await waitFor(() => {
        expect(result.current.error).toBe(null)
      })

      // 次回はエラーレスポンス
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: { message: 'Invalid date_preset', code: 100 }
        })
      })

      // datePresetを変更
      datePreset = 'invalid_preset'
      rerender()

      await waitFor(() => {
        expect(result.current.error).toBeTruthy()
        expect(result.current.error?.message).toContain('Invalid date_preset')
      })
    })

    it('ネットワークエラー時も適切にエラー状態を設定すること', async () => {
      ;(global.fetch as any).mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(
        () => useMetaInsights({ accountId: mockAccountId, datePreset: 'last_30d', autoFetch: true }),
        {
          wrapper: ({ children }) => <div>{children}</div>
        }
      )

      await waitFor(() => {
        expect(result.current.error).toBeTruthy()
        expect(result.current.error?.message).toContain('Network error')
      })
    })
  })

  describe('パフォーマンステスト', () => {
    it('短期間での複数datePreset変更でもパフォーマンスが劣化しないこと', async () => {
      const datePresets = ['last_7d', 'last_14d', 'last_30d', 'last_90d']
      let currentIndex = 0

      const { result, rerender } = renderHook(
        () => useMetaInsights({ 
          accountId: mockAccountId, 
          datePreset: datePresets[currentIndex], 
          autoFetch: true 
        }),
        {
          wrapper: ({ children }) => <div>{children}</div>
        }
      )

      const startTime = performance.now()

      // 短期間で複数回変更
      for (let i = 1; i < datePresets.length; i++) {
        currentIndex = i
        rerender()
        await waitFor(() => {
          expect(result.current.currentDatePreset).toBe(datePresets[i])
        })
      }

      const endTime = performance.now()
      const totalTime = endTime - startTime

      // 4回の変更が1秒以内で完了することを確認
      expect(totalTime).toBeLessThan(1000)

      // すべてのAPIコールが実行されたことを確認
      expect((global.fetch as any).mock.calls.length).toBe(datePresets.length)
    })
  })

  describe('データ整合性', () => {
    it('datePreset変更後のデータが正しい期間のものであることを確認', async () => {
      const mockLast7dResponse = {
        data: [
          {
            ...mockApiResponse.data[0],
            date_start: '2024-08-25',
            date_stop: '2024-08-25'
          }
        ],
        paging: {}
      }

      const mockLast30dResponse = {
        data: [
          {
            ...mockApiResponse.data[0],
            date_start: '2024-08-01',
            date_stop: '2024-08-01'
          }
        ],
        paging: {}
      }

      // レスポンスをdatePresetに応じて変える
      ;(global.fetch as any).mockImplementation((url: string) => {
        const urlObj = new URL(url)
        const datePreset = urlObj.searchParams.get('date_preset')
        
        return Promise.resolve({
          ok: true,
          json: async () => {
            if (datePreset === 'last_7d') return mockLast7dResponse
            if (datePreset === 'last_30d') return mockLast30dResponse
            return mockApiResponse
          }
        })
      })

      let datePreset = 'last_30d'
      const { result, rerender } = renderHook(
        () => useMetaInsights({ accountId: mockAccountId, datePreset, autoFetch: true }),
        {
          wrapper: ({ children }) => <div>{children}</div>
        }
      )

      // 初期データ確認
      await waitFor(() => {
        expect(result.current.insights?.[0]?.date_start).toBe('2024-08-01')
      })

      // datePreset変更
      datePreset = 'last_7d'
      rerender()

      // 新しいデータに更新されることを確認
      await waitFor(() => {
        expect(result.current.insights?.[0]?.date_start).toBe('2024-08-25')
      })
    })

    it('lastFetchTimeが適切に更新されること', async () => {
      const { result } = renderHook(
        () => useMetaInsights({ accountId: mockAccountId, datePreset: 'last_30d', autoFetch: true }),
        {
          wrapper: ({ children }) => <div>{children}</div>
        }
      )

      const fetchTime1 = result.current.lastFetchTime

      // 少し待ってから再取得
      await new Promise(resolve => setTimeout(resolve, 10))
      await result.current.fetch({ forceRefresh: true })

      const fetchTime2 = result.current.lastFetchTime

      // lastFetchTimeが更新されていることを確認
      expect(fetchTime2).not.toBe(fetchTime1)
      if (fetchTime1 && fetchTime2) {
        expect(fetchTime2.getTime()).toBeGreaterThan(fetchTime1.getTime())
      }
    })
  })
})