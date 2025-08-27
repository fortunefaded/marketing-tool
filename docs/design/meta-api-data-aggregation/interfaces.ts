/**
 * Meta API データ集約システム 型定義
 * @version 1.0.0
 * @date 2025-08-27
 */

// ============================================================================
// 基本型定義
// ============================================================================

/**
 * プラットフォーム種別
 */
export type PlatformType = 'facebook' | 'instagram' | 'audience_network' | 'other'

/**
 * 疲労度ステータス
 */
export type FatigueStatus = 'healthy' | 'caution' | 'warning' | 'critical'

/**
 * 期間選択オプション
 */
export type DateRangePreset = '7d' | '14d' | '30d' | 'custom'

/**
 * 集約レベル
 */
export type AggregationLevel = 'ad' | 'adset' | 'campaign'

// ============================================================================
// メトリクス関連
// ============================================================================

/**
 * 基本メトリクス
 */
export interface BaseMetrics {
  impressions: number
  clicks: number
  spend: number
  reach: number
  frequency: number
  unique_clicks?: number
  unique_ctr?: number
}

/**
 * 計算済みメトリクス
 */
export interface CalculatedMetrics extends BaseMetrics {
  ctr: number // Click-through rate
  cpc: number // Cost per click
  cpm: number // Cost per mille (1000 impressions)
  conversions?: number
  conversion_value?: number
  cpa?: number // Cost per acquisition
  roas?: number // Return on ad spend
  first_conversions?: number // F-CV
}

/**
 * 日別メトリクス
 */
export interface DailyMetrics extends CalculatedMetrics {
  date: string // YYYY-MM-DD format
}

/**
 * プラットフォーム別メトリクス
 */
export interface PlatformMetrics {
  platform: PlatformType
  metrics: CalculatedMetrics
}

// ============================================================================
// 広告パフォーマンスデータ（集約後）
// ============================================================================

/**
 * 広告パフォーマンスデータ - メインのデータ構造
 */
export interface AdPerformanceData {
  // 基本情報
  ad_id: string
  ad_name: string
  campaign_id: string
  campaign_name: string
  adset_id: string
  adset_name: string
  account_id: string

  // クリエイティブ情報
  creative?: {
    id: string
    name?: string
    type?: string
    thumbnail_url?: string
    video_url?: string
    image_url?: string
    object_type?: string
  }

  // 期間集計データ（ダッシュボード表示用）
  summary: {
    dateRange: {
      start: string // ISO 8601
      end: string // ISO 8601
    }
    metrics: CalculatedMetrics
    // プラットフォーム別集計（オプション）
    platformBreakdown?: {
      facebook?: CalculatedMetrics
      instagram?: CalculatedMetrics
      audience_network?: CalculatedMetrics
      other?: CalculatedMetrics
    }
  }

  // 日別詳細データ（グラフ・分析用）
  dailyBreakdown: DailyMetrics[]

  // 日別・プラットフォーム別詳細（オプション）
  dailyPlatformBreakdown?: Array<{
    date: string
    platforms: {
      facebook?: BaseMetrics
      instagram?: BaseMetrics
      audience_network?: BaseMetrics
      other?: BaseMetrics
    }
  }>

  // 疲労度の時系列データ
  fatigueTimeline?: FatigueTimeline[]

  // メタデータ
  metadata: {
    lastUpdated: string // ISO 8601
    dataQuality: 'complete' | 'partial' | 'estimated'
    warnings?: string[]
  }
}

// ============================================================================
// 疲労度分析
// ============================================================================

/**
 * 疲労度時系列データ
 */
export interface FatigueTimeline {
  date: string // YYYY-MM-DD
  score: number // 0-100
  status: FatigueStatus
  indicators: {
    ctr_trend: number // CTRの変化率 (-100 to +100)
    frequency_trend: number // フリークエンシーの変化率
    cpm_trend: number // CPMの変化率
    engagement_trend?: number // エンゲージメントの変化率
  }
  factors: {
    creative_fatigue: number // クリエイティブ疲労度 (0-100)
    audience_fatigue: number // オーディエンス疲労度 (0-100)
    algorithm_fatigue: number // アルゴリズム疲労度 (0-100)
  }
  recommendation?: string // 推奨アクション
}

/**
 * 疲労度計算設定
 */
export interface FatigueCalculationConfig {
  thresholds: {
    ctr_decline_warning: number // デフォルト: 15
    ctr_decline_critical: number // デフォルト: 25
    frequency_warning: number // デフォルト: 3.0
    frequency_critical: number // デフォルト: 3.5
    cpm_increase_warning: number // デフォルト: 15
    cpm_increase_critical: number // デフォルト: 20
  }
  movingAverageWindow: number // デフォルト: 7 (days)
  enablePrediction: boolean
  predictionDays: number // デフォルト: 7
}

// ============================================================================
// データ集約
// ============================================================================

/**
 * 集約オプション
 */
export interface AggregationOptions {
  groupBy: AggregationLevel
  includePlatformBreakdown: boolean
  includeDailyBreakdown: boolean
  calculateFatigue: boolean
  dateRange?: {
    start: string
    end: string
  }
}

/**
 * 集約結果
 */
export interface AggregationResult {
  data: AdPerformanceData[]
  summary: {
    totalAds: number
    totalSpend: number
    totalImpressions: number
    totalConversions: number
    averageCtr: number
    averageRoas: number
  }
  metadata: {
    processedRows: number
    aggregationTime: number // milliseconds
    errors: AggregationError[]
  }
}

