# Meta API アーキテクチャ設計

## 概要

現在のMeta API実装の問題点を解決し、スケーラブルで保守しやすいアーキテクチャを構築します。

## 現状の問題点

1. **コードの散在**: 20以上のファイルでMetaApiServiceが使用されている
2. **エラーハンドリングの不統一**: 各コンポーネントで異なるエラー処理
3. **キャッシュ戦略の欠如**: 同じデータを何度も取得している
4. **型安全性の不足**: any型が多用されている
5. **テストの困難さ**: モックが難しい

## 新アーキテクチャの設計原則

### 1. レイヤー構造

```
┌─────────────────────────────────────┐
│     UI Components (React)           │
├─────────────────────────────────────┤
│     Hooks (useMetaData, etc)        │
├─────────────────────────────────────┤
│     Service Layer (MetaApiCore)     │
├─────────────────────────────────────┤
│   Infrastructure (Cache, Monitor)   │
├─────────────────────────────────────┤
│     External APIs (Meta Graph API)  │
└─────────────────────────────────────┘
```

### 2. コア機能

#### MetaApiCore
- シングルトンパターン
- 統一されたエラーハンドリング
- 自動リトライ機能
- レート制限管理

#### CacheManager
- メモリキャッシュ
- Convex永続化
- TTL管理
- 無効化戦略

#### MonitoringService
- API呼び出しの追跡
- パフォーマンス測定
- エラー集計
- アラート機能

### 3. 実装計画

#### Phase 1: 基盤構築（2時間）
- MetaApiCoreクラスの実装
- 基本的なエラーハンドリング
- シンプルなキャッシュ機能

#### Phase 2: 機能拡張（2時間）
- 高度なキャッシュ戦略
- バッチ処理機能
- WebSocket対応（リアルタイム更新）

#### Phase 3: 移行（4時間）
- 既存コードの段階的移行
- 後方互換性の維持
- テストの追加

## API設計

### MetaApiCore

```typescript
interface MetaApiCore {
  // 基本操作
  initialize(config: ApiConfig): Promise<void>
  getInsights(params: InsightParams): Promise<Insight[]>
  getCampaigns(params: CampaignParams): Promise<Campaign[]>
  
  // キャッシュ制御
  clearCache(pattern?: string): void
  preload(params: PreloadParams): Promise<void>
  
  // 監視
  getStats(): ApiStats
  onError(handler: ErrorHandler): void
}
```

### React Hooks

```typescript
// 汎用データフック
function useMetaData<T>(
  fetcher: () => Promise<T>,
  options?: UseMetaDataOptions
): {
  data: T | null
  loading: boolean
  error: Error | null
  refetch: () => void
}

// 特化型フック
function useInsights(params: InsightParams): InsightResult
function useCampaigns(params: CampaignParams): CampaignResult
function useAdFatigue(accountId: string): AdFatigueResult
```

## 移行戦略

### Step 1: アダプター層の作成
既存のMetaApiServiceをラップする薄いアダプター層を作成し、新しいAPIを提供

### Step 2: 新規機能での採用
新しく作成する機能から新アーキテクチャを使用

### Step 3: 段階的な置き換え
1つずつコンポーネントを新しいAPIに移行

### Step 4: 旧コードの削除
すべての移行が完了したら、旧実装を削除

## パフォーマンス最適化

### 1. データ取得の最適化
- GraphQL風のフィールド選択
- 並列リクエストの自動バッチング
- 増分更新（差分同期）

### 2. キャッシュ戦略
- LRUキャッシュ（メモリ）
- Convexでの永続化
- キャッシュウォーミング
- スマート無効化

### 3. エラー処理
- 指数バックオフでのリトライ
- サーキットブレーカーパターン
- フォールバックデータ

## セキュリティ考慮事項

1. **トークン管理**
   - セキュアストレージ
   - 自動更新
   - スコープ管理

2. **データ保護**
   - PII（個人識別情報）のマスキング
   - 監査ログ
   - アクセス制御

## 監視とデバッグ

1. **開発ツール**
   - Chrome拡張機能
   - デバッグパネル
   - APIコールトレース

2. **プロダクション監視**
   - エラー率の追跡
   - レスポンスタイムの測定
   - 使用量の分析

## 次のステップ

1. MetaApiCoreの基本実装
2. キャッシュマネージャーの実装
3. React Hooksの作成
4. 移行用アダプターの作成
5. ドキュメントの整備