# Google Ads API v21 仕様書

## APIバージョン情報

- **API Version**: v21 (2025年8月リリース)
- **エンドポイント**: `https://googleads.googleapis.com/v21/`
- **廃止バージョン**: v18 (2025年8月20日廃止済み)

## 認証

### OAuth 2.0
Google Ads APIはOAuth 2.0認証を使用します。

#### 必要なスコープ
```
https://www.googleapis.com/auth/adwords
```

#### 認証フロー
1. Google OAuth同意画面でユーザー認証
2. 認証コードを取得
3. 認証コードをアクセストークンに交換
4. アクセストークンを使用してAPIリクエスト

### 必要な認証情報
- **Client ID**: OAuth クライアントID
- **Client Secret**: OAuth クライアントシークレット
- **Developer Token**: Google Ads開発者トークン
- **Customer ID**: Google Ads顧客ID（ハイフンなし）
- **Login Customer ID**: MCC（マネージャー）アカウントID（オプション）

## Google Ads Query Language (GAQL)

### 基本構文
```sql
SELECT
  campaign.id,
  campaign.name,
  metrics.impressions,
  metrics.clicks,
  metrics.conversions,
  metrics.cost_micros
FROM campaign
WHERE segments.date DURING LAST_30_DAYS
  AND campaign.status = 'ENABLED'
ORDER BY metrics.impressions DESC
LIMIT 100
```

### 主要なリソース

#### Campaign（キャンペーン）
```sql
SELECT
  campaign.id,
  campaign.name,
  campaign.status,
  campaign.advertising_channel_type,
  campaign.advertising_channel_sub_type,
  campaign.bidding_strategy_type,
  campaign.budget.amount_micros,
  campaign.start_date,
  campaign.end_date
FROM campaign
```

#### Ad Group（広告グループ）
```sql
SELECT
  ad_group.id,
  ad_group.name,
  ad_group.status,
  ad_group.campaign,
  ad_group.type,
  ad_group.cpc_bid_micros,
  ad_group.cpm_bid_micros
FROM ad_group
```

#### Ad（広告）
```sql
SELECT
  ad_group_ad.ad.id,
  ad_group_ad.ad.name,
  ad_group_ad.ad.type,
  ad_group_ad.ad.final_urls,
  ad_group_ad.status,
  ad_group_ad.ad.responsive_search_ad.headlines,
  ad_group_ad.ad.responsive_search_ad.descriptions
FROM ad_group_ad
```

### メトリクス（metrics）

#### 基本メトリクス
- `metrics.impressions` - インプレッション数
- `metrics.clicks` - クリック数
- `metrics.cost_micros` - コスト（マイクロ単位、1,000,000で割って通貨単位に変換）
- `metrics.average_cpc` - 平均クリック単価
- `metrics.average_cpm` - 平均CPM（1000インプレッションあたりのコスト）
- `metrics.ctr` - クリック率（CTR）

#### コンバージョンメトリクス
- `metrics.conversions` - コンバージョン数
- `metrics.conversions_value` - コンバージョン価値
- `metrics.cost_per_conversion` - コンバージョン単価
- `metrics.conversion_rate` - コンバージョン率
- `metrics.all_conversions` - すべてのコンバージョン
- `metrics.all_conversions_value` - すべてのコンバージョンの価値

#### エンゲージメントメトリクス
- `metrics.engagement_rate` - エンゲージメント率
- `metrics.active_view_impressions` - アクティブビューインプレッション
- `metrics.active_view_viewability` - ビューアビリティ率

### セグメント（segments）

#### 日付セグメント
- `segments.date` - 日付
- `segments.hour` - 時間
- `segments.day_of_week` - 曜日
- `segments.week` - 週
- `segments.month` - 月
- `segments.quarter` - 四半期
- `segments.year` - 年

#### デバイスセグメント
- `segments.device` - デバイスタイプ（MOBILE, DESKTOP, TABLET, TV, OTHER）

#### ネットワークセグメント
- `segments.ad_network_type` - 広告ネットワークタイプ
  - SEARCH（検索ネットワーク）
  - CONTENT（ディスプレイネットワーク）
  - SEARCH_PARTNERS（検索パートナー）
  - YOUTUBE_SEARCH（YouTube検索）
  - YOUTUBE_WATCH（YouTube動画）

### 日付範囲の指定

