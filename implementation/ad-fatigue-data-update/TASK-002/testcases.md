# TASK-002: データ更新状態管理の改善 - テストケース

## 概要

`useAdFatigue` フックの状態管理強化に関する包括的なテストケース定義。重複実行防止、進行状況追跡、コールバック機能、UI応答性の各機能について、正常系・異常系・境界値のテストケースを網羅する。

## 単体テスト (Unit Tests)

### UT-001: 重複実行防止機能テスト

#### UT-001-001: 正常系 - 単一更新の実行
```typescript
describe('useAdFatigue - Concurrent Update Prevention', () => {
  it('should execute single update normally', async () => {
    // Given: 初期状態のフック
    const { result } = renderHook(() => useAdFatigue('test-account'))
    
    // When: 単一の更新要求を実行
    await act(async () => {
      await result.current.update()
    })
    
    // Then: 更新が正常に完了する
    expect(result.current.state.status).toBe('success')
    expect(result.current.state.canUpdate).toBe(true)
    expect(result.current.data.length).toBeGreaterThan(0)
  })
})
```

#### UT-001-002: 異常系 - 重複更新の防止
```typescript
it('should prevent concurrent updates', async () => {
  // Given: フックが初期化されている
  const { result } = renderHook(() => useAdFatigue('test-account'))
  
  // Given: 長時間実行される更新をモック
  let resolveFirstUpdate: () => void
  mockMetaApiFetcher.mockImplementation(() => 
    new Promise(resolve => {
      resolveFirstUpdate = () => resolve({ data: [], error: null })
    })
  )
  
  // When: 2つの同時更新要求を送信
  let secondUpdateCalled = false
  await act(async () => {
    // 1つ目の更新を開始
    const firstUpdate = result.current.update()
    
    // 2つ目の更新を試行
    const secondUpdate = result.current.update().catch(() => {
      secondUpdateCalled = true
    })
    
    // Then: 1つ目が実行中、2つ目は防止される
    expect(result.current.state.status).toBe('updating')
    expect(result.current.state.canUpdate).toBe(false)
    
    // 1つ目の更新を完了
    resolveFirstUpdate()
    await firstUpdate
    await secondUpdate
  })
  
  // Then: 2つ目の更新は実行されない
  expect(secondUpdateCalled).toBe(true)
  expect(result.current.state.canUpdate).toBe(true)
})
```

#### UT-001-003: 境界値 - 3つ以上の同時更新要求
```typescript
it('should handle multiple concurrent update attempts', async () => {
  const { result } = renderHook(() => useAdFatigue('test-account'))
  
  // Given: 複数の同時更新要求
  const updatePromises = Array(5).fill(0).map(() => 
    result.current.update().catch(() => 'prevented')
  )
  
  // When: すべての更新要求を処理
  const results = await Promise.all(updatePromises)
  
  // Then: 1つだけが成功し、他は防止される
  const successCount = results.filter(r => r !== 'prevented').length
  expect(successCount).toBe(1)
  expect(result.current.state.status).toBe('success')
})
```

### UT-002: 進行状況追跡機能テスト

#### UT-002-001: 正常系 - 進行状況の段階的更新
```typescript
describe('useAdFatigue - Progress Tracking', () => {
  it('should track progress through all stages', async () => {
    // Given: 進行状況追跡が有効なフック
    const progressUpdates: any[] = []
    const onProgress = (progress: any) => progressUpdates.push(progress)
    
    const { result } = renderHook(() => 
      useAdFatigue('test-account', {
        callbacks: { onUpdateProgress: onProgress },
        enableProgressTracking: true
      })
    )
    
    // When: 更新を実行
    await act(async () => {
      await result.current.update()
    })
    
    // Then: すべての段階で進行状況が更新される
    expect(progressUpdates.length).toBeGreaterThan(0)
    
    const stages = progressUpdates.map(p => p.stage)
    expect(stages).toContain('cache-check')
    expect(stages).toContain('api-fetch')
    expect(stages).toContain('data-process')
    expect(stages).toContain('complete')
    
    // 進行状況が0-100%の範囲内
    progressUpdates.forEach(update => {
      expect(update.percentage).toBeGreaterThanOrEqual(0)
      expect(update.percentage).toBeLessThanOrEqual(100)
    })
  })
})
```

