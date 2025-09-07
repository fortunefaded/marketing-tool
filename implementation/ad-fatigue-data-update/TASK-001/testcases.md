# TASK-001: Meta API フェッチャーの信頼性向上 - テストケース

## 概要

`useMetaApiFetcher` フックの信頼性向上に関する包括的なテストケース定義。同時実行制限、タイムアウト制御、トークン検証、レスポンス検証、エラーハンドリングの各機能について、正常系・異常系・境界値のテストケースを網羅する。

## 単体テスト (Unit Tests)

### UT-001: 同時実行制限機能テスト

#### UT-001-001: 正常系 - 単一リクエスト
```typescript
describe('useMetaApiFetcher - Concurrent Request Limit', () => {
  it('should execute single request normally', async () => {
    // Given: 初期状態のフック
    const { result } = renderHook(() => useMetaApiFetcher())
    
    // When: 単一のAPIリクエストを実行
    const promise = result.current.fetchData('/insights', { ad_id: 'test_ad' })
    
    // Then: リクエストが正常に実行される
    expect(result.current.state.isLoading).toBe(true)
    expect(result.current.state.isWaiting).toBe(false)
    
    const response = await promise
    expect(response).toBeDefined()
    expect(result.current.state.isLoading).toBe(false)
  })
})
```

#### UT-001-002: 異常系 - 同時リクエスト制限
```typescript
it('should limit concurrent requests to 1', async () => {
  // Given: フックが初期化されている
  const { result } = renderHook(() => useMetaApiFetcher())
  
  // When: 2つの同時リクエストを送信
  const request1 = result.current.fetchData('/insights', { ad_id: 'test_ad_1' })
  const request2 = result.current.fetchData('/insights', { ad_id: 'test_ad_2' })
  
  // Then: 1つ目はloading、2つ目はwaiting状態
  expect(result.current.state.isLoading).toBe(true)
  expect(result.current.state.isWaiting).toBe(true)
  
  // When: 1つ目のリクエストが完了
  await request1
  
  // Then: 2つ目のリクエストが開始される
  expect(result.current.state.isLoading).toBe(true)
  expect(result.current.state.isWaiting).toBe(false)
  
  await request2
  expect(result.current.state.isLoading).toBe(false)
})
```

#### UT-001-003: 境界値 - 3つ以上の同時リクエスト
```typescript
it('should queue multiple requests properly', async () => {
  const { result } = renderHook(() => useMetaApiFetcher())
  
  // Given: 3つの同時リクエスト
  const requests = [
    result.current.fetchData('/insights', { ad_id: 'test_ad_1' }),
    result.current.fetchData('/insights', { ad_id: 'test_ad_2' }),
    result.current.fetchData('/insights', { ad_id: 'test_ad_3' })
  ]
  
  // Then: キューが正しく管理される
  expect(result.current.state.isWaiting).toBe(true)
  
  // When: すべてのリクエストが順番に完了
  const results = await Promise.all(requests)
  
  // Then: すべてのリクエストが成功する
  expect(results).toHaveLength(3)
  expect(result.current.state.isLoading).toBe(false)
  expect(result.current.state.isWaiting).toBe(false)
})
```

### UT-002: タイムアウト制御機能テスト

#### UT-002-001: 正常系 - 30秒以内の正常レスポンス
```typescript
describe('useMetaApiFetcher - Timeout Control', () => {
  it('should complete request within timeout', async () => {
    // Given: 5秒で応答するモックAPI
    mockMetaApi.mockResponseDelay(5000)
    const { result } = renderHook(() => useMetaApiFetcher())
    
    // When: リクエストを実行
    const startTime = Date.now()
    const response = await result.current.fetchData('/insights', {})
    const endTime = Date.now()
    
    // Then: 30秒以内に完了し、レスポンスを受信
    expect(endTime - startTime).toBeLessThan(30000)
    expect(response).toBeDefined()
    expect(result.current.state.error).toBeNull()
  })
})
```

#### UT-002-002: 異常系 - 30秒タイムアウト
```typescript
it('should timeout after 30 seconds', async () => {
  // Given: 35秒でレスポンスするモックAPI
  mockMetaApi.mockResponseDelay(35000)
  const { result } = renderHook(() => useMetaApiFetcher())
  
  // When: リクエストを実行
  const startTime = Date.now()
  
  try {
    await result.current.fetchData('/insights', {})
    fail('Should have thrown timeout error')
  } catch (error) {
    // Then: 30秒でタイムアウトエラーが発生
    const endTime = Date.now()
    expect(endTime - startTime).toBeCloseTo(30000, -3) // 30秒±1秒
    expect(error.category).toBe('timeout')
    expect(result.current.state.error.category).toBe('timeout')
  }
})
```

