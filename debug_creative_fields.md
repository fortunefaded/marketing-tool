# Meta API - クリエイティブ（広告）レベルで取得可能なフィールド

## 現在リクエストしているフィールド（MainDashboard.tsx line 416）

```
ad_id,
ad_name,
campaign_id,
campaign_name,
adset_id,
adset_name,
impressions,
clicks,
spend,
ctr,
cpm,
cpc,
frequency,
reach,
date_start,
date_stop,
conversions,
actions,
action_values,
unique_actions,
cost_per_action_type,
cost_per_unique_action_type,
website_purchase_roas,
purchase_roas
```

## 各フィールドの詳細

### 基本情報
- **ad_id**: 広告ID
- **ad_name**: 広告名（クリエイティブ名）
- **campaign_id**: キャンペーンID
- **campaign_name**: キャンペーン名
- **adset_id**: 広告セットID
- **adset_name**: 広告セット名

### パフォーマンス指標
- **impressions**: インプレッション数（表示回数）
- **clicks**: クリック数
- **spend**: 消化金額（広告費）
- **reach**: リーチ（ユニークユーザー数）
- **frequency**: フリークエンシー（平均表示頻度）

### 計算済み指標
- **ctr**: クリック率（clicks/impressions）
- **cpm**: 1000インプレッションあたりのコスト
- **cpc**: クリック単価

### 日付
- **date_start**: 期間開始日
- **date_stop**: 期間終了日

### コンバージョン関連
- **conversions**: コンバージョン数（総数）
- **actions**: アクション配列（購入、カートへの追加など）
  - action_type: アクションタイプ
  - value: アクション数
  - 1d_click: 1日クリックアトリビューション
  - 7d_click: 7日クリックアトリビューション
- **action_values**: アクションの価値（売上など）
- **unique_actions**: ユニークアクション（F-CV用）
- **cost_per_action_type**: アクションタイプ別のコスト
- **cost_per_unique_action_type**: ユニークアクション別のコスト

### ROAS関連
- **website_purchase_roas**: ウェブサイト購入ROAS
- **purchase_roas**: 購入ROAS

## 追加で取得可能な主要フィールド

### クリエイティブ詳細
- **effective_object_story_id**: ストーリーID
- **object_type**: オブジェクトタイプ（VIDEO, IMAGE, CAROUSEL等）
- **video_url**: 動画URL
- **thumbnail_url**: サムネイルURL
- **body**: 広告テキスト
- **title**: 広告タイトル
- **link_url**: リンク先URL

### エンゲージメント指標
- **unique_clicks**: ユニーククリック数
- **unique_ctr**: ユニーククリック率
- **engagement_rate**: エンゲージメント率
- **video_play_actions**: 動画再生アクション
- **video_p25_watched_actions**: 25%視聴
- **video_p50_watched_actions**: 50%視聴
- **video_p75_watched_actions**: 75%視聴
- **video_p100_watched_actions**: 100%視聴完了

### 品質スコア
- **quality_score_organic**: オーガニック品質スコア
- **quality_score_ectr**: 予想CTRスコア
- **quality_score_ecvr**: 予想CVRスコア

## 現在の問題と解決方法

### 問題点
1. データが`aggregateCreativesByName`で集約される際に、`metrics`オブジェクトが作成されていない
2. `reach`フィールドは取得しているが、集約時に含まれていない
3. `revenue`（売上）フィールドが不足している（action_valuesから取得可能）

### 解決方法
1. 集約時に全フィールドを適切にマッピングする
2. `metrics`オブジェクトを作成するか、直接フィールドとして持つ
3. `action_values`から`revenue`を計算する