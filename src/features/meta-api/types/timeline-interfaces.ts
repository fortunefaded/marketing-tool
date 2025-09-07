// Meta API タイムライン機能 - TypeScript型定義

// ============================================================================
// タイムライン基本データ構造
// ============================================================================

export interface TimelineConfig {
  viewMode: 'calendar' | 'timeline' | 'heatmap'
  dateRange: DateRange
  granularity: 'hour' | 'day' | 'week'
  anomalyDetection: AnomalyDetectionConfig
  visualization: VisualizationConfig
}

export interface DateRange {
  start: Date
  end: Date
}

export interface DailyDeliveryStatus {
  date: Date
  hasDelivery: boolean
  adId: string
  campaignId: string
  metrics: DailyMetrics
  comparisonFlags: ComparisonFlags
  anomalyFlags: AnomalyType[]
  deliveryIntensity: DeliveryIntensity
}

export interface DailyMetrics {
  impressions: number
  clicks: number
  spend: number
  reach: number
  frequency: number
  ctr: number
  cpc: number
  cpm: number
  conversions: number
  conversionRate: number
}

export interface ComparisonFlags {
  vsYesterday: TrendDirection
  vsLastWeek: TrendDirection
  vsBaseline: BaselineComparison
  percentageChange: {
    daily: number
    weekly: number
    monthly: number
  }
}

export type TrendDirection = 'up' | 'down' | 'stable' | 'no_data'
export type BaselineComparison = 'normal' | 'warning' | 'critical'

// ============================================================================
// 配信ギャップ検出
// ============================================================================

export interface DeliveryGap {
  startDate: Date
  endDate: Date
  duration: number // 日数
  severity: GapSeverity
  possibleCause?: GapCause
  affectedMetrics: {
    missedImpressions: number
    missedSpend: number
    missedConversions: number
  }
}

export type GapSeverity = 'minor' | 'major' | 'critical'

export type GapCause =
  | 'budget_exhausted' // 予算枯渇
  | 'manual_pause' // 手動停止
  | 'policy_violation' // ポリシー違反
  | 'schedule_setting' // スケジュール設定
  | 'bid_too_low' // 入札額不足
  | 'audience_exhausted' // オーディエンス枯渇
  | 'creative_rejected' // クリエイティブ拒否
  | 'technical_error' // 技術的エラー
  | 'unknown' // 不明

export interface GapDetectionThresholds {
  minorGap: number // 1日（デフォルト）
  majorGap: number // 3日（デフォルト）
  criticalGap: number // 7日（デフォルト）
}

// ============================================================================
// 異常検知
// ============================================================================

export interface Anomaly {
  id: string
  type: AnomalyType
  severity: AnomalySeverity
  detectedAt: Date
  dateRange: DateRange
  affectedAdIds: string[]
  message: string
  recommendation: string
  confidence: number // 0-1の信頼度スコア
  metrics: AnomalyMetrics
  status: 'active' | 'resolved' | 'acknowledged'
}

export type AnomalyType =
  | 'sudden_stop' // 突然の配信停止
  | 'performance_drop' // パフォーマンス急落
  | 'spend_spike' // 支出急増
  | 'intermittent' // 断続的配信
  | 'high_frequency' // 高フリークエンシー
  | 'low_ctr' // 低CTR
  | 'high_cpm' // 高CPM
  | 'budget_pacing' // ペーシング異常
  | 'audience_saturation' // オーディエンス飽和

export type AnomalySeverity = 'low' | 'medium' | 'high' | 'critical'

export interface AnomalyMetrics {
  impactScore: number // 影響度スコア（0-100）
  affectedSpend: number // 影響を受けた広告費
  lostOpportunities: number // 失われた機会（推定）
  deviationFromBaseline: number // ベースラインからの乖離率
}

export interface AnomalyDetectionConfig {
  enabled: boolean
  sensitivity: SensitivityLevel
  enabledRules: AnomalyType[]
  customThresholds?: AnomalyThresholds
  notificationSettings: NotificationConfig
}

export type SensitivityLevel = 'low' | 'medium' | 'high' | 'custom'

