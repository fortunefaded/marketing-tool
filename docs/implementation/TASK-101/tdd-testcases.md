# TASK-101: 完全ページネーション処理 - テストケース設計

## テスト戦略

### テストピラミッド構成
- **単体テスト**: 70% - 個別関数・クラスの動作
- **統合テスト**: 20% - API連携・データフロー
- **E2Eテスト**: 10% - ユーザーシナリオ

### テストカテゴリ
1. **正常系テスト**: 期待通りの動作確認
2. **異常系テスト**: エラー処理・境界値対応
3. **パフォーマンステスト**: 性能・負荷耐性
4. **セキュリティテスト**: データ保護・認証

## 単体テスト設計

### TC-101-001: 基本ページネーション処理

#### TC-101-001-01: 単一ページデータ取得
```typescript
describe('fetchPaginatedData - Single Page', () => {
  test('should fetch single page data correctly', async () => {
    // Arrange
    const mockResponse = {
      data: [{ ad_id: '001', spend: '100' }],
      paging: undefined // no next page
    }
    
    // Act
    const result = await fetchPaginatedData(mockParams)
    
    // Assert
    expect(result.data).toHaveLength(1)
    expect(result.metadata.totalPages).toBe(1)
    expect(result.metadata.isComplete).toBe(true)
  })
})
```

#### TC-101-001-02: 複数ページデータ取得
```typescript
describe('fetchPaginatedData - Multiple Pages', () => {
  test('should fetch all pages when next exists', async () => {
    // Arrange
    const mockResponses = [
      {
        data: [{ ad_id: '001' }, { ad_id: '002' }],
        paging: { next: 'page2-url' }
      },
      {
        data: [{ ad_id: '003' }, { ad_id: '004' }],
        paging: { next: 'page3-url' }
      },
      {
        data: [{ ad_id: '005' }],
        paging: undefined // last page
      }
    ]
    
    // Act
    const result = await fetchPaginatedData(mockParams)
    
    // Assert
    expect(result.data).toHaveLength(5)
    expect(result.metadata.totalPages).toBe(3)
    expect(result.metadata.totalItems).toBe(5)
    expect(result.metadata.isComplete).toBe(true)
  })
})
```

#### TC-101-001-03: 空データセット処理
```typescript
test('should handle empty dataset gracefully', async () => {
  // Arrange
  const mockResponse = {
    data: [],
    paging: undefined
  }
  
  // Act
  const result = await fetchPaginatedData(mockParams)
  
  // Assert
  expect(result.data).toHaveLength(0)
  expect(result.metadata.totalPages).toBe(1)
  expect(result.metadata.totalItems).toBe(0)
  expect(result.deliveryAnalysis.deliveryPattern).toBe('none')
})
```

### TC-101-002: 進捗トラッキング

#### TC-101-002-01: 進捗コールバック実行
```typescript
describe('Progress Tracking', () => {
  test('should call onProgress callback for each page', async () => {
    // Arrange
    const progressMock = jest.fn()
    const options = { onProgress: progressMock }
    
    // Act
    await fetchPaginatedData(mockParams, options)
    
    // Assert
    expect(progressMock).toHaveBeenCalledTimes(3)
    expect(progressMock).toHaveBeenNthCalledWith(1, {
      currentPage: 1,
      totalPages: expect.any(Number),
      itemsRetrieved: 2,
      estimatedCompletion: expect.any(Number)
    })
  })
})
```

#### TC-101-002-02: 推定残り時間計算
```typescript
test('should calculate estimated completion time', async () => {
  // Arrange
  const progressCallback = jest.fn()
  
  // Act
  await fetchPaginatedData(mockParams, { onProgress: progressCallback })
  
  // Assert
  const lastCall = progressCallback.mock.calls.slice(-1)[0][0]
  expect(lastCall.estimatedCompletion).toBeGreaterThan(0)
  expect(lastCall.estimatedCompletion).toBeLessThan(Date.now() + 60000) // 1分以内
})
```

### TC-101-003: エラーハンドリング

#### TC-101-003-01: ネットワークエラーリトライ
```typescript
describe('Error Handling - Network Errors', () => {
  test('should retry on network error up to maxRetries', async () => {
    // Arrange
    const fetchMock = jest.fn()
      .mockRejectedValueOnce(new Error('Network error'))
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(mockSuccessResponse)
    
    // Act
    const result = await fetchPaginatedData(mockParams, { retryAttempts: 3 })
    
    // Assert
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(result.data).toBeDefined()
  })
  
  test('should fail after exceeding max retries', async () => {
    // Arrange
    const fetchMock = jest.fn()
      .mockRejectedValue(new Error('Persistent network error'))
    
    // Act & Assert
    await expect(
      fetchPaginatedData(mockParams, { retryAttempts: 2 })
    ).rejects.toThrow('Persistent network error')
    expect(fetchMock).toHaveBeenCalledTimes(3) // initial + 2 retries
  })
})
```

