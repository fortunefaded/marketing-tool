# Meta API Core - 使用ガイド

## 概要

Meta API Coreは、Meta (Facebook) Graph APIとの統合を簡素化し、パフォーマンスと信頼性を向上させる新しいアーキテクチャです。

## 主な機能

- 🚀 **高速キャッシュ**: インテリジェントなメモリキャッシュ
- 🔄 **自動リトライ**: エラー時の自動再試行
- 📊 **監視機能**: API使用状況の詳細な追跡
- 🛡️ **レート制限管理**: APIクォータの自動管理
- 🎯 **型安全**: TypeScriptによる完全な型サポート

## クイックスタート

### 1. 基本的な使用方法

```typescript
import { useInsights } from '@/hooks/core/useInsights'

function MyComponent() {
  const { data, loading, error, refetch } = useInsights({
    level: 'ad',
    dateRange: {
      start: '2024-01-01',
      end: '2024-01-31'
    }
  })

  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>

  return (
    <div>
      {data?.map(insight => (
        <div key={insight.ad_id}>
          {insight.ad_name}: {insight.impressions} impressions
        </div>
      ))}
    </div>
  )
}
```

### 2. カスタムフェッチャー

```typescript
import { useMetaData } from '@/hooks/core/useMetaData'
import { MetaApiCore } from '@/services/core/MetaApiCore'

function useCustomData() {
  const apiCore = MetaApiCore.getInstance()
  
  return useMetaData(
    async () => {
      // カスタムロジック
      const campaigns = await apiCore.getCampaigns()
      const insights = await apiCore.getInsights({ level: 'campaign' })
      
      return { campaigns, insights }
    },
    [], // 依存関係
    {
      refetchInterval: 5 * 60 * 1000, // 5分ごと
      staleTime: 60 * 1000, // 1分後に古いとマーク
      retry: 3 // 3回まで再試行
    }
  )
}
```

### 3. エラーハンドリング

```typescript
const { data, error } = useInsights(params, {
  onError: (error) => {
    // カスタムエラーハンドリング
    if (error.message.includes('rate limit')) {
      showNotification('APIレート制限に達しました')
    }
  }
})
```

## 移行ガイド

### 既存コードからの移行

#### Before (旧実装):
```typescript
const apiService = new MetaApiService(config)
const insights = await apiService.getInsights({
  level: 'ad',
  dateRange: { since: '2024-01-01', until: '2024-01-31' }
})
```

#### After (新実装):
```typescript
const { data: insights } = useInsights({
  level: 'ad',
  dateRange: { start: '2024-01-01', end: '2024-01-31' }
})
```

### アダプターの使用

既存のコードを段階的に移行する場合:

```typescript
import { MetaApiAdapter } from '@/services/MetaApiAdapter'

// 既存のMetaApiServiceを新しい実装に置き換え
const apiService = new MetaApiAdapter(config)
// 既存のコードはそのまま動作
```

## API リファレンス

### useInsights

インサイトデータを取得するフック。

```typescript
function useInsights(
  params: InsightParams,
  options?: UseInsightsOptions
): UseMetaDataResult<Insight[]>
```

#### パラメータ

- `params.level`: 'account' | 'campaign' | 'adset' | 'ad'
- `params.dateRange`: { start: string; end: string }
- `params.fields`: string[] (取得するフィールド)
- `params.filters`: Record<string, any> (フィルター条件)

#### オプション

- `enabled`: boolean (フェッチを有効/無効)
- `refetchInterval`: number (自動再フェッチ間隔)
- `onSuccess`: (data) => void
- `onError`: (error) => void

### MetaApiCore

低レベルAPIクライアント。

```typescript
class MetaApiCore {
  static getInstance(): MetaApiCore
  initialize(config: ApiConfig): Promise<void>
  getInsights(params: InsightParams): Promise<Insight[]>
  getCampaigns(params: CampaignParams): Promise<Campaign[]>
  clearCache(pattern?: string): void
  getStats(): ApiStats
}
```

## パフォーマンスのベストプラクティス

### 1. 適切なフィールド選択

必要なフィールドのみを取得:

```typescript
useInsights({
  fields: ['ad_id', 'impressions', 'clicks'], // 必要最小限
  // fields を指定しない場合、デフォルトで全フィールドを取得
})
```

### 2. キャッシュの活用

```typescript
// 頻繁に更新されないデータには長いstaleTimeを設定
useInsights(params, {
  staleTime: 10 * 60 * 1000, // 10分
})
```

### 3. バッチリクエスト

複数のデータを同時に取得:

```typescript
const [campaigns, ads, insights] = await Promise.all([
  apiCore.getCampaigns(),
  apiCore.getAds(),
  apiCore.getInsights()
])
```

## トラブルシューティング

### レート制限エラー

```typescript
// 自動的に処理されますが、カスタム処理も可能
apiCore.onError((error, context) => {
  if (error.message.includes('rate limit')) {
    // カスタム処理
  }
})
```

### キャッシュのクリア

```typescript
// 特定のパターンのキャッシュをクリア
apiCore.clearCache('insights_*')

// 全キャッシュをクリア
apiCore.clearCache()
```

### デバッグ

開発環境では、ブラウザコンソールで統計情報を確認:

```javascript
__metaApiStats() // API使用統計
__metaApiErrors() // 最近のエラー
```

## 今後の拡張

- WebSocket サポート (リアルタイム更新)
- GraphQL風のクエリビルダー
- より高度なキャッシュ戦略
- プラグインシステム