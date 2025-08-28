# TASK-101: 集約トグルボタンの削除 - テストケース

## 🧪 テスト戦略

### テスト対象コンポーネント
1. **FatigueDashboardContainer** - 集約状態管理
2. **FatigueDashboardPresentation** - トグルボタンUI表示

### 発見事項
- トグルボタンは**FatigueDashboardPresentation.tsx** L208-222に実装済み
- `enableAggregation`プロップスによる条件表示
- `onToggleAggregation`コールバックでの状態切り替え

## 📋 テストケース一覧

### 1. FatigueDashboardContainer テストケース

#### TC-101-001: 集約状態の固定化
```typescript
describe('FatigueDashboardContainer - 集約状態管理', () => {
  test('enableAggregationが常にtrueである', () => {
    // Given: コンポーネントがマウントされる
    const { container } = render(<FatigueDashboardContainer />)
    
    // When: コンポーネントが初期化される
    // Then: enableAggregationが常にtrueである
    expect(container).toHaveAttribute('data-aggregation-enabled', 'true')
  })
  
  test('setEnableAggregationが存在しない', () => {
    // Given: コンポーネントのステート
    // When: コンポーネントがレンダリングされる  
    // Then: setEnableAggregation関数が存在しない（コードインスペクション）
  })
})
```

#### TC-101-002: プロップス渡しの確認
```typescript
test('プレゼンテーション層に正しいプロップスを渡す', () => {
  // Given: コンテナコンポーネントがマウントされる
  const mockPresentation = jest.fn()
  jest.mock('./FatigueDashboardPresentation', () => mockPresentation)
  
  // When: レンダリングが実行される
  render(<FatigueDashboardContainer />)
  
  // Then: enableAggregationがtrueで渡される
  expect(mockPresentation).toHaveBeenCalledWith(
    expect.objectContaining({
      enableAggregation: true,
      onToggleAggregation: undefined // 削除されることを確認
    }),
    expect.anything()
  )
})
```

### 2. FatigueDashboardPresentation テストケース

#### TC-101-003: トグルボタンの非表示確認
```typescript
describe('FatigueDashboardPresentation - トグルボタン削除', () => {
  test('集約トグルボタンが表示されない', () => {
    // Given: プロップスでenableAggregation=true, onToggleAggregation=undefined
    const props = {
      ...defaultProps,
      enableAggregation: true,
      onToggleAggregation: undefined
    }
    
    // When: コンポーネントがレンダリングされる
    const { container, queryByText } = render(
      <FatigueDashboardPresentation {...props} />
    )
    
    // Then: 「集約: ON」ボタンが表示されない
    expect(queryByText('集約: ON')).not.toBeInTheDocument()
    expect(queryByText('集約: OFF')).not.toBeInTheDocument()
    
    // And: 集約関連のボタンが存在しない
    expect(container.querySelector('[data-testid="aggregation-toggle"]')).not.toBeInTheDocument()
  })
  
  test('トグル削除後のレイアウトが適切である', () => {
    // Given: トグルボタンなしのプロップス
    const props = {
      ...defaultProps,
      enableAggregation: true,
      onToggleAggregation: undefined
    }
    
    // When: レンダリングが実行される
    const { container } = render(
      <FatigueDashboardPresentation {...props} />
    )
    
    // Then: 他のUI要素が正常に表示される
    expect(container.querySelector('[data-testid="account-selector"]')).toBeInTheDocument()
    expect(container.querySelector('[data-testid="date-filter"]')).toBeInTheDocument()
    expect(container.querySelector('[data-testid="refresh-button"]')).toBeInTheDocument()
  })
})
```

#### TC-101-004: 集約データ表示の確認
```typescript
test('集約データが常に表示される', () => {
  // Given: 集約データを含むプロップス
  const aggregatedData = [
    { ad_id: '1', ad_name: 'Test Ad', fatigue_score: 25 }
  ]
  const props = {
    ...defaultProps,
    enableAggregation: true,
    aggregatedData,
    data: aggregatedData
  }
  
  // When: コンポーネントがレンダリングされる
  const { getByText } = render(
    <FatigueDashboardPresentation {...props} />
  )
  
  // Then: 集約データが表示される
  expect(getByText('Test Ad')).toBeInTheDocument()
  expect(getByText('25')).toBeInTheDocument() // fatigue_score
})
```

### 3. 統合テストケース

