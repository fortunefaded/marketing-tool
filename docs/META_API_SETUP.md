# Meta API 統合セットアップガイド

このガイドでは、実際のMeta広告APIと統合するための手順を説明します。

## 1. Meta開発者アカウントの作成

### 1.1 Facebook開発者アカウントの登録
1. [Facebook for Developers](https://developers.facebook.com/)にアクセス
2. 「スタート」をクリックして開発者アカウントを作成
3. 既存のFacebookアカウントでログイン、または新規作成
4. 開発者規約に同意

### 1.2 アプリの作成
1. ダッシュボードから「アプリを作成」をクリック
2. アプリタイプは「ビジネス」を選択
3. アプリ名と連絡先メールアドレスを入力
4. 「アプリを作成」をクリック

## 2. Marketing APIの設定

### 2.1 Marketing APIの追加
1. アプリダッシュボードで「製品を追加」をクリック
2. 「Marketing API」を見つけて「設定」をクリック
3. 利用規約に同意

### 2.2 必要な権限の設定
以下の権限が必要です：
- `ads_read` - 広告データの読み取り
- `ads_management` - 広告の管理（オプション）
- `business_management` - ビジネスアカウントの管理
- `pages_read_engagement` - ページエンゲージメントの読み取り
- `pages_show_list` - ページリストの表示

## 3. アクセストークンの取得

### 3.1 短期アクセストークン（開発用）
1. [Graph API Explorer](https://developers.facebook.com/tools/explorer/)にアクセス
2. アプリを選択
3. 「Get Token」→「Get User Access Token」を選択
4. 必要な権限にチェックを入れて「Generate Access Token」

### 3.2 長期アクセストークン（本番用）
```bash
# 短期トークンを長期トークンに交換
curl -X GET "https://graph.facebook.com/v23.0/oauth/access_token?grant_type=fb_exchange_token&client_id={app-id}&client_secret={app-secret}&fb_exchange_token={short-lived-token}"
```

### 3.3 システムユーザートークン（推奨）
1. Business Managerで「ビジネス設定」→「システムユーザー」
2. 「追加」をクリックしてシステムユーザーを作成
3. 「トークンを生成」で必要な権限を選択
4. トークンを安全に保管

## 4. 広告アカウントIDの取得

### 4.1 Business Managerから取得
1. [Business Manager](https://business.facebook.com/)にログイン
2. 「ビジネス設定」→「アカウント」→「広告アカウント」
3. 対象の広告アカウントを選択
4. アカウントIDをコピー（例：act_123456789）

### 4.2 Graph APIで取得
```bash
curl -X GET "https://graph.facebook.com/v23.0/me/adaccounts?access_token={access-token}"
```

## 5. 環境変数の設定

`.env.local`ファイルに以下を追加：

```env
# Meta API設定
VITE_META_APP_ID=your_app_id
VITE_META_APP_SECRET=your_app_secret
VITE_META_ACCESS_TOKEN=your_access_token
VITE_META_AD_ACCOUNT_ID=act_123456789

# オプション：ビジネスマネージャーID
VITE_META_BUSINESS_ID=your_business_id

# 開発環境フラグ
VITE_USE_MOCK_DATA=false
```

## 6. APIレート制限について

### 6.1 レート制限の種類
- **アプリレベル**: 1時間あたり200リクエスト×MAU（月間アクティブユーザー数）
- **ユーザーレベル**: 1時間あたり200リクエスト
- **広告アカウントレベル**: より複雑な計算式

### 6.2 レート制限の確認
レスポンスヘッダーで確認：
```
X-Business-Use-Case-Usage: {
  "{business-id}": [
    {
      "type": "ads_insights",
      "call_count": 4,
      "total_cputime": 5,
      "total_time": 5,
      "estimated_time_to_regain_access": 0
    }
  ]
}
```

## 7. トラブルシューティング

### よくあるエラー

#### エラー: Invalid OAuth 2.0 Access Token
- トークンの有効期限切れ
- 権限不足
- アプリIDとトークンの不一致

#### エラー: (#17) User request limit reached
- レート制限に到達
- 待機するか、バッチリクエストを使用

#### エラー: (#100) Invalid parameter
- APIバージョンの不一致
- 必須パラメータの欠落
- 無効なフィールド名

## 8. セキュリティのベストプラクティス

1. **トークンの保護**
   - アクセストークンを直接コードに記述しない
   - 環境変数を使用
   - クライアントサイドに露出させない

2. **権限の最小化**
   - 必要最小限の権限のみ要求
   - 定期的に権限を見直し

3. **監査ログ**
   - API呼び出しをログに記録
   - 異常なアクセスパターンを監視

4. **トークンのローテーション**
   - 定期的にトークンを更新
   - 自動更新メカニズムの実装

## 9. 次のステップ

1. テスト広告アカウントでの動作確認
2. 本番広告アカウントへの段階的移行
3. エラーハンドリングの強化
4. パフォーマンスモニタリングの設定