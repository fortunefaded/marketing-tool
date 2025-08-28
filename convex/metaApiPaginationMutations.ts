// Meta API Pagination System - Convex Mutations
// Database operations for pagination data management

import { mutation } from './_generated/server'
import { v } from 'convex/values'

// ============================================================================
// Data Retrieval History Mutations
// ============================================================================

/**
 * Create a new data retrieval session
 */
export const createRetrievalSession = mutation({
  args: {
    sessionId: v.string(),
    accountId: v.string(),
    dateRange: v.object({
      start: v.string(),
      end: v.string(),
    }),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('dataRetrievalHistory', {
      ...args,
      requestedAt: new Date().toISOString(),
      status: 'pending',
      totalPages: 0,
      pagesRetrieved: 0,
      totalItems: 0,
      deliveryAnalysis: {
        totalRequestedDays: 0,
        actualDeliveryDays: 0,
        deliveryRatio: 0,
        deliveryPattern: 'none',
        firstDeliveryDate: undefined,
        lastDeliveryDate: undefined,
      },
      processingTimeMs: 0,
      apiCallCount: 0,
      errorCount: 0,
    })
  },
})

/**
 * Update retrieval session progress
 */
export const updateRetrievalProgress = mutation({
  args: {
    sessionId: v.string(),
    status: v.union(
      v.literal('pending'),
      v.literal('fetching'),
      v.literal('processing'),
      v.literal('complete'),
      v.literal('error')
    ),
    pagesRetrieved: v.optional(v.number()),
    totalPages: v.optional(v.number()),
    totalItems: v.optional(v.number()),
    apiCallCount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query('dataRetrievalHistory')
      .withIndex('by_session', q => q.eq('sessionId', args.sessionId))
      .first()
    
    if (!session) {
      throw new Error(`Session ${args.sessionId} not found`)
    }
    
    const updates: any = {
      status: args.status,
    }
    
    if (args.pagesRetrieved !== undefined) {
      updates.pagesRetrieved = args.pagesRetrieved
    }
    if (args.totalPages !== undefined) {
      updates.totalPages = args.totalPages
    }
    if (args.totalItems !== undefined) {
      updates.totalItems = args.totalItems
    }
    if (args.apiCallCount !== undefined) {
      updates.apiCallCount = args.apiCallCount
    }
    
    if (args.status === 'complete') {
      updates.completedAt = new Date().toISOString()
      const startTime = new Date(session.requestedAt).getTime()
      updates.processingTimeMs = Date.now() - startTime
    }
    
    return await ctx.db.patch(session._id, updates)
  },
})

/**
 * Update delivery analysis results
 */
