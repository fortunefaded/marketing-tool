import { useState, useEffect, useCallback, useMemo } from 'react'
import { useMetaInsights } from './useMetaInsights'
import { useFatigueCalculation } from './useFatigueCalculation'
import { useInsightsCache } from './useInsightsCache'
import { useCreativeEnrichment } from './useCreativeEnrichment'
import { FatigueData } from '@/types'
import { vibe } from '@/lib/vibelogger'

interface UseAdFatigueOptions {
  accountId: string
  preferCache?: boolean
  enrichWithCreatives?: boolean
}

interface UseAdFatigueResult {
  data: FatigueData[]
  insights: any[]
  isLoading: boolean
  isRefreshing: boolean
  error: Error | null
  refetch: (options?: { clearCache?: boolean }) => Promise<void>
  dataSource: 'cache' | 'api' | null
  lastUpdateTime: Date | null
}

/**
 * 簡潔化された統合フック
 * 各専門フックを組み合わせて疲労度データを提供
 */
export function useAdFatigueSimplified({
  accountId,
  preferCache = true,
  enrichWithCreatives = true
}: UseAdFatigueOptions): UseAdFatigueResult {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [dataSource, setDataSource] = useState<'cache' | 'api' | null>(null)
  const [lastRefreshTime, setLastRefreshTime] = useState(0)
  
  // 専門フックの利用
  const cache = useInsightsCache({ accountId, preferCache })
  const api = useMetaInsights({ 
    accountId, 
    autoFetch: !cache.hasCache // キャッシュがない場合のみ自動取得
  })
  
  // 現在のデータソースを決定
  const currentInsights = useMemo(() => {
    if (preferCache && cache.hasCache && cache.cachedInsights) {
      setDataSource('cache')
      return cache.cachedInsights
    }
    if (api.insights) {
      setDataSource('api')
      return api.insights
    }
    return null
  }, [preferCache, cache.hasCache, cache.cachedInsights, api.insights])
  
  // クリエイティブデータでエンリッチ
  const { enrichedInsights, enrichInsights } = useCreativeEnrichment(accountId)
  
  // エンリッチ処理
  useEffect(() => {
    if (currentInsights && enrichWithCreatives && !enrichedInsights) {
      enrichInsights(currentInsights)
    }
  }, [currentInsights, enrichWithCreatives, enrichedInsights, enrichInsights])
  
  // 使用するインサイトデータ（エンリッチ済み or オリジナル）
  const finalInsights = enrichedInsights || currentInsights || []
  
  // 疲労度計算
  const fatigueData = useFatigueCalculation(finalInsights)
  
  // クールダウンチェック
  const canRefresh = useCallback(() => {
    return Date.now() - lastRefreshTime > 3000 && !isRefreshing
  }, [lastRefreshTime, isRefreshing])
  
  // リフレッシュ処理
  const refetch = useCallback(async (options?: { clearCache?: boolean }) => {
    if (!canRefresh()) {
      const remaining = Math.ceil((3000 - (Date.now() - lastRefreshTime)) / 1000)
      vibe.warn(`更新制限中（${remaining}秒後に再実行可能）`)
      return
    }
    
    setLastRefreshTime(Date.now())
    setIsRefreshing(true)
    
    try {
      if (options?.clearCache) {
        await cache.clearCache()
      }
      
      await api.fetch()
      
      // 新しいデータでエンリッチ
      if (api.insights && enrichWithCreatives) {
        await enrichInsights(api.insights)
      }
      
      vibe.good('データ更新完了')
    } catch (error: any) {
      vibe.bad('データ更新エラー', { error: error.message })
    } finally {
      setIsRefreshing(false)
    }
  }, [canRefresh, cache, api, enrichWithCreatives, enrichInsights, lastRefreshTime])
  
  return {
    data: fatigueData,
    insights: finalInsights,
    isLoading: api.isLoading || cache.isLoadingCache,
    isRefreshing,
    error: api.error || cache.cacheError,
    refetch,
    dataSource,
    lastUpdateTime: api.lastFetchTime
  }
}