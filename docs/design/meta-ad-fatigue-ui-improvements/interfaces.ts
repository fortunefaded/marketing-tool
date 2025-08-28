/**
 * Meta広告疲労度分析ダッシュボード UI/UX改善
 * TypeScript型定義
 *
 * @version 1.0.0
 * @date 2025-08-28
 */

// ============================================================================
// ENHANCED DATA STRUCTURES (要件定義 REQ-003対応)
// ============================================================================

/**
 * 拡張後のデータ形式 - 媒体別データを含む
 * 要件: REQ-003, REQ-005対応
 */
export interface PlatformSpecificMetrics {
  date: string
  facebook: number
  instagram: number
  audience_network: number
  messenger?: number
  total: number
  // データ整合性確保 (REQ-006, REQ-007対応)
  _metadata?: {
    calculatedTotal: number
    adjustmentApplied: boolean
    roundingError?: number
  }
}

/**
 * 媒体タイプ定義
 * 要件: REQ-005対応 (Facebook:青線、Instagram:紫線、Audience Network:緑線)
 */
export type PlatformType = 'facebook' | 'instagram' | 'audience_network' | 'messenger'

/**
 * 媒体別カラーマッピング
 * 要件: REQ-005, 開発者ガイドライン準拠
 */
export interface PlatformColors {
  facebook: '#1877F2' // 青
  instagram: '#E4405F' // 紫/ピンク
  audience_network: '#42B883' // 緑
  messenger: '#00B2FF' // ライトブルー
}

/**
 * 線の種類定義 (アクセシビリティ対応)
 * 要件: NFR-202対応
 */
export type LineStyle = 'solid' | 'dashed' | 'dotted' | 'dashdot'

export interface PlatformLineStyles {
  facebook: 'solid' // 実線
  instagram: 'dashed' // 破線
  audience_network: 'dotted' // 点線
  messenger: 'dashdot' // 一点鎖線
}

// ============================================================================
// ENHANCED AD PERFORMANCE DATA
// ============================================================================

/**
 * 拡張されたAdPerformanceData
 * 既存のAdDataAggregatorとの互換性を維持しつつ媒体別データを追加
 */
export interface EnhancedAdPerformanceData {
  // 基本情報 (既存互換)
  ad_id: string
  ad_name: string
  campaign_id: string
  campaign_name: string
  adset_id: string
  adset_name: string

  // 期間情報
  summary: {
    dateRange: { start: string; end: string }
    metrics: EnhancedCalculatedMetrics
    // 新規: 媒体別集計
    platformBreakdown: Record<PlatformType, BaseMetrics>
  }

  // 日別データ (拡張)
  dailyBreakdown: EnhancedDailyMetrics[]

  // 新規: 媒体別時系列データ
  platformTimeSeries: PlatformTimeSeriesData[]

  // クリエイティブ情報 (既存互換)
  creative?: {
    type?: string
    thumbnail_url?: string
    video_url?: string
    image_url?: string
  }

  // データ品質情報 (REQ-401, REQ-402対応)
  metadata: {
    lastUpdated: string
    dataQuality: 'complete' | 'partial' | 'estimated'
    dataConsistencyCheck: DataConsistencyResult
    warnings: string[]
  }
}

/**
 * 拡張されたメトリクス定義
 * 要件: REQ-003準拠 (全指標の媒体別表示)
 */
export interface EnhancedCalculatedMetrics extends BaseMetrics {
  cpa: number
  roas: number
  cvr: number
  // First Conversion追加 (既存実装に合わせて)
  first_conversions: number
  unique_ctr: number
  unique_inline_link_click_ctr: number
}

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
}

/**
 * 拡張された日別メトリクス
 * 媒体別データを含む
 */
export interface EnhancedDailyMetrics {
  date: string
  total: EnhancedCalculatedMetrics
  // 媒体別データ
  platforms: Record<PlatformType, BaseMetrics>
}

/**
 * 媒体別時系列データ
 * グラフ表示用のフォーマット
 */
export interface PlatformTimeSeriesData {
  date: string
  facebook: number
  instagram: number
  audience_network: number
  messenger?: number
  total: number
}

