/**
 * useMetaAdsData.ts
 * データ取得の基盤となるコアフック
 */

import { useState, useEffect, useCallback } from 'react'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { 
  MetaApiInsight, 
  DateRangeFilter,
  UnifiedAdData 
} from '../../types'
import { normalizeAdData } from '../../utils/safe-data-access'

export interface UseMetaAdsDataOptions {
  accountId: string
  dateRange: DateRangeFilter
  preferCache?: boolean
  autoRefresh?: boolean
  refreshInterval?: number
}

export interface UseMetaAdsDataResult {
  // 生データ
  rawData: MetaApiInsight[]
  // 正規化されたデータ
  data: UnifiedAdData[]
  // 状態
  isLoading: boolean
  isRefreshing: boolean
  error: Error | null
  // メタ情報
  dataSource: 'cache' | 'api' | null
  lastUpdateTime: Date | null
  cacheStatus: {
    hasCache: boolean
    cacheAge?: number
    isStale?: boolean
  }
  // アクション
  refetch: (options?: { clearCache?: boolean }) => Promise<void>
  clearCache: () => Promise<void>
}

/**
 * Meta広告データ取得のコアフック
 */
export function useMetaAdsData(options: UseMetaAdsDataOptions): UseMetaAdsDataResult {
  const {
    accountId,
    dateRange,
    preferCache = false,
    autoRefresh = false,
    refreshInterval = 300000 // 5分
  } = options

  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [dataSource, setDataSource] = useState<'cache' | 'api' | null>(null)
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null)

  // Convexからキャッシュデータを取得
  const cachedData = useQuery(api.metaInsights.getByAccountId, 
    accountId ? { accountId } : 'skip'
  )

  // データ取得処理
  const fetchData = useCallback(async (clearCache = false) => {
    if (!accountId) {
      setError(new Error('Account ID is required'))
      return
    }

    setIsRefreshing(true)
    setError(null)

    try {
      let insights: MetaApiInsight[] = []

      // キャッシュ優先モードかつキャッシュがある場合
      if (preferCache && !clearCache && cachedData) {
        console.log('[MetaAdsData] Using cached data')
        insights = cachedData as MetaApiInsight[]
        setDataSource('cache')
      } else {
        console.log('[MetaAdsData] Fetching from API')
        // TODO: 実際のAPI呼び出し実装
        // const response = await fetchFromMetaAPI(accountId, dateRange)
        // insights = response.data
        setDataSource('api')
      }

      setLastUpdateTime(new Date())
      return insights

    } catch (err) {
      console.error('[MetaAdsData] Fetch error:', err)
      setError(err as Error)
      throw err
    } finally {
      setIsRefreshing(false)
      setIsLoading(false)
    }
  }, [accountId, dateRange, preferCache, cachedData])

  // 初回データ取得
  useEffect(() => {
    fetchData()
  }, [fetchData])

  // 自動更新
  useEffect(() => {
    if (!autoRefresh || refreshInterval <= 0) return

    const interval = setInterval(() => {
      console.log('[MetaAdsData] Auto-refreshing data')
      fetchData()
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, fetchData])

  // データ正規化
  const normalizedData = cachedData 
    ? (cachedData as any[]).map(normalizeAdData)
    : []

  // キャッシュステータス
  const cacheStatus = {
    hasCache: !!cachedData,
    cacheAge: lastUpdateTime 
      ? Date.now() - lastUpdateTime.getTime()
      : undefined,
    isStale: lastUpdateTime 
      ? Date.now() - lastUpdateTime.getTime() > 3600000 // 1時間
      : false
  }

  // キャッシュクリア
  const clearCache = async () => {
    console.log('[MetaAdsData] Clearing cache')
    // TODO: Convex mutation to clear cache
    await fetchData(true)
  }

  // リフェッチ
  const refetch = async (options?: { clearCache?: boolean }) => {
    await fetchData(options?.clearCache)
  }

  return {
    rawData: cachedData as MetaApiInsight[] || [],
    data: normalizedData,
    isLoading,
    isRefreshing,
    error,
    dataSource,
    lastUpdateTime,
    cacheStatus,
    refetch,
    clearCache
  }
}