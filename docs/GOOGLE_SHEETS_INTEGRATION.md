# Google Sheets統合機能

## 概要
複数の広告代理店から提供される異なるフォーマットのGoogle Spreadsheetsデータを統合管理するシステムです。

## 主な機能

### Phase 1: 基本機能（実装済み）
- ✅ Google OAuth2認証
- ✅ スプレッドシートへのアクセス権限取得
- ✅ 手動データインポート
- ✅ mogumo Prisma形式のデータパース
- ✅ 統一フォーマットへの変換
- ✅ Convexへのデータ保存
- ✅ インポート履歴管理

### Phase 2: 拡張機能（今後実装予定）
- [ ] Google Ads標準形式パーサー
- [ ] Meta広告標準形式パーサー
- [ ] カスタムフォーマット対応
- [ ] フォーマット自動検出
- [ ] データ可視化ダッシュボード

### Phase 3: 自動化（今後実装予定）
- [ ] 日次自動同期
- [ ] エラー通知
- [ ] パフォーマンス最適化

## セットアップ手順

### 1. Google Cloud Console設定

1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. プロジェクトを作成または選択
3. Google Sheets APIを有効化
   - APIとサービス > ライブラリ
   - "Google Sheets API"を検索して有効化

### 2. OAuth2.0クライアント作成

1. APIとサービス > 認証情報
2. 「認証情報を作成」 > 「OAuth クライアント ID」
3. アプリケーションタイプ: ウェブアプリケーション
4. 承認済みのリダイレクトURIに追加:
   - `http://localhost:3000/google-sheets/callback`（開発用）
   - `https://yourdomain.com/google-sheets/callback`（本番用）

### 3. 環境変数設定

`.env.local`ファイルに以下を追加:

```env
# Google OAuth2設定
VITE_GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
VITE_GOOGLE_CLIENT_SECRET=your_client_secret
VITE_GOOGLE_REDIRECT_URI=http://localhost:3000/google-sheets/callback
```

### 4. アプリケーション起動

```bash
# 依存関係インストール
npm install

# 開発サーバー起動
npm run dev
```

## 使用方法

### 初回認証

1. サイドバーから「Google Sheets統合」をクリック
2. 「Googleアカウントでログイン」ボタンをクリック
3. Googleアカウントで認証
4. スプレッドシートへのアクセス権限を承認

### データインポート

1. 「インポート」タブを選択
2. スプレッドシートURLを入力
   - 例: `https://docs.google.com/spreadsheets/d/xxxxx/edit`
3. 代理店名を入力
   - 例: `mogumo Prisma`
4. 「インポート開始」をクリック

### サポートフォーマット

#### mogumo Prisma形式
必須カラム:
- 日付
- キャンペーン名
- 広告セット名
- 広告名
- 媒体名
- インプレッション数
- クリック数
- 広告費
- 注文数
- 注文金額
- 新規顧客数
- リピート顧客数

## ディレクトリ構造

```
src/features/google-sheets/
├── types/                 # 型定義
│   ├── index.ts
│   └── agency-formats.ts
├── parsers/               # データパーサー
│   ├── base-parser.ts
│   └── mogumo-parser.ts
├── utils/                 # ユーティリティ
│   └── google-sheets-api.ts
├── components/            # UIコンポーネント
│   └── GoogleAuth/
│       └── GoogleAuthButton.tsx
└── pages/                 # ページコンポーネント
    ├── GoogleSheetsMain.tsx
    └── GoogleAuthCallback.tsx

convex/
└── googleSheets.ts        # Convex関数
```

## API仕様

### Convex関数

#### 認証関連
- `saveAuthToken`: OAuth2トークンを保存
- `getValidToken`: 有効なトークンを取得
- `deleteAuthToken`: トークンを削除（ログアウト）

#### 設定管理
- `createSheetConfig`: スプレッドシート設定を作成
- `updateSheetConfig`: 設定を更新
- `listSheetConfigs`: 設定一覧を取得
- `getActiveSheetConfigs`: アクティブな設定を取得

#### データインポート
- `saveUnifiedPerformanceData`: 統合データを保存
- `createImportHistory`: インポート履歴を作成
- `updateImportHistory`: 履歴を更新

## トラブルシューティング

### 認証エラー

#### "redirect_uri_mismatch"
Google Cloud Consoleのリダイレクト URIと`VITE_GOOGLE_REDIRECT_URI`が一致していることを確認

#### "invalid_client"
クライアントIDとシークレットが正しくコピーされていることを確認

#### "access_denied"
Google Sheets APIが有効になっていることを確認

### インポートエラー

#### "無効なスプレッドシートURL"
- URLが正しい形式であることを確認
- スプレッドシートが公開または共有されていることを確認

#### "データの取得に失敗しました"
- アクセス権限があることを確認
- トークンが有効期限内であることを確認

## 今後の開発予定

1. **複数フォーマット対応**
   - Google Ads、Meta広告の標準エクスポート形式に対応
   - カスタムマッピング機能の実装

2. **自動同期機能**
   - 定期的な自動データ取得
   - 差分更新によるパフォーマンス改善

3. **データ分析機能**
   - 代理店間のパフォーマンス比較
   - トレンド分析
   - 異常値検出

4. **通知機能**
   - インポート完了/エラー通知
   - データ更新アラート

## お問い合わせ

問題が発生した場合は、以下の情報と共に開発チームにお問い合わせください:
- エラーメッセージの全文
- 使用しているスプレッドシートのフォーマット
- インポート履歴のスクリーンショット