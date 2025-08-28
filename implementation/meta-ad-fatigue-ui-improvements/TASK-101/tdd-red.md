# TASK-101: 集約トグルボタンの削除 - RED Phase (失敗するテスト実装)

## 🔴 RED Phase 実行結果

### 実装したテストファイル
- **ファイル**: `src/features/meta-api/components/__tests__/FatigueDashboardPresentation.aggregation.test.tsx`
- **テストケース数**: 6件
- **対象**: FatigueDashboardPresentation コンポーネント

## 📋 実装されたテストケース

### 1. TC-101-003: トグルボタンの非表示確認
```typescript
test('集約トグルボタンが表示されない', () => {
  // 「集約: ON」「集約: OFF」ボタンが表示されないことを確認
  expect(screen.queryByText('集約: ON')).not.toBeInTheDocument()
  expect(screen.queryByText('集約: OFF')).not.toBeInTheDocument()
})
```

### 2. レイアウト確認テスト
```typescript
test('トグル削除後のレイアウトが適切である', () => {
  // 他のUI要素が正常に表示されることを確認
})
```

### 3. TC-101-004: 集約データ表示確認
```typescript
test('集約データが常に表示される', () => {
  // 集約データが正しく表示されることを確認
})
```

### 4. TC-101-006: 後方互換性確認
```typescript
test('onToggleAggregationプロップスが渡されても無視される', () => {
  // onToggleAggregationが渡されてもトグルボタンが表示されない
})
```

### 5. TC-101-007: スナップショットテスト
```typescript
test('トグル削除後のUIスナップショット', () => {
  // UI変更のスナップショット確認
})
```

### 6. TC-101-001: 集約状態固定化 (部分実装)
```typescript
test('enableAggregationが常にtrueである - プロップス確認', () => {
  // FatigueDashboardContainer との統合テスト（実装後に完成）
})
```

## ⚠️ テスト実行前の注意事項

### 依存関係
1. **ConvexProvider**: 統合テスト実行時に必要
2. **型定義**: MetaAccount, FatigueData 型の import
3. **Test Utils**: React Testing Library の設定

### 現在の状態
- ✅ テストケースは実装済み
- ⚠️ **まだテストは実行していない**（期待される失敗確認が必要）
- ⚠️ 一部のテストは実装詳細に依存（実装後に調整が必要）

## 🧪 テスト実行と失敗確認

### Step 1: テスト実行
```bash
npm test -- --testPathPattern="FatigueDashboardPresentation.aggregation.test" --verbose
```

### 期待される結果
- [ ] **全テストが失敗**する（現在トグルボタンが存在するため）
- [ ] `expect(screen.queryByText('集約: ON')).not.toBeInTheDocument()` が失敗
- [ ] `expect(screen.queryByText('集約: OFF')).not.toBeInTheDocument()` が失敗
- [ ] スナップショットテストが参照スナップショット不在で失敗

## 📊 現在のコード状態 vs テストの期待値

### 現在のFatigueDashboardPresentation.tsx
```typescript
// L208-222: 現在この部分が存在する
{onToggleAggregation && (
  <button onClick={onToggleAggregation}>
    集約: {enableAggregation ? 'ON' : 'OFF'}
  </button>
)}
```

### テストの期待値
```typescript
// テストはこの状態を期待している
{/* トグルボタンが存在しない状態 */}
```

## 🎯 次のステップ（GREEN Phase）で実装すべき内容

### 1. FatigueDashboardContainer.tsx の修正
```typescript
// 修正前
const [enableAggregation, setEnableAggregation] = useState(true)

// 修正後  
const enableAggregation = true // 定数に変更
// setEnableAggregation は削除
```

### 2. FatigueDashboardPresentation.tsx の修正
```typescript
// 修正前（L208-222）
{onToggleAggregation && (
  <button onClick={onToggleAggregation}>
    集約: {enableAggregation ? 'ON' : 'OFF'}
  </button>
)}

// 修正後
{/* トグルボタンを完全に削除 */}
```

### 3. プロップス型の修正
```typescript
// 修正前
onToggleAggregation?: () => void

// 修正後
// onToggleAggregation プロップス自体を削除
```

## 🚨 実装時の注意点

### 削除対象箇所の詳細
1. **L54-55**: 型定義の `onToggleAggregation` プロップス
2. **L92-93**: パラメータ受け取り部分
3. **L208-222**: 実際のトグルボタンUI
4. **L220**: `aggregationMetrics && enableAggregation` 条件部分

### 保持すべき機能
1. **集約データ表示**: 集約されたデータの表示機能は保持
2. **aggregationMetrics**: 集約メトリクスの表示は保持（条件を調整）
3. **レイアウト**: 他のUI要素のレイアウトは維持

## 📝 実装戦略

### GREEN Phase で行う修正の順序
1. **FatigueDashboardContainer**: `useState` を定数に変更
2. **Props 渡し**: `onToggleAggregation` の削除
3. **FatigueDashboardPresentation**: トグルボタンの削除
4. **型定義**: 不要なプロップス型の削除
5. **テスト実行**: 修正後のテスト成功確認

### リファクタリング Phase で行う改善
1. **コード清掃**: 不要な import 削除
2. **型最適化**: プロップス型の整理
3. **スナップショット更新**: 新しいUI構造のスナップショット生成

---

## ✅ RED Phase 完了チェックリスト

- [x] **テストケース実装**: 6件のテストケースを実装
- [x] **テストファイル作成**: aggregation.test.tsx を作成
- [ ] **テスト実行**: 失敗の確認（次のステップ）
- [ ] **失敗原因記録**: 期待される失敗パターンの確認
- [ ] **GREEN Phase 準備**: 実装方針の確定

**RED Phase ステータス**: ⚠️ **テスト実行待ち**  
**次のアクション**: テスト実行して失敗を確認 → GREEN Phase 開始