// Meta API Pagination System - Convex Queries
// Database query operations for pagination data retrieval

import { query } from './_generated/server'
import { v } from 'convex/values'

// ============================================================================
// Data Retrieval History Queries
// ============================================================================

/**
 * Get retrieval session by ID
 */
export const getRetrievalSession = query({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('dataRetrievalHistory')
      .withIndex('by_session', q => q.eq('sessionId', args.sessionId))
      .first()
  },
})

/**
 * Get recent retrieval sessions for an account
 */
export const getRecentSessions = query({
  args: {
    accountId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10
    return await ctx.db
      .query('dataRetrievalHistory')
      .withIndex('by_account', q => q.eq('accountId', args.accountId))
      .order('desc')
      .take(limit)
  },
})

/**
 * Get active retrieval sessions
 */
export const getActiveSessions = query({
  args: {
    accountId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query('dataRetrievalHistory')
      .withIndex('by_status', q => q.eq('status', 'fetching'))
    
    if (args.accountId) {
      const results = await query.collect()
      return results.filter(r => r.accountId === args.accountId)
    }
    
    return await query.collect()
  },
})

// ============================================================================
// API Call Details Queries
// ============================================================================

/**
 * Get API call details for a session
 */
export const getSessionApiCalls = query({
  args: {
    sessionId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100
    return await ctx.db
      .query('apiCallDetails')
      .withIndex('by_session', q => q.eq('sessionId', args.sessionId))
      .order('desc')
      .take(limit)
  },
})

/**
 * Get API call statistics
 */
export const getApiCallStats = query({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const calls = await ctx.db
      .query('apiCallDetails')
      .withIndex('by_session', q => q.eq('sessionId', args.sessionId))
      .collect()
    
    const totalCalls = calls.length
    const successfulCalls = calls.filter(c => c.statusCode >= 200 && c.statusCode < 300).length
    const failedCalls = calls.filter(c => c.statusCode >= 400).length
    const rateLimitHits = calls.filter(c => c.statusCode === 429).length
    const totalRetries = calls.reduce((sum, c) => sum + c.retryCount, 0)
    const avgResponseTime = calls.reduce((sum, c) => sum + c.responseTimeMs, 0) / totalCalls
    
    return {
      totalCalls,
      successfulCalls,
      failedCalls,
      rateLimitHits,
      totalRetries,
      avgResponseTime,
      successRate: successfulCalls / totalCalls,
    }
  },
})

// ============================================================================
// Timeline Data Queries
// ============================================================================

/**
 * Get timeline data for an ad within date range
 */
export const getTimelineData = query({
  args: {
    adId: v.string(),
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    const data = await ctx.db
      .query('timelineData')
      .withIndex('by_ad_date')
      .filter(q => 
        q.and(
          q.eq(q.field('adId'), args.adId),
          q.gte(q.field('date'), args.startDate),
          q.lte(q.field('date'), args.endDate)
        )
      )
      .collect()
    
    return data.sort((a, b) => a.date.localeCompare(b.date))
  },
})

/**
 * Get timeline data for multiple ads
 */
export const getBulkTimelineData = query({
  args: {
    adIds: v.array(v.string()),
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    const allData = await Promise.all(
      args.adIds.map(adId =>
        ctx.db
          .query('timelineData')
          .withIndex('by_ad_date')
          .filter(q =>
            q.and(
              q.eq(q.field('adId'), adId),
              q.gte(q.field('date'), args.startDate),
              q.lte(q.field('date'), args.endDate)
            )
          )
          .collect()
      )
    )
    
    return allData.flat().sort((a, b) => {
      const adCompare = a.adId.localeCompare(b.adId)
      if (adCompare !== 0) return adCompare
      return a.date.localeCompare(b.date)
    })
  },
})

/**
 * Get account-wide timeline summary
 */
