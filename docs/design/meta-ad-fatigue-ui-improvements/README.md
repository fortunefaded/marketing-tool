# Meta広告疲労度分析ダッシュボード UI/UX改善 - 技術設計書

## 概要

承認された要件定義書 [`docs/spec/meta-ad-fatigue-ui-improvements-requirements.md`](../../spec/meta-ad-fatigue-ui-improvements-requirements.md) に基づいて作成された包括的な技術設計文書です。

### 主要な改善内容
1. **集約機能の簡素化**: 「集約：ON」トグルボタンを廃止し、常に集約表示をデフォルト化
2. **媒体別グラフ表示**: 既存モーダル内のグラフを媒体別（Facebook/Instagram/Audience Network）の複数線表示に拡張
3. **データ整合性向上**: Meta Ads Managerとの数値一致率100%達成

## 設計文書構成

### 📋 [architecture.md](./architecture.md)
- システム全体のアーキテクチャ設計
- コンポーネント構成とレイヤー設計
- 技術仕様とパフォーマンス要件
- 実装戦略とリスク管理

**主要な設計決定:**
- レイヤードアーキテクチャ + コンポーネントベースUI
- 既存AdDataAggregatorの拡張活用
- React 18 + TypeScript + Recharts継続使用
- Convex Database + LocalStorage キャッシュ戦略

### 🔄 [dataflow.md](./dataflow.md)
- ユーザーインタラクションフローの可視化
- システム全体のデータフロー設計
- エラーハンドリングとキャッシュ管理フロー
- レスポンシブ対応とパフォーマンス最適化フロー

**主要なフロー:**
```
Raw Meta Insights → Enhanced AdDataAggregator → Platform Breakdown → Multi-line Chart → Interactive UI
```

### 🏗️ [interfaces.ts](./interfaces.ts)
- TypeScript型定義の完全仕様
- 媒体別データ構造の定義
- チャート表示用インターフェース
- エラーハンドリングと検証型

**主要な型定義:**
- `PlatformSpecificMetrics` - 媒体別データ形式
- `EnhancedAdPerformanceData` - 拡張パフォーマンスデータ
- `MultiLineChartData` - チャート表示用データ
- `DataConsistencyResult` - データ整合性チェック結果

### 🗄️ [database-schema.sql](./database-schema.sql)
- Convex Database拡張スキーマ
- 媒体別集約データテーブル設計
- データ整合性チェック機能
- パフォーマンス監視テーブル

**主要なテーブル:**
- `meta_insights_enhanced` - 既存テーブル拡張
- `platform_aggregated_metrics` - 媒体別集約データ
- `chart_configurations` - ユーザー設定保存
- `chart_error_logs` - エラー監視ログ

### 🔌 [api-endpoints.md](./api-endpoints.md)
- RESTful API + Convex Functions設計
- 媒体別データ取得エンドポイント
- チャート表示用データ変換API
- エラーハンドリングと設定管理API

**主要なエンドポイント:**
- `GET /api/meta/insights/enhanced` - 媒体別インサイト取得
- `GET /api/meta/insights/platform-timeseries` - 時系列データ取得
- `POST /api/convex/aggregate-platform-data` - データ集約処理
- `GET /api/chart/multi-line-data` - チャート用データ変換

## 要件との対応関係

### 機能要件対応
- **REQ-001~007**: 集約機能とデータ整合性 → `architecture.md`, `interfaces.ts`
- **REQ-101~103**: インタラクティブ機能 → `dataflow.md`, `api-endpoints.md`
- **REQ-201~202**: 初期化と状態管理 → `interfaces.ts`, `database-schema.sql`
- **REQ-301~303**: オプション機能 → `api-endpoints.md`

### 非機能要件対応
- **NFR-001~003**: パフォーマンス要件 → `architecture.md`, `database-schema.sql`
- **NFR-201~203**: ユーザビリティ・アクセシビリティ → `interfaces.ts`, `dataflow.md`
- **NFR-301~303**: 互換性要件 → 全設計文書で考慮
- **NFR-401~402**: データ整合性 → `database-schema.sql`, `api-endpoints.md`

### エッジケース対応
- **EDGE-001~003**: エラー処理 → `api-endpoints.md`, `interfaces.ts`
- **EDGE-101~103**: 境界値処理 → `dataflow.md`, `database-schema.sql`
- **EDGE-201~202**: レスポンシブ対応 → `interfaces.ts`, `dataflow.md`

## 実装フェーズ