export interface AnomalyThresholds {
  suddenStop: {
    consecutiveDays: number // 3日（デフォルト）
    impressionThreshold: number // 0インプレッション
  }
  performanceDrop: {
    ctrDropPercentage: number // 50%（デフォルト）
    consecutiveDays: number // 2日
  }
  spendSpike: {
    multiplier: number // 2倍（デフォルト）
    immediateAlert: boolean // true
  }
  intermittent: {
    windowDays: number // 7日
    minActiveDays: number // 2日
    maxActiveDays: number // 5日
  }
  highFrequency: {
    threshold: number // 5.0（デフォルト）
    immediateAlert: boolean // true
  }
  lowCtr: {
    threshold: number // 0.5%（デフォルト）
    baselineMultiplier: number // 0.25（ベースラインの25%）
  }
  highCpm: {
    baselineMultiplier: number // 1.5（ベースラインの150%）
    absoluteThreshold: number // 5000円
  }
}

// ============================================================================
// 配信強度分析
// ============================================================================

export interface DeliveryIntensity {
  level: IntensityLevel
  label: IntensityLabel
  score: number // 0-100
  trend: TrendInfo
}

export type IntensityLevel = 0 | 1 | 2 | 3 | 4 | 5

export type IntensityLabel = 'no_delivery' | 'very_low' | 'low' | 'medium' | 'high' | 'very_high'

export interface TrendInfo {
  direction: TrendDirection
  changeRate: number // -1 to 1
  confidence: number // 0-1
  forecast?: ForecastInfo
  volatility: number // 変動性スコア
}

export interface ForecastInfo {
  predictions: PredictionPoint[]
  accuracy: number // 過去の予測精度
  method: 'linear' | 'moving_average' | 'exponential_smoothing'
}

export interface PredictionPoint {
  date: Date
  predictedValue: number
  confidence: number
  upperBound: number
  lowerBound: number
}

// ============================================================================
// ベースライン計算
// ============================================================================

export interface BaselineMetrics {
  avgImpressions: number
  medianImpressions: number
  avgCTR: number
  medianCTR: number
  avgSpend: number
  medianSpend: number
  avgCPM: number
  medianCPM: number
  avgFrequency: number
  standardDeviation: {
    impressions: number
    ctr: number
    spend: number
  }
  percentiles: {
    p25: DailyMetrics
    p50: DailyMetrics
    p75: DailyMetrics
    p90: DailyMetrics
  }
}

export interface BaselineCalculationConfig {
  windowDays: number // 30日（デフォルト）
  excludeAnomalies: boolean // true（異常値を除外）
  minDataPoints: number // 最小データポイント数（14日）
  method: 'median' | 'mean' | 'trimmed_mean'
}

// ============================================================================
// タイムラインビュー設定
// ============================================================================

export interface TimelineViewState {
  currentView: TimelineViewMode
  selectedDate?: Date
  highlightedGaps: string[]
  highlightedAnomalies: string[]
  filters: TimelineFilters
  zoom: ZoomLevel
}

export type TimelineViewMode = 'calendar' | 'timeline' | 'heatmap' | 'comparison'

export interface TimelineFilters {
  campaigns?: string[]
  adSets?: string[]
  ads?: string[]
  dateRange?: DateRange
  anomalyTypes?: AnomalyType[]
  minSeverity?: AnomalySeverity
}

export interface ZoomLevel {
  scale: number // 0.5 - 2.0
  center: Date
  range: DateRange
}

// ============================================================================
// 視覚化設定
// ============================================================================

export interface VisualizationConfig {
  theme: 'light' | 'dark' | 'auto'
  colorScheme: ColorScheme
  animations: boolean
  density: 'compact' | 'comfortable' | 'spacious'
  showTooltips: boolean
  showLegend: boolean
  mobileOptimized: boolean
}

export interface ColorScheme {
  delivery: {
    active: string // '#22C55E'
    inactive: string // '#9CA3AF'
    partial: string // '#FCD34D'
  }
  anomaly: {
    low: string // '#FCD34D'
    medium: string // '#FB923C'
    high: string // '#EF4444'
    critical: string // '#991B1B'
  }
  intensity: {
    gradient: string[] // ['#E0F2FE', '#0EA5E9']
  }
  gap: {
    minor: string // '#E5E7EB'
    major: string // '#9CA3AF'
    critical: string // '#4B5563'
  }
}

// ============================================================================
// カレンダービューデータ
// ============================================================================

