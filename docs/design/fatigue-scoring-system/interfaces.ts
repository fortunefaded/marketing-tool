// 広告疲労度スコアリングシステム TypeScript インターフェース定義

// ============================================================================
// Core Types - 基本型定義
// ============================================================================

export type FatigueStatus = 'healthy' | 'warning' | 'critical'

export type AdType = 'video' | 'image' | 'carousel' | 'collection'

export type InstagramAdType = 'feed' | 'reel' | 'story'

export type Platform = 'facebook' | 'instagram' | 'audience_network'

export type CalculationConfidence = number // 0.0 - 1.0

// ============================================================================
// Raw Metrics Types - 生メトリクス型定義
// ============================================================================

export interface BaseMetrics {
  // Basic Performance Metrics
  adSpend: number
  impressions: number
  clicks: number
  conversions: number
  reach: number
  
  // Rate Metrics
  ctr: number                    // Click Through Rate
  uniqueCtr: number              // Unique Click Through Rate
  inlineLinkClickCtr: number     // Inline Link Click Through Rate
  cpc: number                    // Cost Per Click
  cpm: number                    // Cost Per Mille (1000 impressions)
  frequency: number              // Average frequency per person
  
  // Time Period
  dateStart: string              // YYYY-MM-DD
  dateStop: string               // YYYY-MM-DD
  
  // Data Quality
  dataCompleteness: number       // 0.0 - 1.0
}

export interface InstagramMetrics {
  // Instagram Specific Metrics
  profileViews: number           // Profile visits
  followerCount: number          // New followers gained
  
  // Engagement Metrics
  likes: number
  comments: number
  saves: number
  shares: number
  
  // Calculated Metrics
  profileVisitRate: number       // profileViews / impressions * 100
  followRate: number             // followerCount / reach * 100
  engagementRate: number         // total engagements / reach * 100
  
  // Platform Context
  adType: InstagramAdType
  placement: string[]            // feed, story, reels, explore
}

export interface MetaAdInsights extends BaseMetrics {
  // Meta API Specific Fields
  adId: string
  adName: string
  campaignId: string
  campaignName: string
  adsetId: string
  adsetName: string
  accountId: string
  
  // Creative Information
  adType: AdType
  platform: Platform[]
  
  // Instagram Data (optional)
  instagramMetrics?: InstagramMetrics
  
  // API Metadata
  apiVersion: string
  retrievedAt: string
}

// ============================================================================
// Baseline Types - ベースライン型定義
// ============================================================================

export interface BaselineMetrics {
  // Performance Baselines (30-day average)
  ctr: number
  uniqueCtr: number
  inlineLinkClickCtr: number
  cpm: number
  frequency: number
  engagementRate?: number        // Instagram only
  
  // Baseline Metadata
  calculationPeriod: {
    start: string                // YYYY-MM-DD
    end: string                  // YYYY-MM-DD
    daysIncluded: number         // Actual days with data
  }
  
  // Quality Indicators
  dataQuality: CalculationConfidence
  isIndustryAverage: boolean     // True if using industry average as baseline
  confidence: CalculationConfidence
  
  // Calculation Details
  calculatedAt: string
  version: string                // Baseline calculation version
}

export interface BaselineCalculationRequest {
  adId: string
  accountId: string
  forceRecalculation?: boolean
  customPeriod?: {
    start: string
    end: string
  }
}

// ============================================================================
// Fatigue Calculation Types - 疲労度計算型定義
// ============================================================================

export interface CreativeFatigueMetrics {
  // CTR Analysis
  baselineCtr: number
  currentCtr: number
  ctrDeclineRate: number         // Percentage decline from baseline
  
  // Unique CTR Analysis
  baselineUniqueCtr: number
  currentUniqueCtr: number
  uniqueCtrDeclineRate: number
  
  // Link Click Analysis
  baselineLinkClickCtr: number
  currentLinkClickCtr: number
  linkClickDeclineRate: number
  
  // Scoring Components
  ctrImpact: number              // Impact on fatigue score
  uniqueCtrImpact: number
  linkClickImpact: number
}