#### TC-101-003-02: レート制限エラー処理
```typescript
describe('Error Handling - Rate Limiting', () => {
  test('should wait and retry on 429 error', async () => {
    // Arrange
    const rateLimitError = new Error('Rate limited')
    rateLimitError.status = 429
    
    const fetchMock = jest.fn()
      .mockRejectedValueOnce(rateLimitError)
      .mockResolvedValueOnce(mockSuccessResponse)
    
    // Act
    const startTime = Date.now()
    const result = await fetchPaginatedData(mockParams)
    const elapsed = Date.now() - startTime
    
    // Assert
    expect(elapsed).toBeGreaterThan(1000) // waited at least 1 second
    expect(result.data).toBeDefined()
  })
})
```

### TC-101-004: レート制限管理

#### TC-101-004-01: レート制限カウンター
```typescript
describe('RateLimitManager', () => {
  test('should track API calls within time window', () => {
    // Arrange
    const rateLimiter = new RateLimitManager(5, 60000) // 5 calls per minute
    
    // Act
    for (let i = 0; i < 3; i++) {
      rateLimiter.recordCall()
    }
    
    // Assert
    expect(rateLimiter.getRemainingCalls()).toBe(2)
    expect(rateLimiter.canMakeCall()).toBe(true)
  })
  
  test('should prevent calls when limit reached', () => {
    // Arrange
    const rateLimiter = new RateLimitManager(2, 60000)
    
    // Act
    rateLimiter.recordCall()
    rateLimiter.recordCall()
    
    // Assert
    expect(rateLimiter.canMakeCall()).toBe(false)
    expect(rateLimiter.getWaitTime()).toBeGreaterThan(0)
  })
})
```

### TC-101-005: データ統合

#### TC-101-005-01: 配信分析処理
```typescript
describe('Delivery Analysis', () => {
  test('should analyze delivery patterns correctly', () => {
    // Arrange
    const testData = [
      { ad_id: '001', date_start: '2024-01-01', impressions: '1000' },
      { ad_id: '001', date_start: '2024-01-03', impressions: '800' },
      { ad_id: '001', date_start: '2024-01-05', impressions: '600' }
    ]
    
    // Act
    const analysis = analyzeDeliveryPattern(testData, {
      start: '2024-01-01',
      end: '2024-01-30'
    })
    
    // Assert
    expect(analysis.totalRequestedDays).toBe(30)
    expect(analysis.actualDeliveryDays).toBe(3)
    expect(analysis.deliveryRatio).toBeCloseTo(0.1)
    expect(analysis.deliveryPattern).toBe('intermittent')
  })
})
```

## 統合テスト設計

### TC-101-101: Meta API実際の連携テスト

#### TC-101-101-01: 認証付きAPI呼び出し
```typescript
describe('Meta API Integration', () => {
  test('should authenticate and fetch data from real API', async () => {
    // Arrange
    const realParams = {
      accountId: process.env.TEST_ACCOUNT_ID,
      dateRange: { start: '2024-01-01', end: '2024-01-07' }
    }
    
    // Act
    const result = await fetchPaginatedData(realParams)
    
    // Assert
    expect(result.data).toBeDefined()
    expect(result.metadata.apiCallCount).toBeGreaterThan(0)
    expect(result.metadata.totalPages).toBeGreaterThan(0)
  }, 30000) // 30 second timeout
})
```

### TC-101-102: 大量データ取得テスト

#### TC-101-102-01: 50ページ以上のデータ取得
```typescript
test('should handle large dataset pagination', async () => {
  // Arrange
  const largeDatasetParams = {
    accountId: 'large-account-id',
    dateRange: { start: '2024-01-01', end: '2024-12-31' }
  }
  
  // Act
  const progressUpdates = []
  const result = await fetchPaginatedData(largeDatasetParams, {
    onProgress: (status) => progressUpdates.push(status),
    maxPages: 100
  })
  
  // Assert
  expect(result.metadata.totalPages).toBeGreaterThan(50)
  expect(progressUpdates.length).toBeGreaterThan(50)
  expect(result.data.length).toBeGreaterThan(1000)
}, 600000) // 10 minute timeout
```

### TC-101-103: 同時実行テスト

#### TC-101-103-01: 複数アカウント並行取得
```typescript
test('should handle concurrent pagination requests', async () => {
  // Arrange
  const accounts = ['account-1', 'account-2', 'account-3']
  const requests = accounts.map(accountId => 
    fetchPaginatedData({ accountId, dateRange: testDateRange })
  )
  
  // Act
  const results = await Promise.all(requests)
  
  // Assert
  expect(results).toHaveLength(3)
  results.forEach(result => {
    expect(result.data).toBeDefined()
    expect(result.metadata.isComplete).toBe(true)
  })
})
```

## エッジケーステスト設計

### TC-101-201: 境界値テスト

#### TC-101-201-01: 最大ページ数制限
```typescript
test('should respect maxPages limit', async () => {
  // Arrange
  const params = { /* large dataset params */ }
  const maxPages = 5
  
  // Act
  const result = await fetchPaginatedData(params, { maxPages })
  
  // Assert
  expect(result.metadata.totalPages).toBeLessThanOrEqual(maxPages)
  expect(result.metadata.isComplete).toBe(false) // incomplete due to limit
})
```

