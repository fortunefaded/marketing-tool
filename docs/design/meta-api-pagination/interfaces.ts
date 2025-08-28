// Meta API 正しいデータ取得システム - TypeScript型定義

// ============================================================================
// Meta API Response Types
// ============================================================================

export interface MetaApiPaginationInfo {
  cursors: {
    before: string
    after: string
  }
  next?: string
  previous?: string
}

export interface MetaApiResponse<T> {
  data: T[]
  paging?: MetaApiPaginationInfo
}

export interface MetaAdInsight {
  ad_id: string
  ad_name: string
  campaign_id: string
  campaign_name: string
  adset_id: string
  adset_name: string
  date_start: string
  date_stop: string
  impressions: string
  clicks: string
  spend: string
  reach: string
  frequency: string
  ctr: string
  cpc: string
  cpm: string
  cpp: string
  actions?: MetaAction[]
  action_values?: MetaActionValue[]
}

export interface MetaAction {
  action_type: string
  value: string
}

export interface MetaActionValue {
  action_type: string
  value: string
}

// ============================================================================
// ページネーション処理関連の型定義
// ============================================================================

export interface PaginationConfig {
  maxPages?: number // 取得する最大ページ数 (未指定時は全ページ)
  retryAttempts?: number // リトライ回数 (デフォルト: 3)
  retryDelayMs?: number // リトライ間隔 (デフォルト: 1000ms)
}

export interface PaginationResult<T> {
  data: T[]
  totalPages: number
  totalItems: number
  isComplete: boolean // 全ページ取得完了フラグ
  deliveryAnalysis: DeliveryAnalysis
}

export interface DeliveryAnalysis {
  totalRequestedDays: number // 要求日数 (通常30日)
  actualDeliveryDays: number // 実際の配信日数
  deliveryRatio: number // 配信率 (actualDeliveryDays / totalRequestedDays)
  deliveryPattern: DeliveryPattern
  firstDeliveryDate?: string
  lastDeliveryDate?: string
}

export type DeliveryPattern =
  | 'continuous' // 連続配信 (指定期間すべてで配信)
  | 'partial' // 部分配信 (指定期間の一部で配信)
  | 'intermittent' // 断続配信 (配信日が断続的)
  | 'single' // 単日配信 (1日のみ配信)
  | 'none' // 未配信

// ============================================================================
// API Client関連の型定義
// ============================================================================

export interface FetchAdInsightsParams {
  fields: string[]
  time_range: {
    since: string
    until: string
  }
  time_increment?: string
  level: 'ad' | 'adset' | 'campaign' | 'account'
  limit?: number
}

export interface ApiClientResult<T> {
  success: boolean
  data?: T
  error?: ApiClientError
  metadata: ApiCallMetadata
}

export interface ApiClientError {
  code: string
  message: string
  type: 'network' | 'auth' | 'rate_limit' | 'api' | 'unknown'
  retryable: boolean
  originalError?: any
}

export interface ApiCallMetadata {
  totalApiCalls: number
  totalPages: number
  processingTimeMs: number
  rateLimitRemaining?: number
  lastCallTimestamp: number
}

// ============================================================================
// ログ出力関連の型定義
// ============================================================================

export interface PaginationLog {
  timestamp: number
  level: 'info' | 'warn' | 'error' | 'debug'
  message: string
  details?: {
    pageNumber?: number
    itemsInPage?: number
    totalItemsSoFar?: number
    apiCallCount?: number
    errorDetails?: any
  }
}

export interface DataRetrievalSummary {
  startTime: number
  endTime: number
  totalDurationMs: number
  totalApiCalls: number
  totalPages: number
  totalDataItems: number
  deliveryAnalysis: DeliveryAnalysis
  errors: ApiClientError[]
  wasSuccessful: boolean
  rateLimitHits: number
}

// ============================================================================
// UI表示関連の型定義
// ============================================================================

export interface DeliveryDisplayInfo {
  label: string // "X日/30日配信"
  pattern: DeliveryPattern
  ratioPercentage: number // 0-100
  statusColor: 'green' | 'yellow' | 'orange' | 'red' | 'gray'
  warningMessage?: string
}

export interface DataRetrievalStatus {
  isLoading: boolean
  currentPage?: number
  totalPages?: number
  itemsRetrieved: number
  estimatedCompletion?: number // UNIX timestamp
  lastError?: string
}

