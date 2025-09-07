# リファクタリングプラン

## 現在のコードベース状況分析

### 🔍 主な問題点

1. **型定義の重複と分散**
   - `MetaApiInsight`が複数箇所で定義されている
   - `UnifiedAdData`と`AdPerformanceData`の役割が不明確
   - any型が残存（約50箇所）

2. **コンポーネントの肥大化**
   - `FatigueDashboardPresentation.tsx` - 500行超
   - `CreativeTableTab.tsx` - 複雑なロジックとUIが混在
   - 責任の分離が不十分

3. **データフローの複雑化**
   - 複数のフックが似た処理を実装
   - `useAdFatigue` vs `useAdFatigueSimplified` vs `useAdFatigueWithAggregation`
   - データ変換処理が散在

4. **エラーハンドリングの不統一**
   - 各コンポーネントで独自のエラー処理
   - SafeFilterWrapperなど部分的な実装

5. **パフォーマンスの課題**
   - 不要な再レンダリング
   - useMemoの過剰/不足な使用

## リファクタリング戦略

### Phase 1: 型定義の統一（優先度: 最高）

#### 1.1 型定義の集約
```typescript
// src/features/meta-api/types/index.ts
export * from './api-types'      // API関連
export * from './domain-types'   // ドメインモデル
export * from './ui-types'       // UI専用
```

#### 1.2 実装タスク
- [ ] 重複する型定義を統合
- [ ] any型を具体的な型に置換
- [ ] 型のエクスポート/インポートを整理

**影響範囲**: 全ファイル
**推定時間**: 2-3時間

---

### Phase 2: データ層の整理（優先度: 高）

#### 2.1 フック層の統合
```
現在:
useAdFatigue
useAdFatigueSimplified  
useAdFatigueWithAggregation
useEnhancedFatigue
useMetaInsights

↓ 統合

提案:
useMetaAdsData          // データ取得の基盤
├── useAdAggregation   // 集約機能
├── useFatigueScoring  // 疲労度計算
└── useDataFiltering   // フィルタリング
```

#### 2.2 データパイプライン
```typescript
// src/features/meta-api/core/data-pipeline.ts
class MetaDataPipeline {
  // 1. 取得
  fetch() → RawData[]
  
  // 2. 正規化
  normalize() → UnifiedData[]
  
  // 3. 集約（オプション）
  aggregate() → AggregatedData[]
  
  // 4. 疲労度計算（オプション）
  calculateFatigue() → ScoredData[]
  
  // 5. フィルタリング（オプション）
  filter() → FilteredData[]
}
```

**影響範囲**: hooks/, components/
**推定時間**: 3-4時間

---

### Phase 3: コンポーネントの分割（優先度: 中）

#### 3.1 FatigueDashboardの分割
```
現在:
FatigueDashboardPresentation (500行+)

↓ 分割

提案:
FatigueDashboard/
├── index.tsx                    // メインコンテナ
├── DashboardHeader.tsx          // ヘッダー部分
├── DashboardFilters.tsx         // フィルター部分
├── DashboardStats.tsx           // 統計カード部分
├── DashboardTabs.tsx            // タブコンテンツ
└── DashboardEmpty.tsx           // 空状態表示
```

#### 3.2 責任の明確化
- **Container**: ビジネスロジック、データ取得
- **Presentation**: 純粋なUI表示
- **Hooks**: 状態管理とロジック
- **Utils**: 純粋関数

**影響範囲**: components/
**推定時間**: 2-3時間

---

### Phase 4: エラー処理の統一（優先度: 中）

#### 4.1 エラーバウンダリ階層
```typescript
// src/features/meta-api/components/errors/
AppErrorBoundary             // アプリ全体
└── DashboardErrorBoundary   // ダッシュボード
    └── ComponentErrorBoundary // 個別コンポーネント
```

#### 4.2 エラー型の統一
```typescript
interface AppError {
  type: 'API' | 'VALIDATION' | 'PERMISSION' | 'UNKNOWN'
  code: string
  message: string
  details?: any
  recoverable: boolean
  actions?: ErrorAction[]
}
```

**影響範囲**: 全コンポーネント
**推定時間**: 1-2時間

---

### Phase 5: パフォーマンス最適化（優先度: 低）

#### 5.1 React最適化
- [ ] React.memoの適切な適用
- [ ] useCallbackの見直し
- [ ] useMemoの最適化
- [ ] Context分割でレンダリング削減

#### 5.2 データ最適化
- [ ] 仮想スクロールの完全適用
- [ ] 遅延ロード実装
- [ ] キャッシング戦略

**影響範囲**: パフォーマンスクリティカルな箇所
**推定時間**: 2-3時間

---

## 実装順序の提案

### 短期（今すぐ実施）- 4時間
1. **Phase 1**: 型定義の統一
   - 最も影響が大きく、他の作業の基盤となる
   - TypeScriptのメリットを最大化

### 中期（次のスプリント）- 6時間  
2. **Phase 2**: データ層の整理
   - コードの理解しやすさが大幅改善
   - バグの温床を除去

3. **Phase 3**: コンポーネントの分割
   - 保守性の向上
   - テスタビリティの改善

### 長期（必要に応じて）- 3時間
4. **Phase 4**: エラー処理の統一
5. **Phase 5**: パフォーマンス最適化

---

## リスクと対策

### リスク
1. **既存機能の破壊**
   - 対策: 段階的な実装とテスト
   - 各Phaseごとにコミット

2. **時間超過**
   - 対策: Phase単位で区切る
   - 必須部分のみ実施

3. **チーム影響**
   - 対策: 型定義変更は影響大なので事前共有

---

## 期待効果

### 定量的効果
- **コード量**: 20-30%削減
- **TypeScriptエラー**: 90%削減
- **ビルド時間**: 10-20%改善

### 定性的効果
- **可読性**: 大幅向上
- **保守性**: 責任分離で改善
- **拡張性**: 新機能追加が容易に
- **デバッグ**: エラー箇所の特定が簡単に

---

## チェックリスト

### Phase 1完了条件
- [ ] すべてのany型が排除されている
- [ ] 型定義ファイルが整理されている
- [ ] importパスが統一されている

### Phase 2完了条件
- [ ] フック層が整理されている
- [ ] データフローが明確になっている
- [ ] 重複コードが除去されている

### Phase 3完了条件
- [ ] 各コンポーネントが200行以下
- [ ] 責任が明確に分離されている
- [ ] テストが書きやすい構造

---

## 実施判断

### 今すぐ実施すべき
✅ **Phase 1: 型定義の統一**
- 影響は大きいが、早めに実施すべき
- 今後の開発効率が大幅改善

### 段階的に実施
🔄 **Phase 2-3: データ層とコンポーネント**
- 機能追加と並行して実施可能
- リスクを最小化

### 必要に応じて実施
⏸️ **Phase 4-5: エラー処理とパフォーマンス**
- 現状でも動作に問題なし
- 余裕があるときに実施