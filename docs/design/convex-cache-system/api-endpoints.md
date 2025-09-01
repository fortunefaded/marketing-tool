# API エンドポイント仕様

## 概要

Convexベースキャッシュシステムは、Convex Functionsを使用してサーバーレスAPIを提供する。フロントエンドはConvexのReactive Queriesを通じてリアルタイムデータアクセスを行う。

## 認証

### Convex Authentication
```typescript
// セッション管理
import { ConvexAuth } from "@convex-dev/auth"

// Meta API トークン管理
interface AuthContext {
  userId: string
  accountId: string 
  permissions: string[]
}
```

---

## 📊 データ取得 API

### 1. 広告インサイトデータ取得

#### `api.cache.getInsights`
**Type**: Query (Real-time)
**Description**: 3層キャッシュシステムを通じた高速データ取得

**Parameters**:
```typescript
interface GetInsightsParams {
  accountId: string
  dateRange: DateRangePreset
  adIds?: string[]
  forceRefresh?: boolean
  includeAggregation?: boolean
}
```

**Response**:
```typescript
interface GetInsightsResponse {
  data: AdInsight[]
  metadata: {
    totalCount: number
    cacheHit: boolean
    dataSource: "memory" | "convex" | "api"
    lastUpdated: number
    freshness: DataFreshnessStatus
  }
  aggregation?: {
    totalImpressions: number
    totalClicks: number
    totalSpend: number
    averageCtr: number
    averageCpm: number
  }
}
```

**Usage Example**:
```typescript
// React Hook
const insights = useQuery(api.cache.getInsights, {
  accountId: "act_123456789",
  dateRange: "last_30d",
  includeAggregation: true
})

// データ取得とリアルタイム更新
if (insights) {
  console.log("Insights:", insights.data)
  console.log("Cache Hit:", insights.metadata.cacheHit)
  console.log("Data Source:", insights.metadata.dataSource)
}
```

---

### 2. 差分データ更新

#### `api.cache.requestDifferentialUpdate`
**Type**: Mutation
**Description**: 必要なデータのみを取得して更新

**Parameters**:
```typescript
interface DifferentialUpdateParams {
  accountId: string
  dateRange: DateRangePreset
  lastSyncTime?: number
  priority?: "low" | "normal" | "high"
}
```

**Response**:
```typescript
interface DifferentialUpdateResponse {
  success: boolean
  updatedDates: string[]
  apiCallsUsed: number
  processingTimeMs: number
  error?: string
}
```

**Usage Example**:
```typescript
// 手動での差分更新トリガー
const updateResult = await updateInsights({
  accountId: "act_123456789", 
  dateRange: "last_7d",
  priority: "high"
})

if (updateResult.success) {
  console.log(`Updated ${updateResult.updatedDates.length} days`)
  console.log(`Used ${updateResult.apiCallsUsed} API calls`)
}
```

---

### 3. 疲労度スコア取得

#### `api.fatigue.getScores`
**Type**: Query
**Description**: 計算済み疲労度スコアの取得

**Parameters**:
```typescript
interface GetFatigueScoresParams {
  accountId: string
  dateRange: DateRangePreset
  adIds?: string[]
  minScore?: number
  status?: FatigueStatus[]
}
```

**Response**:
```typescript
interface GetFatigueScoresResponse {
  scores: FatigueScore[]
  statistics: {
    totalAds: number
    healthyCount: number
    warningCount: number
    criticalCount: number
    averageScore: number
  }
  lastCalculated: number
}
```

---

## 🔄 データ管理 API

### 4. キャッシュクリア

#### `api.cache.clearCache`
**Type**: Mutation  
**Description**: 指定されたキャッシュレベルのデータクリア

**Parameters**:
```typescript
interface ClearCacheParams {
  accountId: string
  level: "memory" | "convex" | "all"
  dateRange?: DateRangePreset
  confirm: boolean
}
```

**Response**:
```typescript
interface ClearCacheResponse {
  success: boolean
  clearedEntries: number
  affectedDates: string[]
  nextRefreshTime: number
}
```

---

### 5. データ鮮度管理

#### `api.freshness.getStatus`
**Type**: Query
**Description**: データ鮮度状況の確認

**Parameters**:
```typescript
interface GetFreshnessStatusParams {
  accountId: string
  dateRange?: DateRangePreset
}
```

**Response**:
```typescript
interface GetFreshnessStatusResponse {
  dates: Array<{
    date: string
    status: DataFreshnessStatus
    lastUpdated: number
    nextUpdate: number
    apiCallsToday: number
  }>
  summary: {
    realtimeCount: number
    neartimeCount: number
    stabilizingCount: number
    finalizedCount: number
  }
}
```

---

### 6. 強制更新

