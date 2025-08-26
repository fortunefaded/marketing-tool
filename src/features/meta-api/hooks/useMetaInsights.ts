import { useState, useCallback, useEffect, useRef } from 'react'
import { useConvex } from 'convex/react'
import { SimpleTokenStore } from '../core/token'
import { SimpleMetaApi } from '../core/api-client'
import { AdInsight } from '@/types'
import { vibe } from '@/lib/vibelogger'

interface UseMetaInsightsOptions {
  accountId: string
  datePreset?: string
  autoFetch?: boolean
}

interface UseMetaInsightsResult {
  insights: AdInsight[] | null
  isLoading: boolean
  error: Error | null
  fetch: () => Promise<void>
  lastFetchTime: Date | null
}

/**
 * Meta API からインサイトデータを取得する専用フック
 * 責務: API 通信とデータ取得のみ
 */
export function useMetaInsights({
  accountId,
  datePreset = 'last_30d',
  autoFetch = false
}: UseMetaInsightsOptions): UseMetaInsightsResult {
  const convex = useConvex()
  const [insights, setInsights] = useState<AdInsight[] | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null)
  const isMounted = useRef(true)
  
  useEffect(() => {
    return () => {
      isMounted.current = false
    }
  }, [])
  
  const fetch = useCallback(async () => {
    if (!accountId || isLoading) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      const tokenStore = new SimpleTokenStore(convex)
      const token = await tokenStore.getToken(accountId)
      
      if (!token?.accessToken) {
        throw new Error('No valid token found')
      }
      
      const api = new SimpleMetaApi(token.accessToken, accountId)
      const data = await api.getInsights({ 
        datePreset,
        forceRefresh: true 
      })
      
      if (isMounted.current) {
        setInsights(data)
        setLastFetchTime(new Date())
        vibe.good(`インサイトデータ取得成功: ${data.length}件`)
      }
    } catch (err: any) {
      if (isMounted.current) {
        setError(err)
        vibe.bad('インサイトデータ取得エラー', { error: err.message })
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false)
      }
    }
  }, [accountId, datePreset, convex, isLoading])
  
  // 自動フェッチ
  useEffect(() => {
    if (autoFetch && accountId && !insights) {
      fetch()
    }
  }, [autoFetch, accountId, fetch, insights])
  
  return {
    insights,
    isLoading,
    error,
    fetch,
    lastFetchTime
  }
}