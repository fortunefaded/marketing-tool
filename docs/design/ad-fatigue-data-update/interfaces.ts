// 広告疲労度データ更新機能 TypeScript インターフェース定義

// ============================================================================
// Core Types - 基本型定義
// ============================================================================

export type DataSource = 'cache' | 'api' | null

export type FatigueStatus = 'healthy' | 'warning' | 'critical'

export type UpdateState = 'idle' | 'loading' | 'success' | 'error'

export type ErrorCode = 
  | 'NO_TOKEN'
  | 'TOKEN_EXPIRED' 
  | 'INVALID_REQUEST'
  | 'NETWORK_ERROR'
  | 'RATE_LIMIT_EXCEEDED'
  | 'API_MAINTENANCE'
  | 'DATA_VALIDATION_ERROR'
  | 'CONCURRENT_UPDATE_ERROR'
  | 'TIMEOUT_ERROR'

// ============================================================================
// Meta API Types - Meta API関連型定義
// ============================================================================

export interface MetaAccount {
  accountId: string
  name: string
  currency: string
  status: 'active' | 'inactive'
  createdAt: string
}

export interface MetaInsights {
  adId: string
  campaignId: string
  adsetId: string
  accountId: string
  
  // Basic Metrics
  impressions: number
  clicks: number
  spend: number
  conversions: number
  
  // Rate Metrics
  ctr: number
  cpc: number
  cpm: number
  frequency: number
  
  // Instagram Specific Metrics
  profileViews?: number
  followerCount?: number
  engagements?: number
  reach?: number
  
  // Time Data
  dateStart: string
  dateStop: string
  updatedAt: string
}

export interface MetaApiError {
  code: number
  message: string
  type: string
  fbtrace_id?: string
}

export interface MetaApiResponse<T> {
  data: T[]
  error?: MetaApiError
  paging?: {
    cursors?: {
      before: string
      after: string
    }
    next?: string
  }
}

// ============================================================================
// Fatigue Calculation Types - 疲労度計算関連型定義  
// ============================================================================

export interface FatigueMetrics {
  // Creative Fatigue (クリエイティブ疲労度)
  baselineCtr: number
  currentCtr: number
  ctrDeclineRate: number
  
  // Audience Fatigue (オーディエンス疲労度)
  frequency: number
  firstTimeImpressionRatio: number
  audienceSaturation: number
  
  // Algorithm Fatigue (アルゴリズム疲労度)  
  baselineCpm: number
  currentCpm: number
  cpmIncreaseRate: number
  deliveryHealth: number
}

export interface FatigueScore {
  total: number                    // 総合スコア (0-100)
  breakdown: {
    creative: number              // クリエイティブ疲労度 (0-100)
    audience: number              // オーディエンス疲労度 (0-100)  
    algorithm: number             // アルゴリズム疲労度 (0-100)
  }
  primaryIssue: 'creative' | 'audience' | 'algorithm' | null
  status: FatigueStatus
}

export interface FatigueData {
  adId: string
  campaignName: string
  adName: string
  adType: 'image' | 'video' | 'carousel' | 'collection'
  
  // Fatigue Analysis
  score: FatigueScore
  metrics: FatigueMetrics
  
  // Raw Performance Data  
  insights: MetaInsights
  
  // Meta Information
  calculatedAt: string
  dataSource: DataSource
  
  // Status & Alerts
  status: FatigueStatus
  recommendations: string[]
  alerts: Array<{
    level: 'info' | 'warning' | 'critical'
    message: string
    action?: string
  }>
}

// ============================================================================
// Update State Management - 更新状態管理型定義
// ============================================================================

export interface UpdateProgress {
  phase: 'fetching' | 'processing' | 'calculating' | 'caching' | 'complete'
  message: string
  percentage: number
}

export interface UpdateOptions {
  forceRefresh?: boolean           // キャッシュを無視して強制更新
  includeHistorical?: boolean      // 履歴データも含めて取得
  timeout?: number                 // タイムアウト時間 (秒)
}

export interface UpdateResult {
  success: boolean
  data?: FatigueData[]
  dataSource: DataSource
  updatedAt: string
  metrics?: {
    duration: number               // 処理時間 (ミリ秒)
    recordCount: number           // 取得データ数
    errorCount: number            // エラー数
  }
  error?: UpdateError
}

