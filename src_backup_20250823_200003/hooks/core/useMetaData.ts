/**
 * 汎用Meta APIデータフック
 * 新しいアーキテクチャのコアフック
 */

import { useState, useEffect, useCallback, useRef } from 'react'
// TODO: Replace with new Meta API core implementation
// import { MetaApiCore } from '../../_archived/services/MetaApiCore'
import { logger } from '../../utils/logger'
import { useConvex } from 'convex/react'
// TODO: Replace with new config helper
// import { getMetaApiConfig, setConvexClient } from '../../_archived/lib/meta-api/config-helper-convex'

export interface UseMetaDataOptions {
  enabled?: boolean
  refetchInterval?: number
  refetchOnWindowFocus?: boolean
  retry?: boolean | number
  onSuccess?: (data: any) => void
  onError?: (error: Error) => void
  staleTime?: number
}

export interface UseMetaDataResult<T> {
  data: T | null
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
  isStale: boolean
  lastFetchTime: Date | null
}

/**
 * 汎用的なMeta APIデータ取得フック
 */
export function useMetaData<T>(
  fetcher: () => Promise<T>,
  dependencies: any[] = [],
  options: UseMetaDataOptions = {}
): UseMetaDataResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null)
  
  const fetcherRef = useRef(fetcher)
  const isMountedRef = useRef(true)
  const retryCountRef = useRef(0)
  const intervalRef = useRef<NodeJS.Timeout>()
  
  // fetcherの更新
  useEffect(() => {
    fetcherRef.current = fetcher
  })

  // データ取得関数
  const fetchData = useCallback(async () => {
    if (!(options.enabled ?? true)) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await fetcherRef.current()
      
      if (isMountedRef.current) {
        setData(result)
        setLastFetchTime(new Date())
        retryCountRef.current = 0
        
        if (options.onSuccess) {
          options.onSuccess(result)
        }
      }
    } catch (err) {
      const error = err as Error
      
      if (isMountedRef.current) {
        setError(error)
        logger.error('[useMetaData] Fetch error:', error)
        
        if (options.onError) {
          options.onError(error)
        }

        // リトライロジック
        const maxRetries = typeof options.retry === 'number' ? options.retry : options.retry ? 3 : 0
        if (retryCountRef.current < maxRetries) {
          retryCountRef.current++
          const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 10000)
          
          setTimeout(() => {
            if (isMountedRef.current) {
              fetchData()
            }
          }, delay)
        }
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false)
      }
    }
  }, [options.enabled, options.onSuccess, options.onError, options.retry])

  // 初回フェッチと依存関係の変更時
  useEffect(() => {
    fetchData()
  }, [...dependencies, fetchData])

  // 定期的な再フェッチ
  useEffect(() => {
    if (options.refetchInterval && options.refetchInterval > 0) {
      intervalRef.current = setInterval(fetchData, options.refetchInterval)
      
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
        }
      }
    }
  }, [options.refetchInterval, fetchData])

  // ウィンドウフォーカス時の再フェッチ
  useEffect(() => {
    if (!options.refetchOnWindowFocus) {
      return
    }

    const handleFocus = () => {
      if (document.visibilityState === 'visible') {
        fetchData()
      }
    }

    document.addEventListener('visibilitychange', handleFocus)
    window.addEventListener('focus', handleFocus)

    return () => {
      document.removeEventListener('visibilitychange', handleFocus)
      window.removeEventListener('focus', handleFocus)
    }
  }, [options.refetchOnWindowFocus, fetchData])

  // クリーンアップ
  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // データの鮮度チェック
  const isStale = useCallback(() => {
    if (!lastFetchTime || !options.staleTime) {
      return false
    }
    
    return Date.now() - lastFetchTime.getTime() > options.staleTime
  }, [lastFetchTime, options.staleTime])

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    isStale: isStale(),
    lastFetchTime
  }
}

/**
 * MetaApiCoreインスタンスを取得するフック
 * TODO: Replace with new Meta API implementation
 */
export function useMetaApiCore() {
  const [isInitialized, setIsInitialized] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  // TODO: Replace with new API core
  // const apiCore = useRef(MetaApiCore.getInstance())
  const convex = useConvex()

  useEffect(() => {
    // TODO: Implement new initialization logic
    // setConvexClient(convex as any)
    setError(new Error('Meta API Core temporarily disabled during migration'))
  }, [convex])

  return {
    apiCore: null, // TODO: Return new API core instance
    isInitialized: false, // TODO: Update when new implementation is ready
    error
  }
}