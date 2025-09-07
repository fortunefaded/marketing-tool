# TASK-001: RED Phase - 失敗テスト実装

## 概要

TDDのRED Phaseとして、まず失敗するテストを実装します。要件で定義したインターフェイスと機能に対して、現在の実装では通らないテストを作成し、テストファーストでの開発を実現します。

## 失敗テスト実装

### 1. テストファイル作成

```typescript
// src/features/meta-api/hooks/__tests__/useMetaApiFetcher.test.ts
import { renderHook, act, waitFor } from '@testing-library/react'
import { useMetaApiFetcher } from '../useMetaApiFetcher'
import * as mockMetaApi from '../../../__mocks__/meta-api'

// モックの設定
jest.mock('../core/api-client')
jest.mock('../core/token')
jest.mock('../fatigue/calculator')

describe('useMetaApiFetcher - Enhanced Reliability', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // UT-001-001: 期待されるインターフェイス構造のテスト
  describe('Interface Structure', () => {
    it('should provide expected interface structure', () => {
      const { result } = renderHook(() => useMetaApiFetcher())
      
      // 現在のフックは基本的なインターフェイスのみ提供
      // 新しいインターフェイスを要求するため、このテストは失敗する
      expect(result.current).toHaveProperty('fetchData')
      expect(result.current).toHaveProperty('state')
      expect(result.current).toHaveProperty('cancelRequest')
      expect(typeof result.current.fetchData).toBe('function')
      expect(typeof result.current.cancelRequest).toBe('function')
      
      // 状態オブジェクトの構造確認
      expect(result.current.state).toHaveProperty('isLoading')
      expect(result.current.state).toHaveProperty('isWaiting')
      expect(result.current.state).toHaveProperty('error')
      expect(result.current.state).toHaveProperty('lastFetchTime')
      expect(result.current.state).toHaveProperty('requestId')
      
      // 初期状態の確認
      expect(result.current.state.isLoading).toBe(false)
      expect(result.current.state.isWaiting).toBe(false)
      expect(result.current.state.error).toBeNull()
      expect(result.current.state.lastFetchTime).toBeNull()
      expect(result.current.state.requestId).toBeNull()
    })
  })

  // UT-001-002: 同時実行制限テスト
  describe('Concurrent Request Limiting', () => {
    it('should limit concurrent requests to 1', async () => {
      // Given: フックの初期化
      const { result } = renderHook(() => useMetaApiFetcher())
      
      // Given: 長時間実行されるAPIリクエストをモック
      mockMetaApi.mockResponseDelay(2000)
      
      let request1Started = false
      let request2Started = false
      
      // When: 2つの同時リクエストを実行
      act(() => {
        result.current.fetchData('/insights', { ad_id: 'test_1' }).then(() => {
          request1Started = true
        })
        result.current.fetchData('/insights', { ad_id: 'test_2' }).then(() => {
          request2Started = true  
        })
      })
      
      // Then: 1つ目はloading、2つ目はwaiting状態になるべき
      // 現在の実装では同時実行制限がないため、このテストは失敗する
      await waitFor(() => {
        expect(result.current.state.isLoading).toBe(true)
        expect(result.current.state.isWaiting).toBe(true)
      })
      
      // When: 1つ目のリクエストが完了
      await waitFor(() => {
        expect(request1Started).toBe(true)
      })
      
      // Then: 2つ目のリクエストが開始される
      await waitFor(() => {
        expect(result.current.state.isWaiting).toBe(false)
        expect(result.current.state.isLoading).toBe(true)
      })
      
      await waitFor(() => {
        expect(request2Started).toBe(true)
        expect(result.current.state.isLoading).toBe(false)
      })
    })
  })

  // UT-002-002: タイムアウト制御テスト  
  describe('Timeout Control', () => {
    it('should timeout after 30 seconds by default', async () => {
      // Given: 35秒のレスポンス遅延をモック
      mockMetaApi.mockResponseDelay(35000)
      const { result } = renderHook(() => useMetaApiFetcher())
      
      const startTime = Date.now()
      
      // When: リクエストを実行
      await act(async () => {
        try {
          await result.current.fetchData('/insights', {})
          // テストは失敗すべき（タイムアウトが実装されていないため）
          fail('Should have thrown timeout error')
        } catch (error) {
          // Then: 30秒でタイムアウトエラーが発生すべき
          const endTime = Date.now()
          expect(endTime - startTime).toBeCloseTo(30000, -3)
          expect(error.category).toBe('timeout')
        }
      })
    }, 40000) // テストタイムアウトを40秒に設定
    
    it('should respect custom timeout setting', async () => {
      // Given: カスタムタイムアウト（10秒）
      mockMetaApi.mockResponseDelay(15000)
      const { result } = renderHook(() => 
        useMetaApiFetcher({ timeout: 10000 })
      )
      
      const startTime = Date.now()
      
      await act(async () => {
        try {
          await result.current.fetchData('/insights', {})
          fail('Should have thrown timeout error')
        } catch (error) {
          const endTime = Date.now()
          expect(endTime - startTime).toBeCloseTo(10000, -3)
          expect(error.category).toBe('timeout')
        }
      })
    })
  })

  // UT-003-002: トークン有効期限チェックテスト
  describe('Token Validation', () => {
    it('should check token validity before request', async () => {
      // Given: 期限切れトークンをモック
      const expiredToken = {
        accessToken: 'expired_token',
        expiresAt: Date.now() - 3600000 // 1時間前に期限切れ
      }
      mockTokenProvider.mockReturnValue(expiredToken)
      
      const { result } = renderHook(() => useMetaApiFetcher())
      
      // When: APIリクエストを実行
      await act(async () => {
        try {
          await result.current.fetchData('/insights', {})
          fail('Should have thrown auth error')
        } catch (error) {
          // Then: 認証エラーが発生すべき
          // 現在の実装にはトークン有効期限チェックがないため失敗する
          expect(error.category).toBe('auth')
          expect(error.actionRequired).toBe('reauth')
        }
      })
    })
  })

  // UT-004-002: レスポンスデータ検証テスト
  describe('Response Data Validation', () => {
    it('should validate response data structure', async () => {
      // Given: 必須フィールドが不足するレスポンス
      const invalidResponse = {
        data: [{
          impressions: '1000'
          // clicks, ctr, cpm フィールドが不足
        }]
      }
      mockMetaApi.mockResolvedValue(invalidResponse)
      
      const { result } = renderHook(() => useMetaApiFetcher())
      
      // When: リクエストを実行
      await act(async () => {
        try {
          await result.current.fetchData('/insights', {})
          fail('Should have thrown validation error')
        } catch (error) {
          // Then: データ検証エラーが発生すべき
          // 現在の実装にはレスポンス検証がないため失敗する
          expect(error.category).toBe('data')
          expect(error.message).toContain('missing required fields')
        }
      })
    })

    it('should validate numeric field ranges', async () => {
      // Given: 不正な数値を含むレスポンス
      const invalidResponse = {
        data: [{
          impressions: 'not_a_number',
          clicks: '-10', // 負の値
          ctr: '150.0', // 100%超のCTR
          cpm: '999999.99' // 異常に高いCPM
        }]
      }
      mockMetaApi.mockResolvedValue(invalidResponse)
      
      const { result } = renderHook(() => useMetaApiFetcher())
      
      await act(async () => {
        try {
          await result.current.fetchData('/insights', {})
          fail('Should have thrown validation error')
        } catch (error) {
          expect(error.category).toBe('data')
          expect(error.message).toContain('invalid numeric values')
        }
      })
    })
  })

  // UT-005: エラーカテゴリ分類テスト
  describe('Error Classification', () => {
    it('should classify network errors', async () => {
      // Given: ネットワークエラーをモック
      const networkError = new Error('Network request failed')
      networkError.code = 'NETWORK_ERROR'
      mockMetaApi.mockRejectedValue(networkError)
      
      const { result } = renderHook(() => useMetaApiFetcher())
      
      await act(async () => {
        try {
          await result.current.fetchData('/insights', {})
        } catch (error) {
          // Then: ネットワークエラーとして分類されるべき
          // 現在の実装には詳細な分類がないため失敗する
          expect(error.category).toBe('network')
          expect(error.retryable).toBe(true)
        }
      })
    })

    it('should classify rate limit errors', async () => {
      const rateLimitError = new Error('Rate limit exceeded')
      rateLimitError.code = 4 // Meta API rate limit code
      mockMetaApi.mockRejectedValue(rateLimitError)
      
      const { result } = renderHook(() => useMetaApiFetcher())
      
      await act(async () => {
        try {
          await result.current.fetchData('/insights', {})
        } catch (error) {
          expect(error.category).toBe('ratelimit')
          expect(error.actionRequired).toBe('wait')
        }
      })
    })
  })

  // キャンセル機能テスト
  describe('Request Cancellation', () => {
    it('should cancel ongoing request', async () => {
      // Given: 長時間実行されるリクエスト
      mockMetaApi.mockResponseDelay(5000)
      const { result } = renderHook(() => useMetaApiFetcher())
      
      // When: リクエスト開始後すぐにキャンセル
      act(() => {
        result.current.fetchData('/insights', {})
      })
      
      expect(result.current.state.isLoading).toBe(true)
      
      act(() => {
        result.current.cancelRequest()
      })
      
      // Then: リクエストがキャンセルされ、状態がリセットされるべき
      // 現在の実装にはキャンセル機能がないため失敗する
      await waitFor(() => {
        expect(result.current.state.isLoading).toBe(false)
        expect(result.current.state.error).toBeNull()
      })
    })
  })

  // パフォーマンステスト
  describe('Performance Requirements', () => {
    it('should complete requests within 5 seconds under normal conditions', async () => {
      // Given: 正常なAPIレスポンス（1秒）
      mockMetaApi.mockResponseDelay(1000)
      const validResponse = {
        data: [{ impressions: '1000', clicks: '50', ctr: '5.0', cpm: '2.5' }]
      }
      mockMetaApi.mockResolvedValue(validResponse)
      
      const { result } = renderHook(() => useMetaApiFetcher())
      
      const startTime = Date.now()
      
      // When: APIリクエストを実行
      await act(async () => {
        await result.current.fetchData('/insights', {})
      })
      
      const endTime = Date.now()
      
      // Then: 5秒以内に完了すべき
      expect(endTime - startTime).toBeLessThan(5000)
    })
  })
})
```

