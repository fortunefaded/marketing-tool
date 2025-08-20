# 本番環境デプロイメントガイド

## 概要

このガイドでは、Meta広告ダッシュボードを本番環境にデプロイする手順を説明します。

## 前提条件

### 1. 統合テストの完了

以下のテストがすべて成功していることを確認：

```bash
# 基本的な統合テスト
npm run test:meta-api

# エラーハンドリングテスト
npm run test:error-scenarios

# レート制限テスト
npm run test:rate-limiting
```

### 2. システムユーザーの作成

本番環境では、個人のアクセストークンではなく、システムユーザートークンを使用します。

#### システムユーザー作成手順

1. [Meta Business Manager](https://business.facebook.com/)にアクセス
2. 「ビジネス設定」→「システムユーザー」
3. 「追加」をクリック
4. システムユーザー名を入力（例：`marketing-dashboard-prod`）
5. 役割を「従業員」に設定

#### システムユーザートークンの生成

1. 作成したシステムユーザーを選択
2. 「トークンを生成」をクリック
3. 必要な権限を選択：
   - `ads_read`
   - `ads_management`
   - `business_management`
   - `pages_read_engagement`
4. トークンを生成・保存

## デプロイメント手順

### 1. 環境変数の設定

#### 本番用 `.env.production` ファイル

```env
# Meta API Configuration
VITE_META_APP_ID=your_production_app_id
VITE_META_AD_ACCOUNT_ID=act_your_production_account_id
VITE_USE_MOCK_DATA=false

# System User Token (Never expose App Secret in production)
VITE_META_SYSTEM_USER_TOKEN=your_system_user_token

# Convex
VITE_CONVEX_URL=https://your-production-instance.convex.cloud
```

⚠️ **重要**: App Secretは本番環境のクライアントサイドコードには含めないでください

### 2. ビルドとデプロイ

#### Vercelへのデプロイ

```bash
# Vercel CLIをインストール
npm i -g vercel

# プロダクションビルド
npm run build

# デプロイ
vercel --prod
```

#### 環境変数の設定（Vercel）

1. Vercelダッシュボードにアクセス
2. プロジェクト設定 → Environment Variables
3. 以下の変数を追加：
   - `VITE_META_APP_ID`
   - `VITE_META_AD_ACCOUNT_ID`
   - `VITE_META_SYSTEM_USER_TOKEN`
   - `VITE_CONVEX_URL`

### 3. Convexの本番設定

```bash
# 本番用Convexプロジェクトを作成
npx convex deploy --prod

# 環境変数を設定
npx convex env set META_SYNC_ENABLED true --prod
```

### 4. セキュリティチェックリスト

- [ ] App Secretがクライアントコードに含まれていない
- [ ] システムユーザートークンを使用
- [ ] HTTPSが有効
- [ ] CORS設定が適切
- [ ] 環境変数が安全に管理されている
- [ ] エラーログに機密情報が含まれていない

## 本番環境の監視

### 1. パフォーマンスモニタリング

#### Vercel Analytics

```javascript
// vercel.json
{
  "analytics": {
    "enable": true
  }
}
```

#### カスタムメトリクス

```typescript
// 実装例
const trackApiPerformance = async (endpoint: string, duration: number) => {
  if (window.analytics) {
    window.analytics.track('API Performance', {
      endpoint,
      duration,
      timestamp: new Date().toISOString(),
    })
  }
}
```

### 2. エラー監視

#### Sentryの設定

```bash
npm install @sentry/react
```

```typescript
// src/main.tsx
import * as Sentry from '@sentry/react'

Sentry.init({
  dsn: process.env.VITE_SENTRY_DSN,
  environment: 'production',
  integrations: [new Sentry.BrowserTracing()],
  tracesSampleRate: 0.1,
})
```

### 3. API使用状況の監視

```typescript
// レート制限監視
const monitorRateLimit = () => {
  const status = client.getRateLimitStatus()

  if (status.windowCalls > 150) {
    // アラートを送信
    console.warn('Rate limit threshold reached', status)
  }
}

// 定期的に監視
setInterval(monitorRateLimit, 60000) // 1分ごと
```

## トラブルシューティング

### よくある問題

#### 1. "Production app not approved"

**解決策**:

1. Facebook App Reviewを申請
2. 必要な権限の使用理由を説明
3. スクリーンキャストを提供

#### 2. "System user token expired"

**解決策**:

1. Business Managerで新しいトークンを生成
2. 環境変数を更新
3. デプロイメントを再実行

#### 3. "CORS policy error"

**解決策**:

```javascript
// vercel.json
{
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Access-Control-Allow-Origin", "value": "*" },
        { "key": "Access-Control-Allow-Methods", "value": "GET,POST,PUT,DELETE,OPTIONS" }
      ]
    }
  ]
}
```

## メンテナンス

### 定期的なタスク

1. **トークンの更新**（60日ごと）
   - システムユーザートークンを再生成
   - 環境変数を更新

2. **依存関係の更新**（月次）

   ```bash
   npm update
   npm audit fix
   ```

3. **APIバージョンの確認**（四半期ごと）
   - Meta APIの新バージョンを確認
   - 非推奨APIの移行

### バックアップ

1. **データベースバックアップ**
   - Convexの自動バックアップを有効化
   - 定期的なエクスポート

2. **設定のバックアップ**
   - 環境変数の安全な保管
   - システム設定のドキュメント化

## スケーリング

### パフォーマンス最適化

1. **キャッシュ戦略**

   ```typescript
   // Redisキャッシュの実装
   const cache = new Redis({
     url: process.env.REDIS_URL,
   })
   ```

2. **CDNの活用**
   - 静的アセットのCDN配信
   - API応答のキャッシュ

3. **データベース最適化**
   - インデックスの追加
   - クエリの最適化

### 高可用性

1. **複数リージョンへのデプロイ**
2. **ロードバランシング**
3. **フェイルオーバー設定**

## チェックリスト

本番デプロイ前の最終確認：

- [ ] すべてのテストが成功
- [ ] システムユーザートークンの設定
- [ ] 環境変数の確認
- [ ] セキュリティ設定の確認
- [ ] モニタリングの設定
- [ ] バックアップの設定
- [ ] ドキュメントの更新
- [ ] ステークホルダーへの通知

## サポート

問題が発生した場合：

1. [Meta開発者フォーラム](https://developers.facebook.com/community/)
2. [Convexサポート](https://www.convex.dev/support)
3. プロジェクトのGitHubイシュー