export const updateDeliveryAnalysis = mutation({
  args: {
    sessionId: v.string(),
    deliveryAnalysis: v.object({
      totalRequestedDays: v.number(),
      actualDeliveryDays: v.number(),
      deliveryRatio: v.number(),
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
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query('dataRetrievalHistory')
      .withIndex('by_session', q => q.eq('sessionId', args.sessionId))
      .first()
    
    if (!session) {
      throw new Error(`Session ${args.sessionId} not found`)
    }
    
    return await ctx.db.patch(session._id, {
      deliveryAnalysis: args.deliveryAnalysis,
    })
  },
})

// ============================================================================
// API Call Details Mutations
// ============================================================================

/**
 * Log an API call
 */
export const logApiCall = mutation({
  args: {
    sessionId: v.string(),
    callId: v.string(),
    endpoint: v.string(),
    method: v.string(),
    pageNumber: v.number(),
    itemsInPage: v.number(),
    hasNextPage: v.boolean(),
    nextCursor: v.optional(v.string()),
    statusCode: v.number(),
    responseTimeMs: v.number(),
    rateLimitRemaining: v.optional(v.number()),
    retryCount: v.number(),
    errorType: v.optional(v.union(
      v.literal('network'),
      v.literal('auth'),
      v.literal('rate_limit'),
      v.literal('api'),
      v.literal('unknown')
    )),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('apiCallDetails', {
      ...args,
      calledAt: new Date().toISOString(),
    })
  },
})

// ============================================================================
// Timeline Data Mutations
// ============================================================================

/**
 * Upsert timeline data for a specific ad and date
 */
export const upsertTimelineData = mutation({
  args: {
    adId: v.string(),
    accountId: v.string(),
    date: v.string(),
    hasDelivery: v.boolean(),
    deliveryIntensity: v.number(),
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
    anomalies: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('timelineData')
      .withIndex('by_ad_date', q => 
        q.eq('adId', args.adId).eq('date', args.date)
      )
      .first()
    
    const data = {
      ...args,
      updatedAt: new Date().toISOString(),
    }
    
    if (existing) {
      return await ctx.db.patch(existing._id, data)
    } else {
      return await ctx.db.insert('timelineData', {
        ...data,
        createdAt: new Date().toISOString(),
      })
    }
  },
})

// ============================================================================
// Anomaly Detection Mutations
// ============================================================================

/**
 * Create a new anomaly detection
 */
export const createAnomalyDetection = mutation({
  args: {
    anomalyId: v.string(),
    adId: v.string(),
    accountId: v.string(),
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
    dateRange: v.object({
      start: v.string(),
      end: v.string(),
    }),
    confidence: v.number(),
    metrics: v.object({
      impactScore: v.number(),
      affectedSpend: v.number(),
      lostOpportunities: v.number(),
      deviationFromBaseline: v.number(),
    }),
    message: v.string(),
    recommendation: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('anomalyDetections', {
      ...args,
      detectedAt: new Date().toISOString(),
      status: 'active',
    })
  },
})

/**
 * Update anomaly status
 */
export const updateAnomalyStatus = mutation({
  args: {
    anomalyId: v.string(),
    status: v.union(
      v.literal('active'),
      v.literal('resolved'),
      v.literal('acknowledged')
    ),
    acknowledgedBy: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const anomaly = await ctx.db
      .query('anomalyDetections')
      .filter(q => q.eq(q.field('anomalyId'), args.anomalyId))
      .first()
    
    if (!anomaly) {
      throw new Error(`Anomaly ${args.anomalyId} not found`)
    }
    
    const updates: any = {
      status: args.status,
    }
    
    if (args.status === 'resolved') {
      updates.resolvedAt = new Date().toISOString()
    }
    
    if (args.acknowledgedBy) {
      updates.acknowledgedBy = args.acknowledgedBy
    }
    
    if (args.notes) {
      updates.notes = args.notes
    }
    
    return await ctx.db.patch(anomaly._id, updates)
  },
})

// ============================================================================
// Gap Analysis Mutations
// ============================================================================

/**
 * Create gap analysis record
 */
export const createGapAnalysis = mutation({
  args: {
    gapId: v.string(),
    adId: v.string(),
    accountId: v.string(),
    startDate: v.string(),
    endDate: v.string(),
    durationDays: v.number(),
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
    causeConfidence: v.number(),
    affectedMetrics: v.object({
      missedImpressions: v.number(),
      missedSpend: v.number(),
      missedConversions: v.number(),
    }),
    precedingMetrics: v.optional(v.object({
      avgSpend: v.number(),
      avgCTR: v.number(),
      avgFrequency: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('gapAnalysis', {
      ...args,
      analyzedAt: new Date().toISOString(),
    })
  },
})

// ============================================================================
// Cache Management Mutations
// ============================================================================

/**
 * Update cache entry
 */
export const upsertCacheEntry = mutation({
  args: {
    cacheKey: v.string(),
    accountId: v.string(),
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
    ttlSeconds: v.number(),
    dataFreshness: v.union(
      v.literal('realtime'),
      v.literal('recent'),
      v.literal('historical')
    ),
    sizeBytes: v.number(),
    supportsDifferential: v.boolean(),
    dataId: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('timelineCache')
      .withIndex('by_cache_key', q => q.eq('cacheKey', args.cacheKey))
      .first()
    
    const now = new Date()
    const expiresAt = new Date(now.getTime() + args.ttlSeconds * 1000).toISOString()
    
    const data = {
      ...args,
      expiresAt,
      lastAccessedAt: now.toISOString(),
      hitCount: existing ? existing.hitCount + 1 : 1,
    }
    
    if (existing) {
      return await ctx.db.patch(existing._id, data)
    } else {
      return await ctx.db.insert('timelineCache', {
        ...data,
        createdAt: now.toISOString(),
      })
    }
  },
})

/**
 * Clean expired cache entries
 */
export const cleanExpiredCache = mutation({
  args: {},
  handler: async (ctx) => {
    const now = new Date().toISOString()
    const expired = await ctx.db
      .query('timelineCache')
      .filter(q => q.lt(q.field('expiresAt'), now))
      .collect()
    
    for (const entry of expired) {
      await ctx.db.delete(entry._id)
    }
    
    return { deleted: expired.length }
  },
})

// ============================================================================
// Performance Stats Mutations
// ============================================================================

/**
 * Update daily performance statistics
 */
export const updatePerformanceStats = mutation({
  args: {
    statDate: v.string(),
    accountId: v.string(),
    cacheStats: v.object({
      hitRate: v.number(),
      apiCallsSaved: v.number(),
      storageUsage: v.object({
        memory: v.number(),
        localStorage: v.number(),
        convex: v.number(),
      }),
    }),
    performanceMetrics: v.object({
      avgResponseTime: v.number(),
      cacheResponseTime: v.number(),
      apiResponseTime: v.number(),
      p95ResponseTime: v.number(),
      p99ResponseTime: v.number(),
    }),
    apiUsage: v.object({
      totalCalls: v.number(),
      successfulCalls: v.number(),
      failedCalls: v.number(),
      rateLimitHits: v.number(),
    }),
    dataQuality: v.object({
      completenessScore: v.number(),
      anomalyDetectionRate: v.number(),
      falsePositiveRate: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('performanceStats')
      .withIndex('by_date', q => q.eq('statDate', args.statDate))
      .filter(q => q.eq(q.field('accountId'), args.accountId))
      .first()
    
    if (existing) {
      return await ctx.db.patch(existing._id, args)
    } else {
      return await ctx.db.insert('performanceStats', {
        ...args,
        createdAt: new Date().toISOString(),
      })
    }
  },
})