#### TC-101-005: ダッシュボード全体の動作確認
```typescript
describe('FatigueDashboard - 統合テスト', () => {
  test('集約機能が常に有効な状態でダッシュボードが動作する', async () => {
    // Given: モックデータとConvexプロバイダー
    const mockConvex = setupMockConvex()
    const mockData = [
      { ad_id: '1', ad_name: 'Ad 1', fatigue_score: 30 },
      { ad_id: '2', ad_name: 'Ad 2', fatigue_score: 45 }
    ]
    mockConvex.query.mockResolvedValue(mockData)
    
    // When: FatigueDashboardがマウントされる
    const { getByText, queryByText } = render(
      <ConvexProvider client={mockConvex}>
        <FatigueDashboard />
      </ConvexProvider>
    )
    
    // Then: 集約データが表示される
    await waitFor(() => {
      expect(getByText('Ad 1')).toBeInTheDocument()
      expect(getByText('Ad 2')).toBeInTheDocument()
    })
    
    // And: トグルボタンが存在しない
    expect(queryByText(/集約:/)).not.toBeInTheDocument()
  })
})
```

### 4. エッジケースのテスト

#### TC-101-006: 後方互換性の確認
```typescript
test('onToggleAggregationプロップスが渡されても無視される', () => {
  // Given: 誤ってonToggleAggregationが渡される場合
  const mockToggle = jest.fn()
  const props = {
    ...defaultProps,
    enableAggregation: true,
    onToggleAggregation: mockToggle // これは無視されるべき
  }
  
  // When: コンポーネントがレンダリングされる
  const { container } = render(
    <FatigueDashboardPresentation {...props} />
  )
  
  // Then: トグルボタンが表示されない（onToggleAggregationが存在していても）
  expect(container.querySelector('button[title*="集約"]')).not.toBeInTheDocument()
  
  // And: コールバック関数が呼ばれない
  expect(mockToggle).not.toHaveBeenCalled()
})
```

### 5. スナップショットテスト

#### TC-101-007: UI変更の確認
```typescript
test('トグル削除後のUIスナップショット', () => {
  // Given: 標準的なプロップス（トグルなし）
  const props = {
    ...defaultProps,
    enableAggregation: true,
    data: mockFatigueData
  }
  
  // When: コンポーネントがレンダリングされる
  const { container } = render(
    <FatigueDashboardPresentation {...props} />
  )
  
  // Then: スナップショットが期待値と一致する
  expect(container.firstChild).toMatchSnapshot('dashboard-without-aggregation-toggle')
})
```

## 🎯 テスト実行手順

### Phase 1: Red (失敗するテスト)
```bash
# 1. テストファイルを作成
touch src/features/meta-api/components/__tests__/FatigueDashboardContainer.aggregation.test.tsx
touch src/features/meta-api/components/__tests__/FatigueDashboardPresentation.aggregation.test.tsx

# 2. テストケースを実装
# 3. テスト実行 → 失敗確認
npm test -- --testNamePattern="集約トグル"
```

### Phase 2: Green (実装)
```bash
# 1. FatigueDashboardContainer.tsxを修正
# 2. FatigueDashboardPresentation.tsxを修正
# 3. テスト実行 → 成功確認
npm test -- --testNamePattern="集約トグル"
```

### Phase 3: Refactor (リファクタリング)
```bash
# 1. 不要なコード削除
# 2. 型定義の最適化
# 3. 最終テスト実行
npm test -- --testPathPattern="FatigueDashboard"
npm run type-check
```

## 📊 テスト対象の詳細

### 現在のコード分析

#### FatigueDashboardPresentation.tsx L208-222
```typescript
{/* 集約トグル */}
{onToggleAggregation && (
  <button
    onClick={onToggleAggregation}
    className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
      enableAggregation 
        ? 'bg-blue-100 text-blue-800 hover:bg-blue-200' 
        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
    }`}
    title={enableAggregation ? 'データを広告単位で集約中' : 'データ集約がオフです'}
  >
    集約: {enableAggregation ? 'ON' : 'OFF'}
    {aggregationMetrics && enableAggregation && (
      <span className="ml-2 text-xs opacity-75">
        ({aggregationMetrics.dataReduction})
      </span>
    )}
  </button>
)}
```

### 削除対象要素
1. **L208-222**: 集約トグルボタン全体
2. **L54-55**: `enableAggregation`, `onToggleAggregation` プロップス
3. **L92-93**: デフォルト値とパラメータ受け取り
4. **L220**: aggregationMetrics の条件表示

### テストで確認すべき点
- [ ] `{onToggleAggregation && (` の条件が false になること
- [ ] ボタン要素が DOM に存在しないこと  
- [ ] 他の UI 要素が正常に表示され続けること
- [ ] aggregationMetrics の表示が適切であること

## 🚫 テスト除外項目

### やらないこと
1. **既存機能のテスト**: 疲労度スコア計算機能は対象外
2. **データ集約ロジック**: AdDataAggregator の内部テストは対象外
3. **パフォーマンステスト**: この段階では実施しない

### 注意事項
1. Convex プロバイダーのモック設定が必要
2. React Testing Library の適切な使用
3. async/await の適切な処理

---

**テストケース作成完了**: ✅  
**合計テストケース数**: 7件  
**次のステップ**: 失敗するテスト実装 (tdd-red.md)