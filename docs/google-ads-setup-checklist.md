# Google Ads API 設定チェックリスト

## 設定に必要な情報

### 1. Google Cloud Console から取得
- [ ] Client ID: `___________________________________________`
- [ ] Client Secret: `_______________________________________`

### 2. Google Ads API Center から取得
- [ ] Developer Token: `_____________________________________`
- [ ] Customer ID (ハイフンなし): `________________________`
- [ ] Manager Account ID (オプション): `____________________`

## 設定手順

### ステップ1: 設定画面で入力
1. http://localhost:3000/settings/google-ads にアクセス
2. 上記の情報をすべて入力
3. 「設定を保存」をクリック

### ステップ2: OAuth認証
1. 「Googleアカウントと連携」ボタンをクリック
2. Googleアカウントでログイン（Google Adsにアクセス権があるアカウント）
3. 以下の権限を承認：
   - Google Ads の管理
4. 自動的にコールバックページにリダイレクト

### ステップ3: 接続確認
1. 設定画面に戻る
2. 「接続テスト」ボタンをクリック
3. 「接続済み」と表示されることを確認

## トラブルシューティング

### エラー: redirect_uri_mismatch
- Google Cloud Console で リダイレクトURI が正確に以下になっているか確認：
  ```
  http://localhost:3000/settings/google-ads/callback
  ```
  （最後のスラッシュなし、httpsではなくhttp）

### エラー: 401 Unauthorized
- Developer Token が正しいか確認
- Customer ID がハイフンなしで入力されているか確認
- Google Ads アカウントへのアクセス権があるGoogleアカウントでログインしたか確認

### エラー: このアプリは確認されていません
- 「詳細」をクリック
- 「Marketing Tool (安全ではないページ) に移動」をクリック