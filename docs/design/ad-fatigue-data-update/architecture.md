# 広告疲労度データ更新機能 アーキテクチャ設計

## システム概要
広告疲労度ダッシュボードにおけるデータ更新機能を強化し、Meta APIからの最新データ取得、疲労度計算、リアルタイム表示更新を可能にする。現在のシステムに統合される形で実装し、既存のConvexバックエンドとReactフロントエンドの構成を活用する。

## アーキテクチャパターン
- **パターン**: Reactive Architecture with Command Pattern
- **理由**: データ更新はユーザーアクションによるコマンド実行であり、状態変更をリアクティブに伝播する必要がある。Convexのリアルタイム同期機能と相性が良い

## システム境界
### 対象範囲
- 広告疲労度ダッシュボード（`/ad-fatigue`ページ）のデータ更新機能
- Meta API連携によるデータ取得・同期処理
- 疲労度計算エンジンの最適化
- キャッシュ戦略とフォールバック機能

### 対象外
- 新規ダッシュボードの作成
- Meta API以外のデータソース統合
- ユーザー認証・認可システムの変更

## コンポーネント構成

### フロントエンド (React/TypeScript)
- **フレームワーク**: React 18 with TypeScript
- **状態管理**: 
  - ローカル状態: React useState/useEffect
  - リモート状態: Convex React Hooks
  - キャッシュ戦略: React Query (既存)
- **UI フレームワーク**: Tailwind CSS + Heroicons
- **コンポーネント**: 既存のFatigueDashboardを拡張

### バックエンド (Convex)
- **フレームワーク**: Convex (TypeScript)
- **データベース**: Convex Database (Document Store)
- **リアルタイム**: Convex Subscriptions
- **認証**: 既存のConvex Authシステム利用
- **API統合**: Meta Graph API via HTTP Actions

### 外部統合
- **Meta Marketing API**: Graph API v18.0
- **認証**: OAuth2 (App Access Token)
- **レート制限**: 200リクエスト/時間の遵守

## レイヤー構成

### 1. Presentation Layer (React Components)
```
FatigueDashboard
├── UpdateButton (改善)
├── DataSourceIndicator (新規)  
├── ProgressIndicator (改善)
├── ErrorAlert (改善)
└── StatCards (既存)
```

### 2. Application Layer (React Hooks)
```
useAdFatigue (改善)
├── useMetaApiFetcher (改善)
├── useConvexCache (改善)
├── useFatigueCalculator (改善)
└── useUpdateState (新規)
```

### 3. Domain Layer (Business Logic)
```
SimpleFatigueCalculator (改善)
├── CreativeFatigueAnalyzer
├── AudienceFatigueAnalyzer
└── AlgorithmFatigueAnalyzer
```

### 4. Infrastructure Layer (Convex Backend)
```
Meta API Service
├── TokenManager (暗号化保存)
├── RateLimiter (制限管理)
├── DataValidator (検証)
└── CacheManager (キャッシュ)
```

## データフロー アーキテクチャ

### 1. 更新トリガー
```
User Click → UpdateButton → useAdFatigue.refetch()
```

### 2. データ取得フロー
```
refetch() → useMetaApiFetcher → Convex Action → Meta API → Response Processing
```

### 3. 状態管理フロー
```
Loading State → UI Update → Data Processing → Success/Error State → Cache Update
```

## 品質属性の実現方法

### パフォーマンス (NFR-001, NFR-002)
- **30秒以内完了**: タイムアウト設定とプログレス表示
- **UI応答性**: 非同期処理とオプティミスティックUI
- **キャッシュ戦略**: Convex + React Query二層キャッシュ

### セキュリティ (NFR-101, NFR-102, NFR-103)
- **トークン保護**: Convex Databaseでの暗号化保存
- **HTTPS通信**: Meta API通信の強制HTTPS
- **情報漏洩防止**: エラーメッセージのサニタイズ

### 可用性 (NFR-301, NFR-302)
- **フォールバック**: API障害時のキャッシュデータ利用
- **部分失敗対応**: 取得できたデータのみ表示継続
- **エラー回復**: 自動再試行とマニュアル再実行

### ユーザビリティ (NFR-201, NFR-202, NFR-203)
- **直感的UI**: 明確な更新ボタンとフィードバック
- **進行状況**: スピナー+進捗テキスト表示
- **日本語対応**: すべてのメッセージを日本語で表示

## スケーラビリティ考慮

### 同時実行制御 (REQ-402, EDGE-201)
- **リクエスト制限**: 同一アカウントで最大1リクエスト
- **状態管理**: 実行中フラグによる重複防止
- **タブ間同期**: Convex Subscriptionsでの状態共有

### レート制限遵守 (REQ-401)
- **制限管理**: 200リクエスト/時間のトラッキング
- **待機機能**: 制限超過時の適切な待機
- **分散処理**: 大量データの分割取得

## 障害対応設計

### Meta API障害 (EDGE-001)
- **ヘルスチェック**: API可用性の事前確認
- **フォールバック**: キャッシュデータでの継続運用
- **通知**: ユーザーへの適切な状況説明

### ネットワーク障害 (REQ-104)
- **再試行**: 指数バックオフによる自動再試行
- **タイムアウト**: 30秒でのタイムアウト処理
- **ユーザー制御**: マニュアル再実行オプション

### データ整合性 (EDGE-004)
- **検証**: レスポンスデータの形式・内容検証
- **エラー処理**: 不正データの適切な処理
- **ログ**: 問題分析のための詳細ログ

## 技術的制約・依存関係

### 現在のシステム制約
- Convex Database Documentモデル
- 既存のMeta API統合基盤
- React 18 + TypeScriptコードベース
- Tailwind CSSデザインシステム

### 外部依存関係
- Meta Graph API v18.0の安定性
- Convexクラウドサービスの可用性
- ブラウザのJavaScript実行環境

## 移行・デプロイ戦略

### 段階的実装
1. **Phase 1**: コアロジックの改善（API、計算）
2. **Phase 2**: UI/UX改善（ボタン、表示）
3. **Phase 3**: エラーハンドリング強化
4. **Phase 4**: 統合テスト・最適化

### 後方互換性
- 既存のuseAdFatigueインターフェース保持
- 段階的な機能追加でリグレッション防止
- A/Bテストによる品質確認

## 監視・運用

### パフォーマンス監視
- データ更新完了時間の計測
- UI応答性の継続監視
- Meta APIレート制限の使用量追跡

### エラー監視
- API障害の検知・アラート
- ユーザーエラーの収集・分析
- システム異常の早期発見

### 品質メトリクス
- データ更新成功率: 95%以上
- ユーザー満足度: 4.0/5.0以上
- システム可用性: 99.9%以上