#### UT-002-002: 異常系 - エラー時の進行状況停止
```typescript
it('should stop progress tracking on error', async () => {
  // Given: APIエラーが発生する設定
  mockMetaApiFetcher.mockRejectedValue(new Error('API Error'))
  
  const progressUpdates: any[] = []
  const { result } = renderHook(() => 
    useAdFatigue('test-account', {
      callbacks: { onUpdateProgress: (p: any) => progressUpdates.push(p) }
    })
  )
  
  // When: 更新を実行（エラーが発生）
  await act(async () => {
    try {
      await result.current.update()
    } catch (error) {
      // エラーは期待される
    }
  })
  
  // Then: 進行状況が適切に停止される
  expect(result.current.state.status).toBe('error')
  expect(result.current.state.progress).toBeNull()
  
  // エラー発生段階まで進行状況が記録される
  expect(progressUpdates.length).toBeGreaterThan(0)
  const lastUpdate = progressUpdates[progressUpdates.length - 1]
  expect(lastUpdate.stage).not.toBe('complete')
})
```

#### UT-002-003: 設定系 - 進行状況追跡の無効化
```typescript
it('should skip progress tracking when disabled', async () => {
  // Given: 進行状況追跡が無効なフック
  const progressCallback = vi.fn()
  const { result } = renderHook(() => 
    useAdFatigue('test-account', {
      callbacks: { onUpdateProgress: progressCallback },
      enableProgressTracking: false
    })
  )
  
  // When: 更新を実行
  await act(async () => {
    await result.current.update()
  })
  
  // Then: 進行状況コールバックが呼ばれない
  expect(progressCallback).not.toHaveBeenCalled()
  expect(result.current.state.progress).toBeNull()
})
```

### UT-003: コールバック機能テスト

#### UT-003-001: 正常系 - 成功時コールバック実行
```typescript
describe('useAdFatigue - Callback Functions', () => {
  it('should execute success callback with correct data', async () => {
    // Given: 成功コールバックが設定されたフック
    const mockData = [{ id: '1', score: 85, status: 'healthy' }]
    const onSuccess = vi.fn()
    
    mockMetaApiFetcher.mockResolvedValue({ data: mockData, error: null })
    
    const { result } = renderHook(() => 
      useAdFatigue('test-account', {
        callbacks: { onUpdateSuccess: onSuccess }
      })
    )
    
    // When: 更新を実行
    await act(async () => {
      await result.current.update()
    })
    
    // Then: 成功コールバックが適切なデータで実行される
    expect(onSuccess).toHaveBeenCalledWith({
      data: expect.arrayContaining([expect.objectContaining({ id: '1' })]),
      source: 'api',
      duration: expect.any(Number),
      recordCount: mockData.length
    })
  })
})
```

#### UT-003-002: 異常系 - エラー時コールバック実行
```typescript
it('should execute error callback with detailed error info', async () => {
  // Given: エラーコールバックが設定されたフック
  const testError = new Error('Test API Error')
  const onError = vi.fn()
  
  mockMetaApiFetcher.mockRejectedValue(testError)
  
  const { result } = renderHook(() => 
    useAdFatigue('test-account', {
      callbacks: { onUpdateError: onError }
    })
  )
  
  // When: 更新を実行（エラーが発生）
  await act(async () => {
    try {
      await result.current.update()
    } catch (error) {
      // エラーは期待される
    }
  })
  
  // Then: エラーコールバックが詳細情報で実行される
  expect(onError).toHaveBeenCalledWith({
    category: expect.any(String),
    message: 'Test API Error',
    originalError: testError,
    recoveryAction: expect.any(String),
    timestamp: expect.any(Date)
  })
})
```

