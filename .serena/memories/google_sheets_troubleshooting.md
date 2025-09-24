# Google Sheets統合 - トラブルシューティング

## よくある問題と解決方法

### 1. 認証エラー
**症状：** 「Google Client IDが設定されていません」
**解決：** 
- Convex Dashboardで環境変数確認
- GOOGLE_CLIENT_ID と GOOGLE_CLIENT_SECRET が設定されているか

### 2. スコープエラー
**症状：** 「Request had insufficient authentication scopes」
**解決：**
- Google Cloud Consoleで Sheets API が有効か確認
- OAuth同意画面でスコープ追加
- トークンをリセットして再認証

### 3. データ取得エラー
**症状：** 「The caller does not have permission」
**解決：**
- スプレッドシートの共有設定確認
- 認証アカウントにアクセス権限があるか確認

### 4. パースエラー
**症状：** データが正しく表示されない
**解決：**
- ヘッダー行番号の設定確認（mogumoは3行目）
- データ開始行の設定確認（mogumoは4行目）
- 日付フォーマットの確認

### 5. API制限エラー
**症状：** 「Quota exceeded」
**解決：**
- Google Cloud Consoleでクォータ確認
- リトライ間隔を調整
- バッチ処理に変更

## デバッグ用コマンド

```bash
# Convexログ確認
npx convex logs

# 環境変数確認
npx convex env list

# データ確認
npx convex run googleSheets:getUnifiedPerformanceData
```
