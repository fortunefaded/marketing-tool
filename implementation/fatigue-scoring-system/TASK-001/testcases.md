# TASK-001: ベースライン計算システム実装 - テストケース定義

## 概要

BaselineCalculationServiceの全機能に対する包括的なテストケース定義。正常系、異常系、境界値、パフォーマンステストを含む。

## テストケース一覧

### 1. 正常系テストケース

#### TC-001: 完全な30日データでのベースライン計算
```typescript
describe('BaselineCalculationService - 正常系', () => {
  it('should calculate CTR baseline from 30-day complete data', async () => {
    // Given: 30日分の完全なMetaAdInsightsデータ
    const mockData = generateMockAdInsights(30, {
      ctr: 2.5,
      cpm: 450,
      frequency: 2.8,
      impressions: 10000
    })
    
    // When: ベースライン計算実行
    const result = await service.calculateBaseline('ad_123', 'act_456')
    
    // Then: 期待値の確認
    expect(result.ctr).toBeCloseTo(2.5, 1)
    expect(result.cpm).toBeCloseTo(450, 10)
    expect(result.frequency).toBeCloseTo(2.8, 1)
    expect(result.confidence).toBeGreaterThan(0.8)
    expect(result.isIndustryAverage).toBe(false)
    expect(result.calculationPeriod.daysIncluded).toBe(30)
  })

  it('should calculate baseline for different ad types', async () => {
    // Given: 動画広告の30日データ
    const videoAdData = generateMockAdInsights(30, { adType: 'video' })
    
    // When: ベースライン計算
    const result = await service.calculateBaseline('video_ad_123', 'act_456')
    
    // Then: 動画広告用基準値が設定される
    expect(result).toBeDefined()
    expect(result.confidence).toBeGreaterThan(0.7)
  })
})
```

#### TC-002: 品質の高いデータでの信頼度スコア算出
```typescript
it('should calculate high confidence score for stable data', async () => {
  // Given: 安定した30日データ（標準偏差小）
  const stableData = generateStableAdInsights(30, {
    ctr: 2.5,
    stdDev: 0.1  // 低い標準偏差
  })
  
  // When: ベースライン計算
  const result = await service.calculateBaseline('stable_ad', 'act_456')
  
  // Then: 高い信頼度スコア
  expect(result.confidence).toBeGreaterThanOrEqual(0.8)
  expect(result.dataQuality).toBeGreaterThan(0.9)
})
```

### 2. データ不足時フォールバック系テストケース

#### TC-003: 新規アカウントでの業界平均フォールバック
```typescript
describe('BaselineCalculationService - フォールバック', () => {
  it('should fallback to industry average when insufficient data', async () => {
    // Given: 5日分のデータのみ存在
    const insufficientData = generateMockAdInsights(5)
    mockMetaApiService.getAdInsights.mockResolvedValue(insufficientData)
    
    // When: ベースライン計算
    const result = await service.calculateBaseline('new_ad', 'act_456')
    
    // Then: 業界平均使用
    expect(result.isIndustryAverage).toBe(true)
    expect(result.confidence).toBeLessThan(0.7)
    expect(result.ctr).toBeCloseTo(2.0, 1)  // Facebook業界平均
    expect(result.cpm).toBeCloseTo(500, 50)
    expect(result.frequency).toBeCloseTo(2.5, 1)
  })

  it('should use platform-specific industry averages', async () => {
    // Given: Instagram広告の不十分データ
    const instagramAd = { platform: 'instagram', adType: 'reel' }
    
    // When: フォールバック実行
    const result = await service.applyIndustryFallback('reel', 'instagram')
    
    // Then: Instagram Reel用基準値
    expect(result.ctr).toBeCloseTo(1.2, 1)  // Instagram平均
    expect(result.cpm).toBeCloseTo(600, 50)
    expect(result.engagementRate).toBeCloseTo(1.23, 2)  // Reel基準
  })
})
```

#### TC-004: データ品質不良時のフォールバック
```typescript
it('should fallback when data quality is poor', async () => {
  // Given: 30日データだが品質が低い（異常値多数）
  const poorQualityData = generateAnomalousData(30)
  
  // When: ベースライン計算
  const result = await service.calculateBaseline('anomalous_ad', 'act_456')
  
  // Then: 信頼度低下、フォールバック推奨
  expect(result.confidence).toBeLessThan(0.5)
  expect(result.dataQuality).toBeLessThan(0.6)
})
```

### 3. 断続配信・予算変更対応テストケース