#### UT-003-003: 全ライフサイクル - すべてのコールバック実行
```typescript
it('should execute all lifecycle callbacks in correct order', async () => {
  // Given: 全コールバックが設定されたフック
  const callOrder: string[] = []
  
  const callbacks = {
    onUpdateStart: () => callOrder.push('start'),
    onUpdateProgress: () => callOrder.push('progress'),
    onUpdateSuccess: () => callOrder.push('success'),
    onUpdateComplete: () => callOrder.push('complete')
  }
  
  const { result } = renderHook(() => 
    useAdFatigue('test-account', { callbacks })
  )
  
  // When: 更新を実行
  await act(async () => {
    await result.current.update()
  })
  
  // Then: コールバックが正しい順序で実行される
  expect(callOrder[0]).toBe('start')
  expect(callOrder).toContain('progress')
  expect(callOrder).toContain('success')
  expect(callOrder[callOrder.length - 1]).toBe('complete')
})
```

### UT-004: UI応答性テスト

#### UT-004-001: パフォーマンス - 100ms以内の状態更新
```typescript
describe('useAdFatigue - UI Responsiveness', () => {
  it('should update state within 100ms', async () => {
    // Given: フックの初期化
    const { result } = renderHook(() => useAdFatigue('test-account'))
    
    // When: 更新を開始
    const startTime = performance.now()
    
    await act(async () => {
      result.current.update()
      
      // 非同期で状態の変化を待つ
      await waitFor(() => {
        expect(result.current.state.status).toBe('updating')
      }, { timeout: 150 })
    })
    
    const endTime = performance.now()
    
    // Then: 状態変更が100ms以内に反映される
    expect(endTime - startTime).toBeLessThan(100)
    expect(result.current.state.isUpdating).toBe(true)
  })
})
```

#### UT-004-002: メモリ効率 - オブジェクト生成の最小化
```typescript
it('should minimize object creation during updates', async () => {
  // Given: メモリ使用量の初期値
  const initialMemory = process.memoryUsage().heapUsed
  
  const { result } = renderHook(() => useAdFatigue('test-account'))
  
  // When: 複数回の更新を実行
  for (let i = 0; i < 10; i++) {
    await act(async () => {
      await result.current.update()
    })
  }
  
  // Then: メモリ使用量が適切に制御される
  global.gc?.() // ガベージコレクション実行（可能な場合）
  const finalMemory = process.memoryUsage().heapUsed
  const memoryIncrease = finalMemory - initialMemory
  
  expect(memoryIncrease).toBeLessThan(5 * 1024 * 1024) // 5MB未満
})
```

#### UT-004-003: 応答性 - 大量データ処理時の性能
```typescript
it('should maintain responsiveness with large datasets', async () => {
  // Given: 大量のデータをモック
  const largeDataset = Array(1000).fill(0).map((_, i) => ({
    id: `ad_${i}`,
    score: Math.random() * 100,
    status: i % 3 === 0 ? 'critical' : 'healthy'
  }))
  
  mockMetaApiFetcher.mockResolvedValue({ data: largeDataset, error: null })
  
  const { result } = renderHook(() => useAdFatigue('test-account'))
  
  // When: 大量データの更新を実行
  const startTime = performance.now()
  
  await act(async () => {
    await result.current.update()
  })
  
  const endTime = performance.now()
  
  // Then: 30秒以内に処理が完了する
  expect(endTime - startTime).toBeLessThan(30000)
  expect(result.current.data.length).toBe(1000)
  expect(result.current.state.status).toBe('success')
})
```

### UT-005: エラーハンドリング機能テスト

#### UT-005-001: エラー分類 - キャッシュエラー
```typescript
describe('useAdFatigue - Error Handling', () => {
  it('should classify cache errors correctly', async () => {
    // Given: キャッシュエラーが発生する設定
    const cacheError = new Error('Cache connection failed')
    mockConvexCache.mockRejectedValue(cacheError)
    
    const { result } = renderHook(() => useAdFatigue('test-account'))
    
    // When: 更新を実行（キャッシュエラーが発生）
    await act(async () => {
      try {
        await result.current.update()
      } catch (error) {
        // エラーは期待される
      }
    })
    
    // Then: エラーが適切に分類される
    expect(result.current.state.error).toMatchObject({
      category: 'cache',
      recoveryAction: 'fallback',
      originalError: cacheError
    })
  })
})
```

