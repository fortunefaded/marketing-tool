# Meta API統合テスト実行ガイド

## 概要

このガイドでは、実際のMeta APIを使用して統合テストを実行する方法を説明します。

## 前提条件

1. **Meta開発者アカウント**
   - https://developers.facebook.com でアカウントを作成
   - アプリを作成し、Marketing APIを追加

2. **必要な権限**
   - `ads_read`
   - `ads_management`
   - `business_management`

3. **環境変数の設定**
   - `.env.local`ファイルに必要な情報を設定

## テスト実行手順

### 1. 環境変数の準備

`.env.local`ファイルを作成し、以下の内容を設定：

```env
# Meta API Configuration
VITE_META_APP_ID=your_app_id
VITE_META_AD_ACCOUNT_ID=act_your_ad_account_id
VITE_USE_MOCK_DATA=false

# Optional: For token exchange features
VITE_META_APP_SECRET=your_app_secret

# Access Token (obtain from Meta API Setup page)
VITE_META_ACCESS_TOKEN=your_access_token
```

### 2. アクセストークンの取得

#### 方法1: UIから取得（推奨）

1. アプリケーションを起動

   ```bash
   npm run dev
   ```

2. http://localhost:3000/meta-api-setup にアクセス

3. 「環境変数設定」タブで基本情報を入力

4. 「トークン設定」タブでトークンを取得

#### 方法2: Graph API Explorerから取得

1. https://developers.facebook.com/tools/explorer/ にアクセス
2. アプリを選択
3. 必要な権限を選択
4. 「Generate Access Token」をクリック

### 3. 統合テストの実行

```bash
npm run test:meta-api
```

### 4. テスト結果の確認

テストスクリプトは以下の項目を自動的にチェックします：

```
🚀 Meta API統合テストを開始します...

▶ 環境変数チェック
✓ 成功 (5ms)

▶ APIクライアント初期化
✓ 成功 (10ms)

▶ API接続確認
✓ 成功 (523ms)

▶ 広告アカウント情報取得
✓ 成功 (412ms)

▶ キャンペーン一覧取得
✓ 成功 (634ms)

▶ インサイトデータ取得
✓ 成功 (789ms)

▶ トークン検証
✓ 成功 (234ms)

▶ レート制限状態確認
✓ 成功 (2ms)

▶ バッチリクエスト
✓ 成功 (456ms)

▶ エラーハンドリング
✓ 成功 (123ms)

📊 テスト結果サマリー

✓ 成功: 10/10

総実行時間: 3188ms

✨ テスト完了
```

## トラブルシューティング

### よくあるエラーと対処法

#### 1. "Invalid OAuth 2.0 Access Token"

**原因**: トークンの有効期限切れ

**解決方法**:

```bash
# 新しいトークンを取得
# UIまたはGraph API Explorerから再取得
```

#### 2. "Application does not have permission"

**原因**: 必要な権限が不足

**解決方法**:

- Facebook Business Managerで権限を確認
- 必要な権限を追加申請

#### 3. "Rate limit exceeded"

**原因**: API呼び出し回数の超過

**解決方法**:

- テスト実行間隔を空ける
- バッチAPIを使用

### デバッグモード

詳細なログを出力する場合：

```bash
DEBUG=* npm run test:meta-api
```

## 次のステップ

すべてのテストが成功したら：

1. **ダッシュボードの動作確認**

   ```bash
   npm run dev
   ```

   http://localhost:3000/meta-dashboard にアクセス

2. **データ同期のテスト**
   - ダッシュボードから「データ同期」を実行
   - Convexダッシュボードでデータを確認

3. **本番環境への準備**
   - システムユーザートークンの取得
   - 本番用環境変数の設定
   - デプロイメントの実行

## セキュリティに関する注意

- **App Secretは絶対に公開しない**
- **アクセストークンは安全に管理**
- **本番環境ではシステムユーザートークンを使用**
- **HTTPSでの通信を確認**

## 参考リンク

- [Meta Marketing API Documentation](https://developers.facebook.com/docs/marketing-api/)
- [Graph API Explorer](https://developers.facebook.com/tools/explorer/)
- [Access Token Debugger](https://developers.facebook.com/tools/debug/accesstoken/)
- [Rate Limiting Guide](https://developers.facebook.com/docs/graph-api/overview/rate-limiting)