export interface AudienceFatigueMetrics {
  // Frequency Analysis
  currentFrequency: number
  frequencyThreshold: number     // Default: 3.5
  frequencyImpact: number        // Impact on fatigue score
  
  // First Impression Analysis
  estimatedFirstImpressionRatio: number
  optimalFirstImpressionRatio: number    // Default: 0.7
  firstImpressionImpact: number
  
  // Audience Saturation
  audienceSaturation: number     // 0.0 - 1.0
}

export interface AlgorithmFatigueMetrics {
  // CPM Analysis  
  baselineCpm: number
  currentCpm: number
  cpmIncreaseRate: number        // Percentage increase from baseline
  cpmThreshold: number           // Default: 20% increase
  
  // Delivery Volume Analysis
  baselineImpressions: number
  currentImpressions: number
  deliveryVolumeDeclineRate: number
  
  // Algorithm Health Indicators
  deliveryHealth: number         // 0.0 - 1.0
  algorithmConfidence: number    // Meta's confidence in ad delivery
}

export interface FatigueScore {
  // Individual Scores (0-100)
  creativeScore: number
  audienceScore: number  
  algorithmScore: number
  
  // Composite Score
  totalScore: number             // Weighted average of above
  
  // Status Determination
  status: FatigueStatus
  primaryIssue: 'creative' | 'audience' | 'algorithm' | null
  
  // Confidence and Quality
  confidence: CalculationConfidence
  dataQuality: CalculationConfidence
  
  // Calculation Metadata
  calculatedAt: string
  version: string                // Algorithm version
  weights: {
    creative: number             // Default: 0.4
    audience: number             // Default: 0.35
    algorithm: number            // Default: 0.25
  }
}

// ============================================================================
// Comprehensive Fatigue Analysis - 包括的疲労度分析
// ============================================================================

export interface FatigueAnalysis {
  // Target Creative
  adId: string
  adName: string
  campaignName: string
  adType: AdType
  platform: Platform[]
  
  // Raw Data
  currentMetrics: MetaAdInsights
  baselineMetrics: BaselineMetrics
  
  // Detailed Analysis
  creativeAnalysis: {
    metrics: CreativeFatigueMetrics
    score: number
    issues: string[]
    recommendations: string[]
  }
  
  audienceAnalysis: {
    metrics: AudienceFatigueMetrics
    score: number
    issues: string[]
    recommendations: string[]
  }
  
  algorithmAnalysis: {
    metrics: AlgorithmFatigueMetrics
    score: number
    issues: string[]
    recommendations: string[]
  }
  
  // Instagram Specific (if applicable)
  instagramAnalysis?: {
    metrics: InstagramMetrics
    engagementThreshold: number
    performanceBenchmark: {
      engagementRate: number
      profileVisitRate: number
      followRate: number
    }
    issues: string[]
    recommendations: string[]
  }
  
  // Overall Results
  fatigueScore: FatigueScore
  overallRecommendations: string[]
  
  // Alerts and Warnings
  alerts: Array<{
    level: 'info' | 'warning' | 'critical'
    message: string
    metric: string
    value: number
    threshold: number
    action?: string
  }>
  
  // Analysis Metadata
  analysisId: string
  analyzedAt: string
  analysisVersion: string
  processingTime: number         // milliseconds
}

// ============================================================================
// Calculation Engine Types - 計算エンジン型定義
// ============================================================================

export interface FatigueCalculationConfig {
  // Creative Fatigue Thresholds
  creative: {
    ctrDeclineWarning: number    // Default: 25%
    ctrDeclineCritical: number   // Default: 50%
    weights: {
      ctr: number                // Default: 2.0
      uniqueCtr: number          // Default: 1.5  
      linkClickCtr: number       // Default: 1.0
    }
  }
  
  // Audience Fatigue Thresholds
  audience: {
    frequencyWarning: number     // Default: 3.5
    frequencyCritical: number    // Default: 5.0
    optimalFirstImpressionRatio: number // Default: 0.7
    weights: {
      frequency: number          // Default: 3.0
      firstImpression: number    // Default: 2.0
    }
  }
  
