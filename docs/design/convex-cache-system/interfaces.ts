/**
 * Convexベースキャッシュシステム TypeScript型定義
 *
 * このファイルはシステム全体で使用される型定義を含む
 * フロントエンド、Convex、外部API間の型安全性を保証する
 */

// =============================================================================
// Core Entity Types
// =============================================================================

/**
 * 広告インサイトデータの基本構造
 * Meta Graph API v23.0の仕様に準拠
 */
export interface AdInsight {
  // 基本識別子
  ad_id: string
  account_id: string
  campaign_id: string
  adset_id: string

  // 日付情報
  date_start: string // YYYY-MM-DD format
  date_stop: string // YYYY-MM-DD format

  // パフォーマンスメトリクス
  impressions: number
  clicks: number
  spend: number
  reach: number
  frequency: number

  // CTR関連メトリクス
  ctr: number
  unique_ctr: number
  inline_link_click_ctr: number

  // CPM/CPC関連メトリクス
  cpm: number
  cpc: number
  cpp: number

  // コンバージョンメトリクス
  actions?: Action[]
  conversion_values?: ConversionValue[]

  // Instagram特有メトリクス
  video_play_curve_actions?: VideoPlayAction[]
  video_avg_time_watched_actions?: VideoTimeAction[]

  // メタデータ
  created_time?: string
  updated_time?: string
}

/**
 * Meta API アクション定義
 */
export interface Action {
  action_type: string
  value: number
  '1d_click'?: number
  '1d_view'?: number
  '7d_click'?: number
  '7d_view'?: number
  '28d_click'?: number
  '28d_view'?: number
}

/**
 * コンバージョン値定義
 */
export interface ConversionValue {
  action_type: string
  value: number
  '1d_click'?: number
  '1d_view'?: number
  '7d_click'?: number
  '7d_view'?: number
  '28d_click'?: number
  '28d_view'?: number
}

/**
 * 動画再生アクション
 */
export interface VideoPlayAction {
  action_type: string
  value: number
}

/**
 * 動画視聴時間アクション
 */
export interface VideoTimeAction {
  action_type: string
  value: number
}

// =============================================================================
// Cache System Types
// =============================================================================

/**
 * データ鮮度状態の定義
 */
export type DataFreshnessStatus =
  | 'realtime' // 当日データ（3時間毎更新）
  | 'neartime' // 1-2日前（6時間毎更新）
  | 'stabilizing' // 2-3日前（24時間毎更新）
  | 'finalized' // 3日以上前（更新不要）

/**
 * キャッシュエントリの構造
 */
export interface CacheEntry {
  // データ識別
  id: string
  account_id: string
  date_range: string
  cache_key: string

  // データ本体
  data: AdInsight[]

  // メタデータ
  created_at: Date
  updated_at: Date
  expires_at: Date
  data_freshness: DataFreshnessStatus

  // 品質管理
  checksum: string
  record_count: number
  is_complete: boolean

  // 更新管理
  last_verified: Date
  update_priority: number
  next_update_at?: Date
}

/**
 * 3層キャッシュの統合インターフェース
 */
export interface ThreeLayerCache {
  // L1: メモリキャッシュ
  memory: {
    get: (key: string) => CacheEntry | null
    set: (key: string, entry: CacheEntry) => void
    delete: (key: string) => boolean
    clear: () => void
    size: () => number
  }

  // L2: Convex永続化キャッシュ
  convex: {
    get: (key: string) => Promise<CacheEntry | null>
    set: (key: string, entry: CacheEntry) => Promise<void>
    delete: (key: string) => Promise<boolean>
    query: (filter: CacheFilter) => Promise<CacheEntry[]>
  }

  // L3: Meta API
  metaApi: {
    fetch: (params: MetaApiParams) => Promise<AdInsight[]>
    fetchDifferential: (params: DifferentialParams) => Promise<AdInsight[]>
  }
}

// =============================================================================
// API Request/Response Types
// =============================================================================

/**
 * Meta API リクエストパラメータ
 */
export interface MetaApiParams {
  account_id: string
  date_preset?: DateRangePreset
  time_range?: TimeRange
  fields: string[]
  limit?: number
  after?: string
  level: 'account' | 'campaign' | 'adset' | 'ad'
  filtering?: ApiFilter[]
  breakdowns?: string[]
  time_increment?: '1' | 'monthly' | 'all_days'
}

/**
 * 差分取得パラメータ
 */
export interface DifferentialParams extends MetaApiParams {
  last_sync: Date
  required_dates: string[] // YYYY-MM-DD format
  skip_finalized: boolean
}

/**
 * 日付範囲プリセット
 */
export type DateRangePreset =
  | 'today'
  | 'yesterday'
  | 'this_week'
  | 'last_week'
  | 'last_7d'
  | 'last_14d'
  | 'last_30d'
  | 'last_90d'
  | 'this_month'
  | 'last_month'
  | 'this_quarter'
  | 'last_quarter'