#### UT-005-002: エラー回復 - フォールバック機能
```typescript
it('should fallback to API when cache fails', async () => {
  // Given: キャッシュ失敗、API成功の設定
  const apiData = [{ id: '1', score: 90 }]
  
  mockConvexCache.mockRejectedValue(new Error('Cache error'))
  mockMetaApiFetcher.mockResolvedValue({ data: apiData, error: null })
  
  const { result } = renderHook(() => useAdFatigue('test-account'))
  
  // When: 更新を実行
  await act(async () => {
    await result.current.update()
  })
  
  // Then: APIフォールバックが成功する
  expect(result.current.state.status).toBe('success')
  expect(result.current.dataSource).toBe('api')
  expect(result.current.data.length).toBeGreaterThan(0)
})
```

#### UT-005-003: エラー回復 - リトライ機能
```typescript
it('should support manual retry after error', async () => {
  // Given: 最初はエラー、リトライで成功する設定
  let attemptCount = 0
  mockMetaApiFetcher.mockImplementation(() => {
    attemptCount++
    if (attemptCount === 1) {
      return Promise.reject(new Error('First attempt failed'))
    }
    return Promise.resolve({ data: [{ id: '1' }], error: null })
  })
  
  const { result } = renderHook(() => useAdFatigue('test-account'))
  
  // When: 最初の更新でエラー、その後リトライ
  await act(async () => {
    try {
      await result.current.update()
    } catch (error) {
      // 最初のエラーは期待される
    }
  })
  
  expect(result.current.state.status).toBe('error')
  
  // リトライ実行
  await act(async () => {
    await result.current.retry()
  })
  
  // Then: リトライで成功する
  expect(result.current.state.status).toBe('success')
  expect(attemptCount).toBe(2)
})
```

## 統合テスト (Integration Tests)

### IT-001: useMetaApiFetcher 連携テスト

#### IT-001-001: 拡張機能の活用
```typescript
describe('useAdFatigue - useMetaApiFetcher Integration', () => {
  it('should utilize enhanced fetcher capabilities', async () => {
    // Given: 拡張されたfetcherの機能を活用
    const { result } = renderHook(() => useAdFatigue('test-account'))
    
    // When: 更新を実行
    await act(async () => {
      await result.current.update()
    })
    
    // Then: 拡張されたfetcherの状態情報が反映される
    expect(result.current.state.lastUpdate).toMatchObject({
      timestamp: expect.any(Date),
      duration: expect.any(Number),
      source: expect.any(String)
    })
  })
})
```

### IT-002: useConvexCache 連携テスト

```typescript
it('should properly integrate with Convex cache', async () => {
  // Given: キャッシュが利用可能な状態
  const cacheData = [{ id: 'cached_1', score: 75 }]
  mockConvexCache.mockResolvedValue(cacheData)
  
  const { result } = renderHook(() => useAdFatigue('test-account'))
  
  // When: データを取得
  await act(async () => {
    await result.current.update()
  })
  
  // Then: キャッシュデータが正しく使用される
  expect(result.current.dataSource).toBe('cache')
  expect(result.current.data).toHaveLength(1)
})
```

## パフォーマンステスト (Performance Tests)

### PT-001: UI応答性テスト

```typescript
describe('useAdFatigue - Performance', () => {
  it('should maintain UI responsiveness during updates', async () => {
    const { result } = renderHook(() => useAdFatigue('test-account'))
    
    // 応答時間の測定
    const responseTime = await measureResponseTime(async () => {
      await act(async () => {
        result.current.update()
        // 状態変更の即座な反映を確認
        expect(result.current.state.status).toBe('updating')
      })
    })
    
    expect(responseTime).toBeLessThan(100) // 100ms以内
  })
})
```

### PT-002: メモリ効率テスト