export interface UpdateError {
  code: ErrorCode
  message: string
  details?: any
  recoverable: boolean             // 再試行可能か
  retryAfter?: number             // 再試行待機時間 (秒)
  
  // User Action
  userAction?: {
    label: string
    action: 'retry' | 'navigate' | 'refresh' | 'contact'
    href?: string
    onClick?: () => void
  }
}

// ============================================================================
// Hook Interfaces - React フック型定義  
// ============================================================================

export interface UseAdFatigueOptions {
  accountId: string
  autoRefresh?: boolean
  refreshInterval?: number         // 自動更新間隔 (分)
  enableCache?: boolean
}

export interface UseAdFatigueReturn {
  data: FatigueData[]
  isLoading: boolean
  error: UpdateError | null
  dataSource: DataSource
  
  // Update Control
  refetch: (options?: UpdateOptions) => Promise<UpdateResult>
  cancel: () => void
  
  // State Information
  progress?: UpdateProgress
  lastUpdated?: string
  canRetry: boolean
  isUpdating: boolean
}

export interface UseMetaApiFetcherReturn {
  fetchFromApi: (options?: UpdateOptions) => Promise<{
    data: FatigueData[] | null
    error: UpdateError | null
  }>
  isRateLimited: boolean
  remainingRequests: number
  resetTime?: string
}

export interface UseConvexCacheReturn {
  data: MetaInsights[] | null
  hasCache: boolean
  isStale: boolean
  cacheAge: number                 // キャッシュ経過時間 (分)
  error: Error | null
  
  // Cache Control
  invalidate: () => void
  refresh: () => Promise<void>
}

// ============================================================================
// Component Props - コンポーネントProps型定義
// ============================================================================

export interface UpdateButtonProps {
  onUpdate: (options?: UpdateOptions) => Promise<void>
  isLoading: boolean
  disabled?: boolean
  progress?: UpdateProgress
  error?: UpdateError | null
  
  // Styling
  className?: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'primary' | 'secondary'
}

export interface DataSourceIndicatorProps {
  dataSource: DataSource
  lastUpdated?: string
  cacheAge?: number
  isStale?: boolean
  
  // Display Options
  showDetails?: boolean
  compact?: boolean
  className?: string
}

export interface ProgressIndicatorProps {
  progress: UpdateProgress
  showPercentage?: boolean
  showMessage?: boolean
  className?: string
}

export interface ErrorAlertProps {
  error: UpdateError
  onRetry?: () => void
  onDismiss?: () => void
  
  // Display Options
  dismissible?: boolean
  showDetails?: boolean
  className?: string
}

export interface FatigueTableProps {
  data: FatigueData[]
  loading?: boolean
  error?: UpdateError | null
  
  // Table Options
  sortable?: boolean
  filterable?: boolean
  exportable?: boolean
  pageSize?: number
  
  // Event Handlers
  onRowClick?: (fatigueData: FatigueData) => void
  onSort?: (field: string, direction: 'asc' | 'desc') => void
  onFilter?: (filters: Record<string, any>) => void
}

// ============================================================================
// Cache & Storage Types - キャッシュ・ストレージ型定義
// ============================================================================

export interface CacheEntry<T> {
  data: T
  timestamp: string
  expiresAt: string
  version: string
  metadata?: {
    source: DataSource
    accountId: string
    requestOptions?: UpdateOptions
  }
}

export interface CacheConfig {
  ttl: number                      // Time To Live (分)
  maxSize: number                  // 最大エントリ数
  staleWhileRevalidate: boolean    // 期限切れデータの利用許可
  compression: boolean             // データ圧縮
}

export interface StorageManager {
  get<T>(key: string): Promise<CacheEntry<T> | null>
  set<T>(key: string, entry: CacheEntry<T>): Promise<void>
  delete(key: string): Promise<void>
  clear(): Promise<void>
  size(): Promise<number>
}

// ============================================================================
// Rate Limiting Types - レート制限型定義
// ============================================================================

export interface RateLimit {
  limit: number                    // 制限値 (リクエスト/時間)
  remaining: number               // 残りリクエスト数
  resetTime: string               // リセット時刻
  used: number                    // 使用済みリクエスト数
}

