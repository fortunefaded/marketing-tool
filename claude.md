## 開発内容

## API VERSION
**必須：Meta Graph API v23.0を使用すること**

- APIバージョン: **v23.0** (固定)
- 下位互換性は保証されないため、必ずv23.0を指定
- APIエンドポイント例: `https://graph.facebook.com/v23.0/`

参考ドキュメント：
- https://developers.facebook.com/docs/graph-api/changelog/version23.0/
- https://developers.facebook.com/blog/post/2025/05/29/introducing-graph-api-v23-and-marketing-api-v23/

## 重要な制限事項
- **time_increment**パラメータと**breakdowns**パラメータは同時使用不可
- 疲労度分析においては、time_increment（日別データ）を優先する
- プラットフォーム別分析は必要に応じて別途実装を検討

### 開発対象
- 広告パフォーマンス管理ダッシュボード（BIツール）

### 主な機能・絶対達成するべき開発スコープ
- Meta広告, ecforceの数値を集約
- 画像・動画・テキストごとの成果を自動集計
- →metaのAPIで引っ張れる情報をキャンペーンとクリエイティブ単位で集計して表示させる
- ROAS／CPA／CVなどのKPIを横断表示
- APIまたはCSVでの自動データ取得
- 広告主・媒体・キャンペーン単位の成果比較が可能

## 開発・作業指針

### 🚨 重要: 変更前のコミット必須
- **破壊的変更を加える際は、その前に必ずgit commitする**
- ファイル削除、大幅なリファクタリング、実験的変更を行う前は必ずcommit
- 復元不可能な変更は絶対に避ける

### 📝 タスク完了時のコミット規則
- **各タスク（TASK-XXX）完了時に必ずコミットを作成する**
- コミットメッセージフォーマット:
  - `feat: TASK-XXX: [機能概要]` (新機能)
  - `fix: TASK-XXX: [バグ修正内容]` (バグ修正)
  - `refactor: TASK-XXX: [リファクタリング内容]` (改善)
  - `test: TASK-XXX: [テスト内容]` (テスト追加)
  - `docs: TASK-XXX: [ドキュメント更新]` (文書更新)
- コミットメッセージには以下を含める:
  - タスク番号（例: TASK-204）
  - 実装内容の簡潔な説明
  - TDD結果（例: 12/12テスト成功）
- 例:
  ```
  feat: TASK-204: マルチラインチャートコンポーネント実装
  
  - Rechartsベースのプラットフォーム別グラフ表示
  - Facebook/Instagram/Audience Network色分け対応
  - アクセシビリティ: 線種自動切り替え
  - TDD: 12/12テスト成功
  
  🤖 Generated with Claude Code
  Co-Authored-By: Claude <noreply@anthropic.com>
  ```

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