```typescript
it('should not cause memory leaks', async () => {
  const initialMemory = process.memoryUsage().heapUsed
  
  // 大量の更新サイクルを実行
  for (let i = 0; i < 100; i++) {
    const { unmount } = renderHook(() => useAdFatigue('test-account'))
    unmount()
  }
  
  global.gc?.()
  const finalMemory = process.memoryUsage().heapUsed
  const memoryIncrease = finalMemory - initialMemory
  
  expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024) // 10MB未満
})
```

## エラーシナリオテスト (Error Scenario Tests)

### ES-001: ネットワーク障害テスト

```typescript
describe('useAdFatigue - Error Scenarios', () => {
  it('should handle network failures gracefully', async () => {
    // Given: 間欠的なネットワーク障害をシミュレート
    let failCount = 0
    mockMetaApiFetcher.mockImplementation(() => {
      failCount++
      if (failCount <= 2) {
        return Promise.reject(new Error('Network timeout'))
      }
      return Promise.resolve({ data: [], error: null })
    })
    
    const { result } = renderHook(() => 
      useAdFatigue('test-account', { autoRetryOnError: true })
    )
    
    // When: 更新を実行
    await act(async () => {
      await result.current.update()
    })
    
    // Then: 最終的に成功する
    expect(result.current.state.status).toBe('success')
  })
})
```

## テスト環境設定

### モック設定

```typescript
// test/setup/useAdFatigue-mocks.ts
export const mockMetaApiFetcher = {
  mockResolvedValue: vi.fn(),
  mockRejectedValue: vi.fn(),
  fetchFromApi: vi.fn()
}

export const mockConvexCache = {
  mockResolvedValue: vi.fn(),
  mockRejectedValue: vi.fn(),
  hasCache: vi.fn(),
  data: vi.fn(),
  error: vi.fn()
}

// useMetaApiFetcher のモック
vi.mock('../useMetaApiFetcher', () => ({
  useMetaApiFetcher: () => ({
    fetchFromApi: mockMetaApiFetcher.fetchFromApi,
    state: { isLoading: false, error: null },
    cancelRequest: vi.fn()
  })
}))

// useConvexCache のモック
vi.mock('../useConvexCache', () => ({
  useConvexCache: () => ({
    data: mockConvexCache.data(),
    hasCache: mockConvexCache.hasCache(),
    error: mockConvexCache.error()
  })
}))
```

### テストヘルパー関数

```typescript
// test/helpers/performance.ts
export function measureResponseTime(fn: () => Promise<void>): Promise<number> {
  return new Promise(async (resolve) => {
    const start = performance.now()
    await fn()
    const end = performance.now()
    resolve(end - start)
  })
}

export function createMockFatigueData(count: number) {
  return Array(count).fill(0).map((_, i) => ({
    id: `ad_${i}`,
    score: Math.floor(Math.random() * 100),
    status: ['healthy', 'warning', 'critical'][i % 3]
  }))
}
```

## テスト実行設定

### Vitest設定

```json
{
  "test": {
    "environment": "jsdom",
    "setupFiles": ["./test/setup.ts"],
    "testTimeout": 10000,
    "coverage": {
      "include": ["src/features/meta-api/hooks/useAdFatigue.ts"],
      "exclude": ["**/*.d.ts", "**/*.test.ts"],
      "thresholds": {
        "branches": 90,
        "functions": 95,
        "lines": 95,
        "statements": 95
      }
    }
  }
}
```

## テスト実行コマンド

```bash
# すべてのテストを実行
npm test useAdFatigue

# 特定のテストカテゴリを実行
npm test -- --testNamePattern="Concurrent Update Prevention"
npm test -- --testNamePattern="Progress Tracking"
npm test -- --testNamePattern="Callback Functions"

# パフォーマンステストのみ実行
npm test -- --testNamePattern="Performance"

# カバレッジレポート付きでテスト実行
npm test useAdFatigue -- --coverage

# ウォッチモードでテスト実行
npm test useAdFatigue -- --watch
```

---

**テストケース総数**: 25+  
**カバレッジ目標**: 95%以上  
**作成日**: 2024-08-25  
**最終更新**: 2024-08-25