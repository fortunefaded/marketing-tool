# Meta API Actions データ取得問題の解決策

## 問題の概要
Meta API から actions データ（いいね、コメント、保存、シェアなどのエンゲージメントデータ）が取得できていない

## 実施した対策（2025年8月22日）

### 1. MetaApiService.getInsights メソッドの改善

#### 主な変更点：
1. **アトリビューション設定の強化**
   - `use_unified_attribution_setting: true` を追加（v23.0推奨）
   - `action_attribution_windows` を明示的に設定：`['1d_click', '7d_click', '1d_view', '7d_view']`
   - `action_breakdowns: 'action_type'` をデフォルトで追加

2. **デバッグ機能の追加**
   - Actions データの取得状況を詳細にログ出力
   - 取得できない場合の原因と対策を表示
   - Instagram特有のアクションを個別に抽出・レポート

3. **エラーハンドリングの改善**
   - Actions データが空の場合の警告メッセージ
   - 考えられる原因のリスト表示

### 2. テストスクリプトの作成

`scripts/test-meta-api-actions.ts` を作成：
- 最小限のリクエストでの動作確認
- アトリビューション設定ありでの動作確認
- Instagram特有のアクション取得テスト
- アカウント設定の確認

## Actions データが取得できない場合のチェックリスト

### 1. Meta Business Manager側の確認
- [ ] Facebook Pixelが正しく設置されているか
- [ ] コンバージョンAPIが設定されているか
- [ ] イベントマネージャーでイベントが確認できるか
- [ ] アトリビューション設定が適切か

### 2. 権限の確認
必要な権限：
- `ads_read`（必須）
- `ads_management`（推奨）
- `pages_read_engagement`（ページ投稿型広告の場合）
- `business_management`（ビジネスアカウント管理）

### 3. データの存在確認
- [ ] 選択した期間内に実際にアクションが発生しているか
- [ ] Meta Ads Manager UIで同じ広告のアクションデータが表示されているか

## Instagram エンゲージメントデータの取得方法

### 主要なアクションタイプ
```typescript
// Instagram特有のアクション
const instagramActions = {
  'like': 'いいね',
  'comment': 'コメント',
  'post_save': '保存',
  'post': 'シェア',
  'page_engagement': 'ページエンゲージメント',
  'post_engagement': '投稿エンゲージメント',
  'link_click': 'リンククリック',
  'photo_view': '写真表示',
  'video_view': '動画再生'
}
```

### エンゲージメント率の計算
```typescript
const engagement_rate = insight.reach > 0 
  ? ((like + comment + post_save + post) / insight.reach) * 100 
  : 0
```

## テスト実行方法

```bash
# テストスクリプトの実行
npm run test:meta-actions

# または直接実行
npx tsx scripts/test-meta-api-actions.ts
```

## APIリクエストの例

### 正しいリクエストパラメータ
```javascript
const params = {
  fields: 'actions,action_values,impressions,spend',
  level: 'ad',
  date_preset: 'last_7d',
  use_unified_attribution_setting: true,
  action_attribution_windows: '1d_click,7d_click,1d_view,7d_view',
  action_breakdowns: 'action_type'
}
```

## トラブルシューティング

### 症状: actions フィールドが null または空配列
**原因:**
1. Pixelが設置されていない
2. アトリビューション設定が不適切
3. 実際にアクションが発生していない

**対策:**
1. Facebook Events Managerでイベントを確認
2. `use_unified_attribution_setting: true` を設定
3. Meta Ads Manager UIでデータを確認

### 症状: 一部のアクションタイプのみ取得できる
**原因:**
特定のアクションタイプがプラットフォーム固有

**対策:**
`breakdowns: 'publisher_platform'` を使用してプラットフォーム別にデータを取得

### 症状: コンバージョンデータは取得できるがエンゲージメントデータが取得できない
**原因:**
エンゲージメントイベントが適切に設定されていない

**対策:**
1. `action_breakdowns: 'action_type'` を追加
2. すべての利用可能なアクションタイプをログで確認

## 実装済みの改善点

1. **自動フォールバック**
   - actionsが取得できない場合でも、基本メトリクスから可能な限り情報を取得

2. **詳細なデバッグログ**
   - APIレスポンスの完全な内容をログ出力
   - 取得できたアクションタイプのリスト表示

3. **エラーメッセージの改善**
   - 具体的な原因と対策を表示
   - Meta Business Managerでの確認箇所を明示

## 今後の追加対策案

1. **リトライロジックの強化**
   - アトリビューション設定を変えて複数回試行

2. **代替データソースの活用**
   - Page Insights APIからエンゲージメントデータを取得
   - Instagram Graph APIの併用

3. **キャッシュ戦略の改善**
   - 取得成功したデータを長期間キャッシュ
   - 部分的なデータでも保存して活用