#### TC-101-201-02: 無効なページネーションURL
```typescript
test('should handle invalid pagination URL gracefully', async () => {
  // Arrange
  const mockResponse = {
    data: [{ ad_id: '001' }],
    paging: { next: 'invalid-url' }
  }
  
  // Act & Assert
  await expect(
    fetchPaginatedData(mockParams)
  ).rejects.toThrow(/Invalid pagination URL/)
})
```

### TC-101-202: データ整合性テスト

#### TC-101-202-01: 重複データ検出
```typescript
test('should detect and handle duplicate data across pages', async () => {
  // Arrange
  const mockResponses = [
    { data: [{ ad_id: '001', date: '2024-01-01' }], paging: { next: 'page2' } },
    { data: [{ ad_id: '001', date: '2024-01-01' }], paging: undefined } // duplicate
  ]
  
  // Act
  const result = await fetchPaginatedData(mockParams)
  
  // Assert
  expect(result.data).toHaveLength(1) // deduplicated
  expect(result.metadata.duplicatesRemoved).toBe(1)
})
```

## パフォーマンステスト設計

### TC-101-301: 負荷テスト

#### TC-101-301-01: メモリ使用量テスト
```typescript
test('should maintain reasonable memory usage during large data fetch', async () => {
  // Arrange
  const initialMemory = process.memoryUsage().heapUsed
  
  // Act
  await fetchPaginatedData(largeDatasetParams)
  const finalMemory = process.memoryUsage().heapUsed
  
  // Assert
  const memoryIncrease = finalMemory - initialMemory
  expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024) // < 100MB
})
```

#### TC-101-301-02: レスポンス時間テスト
```typescript
test('should fetch pages within reasonable time', async () => {
  // Arrange
  const params = { /* standard test params */ }
  
  // Act
  const startTime = Date.now()
  await fetchPaginatedData(params)
  const elapsed = Date.now() - startTime
  
  // Assert
  expect(elapsed).toBeLessThan(30000) // < 30 seconds for normal dataset
})
```

### TC-101-302: 長時間実行テスト

#### TC-101-302-01: 安定性テスト
```typescript
test('should remain stable during extended operation', async () => {
  // Arrange
  const iterations = 10
  const results = []
  
  // Act
  for (let i = 0; i < iterations; i++) {
    const result = await fetchPaginatedData(testParams)
    results.push(result)
    await new Promise(resolve => setTimeout(resolve, 1000)) // 1 second interval
  }
  
  // Assert
  expect(results).toHaveLength(iterations)
  results.forEach(result => {
    expect(result.metadata.isComplete).toBe(true)
  })
}, 120000) // 2 minute timeout
```

## モックテスト設計

### TC-101-401: APIレスポンスモック

#### TC-101-401-01: Meta APIレスポンス模擬
```typescript
const mockMetaApiResponse = {
  data: [
    {
      ad_id: '12345',
      ad_name: 'Test Ad',
      campaign_id: '67890',
      impressions: '1000',
      clicks: '50',
      spend: '100.00',
      date_start: '2024-01-01',
      date_stop: '2024-01-01'
    }
  ],
  paging: {
    cursors: {
      before: 'before-cursor',
      after: 'after-cursor'
    },
    next: 'https://graph.facebook.com/v23.0/act_123/insights?after=next-cursor'
  }
}
```

#### TC-101-401-02: エラーレスポンス模擬
```typescript
const mockErrorResponses = {
  networkError: new Error('ECONNREFUSED'),
  rateLimitError: {
    error: {
      code: 4,
      message: 'Application request limit reached'
    }
  },
  authError: {
    error: {
      code: 190,
      message: 'Invalid OAuth access token'
    }
  }
}
```

## テスト実行戦略

### 自動化テスト
- **実行頻度**: コミット毎、PR作成時
- **実行環境**: CI/CDパイプライン
- **カバレッジ目標**: 95%以上

### 手動テスト
- **実行タイミング**: リリース前
- **テスト観点**: ユーザビリティ、パフォーマンス体感
- **テストデータ**: 実際のMeta APIデータ

### パフォーマンステスト
- **実行頻度**: 週次
- **監視項目**: レスポンス時間、メモリ使用量、エラー率
- **しきい値**: 要件定義で設定した値

## テストデータ管理

### テストアカウント
- **開発用**: 小規模データセット（<10ページ）
- **テスト用**: 中規模データセット（10-50ページ）
- **負荷テスト用**: 大規模データセット（>100ページ）

### データクリーンアップ
- テスト実行後の一時データ削除
- モックデータの定期更新
- テストアカウントのデータ整合性確認

## 成功指標

### 定量指標
- **テストカバレッジ**: 95%以上
- **テスト実行時間**: 5分以内
- **成功率**: 99%以上
- **パフォーマンステスト合格率**: 100%

### 定性指標
- **可読性**: テストコードが理解しやすい
- **保守性**: テストの更新が容易
- **信頼性**: テスト結果が一貫している
- **効率性**: 重要なバグを効率的に検出