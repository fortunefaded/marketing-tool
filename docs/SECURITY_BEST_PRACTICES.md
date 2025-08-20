# セキュリティベストプラクティス

## 環境変数の命名規則

### Viteプロジェクトでの環境変数

Viteでは、クライアントサイドで使用する環境変数には`VITE_`プレフィックスが必須です：

```env
# ✅ 良い例（クライアントサイドで使用可能）
VITE_META_APP_ID=1234567890123456

# ❌ 悪い例（クライアントサイドでアクセス不可）
META_APP_ID=1234567890123456
```

### セキュリティ上の重要な区別

#### 公開しても安全な情報（VITE\_プレフィックス付き）

- App ID
- API バージョン
- 公開設定値

#### 絶対に公開してはいけない情報（VITE\_プレフィックスなし）

- App Secret
- アクセストークン
- 暗号化キー

## 推奨される実装パターン

### 1. 開発環境（一時的な使用のみ）

```env
# .env.local（開発のみ）
VITE_META_APP_ID=1234567890123456
VITE_META_APP_SECRET=abcdef1234567890  # ⚠️ 開発のみ！
```

### 2. 本番環境（推奨）

#### クライアントサイド（.env）

```env
VITE_META_APP_ID=1234567890123456
VITE_API_ENDPOINT=https://your-api.com
```

#### サーバーサイドAPI

```javascript
// /api/meta/exchange-token
export async function handler(req, res) {
  const { shortLivedToken } = req.body

  // サーバー環境変数から取得
  const appSecret = process.env.META_APP_SECRET

  // トークン交換処理
  const longLivedToken = await exchangeToken(shortLivedToken, process.env.META_APP_ID, appSecret)

  res.json({ token: longLivedToken })
}
```

## トークン管理のベストプラクティス

### 1. システムユーザートークンの使用

```javascript
// ✅ 推奨：システムユーザートークン
// - 期限なし
// - より安全
// - 本番環境向け
```

### 2. トークンの暗号化

```javascript
// トークンをlocalStorageに保存する前に暗号化
import CryptoJS from 'crypto-js'

function saveToken(token: string) {
  const encrypted = CryptoJS.AES.encrypt(
    token,
    process.env.VITE_ENCRYPTION_KEY
  ).toString()

  localStorage.setItem('meta_token', encrypted)
}
```

### 3. トークンのローテーション

- 定期的なトークン更新
- 自動リフレッシュ機能の活用
- 監査ログの確認

## セキュリティチェックリスト

### 開発時

- [ ] `.env.local`が`.gitignore`に含まれている
- [ ] App Secretがコミットされていない
- [ ] 開発用トークンのみ使用

### デプロイ前

- [ ] `VITE_META_APP_SECRET`を削除
- [ ] サーバーサイドAPIの実装
- [ ] HTTPS通信の確認
- [ ] 暗号化キーの設定

### 本番運用

- [ ] 最小権限の原則を適用
- [ ] アクセスログの監視
- [ ] 定期的なトークンローテーション
- [ ] セキュリティアップデートの適用

## トラブルシューティング

### 「環境変数が見つからない」エラー

```javascript
// Viteでは import.meta.env を使用
console.log(import.meta.env.VITE_META_APP_ID) // ✅
console.log(process.env.META_APP_ID) // ❌
```

### セキュリティ警告の対処

開発中に以下の警告が表示される場合：

```
⚠️ 警告: App Secretがクライアントサイドに公開されています。
```

これは正常です。本番環境では必ずサーバーサイドAPIを使用してください。
