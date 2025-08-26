import { useState, useCallback } from 'react'
import { useConvex } from 'convex/react'
import { SimpleTokenStore } from '../core/token'
import { SimpleMetaApi } from '../core/api-client'
import { AdInsight } from '@/types'
import { vibe } from '@/lib/vibelogger'

interface UseCreativeEnrichmentResult {
  enrichedInsights: AdInsight[] | null
  isEnriching: boolean
  enrichError: Error | null
  enrichInsights: (insights: AdInsight[]) => Promise<void>
}

/**
 * インサイトデータにクリエイティブ情報を追加する専用フック
 * 責務: クリエイティブデータの取得とマージのみ
 */
export function useCreativeEnrichment(accountId: string): UseCreativeEnrichmentResult {
  const convex = useConvex()
  const [enrichedInsights, setEnrichedInsights] = useState<AdInsight[] | null>(null)
  const [isEnriching, setIsEnriching] = useState(false)
  const [enrichError, setEnrichError] = useState<Error | null>(null)
  
  const enrichInsights = useCallback(async (insights: AdInsight[]) => {
    if (!insights || insights.length === 0) {
      setEnrichedInsights([])
      return
    }
    
    setIsEnriching(true)
    setEnrichError(null)
    
    try {
      const tokenStore = new SimpleTokenStore(convex)
      const token = await tokenStore.getToken(accountId)
      
      if (!token?.accessToken) {
        // トークンがない場合はオリジナルデータを返す
        setEnrichedInsights(insights)
        return
      }
      
      const api = new SimpleMetaApi(token.accessToken, accountId)
      const adIds = insights.map(insight => insight.ad_id).filter(Boolean)
      
      if (adIds.length === 0) {
        setEnrichedInsights(insights)
        return
      }
      
      vibe.info(`クリエイティブデータ取得中... (${adIds.length}件)`)
      
      const creatives = await api.getAdCreatives(adIds, { batchSize: 25 })
      
      // クリエイティブデータをマージ
      const enriched = insights.map(insight => {
        const creative = creatives.find(c => c.id === insight.ad_id)
        
        if (!creative?.creative) {
          return insight
        }
        
        return {
          ...insight,
          creative: creative.creative,
          video_id: creative.creative.video_id || insight.video_id,
          video_url: creative.creative.video_url || insight.video_url,
          thumbnail_url: creative.creative.thumbnail_url || insight.thumbnail_url,
          creative_type: creative.creative.object_type || insight.creative_type,
          creative_media_type: creative.creative.object_type || insight.creative_media_type
        }
      })
      
      setEnrichedInsights(enriched)
      
      const enrichedCount = enriched.filter(i => i.video_id || i.thumbnail_url).length
      vibe.good(`クリエイティブデータ追加完了: ${enrichedCount}/${insights.length}件`)
      
    } catch (error: any) {
      setEnrichError(error)
      // エラー時はオリジナルデータを使用
      setEnrichedInsights(insights)
      vibe.warn('クリエイティブデータ取得エラー', { error: error.message })
    } finally {
      setIsEnriching(false)
    }
  }, [accountId, convex])
  
  return {
    enrichedInsights,
    isEnriching,
    enrichError,
    enrichInsights
  }
}