export interface CalendarCell {
  date: Date
  dayOfWeek: number
  weekOfMonth: number
  status: 'active' | 'inactive' | 'partial'
  intensity: number
  metrics?: DailyMetrics
  isGap: boolean
  gapSeverity?: GapSeverity
  hasAnomaly: boolean
  anomalies: Anomaly[]
  isToday: boolean
  isSelected: boolean
  isHovered: boolean
}

export interface CalendarMonth {
  year: number
  month: number
  weeks: CalendarCell[][]
  summary: MonthSummary
}

export interface MonthSummary {
  totalDays: number
  activeDays: number
  inactiveDays: number
  totalSpend: number
  totalImpressions: number
  avgCTR: number
  anomalyCount: number
  gapCount: number
}

// ============================================================================
// ヒートマップデータ
// ============================================================================

export interface HeatmapData {
  hourlyDistribution: number[][] // 24時間 × 7曜日
  peakHours: PeakTime[]
  quietHours: QuietTime[]
  patterns: DeliveryPattern[]
}

export interface PeakTime {
  hour: number
  dayOfWeek: number
  intensity: number
  metrics: DailyMetrics
}

export interface QuietTime {
  hour: number
  dayOfWeek: number
  reason?: 'no_budget' | 'schedule' | 'low_performance'
}

export interface DeliveryPattern {
  name: string
  description: string
  frequency: 'daily' | 'weekly' | 'irregular'
  confidence: number
}

// ============================================================================
// 通知設定
// ============================================================================

export interface NotificationConfig {
  enabled: boolean
  channels: NotificationChannel[]
  thresholds: NotificationThresholds
  schedule: NotificationSchedule
}

export type NotificationChannel = 'in_app' | 'email' | 'slack' | 'webhook'

export interface NotificationThresholds {
  immediate: AnomalySeverity[] // ['critical']
  batched: AnomalySeverity[] // ['high', 'medium']
  summary: AnomalySeverity[] // ['low']
}

export interface NotificationSchedule {
  immediate: boolean
  dailySummary: string // '09:00'
  weeklySummary: string // 'monday 09:00'
}

// ============================================================================
// ユーティリティ関数の型定義
// ============================================================================

export interface TimelineAnalyzerAPI {
  detectGaps(timeline: DailyDeliveryStatus[]): DeliveryGap[]
  detectAnomalies(
    timeline: DailyDeliveryStatus[],
    config: AnomalyDetectionConfig
  ): Promise<Anomaly[]>
  calculateBaseline(
    timeline: DailyDeliveryStatus[],
    config?: BaselineCalculationConfig
  ): BaselineMetrics
  analyzeIntensity(timeline: DailyDeliveryStatus[]): DeliveryIntensity[]
  generateForecast(timeline: DailyDeliveryStatus[], days: number): ForecastInfo
  exportReport(timeline: DailyDeliveryStatus[], format: 'pdf' | 'csv' | 'json'): Promise<Blob>
}

// ============================================================================
// React Hooks インターフェース
// ============================================================================

export interface UseTimelineOptions {
  accountId: string
  dateRange: DateRange
  config: TimelineConfig
  cacheStrategy?: 'memory' | 'localStorage' | 'convex'
  autoRefresh?: boolean
  refreshInterval?: number // ms
}

export interface UseTimelineResult {
  timeline: DailyDeliveryStatus[]
  gaps: DeliveryGap[]
  anomalies: Anomaly[]
  baseline: BaselineMetrics
  intensity: DeliveryIntensity[]
  isLoading: boolean
  error?: Error
  refetch: () => Promise<void>
  updateConfig: (config: Partial<TimelineConfig>) => void
}

// ============================================================================
// エクスポート補助
// ============================================================================

export type TimelineData = {
  timeline: DailyDeliveryStatus[]
  gaps: DeliveryGap[]
  anomalies: Anomaly[]
  baseline: BaselineMetrics
  metadata: TimelineMetadata
}

export interface TimelineMetadata {
  accountId: string
  dateRange: DateRange
  lastUpdated: Date
  dataQuality: DataQualityScore
  completeness: number // 0-1
}

export interface DataQualityScore {
  score: number // 0-100
  issues: DataQualityIssue[]
  recommendations: string[]
}

export interface DataQualityIssue {
  type: 'missing_data' | 'inconsistent_data' | 'suspicious_values'
  severity: 'low' | 'medium' | 'high'
  affectedDates: Date[]
  description: string
}
