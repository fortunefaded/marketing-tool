# Convex移行ガイド

## 概要

このガイドでは、Meta APIデータストレージをlocalStorageからConvexに移行する方法を説明します。

## 主な変更点

### 1. データアクセス方法

**Before (localStorage):**

```typescript
import { MetaDataCache } from '../services/metaDataCache'

// データ取得
const cachedData = MetaDataCache.getInsights(accountId)
const status = MetaDataCache.getSyncStatus(accountId)

// データ保存
MetaDataCache.saveInsights(accountId, insights)
```

**After (Convex):**

```typescript
import { useMetaInsights } from '../hooks/useMetaInsights'

// フックを使用
const { insights, syncStatus, importInsights, isLoading } = useMetaInsights({ accountId })

// データ保存
await importInsights(newInsights, 'merge')
```

### 2. MetaApiServiceの初期化

**Before:**

```typescript
const apiService = new MetaApiService({
  accessToken: account.accessToken,
  accountId: account.accountId,
})
```

**After:**

```typescript
import { useConvex } from 'convex/react'

const convex = useConvex()
const apiService = new MetaApiService(
  {
    accessToken: account.accessToken,
    accountId: account.accountId,
  },
  convex
)
```

### 3. MetaAccountManagerの使用

**Before:**

```typescript
const manager = new MetaAccountManager()
```

**After:**

```typescript
import { useConvex } from 'convex/react'

const convex = useConvex()
const manager = MetaAccountManager.getInstance(convex)
```

## 移行手順

### ステップ 1: Convexクライアントのインポート

```typescript
import { useConvex } from 'convex/react'
```

### ステップ 2: コンポーネントでの使用

```typescript
export const MyComponent: React.FC = () => {
  const convex = useConvex()
  const { accountId } = useParams()

  // Convexフックを使用
  const {
    insights,
    syncStatus,
    importInsights,
    clearAccountData
  } = useMetaInsights({
    accountId,
    startDate: '2024-01-01',
    endDate: '2024-12-31'
  })

  // データ同期
  const handleSync = async () => {
    const manager = MetaAccountManager.getInstance(convex)
    const apiService = manager.getActiveApiService()

    if (apiService) {
      const newData = await apiService.getInsightsWithConvexSave(
        startDate,
        endDate
      )
      // データは自動的にConvexに保存されます
    }
  }

  return (
    <div>
      {/* UIコンポーネント */}
    </div>
  )
}
```

### ステップ 3: 既存データの移行

一度だけ実行する移行スクリプト:

```typescript
import { MetaDataCacheConvex } from '../services/metaDataCacheConvex'

// 移行関数
const migrateAccount = async (accountId: string) => {
  await MetaDataCacheConvex.migrateFromLocalStorage(accountId, convexClient)
}
```

## 推奨事項

1. **useMetaInsightsフックを使用**: データアクセスにはこのフックを使用することを推奨
2. **直接のConvex APIコールは避ける**: フックまたはサービスクラスを経由してアクセス
3. **エラーハンドリング**: Convexのネットワークエラーに対する適切なハンドリングを実装
4. **段階的移行**: 一度にすべてを移行せず、機能ごとに段階的に移行

## パフォーマンス考慮事項

- Convexは自動的にデータをキャッシュし、リアルタイム同期を提供
- 大量データの場合はページネーションを使用
- 不要なリアルタイム購読は避ける

## トラブルシューティング

### 問題: データが表示されない

- Convexクライアントが正しく初期化されているか確認
- アカウントIDが正しいか確認
- Convexダッシュボードでデータが存在するか確認

### 問題: 同期が遅い

- バッチサイズを調整（デフォルト: 100レコード）
- ネットワーク接続を確認
- Convexのレート制限を確認