### Phase 0: 事前準備 (1日)
```bash
# 既存テストスイート実行と基準値記録
npm test -- --coverage
npm run typecheck
npm run lint

# AdDataAggregatorの拡張ポイント確認
# 現在の集約機能の動作検証
```

### Phase 1: 集約機能簡素化 (1日・必須)
- [ ] トグルボタンUI削除
- [ ] 常時集約モードへの切り替え
- [ ] 既存機能への影響確認

**主要ファイル:**
- `src/features/meta-api/components/FatigueDashboard.tsx`
- `src/features/meta-api/core/ad-data-aggregator.ts`

### Phase 2: グラフ拡張 (3-4日・主要機能)
- [ ] AdDataAggregatorの媒体別対応拡張
- [ ] 媒体別チャートコンポーネント実装
- [ ] データ整合性チェック機能追加
- [ ] インタラクティブ凡例実装

**主要ファイル:**
- `src/features/meta-api/core/ad-data-aggregator.ts`
- `src/features/meta-api/components/CreativeDetailModal.tsx`
- `src/components/charts/` (新規チャートコンポーネント)

### Phase 3: 最適化 (オプション)
- [ ] パフォーマンスチューニング
- [ ] アクセシビリティ向上
- [ ] 追加機能（CSVエクスポート、ワンタイムメッセージ等）

## 技術仕様詳細

### カラーコード (REQ-005準拠)
```typescript
const PLATFORM_COLORS = {
  facebook: '#1877F2',           // 青
  instagram: '#E4405F',          // 紫/ピンク  
  audience_network: '#42B883',   // 緑
  messenger: '#00B2FF'           // ライトブルー
}
```

### アクセシビリティ (NFR-202準拠)
- **線の種類**: Facebook(実線)、Instagram(破線)、Audience Network(点線)
- **コントラスト**: WCAG 2.1 AAレベル準拠 (4.5:1以上)
- **ARIA属性**: スクリーンリーダー対応

### パフォーマンス目標
- グラフ描画時間: **1秒以内** (NFR-001)
- トグル操作応答: **500ms以内** (NFR-002)  
- ツールチップ表示: **200ms以内** (NFR-003)

## データ変換例

### 現在のデータ形式
```typescript
data: [{ date: '2024-01-01', value: 1000 }]
```

### 拡張後のデータ形式  
```typescript
data: [{ 
  date: '2024-01-01', 
  facebook: 600, 
  instagram: 350, 
  audience_network: 50,
  total: 1000,
  _metadata: {
    calculated_total: 1000,
    adjustment_applied: false
  }
}]
```

## 成功指標

### 定量指標
- [ ] 集約機能問い合わせ数: **50%減少**
- [ ] 媒体別分析時間: **30%短縮**
- [ ] Meta Ads Manager数値一致率: **100%達成**
- [ ] グラフ描画時間: **1秒以内達成**

### 定性指標
- [ ] ユーザー操作の直感性向上
- [ ] データ信頼性の向上
- [ ] 分析効率の改善
- [ ] モバイル対応の適切性

## 実装チェックリスト

### Phase 1: 集約機能簡素化
- [ ] `FatigueDashboard` コンポーネントからトグルボタン削除
- [ ] `enableAggregation` デフォルト値を `true` に固定
- [ ] 既存テストの更新
- [ ] UIテストの実行

### Phase 2: グラフ拡張
- [ ] `EnhancedAdPerformanceData` 型定義の実装
- [ ] `AdDataAggregator` の媒体別対応拡張
- [ ] `MultiLineChart` コンポーネント実装
- [ ] `PlatformLegend` コンポーネント実装
- [ ] データ整合性チェック機能実装
- [ ] ツールチップ機能実装

### Phase 3: 品質保証
- [ ] パフォーマンステスト実行
- [ ] アクセシビリティテスト実行
- [ ] 各ブラウザでの動作確認
- [ ] モバイル環境での動作確認
- [ ] エラーケースのテスト

## 参考資料

- [要件定義書](../../spec/meta-ad-fatigue-ui-improvements-requirements.md)
- [Meta Graph API v23.0 Documentation](https://developers.facebook.com/docs/graph-api/changelog/version23.0/)
- [Convex Database Documentation](https://docs.convex.dev/)
- [WCAG 2.1 Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Recharts Documentation](https://recharts.org/en-US/)

## 問い合わせ

設計に関する質問や実装中の課題については、プロジェクトのIssue管理システムを通じて報告してください。

---

**最終更新:** 2025-08-28  
**設計バージョン:** 1.0.0  
**対応要件:** meta-ad-fatigue-ui-improvements-requirements v1.0