  // Algorithm Fatigue Thresholds
  algorithm: {
    cpmIncreaseWarning: number   // Default: 20%
    cpmIncreaseCritical: number  // Default: 40%
    weights: {
      cpmIncrease: number        // Default: 2.5
      deliveryVolume: number     // Default: 1.5
    }
  }
  
  // Overall Scoring
  overallWeights: {
    creative: number             // Default: 0.4
    audience: number             // Default: 0.35
    algorithm: number            // Default: 0.25  
  }
  
  // Score Thresholds
  scoreThresholds: {
    healthy: number              // Default: 80
    warning: number              // Default: 50
  }
  
  // Instagram Specific
  instagram: {
    engagementThresholds: {
      feed: number               // Default: 0.7%
      reel: number               // Default: 1.23%
      story: number              // Default: 0.5%
    }
  }
}

export interface CalculationRequest {
  adId: string
  accountId: string
  config?: Partial<FatigueCalculationConfig>
  forceRefresh?: boolean
  includeInstagram?: boolean
}

export interface CalculationResult {
  success: boolean
  analysis?: FatigueAnalysis
  error?: {
    code: string
    message: string
    details?: any
  }
  processingMetrics: {
    startTime: string
    endTime: string
    duration: number             // milliseconds
    apiCalls: number
    cacheHits: number
    dataQuality: CalculationConfidence
  }
}

// ============================================================================
// Batch Processing Types - バッチ処理型定義
// ============================================================================

export interface BatchProcessingRequest {
  accountId: string
  adIds?: string[]               // If not specified, process all ads
  config?: Partial<FatigueCalculationConfig>
  prioritization?: 'spend' | 'performance' | 'random'
  maxConcurrency?: number        // Default: 10
}

export interface BatchProcessingResult {
  requestId: string
  totalAds: number
  processedAds: number
  successfulAds: number
  failedAds: number
  
  results: CalculationResult[]
  errors: Array<{
    adId: string
    error: string
  }>
  
  summary: {
    averageScore: number
    statusBreakdown: {
      healthy: number
      warning: number
      critical: number
    }
    topIssues: Array<{
      issue: string
      count: number
      percentage: number
    }>
  }
  
  processingMetrics: {
    totalDuration: number        // milliseconds
    averageDurationPerAd: number
    totalApiCalls: number
    cacheHitRate: number
  }
}

// ============================================================================
// Data Validation Types - データ検証型定義
// ============================================================================

export interface ValidationRule {
  field: string
  validator: (value: any) => boolean
  message: string
  severity: 'error' | 'warning'
  action: 'exclude' | 'interpolate' | 'notify' | 'flag'
}

export interface ValidationResult {
  isValid: boolean
  confidence: CalculationConfidence
  issues: Array<{
    field: string
    issue: string
    severity: 'error' | 'warning'
    value: any
    expectedRange?: {
      min: number
      max: number
    }
  }>
  
  appliedActions: Array<{
    field: string
    action: string
    originalValue: any
    newValue?: any
    reason: string
  }>
}

export interface DataValidationConfig {
  rules: {
    ctr: { min: number; max: number }      // 0-10%
    cpm: { min: number; max: number }      // >0, <10000
    frequency: { min: number; max: number } // 0-20
    impressions: { min: number }           // >0
  }
  
  tolerances: {
    missingDataThreshold: number    // 30%
    anomalyDetectionSensitivity: number
  }
  
  fallbackStrategies: {
    useIndustryAverageWhenMissing: boolean
    interpolateFromRecentData: boolean
    maxInterpolationDays: number
  }
}

// ============================================================================
// Recommendation Engine Types - 推奨エンジン型定義
// ============================================================================

export interface Recommendation {
  id: string
  category: 'creative' | 'audience' | 'algorithm' | 'general'
  priority: 'high' | 'medium' | 'low'
  
  title: string
  description: string
  actionItems: string[]
  
  expectedImpact: {
    scoreImprovement: number     // Expected score improvement
    confidence: CalculationConfidence
    timeframe: string           // "1-2 weeks", "immediate", etc.
  }
  
  requirements: {
    effort: 'low' | 'medium' | 'high'
    budget: 'none' | 'low' | 'medium' | 'high'
    expertise: 'basic' | 'intermediate' | 'advanced'
  }
  
