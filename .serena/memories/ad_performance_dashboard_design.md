# 広告パフォーマンス管理ダッシュボード設計書

## プロジェクト概要

Google広告・Meta広告・ecforceなどの広告データを統合し、横断的に分析可能なBIツール

## 技術アーキテクチャ

### フロントエンド

- **Framework**: React 19 + TypeScript
- **UI Library**: Tailwind CSS + shadcn/ui
- **Charts**: Recharts / Chart.js
- **State**: Zustand / TanStack Query
- **Routing**: React Router v6

### バックエンド

- **Database**: Convex (リアルタイム同期)
- **API Integration**:
  - Meta Marketing API
  - Google Ads API
  - ecforce API
- **Data Processing**: Node.js + TypeScript

### データパイプライン

```
[外部API] → [ETL処理] → [Convex DB] → [Dashboard UI]
   ↑                         ↓
[CSV Import] ←─────── [Export機能]
```

## 主要機能

### 1. データ統合

- **Meta広告データ**
  - キャンペーン単位の成果データ
  - クリエイティブ（画像/動画）単位の分析
  - アドセット/広告単位の詳細情報
- **Google広告データ**
  - キャンペーン/広告グループ/キーワード単位
  - 検索広告/ディスプレイ広告/動画広告の統合
- **ecforceデータ**
  - 売上/注文データ
  - 顧客LTV分析

### 2. KPI分析機能

- **主要指標**
  - ROAS（広告費用対効果）
  - CPA（顧客獲得単価）
  - CVR（コンバージョン率）
  - CTR（クリック率）
  - CPC（クリック単価）
- **比較分析**
  - 媒体間比較
  - 期間比較（前月比/前年同期比）
  - キャンペーン間比較
  - クリエイティブ別パフォーマンス

### 3. ビジュアライゼーション

- リアルタイムダッシュボード
- カスタマイズ可能なウィジェット
- ドリルダウン分析
- ヒートマップ表示

## データモデル

### Campaign（キャンペーン）

```typescript
interface Campaign {
  id: string
  name: string
  platform: 'meta' | 'google' | 'ecforce'
  status: 'active' | 'paused' | 'completed'
  budget: number
  spend: number
  startDate: Date
  endDate?: Date
  metrics: CampaignMetrics
}

interface CampaignMetrics {
  impressions: number
  clicks: number
  conversions: number
  revenue: number
  roas: number
  cpa: number
  ctr: number
  cvr: number
}
```

### Creative（クリエイティブ）

```typescript
interface Creative {
  id: string
  campaignId: string
  type: 'image' | 'video' | 'text' | 'carousel'
  url?: string
  thumbnailUrl?: string
  content?: string
  metrics: CreativeMetrics
  metadata: CreativeMetadata
}

interface CreativeMetrics extends CampaignMetrics {
  engagement: number
  viewRate?: number
  watchTime?: number
}
```

## TDD実装計画

### フェーズ1: 基盤構築（Week 1-2）

1. プロジェクトセットアップ
2. Convexスキーマ定義
3. 基本的なデータモデルのテスト作成
4. APIモックの準備

### フェーズ2: データ統合層（Week 3-4）

1. Meta API統合テスト
2. データ変換ロジックのテスト
3. Convexへのデータ保存テスト
4. エラーハンドリングテスト

### フェーズ3: UI実装（Week 5-6）

1. ダッシュボードコンポーネントテスト
2. チャート表示テスト
3. フィルタリング機能テスト
4. レスポンシブデザインテスト

### フェーズ4: 高度な機能（Week 7-8）

1. リアルタイム更新テスト
2. CSVエクスポート/インポートテスト
3. 権限管理テスト
4. パフォーマンス最適化

## テスト戦略

### ユニットテスト

- データ変換関数
- 計算ロジック（ROAS, CPA等）
- バリデーション
- ユーティリティ関数

### 統合テスト

- API連携
- データベース操作
- 認証フロー
- データパイプライン

### E2Eテスト

- ダッシュボード表示
- フィルタリング操作
- データエクスポート
- ユーザーフロー全体

## モックデータ設計

### Meta広告モック

```typescript
const mockMetaCampaign = {
  id: 'meta_001',
  name: 'Summer Sale 2024',
  objective: 'CONVERSIONS',
  status: 'ACTIVE',
  daily_budget: 10000,
  insights: {
    impressions: 150000,
    clicks: 3000,
    conversions: 150,
    spend: 45000,
    revenue: 225000,
  },
}
```

### Google広告モック

```typescript
const mockGoogleCampaign = {
  id: 'google_001',
  name: 'Brand Search Campaign',
  type: 'SEARCH',
  status: 'ENABLED',
  budget: {
    amount: 50000,
    period: 'DAILY',
  },
  metrics: {
    impressions: 200000,
    clicks: 8000,
    conversions: 400,
    cost: 120000,
    conversionValue: 600000,
  },
}
```

## API設計

### RESTful エンドポイント

```
GET /api/campaigns
GET /api/campaigns/:id
GET /api/campaigns/:id/creatives
GET /api/metrics/summary
POST /api/data/sync
POST /api/export/csv
```

### Convex Functions

```typescript
// convex/campaigns.ts
export const listCampaigns = query({...})
export const getCampaignMetrics = query({...})
export const syncCampaignData = mutation({...})

// convex/creatives.ts
export const listCreatives = query({...})
export const getCreativePerformance = query({...})

// convex/analytics.ts
export const calculateROAS = query({...})
export const comparePerformance = query({...})
```
