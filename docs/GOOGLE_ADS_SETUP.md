# Google Ads API セットアップガイド

## 📋 概要
このドキュメントは、Marketing ToolでGoogle Ads APIを使用してKPIビューに広告費データを表示するための設定手順を記載しています。

## 🚨 重要事項

### Developer Tokenの制限
- **現状**: Developer Tokenは**テストモード**（未承認）
- **制限**: 本番アカウントのデータにはアクセス不可
- **解決策**: テストアカウントを使用、またはDeveloper Tokenのアップグレード申請

### アカウント構成
```
MCCアカウント（371-216-2647）- Mogumo marketing tool
  ├── 本番アカウント（965-970-8798）- 冷凍宅配幼児食mogumo ← APIアクセス不可
  └── テストアカウント（新規作成）← APIアクセス可能
```

## 🔧 セットアップ手順

### 1. テストアカウントの作成

#### 1.1 新規アカウント作成
1. [Google Ads](https://ads.google.com/)にログイン
2. アカウント切り替えメニュー → 「新しい Google 広告アカウント」
3. ビジネス情報を入力：
   - **ビジネス名**: `Test Account - Mogumo`
   - **URL**: `https://mogumo.jp`
4. **エキスパートモード**に切り替え
5. **「アカウントを作成（キャンペーンなし）」**を選択
6. アカウント設定：
   - **国**: 日本
   - **タイムゾーン**: （GMT+09:00）日本時間
   - **通貨**: 日本円（JPY）

#### 1.2 Customer IDの取得
作成完了後、新しいCustomer ID（例：`123-456-7890`）が発行されます。このIDをメモしてください。

### 2. API Centerでテストアカウントとして登録

1. [Google Ads API Center](https://ads.google.com/aw/apicenter)にアクセス
2. 「テストアカウント」セクションを探す
3. 「テストアカウントを追加」をクリック
4. 作成したCustomer IDを入力

### 3. アプリケーションの設定更新

#### 3.1 Google Ads設定画面での更新
1. アプリケーションの `/settings/google-ads` にアクセス
2. 以下の情報を入力：
   ```
   Customer ID: [テストアカウントのID]
   Manager Account ID: 371-216-2647（MCCアカウント）
   ```
3. 「設定を保存」をクリック

#### 3.2 OAuth認証の再実行
1. 「Google Adsと接続」ボタンをクリック
2. Googleアカウントでログイン
3. アクセス許可を承認

### 4. 接続テスト

1. 設定画面で「接続テスト」ボタンをクリック
2. 成功メッセージが表示されることを確認

## 📊 データの表示

### KPIビューでの確認
1. ルートURL（`/`）にアクセス
2. 「Google広告」セクションを確認
3. 以下のデータが表示されます：
   - Google広告費
   - ECForce CV
   - Google CPO

### デバッグ情報
ブラウザのコンソール（F12）で以下のログを確認できます：
- `📊 Google Adsデータ取得開始`
- `✅ テストデータ取得成功`（テストアカウント使用時）

## 🔄 本番環境への移行

### Developer Tokenのアップグレード手順
1. [Google Ads API Center](https://ads.google.com/aw/apicenter)にアクセス
2. 「APIアクセスレベル」セクション
3. 「ベーシックアクセスを申請」をクリック
4. 申請フォームを記入（承認まで1-2営業日）

### アップグレード後の設定変更
1. `/settings/google-ads`で本番アカウントのCustomer ID（965-970-8798）に変更
2. OAuth認証を再実行
3. 本番データが表示されることを確認

## 🛠️ トラブルシューティング

### エラー: DEVELOPER_TOKEN_NOT_APPROVED
**原因**: Developer Tokenがテストモードで、本番アカウントにアクセスしようとしている
**解決策**:
- テストアカウントのCustomer IDを使用
- またはDeveloper Tokenをアップグレード

### エラー: 403 PERMISSION_DENIED
**原因**: アカウントへのアクセス権限がない
**解決策**:
- Customer IDが正しいか確認
- OAuth認証を再実行
- MCCアカウントにアカウントがリンクされているか確認

### データが0円と表示される
**原因**:
1. APIの認証に失敗している
2. 指定期間にデータが存在しない
3. テストアカウントにキャンペーンが作成されていない

**解決策**:
1. Convexダッシュボードでログを確認
2. 期間を変更して再試行
3. テストアカウントにサンプルキャンペーンを作成

## 📝 関連ファイル

### Backend（Convex）
- `/convex/googleAds.ts` - Google Ads API連携の実装
- `/convex/googleAdsTestData.ts` - テストデータ生成

### Frontend
- `/src/pages/GoogleAdsSettings.tsx` - 設定画面
- `/src/pages/GoogleAdsCallback.tsx` - OAuth コールバック
- `/src/pages/KPIViewDashboardBreakdown.tsx` - KPIビューでのデータ表示
- `/src/pages/GoogleAdsAnalysis.tsx` - APIフィールド確認用ページ

### 設定
- `/CLAUDE.md` - プロジェクト全体の設定（Google Ads API v21使用を明記）

## 🔗 参考リンク

- [Google Ads API ドキュメント](https://developers.google.com/google-ads/api/docs/start)
- [Google Ads API Center](https://ads.google.com/aw/apicenter)
- [OAuth 2.0 設定](https://console.cloud.google.com/)
- [Convex ダッシュボード](https://dashboard.convex.dev/)

## 📌 現在の状態（2025年9月）

- ✅ OAuth認証実装済み
- ✅ 設定画面実装済み
- ✅ テストデータ表示機能実装済み
- ⏳ Developer Tokenアップグレード待ち
- ⏳ テストアカウント作成中

## 連絡先
問題が発生した場合は、以下を確認してください：
1. このドキュメントのトラブルシューティング
2. Convexダッシュボードのログ
3. ブラウザのコンソールログ