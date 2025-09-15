import { useState, useEffect, useCallback } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import { useConvexCache } from './useConvexCache'
import { AdInsight } from '@/types'
import { vibe } from '@/utils/vibelogger'

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
  preferCache: _preferCache = true
}: UseInsightsCacheOptions): UseInsightsCacheResult {
  const { data, hasCache, isLoading, error } = useConvexCache(accountId)
  const [cachedInsights, setCachedInsights] = useState<AdInsight[] | null>(null)
  
  // Convex mutations
  const importInsights = useMutation(api.metaInsights.importInsights)
  const clearAccountData = useMutation(api.metaInsights.clearAccountData)
  
  useEffect(() => {
    if (hasCache && data) {
      setCachedInsights(data)
      vibe.info(`キャッシュからデータロード: ${data.length}件`)
    }
  }, [hasCache, data])
  
  const clearCache = useCallback(async () => {
    try {
      const result = await clearAccountData({ accountId })
      vibe.good('キャッシュクリア完了', { deleted: result.deleted })
    } catch (error: any) {
      vibe.bad('キャッシュクリアエラー', { error: error.message })
      throw error
    }
  }, [accountId, clearAccountData])
  
  const saveToCache = useCallback(async (insights: AdInsight[]) => {
    try {
      vibe.info('Convexへの保存開始', { count: insights.length })
      
      // AdInsight型をConvexスキーマにマッピング
      const convexInsights = insights.map(insight => ({
        accountId,
        date_start: new Date().toISOString().split('T')[0], // 仮の日付
        date_stop: new Date().toISOString().split('T')[0],   // 仮の日付
        campaign_id: insight.campaign_id,
        campaign_name: insight.campaign_name,
        adset_id: insight.adset_id,
        adset_name: insight.adset_name,
        ad_id: insight.ad_id,
        ad_name: insight.ad_name,
        impressions: insight.impressions,
        clicks: insight.clicks,
        spend: insight.spend,
        reach: insight.reach,
        frequency: insight.frequency,
        cpc: insight.cpc,
        cpm: insight.cpm,
        ctr: insight.ctr,
        conversions: insight.conversions,
        conversion_rate: insight.conversions && insight.clicks ? (insight.conversions / insight.clicks) * 100 : 0,
        cost_per_conversion: insight.conversions && insight.spend ? insight.spend / insight.conversions : 0,
      }))
      
      const result = await importInsights({ 
        insights: convexInsights, 
        strategy: 'replace' 
      })
      
      vibe.good('Convexへの保存完了', {
        imported: result.imported,
        updated: result.updated,
        total: result.total
      })
    } catch (error: any) {
      vibe.bad('Convex保存エラー', { error: error.message })
      throw error
    }
  }, [accountId, importInsights])
  
  return {
    cachedInsights,
    hasCache,
    isLoadingCache: isLoading,
    cacheError: error,
    clearCache,
    saveToCache
  }
}