  relatedMetrics: string[]      // Which metrics this affects
}

export interface RecommendationRequest {
  analysis: FatigueAnalysis
  context?: {
    budget: number
    campaignObjective: string
    targetAudience: string
    seasonality?: string
  }
}

// ============================================================================
// Alert System Types - アラートシステム型定義
// ============================================================================

export interface Alert {
  id: string
  adId: string
  level: 'info' | 'warning' | 'critical'
  
  title: string
  message: string
  details: string
  
  triggeredBy: {
    metric: string
    currentValue: number
    thresholdValue: number
    comparisonType: 'above' | 'below' | 'equal'
  }
  
  recommendations: string[]
  
  // Alert Management
  status: 'active' | 'acknowledged' | 'resolved'
  createdAt: string
  acknowledgedAt?: string
  resolvedAt?: string
  acknowledgedBy?: string
  
  // Notification Settings
  shouldNotify: boolean
  notificationChannels: Array<'email' | 'dashboard' | 'webhook'>
}

export interface AlertRule {
  id: string
  name: string
  condition: {
    metric: string
    operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte'
    value: number
    duration?: number           // Alert only if condition persists (minutes)
  }
  
  actions: Array<{
    type: 'email' | 'webhook' | 'dashboard'
    config: any
  }>
  
  enabled: boolean
  accountId?: string            // If null, applies to all accounts
}

// ============================================================================
// Historical Data Types - 履歴データ型定義
// ============================================================================

export interface FatigueHistory {
  adId: string
  records: Array<{
    date: string               // YYYY-MM-DD
    fatigueScore: FatigueScore
    metrics: MetaAdInsights
    events?: Array<{
      type: string
      description: string
      timestamp: string
    }>
  }>
  
  trends: {
    scoreChange: number        // Change over last 7 days
    trendDirection: 'improving' | 'stable' | 'declining'
    volatility: number         // Score volatility measure
  }
  
  insights: {
    bestPerformingPeriod: {
      start: string
      end: string
      averageScore: number
    }
    worstPerformingPeriod: {
      start: string
      end: string
      averageScore: number
    }
    patterns: string[]         // Identified patterns
  }
}

// ============================================================================
// API Response Types - APIレスポンス型定義
// ============================================================================

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: any
  }
  metadata: {
    timestamp: string
    version: string
    requestId: string
    processingTime?: number
  }
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number
    pageSize: number
    totalRecords: number
    totalPages: number
    hasNext: boolean
    hasPrevious: boolean
  }
}

// ============================================================================
// Hook Types - React Hook型定義
// ============================================================================

export interface UseFatigueAnalysisOptions {
  adId: string
  autoRefresh?: boolean
  refreshInterval?: number     // minutes
  includeInstagram?: boolean
  config?: Partial<FatigueCalculationConfig>
}

export interface UseFatigueAnalysisReturn {
  analysis: FatigueAnalysis | null
  isLoading: boolean
  error: Error | null
  
  // Actions
  refresh: () => Promise<void>
  updateConfig: (config: Partial<FatigueCalculationConfig>) => void
  
  // State Info
  lastUpdated?: string
  dataSource: 'cache' | 'api'
  confidence: CalculationConfidence
}

export interface UseBatchFatigueAnalysisOptions {
  accountId: string
  autoRefresh?: boolean
  refreshInterval?: number
  config?: Partial<FatigueCalculationConfig>
}

export interface UseBatchFatigueAnalysisReturn {
  analyses: FatigueAnalysis[]
  isLoading: boolean
  error: Error | null
  progress?: {
    processed: number
    total: number
    percentage: number
  }
  
  // Actions
  refresh: () => Promise<void>
  refreshSpecific: (adIds: string[]) => Promise<void>
  
  // Summary Data
  summary: {
    totalAds: number
    averageScore: number
    statusBreakdown: {
      healthy: number
      warning: number
      critical: number
    }
  }
}

// ============================================================================
// Component Props Types - コンポーネントProps型定義  
// ============================================================================

export interface FatigueScoreCardProps {
  analysis: FatigueAnalysis
  showDetails?: boolean
  onScoreClick?: (analysis: FatigueAnalysis) => void
  className?: string
}