// ============================================================================
// CHART-SPECIFIC INTERFACES
// ============================================================================

/**
 * マルチラインチャート用データ構造
 * 要件: REQ-002, REQ-003対応
 */
export interface MultiLineChartData {
  data: PlatformTimeSeriesData[]
  metrics: ChartMetricType
  config: ChartConfiguration
}

/**
 * チャート表示対象メトリクス
 * 要件: REQ-003準拠
 */
export type ChartMetricType =
  | 'spend' // 広告費用
  | 'impressions' // インプレッション
  | 'ctr' // CTR
  | 'frequency' // Frequency
  | 'clicks' // クリック数
  | 'conversions' // コンバージョン

/**
 * チャート設定
 * 要件: REQ-004, REQ-005対応
 */
export interface ChartConfiguration {
  colors: PlatformColors
  lineStyles: PlatformLineStyles
  showLegend: boolean
  showTooltip: boolean
  showTotal: boolean // REQ-301対応
  enablePlatformToggle: boolean // REQ-102対応
  accessibility: AccessibilityConfig
}

/**
 * アクセシビリティ設定
 * 要件: NFR-202対応 (WCAG 2.1 AA準拠)
 */
export interface AccessibilityConfig {
  ariaLabels: Record<PlatformType, string>
  contrastRatio: number // 最小4.5:1
  keyboardNavigation: boolean
  screenReaderSupport: boolean
  focusIndicators: boolean
}

// ============================================================================
// TOOLTIP AND INTERACTION INTERFACES
// ============================================================================

/**
 * ツールチップデータ
 * 要件: REQ-101対応 (各媒体の具体的数値表示)
 */
export interface TooltipData {
  date: string
  metric: ChartMetricType
  values: Record<PlatformType, TooltipValue>
  total: TooltipValue
}

export interface TooltipValue {
  value: number
  formatted: string
  change?: {
    value: number
    percentage: number
    direction: 'up' | 'down' | 'same'
  }
}

/**
 * プラットフォームトグル状態
 * 要件: REQ-102対応
 */
export interface PlatformToggleState {
  facebook: boolean
  instagram: boolean
  audience_network: boolean
  messenger?: boolean
}

/**
 * インタラクション状態管理
 * 要件: REQ-201対応 (全媒体表示状態で開始)
 */
export interface ChartInteractionState {
  platformVisibility: PlatformToggleState
  selectedMetric: ChartMetricType
  hoveredData: TooltipData | null
  isLoading: boolean
  error: ChartError | null
}

// ============================================================================
// ERROR HANDLING AND VALIDATION
// ============================================================================

/**
 * データ整合性チェック結果
 * 要件: REQ-006, REQ-007対応
 */
export interface DataConsistencyResult {
  isConsistent: boolean
  totalMismatch: number
  adjustmentApplied: boolean
  platformChecks: Record<
    PlatformType,
    {
      isValid: boolean
      originalValue: number
      adjustedValue?: number
      discrepancy?: number
    }
  >
  timestamp: string
}

/**
 * チャートエラー定義
 * 要件: EDGE-001, EDGE-002対応
 */
export interface ChartError {
  type: 'DATA_MISSING' | 'PLATFORM_UNAVAILABLE' | 'CALCULATION_ERROR' | 'RENDER_ERROR'
  message: string
  affectedPlatforms?: PlatformType[]
  recoverable: boolean
  fallbackData?: Partial<PlatformTimeSeriesData[]>
}

/**
 * エッジケース処理
 * 要件: EDGE-001, EDGE-002, EDGE-003対応
 */
export interface EdgeCaseHandler {
  handleMissingPlatformData: (platform: PlatformType, data: any[]) => PlatformTimeSeriesData[]
  handleEmptyDataset: () => ChartError
  handleApiError: (error: any) => ChartError
  handleLargeDataset: (data: any[], maxPoints: number) => any[]
}

// ============================================================================
// RESPONSIVE AND MOBILE INTERFACES
// ============================================================================