/**
 * カスタム時間範囲
 */
export interface TimeRange {
  since: string // YYYY-MM-DD
  until: string // YYYY-MM-DD
}

/**
 * APIフィルター
 */
export interface ApiFilter {
  field: string
  operator: 'EQUAL' | 'NOT_EQUAL' | 'GREATER_THAN' | 'LESS_THAN' | 'CONTAIN' | 'IN'
  value: string | number | string[]
}

/**
 * API応答の統一フォーマット
 */
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: ApiError
  metadata?: {
    total_count?: number
    has_next_page?: boolean
    next_cursor?: string
    processing_time_ms: number
    cache_hit?: boolean
  }
}

/**
 * APIエラー定義
 */
export interface ApiError {
  code: string
  message: string
  type: 'USER_ERROR' | 'APPLICATION_ERROR' | 'SYSTEM_ERROR'
  error_subcode?: number
  fbtrace_id?: string
  retry_after?: number
}

// =============================================================================
// Data Processing Types
// =============================================================================

/**
 * 疲労度計算結果
 */
export interface FatigueScore {
  ad_id: string
  account_id: string

  // 総合スコア（0-100）
  total_score: number
  status: 'healthy' | 'warning' | 'critical'

  // 個別スコア
  scores: {
    creative_fatigue: number // クリエイティブ疲労（CTR低下率）
    audience_fatigue: number // 視聴者疲労（Frequency過多）
    algorithm_fatigue: number // アルゴリズム疲労（CPM上昇率）
  }

  // ベースライン比較
  baseline: {
    ctr_baseline: number
    cpm_baseline: number
    frequency_baseline: number
  }

  // 推奨アクション
  recommendations: string[]
  calculated_at: Date
}

/**
 * 集約データ構造
 */
export interface AggregatedInsight {
  // 集約レベル
  level: 'account' | 'campaign' | 'adset' | 'ad'
  level_id: string
  level_name?: string

  // 集約メトリクス
  total_impressions: number
  total_clicks: number
  total_spend: number
  average_ctr: number
  average_cpm: number
  average_frequency: number

  // 疲労度統計
  fatigue_distribution: {
    healthy_count: number
    warning_count: number
    critical_count: number
    average_score: number
  }

  // 時系列データ
  daily_breakdown?: DailyBreakdown[]

  // プラットフォーム別データ
  platform_breakdown?: PlatformBreakdown[]
}

/**
 * 日別集約データ
 */
export interface DailyBreakdown {
  date: string // YYYY-MM-DD
  impressions: number
  clicks: number
  spend: number
  ctr: number
  cpm: number
}

/**
 * プラットフォーム別集約データ
 */
export interface PlatformBreakdown {
  platform: 'facebook' | 'instagram' | 'audience_network' | 'messenger'
  impressions: number
  clicks: number
  spend: number
  ctr: number
  cpm: number
}

// =============================================================================
// Convex Database Types
// =============================================================================

/**
 * Convexテーブル：metaInsights
 */
export interface ConvexMetaInsight {
  _id: string
  _creationTime: number

  // 複合キー（ユニーク制約）
  account_id: string
  ad_id: string
  date: string // YYYY-MM-DD

  // AdInsightデータ
  insight_data: AdInsight

  // キャッシュ管理
  cache_key: string
  data_freshness: DataFreshnessStatus

  // 品質管理
  checksum: string
  is_complete: boolean

  // 更新管理
  last_verified: number
  update_priority: number
  next_update_at?: number
}

/**
 * Convexテーブル：dataFreshness
 */
export interface ConvexDataFreshness {
  _id: string
  _creationTime: number

  // 識別子
  account_id: string
  date: string // YYYY-MM-DD

  // 鮮度管理
  status: DataFreshnessStatus
  last_api_fetch: number
  last_update_check: number
  update_attempts: number

  // スケジューリング
  next_scheduled_update?: number
  update_interval_minutes: number

  // エラー追跡
  last_error?: string
  consecutive_failures: number
}

/**
 * Convexテーブル：cacheMetrics
 */
export interface ConvexCacheMetrics {
  _id: string
  _creationTime: number

  // 時間軸
  date: string // YYYY-MM-DD
  hour: number // 0-23

  // パフォーマンス指標
  cache_hit_rate: number
  api_call_count: number
  api_call_reduction: number
  average_response_time_ms: number

  // エラー指標
  error_count: number
  error_rate: number

  // リソース指標
  memory_usage_mb: number
  active_connections: number
}

// =============================================================================
// Hook Interfaces
// =============================================================================

/**
 * useConvexCacheフックの戻り値
 */
export interface UseConvexCacheResult {
  // データ
  data: AdInsight[] | null
  aggregatedData: AggregatedInsight[] | null
  fatigueScores: Map<string, FatigueScore> | null

  // 状態
  isLoading: boolean
  isRefreshing: boolean
  error: Error | null

