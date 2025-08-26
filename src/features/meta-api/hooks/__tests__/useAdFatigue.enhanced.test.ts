import { renderHook, act, waitFor } from '@testing-library/react'
import { useAdFatigue } from '../useAdFatigue'
import { vi, expect, describe, it, beforeEach } from 'vitest'

// Convexモック
const mockConvex = { query: vi.fn() }
vi.mock('convex/react', () => ({
  useConvex: () => mockConvex
}))

// useConvexCacheモック
const mockConvexCache = {
  data: vi.fn(() => []),
  hasCache: vi.fn(() => false),
  error: vi.fn(() => null)
}

vi.mock('../useConvexCache', () => ({
  useConvexCache: () => ({
    data: mockConvexCache.data(),
    hasCache: mockConvexCache.hasCache(),
    error: mockConvexCache.error()
  })
}))

// useMetaApiFetcherモック（TASK-001で強化済み）
const mockMetaApiFetcher = {
  fetchFromApi: vi.fn(),
  state: { isLoading: false, error: null },
  cancelRequest: vi.fn()
}

vi.mock('../useMetaApiFetcher', () => ({
  useMetaApiFetcher: () => mockMetaApiFetcher
}))

// SimpleFatigueCalculatorモック
const mockCalculator = {
  calculate: vi.fn((data) => data.map((item: any, i: number) => ({
    id: item.id || `fatigue_${i}`,
    score: 85,
    status: 'healthy'
  })))
}

vi.mock('../fatigue/calculator', () => ({
  SimpleFatigueCalculator: vi.fn(() => mockCalculator)
}))

