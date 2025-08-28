// Meta API Pagination System - Convex Schema Definitions
// Phase 1: Foundation Tables for Complete Data Retrieval

import { defineTable } from 'convex/server'
import { v } from 'convex/values'

// ============================================================================
// Core Data Retrieval Tables
// ============================================================================

/**
 * データ取得履歴テーブル
 * Meta APIからのデータ取得セッションを記録
 */
export const dataRetrievalHistory = defineTable({
  // Session identification
  sessionId: v.string(),
  accountId: v.string(),
  
  // Request parameters
  dateRange: v.object({
    start: v.string(), // YYYY-MM-DD
    end: v.string(),   // YYYY-MM-DD
  }),
  requestedAt: v.string(), // ISO timestamp
  
  // Retrieval results
  status: v.union(
    v.literal('pending'),
    v.literal('fetching'),
    v.literal('processing'),
    v.literal('complete'),
    v.literal('error')
  ),
  totalPages: v.number(),
  pagesRetrieved: v.number(),
  totalItems: v.number(),
  
  // Delivery analysis
  deliveryAnalysis: v.object({
    totalRequestedDays: v.number(),
    actualDeliveryDays: v.number(),
    deliveryRatio: v.number(), // 0-1
    deliveryPattern: v.union(
      v.literal('continuous'),
      v.literal('partial'),
      v.literal('intermittent'),
      v.literal('single'),
      v.literal('none')
    ),
    firstDeliveryDate: v.optional(v.string()),
    lastDeliveryDate: v.optional(v.string()),
  }),
  
  // Performance metrics
  processingTimeMs: v.number(),
  apiCallCount: v.number(),
  errorCount: v.number(),
  
  // Metadata
  completedAt: v.optional(v.string()),
  errorMessage: v.optional(v.string()),
  userAgent: v.optional(v.string()),
})
  .index('by_account', ['accountId'])
  .index('by_status', ['status'])
  .index('by_requested_at', ['requestedAt'])
  .index('by_session', ['sessionId'])

/**
 * API呼び出し詳細テーブル
 * 個々のAPI呼び出しを記録
 */
export const apiCallDetails = defineTable({
  // Reference to retrieval session
  sessionId: v.string(),
  
  // Call details
  callId: v.string(),
  endpoint: v.string(),
  method: v.string(),
  
  // Pagination info
  pageNumber: v.number(),
  itemsInPage: v.number(),
  hasNextPage: v.boolean(),
  nextCursor: v.optional(v.string()),
  
  // Response info
  statusCode: v.number(),
  responseTimeMs: v.number(),
  rateLimitRemaining: v.optional(v.number()),
  
  // Error handling
  retryCount: v.number(),
  errorType: v.optional(v.union(
    v.literal('network'),
    v.literal('auth'),
    v.literal('rate_limit'),
    v.literal('api'),
    v.literal('unknown')
  )),
  errorMessage: v.optional(v.string()),
  
  // Timestamp
  calledAt: v.string(),
})
  .index('by_session', ['sessionId'])
  .index('by_called_at', ['calledAt'])
  .index('by_status_code', ['statusCode'])

/**
 * 配信パターン分析テーブル
 * 広告配信パターンの詳細分析結果
 */
export const deliveryPatternAnalysis = defineTable({
  // Identification
  adId: v.string(),
  accountId: v.string(),
  analysisDate: v.string(),
  
  // Pattern analysis
  pattern: v.object({
    type: v.union(
      v.literal('continuous'),
      v.literal('partial'),
      v.literal('intermittent'),
      v.literal('single'),
      v.literal('none')
    ),
    confidence: v.number(), // 0-1
    
    // Daily patterns
    weekdayPattern: v.array(v.boolean()), // Mon-Fri
    weekendPattern: v.array(v.boolean()), // Sat-Sun
    
    // Hourly distribution (24 hours)
    hourlyDistribution: v.array(v.number()),
    peakHours: v.array(v.number()),
    quietHours: v.array(v.number()),
  }),
  
  // Gap analysis
  gaps: v.array(v.object({
    startDate: v.string(),
    endDate: v.string(),
    durationDays: v.number(),
    severity: v.union(
      v.literal('minor'),
      v.literal('major'),
      v.literal('critical')
    ),
    possibleCause: v.optional(v.union(
      v.literal('budget_exhausted'),
      v.literal('manual_pause'),
      v.literal('policy_violation'),
      v.literal('schedule_setting'),
      v.literal('bid_too_low'),
      v.literal('audience_exhausted'),
      v.literal('creative_rejected'),
      v.literal('technical_error'),
      v.literal('unknown')
    )),
  })),
  
  // Metadata
  createdAt: v.string(),
  updatedAt: v.string(),
})
  .index('by_ad', ['adId'])
  .index('by_account', ['accountId'])
  .index('by_analysis_date', ['analysisDate'])

