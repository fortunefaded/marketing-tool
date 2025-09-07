# API エンドポイント設計

## 概要

Meta API データ集約システムのAPIエンドポイント設計書。RESTful APIの原則に従い、Meta Marketing API v23.0とConvex APIを組み合わせた設計。

## API アーキテクチャ

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────┐
│  React Client   │────▶│  API Layer   │────▶│   Meta API  │
│   (Frontend)    │◀────│   (Backend)  │◀────│   (v23.0)   │
└─────────────────┘     └──────────────┘     └─────────────┘
                               │
                               ▼
                        ┌──────────────┐
                        │  Convex DB   │
                        └──────────────┘
```

## 1. Meta Marketing API エンドポイント

### 1.1 広告インサイト取得

#### GET /v23.0/{ad-account-id}/insights

広告アカウントレベルのインサイトデータを取得

**Request Parameters:**
```typescript
{
  // 必須パラメータ
  access_token: string        // アクセストークン
  
  // 時間範囲
  date_preset?: 'last_7d' | 'last_14d' | 'last_30d' | 'last_90d'
  time_range?: {
    since: string  // YYYY-MM-DD
    until: string  // YYYY-MM-DD
  }
  
  // フィールド選択
  fields: string[]  // ['impressions', 'clicks', 'spend', 'ctr', 'frequency', ...]
  
  // ブレークダウン
  breakdowns?: string[]  // ['publisher_platform', 'placement', 'device_platform']
  
  // 時間増分
  time_increment?: number | 'all_days' | 'monthly'  // 1 = daily
  
  // フィルタリング
  filtering?: Array<{
    field: string
    operator: string
    value: any
  }>
  
  // ページング
  limit?: number  // デフォルト: 25, 最大: 500
  after?: string  // カーソル
}
```

**Response:**
```typescript
{
  data: MetaApiInsight[]
  paging?: {
    cursors: {
      before: string
      after: string
    }
    next?: string
  }
  summary?: {
    // 集計値
  }
}
```

**Rate Limits:**
- 200 calls/hour per ad account
- 指数バックオフによる自動リトライ

### 1.2 広告クリエイティブ取得

#### GET /v23.0/{ad-id}/adcreatives

特定広告のクリエイティブ情報を取得

**Request Parameters:**
```typescript
{
  access_token: string
  fields: string[]  // ['name', 'object_type', 'thumbnail_url', 'video_url', 'image_url']
}
```

**Response:**
```typescript
{
  data: Array<{
    id: string
    name: string
    object_type: string  // 'VIDEO', 'IMAGE', 'CAROUSEL', etc.
    thumbnail_url?: string
    video_url?: string
    image_url?: string
    carousel_cards?: Array<{
      video_url?: string
      image_url?: string
    }>
  }>
}
```

### 1.3 キャンペーン階層取得

#### GET /v23.0/{ad-account-id}/campaigns

キャンペーン一覧取得

**Request Parameters:**
```typescript
{
  access_token: string
  fields: string[]  // ['id', 'name', 'status', 'objective']
  filtering?: Array<{
    field: 'effective_status'
    operator: 'IN'
    value: ['ACTIVE', 'PAUSED']
  }>
  limit?: number
}
```

## 2. Convex API エンドポイント

### 2.1 データ取得・保存

#### mutation: saveMetaInsights

Meta APIから取得したデータをConvexに保存

**Request:**
```typescript
{
  insights: MetaApiInsight[]
  accountId: string
  fetchTimestamp: string
  metadata?: {
    dateRange: { start: string, end: string }
    apiVersion: string
  }
}
```

**Response:**
```typescript
{
  success: boolean
  savedCount: number
  errors?: string[]
}
```

#### query: getAggregatedData

集約済みデータの取得

**Request:**
```typescript
{
  accountId: string
  dateRange?: {
    start: string
    end: string
  }
  adIds?: string[]
  includeDetails?: boolean
}
```

**Response:**
```typescript
{
  data: AdPerformanceData[]
  metadata: {
    totalRecords: number
    lastUpdated: string
    cacheHit: boolean
  }
}
```

### 2.2 疲労度分析

#### query: getFatigueAnalysis

疲労度分析データの取得

**Request:**
```typescript
{
  adId: string
  dateRange?: {
    start: string
    end: string
  }
  includePrediction?: boolean
}
```

**Response:**
```typescript
{
  timeline: FatigueTimeline[]
  currentStatus: {
    score: number
    status: FatigueStatus
    recommendation: string
  }
  prediction?: {
    nextDayScore: number
    confidence: number
  }
}
```

## 3. 内部API（React Hooks）

### 3.1 useMetaApiFetcher

Meta APIデータ取得用のカスタムフック

```typescript
interface UseMetaApiFetcherOptions {
  accountId: string
  datePreset?: DateRangePreset
  autoFetch?: boolean
  cacheEnabled?: boolean
}

interface UseMetaApiFetcherResult {
  insights: MetaApiInsight[]
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
  progress: {
    current: number
    total: number
    percentage: number
  }
}

const useMetaApiFetcher = (
  options: UseMetaApiFetcherOptions
): UseMetaApiFetcherResult
```

### 3.2 useAdFatigue

疲労度分析用のカスタムフック

```typescript
interface UseAdFatigueOptions {
  accountId: string
  dateRange?: DateRangePreset
  refreshInterval?: number
}