  // キャッシュ情報
  dataSource: 'memory' | 'convex' | 'api' | null
  lastUpdateTime: Date | null
  cacheStats: {
    hitRate: number
    memoryUsage: number
    totalEntries: number
  }

  // アクション
  refetch: (options?: RefetchOptions) => Promise<void>
  clearCache: (level?: 'memory' | 'convex' | 'all') => Promise<void>
  forceDifferentialUpdate: () => Promise<void>
}

/**
 * データ再取得オプション
 */
export interface RefetchOptions {
  forceRefresh?: boolean
  skipCache?: boolean
  dateRangeOverride?: DateRangePreset
}

/**
 * キャッシュフィルター
 */
export interface CacheFilter {
  account_id?: string
  date_range?: {
    start: string
    end: string
  }
  data_freshness?: DataFreshnessStatus[]
  is_complete?: boolean
  min_priority?: number
}

// =============================================================================
// System Configuration Types
// =============================================================================

/**
 * システム設定
 */
export interface SystemConfig {
  // API設定
  meta_api: {
    version: 'v23.0'
    base_url: 'https://graph.facebook.com'
    rate_limits: {
      app_level: 200 // per hour
      ad_account_level: 25000 // per hour
    }
    timeout_ms: 30000
    retry_attempts: 3
  }

  // キャッシュ設定
  cache: {
    memory: {
      max_size_mb: 50
      ttl_minutes: 60
      cleanup_interval_minutes: 10
    }
    convex: {
      sync_interval_minutes: 10
      cleanup_interval_hours: 24
      data_retention_days: 90
    }
  }

  // 更新設定
  update_frequencies: {
    realtime_hours: 3
    neartime_hours: 6
    stabilizing_hours: 24
  }

  // パフォーマンス設定
  performance: {
    max_concurrent_accounts: 10
    batch_size: 100
    differential_fetch_threshold_days: 3
  }
}

/**
 * 監視メトリクス
 */
export interface MonitoringMetrics {
  timestamp: Date

  // パフォーマンス
  response_times: {
    p50_ms: number
    p95_ms: number
    p99_ms: number
  }

  // キャッシュ
  cache_performance: {
    hit_rate: number
    miss_rate: number
    eviction_rate: number
  }

  // API使用量
  api_usage: {
    calls_per_hour: number
    reduction_percentage: number
    rate_limit_hits: number
  }

  // エラー率
  error_rates: {
    total_error_rate: number
    api_error_rate: number
    cache_error_rate: number
  }

  // リソース使用量
  resources: {
    memory_usage_mb: number
    cpu_usage_percent: number
    active_connections: number
  }
}

// =============================================================================
// Utility Types
// =============================================================================

/**
 * 日付範囲ヘルパー
 */
export interface DateRangeInfo {
  preset: DateRangePreset
  start_date: string
  end_date: string
  days_count: number
  display_name: string
}

/**
 * エラー分類
 */
export interface ClassifiedError {
  original_error: Error
  category: 'network' | 'api' | 'cache' | 'auth' | 'validation' | 'system'
  severity: 'low' | 'medium' | 'high' | 'critical'
  retry_strategy: 'immediate' | 'exponential_backoff' | 'linear_backoff' | 'no_retry'
  user_message: string
}

/**
 * レスポンス統計
 */
export interface ResponseStats {
  total_requests: number
  successful_requests: number
  failed_requests: number
  average_response_time: number
  cache_hits: number
  api_calls: number
  data_freshness_distribution: Record<DataFreshnessStatus, number>
}

// =============================================================================
// 型エクスポート（利便性）
// =============================================================================

/**
 * よく使用される型の再エクスポート
 */
export type {
  AdInsight as MetaAdInsight,
  CacheEntry as CacheData,
  FatigueScore as AdFatigueScore,
  AggregatedInsight as AdAggregation,
}

/**
 * 型ガード関数
 */
export function isAdInsight(obj: any): obj is AdInsight {
  return (
    obj &&
    typeof obj.ad_id === 'string' &&
    typeof obj.account_id === 'string' &&
    typeof obj.impressions === 'number' &&
    typeof obj.clicks === 'number' &&
    typeof obj.spend === 'number'
  )
}

export function isApiError(obj: any): obj is ApiError {
  return (
    obj &&
    typeof obj.code === 'string' &&
    typeof obj.message === 'string' &&
    ['USER_ERROR', 'APPLICATION_ERROR', 'SYSTEM_ERROR'].includes(obj.type)
  )
}

export function isValidDateRange(range: any): range is DateRangePreset {
  const validRanges: DateRangePreset[] = [
    'today',
    'yesterday',
    'this_week',
    'last_week',
    'last_7d',
    'last_14d',
    'last_30d',
    'last_90d',
    'this_month',
    'last_month',
    'this_quarter',
    'last_quarter',
  ]
  return typeof range === 'string' && validRanges.includes(range as DateRangePreset)
}