/**
 * 集約エラー
 */
export interface AggregationError {
  adId?: string
  field?: string
  message: string
  severity: 'warning' | 'error'
  timestamp: string
}

// ============================================================================
// API関連
// ============================================================================

/**
 * Meta APIレスポンス（生データ）
 */
export interface MetaApiInsight {
  ad_id: string
  ad_name?: string
  campaign_id?: string
  campaign_name?: string
  adset_id?: string
  adset_name?: string

  date_start: string
  date_stop: string

  impressions?: string
  clicks?: string
  spend?: string
  reach?: string
  frequency?: string
  ctr?: string
  cpm?: string
  cpc?: string

  conversions?: string
  conversion_values?: string

  publisher_platform?: PlatformType | string

  [key: string]: any // その他のフィールド
}

/**
 * データ取得オプション
 */
export interface FetchOptions {
  accountId: string
  datePreset?: DateRangePreset
  customDateRange?: {
    since: string
    until: string
  }
  includeBreakdowns: boolean
  forceRefresh: boolean
  maxPages?: number
  onProgress?: (loaded: number, total: number) => void
}

/**
 * データ取得結果
 */
export interface FetchResult {
  success: boolean
  data?: AdPerformanceData[]
  rawData?: MetaApiInsight[]
  error?: {
    code: string
    message: string
    details?: any
  }
  metadata: {
    fetchTime: number
    dataSource: 'cache' | 'api'
    cacheAge?: number
  }
}

// ============================================================================
// キャッシュ
// ============================================================================

/**
 * キャッシュエントリ
 */
export interface CacheEntry<T = any> {
  key: string
  data: T
  timestamp: string
  ttl: number // seconds
  metadata?: {
    accountId?: string
    dateRange?: string
    version?: string
  }
}

/**
 * キャッシュ設定
 */
export interface CacheConfig {
  enableL1Cache: boolean
  enableL2Cache: boolean
  l1MaxSize: number // MB
  l1TTL: number // seconds
  l2TTL: number // seconds
  compressionEnabled: boolean
}

// ============================================================================
// UI状態管理
// ============================================================================

/**
 * ダッシュボード状態
 */
export interface DashboardState {
  // データ
  performanceData: AdPerformanceData[]

  // フィルタ
  filters: {
    dateRange: DateRangePreset
    campaigns?: string[]
    adsets?: string[]
    platforms?: PlatformType[]
    fatigueStatus?: FatigueStatus[]
  }

  // 表示設定
  view: {
    mode: 'summary' | 'detailed' | 'timeline'
    groupBy: AggregationLevel
    showPlatformBreakdown: boolean
    chartType: 'line' | 'bar' | 'area'
  }

  // 状態
  loading: boolean
  refreshing: boolean
  error: Error | null

  // メタ情報
  lastUpdated: string | null
  dataSource: 'cache' | 'api' | null
  totalRecords: number
  filteredRecords: number
}

/**
 * テーブル設定
 */
export interface TableConfig {
  columns: Array<{
    key: string
    label: string
    sortable: boolean
    width?: number
    formatter?: (value: any) => string
  }>
  sortBy: string
  sortDirection: 'asc' | 'desc'
  pageSize: number
  currentPage: number
}

// ============================================================================
// Hooks インターフェース
// ============================================================================

/**
 * useAdFatigue フックの戻り値
 */
export interface UseAdFatigueResult {
  data: AdPerformanceData[]
  insights: MetaApiInsight[]
  isLoading: boolean
  isRefreshing: boolean
  error: Error | null
  refetch: (options?: Partial<FetchOptions>) => Promise<void>
  dataSource: 'cache' | 'api' | null
  lastUpdateTime: Date | null
  progress?: {
    loaded: number
    total: number
    percentage: number
  }
  aggregationMetadata?: AggregationResult['metadata']
}

/**
 * useDataAggregator フックの戻り値
 */
export interface UseDataAggregatorResult {
  aggregate: (data: MetaApiInsight[], options?: AggregationOptions) => Promise<AggregationResult>
  isAggregating: boolean
  aggregationError: Error | null
  lastAggregationTime: number | null
}

// ============================================================================
// ユーティリティ型
// ============================================================================

/**
 * Nullable型
 */
export type Nullable<T> = T | null

/**
 * 部分的に必須
 */
export type PartialRequired<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>

/**
 * Deep Partial
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

/**
 * API レスポンス共通型
 */
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
    [key: string]: any
  }
}

// ============================================================================
// 定数
// ============================================================================

export const DEFAULT_FATIGUE_CONFIG: FatigueCalculationConfig = {
  thresholds: {
    ctr_decline_warning: 15,
    ctr_decline_critical: 25,
    frequency_warning: 3.0,
    frequency_critical: 3.5,
    cpm_increase_warning: 15,
    cpm_increase_critical: 20,
  },
  movingAverageWindow: 7,
  enablePrediction: false,
  predictionDays: 7,
}

export const DEFAULT_CACHE_CONFIG: CacheConfig = {
  enableL1Cache: true,
  enableL2Cache: true,
  l1MaxSize: 100, // MB
  l1TTL: 3600, // 1 hour
  l2TTL: 86400, // 24 hours
  compressionEnabled: false,
}