interface UseAdFatigueResult {
  data: AdPerformanceData[]
  insights: MetaApiInsight[]
  isLoading: boolean
  isRefreshing: boolean
  error: Error | null
  refetch: (options?: Partial<FetchOptions>) => Promise<void>
  dataSource: 'cache' | 'api' | null
  lastUpdateTime: Date | null
}

const useAdFatigue = (
  options: UseAdFatigueOptions
): UseAdFatigueResult
```

### 3.3 useDataAggregator

データ集約処理用のカスタムフック

```typescript
interface UseDataAggregatorResult {
  aggregate: (
    data: MetaApiInsight[], 
    options?: AggregationOptions
  ) => Promise<AggregationResult>
  isAggregating: boolean
  aggregationError: Error | null
  lastAggregationTime: number | null
}

const useDataAggregator = (): UseDataAggregatorResult
```

## 4. エラーハンドリング

### エラーコード体系

```typescript
enum ErrorCode {
  // Meta API エラー (1xxx)
  META_API_RATE_LIMIT = 1001,
  META_API_AUTH_FAILED = 1002,
  META_API_INVALID_PARAMS = 1003,
  META_API_TIMEOUT = 1004,
  
  // Convex エラー (2xxx)
  CONVEX_CONNECTION_FAILED = 2001,
  CONVEX_QUERY_FAILED = 2002,
  CONVEX_MUTATION_FAILED = 2003,
  
  // アプリケーションエラー (3xxx)
  DATA_VALIDATION_FAILED = 3001,
  AGGREGATION_FAILED = 3002,
  CACHE_CORRUPTED = 3003,
  MEMORY_LIMIT_EXCEEDED = 3004
}
```

### エラーレスポンス形式

```typescript
interface ErrorResponse {
  error: {
    code: ErrorCode
    message: string
    details?: any
    timestamp: string
    requestId?: string
  }
}
```

## 5. 認証・認可

### Meta API認証

OAuth 2.0フローによる認証

```typescript
// アクセストークン取得
POST https://graph.facebook.com/v23.0/oauth/access_token
{
  grant_type: 'authorization_code',
  client_id: FACEBOOK_APP_ID,
  client_secret: FACEBOOK_APP_SECRET,
  redirect_uri: REDIRECT_URI,
  code: AUTHORIZATION_CODE
}

// レスポンス
{
  access_token: string,
  token_type: 'bearer',
  expires_in: number
}
```

### Convex認証

Convexの組み込み認証システムを使用

```typescript
// Convex Auth設定
export default {
  providers: [
    {
      domain: process.env.CONVEX_DOMAIN,
      applicationID: process.env.CONVEX_APP_ID,
    }
  ]
}
```

## 6. キャッシュ戦略

### キャッシュヘッダー

```typescript
// レスポンスヘッダー
{
  'Cache-Control': 'private, max-age=3600',
  'ETag': '"686897696a7c8d9f"',
  'Last-Modified': 'Wed, 27 Aug 2025 09:00:00 GMT',
  'X-Cache-Status': 'HIT' | 'MISS' | 'BYPASS'
}
```

### キャッシュ無効化

```typescript
// 明示的なキャッシュクリア
POST /api/cache/invalidate
{
  accountId: string,
  cacheKeys?: string[],
  invalidateAll?: boolean
}
```

## 7. ページネーション

### カーソルベースページネーション

```typescript
// リクエスト
GET /api/insights?limit=100&after=cursor_xyz

// レスポンス
{
  data: [...],
  paging: {
    cursors: {
      before: 'cursor_abc',
      after: 'cursor_def'
    },
    next: '/api/insights?limit=100&after=cursor_def',
    previous: '/api/insights?limit=100&before=cursor_abc'
  },
  meta: {
    totalCount: 10000,
    hasMore: true
  }
}
```

## 8. バッチ処理

### バッチリクエスト

複数の広告IDを一度に処理

```typescript
POST /api/batch/insights
{
  requests: Array<{
    id: string
    method: 'GET'
    relative_url: string
    params?: object
  }>,
  parallel?: boolean,
  maxParallel?: number
}

// レスポンス
{
  responses: Array<{
    id: string
    status: number
    body: any
    error?: ErrorResponse
  }>
}
```

## 9. Webhook

### データ更新通知

```typescript
// Webhook設定
POST /api/webhooks
{
  url: 'https://your-domain.com/webhook',
  events: ['data.updated', 'fatigue.alert'],
  accountId: string
}

// Webhookペイロード
{
  event: 'data.updated',
  accountId: string,
  timestamp: string,
  data: {
    adIds: string[],
    dateRange: { start: string, end: string }
  }
}
```

## 10. モニタリング

### ヘルスチェック

```typescript
GET /api/health

// レスポンス
{
  status: 'healthy' | 'degraded' | 'unhealthy',
  services: {
    metaApi: 'up' | 'down',
    convex: 'up' | 'down',
    cache: 'up' | 'down'
  },
  metrics: {
    responseTime: number,
    activeConnections: number,
    memoryUsage: number
  }
}
```

### メトリクス

```typescript
GET /api/metrics

// レスポンス
{
  api: {
    requestsPerMinute: number,
    averageLatency: number,
    errorRate: number
  },
  cache: {
    hitRate: number,
    missRate: number,
    evictionRate: number
  },
  processing: {
    averageAggregationTime: number,
    queueLength: number
  }
}
```

---

作成日: 2025-08-27
バージョン: 1.0.0