// ============================================================================
// Timeline Feature Tables
// ============================================================================

/**
 * タイムラインデータテーブル
 * 日別の配信状況を記録
 */
export const timelineData = defineTable({
  // Identification
  adId: v.string(),
  accountId: v.string(),
  date: v.string(), // YYYY-MM-DD
  
  // Delivery status
  hasDelivery: v.boolean(),
  deliveryIntensity: v.number(), // 0-5
  
  // Metrics
  metrics: v.object({
    impressions: v.number(),
    clicks: v.number(),
    spend: v.number(),
    reach: v.number(),
    frequency: v.number(),
    ctr: v.number(),
    cpc: v.number(),
    cpm: v.number(),
    conversions: v.number(),
    conversionRate: v.number(),
  }),
  
  // Comparisons
  comparisonFlags: v.object({
    vsYesterday: v.union(
      v.literal('up'),
      v.literal('down'),
      v.literal('stable'),
      v.literal('no_data')
    ),
    vsLastWeek: v.union(
      v.literal('up'),
      v.literal('down'),
      v.literal('stable'),
      v.literal('no_data')
    ),
    vsBaseline: v.union(
      v.literal('normal'),
      v.literal('warning'),
      v.literal('critical')
    ),
    percentageChange: v.object({
      daily: v.number(),
      weekly: v.number(),
      monthly: v.number(),
    }),
  }),
  
  // Anomaly flags
  anomalies: v.array(v.string()), // Array of anomaly type IDs
  
  // Metadata
  createdAt: v.string(),
  updatedAt: v.string(),
})
  .index('by_ad_date', ['adId', 'date'])
  .index('by_account_date', ['accountId', 'date'])
  .index('by_delivery_status', ['hasDelivery'])

/**
 * 異常検知テーブル
 * 検出された異常を記録
 */
export const anomalyDetections = defineTable({
  // Identification
  anomalyId: v.string(),
  adId: v.string(),
  accountId: v.string(),
  
  // Anomaly details
  type: v.union(
    v.literal('sudden_stop'),
    v.literal('performance_drop'),
    v.literal('spend_spike'),
    v.literal('intermittent'),
    v.literal('high_frequency'),
    v.literal('low_ctr'),
    v.literal('high_cpm'),
    v.literal('budget_pacing'),
    v.literal('audience_saturation')
  ),
  severity: v.union(
    v.literal('low'),
    v.literal('medium'),
    v.literal('high'),
    v.literal('critical')
  ),
  
  // Detection info
  detectedAt: v.string(),
  dateRange: v.object({
    start: v.string(),
    end: v.string(),
  }),
  confidence: v.number(), // 0-1
  
  // Impact metrics
  metrics: v.object({
    impactScore: v.number(), // 0-100
    affectedSpend: v.number(),
    lostOpportunities: v.number(),
    deviationFromBaseline: v.number(),
  }),
  
  // Status and resolution
  status: v.union(
    v.literal('active'),
    v.literal('resolved'),
    v.literal('acknowledged')
  ),
  message: v.string(),
  recommendation: v.string(),
  
  // Metadata
  resolvedAt: v.optional(v.string()),
  acknowledgedBy: v.optional(v.string()),
  notes: v.optional(v.string()),
})
  .index('by_ad', ['adId'])
  .index('by_account', ['accountId'])
  .index('by_type', ['type'])
  .index('by_severity', ['severity'])
  .index('by_status', ['status'])
  .index('by_detected_at', ['detectedAt'])

/**
 * ギャップ分析テーブル
 * 配信停止期間の詳細分析
 */