export interface RateLimitManager {
  checkLimit(accountId: string): Promise<RateLimit>
  consumeRequest(accountId: string): Promise<void>
  waitForReset(accountId: string): Promise<void>
  getRemainingTime(accountId: string): Promise<number>
}

// ============================================================================
// Validation Types - バリデーション型定義
// ============================================================================

export interface ValidationRule<T> {
  field: keyof T
  validator: (value: any) => boolean
  message: string
}

export interface ValidationResult {
  valid: boolean
  errors: Array<{
    field: string
    message: string
    value?: any
  }>
}

export interface DataValidator {
  validateInsights(data: any): ValidationResult
  validateAccount(data: any): ValidationResult
  sanitizeError(error: any): UpdateError
}

// ============================================================================
// Configuration Types - 設定型定義
// ============================================================================

export interface FatigueConfig {
  // Threshold Values
  thresholds: {
    creative: {
      ctrDeclineWarning: number    // CTR低下警告閾値 (%)
      ctrDeclineCritical: number   // CTR低下危険閾値 (%)
    }
    audience: {
      frequencyWarning: number     // Frequency警告閾値
      frequencyCritical: number    // Frequency危険閾値
    }
    algorithm: {
      cpmIncreaseWarning: number   // CPM上昇警告閾値 (%)
      cpmIncreaseCritical: number  // CPM上昇危険閾値 (%)
    }
  }
  
  // Calculation Parameters
  weights: {
    creative: number              // クリエイティブ疲労度の重み
    audience: number              // オーディエンス疲労度の重み  
    algorithm: number             // アルゴリズム疲労度の重み
  }
  
  // Data Settings
  dataRetention: number          // データ保持期間 (日)
  baselinePeriod: number         // ベースライン計算期間 (日)
}

export interface SystemConfig {
  // API Settings
  metaApi: {
    version: string
    timeout: number
    retryAttempts: number
    rateLimitBuffer: number
  }
  
  // Cache Settings  
  cache: CacheConfig
  
  // Feature Flags
  features: {
    autoRefresh: boolean
    advancedMetrics: boolean
    exportFeatures: boolean
    realtimeUpdates: boolean
  }
  
  // UI Settings
  ui: {
    theme: 'light' | 'dark' | 'auto'
    language: 'ja' | 'en'
    density: 'compact' | 'comfortable'
    animations: boolean
  }
}

// ============================================================================
// Event Types - イベント型定義
// ============================================================================

export interface UpdateStartEvent {
  type: 'update_start'
  accountId: string
  options?: UpdateOptions
  timestamp: string
}

export interface UpdateProgressEvent {
  type: 'update_progress'  
  accountId: string
  progress: UpdateProgress
  timestamp: string
}

export interface UpdateCompleteEvent {
  type: 'update_complete'
  accountId: string
  result: UpdateResult
  timestamp: string
}

export interface UpdateErrorEvent {
  type: 'update_error'
  accountId: string
  error: UpdateError
  timestamp: string
}

export type UpdateEvent = 
  | UpdateStartEvent 
  | UpdateProgressEvent 
  | UpdateCompleteEvent 
  | UpdateErrorEvent

// ============================================================================
// Utility Types - ユーティリティ型定義
// ============================================================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>

export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

export type AsyncReturnType<T extends (...args: any) => Promise<any>> = 
  T extends (...args: any) => Promise<infer R> ? R : never

// ============================================================================
// API Response Wrappers - APIレスポンス共通型
// ============================================================================

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: any
  }
  metadata?: {
    timestamp: string
    version: string
    requestId: string
  }
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination?: {
    page: number
    pageSize: number
    total: number
    hasMore: boolean
  }
}

// ============================================================================
// Type Guards - 型ガード関数型定義
// ============================================================================

export type TypeGuard<T> = (value: unknown) => value is T

export interface TypeGuards {
  isMetaInsights: TypeGuard<MetaInsights>
  isFatigueData: TypeGuard<FatigueData>
  isUpdateError: TypeGuard<UpdateError>
  isValidDataSource: TypeGuard<DataSource>
  isValidFatigueStatus: TypeGuard<FatigueStatus>
}