## モックファイル作成

### Meta API モックファイル
```typescript
// src/features/meta-api/__mocks__/meta-api.ts
export const mockMetaApi = {
  mockResolvedValue: jest.fn(),
  mockRejectedValue: jest.fn(),
  mockResponseDelay: jest.fn(),
}

export const mockTokenProvider = {
  mockReturnValue: jest.fn(),
  mockImplementation: jest.fn(),
}

// デフォルトモックの実装
jest.mock('../core/api-client', () => ({
  SimpleMetaApi: jest.fn().mockImplementation(() => ({
    getInsights: mockMetaApi.mockResolvedValue
  }))
}))

jest.mock('../core/token', () => ({
  SimpleTokenStore: jest.fn().mockImplementation(() => ({
    getToken: mockTokenProvider.mockReturnValue
  }))
}))
```

### テストセットアップファイル
```typescript
// test/setup.ts
import '@testing-library/jest-dom'

// タイムアウト関連のモック
Object.defineProperty(window, 'setTimeout', {
  writable: true,
  value: jest.fn().mockImplementation((fn, delay) => {
    return global.setTimeout(fn, delay)
  })
})

Object.defineProperty(window, 'clearTimeout', {
  writable: true,
  value: jest.fn().mockImplementation((id) => {
    return global.clearTimeout(id)
  })
})

// AbortController のモック（リクエストキャンセル用）
Object.defineProperty(window, 'AbortController', {
  writable: true,
  value: class AbortController {
    signal = {
      aborted: false,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }
    abort = jest.fn(() => {
      this.signal.aborted = true
    })
  }
})
```