#### `api.cache.forceUpdate`
**Type**: Mutation
**Description**: 指定されたデータの強制的なAPI再取得

**Parameters**:
```typescript
interface ForceUpdateParams {
  accountId: string
  dateRange: DateRangePreset
  ignoreRateLimit?: boolean
  reason: string
}
```

**Response**:
```typescript
interface ForceUpdateResponse {
  success: boolean
  updatedRecords: number
  apiCallsUsed: number
  warnings: string[]
  error?: string
}
```

---

## 📈 監視・統計 API

### 7. システム統計

#### `api.metrics.getSystemStats`
**Type**: Query
**Description**: システム全体のパフォーマンス統計

**Parameters**:
```typescript
interface GetSystemStatsParams {
  timeRange: "1h" | "6h" | "24h" | "7d"
  accountId?: string
}
```

**Response**:
```typescript
interface GetSystemStatsResponse {
  performance: {
    cacheHitRate: number
    apiCallReduction: number
    avgResponseTimeMs: number
    p95ResponseTimeMs: number
  }
  usage: {
    totalRequests: number
    totalApiCalls: number
    memoryUsageMb: number
    activeConnections: number
  }
  errors: {
    totalErrors: number
    errorRate: number
    criticalAlerts: number
  }
  timeSeriesData: Array<{
    timestamp: number
    cacheHitRate: number
    responseTime: number
    apiCalls: number
    errors: number
  }>
}
```

---

### 8. アカウント別統計

#### `api.metrics.getAccountStats`
**Type**: Query
**Description**: 特定アカウントのパフォーマンス統計

**Parameters**:
```typescript
interface GetAccountStatsParams {
  accountId: string
  timeRange: "1h" | "6h" | "24h" | "7d"
}
```

**Response**:
```typescript
interface GetAccountStatsResponse {
  accountInfo: {
    accountId: string
    accountName?: string
    isActive: boolean
    lastActivity: number
  }
  dataStats: {
    totalInsights: number
    dateRangeCovered: number
    completionRate: number
    lastFullUpdate: number
  }
  performance: {
    avgFetchTime: number
    cacheHitRate: number
    apiCallsToday: number
    errorRate: number
  }
  fatigue: {
    totalAdsTracked: number
    criticalAdsCount: number
    avgFatigueScore: number
    lastScoreUpdate: number
  }
}
```

---

## 🔧 管理・設定 API

### 9. システム設定

#### `api.system.getConfig`
**Type**: Query
**Description**: システム設定の取得

**Response**:
```typescript
interface SystemConfig {
  cache: {
    memoryLimitMb: number
    ttlMinutes: number
    cleanupIntervalMinutes: number
  }
  api: {
    rateLimitPerHour: number
    timeoutMs: number
    retryAttempts: number
  }
  updates: {
    realtimeIntervalHours: number
    neartimeIntervalHours: number
    stabilizingIntervalHours: number
  }
  features: {
    fatigueCalculationEnabled: boolean
    aggregationEnabled: boolean
    realTimeSync: boolean
  }
}
```

---

### 10. システム設定更新

#### `api.system.updateConfig`
**Type**: Mutation
**Description**: システム設定の更新

**Parameters**:
```typescript
interface UpdateConfigParams {
  section: "cache" | "api" | "updates" | "features"
  settings: Partial<SystemConfig[section]>
  reason: string
}
```

---

## 🚨 イベント・アラート API

### 11. システムイベント取得

#### `api.events.getSystemEvents`
**Type**: Query
**Description**: システムイベントログの取得

**Parameters**:
```typescript
interface GetSystemEventsParams {
  severity?: ("info" | "warning" | "error" | "critical")[]
  eventType?: string[]
  accountId?: string
  timeRange?: {
    start: number
    end: number
  }
  limit?: number
  offset?: number
}
```

**Response**:
```typescript
interface GetSystemEventsResponse {
  events: SystemEvent[]
  totalCount: number
  summary: {
    infoCount: number
    warningCount: number
    errorCount: number
    criticalCount: number
  }
  hasMore: boolean
  nextOffset: number
}
```

---

### 12. アラート作成

#### `api.events.createAlert`
**Type**: Mutation
**Description**: システムアラートの作成

**Parameters**:
```typescript
interface CreateAlertParams {
  title: string
  message: string
  severity: "info" | "warning" | "error" | "critical"
  accountId?: string
  metadata?: Record<string, any>
  requiresNotification?: boolean
}
```

---

## 📅 スケジューラー API

### 13. 定期ジョブ管理

#### `api.scheduler.getJobs`
**Type**: Query
**Description**: 定期実行ジョブの一覧取得

**Response**:
```typescript
interface ScheduledJobInfo {
  id: string
  name: string
  type: string
  status: "scheduled" | "running" | "completed" | "failed"
  nextRun: number
  lastRun?: number
  successCount: number
  failureCount: number
  isEnabled: boolean
}
```

