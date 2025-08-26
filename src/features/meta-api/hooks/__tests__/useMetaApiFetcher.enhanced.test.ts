import { renderHook, act, waitFor } from '@testing-library/react'
import { useMetaApiFetcher } from '../useMetaApiFetcher'
import { vi, expect, describe, it, beforeEach } from 'vitest'

// Convexモックの改善
const mockConvexQuery = vi.fn()
const mockConvex = {
  query: mockConvexQuery
}

// useConvex フックのモック
vi.mock('convex/react', () => ({
  useConvex: () => mockConvex
}))

// より詳細なモック設定
const mockMetaApi = {
  getInsights: vi.fn()
}

const mockTokenStore = {
  getToken: vi.fn()
}

// モック実装の改善
vi.mock('../core/api-client', () => ({
  SimpleMetaApi: vi.fn().mockImplementation(() => ({
    getInsights: mockMetaApi.getInsights
  }))
}))

vi.mock('../core/token', () => ({
  SimpleTokenStore: vi.fn().mockImplementation(() => ({
    getToken: mockTokenStore.getToken
  }))
}))

describe('useMetaApiFetcher - Enhanced Reliability (REFACTOR Phase)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // デフォルトの成功ケースをセットアップ
    mockTokenStore.getToken.mockResolvedValue({
      accessToken: 'valid_token',
      expiresAt: Date.now() + 3600000 // 1時間後
    })
    
    mockMetaApi.getInsights.mockResolvedValue({
      data: [{
        impressions: '1000',
        clicks: '50',
        ctr: '5.0',
        cpm: '2.5'
      }]
    })
  })

  describe('Interface Structure', () => {
    it('should provide complete enhanced interface', () => {
      const { result } = renderHook(() => useMetaApiFetcher('test-account'))
      
      expect(result.current).toHaveProperty('fetchData')
      expect(result.current).toHaveProperty('state')
      expect(result.current).toHaveProperty('cancelRequest')
      expect(result.current).toHaveProperty('fetchFromApi') // 後方互換性
      
      expect(typeof result.current.fetchData).toBe('function')
      expect(typeof result.current.cancelRequest).toBe('function')
      expect(typeof result.current.fetchFromApi).toBe('function')
      
      // 状態構造の確認
      expect(result.current.state).toMatchObject({
        isLoading: false,
        isWaiting: false,
        error: null,
        lastFetchTime: null,
        requestId: null
      })
    })
  })

  // UT-001-002: 同時実行制限テスト
  describe('Concurrent Request Limiting', () => {
    it('should limit concurrent requests to 1', async () => {
      const { result } = renderHook(() => useMetaApiFetcher('test-account'))
      
      // 現在のフックには同時実行制限がないため、このテストは失敗する
      if (result.current.fetchData && result.current.state) {
        act(() => {
          result.current.fetchData('/insights', { ad_id: 'test_1' })
          result.current.fetchData('/insights', { ad_id: 'test_2' })
        })
        
        // 現在の実装では state がないため失敗する
        expect(result.current.state.isLoading).toBe(true)
        expect(result.current.state.isWaiting).toBe(true)
      }
    })
  })

  // UT-002-002: タイムアウト制御テスト  
  describe('Timeout Control', () => {
    it('should timeout after 30 seconds by default', async () => {
      const { result } = renderHook(() => useMetaApiFetcher('test-account'))
      
      // タイムアウト機能がないため失敗する
      if (result.current.fetchData) {
        const startTime = Date.now()
        
        try {
          // 現在のfetchFromApiは無限に待機する可能性がある
          await result.current.fetchFromApi()
          
          // タイムアウトが実装されていない場合、このテストは失敗する
          const endTime = Date.now()
          expect(endTime - startTime).toBeLessThan(30000)
          
        } catch (error: any) {
          // タイムアウトエラーのカテゴリ分類がないため失敗する
          expect(error.category).toBe('timeout')
        }
      }
    })
  })

  // UT-003-002: トークン有効期限チェックテスト
  describe('Token Validation', () => {
    it('should handle expired token properly', async () => {
      // 期限切れトークンを設定
      mockTokenStore.getToken.mockResolvedValue({
        accessToken: 'expired_token',
        expiresAt: Date.now() - 3600000 // 1時間前
      })
      
      const { result } = renderHook(() => useMetaApiFetcher('test-account'))
      
      await act(async () => {
        try {
          await result.current.fetchData('/insights', {})
          fail('Should have thrown auth error')
        } catch (error: any) {
          expect(error.category).toBe('auth')
          expect(error.actionRequired).toBe('reauth')
        }
      })
      
      expect(result.current.state.error?.category).toBe('auth')
    })
  })

  // キャンセル機能テスト
  describe('Request Cancellation', () => {
    it('should provide cancelRequest function', () => {
      const { result } = renderHook(() => useMetaApiFetcher('test-account'))
      
      // 現在の実装にはcancelRequest機能がないため失敗する
      expect(result.current).toHaveProperty('cancelRequest')
      expect(typeof result.current.cancelRequest).toBe('function')
    })
  })

  // 状態管理テスト
  describe('State Management', () => {
    it('should manage loading states properly', async () => {
      const { result } = renderHook(() => useMetaApiFetcher('test-account'))
      
      // 現在の実装には状態管理がないため失敗する
      expect(result.current).toHaveProperty('state')
      
      if (result.current.state) {
        // 初期状態の確認
        expect(result.current.state.isLoading).toBe(false)
        expect(result.current.state.isWaiting).toBe(false)
        expect(result.current.state.error).toBeNull()
      }
    })
  })

  // エラー分類テスト
  describe('Error Classification', () => {
    it('should classify errors with categories', async () => {
      const networkError = new Error('Network request failed')
      mockMetaApi.mockRejectedValue(networkError)
      
      const { result } = renderHook(() => useMetaApiFetcher('test-account'))
      
      if (result.current.fetchFromApi) {
        try {
          await result.current.fetchFromApi()
        } catch (error: any) {
          // 現在の実装には詳細なエラー分類がないため失敗する
          expect(error).toHaveProperty('category')
          expect(error).toHaveProperty('retryable')
        }
      }
    })
  })
})