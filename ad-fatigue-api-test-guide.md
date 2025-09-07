# Ad Fatigue API Integration Test Guide

## 実装完了内容

/ad-fatigue ページにAPI経由でデータを取得する機能を実装しました。/meta-dashboard の同期機能を参考に、以下の機能を追加しました：

### 主な実装内容:

1. **AdFatiguePageWithSync.tsx** - API同期機能付きページ
   - Meta APIサービスを使用したデータ同期
   - 同期ボタンでデータ取得
   - エラーハンドリングと読み込み状態の表示

2. **useAdFatigueAnalysis hook** - 実データの取得と変換
   - Convexからメタインサイトデータを取得
   - 疲労度分析用のデータ形式に変換

3. **FatigueDashboard** - 実データ対応
   - APIから取得したデータを表示
   - 疲労度スコアの計算と表示

## テスト手順:

1. **アプリケーションにアクセス**
   ```
   http://localhost:3002/ad-fatigue
   ```

2. **Meta アカウントの確認**
   - 設定ページでMetaアカウントが接続されていることを確認
   - アクティブなアカウントが選択されていることを確認

3. **データ同期の実行**
   - ページ上部の「データを同期」ボタンをクリック
   - 同期が完了するまで待機（ボタンが「同期中...」と表示）

4. **データの確認**
   - 同期完了後、広告が疲労度レベル別に表示されることを確認
   - 緊急対応が必要（赤）、要注意（黄）、健全（緑）のカテゴリーを確認

## 修正したTypeScriptエラー:

- useSyncSettingsConvex hookの引数修正
- MetaApiServiceのConvexClient型修正
- MockAdDataのcreative_type → type への変更
- CreativePhoneMockupのプロパティ修正
- 未使用変数のコメントアウト

## 注意事項:

- 初回同期時はデータがない場合があります
- 同期期間はsyncSettings.maxMonthsで設定（デフォルト30日）
- クリエイティブ情報も並行して取得されます

## 次のステップ:

1. 実際のMeta APIデータで動作確認
2. 疲労度スコアの精度調整
3. パフォーマンス最適化