export const gapAnalysis = defineTable({
  // Identification
  gapId: v.string(),
  adId: v.string(),
  accountId: v.string(),
  
  // Gap details
  startDate: v.string(),
  endDate: v.string(),
  durationDays: v.number(),
  
  // Analysis
  severity: v.union(
    v.literal('minor'),
    v.literal('major'),
    v.literal('critical')
  ),
  inferredCause: v.union(
    v.literal('budget_exhausted'),
    v.literal('manual_pause'),
    v.literal('policy_violation'),
    v.literal('schedule_setting'),
    v.literal('bid_too_low'),
    v.literal('audience_exhausted'),
    v.literal('creative_rejected'),
    v.literal('technical_error'),
    v.literal('unknown')
  ),
  causeConfidence: v.number(), // 0-1
  
  // Impact
  affectedMetrics: v.object({
    missedImpressions: v.number(),
    missedSpend: v.number(),
    missedConversions: v.number(),
  }),
  
  // Context
  precedingMetrics: v.optional(v.object({
    avgSpend: v.number(),
    avgCTR: v.number(),
    avgFrequency: v.number(),
  })),
  
  // Metadata
  analyzedAt: v.string(),
  notes: v.optional(v.string()),
})
  .index('by_ad', ['adId'])
  .index('by_account', ['accountId'])
  .index('by_severity', ['severity'])
  .index('by_start_date', ['startDate'])

// ============================================================================
// Cache Management Tables
// ============================================================================

/**
 * タイムラインキャッシュテーブル
 * タイムラインデータのキャッシュ管理
 */
export const timelineCache = defineTable({
  // Cache key
  cacheKey: v.string(),
  accountId: v.string(),
  
  // Cache info
  layer: v.union(
    v.literal('memory'),
    v.literal('localStorage'),
    v.literal('convex')
  ),
  dataType: v.union(
    v.literal('timeline'),
    v.literal('anomalies'),
    v.literal('gaps'),
    v.literal('baseline')
  ),
  
  // TTL management
  createdAt: v.string(),
  expiresAt: v.string(),
  ttlSeconds: v.number(),
  
  // Data freshness
  dataFreshness: v.union(
    v.literal('realtime'),  // < 5 min
    v.literal('recent'),    // < 1 hour
    v.literal('historical') // > 1 hour
  ),
  
  // Cache stats
  hitCount: v.number(),
  lastAccessedAt: v.string(),
  sizeBytes: v.number(),
  
  // Differential update support
  supportsDifferential: v.boolean(),
  lastDifferentialAt: v.optional(v.string()),
  
  // Data reference
  dataId: v.string(), // Reference to actual data table
})
  .index('by_cache_key', ['cacheKey'])
  .index('by_account', ['accountId'])
  .index('by_layer', ['layer'])
  .index('by_expires_at', ['expiresAt'])

/**
 * パフォーマンス統計テーブル
 * システムパフォーマンスの追跡
 */
export const performanceStats = defineTable({
  // Period identification
  statDate: v.string(), // YYYY-MM-DD
  accountId: v.string(),
  
  // Cache performance
  cacheStats: v.object({
    hitRate: v.number(), // 0-1
    apiCallsSaved: v.number(),
    storageUsage: v.object({
      memory: v.number(),      // bytes
      localStorage: v.number(), // bytes
      convex: v.number(),      // bytes
    }),
  }),
  
  // Response times
  performanceMetrics: v.object({
    avgResponseTime: v.number(),    // ms
    cacheResponseTime: v.number(),  // ms
    apiResponseTime: v.number(),    // ms
    p95ResponseTime: v.number(),    // ms
    p99ResponseTime: v.number(),    // ms
  }),
  
  // API usage
  apiUsage: v.object({
    totalCalls: v.number(),
    successfulCalls: v.number(),
    failedCalls: v.number(),
    rateLimitHits: v.number(),
  }),
  
  // Data quality
  dataQuality: v.object({
    completenessScore: v.number(), // 0-1
    anomalyDetectionRate: v.number(),
    falsePositiveRate: v.number(),
  }),
  
  // Metadata
  createdAt: v.string(),
})
  .index('by_date', ['statDate'])
  .index('by_account', ['accountId'])