# 広告疲労度データ更新機能 設計書

## 概要

広告疲労度ダッシュボード（`/ad-fatigue`）のデータ更新ボタンを正しく機能させるための技術設計書です。Meta API連携の信頼性向上、エラーハンドリングの改善、ユーザビリティの向上を実現します。

## 設計文書構成

| ファイル | 説明 |
|----------|------|
| [architecture.md](./architecture.md) | システムアーキテクチャ設計 |
| [dataflow.md](./dataflow.md) | データフロー図とシーケンス |
| [interfaces.ts](./interfaces.ts) | TypeScript型定義 |
| [database-schema.sql](./database-schema.sql) | データベーススキーマ |
| [api-endpoints.md](./api-endpoints.md) | API仕様書 |

## 主要な改善点

### 1. 信頼性向上
- **同時実行制御**: アカウント毎に1つのリクエストのみ許可
- **タイムアウト管理**: 30秒でのタイムアウト設定
- **エラー復旧**: 自動再試行とフォールバック機能

### 2. パフォーマンス最適化
- **レート制限遵守**: Meta API 200req/hour制限の管理
- **キャッシュ戦略**: 二層キャッシュ（Convex + React Query）
- **バッチ処理**: 大量データの分割取得

### 3. ユーザビリティ改善
- **進行状況表示**: リアルタイムプログレス表示
- **エラーガイダンス**: 分かりやすいエラーメッセージと対処法
- **データソース表示**: キャッシュ/APIの明示

## 技術スタック

- **フロントエンド**: React 18 + TypeScript + Tailwind CSS
- **バックエンド**: Convex (Actions/Mutations)
- **状態管理**: React Hooks + Convex Subscriptions
- **外部API**: Meta Graph API v18.0
- **キャッシュ**: Convex Database + React Query

## 実装アプローチ

### Phase 1: コア機能改善
- Meta API fetcher の信頼性向上
- データ更新状態管理の改善
- 疲労度計算エンジンの最適化

### Phase 2: UI/UX強化
- 更新ボタンコンポーネントの改善
- プログレス表示の実装
- エラーアラートの改善

### Phase 3: 統合・最適化
- Convexキャッシュとの統合
- E2Eテストの実装
- パフォーマンス最適化

## 品質指標

### 機能品質
- データ更新成功率: 95%以上
- 30秒以内の処理完了: 100%
- エラー処理成功率: 100%

### ユーザビリティ
- 更新ボタン発見率: 100%（初回利用者）
- エラー解決率: 80%以上
- ユーザー満足度: 4.0/5.0以上

### 技術品質
- テストカバレッジ: 90%以上
- アクセシビリティ: WCAG AA準拠
- パフォーマンススコア: 95以上（Lighthouse）

## 次のステップ

設計書が承認されたら、[実装タスク](../tasks/ad-fatigue-data-update-tasks.md)に従って段階的に実装を進めます。各タスクはTDD（Test-Driven Development）アプローチで実行される予定です。