#### プリセット期間
- `TODAY` - 今日
- `YESTERDAY` - 昨日
- `LAST_7_DAYS` - 過去7日間
- `LAST_14_DAYS` - 過去14日間
- `LAST_30_DAYS` - 過去30日間
- `THIS_MONTH` - 今月
- `LAST_MONTH` - 先月
- `ALL_TIME` - 全期間

#### カスタム期間
```sql
WHERE segments.date BETWEEN '2025-01-01' AND '2025-01-31'
```

## APIリクエスト例

### キャンペーンパフォーマンスレポート
```javascript
const query = `
  SELECT
    campaign.id,
    campaign.name,
    campaign.status,
    metrics.impressions,
    metrics.clicks,
    metrics.cost_micros,
    metrics.conversions,
    metrics.ctr,
    metrics.average_cpc,
    segments.date
  FROM campaign
  WHERE segments.date DURING LAST_30_DAYS
    AND campaign.status = 'ENABLED'
  ORDER BY metrics.cost_micros DESC
`;

const response = await googleAdsClient.query({
  customerId: 'YOUR_CUSTOMER_ID',
  query: query,
});
```

### 広告グループパフォーマンス
```javascript
const query = `
  SELECT
    ad_group.id,
    ad_group.name,
    ad_group.campaign,
    metrics.impressions,
    metrics.clicks,
    metrics.conversions,
    metrics.cost_micros,
    metrics.ctr,
    segments.date
  FROM ad_group
  WHERE segments.date DURING LAST_7_DAYS
  ORDER BY metrics.impressions DESC
  LIMIT 50
`;
```

### 検索語句レポート
```javascript
const query = `
  SELECT
    search_term_view.search_term,
    search_term_view.status,
    metrics.impressions,
    metrics.clicks,
    metrics.cost_micros,
    metrics.conversions,
    metrics.ctr
  FROM search_term_view
  WHERE segments.date DURING LAST_30_DAYS
  ORDER BY metrics.impressions DESC
  LIMIT 100
`;
```

## データの変換

### マイクロ単位の変換
Google Ads APIは金額をマイクロ単位で返します：
- 1円 = 1,000,000マイクロ
- 変換式: `実際の金額 = マイクロ値 / 1,000,000`

```javascript
const costInYen = costMicros / 1_000_000;
```

### パーセンテージの扱い
CTRやコンバージョン率などは小数で返されます：
- 0.05 = 5%
- 変換式: `パーセンテージ = 値 * 100`

```javascript
const ctrPercentage = ctr * 100;
```

## レート制限

### API制限
- **1日あたりのオペレーション数**: 15,000（ベーシックアクセス）
- **リクエストあたりの最大オペレーション数**: 5,000
- **同時接続数**: 最大100

### ベストプラクティス
1. バッチリクエストを使用して複数のオペレーションをまとめる
2. 必要なフィールドのみを選択
3. 適切なLIMIT句を使用
4. キャッシュを活用

## エラーハンドリング

### 一般的なエラー
- `AUTHENTICATION_ERROR` - 認証エラー
- `AUTHORIZATION_ERROR` - 認可エラー
- `QUOTA_ERROR` - クォータ超過
- `REQUEST_ERROR` - リクエスト形式エラー
- `INTERNAL_ERROR` - 内部エラー

### リトライ戦略
```javascript
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1秒

async function retryableRequest(fn, retries = MAX_RETRIES) {
  try {
    return await fn();
  } catch (error) {
    if (retries > 0 && isRetryableError(error)) {
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return retryableRequest(fn, retries - 1);
    }
    throw error;
  }
}
```

## 主要機能（v21）

### AI Max for Search
機械学習を活用した検索キャンペーンの自動最適化

### Performance Max透明性向上
- より詳細なパフォーマンスインサイト
- アセット別のレポート
- オーディエンスセグメントの可視性向上

### キャンペーンレベル検索語句ビュー
キャンペーン全体での検索語句パフォーマンスを確認

## 参考リンク

- [Google Ads API公式ドキュメント](https://developers.google.com/google-ads/api/docs/start)
- [Google Ads Query Language](https://developers.google.com/google-ads/api/docs/query/overview)
- [API移行ガイド](https://developers.google.com/google-ads/api/docs/migration)
- [レート制限とクォータ](https://developers.google.com/google-ads/api/docs/best-practices/quotas)