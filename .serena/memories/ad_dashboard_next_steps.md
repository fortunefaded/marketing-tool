# 広告ダッシュボード - 次のフェーズ実装計画

## 現在の進捗状況

- ✅ Meta API基盤実装完了
- ✅ KPI計算ロジック実装
- ✅ UIコンポーネント基盤
- ✅ Convexスキーマ拡張
- 🔄 Meta APIクライアント強化中

## Phase 2: Google Ads統合（推奨）

### 1. Google Ads APIモジュール作成

```bash
# ディレクトリ構造
src/lib/google-ads/
├── types.ts          # Google Ads API型定義
├── client.ts         # APIクライアント
├── transform.ts      # データ変換
├── auth.ts          # OAuth認証
└── __tests__/
    ├── client.test.ts
    ├── transform.test.ts
    └── auth.test.ts
```

### 2. Google Ads データモデル

```typescript
// Convexスキーマ追加
googleCampaigns: defineTable({
  googleId: v.string(),
  customerId: v.string(),
  name: v.string(),
  type: v.union(v.literal('SEARCH'), v.literal('DISPLAY'), v.literal('VIDEO')),
  status: v.string(),
  budget: v.object({
    amount: v.number(),
    period: v.string()
  }),
  biddingStrategy: v.string(),
  metrics: v.object({
    impressions: v.number(),
    clicks: v.number(),
    conversions: v.number(),
    cost: v.number(),
    conversionValue: v.number()
  })
})

googleKeywords: defineTable({
  campaignId: v.string(),
  adGroupId: v.string(),
  keyword: v.string(),
  matchType: v.string(),
  qualityScore: v.optional(v.number()),
  metrics: v.object({...})
})
```

## Phase 3: ecforce統合

### 1. ecforce APIモジュール

```bash
src/lib/ecforce/
├── types.ts          # 注文・顧客データ型
├── client.ts         # APIクライアント
├── transform.ts      # データ変換
└── __tests__/
```

### 2. 売上データとの連携

- 注文データの取り込み
- 広告経由の売上追跡
- LTV計算機能

## Phase 4: 統合ダッシュボード強化

### 1. クロスチャネル分析

```typescript
// src/pages/CrossChannelDashboard.tsx
- Meta vs Google パフォーマンス比較
- 統合ROAS計算
- アトリビューション分析
```

### 2. 高度な機能実装

- **AIインサイト機能**
  - 異常値検知
  - トレンド予測
  - 最適化提案
- **自動レポート生成**
  - PDF/Excel出力
  - 定期レポート配信
  - カスタムテンプレート

### 3. リアルタイム機能

- WebSocket統合
- ライブダッシュボード
- アラート通知

## Phase 5: パフォーマンス最適化

### 1. データ処理最適化

- インデックス最適化
- キャッシング戦略
- バッチ処理効率化

### 2. UI/UX改善

- ローディング最適化
- インタラクティブチャート
- モバイル対応強化

## 実装優先順位

### 短期（1-2週間）

1. Google Ads API基本統合
2. クロスチャネル比較機能
3. CSVエクスポート機能

### 中期（3-4週間）

1. ecforce連携
2. 自動レポート機能
3. アトリビューション分析

### 長期（1-2ヶ月）

1. AI/ML機能
2. 予測分析
3. 最適化エンジン

## テスト戦略

### 統合テスト強化

```typescript
// src/__tests__/integration/
├── meta-google-sync.test.ts
├── cross-channel-metrics.test.ts
└── data-pipeline.test.ts
```

### E2Eテスト

```typescript
// cypress/e2e/
├── dashboard-flow.cy.ts
├── report-generation.cy.ts
└── data-sync.cy.ts
```

## 次のアクションアイテム

1. **Google Ads API設定**
   - Google Ads APIの認証情報取得
   - OAuth2.0フロー実装
   - テストアカウント準備

2. **ecforce API調査**
   - API仕様確認
   - 認証方式確認
   - データ構造マッピング

3. **パフォーマンステスト環境**
   - 大量データ生成スクリプト
   - 負荷テストツール設定
   - メトリクス監視設定
