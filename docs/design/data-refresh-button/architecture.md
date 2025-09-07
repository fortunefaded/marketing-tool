# データ更新ボタン アーキテクチャ設計

## システム概要

本設計は、広告パフォーマンス管理ダッシュボードにおけるデータ更新機能の不具合を解決するためのアーキテクチャを定義する。React/TypeScriptフロントエンド、Meta API統合、Convexバックエンドを含む既存システムの修正に焦点を当てる。

## アーキテクチャパターン

- **パターン**: Component-Based Architecture with Custom Hooks
- **理由**: 
  - Reactの標準的なパターンに準拠
  - ロジックとUIの分離による保守性向上
  - Custom Hooksによる再利用可能なロジックの実装
  - 既存コードベースとの整合性維持

## コンポーネント構成

### フロントエンド

- **フレームワーク**: React 18.x + TypeScript
- **状態管理**: 
  - Local State (useState, useCallback)
  - Custom Hooks (useAdFatigue, useMetaInsights)
  - Context API (Convex Provider)
- **UIコンポーネント構造**:
  ```
  FatigueDashboard
  └── FatigueDashboardContainer (Business Logic)
      └── FatigueDashboardPresentation (UI)
          ├── AccountSelector
          ├── DataRefreshButton (新規分離)
          └── DataDisplayComponents
  ```

### API統合層

- **Meta API Client**: SimpleMetaApi クラス
- **Token管理**: SimpleTokenStore
- **エラーハンドリング**: 統一的なエラーレスポンス処理
- **リトライ戦略**: 指数バックオフによる自動リトライ

### データ層

- **データベース**: Convex (リアルタイムデータベース)
- **キャッシュ戦略**: 
  - Convex内蔵キャッシュ機能
  - クライアントサイドでのデータ最適化
- **データフロー**: Meta API → Processing → Convex → UI

## エラーハンドリング戦略

### フロントエンド
- React Error Boundaries for component-level errors
- Try-catch blocks for async operations
- User-friendly error messages

### API層
- Standardized error response format
- Automatic retry for transient failures
- Detailed logging for debugging

### データ層
- Transaction-based operations
- Data validation before storage
- Rollback mechanisms for failures

## セキュリティ考慮事項

- Meta API トークンの安全な管理
- CORS設定の適切な構成
- XSS/CSRF対策の実装
- ログへの機密情報出力防止

## パフォーマンス最適化

- Debouncing for button clicks
- Memoization of expensive calculations
- Lazy loading of data components
- Batch API requests where possible

## モニタリング・デバッグ

- Structured logging with vibelogger
- Console debug outputs for development
- Performance metrics tracking
- Error tracking integration ready

## 依存関係

### 主要ライブラリ
- react: ^18.x
- convex: Latest stable
- typescript: ^5.x
- tailwindcss: For styling

### 内部モジュール
- @/types: Type definitions
- @/lib/vibelogger: Logging utility
- @/components/ui: UI components

## 技術的制約

- ブラウザ互換性: 最新2バージョンのChrome, Firefox, Safari, Edge
- React 18の並行機能（Concurrent Features）は使用しない
- Convexのリアルタイム機能に依存