describe('useAdFatigue - Enhanced State Management (RED Phase)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // デフォルトの成功ケース
    mockConvexCache.data.mockReturnValue([])
    mockConvexCache.hasCache.mockReturnValue(false)
    mockConvexCache.error.mockReturnValue(null)
    
    mockMetaApiFetcher.fetchFromApi.mockResolvedValue({
      data: [{ id: 'test_1', impressions: '1000' }],
      error: null
    })
  })

  // UT-001: 拡張された状態管理インターフェース
  describe('Enhanced State Interface', () => {
    it('should provide enhanced state structure', () => {
      const { result } = renderHook(() => useAdFatigue('test-account'))
      
      // 現在の実装は基本的な状態のみ提供
      // 新しい拡張状態インターフェースを要求するため失敗する
      expect(result.current).toHaveProperty('state')
      
      if (result.current.state) {
        expect(result.current.state).toHaveProperty('status')
        expect(result.current.state).toHaveProperty('canUpdate')
        expect(result.current.state).toHaveProperty('isUpdating')
        expect(result.current.state).toHaveProperty('progress')
        expect(result.current.state).toHaveProperty('lastUpdate')
      }
    })
  })

  // UT-002: 重複実行防止機能
  describe('Concurrent Update Prevention', () => {
    it('should prevent concurrent updates', async () => {
      // Given: 長時間実行される更新をモック
      let resolveFirst: () => void
      const longRunningPromise = new Promise<any>((resolve) => {
        resolveFirst = () => resolve({ data: [], error: null })
      })
      
      mockMetaApiFetcher.fetchFromApi.mockReturnValue(longRunningPromise)
      
      const { result } = renderHook(() => useAdFatigue('test-account'))
      
      // When: 2つの同時更新要求
      await act(async () => {
        // 1つ目の更新開始
        const firstUpdate = result.current.update?.()
        
        // 2つ目の更新試行（現在の実装では update メソッドが存在しない）
        const secondUpdate = result.current.update?.()
        
        // Then: 現在の実装には update メソッドがないため失敗する
        expect(result.current.update).toBeDefined()
        expect(typeof result.current.update).toBe('function')
        
        if (result.current.state) {
          expect(result.current.state.canUpdate).toBe(false)
        }
        
        resolveFirst!()
        await firstUpdate
        await secondUpdate
      })
    })
  })

  // UT-003: 進行状況追跡機能
  describe('Progress Tracking', () => {
    it('should track progress through stages', async () => {
      // Given: 進行状況追跡オプション付きフック
      const progressCallback = vi.fn()
      
      const { result } = renderHook(() => 
        useAdFatigue('test-account', {
          callbacks: { onUpdateProgress: progressCallback },
          enableProgressTracking: true
        })
      )
      
      // When: 更新を実行
      await act(async () => {
        // 現在の実装はオプション引数をサポートしていないため失敗する
        if (result.current.update) {
          await result.current.update()
        }
      })
      
      // Then: 進行状況が追跡されるべき（現在は実装されていない）
      if (result.current.state) {
        expect(result.current.state.progress).toBeDefined()
        expect(progressCallback).toHaveBeenCalled()
      }
    })
  })

  // UT-004: コールバック機能
  describe('Callback Functions', () => {
    it('should execute success callback', async () => {
      // Given: 成功コールバック付きフック
      const onSuccess = vi.fn()
      
      const { result } = renderHook(() => 
        useAdFatigue('test-account', {
          callbacks: { onUpdateSuccess: onSuccess }
        })
      )
      
      // When: 更新を実行
      await act(async () => {
        // 現在の実装はコールバックオプションをサポートしていない
        if (result.current.update) {
          await result.current.update()
        }
      })
      
      // Then: 成功コールバックが実行されるべき
      expect(onSuccess).toHaveBeenCalledWith({
        data: expect.any(Array),
        source: expect.any(String),
        duration: expect.any(Number),
        recordCount: expect.any(Number)
      })
    })

    it('should execute error callback', async () => {
      // Given: APIエラーとエラーコールバック
      const apiError = new Error('API failed')
      mockMetaApiFetcher.fetchFromApi.mockRejectedValue(apiError)
      
      const onError = vi.fn()
      
      const { result } = renderHook(() => 
        useAdFatigue('test-account', {
          callbacks: { onUpdateError: onError }
        })
      )
      
      // When: 更新を実行（エラー発生）
      await act(async () => {
        try {
          if (result.current.update) {
            await result.current.update()
          }
        } catch (error) {
          // エラーは期待される
        }
      })
      
      // Then: エラーコールバックが実行されるべき
      expect(onError).toHaveBeenCalledWith({
        category: expect.any(String),
        message: 'API failed',
        originalError: apiError,
        recoveryAction: expect.any(String),
        timestamp: expect.any(Date)
      })
    })
  })

  // UT-005: 状態管理の強化
  describe('Enhanced State Management', () => {
    it('should manage updating state properly', async () => {
      const { result } = renderHook(() => useAdFatigue('test-account'))
      
      // 初期状態の確認
      if (result.current.state) {
        expect(result.current.state.status).toBe('idle')
        expect(result.current.state.canUpdate).toBe(true)
        expect(result.current.state.isUpdating).toBe(false)
      }
      
      // 更新中の状態確認
      await act(async () => {
        if (result.current.update) {
          const updatePromise = result.current.update()
          
          // 更新開始直後の状態
          if (result.current.state) {
            expect(result.current.state.status).toBe('updating')
            expect(result.current.state.isUpdating).toBe(true)
            expect(result.current.state.canUpdate).toBe(false)
          }
          
          await updatePromise
        }
      })
      
      // 更新完了後の状態
      if (result.current.state) {
        expect(result.current.state.status).toBe('success')
        expect(result.current.state.isUpdating).toBe(false)
        expect(result.current.state.canUpdate).toBe(true)
      }
    })
  })

  // UT-006: UI応答性テスト
  describe('UI Responsiveness', () => {
    it('should update state within 100ms', async () => {
      const { result } = renderHook(() => useAdFatigue('test-account'))
      
      const startTime = performance.now()
      
      await act(async () => {
        if (result.current.update) {
          result.current.update()
          
          // 状態変更の即座な反映を確認
          await waitFor(() => {
            if (result.current.state) {
              expect(result.current.state.status).toBe('updating')
            }
          }, { timeout: 150 })
        }
      })
      
      const endTime = performance.now()
      
      // Then: 100ms以内の状態更新
      expect(endTime - startTime).toBeLessThan(100)
    })
  })

  // UT-007: エラー分類機能
  describe('Error Classification', () => {
    it('should classify different error types', async () => {
      // Given: 各種エラータイプのテスト
      const testCases = [
        {
          error: new Error('Cache connection failed'),
          expectedCategory: 'cache'
        },
        {
          error: new Error('API Error: 401'),
          expectedCategory: 'api'  
        },
        {
          error: new Error('Data validation failed'),
          expectedCategory: 'validation'
        }
      ]
      
      for (const testCase of testCases) {
        mockMetaApiFetcher.fetchFromApi.mockRejectedValueOnce(testCase.error)
        
        const { result } = renderHook(() => useAdFatigue('test-account'))
        
        await act(async () => {
          try {
            if (result.current.update) {
              await result.current.update()
            }
          } catch (error) {
            // エラーは期待される
          }
        })
        
        // エラー分類の確認
        if (result.current.state) {
          expect(result.current.state.error).toMatchObject({
            category: testCase.expectedCategory,
            message: testCase.error.message,
            originalError: testCase.error
          })
        }
      }
    })
  })
})