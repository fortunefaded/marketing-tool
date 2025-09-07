import { useState, useCallback } from 'react'
import { useConvex } from 'convex/react'
import { SimpleTokenStore } from '../core/token'
import { SimpleMetaApi } from '../core/api-client'
import { AdInsight } from '@/types'
import { vibe } from '@/utils/vibelogger'
import { normalizeCreativeMediaType } from '../utils/creative-type'

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
    console.log('🎨 enrichInsights開始:', {
      hasInsights: !!insights,
      insightsLength: insights?.length || 0,
      accountId
    })
    
    if (!insights || insights.length === 0) {
      console.log('⚠️ insights が空のため null を設定')
      setEnrichedInsights(null)  // 空配列ではなくnullを設定
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
      
      console.log('📡 API呼び出し前:', {
        adIdsCount: adIds.length,
        firstAdId: adIds[0],
        tokenExists: !!token?.accessToken
      })
      
      const creatives = await api.getAdCreatives(adIds, { batchSize: 25 })
      
      console.log('📡 API呼び出し後:', {
        creativesCount: creatives?.length || 0,
        hasCreatives: !!creatives,
        firstCreative: creatives?.[0]
      })
      

      // クリエイティブデータをマージ
      const enriched = insights.map(insight => {
        const creative = creatives.find(c => c.id === insight.ad_id)
        
        if (!creative?.creative) {
          return insight
        }

        // Meta APIのobject_typeを正規化（URLパターンからも推測）
        const objectType = creative.creative.object_type
        const normalizedMediaType = normalizeCreativeMediaType(objectType, {
          video_url: creative.creative.video_url || insight.video_url,
          thumbnail_url: creative.creative.thumbnail_url || insight.thumbnail_url,
          carousel_cards: insight.carousel_cards
        })
        
        return {
          ...insight,
          creative: creative.creative,
          video_id: creative.creative.video_id || insight.video_id,
          video_url: creative.creative.video_url || insight.video_url,
          thumbnail_url: creative.creative.thumbnail_url || insight.thumbnail_url,
          creative_type: normalizedMediaType,
          creative_media_type: normalizedMediaType,
          // 元のobject_typeも保持（デバッグ用）
          original_object_type: objectType
        }
      })
      
      console.log('🎯 エンリッチメント完了:', {
        originalCount: insights.length,
        enrichedCount: enriched.length,
        enrichedSample: enriched[0],
        hasEnrichedData: enriched.some(i => i.video_id || i.thumbnail_url)
      })
      
      setEnrichedInsights(enriched)
      
      const enrichedCount = enriched.filter(i => i.video_id || i.thumbnail_url).length
      vibe.good(`クリエイティブデータ追加完了: ${enrichedCount}/${insights.length}件`)
      
    } catch (error: any) {
      console.error('❌ エンリッチメントエラー:', {
        error: error.message,
        stack: error.stack,
        accountId
      })
      setEnrichError(error)
      // エラー時は null を設定（空配列ではなく）
      setEnrichedInsights(null)
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