## テスト実行確認

### パッケージの依存関係確認
```bash
# 必要なテストライブラリがインストールされているか確認
npm list @testing-library/react @testing-library/jest-dom jest
```

### テスト実行
```bash
# 失敗テストの実行（RED Phase確認）
npm test useMetaApiFetcher.test.ts

# 期待される結果: すべてのテストが失敗する
# - インターフェイス構造テスト: FAIL
# - 同時実行制限テスト: FAIL  
# - タイムアウト制御テスト: FAIL
# - トークン検証テスト: FAIL
# - レスポンス検証テスト: FAIL
# - エラー分類テスト: FAIL
# - キャンセル機能テスト: FAIL
```

## 失敗理由の確認

現在のフックの制限:
1. **インターフェイス**: 基本的な`fetchFromApi`のみ提供、状態管理なし
2. **同時実行制限**: なし
3. **タイムアウト**: なし  
4. **トークン検証**: なし（基本的な取得のみ）
5. **レスポンス検証**: なし
6. **エラー分類**: 簡単な文字列マッチングのみ
7. **キャンセル機能**: なし
8. **状態管理**: なし（isLoading, isWaitingなど）

これらの制限により、すべてのテストが失敗し、RED Phaseが正しく完了します。

## 次のステップ

RED Phase完了後、GREEN Phaseで:
1. 新しいインターフェイス構造の実装
2. 状態管理の追加
3. 同時実行制限機能の実装
4. タイムアウト制御の実装
5. エラー分類・検証機能の実装

---

**RED Phase Status**: 🔴 FAILING  
**失敗テスト数**: 8+  
**次のフェーズ**: GREEN Phase (最小実装)