#### UT-002-003: 設定系 - カスタムタイムアウト値
```typescript
it('should respect custom timeout setting', async () => {
  const customTimeout = 10000 // 10秒
  mockMetaApi.mockResponseDelay(15000) // 15秒でレスポンス
  
  const { result } = renderHook(() => 
    useMetaApiFetcher({ timeout: customTimeout })
  )
  
  const startTime = Date.now()
  
  try {
    await result.current.fetchData('/insights', {})
    fail('Should have thrown timeout error')
  } catch (error) {
    const endTime = Date.now()
    expect(endTime - startTime).toBeCloseTo(customTimeout, -3)
    expect(error.category).toBe('timeout')
  }
})
```

### UT-003: トークン有効期限チェック機能テスト

#### UT-003-001: 正常系 - 有効なトークン
```typescript
describe('useMetaApiFetcher - Token Validation', () => {
  it('should proceed with valid token', async () => {
    // Given: 有効期限内のトークン
    const validToken = createMockToken({ expiresAt: Date.now() + 3600000 }) // 1時間後
    mockTokenProvider.mockReturnValue(validToken)
    
    const { result } = renderHook(() => useMetaApiFetcher())
    
    // When: APIリクエストを実行
    const response = await result.current.fetchData('/insights', {})
    
    // Then: トークンチェックが通過し、リクエストが成功
    expect(mockTokenProvider).toHaveBeenCalledTimes(1)
    expect(response).toBeDefined()
    expect(result.current.state.error).toBeNull()
  })
})
```

#### UT-003-002: 異常系 - 期限切れトークン
```typescript
it('should reject expired token', async () => {
  // Given: 期限切れのトークン
  const expiredToken = createMockToken({ expiresAt: Date.now() - 3600000 }) // 1時間前
  mockTokenProvider.mockReturnValue(expiredToken)
  
  const { result } = renderHook(() => useMetaApiFetcher())
  
  // When: APIリクエストを実行
  try {
    await result.current.fetchData('/insights', {})
    fail('Should have thrown auth error')
  } catch (error) {
    // Then: 認証エラーが発生
    expect(error.category).toBe('auth')
    expect(error.actionRequired).toBe('reauth')
    expect(result.current.state.error.category).toBe('auth')
  }
})
```

#### UT-003-003: 境界値 - 期限切れ直前のトークン
```typescript
it('should handle token expiring soon', async () => {
  // Given: 5分後に期限切れのトークン（境界値）
  const soonToExpireToken = createMockToken({ 
    expiresAt: Date.now() + 300000 // 5分後
  })
  mockTokenProvider.mockReturnValue(soonToExpireToken)
  
  const { result } = renderHook(() => useMetaApiFetcher())
  
  // When: APIリクエストを実行
  const response = await result.current.fetchData('/insights', {})
  
  // Then: リクエストは成功するが、更新推奨の警告が出る
  expect(response).toBeDefined()
  expect(mockTokenRefreshRecommendation).toHaveBeenCalledWith('soon_expire')
})
```

### UT-004: レスポンスデータ検証機能テスト

#### UT-004-001: 正常系 - 有効なレスポンスデータ
```typescript
describe('useMetaApiFetcher - Response Validation', () => {
  it('should accept valid response data', async () => {
    // Given: 正しい構造のレスポンスデータ
    const validResponse = {
      data: [{
        impressions: '1000',
        clicks: '50',
        ctr: '5.0',
        cpm: '2.5',
        date_start: '2024-08-20',
        date_stop: '2024-08-20'
      }],
      paging: { cursors: { after: 'ABC123' } }
    }
    mockMetaApi.mockResolvedValue(validResponse)
    
    const { result } = renderHook(() => useMetaApiFetcher())
    
    // When: リクエストを実行
    const response = await result.current.fetchData('/insights', {})
    
    // Then: データが正常に返却される
    expect(response).toEqual(validResponse)
    expect(result.current.state.error).toBeNull()
  })
})
```

#### UT-004-002: 異常系 - 必須フィールド不足
```typescript
it('should reject response with missing required fields', async () => {
  // Given: 必須フィールドが不足するレスポンス
  const invalidResponse = {
    data: [{
      impressions: '1000',
      // clicks フィールドが不足
      ctr: '5.0',
      cpm: '2.5'
      // date_start, date_stop フィールドが不足
    }]
  }
  mockMetaApi.mockResolvedValue(invalidResponse)
  
  const { result } = renderHook(() => useMetaApiFetcher())
  
  // When: リクエストを実行
  try {
    await result.current.fetchData('/insights', {})
    fail('Should have thrown data validation error')
  } catch (error) {
    // Then: データ検証エラーが発生
    expect(error.category).toBe('data')
    expect(error.message).toContain('missing required fields')
    expect(result.current.state.error.category).toBe('data')
  }
})
```