export const getAccountTimelineSummary = query({
  args: {
    accountId: v.string(),
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    const data = await ctx.db
      .query('timelineData')
      .withIndex('by_account_date')
      .filter(q =>
        q.and(
          q.eq(q.field('accountId'), args.accountId),
          q.gte(q.field('date'), args.startDate),
          q.lte(q.field('date'), args.endDate)
        )
      )
      .collect()
    
    // Aggregate by date
    const dailySummary = data.reduce((acc, item) => {
      if (!acc[item.date]) {
        acc[item.date] = {
          date: item.date,
          totalAds: 0,
          activeAds: 0,
          totalSpend: 0,
          totalImpressions: 0,
          totalClicks: 0,
          avgCTR: 0,
          avgFrequency: 0,
          anomalyCount: 0,
        }
      }
      
      const summary = acc[item.date]
      summary.totalAds++
      if (item.hasDelivery) {
        summary.activeAds++
        summary.totalSpend += item.metrics.spend
        summary.totalImpressions += item.metrics.impressions
        summary.totalClicks += item.metrics.clicks
      }
      if (item.anomalies.length > 0) {
        summary.anomalyCount++
      }
      
      return acc
    }, {} as Record<string, any>)
    
    // Calculate averages
    Object.values(dailySummary).forEach((summary: any) => {
      if (summary.totalImpressions > 0) {
        summary.avgCTR = (summary.totalClicks / summary.totalImpressions) * 100
      }
    })
    
    return Object.values(dailySummary).sort((a: any, b: any) => 
      a.date.localeCompare(b.date)
    )
  },
})

// ============================================================================
// Anomaly Detection Queries
// ============================================================================

/**
 * Get active anomalies for an ad
 */
export const getActiveAnomalies = query({
  args: {
    adId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('anomalyDetections')
      .withIndex('by_ad', q => q.eq('adId', args.adId))
      .filter(q => q.eq(q.field('status'), 'active'))
      .collect()
  },
})

/**
 * Get anomalies by severity
 */
export const getAnomaliesBySeverity = query({
  args: {
    accountId: v.string(),
    severity: v.union(
      v.literal('low'),
      v.literal('medium'),
      v.literal('high'),
      v.literal('critical')
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50
    return await ctx.db
      .query('anomalyDetections')
      .withIndex('by_severity', q => q.eq('severity', args.severity))
      .filter(q => q.eq(q.field('accountId'), args.accountId))
      .order('desc')
      .take(limit)
  },
})

/**
 * Get recent anomalies
 */
export const getRecentAnomalies = query({
  args: {
    accountId: v.string(),
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const days = args.days ?? 7
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)
    const cutoff = cutoffDate.toISOString()
    
    return await ctx.db
      .query('anomalyDetections')
      .withIndex('by_account', q => q.eq('accountId', args.accountId))
      .filter(q => q.gte(q.field('detectedAt'), cutoff))
      .order('desc')
      .collect()
  },
})

// ============================================================================
// Gap Analysis Queries
// ============================================================================

/**
 * Get gaps for an ad
 */
export const getAdGaps = query({
  args: {
    adId: v.string(),
    severity: v.optional(v.union(
      v.literal('minor'),
      v.literal('major'),
      v.literal('critical')
    )),
  },
  handler: async (ctx, args) => {
    let gaps = await ctx.db
      .query('gapAnalysis')
      .withIndex('by_ad', q => q.eq('adId', args.adId))
      .collect()
    
    if (args.severity) {
      gaps = gaps.filter(g => g.severity === args.severity)
    }
    
    return gaps.sort((a, b) => b.startDate.localeCompare(a.startDate))
  },
})

/**
 * Get account-wide gap summary
 */
