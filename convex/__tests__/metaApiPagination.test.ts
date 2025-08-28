// Meta API Pagination System - Database Tests
// Verify Convex schema and mutations work correctly

import { expect, test, describe, beforeEach } from 'vitest'
import { ConvexTestingHelper } from 'convex-test'
import { 
  createRetrievalSession,
  updateRetrievalProgress,
  updateDeliveryAnalysis,
  logApiCall,
  upsertTimelineData,
  createAnomalyDetection,
  createGapAnalysis,
  upsertCacheEntry,
  updatePerformanceStats,
} from '../metaApiPaginationMutations'
import {
  getRetrievalSession,
  getRecentSessions,
  getTimelineData,
  getActiveAnomalies,
  getAdGaps,
  getCacheEntry,
  getLatestPerformance,
} from '../metaApiPaginationQueries'

describe('Meta API Pagination - Database Operations', () => {
  let t: ConvexTestingHelper

  beforeEach(async () => {
    t = new ConvexTestingHelper()
    await t.reset()
  })

  describe('Data Retrieval History', () => {
    test('should create and update retrieval session', async () => {
      const sessionId = 'session-001'
      const accountId = 'account-001'
      
      // Create session
      await t.mutation(createRetrievalSession, {
        sessionId,
        accountId,
        dateRange: {
          start: '2024-01-01',
          end: '2024-01-30',
        },
      })
      
      // Verify session created
      const session = await t.query(getRetrievalSession, { sessionId })
      expect(session).toBeDefined()
      expect(session?.status).toBe('pending')
      expect(session?.accountId).toBe(accountId)
      
      // Update progress
      await t.mutation(updateRetrievalProgress, {
        sessionId,
        status: 'fetching',
        pagesRetrieved: 5,
        totalPages: 10,
        totalItems: 150,
      })
      
      // Verify update
      const updated = await t.query(getRetrievalSession, { sessionId })
      expect(updated?.status).toBe('fetching')
      expect(updated?.pagesRetrieved).toBe(5)
      expect(updated?.totalPages).toBe(10)
    })

    test('should update delivery analysis', async () => {
      const sessionId = 'session-002'
      
      await t.mutation(createRetrievalSession, {
        sessionId,
        accountId: 'account-001',
        dateRange: {
          start: '2024-01-01',
          end: '2024-01-30',
        },
      })
      
      await t.mutation(updateDeliveryAnalysis, {
        sessionId,
        deliveryAnalysis: {
          totalRequestedDays: 30,
          actualDeliveryDays: 6,
          deliveryRatio: 0.2,
          deliveryPattern: 'intermittent',
          firstDeliveryDate: '2024-01-05',
          lastDeliveryDate: '2024-01-25',
        },
      })
      
      const session = await t.query(getRetrievalSession, { sessionId })
      expect(session?.deliveryAnalysis.actualDeliveryDays).toBe(6)
      expect(session?.deliveryAnalysis.deliveryPattern).toBe('intermittent')
    })
  })

  describe('Timeline Data', () => {
    test('should upsert timeline data', async () => {
      const adId = 'ad-001'
      const accountId = 'account-001'
      const date = '2024-01-15'
      
      // First insert
      await t.mutation(upsertTimelineData, {
        adId,
        accountId,
        date,
        hasDelivery: true,
        deliveryIntensity: 3,
        metrics: {
          impressions: 1000,
          clicks: 50,
          spend: 100,
          reach: 800,
          frequency: 1.25,
          ctr: 5.0,
          cpc: 2.0,
          cpm: 100,
          conversions: 5,
          conversionRate: 0.1,
        },
        comparisonFlags: {
          vsYesterday: 'up',
          vsLastWeek: 'stable',
          vsBaseline: 'normal',
          percentageChange: {
            daily: 10,
            weekly: 0,
            monthly: 5,
          },
        },
        anomalies: [],
      })
      
      // Query timeline data
      const data = await t.query(getTimelineData, {
        adId,
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      })
      
      expect(data).toHaveLength(1)
      expect(data[0].metrics.impressions).toBe(1000)
      expect(data[0].hasDelivery).toBe(true)
      
      // Update same date
      await t.mutation(upsertTimelineData, {
        adId,
        accountId,
        date,
        hasDelivery: true,
        deliveryIntensity: 4,
        metrics: {
          impressions: 1200,
          clicks: 60,
          spend: 120,
          reach: 900,
          frequency: 1.33,
          ctr: 5.0,
          cpc: 2.0,
          cpm: 100,
          conversions: 6,
          conversionRate: 0.1,
        },
        comparisonFlags: {
          vsYesterday: 'up',
          vsLastWeek: 'up',
          vsBaseline: 'normal',
          percentageChange: {
            daily: 20,
            weekly: 10,
            monthly: 8,
          },
        },
        anomalies: [],
      })
      
      // Verify update
      const updated = await t.query(getTimelineData, {
        adId,
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      })
      
      expect(updated).toHaveLength(1)
      expect(updated[0].metrics.impressions).toBe(1200)
      expect(updated[0].deliveryIntensity).toBe(4)
    })
  })

  describe('Anomaly Detection', () => {
    test('should create and query anomalies', async () => {
      const anomalyId = 'anomaly-001'
      const adId = 'ad-001'
      const accountId = 'account-001'
      
      await t.mutation(createAnomalyDetection, {
        anomalyId,
        adId,
        accountId,
        type: 'high_frequency',
        severity: 'high',
        dateRange: {
          start: '2024-01-10',
          end: '2024-01-15',
        },
        confidence: 0.85,
        metrics: {
          impactScore: 75,
          affectedSpend: 500,
          lostOpportunities: 100,
          deviationFromBaseline: 150,
        },
        message: 'Frequency exceeded threshold of 3.5',
        recommendation: 'Consider expanding audience or reducing budget',
      })
      
      const anomalies = await t.query(getActiveAnomalies, { adId })
      expect(anomalies).toHaveLength(1)
      expect(anomalies[0].type).toBe('high_frequency')
      expect(anomalies[0].severity).toBe('high')
      expect(anomalies[0].confidence).toBe(0.85)
    })
  })

  describe('Gap Analysis', () => {
    test('should create and query gaps', async () => {
      const gapId = 'gap-001'
      const adId = 'ad-001'
      const accountId = 'account-001'
      
      await t.mutation(createGapAnalysis, {
        gapId,
        adId,
        accountId,
        startDate: '2024-01-10',
        endDate: '2024-01-12',
        durationDays: 3,
        severity: 'major',
        inferredCause: 'budget_exhausted',
        causeConfidence: 0.75,
        affectedMetrics: {
          missedImpressions: 3000,
          missedSpend: 300,
          missedConversions: 15,
        },
        precedingMetrics: {
          avgSpend: 100,
          avgCTR: 4.5,
          avgFrequency: 2.0,
        },
      })
      
      const gaps = await t.query(getAdGaps, { adId })
      expect(gaps).toHaveLength(1)
      expect(gaps[0].severity).toBe('major')
      expect(gaps[0].inferredCause).toBe('budget_exhausted')
      expect(gaps[0].durationDays).toBe(3)
    })
  })

  describe('Cache Management', () => {
    test('should manage cache entries', async () => {
      const cacheKey = 'timeline:ad-001:2024-01'
      const accountId = 'account-001'
      
      await t.mutation(upsertCacheEntry, {
        cacheKey,
        accountId,
        layer: 'memory',
        dataType: 'timeline',
        ttlSeconds: 300,
        dataFreshness: 'realtime',
        sizeBytes: 1024,
        supportsDifferential: false,
        dataId: 'data-001',
      })
      
      const entry = await t.query(getCacheEntry, { cacheKey })
      expect(entry).toBeDefined()
      expect(entry?.expired).toBe(false)
      expect(entry?.layer).toBe('memory')
      expect(entry?.hitCount).toBe(1)
      
      // Update cache (increment hit count)
      await t.mutation(upsertCacheEntry, {
        cacheKey,
        accountId,
        layer: 'memory',
        dataType: 'timeline',
        ttlSeconds: 300,
        dataFreshness: 'realtime',
        sizeBytes: 1024,
        supportsDifferential: false,
        dataId: 'data-001',
      })
      
      const updated = await t.query(getCacheEntry, { cacheKey })
      expect(updated?.hitCount).toBe(2)
    })
  })

  describe('Performance Statistics', () => {
    test('should track performance metrics', async () => {
      const accountId = 'account-001'
      const statDate = '2024-01-15'
      
      await t.mutation(updatePerformanceStats, {
        statDate,
        accountId,
        cacheStats: {
          hitRate: 0.75,
          apiCallsSaved: 150,
          storageUsage: {
            memory: 5242880,
            localStorage: 10485760,
            convex: 20971520,
          },
        },
        performanceMetrics: {
          avgResponseTime: 250,
          cacheResponseTime: 50,
          apiResponseTime: 1500,
          p95ResponseTime: 2000,
          p99ResponseTime: 3000,
        },
        apiUsage: {
          totalCalls: 200,
          successfulCalls: 195,
          failedCalls: 5,
          rateLimitHits: 2,
        },
        dataQuality: {
          completenessScore: 0.95,
          anomalyDetectionRate: 0.85,
          falsePositiveRate: 0.05,
        },
      })
      
      const latest = await t.query(getLatestPerformance, { accountId })
      expect(latest.cacheHitRate).toBe(0.75)
      expect(latest.avgResponseTime).toBe(250)
      expect(latest.dataCompleteness).toBe(0.95)
      expect(latest.anomalyDetectionRate).toBe(0.85)
    })
  })
})