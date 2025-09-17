# Google Ads API Setup Implementation

## 実装済み機能

### 1. Convexバックエンド (`convex/googleAds.ts`)
- ✅ Google Ads設定の保存・取得
- ✅ OAuth認証コールバック処理
- ✅ 接続テスト機能
- ✅ キャンペーンデータ取得（モック）
- ✅ パフォーマンスメトリクス取得（モック）

### 2. データベーススキーマ (`convex/schema.ts`)
- ✅ googleAdsConfig - 設定情報
- ✅ googleAdsCampaigns - キャンペーン情報
- ✅ googleAdsPerformance - パフォーマンスデータ

### 3. フロントエンド
- ✅ SettingsManagementページにGoogle Ads設定セクション追加
- 🚧 Google Ads設定ページコンポーネント（GoogleAdsSettings.tsx）作成中

## 必要な設定情報

### OAuth 2.0 認証
1. **Google Cloud Project**
   - Client ID
   - Client Secret
   - Redirect URI: `http://localhost:3003/settings/google-ads/callback`

2. **Google Ads アカウント**
   - Customer ID（お客様ID）
   - Manager Account ID（MCC ID）※複数アカウント管理の場合
   - Developer Token

### 必要な権限（OAuth スコープ）
- `https://www.googleapis.com/auth/adwords` - フルアクセス
- `https://www.googleapis.com/auth/adwords.readonly` - 読み取り専用（推奨）

## セットアップ手順

1. **Google Cloud Console**
   - https://console.cloud.google.com/ にアクセス
   - 新しいプロジェクトを作成
   - Google Ads APIを有効化

2. **OAuth 2.0認証情報を作成**
   - APIとサービス → 認証情報
   - OAuth クライアント IDを作成
   - リダイレクトURIを設定

3. **Google Ads Developer Token**
   - https://ads.google.com/ にログイン
   - ツールと設定 → APIセンター
   - Developer Tokenを申請

## 次のステップ

1. Google Ads設定ページコンポーネントの完成
2. ルーティングの設定
3. 実際のGoogle Ads APIとの統合
4. エラーハンドリングの実装
5. データ同期機能の実装