#### TC-005: 配信停止期間の自動除外
```typescript
describe('BaselineCalculationService - 断続配信対応', () => {
  it('should exclude delivery pause periods', async () => {
    // Given: 30日中10日間の配信停止
    const dataWithPause = generateDataWithDeliveryPause(30, [
      { start: '2024-01-10', end: '2024-01-15' },  // 6日間停止
      { start: '2024-01-25', end: '2024-01-28' }   // 4日間停止
    ])
    
    // When: ベースライン計算
    const result = await service.calculateBaseline('paused_ad', 'act_456')
    
    // Then: 実際の配信日数でベースライン計算
    expect(result.calculationPeriod.daysIncluded).toBe(20)  // 30 - 10
    expect(result.confidence).toBeLessThan(0.8)  // 日数不足による信頼度低下
  })

  it('should detect and handle budget changes', async () => {
    // Given: 期間中に50%以上の予算変更
    const dataWithBudgetChange = generateDataWithBudgetChange(30, {
      changeDate: '2024-01-15',
      beforeBudget: 10000,
      afterBudget: 20000  // 100%増加
    })
    
    // When: ベースライン計算
    const result = await service.calculateBaseline('budget_changed_ad', 'act_456')
    
    // Then: 予算変更を考慮した計算
    expect(result.confidence).toBeLessThan(0.8)
    expect(result.calculationPeriod.daysIncluded).toBeGreaterThan(15)
  })
})
```

### 4. 異常系・エラーハンドリングテストケース

#### TC-006: API呼び出し失敗時の処理
```typescript
describe('BaselineCalculationService - 異常系', () => {
  it('should handle Meta API timeout gracefully', async () => {
    // Given: Meta API タイムアウト
    mockMetaApiService.getAdInsights.mockRejectedValue(
      new Error('REQUEST_TIMEOUT')
    )
    
    // When: ベースライン計算実行
    const promise = service.calculateBaseline('timeout_ad', 'act_456')
    
    // Then: エラー処理
    await expect(promise).rejects.toThrow('REQUEST_TIMEOUT')
  })

  it('should validate input parameters', async () => {
    // Given: 無効なパラメーター
    const invalidParams = [
      { adId: '', accountId: 'act_456' },         // 空のadId
      { adId: 'ad_123', accountId: '' },         // 空のaccountId
      { adId: null, accountId: 'act_456' },      // null値
    ]
    
    // When & Then: バリデーションエラー
    for (const params of invalidParams) {
      await expect(service.calculateBaseline(params.adId, params.accountId))
        .rejects.toThrow('INVALID_PARAMETERS')
    }
  })
})
```

#### TC-007: データベース接続エラー処理
```typescript
it('should handle database connection errors', async () => {
  // Given: データベース接続失敗
  mockConvexClient.mutation.mockRejectedValue(
    new Error('DATABASE_CONNECTION_ERROR')
  )
  
  // When: ベースライン保存実行
  const promise = service.storeBaseline(mockBaselineData)
  
  // Then: エラーハンドリング
  await expect(promise).rejects.toThrow('DATABASE_CONNECTION_ERROR')
})
```

### 5. 境界値テストケース

#### TC-008: 境界値でのデータ処理
```typescript
describe('BaselineCalculationService - 境界値', () => {
  it('should handle minimum data threshold (7 days)', async () => {
    // Given: 境界値の7日データ
    const minData = generateMockAdInsights(7)
    
    // When: ベースライン計算
    const result = await service.calculateBaseline('min_data_ad', 'act_456')
    
    // Then: 低信頼度での計算実行
    expect(result.confidence).toBeLessThan(0.7)
    expect(result.calculationPeriod.daysIncluded).toBe(7)
  })

  it('should handle extremely high/low metric values', async () => {
    // Given: 異常に高い/低いメトリクス値
    const extremeData = [
      { ctr: 15.0, cpm: 10000, frequency: 20.0 },  // 異常に高い値
      { ctr: 0.01, cpm: 1, frequency: 0.1 }        // 異常に低い値
    ]
    
    for (const data of extremeData) {
      const result = await service.validateDataSufficiency([data])
      expect(result.confidence).toBeLessThan(0.5)  // 低信頼度
    }
  })
})
```

### 6. パフォーマンステストケース

