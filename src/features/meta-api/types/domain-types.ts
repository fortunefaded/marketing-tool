/**
 * domain-types.ts
 * ビジネスドメインの型定義
 */

/**
 * 基本メトリクス（数値型）
 */
export interface BaseMetrics {
  impressions: number
  clicks: number
  spend: number
  reach: number
  frequency: number
  ctr: number
  cpm: number
  cpc: number
  conversions: number
  first_conversions: number
}

/**
 * 計算メトリクス
 */
export interface CalculatedMetrics extends BaseMetrics {
  cpa: number
  roas: number
  cvr: number
}

/**
 * 安全なメトリクス（すべて必須）
 */
export interface SafeMetrics {
  impressions: number
  clicks: number
  spend: number
  reach: number
  frequency: number
  ctr: number
  cpm: number
  cpc: number
  conversions: number
  first_conversions: number
  roas: number
}

/**
 * 日別メトリクス
 */
export interface DailyMetrics {
  date: string
  metrics: BaseMetrics
}

/**
 * 統一広告データ
 */
export interface UnifiedAdData {
  // 必須フィールド
  ad_id: string
  ad_name: string
  
  // Optional識別子
  campaign_id?: string
  campaign_name?: string
  adset_id?: string
  adset_name?: string
  account_id?: string
  
  // メトリクス（常に安全）
  metrics: SafeMetrics
  
  // 疲労度関連
  fatigueScore?: number
  status?: AdStatus
  
  // クリエイティブ情報
  creative?: CreativeInfo
  
  // 集約情報
  summary?: AdSummary
}

/**
 * 広告ステータス
 */
export type AdStatus = 'healthy' | 'warning' | 'critical'

/**
 * クリエイティブ情報
 */
export interface CreativeInfo {
  type?: CreativeType
  thumbnail_url?: string
  video_url?: string
  image_url?: string
  title?: string
  body?: string
  call_to_action?: string
}

/**
 * クリエイティブタイプ
 */
export type CreativeType = 'IMAGE' | 'VIDEO' | 'CAROUSEL' | 'TEXT' | 'UNKNOWN'

/**
 * 広告サマリー
 */
export interface AdSummary {
  dateRange?: DateRange
  metrics?: SafeMetrics
  platformBreakdown?: Record<string, SafeMetrics>
}

/**
 * 日付範囲
 */
export interface DateRange {
  start: string
  end: string
}

/**
 * 疲労度データ
 */
export interface FatigueData extends UnifiedAdData {
  score: number
  status: AdStatus
  metrics: SafeMetrics
  baseline?: BaselineMetrics
  details?: FatigueDetails
}

/**
 * 疲労度詳細
 */
export interface FatigueDetails {
  scores: {
    creative: number
    audience: number
    algorithm: number
  }
  details: {
    ctrDecline: number
    frequencyLevel: number
    cpmIncrease: number
  }
  recommendations: string[]
}

/**
 * ベースラインメトリクス
 */
export interface BaselineMetrics {
  ctr: number
  cpm: number
  frequency: number
  calculatedAt: string
  dataPoints: number
}

/**
 * 集約されたパフォーマンスデータ
 */
export interface AdPerformanceData {
  ad_id: string
  ad_name: string
  campaign_id: string
  campaign_name: string
  adset_id: string
  adset_name: string
  
  summary: {
    dateRange: DateRange
    metrics: CalculatedMetrics
  }
  
  dailyBreakdown: DailyMetrics[]
  platformBreakdown: Record<string, BaseMetrics>
  
  creative?: CreativeInfo
  fatigueScore?: number
  fatigueTimeline?: Array<{ date: string; score: number }>
}

/**
 * 集約オプション
 */
export interface AggregationOptions {
  groupBy: 'ad' | 'adset' | 'campaign'
  includePlatformBreakdown: boolean
  includeDailyBreakdown: boolean
  calculateFatigue: boolean
}

/**
 * 集約結果
 */
export interface AggregationResult {
  data: AdPerformanceData[]
  metadata: AggregationMetadata
}

/**
 * 集約メタデータ
 */
export interface AggregationMetadata {
  totalInputRows: number
  totalOutputRows: number
  processingTimeMs: number
  dataReduction: string
  errors: AggregationError[]
  summary: {
    adCount: number
    dateRange: DateRange
    platforms: string[]
  }
}

/**
 * 集約エラー
 */
export interface AggregationError {
  type: 'MISSING_DATA' | 'INVALID_FORMAT' | 'CALCULATION_ERROR'
  message: string
  context?: any
}