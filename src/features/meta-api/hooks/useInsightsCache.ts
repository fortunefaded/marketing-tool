import { useState, useEffect, useCallback } from 'react'
import { useConvexCache } from './useConvexCache'
import { AdInsight } from '@/types'
import { vibe } from '@/lib/vibelogger'

interface UseInsightsCacheOptions {
  accountId: string
  preferCache?: boolean
}

interface UseInsightsCacheResult {
  cachedInsights: AdInsight[] | null
  hasCache: boolean
  isLoadingCache: boolean
  cacheError: Error | null
  clearCache: () => Promise<void>
  saveToCache: (insights: AdInsight[]) => Promise<void>
}

/**
 * Convex キャッシュを管理する専用フック
 * 責務: キャッシュの読み書きのみ
 */
export function useInsightsCache({
  accountId,
  preferCache = true
}: UseInsightsCacheOptions): UseInsightsCacheResult {
  const { data, hasCache, isLoading, error } = useConvexCache(accountId)
  const [cachedInsights, setCachedInsights] = useState<AdInsight[] | null>(null)
  
  useEffect(() => {
    if (hasCache && data) {
      setCachedInsights(data)
      vibe.info(`キャッシュからデータロード: ${data.length}件`)
    }
  }, [hasCache, data])
  
  const clearCache = useCallback(async () => {
    // TODO: Convex のキャッシュクリア機能を実装
    vibe.info('キャッシュクリア機能は未実装です')
  }, [])
  
  const saveToCache = useCallback(async (insights: AdInsight[]) => {
    // TODO: Convex へのキャッシュ保存機能を実装
    vibe.info('キャッシュ保存機能は未実装です', { count: insights.length })
  }, [])
  
  return {
    cachedInsights,
    hasCache,
    isLoadingCache: isLoading,
    cacheError: error,
    clearCache,
    saveToCache
  }
}