# Google Ads API テストアカウント設定手順

## 1. テストアカウントの作成

### Google Ads テストアカウント
1. [Google Ads API Center](https://ads.google.com/aw/apicenter) にアクセス
2. "Test Account" を作成
3. テストアカウントIDを取得（例: 123-456-7890）

### Developer Token
1. API Centerで "Basic Access" または "Standard Access" を申請
2. テスト用のDeveloper Tokenを取得
3. テストアカウントでは本番のDeveloper Tokenも使用可能

## 2. OAuth2.0 認証の設定

### Google Cloud Console
1. [Google Cloud Console](https://console.cloud.google.com) にアクセス
2. 新規プロジェクトまたは既存プロジェクトを選択
3. "APIとサービス" > "認証情報" を開く
4. OAuth 2.0 クライアントIDを作成：
   - アプリケーションタイプ: ウェブアプリケーション
   - 承認済みリダイレクトURI: `http://localhost:3000/settings/google-ads/callback`

### 必要なスコープ
```
https://www.googleapis.com/auth/adwords
```

## 3. 実際の認証フロー

### ステップ1: 設定画面で情報を入力
```
Client ID: [Google Cloud ConsoleのOAuth2.0クライアントID]
Client Secret: [Google Cloud ConsoleのOAuth2.0クライアントシークレット]
Developer Token: [Google Ads API CenterのDeveloper Token]
Customer ID: [テストアカウントのCustomer ID（ハイフンなし）]
```

### ステップ2: OAuth認証
1. "Googleアカウントと連携" ボタンをクリック
2. Googleアカウントでログイン
3. 権限を承認
4. 自動的にコールバックページにリダイレクト
5. アクセストークンとリフレッシュトークンが自動保存

## 4. APIテストの実行

### コマンドラインでテスト
```bash
# 接続テスト
npx convex run googleAds:testConnection

# データ取得テスト
npx convex run googleAds:fetchPerformanceData '{"startDate": "2025-01-01", "endDate": "2025-01-19"}'
```

### ブラウザでテスト
1. http://localhost:3000/google-ads-analysis にアクセス
2. "パフォーマンスデータ" タブを選択
3. 期間を選択
4. "データ取得" ボタンをクリック

## 5. テストアカウントの制限事項

- 実際の広告は配信されない
- 課金は発生しない
- APIレート制限が緩い
- 本番環境への影響なし

## 6. トラブルシューティング

### 401 Unauthorized エラー
- Developer Tokenが正しいか確認
- OAuth認証が完了しているか確認
- アクセストークンの有効期限を確認

### 403 Forbidden エラー
- Customer IDが正しいか確認
- Developer TokenがそのCustomer IDにアクセス権限があるか確認
- Manager Account IDが必要な場合は設定

### データが取得できない
- テストアカウントにダミーキャンペーンを作成
- Google Ads UIでテストデータを生成

## 7. 本番環境への移行

1. 本番用のCustomer IDに変更
2. Standard Access のDeveloper Tokenを使用
3. 本番用のOAuth認証を再実行