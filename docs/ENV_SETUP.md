# 環境変数設定ガイド

このガイドでは、Meta広告ダッシュボードアプリケーションの環境変数設定について説明します。

## 必要な環境変数

### 1. Convex設定

```env
VITE_CONVEX_URL=your_convex_url_here
```

- **説明**: ConvexデータベースのエンドポイントURL
- **取得方法**: [Convex Dashboard](https://dashboard.convex.dev/)からプロジェクトのURLをコピー

### 2. Meta API基本設定

```env
VITE_META_APP_ID=your_meta_app_id
VITE_META_APP_SECRET=your_meta_app_secret
VITE_META_AD_ACCOUNT_ID=act_your_ad_account_id
```

- **VITE_META_APP_ID**: Facebook開発者アプリのID
- **VITE_META_APP_SECRET**: アプリシークレット（絶対に公開しない）
- **VITE_META_AD_ACCOUNT_ID**: 広告アカウントID（`act_`プレフィックス付き）

### 3. トークン設定（オプション）

```env
# UIで設定可能なため、環境変数での設定は任意
# VITE_META_ACCESS_TOKEN=your_access_token
# VITE_META_SYSTEM_USER_TOKEN=your_system_user_token
```

- トークンはアプリケーション内のUIから設定することを推奨
- システムユーザートークンは期限がないため、本番環境に適しています

### 4. 開発モード設定

```env
VITE_USE_MOCK_DATA=true
```

- **true**: モックデータを使用（Meta APIを呼び出さない）
- **false**: 実際のMeta APIを使用

### 5. セキュリティ設定

```env
# 本番環境では必須
# VITE_ENCRYPTION_KEY=your_encryption_key_for_tokens
```

- トークンの暗号化に使用
- 32文字以上のランダムな文字列を推奨

## 設定手順

### 開発環境

1. `.env.example`をコピーして`.env.local`を作成

   ```bash
   cp .env.example .env.local
   ```

2. 各値を実際の値に置き換え

   ```env
   VITE_CONVEX_URL=https://your-project.convex.cloud
   VITE_META_APP_ID=123456789012345
   VITE_META_APP_SECRET=abcdef123456789
   VITE_META_AD_ACCOUNT_ID=act_987654321
   VITE_USE_MOCK_DATA=false
   ```

3. アプリケーションを再起動
   ```bash
   npm run dev
   ```

### 本番環境

1. 環境変数をホスティングサービスで設定
   - Vercel: プロジェクト設定 → Environment Variables
   - Netlify: Site settings → Environment variables
   - Heroku: Settings → Config Vars

2. 必須項目の確認
   - [ ] `VITE_CONVEX_URL`
   - [ ] `VITE_META_APP_ID`
   - [ ] `VITE_META_APP_SECRET`
   - [ ] `VITE_META_AD_ACCOUNT_ID`
   - [ ] `VITE_ENCRYPTION_KEY`（本番環境のみ）

3. セキュリティ設定
   - `VITE_META_APP_SECRET`は絶対に公開しない
   - `VITE_ENCRYPTION_KEY`は強力なランダム文字列を使用
   - HTTPSを必須とする

## トラブルシューティング

### 環境変数が読み込まれない

1. ファイル名が`.env.local`であることを確認
2. 変数名が`VITE_`で始まっていることを確認
3. アプリケーションを再起動

### Meta APIエラー

1. アプリIDとシークレットが正しいか確認
2. 広告アカウントIDに`act_`プレフィックスがあるか確認
3. トークンの有効期限を確認

### Convex接続エラー

1. Convex URLが正しいか確認
2. Convexプロジェクトがアクティブか確認
3. ネットワーク接続を確認

## セキュリティのベストプラクティス

1. **環境変数の管理**
   - `.env.local`をGitにコミットしない（`.gitignore`に追加済み）
   - 本番環境の環境変数は安全に管理
   - 定期的にシークレットをローテーション

2. **トークンの保護**
   - トークンは環境変数ではなくUIから設定
   - ブラウザのlocalStorageに暗号化して保存
   - 定期的な自動更新を有効化

3. **アクセス制御**
   - 最小権限の原則を適用
   - 必要な権限のみを要求
   - 監査ログを定期的に確認

## 環境別の推奨設定

### 開発環境

```env
VITE_USE_MOCK_DATA=true
NODE_ENV=development
```

### ステージング環境

```env
VITE_USE_MOCK_DATA=false
NODE_ENV=staging
VITE_ENCRYPTION_KEY=staging_encryption_key_32_chars_min
```

### 本番環境

```env
VITE_USE_MOCK_DATA=false
NODE_ENV=production
VITE_ENCRYPTION_KEY=production_encryption_key_32_chars_min
```
