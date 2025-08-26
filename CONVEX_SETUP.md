# Convex Setup Guide

## 問題の概要

「Cannot read properties of undefined (reading 'Symbol(functionName)')」エラーは、Convex開発サーバーが起動していない場合に発生します。

## セットアップ手順

### 1. Convex開発サーバーの起動

別のターミナルウィンドウで以下を実行：

```bash
npx convex dev
```

### 2. 環境変数の確認

`.env.local`ファイルに以下が設定されていることを確認：

```env
CONVEX_DEPLOYMENT=dev:YOUR_DEPLOYMENT_ID
VITE_CONVEX_URL=https://YOUR_DEPLOYMENT.convex.cloud
```

### 3. 開発サーバーの再起動

```bash
npm run dev
```

## 実装済みの解決策

### ConvexProviderWrapper
- Convex APIの初期化を監視
- 初期化前はローディング画面を表示
- エラー時は明確な指示を表示（`npx convex dev`）

### useSafeConvexQuery
- Convex APIの安全な呼び出し
- 関数が存在しない場合のエラーハンドリング
- 統一されたクエリ状態管理

### 簡素化されたuseConvexCache
```typescript
export function useConvexCache(accountId: string) {
  const { data, isLoading, error } = useSafeConvexQuery(
    'metaInsights.getInsights',
    accountId ? { accountId, limit: 100 } : undefined
  )

  return {
    data: data?.items || null,
    isLoading,
    hasCache: !!(data?.items && data.items.length > 0),
    error
  }
}
```

## トラブルシューティング

### エラー: Convex接続エラー

1. `npx convex dev`が実行中であることを確認
2. 画面に表示される「再試行」ボタンをクリック
3. それでも解決しない場合は`.env.local`を確認

### エラー: Function not found

1. Convex関数が正しく定義されているか確認
2. `convex/_generated/api.js`が生成されているか確認
3. 関数パスが正しいか確認（例: "metaInsights.getInsights"）

## 開発時の注意事項

- 開発時は常に`npx convex dev`を実行しておく
- 本番環境では`CONVEX_DEPLOYMENT`を適切に設定
- Convex関数を変更した場合は自動的に再生成される
- ホワイトアウトは完全に防止されます