#### TC-009: レスポンス時間テスト
```typescript
describe('BaselineCalculationService - パフォーマンス', () => {
  it('should complete calculation within 500ms', async () => {
    // Given: 30日分の標準データ
    const standardData = generateMockAdInsights(30)
    
    // When: 計算時間測定
    const startTime = Date.now()
    const result = await service.calculateBaseline('perf_test_ad', 'act_456')
    const duration = Date.now() - startTime
    
    // Then: 500ms以内で完了
    expect(duration).toBeLessThan(500)
    expect(result).toBeDefined()
  })

  it('should handle concurrent calculations efficiently', async () => {
    // Given: 100個の並行計算要求
    const requests = Array.from({ length: 100 }, (_, i) => 
      service.calculateBaseline(`concurrent_ad_${i}`, 'act_456')
    )
    
    // When: 並行実行
    const startTime = Date.now()
    const results = await Promise.all(requests)
    const duration = Date.now() - startTime
    
    // Then: 効率的な処理
    expect(results).toHaveLength(100)
    expect(duration).toBeLessThan(10000)  // 10秒以内
  })
})
```

#### TC-010: メモリ使用量テスト
```typescript
it('should maintain memory usage under 1GB', async () => {
  // Given: 大量データ処理
  const largeDataset = generateMockAdInsights(1000, { includeHourlyData: true })
  
  // When: メモリ使用量監視下で実行
  const memBefore = process.memoryUsage().heapUsed
  await service.calculateBaseline('memory_test_ad', 'act_456')
  const memAfter = process.memoryUsage().heapUsed
  
  // Then: 1GB以下の使用量
  const memUsedMB = (memAfter - memBefore) / 1024 / 1024
  expect(memUsedMB).toBeLessThan(1024)  // 1GB = 1024MB
})
```

### 7. 統合テストケース

#### TC-011: End-to-End統合テスト
```typescript
describe('BaselineCalculationService - 統合テスト', () => {
  it('should complete full baseline calculation workflow', async () => {
    // Given: 実際のMeta API, Convex DB接続
    const realAdId = 'test_ad_integration'
    const realAccountId = 'act_test_integration'
    
    // When: フル統合ワークフロー実行
    const result = await service.calculateBaseline(realAdId, realAccountId)
    
    // Then: 完全な結果セット
    expect(result).toMatchObject({
      ctr: expect.any(Number),
      cpm: expect.any(Number),
      frequency: expect.any(Number),
      confidence: expect.any(Number),
      calculationPeriod: expect.objectContaining({
        start: expect.any(String),
        end: expect.any(String),
        daysIncluded: expect.any(Number)
      }),
      calculatedAt: expect.any(String),
      version: expect.any(String)
    })
  })
})
```

## モックデータヘルパー関数

### generateMockAdInsights
```typescript
function generateMockAdInsights(
  days: number, 
  baseMetrics: Partial<MetaAdInsights> = {}
): MetaAdInsights[] {
  return Array.from({ length: days }, (_, i) => ({
    adId: baseMetrics.adId || 'mock_ad_123',
    adSpend: baseMetrics.adSpend || 1000 + Math.random() * 500,
    impressions: baseMetrics.impressions || 10000 + Math.random() * 5000,
    clicks: baseMetrics.clicks || 250 + Math.random() * 100,
    ctr: baseMetrics.ctr || 2.5 + (Math.random() - 0.5) * 0.5,
    cpm: baseMetrics.cpm || 450 + (Math.random() - 0.5) * 50,
    frequency: baseMetrics.frequency || 2.8 + (Math.random() - 0.5) * 0.3,
    dateStart: new Date(Date.now() - (days - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    dateStop: new Date(Date.now() - (days - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    // ... その他のフィールド
  }))
}
```

## テスト実行戦略

### 単体テスト実行
```bash
# 全テスト実行
npm run test src/features/meta-api/core/__tests__/baseline-calculation.test.ts

# カバレッジ付きテスト
npm run test:coverage -- baseline-calculation

# ウォッチモードでの開発
npm run test:watch -- baseline-calculation
```

### パフォーマンステスト実行
```bash
# パフォーマンステストのみ実行
npm run test -- --testNamePattern="パフォーマンス"

# メモリテスト実行
npm run test:memory -- baseline-calculation
```

## テスト品質基準

### カバレッジ要件
- **行カバレッジ**: 95%以上
- **分岐カバレッジ**: 90%以上
- **関数カバレッジ**: 100%

### 成功基準
- [ ] 全テストケースが成功する
- [ ] パフォーマンス要件を満たす
- [ ] エラーハンドリングが適切に動作する
- [ ] 境界値での安定性が確認される
- [ ] 統合テストが完全動作する