---

### 14. ジョブ実行トリガー

#### `api.scheduler.triggerJob`
**Type**: Action
**Description**: 定期ジョブの手動実行

**Parameters**:
```typescript
interface TriggerJobParams {
  jobName: string
  parameters?: Record<string, any>
  priority?: "low" | "normal" | "high"
}
```

---

## 🔐 認証・トークン管理 API

### 15. Meta APIトークン管理

#### `api.auth.getTokenStatus`
**Type**: Query
**Description**: Meta APIトークンの状態確認

**Parameters**:
```typescript
interface GetTokenStatusParams {
  accountId: string
}
```

**Response**:
```typescript
interface TokenStatus {
  accountId: string
  isValid: boolean
  expiresAt: number
  lastUsed: number
  scopes: string[]
  usageCount: number
  errorCount: number
  needsRefresh: boolean
}
```

---

### 16. トークン更新

#### `api.auth.refreshToken`
**Type**: Mutation
**Description**: Meta APIトークンの更新

**Parameters**:
```typescript
interface RefreshTokenParams {
  accountId: string
  newAccessToken?: string
  newRefreshToken?: string
}
```

---

## 🧪 テスト・デバッグ API

### 17. キャッシュテスト

#### `api.debug.testCache`
**Type**: Action
**Description**: 3層キャッシュシステムのテスト

**Parameters**:
```typescript
interface TestCacheParams {
  accountId: string
  testType: "memory" | "convex" | "api" | "all"
  sampleSize?: number
}
```

**Response**:
```typescript
interface TestCacheResponse {
  results: {
    memoryTest?: { success: boolean; responseTime: number }
    convexTest?: { success: boolean; responseTime: number }
    apiTest?: { success: boolean; responseTime: number }
  }
  recommendations: string[]
  issues: string[]
}
```

---

### 18. API接続テスト

#### `api.debug.testMetaApi`
**Type**: Action
**Description**: Meta API接続とレスポンスのテスト

**Parameters**:
```typescript
interface TestMetaApiParams {
  accountId: string
  endpoint?: string
  sampleFields?: string[]
}
```

**Response**:
```typescript
interface TestMetaApiResponse {
  success: boolean
  responseTime: number
  rateLimitRemaining: number
  sampleData?: AdInsight[]
  error?: string
  recommendations: string[]
}
```

---

## エラーハンドリング

### 統一エラーレスポンス
```typescript
interface ConvexError {
  code: string
  message: string
  details?: Record<string, any>
  retryable: boolean
  retryAfter?: number
}
```

### エラーコード一覧
- `CACHE_MISS`: キャッシュミス
- `API_RATE_LIMIT`: Meta API レート制限
- `TOKEN_EXPIRED`: 認証トークン期限切れ
- `NETWORK_ERROR`: ネットワークエラー
- `DATA_CORRUPTION`: データ破損検出
- `SYSTEM_OVERLOAD`: システム過負荷
- `VALIDATION_ERROR`: パラメータ検証エラー

---

## リアルタイム同期

### Convex Reactive Queries の利用
```typescript
// 自動更新されるデータ
const liveInsights = useQuery(api.cache.getInsights, {
  accountId: "act_123456789",
  dateRange: "last_7d"
})

// データ変更時に自動で再レンダリング
useEffect(() => {
  if (liveInsights?.metadata.lastUpdated) {
    console.log("Data updated at:", new Date(liveInsights.metadata.lastUpdated))
  }
}, [liveInsights?.metadata.lastUpdated])
```

### WebSocket Events
Convexが内部的に処理するWebSocketイベント:
- `data.insights.updated`
- `cache.stats.changed`
- `system.alert.created`
- `fatigue.scores.recalculated`

---

## パフォーマンス最適化

### バッチリクエスト
```typescript
// 複数アカウントの並列取得
const multiAccountInsights = await Promise.all([
  convex.query(api.cache.getInsights, { accountId: "act_1", dateRange: "last_30d" }),
  convex.query(api.cache.getInsights, { accountId: "act_2", dateRange: "last_30d" }),
  convex.query(api.cache.getInsights, { accountId: "act_3", dateRange: "last_30d" })
])
```

### クエリ最適化
```typescript
// インデックスを活用した効率的なクエリ
const optimizedQuery = useQuery(api.cache.getInsightsByDateRange, {
  accountId: "act_123456789",
  startDate: "2024-01-01",
  endDate: "2024-01-31",
  includeMetadata: false  // 不要なデータを除外
})
```

このAPI設計により、要件で定義された全ての機能要件と非機能要件を満たし、高性能で信頼性の高いキャッシュシステムを実現する。