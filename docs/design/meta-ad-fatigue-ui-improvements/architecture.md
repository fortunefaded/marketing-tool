# Meta広告疲労度分析ダッシュボード UI/UX改善 アーキテクチャ設計

## システム概要

Meta広告疲労度分析ダッシュボードにおいて、「集約：ON」トグルボタンを廃止し、常に集約表示をデフォルトにする。さらに、既存モーダル内のグラフを媒体別（Facebook/Instagram/Audience Network）の複数線表示に拡張し、Meta Ads Managerとの数値整合性を向上させる。

## アーキテクチャパターン

- **パターン**: レイヤードアーキテクチャ + コンポーネントベースUI
- **理由**: 
  - 既存のReactコンポーネント構造との互換性維持
  - データ集約ロジック（AdDataAggregator）の活用
  - UI表示層と集約ビジネスロジックの分離
  - 段階的な実装とテストが可能

## コンポーネント構成

### フロントエンド
- **フレームワーク**: React 18 + TypeScript
- **状態管理**: React Context + useState/useReducer
- **グラフライブラリ**: Recharts (既存継続使用)
- **スタイリング**: Tailwind CSS + shadcn/ui

### データ処理層
- **集約エンジン**: AdDataAggregator (既存拡張)
- **キャッシュ**: ConvexDataCache + LocalStorage
- **API Client**: Meta API Client (既存)

### データベース/ストレージ
- **メインDB**: Convex (既存)
- **キャッシュ**: ブラウザLocalStorage
- **外部API**: Meta Graph API v23.0

## システムレイヤー構成

```
┌─────────────────────────────────────────────┐
│                UI/UX Layer                  │
├─────────────────────────────────────────────┤
│    Enhanced Creative Detail Modal          │
│    ├─ Platform Charts (FB/IG/AN)           │
│    ├─ Interactive Legend                   │
│    └─ Metric Toggle Controls               │
│                                            │
│    Simplified Fatigue Dashboard            │
│    ├─ Always-Aggregated Data Display       │
│    └─ Removed Toggle Control               │
└─────────────────────────────────────────────┘
                       │
┌─────────────────────────────────────────────┐
│            Business Logic Layer             │
├─────────────────────────────────────────────┤
│    Enhanced AdDataAggregator                │
│    ├─ Platform-specific aggregation        │
│    ├─ Daily breakdown enhancement           │
│    └─ Data consistency validation          │
│                                            │
│    Chart Data Transformer                  │
│    ├─ Multi-line chart data prep           │
│    ├─ Platform color mapping               │
│    └─ Tooltip data formatting             │
└─────────────────────────────────────────────┘
                       │
┌─────────────────────────────────────────────┐
│              Data Access Layer              │
├─────────────────────────────────────────────┤
│    Convex Database                          │
│    ├─ metaInsights (existing)              │
│    ├─ Platform breakdown storage           │
│    └─ Aggregated metrics cache             │
│                                            │
│    Meta API Client (existing)              │
│    ├─ Publisher platform filtering        │
│    └─ Enhanced insight fields             │
└─────────────────────────────────────────────┘
```

## 主要コンポーネント設計

### 1. Enhanced Creative Detail Modal
```
EnhancedCreativeDetailModal/
├─ PlatformChartContainer
│  ├─ MultiLineChart (Recharts)
│  ├─ PlatformLegend 
│  └─ MetricToggleControls
├─ TooltipProvider
└─ DataValidationAlert
```

### 2. Simplified Fatigue Dashboard
```
FatigueDashboard/
├─ AlwaysAggregatedView
│  ├─ AggregatedMetricCards
│  ├─ FatigueScoreDisplay
│  └─ SimplifiedControls
└─ DataIntegrityIndicator
```

### 3. Enhanced Data Aggregator
```
AdDataAggregatorV2/
├─ PlatformAggregator
│  ├─ FacebookDataProcessor
│  ├─ InstagramDataProcessor
│  └─ AudienceNetworkProcessor
├─ DataConsistencyValidator
└─ ChartDataTransformer
```

## データフロー設計

### 現在のフロー
```
Raw Meta Insights → AdDataAggregator → UI Display
```

### 拡張後のフロー
```
Raw Meta Insights → Enhanced AdDataAggregator → Platform Breakdown → Multi-line Chart Data → UI Display
                                              → Daily Breakdown → Chart Time Series → Interactive UI
                                              → Data Validation → Consistency Check → Error Handling
```

## 技術仕様

### カラーコード (REQ-005準拠)
- Facebook: `#1877F2` (青)
- Instagram: `#E4405F` (紫/ピンク)  
- Audience Network: `#42B883` (緑)

### アクセシビリティ (NFR-202準拠)
- **線の種類**: Facebook(実線)、Instagram(破線)、Audience Network(点線)
- **コントラスト**: WCAG 2.1 AAレベル準拠
- **ARIA属性**: スクリーンリーダー対応

### パフォーマンス要件
- グラフ描画: 1秒以内 (NFR-001)
- トグル操作: 500ms以内 (NFR-002)
- ツールチップ: 200ms以内 (NFR-003)

## 実装戦略

### Phase 0: 事前準備 (1日)
- 既存AdDataAggregatorの拡張ポイント特定
- 現在のテストスイート実行・基準値記録
- データ構造変更影響範囲の確認

### Phase 1: 集約機能簡素化 (1日)
- トグルボタンUI削除
- 常時集約モードへの切り替え
- 既存機能への影響確認

### Phase 2: グラフ拡張 (3-4日)
- AdDataAggregatorの拡張
- 媒体別チャート機能実装
- データ整合性チェック追加

## リスク管理

### 既存システムへの影響
- **リスク**: AdDataAggregatorの変更による既存機能への影響
- **対策**: 下位互換性の維持、段階的展開

### パフォーマンス
- **リスク**: 媒体別データ処理による処理時間増加
- **対策**: メモ化、レイジーローディング、データキャッシュ

### データ整合性
- **リスク**: 媒体別合算値と全体値の不一致
- **対策**: 自動検証機能、丸め誤差処理(REQ-007)

## 成功指標

### 定量指標
- 集約機能問い合わせ数: 50%減少
- 媒体別分析時間: 30%短縮  
- Meta Ads Manager数値一致率: 100%達成
- グラフ描画時間: 1秒以内
- UI応答時間: 500ms以内

### 定性指標
- ユーザー操作の直感性向上
- データ信頼性の向上
- 分析効率の改善
- モバイル対応の適切性