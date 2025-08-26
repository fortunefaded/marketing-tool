import { useCallback, useEffect, useRef } from 'react'
import { useConvex } from 'convex/react'
import { CreativeMetricsCacheConvex, getCreativeMetricsCacheInstance } from '../_archived/services/meta-api/creativeMetricsCacheConvex'
import { CreativeMetrics } from '../services/creativeAggregator'

interface CacheParams {
  startDate: string
  endDate: string
  period: string
  creativeTypes?: string[]
  campaignIds?: string[]
}

export function useCreativeMetricsCache() {
  const convex = useConvex()
  const cacheRef = useRef<CreativeMetricsCacheConvex | null>(null)

  // Initialize cache instance
  useEffect(() => {
    if (convex && !cacheRef.current) {
      cacheRef.current = getCreativeMetricsCacheInstance(convex as any)
    }
  }, [convex])

  // Convex mutations - will be used for cache management

  // Get from cache
  const getFromCache = useCallback(
    async (accountId: string, params: CacheParams): Promise<CreativeMetrics[] | null> => {
      if (!cacheRef.current) return null
      return await cacheRef.current.get(accountId, params)
    },
    []
  )

  // Save to cache
  const saveToCache = useCallback(
    async (accountId: string, params: CacheParams, data: CreativeMetrics[]): Promise<void> => {
      if (!cacheRef.current) return
      await cacheRef.current.set(accountId, params, data)
    },
    []
  )

  // Invalidate cache for account
  const invalidateAccountCache = useCallback(
    async (accountId: string): Promise<void> => {
      if (!cacheRef.current) return
      await cacheRef.current.invalidate(accountId)
    },
    []
  )

  // Get cache debug info
  const getCacheDebugInfo = useCallback(async () => {
    if (!cacheRef.current) {
      return {
        totalEntries: 0,
        totalSizeMB: 0,
        activeCount: 0,
        expiredCount: 0,
      }
    }
    return await cacheRef.current.getDebugInfo()
  }, [])

  // Cleanup expired cache
  const cleanupExpiredCache = useCallback(async () => {
    if (!cacheRef.current) return 0
    return await cacheRef.current.cleanupExpired()
  }, [])

  // Get cache keys
  const getCacheKeys = useCallback(
    async (accountId?: string, limit?: number) => {
      if (!cacheRef.current) return []
      return await cacheRef.current.getCacheKeys(accountId, limit)
    },
    []
  )

  return {
    getFromCache,
    saveToCache,
    invalidateAccountCache,
    getCacheDebugInfo,
    cleanupExpiredCache,
    getCacheKeys,
    isReady: !!cacheRef.current,
  }
}