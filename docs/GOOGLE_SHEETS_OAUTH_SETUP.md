# Google Sheets OAuth設定ガイド

## 1. Google Cloud Consoleでの設定

### 必要なAPI
- Google Sheets API

### OAuth 2.0クライアントの作成

1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. 「APIとサービス」→「ライブラリ」で「Google Sheets API」を有効化
3. 「APIとサービス」→「認証情報」→「認証情報を作成」→「OAuthクライアントID」
4. 設定内容：
   - アプリケーションの種類: **ウェブアプリケーション**
   - 名前: `Google Sheets Integration`（任意）
   - 承認済みのリダイレクトURI:
     ```
     http://localhost:3000/settings/google-sheets/callback
     ```
     ※本番環境の場合は本番URLも追加

## 2. アプリケーションでの設定

1. `http://localhost:3000/settings/google-sheets`にアクセス
2. 取得したClient IDとClient Secretを入力
3. 「設定を保存」をクリック
4. 「Googleアカウントと連携」をクリックして認証

## スコープ

Google Sheets統合で使用するスコープ：
- `https://www.googleapis.com/auth/spreadsheets.readonly` - スプレッドシートの読み取り
- `https://www.googleapis.com/auth/drive.readonly` - ドライブファイルのメタデータ読み取り

## トラブルシューティング

### redirect_uri_mismatch エラー
Google Cloud Consoleに登録したリダイレクトURIと完全に一致していることを確認：
- プロトコル（http/https）
- ドメイン
- ポート番号
- パス

### 401 Unauthorized エラー
- Client IDとClient Secretが正しく保存されているか確認
- Google Cloud ConsoleでAPIが有効になっているか確認