#### UT-004-003: 異常系 - 不正な数値データ
```typescript
it('should reject response with invalid numeric data', async () => {
  // Given: 不正な数値を含むレスポンス
  const invalidResponse = {
    data: [{
      impressions: 'invalid_number',
      clicks: '-50', // 負の値
      ctr: '150.0', // 100%超えのCTR
      cpm: 'not_a_number',
      date_start: '2024-08-20',
      date_stop: '2024-08-20'
    }]
  }
  mockMetaApi.mockResolvedValue(invalidResponse)
  
  const { result } = renderHook(() => useMetaApiFetcher())
  
  try {
    await result.current.fetchData('/insights', {})
    fail('Should have thrown data validation error')
  } catch (error) {
    expect(error.category).toBe('data')
    expect(error.message).toContain('invalid numeric values')
  }
})
```

### UT-005: エラーカテゴリ分類機能テスト

#### UT-005-001: ネットワークエラー分類
```typescript
describe('useMetaApiFetcher - Error Classification', () => {
  it('should classify network errors correctly', async () => {
    // Given: ネットワークエラーを発生させるモック
    const networkError = new Error('Network request failed')
    networkError.code = 'NETWORK_ERROR'
    mockMetaApi.mockRejectedValue(networkError)
    
    const { result } = renderHook(() => useMetaApiFetcher())
    
    // When: リクエストを実行
    try {
      await result.current.fetchData('/insights', {})
    } catch (error) {
      // Then: ネットワークエラーとして分類される
      expect(error.category).toBe('network')
      expect(error.retryable).toBe(true)
      expect(error.actionRequired).toBeUndefined()
    }
  })
})
```

#### UT-005-002: 認証エラー分類
```typescript
it('should classify auth errors correctly', async () => {
  // Given: 認証エラーを発生させるモック
  const authError = new Error('Invalid access token')
  authError.code = 190 // Meta APIの認証エラーコード
  mockMetaApi.mockRejectedValue(authError)
  
  const { result } = renderHook(() => useMetaApiFetcher())
  
  try {
    await result.current.fetchData('/insights', {})
  } catch (error) {
    expect(error.category).toBe('auth')
    expect(error.retryable).toBe(false)
    expect(error.actionRequired).toBe('reauth')
  }
})
```

#### UT-005-003: レート制限エラー分類
```typescript
it('should classify rate limit errors correctly', async () => {
  // Given: レート制限エラーを発生させるモック
  const rateLimitError = new Error('Too many requests')
  rateLimitError.code = 4 // Meta APIのレート制限エラーコード
  mockMetaApi.mockRejectedValue(rateLimitError)
  
  const { result } = renderHook(() => useMetaApiFetcher())
  
  try {
    await result.current.fetchData('/insights', {})
  } catch (error) {
    expect(error.category).toBe('ratelimit')
    expect(error.retryable).toBe(true)
    expect(error.actionRequired).toBe('wait')
  }
})
```

## 統合テスト (Integration Tests)

### IT-001: 実Meta API通信テスト

#### IT-001-001: 実APIでの正常フロー
```typescript
describe('useMetaApiFetcher - Real API Integration', () => {
  it('should work with real Meta API', async () => {
    // Given: テスト環境での実際のMeta APIトークン
    const realToken = process.env.TEST_META_API_TOKEN
    const testAdId = process.env.TEST_AD_ID
    
    if (!realToken || !testAdId) {
      console.warn('Skipping real API test: missing credentials')
      return
    }
    
    mockTokenProvider.mockReturnValue({ 
      accessToken: realToken,
      expiresAt: Date.now() + 3600000
    })
    
    const { result } = renderHook(() => useMetaApiFetcher())
    
    // When: 実際のMeta APIにリクエスト
    const response = await result.current.fetchData('/insights', {
      ad_id: testAdId,
      fields: 'impressions,clicks,ctr,cpm',
      time_range: { since: '2024-08-20', until: '2024-08-20' }
    })
    
    // Then: 正常なレスポンスを受信
    expect(response).toBeDefined()
    expect(response.data).toBeArray()
    expect(result.current.state.error).toBeNull()
  }, 10000) // 10秒のタイムアウト
})
```

### IT-002: トークン更新フロー統合テスト

```typescript
it('should handle token refresh flow', async () => {
  // Given: 期限切れ直前のトークンとリフレッシュ機能
  let tokenCallCount = 0
  mockTokenProvider.mockImplementation(() => {
    tokenCallCount++
    if (tokenCallCount === 1) {
      return { accessToken: 'expired_token', expiresAt: Date.now() - 1000 }
    }
    return { accessToken: 'fresh_token', expiresAt: Date.now() + 3600000 }
  })
  
  const { result } = renderHook(() => useMetaApiFetcher())
  
  // When: APIリクエストを実行（トークンリフレッシュが発生）
  const response = await result.current.fetchData('/insights', {})
  
  // Then: トークンが更新され、リクエストが成功
  expect(tokenCallCount).toBe(2)
  expect(response).toBeDefined()
})
```

