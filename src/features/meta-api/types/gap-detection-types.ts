/**
 * gap-detection-types.ts
 * TASK-202: ギャップ検出エンジン関連の型定義
 */

// 基本的な型
export type GapSeverity = 'critical' | 'major' | 'minor' | 'negligible'
export type GapType = 'unexpected' | 'weekend' | 'scheduled_maintenance' | 'budget_exhaustion' | 'performance_pause'
export type DeliveryIntensity = 'high' | 'medium' | 'low' | 'none'

// ギャップの影響度を表す型
export interface GapImpact {
  performanceDrop: number // パフォーマンス低下率（%）
  recoveryTime: number // 回復時間（日数）
  estimatedLostImpressions: number // 推定損失インプレッション数
  estimatedLostRevenue: number // 推定損失収益
}

// 個別のギャップ情報
export interface DeliveryGap {
  startDate: Date
  endDate: Date
  durationDays: number
  severity: GapSeverity
  type: GapType
  impact: GapImpact
  
  // ギャップ前後のメトリクス比較
  beforeGapMetrics: DailyMetrics | null
  afterGapMetrics: DailyMetrics | null
  
  // ギャップのコンテキスト情報
  gapContext: {
    precedingDeliveryDays: number // 直前の配信日数
    followingDeliveryDays: number // 直後の配信日数
  }
}

// ギャップ検出の全体結果
export interface GapDetectionResult {
  totalGaps: number
  gaps: DeliveryGap[]
  statistics: GapStatistics
  analysisMetadata: {
    analysisDate: Date
    configUsed: GapDetectionConfig
    timelineDataSummary: {
      totalDays: number
      deliveryDays: number
      gapDays: number
    }
  }
}

// ギャップ統計情報
export interface GapStatistics {
  totalGapDays: number
  gapRate: number // ギャップ率（%）
  averageGapDuration: number
  longestGapDays: number
  continuityScore: number // 配信継続性スコア（0-100）
  
  // 重要度別分布
  severityDistribution: {
    critical: number
    major: number
    minor: number
    negligible: number
  }
  
  // タイプ別分布
  typeDistribution: Record<GapType, number>
  
  // 推定影響度の合計
  estimatedTotalImpact: {
    lostImpressions: number
    lostRevenue: number
  }
}

// ギャップ検出設定
export interface GapDetectionConfig {
  minGapDays: number
  maxAnalysisWindow: number
  
  thresholds: {
    criticalGapDays: number
    majorGapDays: number
    minorGapDays: number
    performanceDropThreshold: number
    recoveryTimeThreshold: number
  }
  
  patterns: {
    weekendGapTolerance: boolean
    holidayGapTolerance: boolean
    scheduledMaintenanceWindows: string[]
  }
}

// 日次メトリクス（他の型ファイルと重複の可能性があるため、必要に応じて調整）
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

// 日次配信ステータス（タイムラインデータから参照）
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

// 比較フラグ（他の型ファイルから参照される可能性）
export interface ComparisonFlags {
  vsYesterday: Record<string, TrendDirection>
  vsLastWeek: Record<string, TrendDirection>
  vsBaseline: {
    status: 'normal' | 'above' | 'below'
    deviation: number
  }
  percentageChange: {
    daily: number
    weekly: number
  }
}

export type TrendDirection = 'up' | 'down' | 'stable'
export type AnomalyType = 'ctr_drop' | 'frequency_fatigue' | 'cpm_spike'

// TimelineData関連（timeline-interfaces.tsと連携）
export interface TimelineData {
  totalDays: number
  deliveryDays: number
  gapDays: number
  dailyStatuses: DailyDeliveryStatus[]
  aggregatedMetrics: AggregatedTimelineMetrics
  dateRange: {
    start: Date
    end: Date
  }
}

export interface AggregatedTimelineMetrics {
  totalImpressions: number
  totalClicks: number
  totalSpend: number
  totalConversions: number
  averageCTR: number
  averageCPC: number
  averageCPM: number
  averageFrequency: number
}