/**
 * レスポンシブ設定
 * 要件: EDGE-201, EDGE-202, NFR-203対応
 */
export interface ResponsiveConfig {
  breakpoints: {
    mobile: number // 768px未満
    tablet: number // 768px以上
    desktop: number // 1024px以上
  }
  mobileAdaptations: {
    legendPosition: 'top' | 'bottom' | 'vertical'
    chartHeight: number
    tooltipBehavior: 'hover' | 'tap'
    simplifiedView: boolean
  }
}

/**
 * タッチデバイス対応
 * 要件: EDGE-202対応
 */
export interface TouchInteraction {
  enableTapTooltip: boolean
  tapHoldDuration: number
  gestureSupport: {
    pinchZoom: boolean
    panScroll: boolean
  }
}

// ============================================================================
// PERFORMANCE AND CACHING
// ============================================================================

/**
 * パフォーマンス設定
 * 要件: NFR-001, NFR-002, NFR-003対応
 */
export interface PerformanceConfig {
  renderingTimeout: number // 1000ms (NFR-001)
  toggleResponseTime: number // 500ms (NFR-002)
  tooltipDelay: number // 200ms (NFR-003)
  memoization: {
    enableChartData: boolean
    enableTooltipData: boolean
    cacheSize: number
  }
  virtualization: {
    threshold: number // 1000ポイント以上で適用 (EDGE-102)
    windowSize: number
  }
}

/**
 * キャッシュ管理
 */
export interface ChartDataCache {
  key: string
  data: MultiLineChartData
  timestamp: number
  ttl: number
  platformBreakdown: boolean
  dailyBreakdown: boolean
}

// ============================================================================
// MIGRATION AND BACKWARD COMPATIBILITY
// ============================================================================

/**
 * 移行サポート
 * 要件: REQ-303対応 (ワンタイムメッセージ)
 */
export interface MigrationHelper {
  showMigrationMessage: boolean
  migrationMessageDismissed: boolean
  legacyDataConverter: (oldData: any) => EnhancedAdPerformanceData
  compatibilityMode: boolean
}

/**
 * 集約設定 (簡素化後)
 * 要件: REQ-001対応 (常に集約表示)
 */
export interface SimplifiedAggregationConfig {
  alwaysEnabled: true // 固定値
  showToggle: false // 固定値 (REQ-001)
  defaultGroupBy: 'ad' | 'adset' | 'campaign'
  includePlatformBreakdown: true // 固定値
  includeDailyBreakdown: boolean
}

// ============================================================================
// EXPORT AND UTILITY TYPES
// ============================================================================

/**
 * CSVエクスポート用データ
 * 要件: REQ-302対応 (オプション機能)
 */
export interface ExportData {
  format: 'csv' | 'excel' | 'json'
  data: EnhancedAdPerformanceData[]
  includeMetadata: boolean
  platformBreakdown: boolean
  dateRange: { start: string; end: string }
}

/**
 * ユーティリティ型定義
 */
export type MetricValue = number | null | undefined
export type OptionalPlatform<T> = Partial<Record<PlatformType, T>>
export type RequiredPlatform<T> = Record<PlatformType, T>

/**
 * 型ガード関数用の型定義
 */
export interface TypeGuards {
  isPlatformSpecificData: (data: any) => data is PlatformSpecificMetrics
  isValidChartData: (data: any) => data is MultiLineChartData
  hasAllPlatforms: (data: any) => data is RequiredPlatform<BaseMetrics>
  isConsistentData: (data: any) => data is DataConsistencyResult
}

/**
 * 変換ユーティリティ型定義
 */
export interface DataTransformers {
  legacyToEnhanced: (legacy: any[]) => EnhancedAdPerformanceData[]
  enhancedToChart: (
    enhanced: EnhancedAdPerformanceData[],
    metric: ChartMetricType
  ) => MultiLineChartData
  platformBreakdownToTimeSeries: (
    breakdown: Record<PlatformType, BaseMetrics>[]
  ) => PlatformTimeSeriesData[]
  validateAndAdjust: (data: PlatformSpecificMetrics[]) => DataConsistencyResult
}