export interface FatigueBreakdownChartProps {
  fatigueScore: FatigueScore
  showLabels?: boolean
  interactive?: boolean
  size?: 'small' | 'medium' | 'large'
  onSegmentClick?: (segment: 'creative' | 'audience' | 'algorithm') => void
}

export interface InstagramMetricsDisplayProps {
  metrics: InstagramMetrics
  benchmarks?: {
    engagementRate: number
    profileVisitRate: number
    followRate: number
  }
  showComparison?: boolean
}

export interface RecommendationPanelProps {
  recommendations: Recommendation[]
  onActionClick?: (recommendation: Recommendation, actionIndex: number) => void
  maxDisplayed?: number
  priorityFilter?: Array<'high' | 'medium' | 'low'>
}

export interface TrendChartProps {
  history: FatigueHistory
  period?: 'week' | 'month' | 'quarter'
  metrics?: Array<'total' | 'creative' | 'audience' | 'algorithm'>
  showEvents?: boolean
  onPointClick?: (date: string, score: FatigueScore) => void
}

// ============================================================================
// Configuration Types - 設定型定義
// ============================================================================

export interface SystemConfig {
  // Calculation Settings
  calculation: FatigueCalculationConfig
  
  // Data Settings
  dataRetention: {
    rawMetrics: number         // days
    fatigueAnalysis: number    // days
    alerts: number             // days
  }
  
  // Performance Settings
  performance: {
    batchSize: number          // Default: 10
    maxConcurrency: number     // Default: 5
    cacheTimeout: number       // minutes
    calculationTimeout: number // seconds
  }
  
  // API Settings
  api: {
    metaApiVersion: string
    instagramApiVersion: string
    rateLimits: {
      meta: number             // requests per hour
      instagram: number        // requests per hour
    }
  }
  
  // UI Settings
  ui: {
    defaultRefreshInterval: number // minutes
    maxDisplayedRecommendations: number
    colorScheme: {
      healthy: string
      warning: string  
      critical: string
    }
  }
  
  // Feature Flags
  features: {
    instagramIntegration: boolean
    batchProcessing: boolean
    alertSystem: boolean
    historicalAnalysis: boolean
    recommendationEngine: boolean
  }
}

// ============================================================================
// Utility Types - ユーティリティ型定義
// ============================================================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>

export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

export type FatigueMetricKey = 
  | 'ctr' | 'uniqueCtr' | 'inlineLinkClickCtr' 
  | 'frequency' | 'cpm' | 'engagementRate'

export type ScoreComponent = 'creative' | 'audience' | 'algorithm' | 'total'

// ============================================================================
// Type Guards - 型ガード関数型定義
// ============================================================================

export type TypeGuard<T> = (value: unknown) => value is T

export interface FatigueTypeGuards {
  isMetaAdInsights: TypeGuard<MetaAdInsights>
  isInstagramMetrics: TypeGuard<InstagramMetrics>
  isFatigueAnalysis: TypeGuard<FatigueAnalysis>
  isFatigueScore: TypeGuard<FatigueScore>
  isBaselineMetrics: TypeGuard<BaselineMetrics>
  isValidFatigueStatus: TypeGuard<FatigueStatus>
  isValidAdType: TypeGuard<AdType>
}

// ============================================================================
// Event Types - イベント型定義
// ============================================================================

export interface FatigueAnalysisEvent {
  type: 'analysis_started' | 'analysis_completed' | 'analysis_failed'
  adId: string
  timestamp: string
  duration?: number
  error?: string
}

export interface AlertEvent {
  type: 'alert_triggered' | 'alert_acknowledged' | 'alert_resolved'
  alertId: string
  adId: string
  level: 'info' | 'warning' | 'critical'
  timestamp: string
  userId?: string
}

export interface BatchProcessingEvent {
  type: 'batch_started' | 'batch_progress' | 'batch_completed' | 'batch_failed'
  batchId: string
  totalAds?: number
  processedAds?: number
  timestamp: string
  error?: string
}

export type FatigueSystemEvent = 
  | FatigueAnalysisEvent 
  | AlertEvent 
  | BatchProcessingEvent