# Meta API コンバージョン計測の実装

## 対応済みの問題
- **API Version**: v23.0
- **主要な改善点**: 
  - 品質ランキング指標（quality_ranking, engagement_rate_ranking, conversion_rate_ranking）を追加
  - アトリビューション設定の統一（use_unified_attribution_setting: true）
  - 複数のアトリビューションウィンドウ対応（1d/7d/28d × click/view）
  - ビデオメトリクスの追加
  - 最適化目標とキャンペーン設定の取得

## 主要ファイル
- `src/services/metaApiService.ts` - getInsightsメソッドで全てのコンバージョン関連データを取得
- `src/utils/metaDataParser.ts` - コンバージョンデータの解析と集計

## 取得可能なメトリクス
### 基本メトリクス
- impressions, clicks, spend, reach, frequency
- cpm, cpc, ctr

### コンバージョン関連
- conversions（総コンバージョン数）
- conversion_values（コンバージョン価値）
- cost_per_conversion（CPA）
- purchase_roas, website_purchase_roas

### 品質指標（v23.0新機能）
- quality_ranking（品質ランキング）
- engagement_rate_ranking（エンゲージメント率ランキング）
- conversion_rate_ranking（コンバージョン率ランキング）

### アトリビューション設定
- 1日、7日、28日のクリック/ビューアトリビューション
- action_breakdowns: 'action_type'で詳細分析可能

## デバッグ方法
1. コンソールログで取得データを確認
2. parser_debugフィールドでパース処理の詳細を確認
3. actions_raw, action_values_rawで生データを確認

## 注意事項
- APIレート制限があるため、バッチサイズは25件に制限
- 日付範囲を指定しない場合は過去30日がデフォルト
- ランキング指標がない場合は'UNKNOWN'として処理