// ============================================================================
// Hook関連の型定義
// ============================================================================

export interface UseMetaInsightsOptions {
  paginationConfig?: PaginationConfig
  autoFetch?: boolean
  onProgress?: (status: DataRetrievalStatus) => void
  onComplete?: (summary: DataRetrievalSummary) => void
  onError?: (error: ApiClientError) => void
}

export interface UseMetaInsightsResult {
  data: MetaAdInsight[]
  deliveryInfo: DeliveryDisplayInfo
  status: DataRetrievalStatus
  summary?: DataRetrievalSummary
  refetch: (params?: FetchAdInsightsParams) => Promise<void>
  isLoading: boolean
  error?: ApiClientError
}

// ============================================================================
// ユーティリティ型
// ============================================================================

export type DateString = string // YYYY-MM-DD形式
export type ISODateString = string // ISO 8601形式

// ページネーション状態
export type PaginationState = 'idle' | 'fetching' | 'processing' | 'complete' | 'error'

// エラー重要度
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical'

// ============================================================================
// 設定とオプション
// ============================================================================

export interface ApiClientConfig {
  baseUrl: string
  apiVersion: string
  accessToken: string
  defaultTimeout: number
  rateLimitConfig: {
    maxCallsPerHour: number
    trackingWindowMs: number
  }
}

// ============================================================================
// レガシー互換性のための型定義
// ============================================================================

// 既存のコードとの互換性を保つための型エイリアス
export type AdInsight = MetaAdInsight
export type PaginatedResponse<T> = MetaApiResponse<T>

// ============================================================================
// 型ガード関数
// ============================================================================

export const isMetaApiResponse = <T>(obj: any): obj is MetaApiResponse<T> => {
  return obj && Array.isArray(obj.data)
}

export const hasNextPage = (response: MetaApiResponse<any>): boolean => {
  return !!response.paging?.next
}

export const isRetryableError = (error: ApiClientError): boolean => {
  return error.retryable && ['network', 'rate_limit', 'api'].includes(error.type)
}

// ============================================================================
// 定数定義
// ============================================================================

export const DEFAULT_PAGINATION_CONFIG: Required<PaginationConfig> = {
  maxPages: Infinity,
  retryAttempts: 3,
  retryDelayMs: 1000,
}

export const DELIVERY_PATTERN_LABELS: Record<DeliveryPattern, string> = {
  continuous: '連続配信',
  partial: '部分配信',
  intermittent: '断続配信',
  single: '単日配信',
  none: '未配信',
}

export const ERROR_TYPE_LABELS: Record<ApiClientError['type'], string> = {
  network: 'ネットワークエラー',
  auth: '認証エラー',
  rate_limit: 'レート制限',
  api: 'APIエラー',
  unknown: '不明なエラー',
}

// ============================================================================
// タイムライン機能の型定義（別ファイル参照）
// ============================================================================

// タイムライン関連の詳細な型定義は timeline-interfaces.ts を参照
export * from './timeline-interfaces'

// ============================================================================
// キャッシュ機能の型定義
// ============================================================================

export interface CacheLayerConfig {
  memory: MemoryCacheConfig
  localStorage: LocalStorageCacheConfig
  convex: ConvexCacheConfig
}

export interface MemoryCacheConfig {
  maxSize: number // 50MB
  ttl: number // 5分
  enabled: boolean
}

export interface LocalStorageCacheConfig {
  maxSize: number // 500MB
  ttl: Record<'realtime' | 'recent' | 'historical', number>
  enabled: boolean
  storageKey: string
}

export interface ConvexCacheConfig {
  ttl: Record<'realtime' | 'recent' | 'historical', number>
  enabled: boolean
  tableName: string
}

export interface CacheResult<T> {
  data?: T
  hit: boolean
  layer: 'memory' | 'localStorage' | 'convex' | 'miss'
  timestamp: number
  ttl: number
}

export interface CacheStatistics {
  hitRate: number
  apiCallsSaved: number
  storageUsage: {
    memory: number
    localStorage: number
    convex: number
  }
  performanceMetrics: {
    avgResponseTime: number
    cacheResponseTime: number
    apiResponseTime: number
  }
}