## エラーシナリオテスト (Error Scenario Tests)

### ET-001: ネットワーク障害テスト

```typescript
describe('useMetaApiFetcher - Network Failure Scenarios', () => {
  it('should handle intermittent network failures', async () => {
    // Given: 間欠的なネットワーク障害をシミュレート
    let callCount = 0
    mockMetaApi.mockImplementation(() => {
      callCount++
      if (callCount <= 2) {
        throw new Error('Network timeout')
      }
      return Promise.resolve({ data: [] })
    })
    
    const { result } = renderHook(() => 
      useMetaApiFetcher({ retryAttempts: 3 })
    )
    
    // When: リクエストを実行
    const response = await result.current.fetchData('/insights', {})
    
    // Then: リトライ後に成功
    expect(callCount).toBe(3)
    expect(response).toBeDefined()
  })
})
```

### ET-002: Meta APIメンテナンステスト

```typescript
it('should handle Meta API maintenance', async () => {
  // Given: Meta API メンテナンスエラーをシミュレート
  const maintenanceError = new Error('Service temporarily unavailable')
  maintenanceError.code = 2 // Meta APIのメンテナンスコード
  mockMetaApi.mockRejectedValue(maintenanceError)
  
  const { result } = renderHook(() => useMetaApiFetcher())
  
  try {
    await result.current.fetchData('/insights', {})
  } catch (error) {
    expect(error.category).toBe('network')
    expect(error.actionRequired).toBe('wait')
    expect(error.message).toContain('maintenance')
  }
})
```

## パフォーマンステスト (Performance Tests)

### PT-001: メモリリーク検証

```typescript
describe('useMetaApiFetcher - Performance', () => {
  it('should not cause memory leaks', async () => {
    // Given: メモリ使用量の初期値を記録
    const initialMemory = process.memoryUsage().heapUsed
    
    // When: 大量のリクエストを実行
    for (let i = 0; i < 100; i++) {
      const { unmount } = renderHook(() => useMetaApiFetcher())
      await act(async () => {
        // リクエストを実行してアンマウント
      })
      unmount()
    }
    
    // Then: メモリ使用量が一定範囲内
    global.gc() // ガベージコレクション実行
    const finalMemory = process.memoryUsage().heapUsed
    const memoryIncrease = finalMemory - initialMemory
    expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024) // 10MB未満
  })
})
```

## テスト環境設定

### モック設定

```typescript
// test/setup/meta-api-mocks.ts
export const mockMetaApi = {
  mockResolvedValue: (value: any) => jest.fn().mockResolvedValue(value),
  mockRejectedValue: (error: Error) => jest.fn().mockRejectedValue(error),
  mockResponseDelay: (ms: number) => {
    return jest.fn().mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({ data: [] }), ms))
    )
  }
}

export const mockTokenProvider = {
  mockReturnValue: (token: any) => jest.fn().mockReturnValue(token),
  mockImplementation: (fn: () => any) => jest.fn().mockImplementation(fn)
}
```

### テストデータ

```typescript
// test/fixtures/meta-api-responses.ts
export const validMetaApiResponse = {
  data: [{
    impressions: '1000',
    clicks: '50', 
    ctr: '5.0',
    cpm: '2.5',
    date_start: '2024-08-20',
    date_stop: '2024-08-20'
  }],
  paging: {
    cursors: { after: 'ABC123' }
  }
}

export const createMockToken = (overrides = {}) => ({
  accessToken: 'mock_token_123',
  expiresAt: Date.now() + 3600000,
  ...overrides
})
```

## テスト実行設定

### Jest設定

```json
{
  "testEnvironment": "jsdom",
  "setupFilesAfterEnv": ["<rootDir>/test/setup.ts"],
  "testTimeout": 10000,
  "collectCoverageFrom": [
    "src/features/meta-api/hooks/useMetaApiFetcher.ts",
    "!src/**/*.d.ts"
  ],
  "coverageThreshold": {
    "global": {
      "branches": 90,
      "functions": 95,
      "lines": 95,
      "statements": 95
    }
  }
}
```

## テスト実行コマンド

```bash
# すべてのテストを実行
npm test useMetaApiFetcher

# 特定のテストカテゴリを実行
npm test useMetaApiFetcher -- --testNamePattern="Unit Tests"
npm test useMetaApiFetcher -- --testNamePattern="Integration Tests"

# カバレッジレポート付きでテスト実行
npm test useMetaApiFetcher -- --coverage

# ウォッチモードでテスト実行
npm test useMetaApiFetcher -- --watch
```

---

**テストケース総数**: 18  
**カバレッジ目標**: 95%以上  
**作成日**: 2024-08-25  
**最終更新**: 2024-08-25