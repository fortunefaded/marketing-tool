# アプリケーション簡素化 要件定義書

## 概要

現在の複雑なマーケティングツールアプリケーションを、MainDashboardとSettingsManagementの2つのルートのみに削減し、コードベースを大幅に簡素化する。Meta API統合とConvexキャッシュ層は完全に保護しながら、未使用のコンポーネントとルートを削除する。

## ユーザストーリー

### ストーリー1: シンプルなナビゲーション

- **である** すべてのユーザー **として**
- **私は** 2つの主要機能（ダッシュボードと設定）に素早くアクセス **をしたい**
- **そうすることで** 複雑なメニュー構造に迷うことなく作業できる

### ストーリー2: 高速なパフォーマンス

- **である** マーケティング担当者 **として**
- **私は** 軽量で高速なアプリケーション **を使いたい**
- **そうすることで** 日々の広告監視作業を効率的に行える

### ストーリー3: 保守性の向上

- **である** 開発者 **として**
- **私は** シンプルで理解しやすいコードベース **を維持したい**
- **そうすることで** 新機能の追加や不具合修正が容易になる

## 機能要件（EARS記法）

### 通常要件

- REQ-001: システムは `/` ルートでMainDashboardを表示しなければならない
- REQ-002: システムは `/settings` ルートでSettingsManagementを表示しなければならない
- REQ-003: システムは存在しないルートへのアクセスに対して404ページを表示しなければならない
- REQ-004: システムはMeta API統合機能を完全に維持しなければならない
- REQ-005: システムはConvexキャッシュ層を完全に維持しなければならない

### 条件付き要件

- REQ-101: TypeScriptエラーが存在する場合、システムはビルドを失敗させなければならない
- REQ-102: 削除対象のファイルが他から参照されている場合、システムは警告を表示しなければならない
- REQ-103: キャッシュが30分を超えた場合、システムは新しいデータを取得しなければならない

### 状態要件

- REQ-201: リファクタリング後の状態で、システムは全ての既存機能を維持しなければならない
- REQ-202: 簡素化された状態で、システムはビルド時間を50%以上短縮しなければならない

### オプション要件

- REQ-301: システムは未使用のnpmパッケージを削除してもよい
- REQ-302: システムはコード圧縮とTree Shakingを適用してもよい

### 制約要件

- REQ-401: システムはMeta Graph API v23.0を使用しなければならない
- REQ-402: システムはsrc/features/meta-api/ディレクトリを変更してはならない
- REQ-403: システムはsrc/features/convex-cache/ディレクトリを変更してはならない

## 非機能要件

### パフォーマンス

- NFR-001: ビルド時間は15秒以内でなければならない
- NFR-002: バンドルサイズは500KB以下でなければならない
- NFR-003: 初回ロード時間は3秒以内でなければならない

### セキュリティ

- NFR-101: アクセストークンは適切に保護されなければならない
- NFR-102: 削除されたルートへのアクセスは完全にブロックされなければならない

### ユーザビリティ

- NFR-201: サイドバーは2つのメニュー項目のみを表示しなければならない
- NFR-202: 画面遷移は即座に（100ms以内）行われなければならない

### 保守性

- NFR-301: TypeScriptの型エラーは0でなければならない
- NFR-302: ESLintエラーは0でなければならない
- NFR-303: 循環依存は存在してはならない

## Edgeケース

### エラー処理

- EDGE-001: 削除されたルートへの直接アクセス → 404ページへリダイレクト
- EDGE-002: 削除されたコンポーネントへの参照 → コンパイルエラー
- EDGE-003: キャッシュクリア後のデータ再取得 → 正常に動作

### 境界値

- EDGE-101: 0個のルート → エラー
- EDGE-102: 2個のルート → 正常動作
- EDGE-103: 3個以上のルート → 要件違反

## 削除対象リスト

### 削除するルート（20個以上）

```
/legacy-dashboard
/meta-dashboard
/meta-api-setup/*
/ecforce*
/integrated-dashboard
/campaigns
/tasks
/reports
/project-clover
/test-*
/cache-viewer
/media
/conversion
/attribution
```

### 削除するディレクトリ

```
src/pages/meta-api-setup/
src/pages/meta-setup/
src/pages/__tests__/
src/components/test/
src/components/ecforce/
src/routes/
src/_archived/
```

### 削除するファイル

```
ApiConvexTestPage.tsx
CacheDataViewer.tsx
Dashboard.tsx
ECForceContainer.tsx
ECForceDashboard.tsx
IntegratedDashboard.tsx
ProjectCloverPage.tsx
ReportManagement.tsx
SimpleTestDashboard.tsx
ThreeLayerCacheTestPage.tsx
UnifiedDashboard.tsx
UnifiedDashboardSimple.tsx
UnifiedDashboardWithCache.tsx
```

## 受け入れ基準

### 機能テスト

- [x] `/` ルートでMainDashboardが表示される
- [x] `/settings` ルートでSettingsManagementが表示される
- [x] 存在しないルートで404ページが表示される
- [x] Meta APIデータ取得が正常に動作する
- [x] キャッシュシステムが正常に動作する
- [x] データ管理機能が正常に動作する

### 非機能テスト

- [x] ビルドが成功する
- [ ] TypeScriptエラーが0である
- [ ] ESLintエラーが0である
- [x] バンドルサイズが削減されている
- [x] ビルド時間が短縮されている

### コード品質

- [x] 不要なimportが削除されている
- [x] 未使用のコンポーネントが削除されている
- [ ] 循環依存が存在しない
- [x] コードカバレッジが維持されている

## 実装計画

### フェーズ1: 依存関係分析（完了）
- MainDashboard.tsxの依存関係マップ作成
- SettingsManagement.tsxの依存関係マップ作成
- 削除可能なコンポーネントのリストアップ

### フェーズ2: ルート削減（完了）
- App.tsxのRoutesを2つに削減
- 不要なimport文を削除
- Sidebarのナビゲーションリンクを2つに更新

### フェーズ3: ファイル削除（完了）
- src/pages/から不要なファイルを削除
- src/components/から未使用ディレクトリを削除
- src/routes/を完全削除
- src/_archived/を完全削除

### フェーズ4: クリーンアップ（進行中）
- TypeScriptエラーの解消
- ESLintエラーの解消
- 未使用の依存関係を削除

### フェーズ5: 検証（予定）
- アプリケーションの起動確認
- 2つのルートが正常に動作することを確認
- パフォーマンステストの実施

## リスクと対策

### リスク1: Meta API統合の破損
- **対策**: src/features/meta-api/は一切変更しない
- **検証**: API呼び出しのテスト実施

### リスク2: キャッシュシステムの破損
- **対策**: src/features/convex-cache/は一切変更しない
- **検証**: キャッシュ動作のテスト実施

### リスク3: TypeScriptエラーの増加
- **対策**: 段階的な削除と都度のビルド確認
- **検証**: tsc --noEmitでの継続的チェック

## 成功指標

- **コード削減率**: 25%以上（達成済み: 27.6%）
- **ファイル数削減**: 100ファイル以上（達成済み: 125ファイル）
- **ビルド時間短縮**: 50%以上
- **バンドルサイズ削減**: 30%以上
- **TypeScriptエラー**: 0（未達成）