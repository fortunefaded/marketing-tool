# セキュリティガイドライン

## ECForce認証情報の管理

### ⚠️ 重要な注意事項

1. **認証情報は絶対にGitにコミットしない**
2. **本番環境ではVercel環境変数を使用する**
3. **パスワードは定期的に変更する**

### 環境別の設定方法

#### 開発環境（ローカル）

1. `.env.ecforce`ファイルを作成（gitignore済み）
```bash
cp .env.ecforce.example .env.ecforce
```

2. ファイル権限を制限
```bash
chmod 600 .env.ecforce
```

3. 認証情報を設定
```env
ECFORCE_BASIC_USER=your_basic_user
ECFORCE_BASIC_PASS=your_basic_pass
ECFORCE_EMAIL=your_email
ECFORCE_PASSWORD=your_password
```

#### 本番環境（Vercel）

Vercelダッシュボードで環境変数を設定：

1. https://vercel.com/dashboard にアクセス
2. プロジェクトを選択
3. Settings → Environment Variables
4. 以下の変数を追加：
   - `ECFORCE_BASIC_USER`
   - `ECFORCE_BASIC_PASS`
   - `ECFORCE_EMAIL`
   - `ECFORCE_PASSWORD`

### セキュリティベストプラクティス

#### DO ✅
- 環境変数を使用する
- `.env`ファイルをgitignoreに含める
- 本番環境ではVercel/AWSなどの環境変数機能を使用
- パスワードを定期的に変更
- 最小権限の原則を適用

#### DON'T ❌
- パスワードをコードにハードコーディング
- `.env`ファイルをGitにコミット
- 平文のパスワードをログに出力
- 認証情報を他人と共有
- 弱いパスワードを使用

### 緊急時の対応

もし認証情報が漏洩した場合：

1. **即座にパスワードを変更**
2. **影響範囲を確認**
3. **アクセスログを確認**
4. **必要に応じてサービス提供者に連絡**

### 将来的な改善提案

1. **OAuth2.0の導入**
   - パスワード不要の認証方式への移行

2. **APIキー認証**
   - より安全なAPIキーベースの認証

3. **シークレット管理サービス**
   - AWS Secrets Manager
   - HashiCorp Vault
   - などの専用サービスの利用

4. **監査ログ**
   - アクセスログの記録と監視

## お問い合わせ

セキュリティに関する質問や懸念事項がある場合は、開発チームまでご連絡ください。