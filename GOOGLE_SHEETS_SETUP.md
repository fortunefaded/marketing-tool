# Google Sheets統合機能 セットアップガイド

## 🚀 クイックスタート（5分で完了）

### 1. Google Cloud Consoleでプロジェクトを作成

1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. 「プロジェクトを作成」または既存のプロジェクトを選択

### 2. Google Sheets APIを有効化

1. 左側メニューから「APIとサービス」→「ライブラリ」
2. 検索ボックスに「Google Sheets API」と入力
3. 「Google Sheets API」を選択して「有効にする」をクリック

### 3. OAuth 2.0クライアントを作成

1. 「APIとサービス」→「認証情報」
2. 「認証情報を作成」→「OAuth クライアント ID」
3. 初回の場合は「同意画面を構成」が必要：
   - ユーザータイプ: 「外部」を選択
   - アプリ名: 任意の名前（例: Marketing Tool）
   - サポートメール: あなたのメールアドレス
   - デベロッパーの連絡先: あなたのメールアドレス
4. OAuthクライアント作成画面で：
   - アプリケーションの種類: 「ウェブアプリケーション」
   - 名前: 任意（例: Marketing Tool Web Client）
   - 承認済みのリダイレクトURI:
     ```
     http://localhost:3000/google-sheets/callback
     ```

### 4. クライアントIDとシークレットを取得

作成完了後、以下が表示されます：
- **クライアントID**: `xxxxx.apps.googleusercontent.com`
- **クライアントシークレット**: `GOCSPX-xxxxx`

これらをコピーして保存してください。

### 5. 環境変数を設定

`.env.local`ファイルに以下を追加：

```bash
# Google Sheets OAuth2設定
VITE_GOOGLE_CLIENT_ID=あなたのクライアントID.apps.googleusercontent.com
VITE_GOOGLE_CLIENT_SECRET=あなたのクライアントシークレット
VITE_GOOGLE_REDIRECT_URI=http://localhost:3000/google-sheets/callback
```

### 6. アプリケーションを再起動

```bash
# 開発サーバーを再起動
npm run dev
```

### 7. Google Sheets統合を使用

1. ブラウザで http://localhost:3000/google-sheets にアクセス
2. 「Googleアカウントでログイン」をクリック
3. Googleアカウントを選択して権限を承認
4. スプレッドシートのURLを入力してデータをインポート

## ⚠️ 重要な注意事項

- **Google Ads API**と**Google Sheets API**は別々のAPIです
- `/settings/google-ads`の設定とは**共用できません**
- 各APIには異なるスコープと認証が必要です

## 🔧 トラブルシューティング

### エラー: "Google Client IDが設定されていません"
→ `.env.local`に環境変数が正しく設定されているか確認

### エラー: "redirect_uri_mismatch"
→ Google Cloud Consoleに登録したリダイレクトURIと環境変数のURIが完全一致することを確認

### エラー: "access_denied"
→ Google Sheets APIが有効になっているか確認

## 📝 テスト用スプレッドシート

テスト用のサンプルスプレッドシートを作成する場合：

1. [Google Sheets](https://sheets.google.com)で新規スプレッドシート作成
2. 以下の形式でデータを入力：

| 日付 | キャンペーン名 | 広告セット名 | 広告名 | 媒体名 | インプレッション数 | クリック数 | 広告費 | 注文数 | 注文金額 |
|------|--------------|-------------|--------|--------|-----------------|-----------|--------|--------|---------|
| 2024-01-01 | Campaign A | AdSet 1 | Ad 1 | Facebook | 10000 | 100 | 5000 | 10 | 50000 |
| 2024-01-02 | Campaign A | AdSet 1 | Ad 1 | Facebook | 12000 | 120 | 5500 | 12 | 60000 |

3. スプレッドシートのURLをコピー
4. Google Sheets統合ページでインポート

## 🆘 サポート

問題が発生した場合は、以下の情報を確認してください：
- ブラウザのコンソールエラー
- `.env.local`の設定内容（シークレット以外）
- Google Cloud Consoleの設定