export const getAccountGapSummary = query({
  args: {
    accountId: v.string(),
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    const gaps = await ctx.db
      .query('gapAnalysis')
      .withIndex('by_account', q => q.eq('accountId', args.accountId))
      .filter(q =>
        q.and(
          q.gte(q.field('startDate'), args.startDate),
          q.lte(q.field('startDate'), args.endDate)
        )
      )
      .collect()
    
    const summary = {
      totalGaps: gaps.length,
      minorGaps: gaps.filter(g => g.severity === 'minor').length,
      majorGaps: gaps.filter(g => g.severity === 'major').length,
      criticalGaps: gaps.filter(g => g.severity === 'critical').length,
      totalDaysLost: gaps.reduce((sum, g) => sum + g.durationDays, 0),
      totalMissedSpend: gaps.reduce((sum, g) => sum + g.affectedMetrics.missedSpend, 0),
      topCauses: {} as Record<string, number>,
    }
    
    // Count causes
    gaps.forEach(gap => {
      summary.topCauses[gap.inferredCause] = (summary.topCauses[gap.inferredCause] || 0) + 1
    })
    
    return summary
  },
})

// ============================================================================
// Cache Management Queries
// ============================================================================

/**
 * Get cache entry by key
 */
export const getCacheEntry = query({
  args: {
    cacheKey: v.string(),
  },
  handler: async (ctx, args) => {
    const entry = await ctx.db
      .query('timelineCache')
      .withIndex('by_cache_key', q => q.eq('cacheKey', args.cacheKey))
      .first()
    
    if (!entry) return null
    
    // Check if expired
    const now = new Date().toISOString()
    if (entry.expiresAt < now) {
      return { ...entry, expired: true }
    }
    
    return { ...entry, expired: false }
  },
})

/**
 * Get cache statistics
 */
export const getCacheStats = query({
  args: {
    accountId: v.string(),
  },
  handler: async (ctx, args) => {
    const entries = await ctx.db
      .query('timelineCache')
      .withIndex('by_account', q => q.eq('accountId', args.accountId))
      .collect()
    
    const now = new Date().toISOString()
    const validEntries = entries.filter(e => e.expiresAt > now)
    
    const stats = {
      totalEntries: entries.length,
      validEntries: validEntries.length,
      expiredEntries: entries.length - validEntries.length,
      totalHits: entries.reduce((sum, e) => sum + e.hitCount, 0),
      byLayer: {
        memory: validEntries.filter(e => e.layer === 'memory').length,
        localStorage: validEntries.filter(e => e.layer === 'localStorage').length,
        convex: validEntries.filter(e => e.layer === 'convex').length,
      },
      byType: {
        timeline: validEntries.filter(e => e.dataType === 'timeline').length,
        anomalies: validEntries.filter(e => e.dataType === 'anomalies').length,
        gaps: validEntries.filter(e => e.dataType === 'gaps').length,
        baseline: validEntries.filter(e => e.dataType === 'baseline').length,
      },
      totalSize: entries.reduce((sum, e) => sum + e.sizeBytes, 0),
    }
    
    return stats
  },
})

// ============================================================================
// Performance Statistics Queries
// ============================================================================

/**
 * Get performance statistics for a date range
 */
export const getPerformanceStats = query({
  args: {
    accountId: v.string(),
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('performanceStats')
      .withIndex('by_account', q => q.eq('accountId', args.accountId))
      .filter(q =>
        q.and(
          q.gte(q.field('statDate'), args.startDate),
          q.lte(q.field('statDate'), args.endDate)
        )
      )
      .collect()
  },
})

/**
 * Get latest performance metrics
 */
export const getLatestPerformance = query({
  args: {
    accountId: v.string(),
  },
  handler: async (ctx, args) => {
    const latest = await ctx.db
      .query('performanceStats')
      .withIndex('by_account', q => q.eq('accountId', args.accountId))
      .order('desc')
      .first()
    
    if (!latest) {
      return {
        cacheHitRate: 0,
        avgResponseTime: 0,
        dataCompleteness: 0,
        anomalyDetectionRate: 0,
      }
    }
    
    return {
      cacheHitRate: latest.cacheStats.hitRate,
      avgResponseTime: latest.performanceMetrics.avgResponseTime,
      dataCompleteness: latest.dataQuality.completenessScore,
      anomalyDetectionRate: latest.dataQuality.anomalyDetectionRate,
    }
  },
})