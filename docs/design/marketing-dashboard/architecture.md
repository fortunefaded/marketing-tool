# 広告パフォーマンス管理ダッシュボード アーキテクチャ設計

## システム概要
Meta広告とECForceのデータを統合し、広告疲労度分析機能を中心とした包括的なBIツール。
マーケターでなくとも広告効果を直感的に測定・分析できるダッシュボードシステム。

## アーキテクチャパターン
- パターン: Layered Architecture with Service Layer
- 理由: データ収集・加工・表示の明確な責務分離と、複数データソースの統合に適している

## システム構成

### フロントエンド (React/TypeScript)
- フレームワーク: React 18 with TypeScript
- 状態管理: Convex (リアルタイム同期) + React Query (キャッシュ)
- UI フレームワーク: Tailwind CSS + Heroicons
- ルーティング: React Router v6
- バンドラー: Vite

### バックエンド (Convex)
- フレームワーク: Convex (TypeScript)
- 認証方式: Convex Auth (OAuth2 対応)
- リアルタイム: Convex Subscriptions
- ファイルストレージ: Convex File Storage

### データ統合層
- Meta Marketing API: グラフAPI経由でキャンペーン・広告データ取得
- ECForce API: 売上・顧客データ取得
- CSVインポート: バッチデータ処理機能

### データベース
- Primary DB: Convex Database (Document Store)
- キャッシュ戦略: 
  - クライアントサイド: React Query (5分TTL)
  - サーバーサイド: Convex内部キャッシュ機能

## コンポーネント構成

### Core Components
1. **Dashboard Engine**
   - 統合ダッシュボード表示
   - リアルタイムメトリクス更新
   - カスタムウィジェット管理

2. **Ad Fatigue Analyzer**
   - 3つの疲労度指標計算
   - 総合スコアリング (0-100)
   - アラート生成

3. **Data Aggregator**
   - Meta API データ収集
   - ECForce データ統合
   - KPI計算エンジン

4. **Reporting Engine**
   - レポート生成・エクスポート
   - 自動化スケジューリング
   - 複数フォーマット対応 (CSV, Excel, PDF)

### データフロー
```
Meta API → Data Collector → Data Processor → Convex DB → Dashboard UI
ECForce ↗                                                        ↓
CSV Import ↗                                              Alert System
```

## セキュリティ考慮事項
- API トークン暗号化保存
- HTTPS 通信強制
- CORS 設定
- Rate Limiting
- ログ監査機能

## 性能要件
- 初回ロード: 3秒以内
- データ更新: リアルタイム (1秒以内)
- 同時接続: 100ユーザー対応
- データ保持: 24ヶ月