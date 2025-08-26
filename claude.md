## 開発内容

## API VERSION
https://developers.facebook.com/docs/graph-api/changelog/version23.0/
https://developers.facebook.com/blog/post/2025/05/29/introducing-graph-api-v23-and-marketing-api-v23/

### 開発対象
- 広告パフォーマンス管理ダッシュボード（BIツール）

### 主な機能・絶対達成するべき開発スコープ
- Meta広告, ecforceの数値を集約
- 画像・動画・テキストごとの成果を自動集計
- →metaのAPIで引っ張れる情報をキャンペーンとクリエイティブ単位で集計して表示させる
- ROAS／CPA／CVなどのKPIを横断表示
- APIまたはCSVでの自動データ取得
- 広告主・媒体・キャンペーン単位の成果比較が可能

## 基本的な指針

- ３つの「広告疲労度」を用いて総合的にスコアリングすることで、マーケターでなくとも広告効果を測定できるようにする
	- 指標①　クリエイティブの疲労
		- CTR低下率がベースラインから２５％を下回るなど、広告コンテンツ自体が陳腐化しているケース。
	- 指標②　視聴者側の疲労　
		- Frequencyが3.5を超えるなど、単一の視聴者に多く表示されすぎてしまっているケース
	- 指標③　Metaアルゴリズムによる疲労
		- CPM上昇率がベースラインから２０％を超えるなど、meta側が動画の露出を減らしているケース
- 「広告疲労度」は0-100でスコアリングされ、上記３つの項目を用いて「総合スコア」を動画クリエイティブ・効果測定を用意に可能にすることを目的とする。

## 基本指標

- 広告費用
- インプレッション(表示回数)
- Frequency（広告表示頻度）
	- **3.5**を超えると危険水準
- クリック数
- CTR（クリック率）
	- **ベースラインから25%以上**のCTR低下で危険水準
	- ctr, unique_ctr, inline_link_click_ctr
- CPC（クリック単価）
- CPM（1000インプレッション単価）
	- **20%以上上昇**かつ同時にCTRが低下していると危険水準

## Instagram特有のメトリクス

- Profile Visit Rate（プロフィール訪問率）
	- /insights`エンドポイントから`profile_views`
- Follow Rate（フォロー率）
	- **/insights`エンドポイントから`follower_count`
- Engagement Rate（エンゲージメント率）
	- （いいね＋コメント＋保存＋シェア）÷リーチ×100
	- 業界平均0.7%、Reelsでは1.23%が基準値(要検討)
- First Time Impression Ratio（初回インプレッション比率）
	- APIで取得不可だが、擬似的に実装できると嬉しい