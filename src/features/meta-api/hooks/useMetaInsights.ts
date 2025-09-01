import { useState, useCallback, useEffect, useRef } from 'react'
import { useConvex } from 'convex/react'
import { SimpleTokenStore } from '../core/token'
import { SimpleMetaApi, PaginatedResult } from '../core/api-client'
import { AdInsight } from '@/types'
import { vibe } from '@/lib/vibelogger'
import { useLocalCache } from './useLocalCache'

interface UseMetaInsightsOptions {
  accountId: string
  datePreset?: string
  autoFetch?: boolean
}

interface UseMetaInsightsProgress {
  loaded: number
  hasMore: boolean
  isAutoFetching: boolean
}

interface UseMetaInsightsResult {
  insights: AdInsight[] | null
  isLoading: boolean
  isLoadingMore: boolean
  error: Error | null
  fetch: (options?: { forceRefresh?: boolean }) => Promise<void>
  lastFetchTime: Date | null
  progress: UseMetaInsightsProgress
  stopAutoFetch: () => void
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
  const localCache = useLocalCache()
  
  // 初期値としてキャッシュをチェック
  const [insights, setInsights] = useState<AdInsight[] | null>(() => {
    if (accountId) {
      const cached = localCache.getCachedData(accountId)
      console.log('🔍 初期キャッシュチェック:', {
        accountId,
        hasCached: !!cached,
        cachedLength: cached?.length || 0,
        cacheKeys: Object.keys(localStorage).filter(k => k.startsWith('meta-insights-cache-'))
      })
      if (cached && cached.length > 0) {
        console.log('🎯 初期キャッシュ使用:', { count: cached.length })
        return cached
      }
    }
    return null
  })
  
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(() => {
    if (accountId) {
      return localCache.getCacheInfo(accountId).timestamp
    }
    return null
  })
  
  const [progress, setProgress] = useState<UseMetaInsightsProgress>(() => {
    if (accountId) {
      const cachedData = localCache.getCachedDataFull(accountId)
      if (cachedData) {
        return {
          loaded: cachedData.totalFetched,
          hasMore: !cachedData.isComplete,
          isAutoFetching: false
        }
      }
    }
    return {
      loaded: 0,
      hasMore: false,
      isAutoFetching: false
    }
  })
  
  // 自動取得の参照
  const autoFetchIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const isMounted = useRef(true)
  
  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])
  
  // キャッシュから読み込み（拡張版）
  const loadCachedData = useCallback(() => {
    const cachedData = localCache.getCachedDataFull(accountId)
    
    if (cachedData) {
      setInsights(cachedData.data)
      setProgress({
        loaded: cachedData.totalFetched,
        hasMore: !cachedData.isComplete,
        isAutoFetching: false
      })
      setLastFetchTime(new Date(cachedData.timestamp))
      return cachedData
    }
    return null
  }, [accountId, localCache])
  
  // 追加取得（バックグラウンド）
  const fetchMore = useCallback(async (nextPageUrl: string) => {
    console.log('🔄 fetchMore開始:', { 
      nextPageUrl: nextPageUrl?.substring(0, 100),
      currentInsightsCount: insights?.length || 0,
      isLoadingMore 
    })
    
    if (!accountId || !nextPageUrl || isLoadingMore) {
      console.log('⚠️ fetchMore中断:', { accountId, nextPageUrl: !!nextPageUrl, isLoadingMore })
      return
    }
    
    setIsLoadingMore(true)
    
    try {
      const tokenStore = new SimpleTokenStore(convex)
      const token = await tokenStore.getToken(accountId)
      
      if (!token?.accessToken) {
        throw new Error('No valid token found')
      }
      
      const api = new SimpleMetaApi(token.accessToken, accountId)
      
      // 続きのページを取得（時系列データ）
      const result = await api.fetchInsightsContinuation(nextPageUrl, {
        onProgress: (count) => {
          console.log(`📊 追加取得中: ${count}件`)
        }
      })
      
      // 新しい広告のプラットフォームデータも取得
      const adIds = result.data.map(ad => ad.ad_id)
      console.log(`🎯 ${adIds.length}件の新規広告のプラットフォームデータ取得`)
      // Note: getPlatformBreakdown は全体を取得するので、ここでは既存のものを再利用
      // 実装の最適化として、特定のad_idのみ取得するメソッドが必要かもしれない
      
      console.log('📊 API応答:', {
        resultDataCount: result.data?.length,
        hasMore: result.hasMore,
        nextPageUrl: result.nextPageUrl?.substring(0, 100)
      })
      
      // 既存データとマージ（重複を除去）
      let mergedCount = 0
      setInsights(prev => {
        console.log('🔀 データマージ前:', {
          prevCount: prev?.length || 0,
          newItemsCount: result.data?.length || 0
        })
        
        if (!prev) {
          mergedCount = result.data.length
          return result.data
        }
        
        const existingIds = new Set(prev.map(i => i.ad_id))
        const newItems = result.data.filter(i => !existingIds.has(i.ad_id))
        const merged = [...prev, ...newItems]
        mergedCount = merged.length
        
        console.log('✅ データマージ後:', {
          mergedCount: merged.length,
          newItemsAdded: newItems.length,
          duplicatesRemoved: result.data.length - newItems.length
        })
        
        // キャッシュ更新
        localCache.setCachedData(accountId, merged, result.nextPageUrl, !result.hasMore)
        
        return merged
      })
      
      // progressの更新（マージ後の実際のデータ数を使用）
      setProgress({
        loaded: mergedCount,  // 実際のマージ後のデータ数
        hasMore: result.hasMore,
        isAutoFetching: result.hasMore
      })
      
      // さらに続きがある場合、次の取得をスケジュール
      if (result.hasMore && result.nextPageUrl) {
        console.log('📅 次の取得をスケジュール:', {
          nextPageUrl: result.nextPageUrl?.substring(0, 100),
          delay: 5000
        })
        scheduleNextFetch(result.nextPageUrl)
      } else {
        console.log('✅ 全データ取得完了！追加取得の必要なし')
        stopAutoFetch()
      }
      
    } catch (err: any) {
      console.error('❌ 追加取得エラー:', {
        error: err.message,
        code: err.code,
        nextPageUrl: nextPageUrl?.substring(0, 100)
      })
      
      // レート制限エラーの場合はリトライ
      if (err.code === 'RATE_LIMIT') {
        console.log('⏳ レート制限検出。60秒後に再試行します...')
        // progressを更新（一時停止状態を表示）
        setProgress(prev => ({ ...prev, isAutoFetching: true }))
        scheduleNextFetch(nextPageUrl, 60000)  // 60秒後
      } else {
        console.error('❌ 追加取得を中止:', err.message)
        stopAutoFetch()
        // progressを最終状態に更新
        setProgress(prev => ({
          ...prev,
          hasMore: false,
          isAutoFetching: false
        }))
      }
    } finally {
      setIsLoadingMore(false)
    }
  }, [accountId, isLoadingMore, convex, localCache])
  
  // 自動取得のスケジューリング
  const scheduleNextFetch = useCallback((nextPageUrl: string, delay = 5000) => {
    if (!isMounted.current) return
    
    // 既存のタイマーをクリア
    if (autoFetchIntervalRef.current) {
      clearTimeout(autoFetchIntervalRef.current)
    }
    
    autoFetchIntervalRef.current = setTimeout(() => {
      if (isMounted.current) {
        fetchMore(nextPageUrl)
      }
    }, delay)
  }, [fetchMore])
  
  // 自動取得開始
  const startAutoFetch = useCallback((nextPageUrl: string) => {
    console.log('🚀 自動データ補完を開始します')
    scheduleNextFetch(nextPageUrl, 3000)  // 3秒後に開始
  }, [scheduleNextFetch])
  
  // 自動取得停止
  const stopAutoFetch = useCallback(() => {
    console.log('⏹️ 自動取得を停止')
    if (autoFetchIntervalRef.current) {
      clearTimeout(autoFetchIntervalRef.current)
      autoFetchIntervalRef.current = null
    }
    setProgress(prev => ({ ...prev, isAutoFetching: false }))
    setIsLoadingMore(false)
  }, [])
  
  // 初回取得
  const fetch = useCallback(async (options?: { 
    forceRefresh?: boolean,
    datePresetOverride?: string  // 日付範囲を引数として受け取る
  }) => {
    const effectiveDatePreset = options?.datePresetOverride || datePreset
    console.log('🔄 Meta API fetch開始:', { 
      accountId, 
      isLoading, 
      forceRefresh: options?.forceRefresh,
      datePreset: effectiveDatePreset
    })
    
    if (!accountId) {
      console.log('❌ accountIdが未設定です')
      return
    }
    
    if (isLoading) {
      console.log('⏸️ 既にローディング中です')
      return
    }
    
    // キャッシュチェック（強制リフレッシュでない場合）
    if (!options?.forceRefresh) {
      const cachedData = loadCachedData()
      if (cachedData && cachedData.data.length > 0) {
        console.log('📦 キャッシュデータを使用:', { count: cachedData.data.length })
        
        // 未完了のデータがある場合は自動取得を再開
        if (!cachedData.isComplete && cachedData.nextPageUrl) {
          console.log('📂 未完了のデータを検出。自動補完を再開します')
          startAutoFetch(cachedData.nextPageUrl)
        }
        return
      }
    }
    
    setIsLoading(true)
    setError(null)
    
    try {
      const tokenStore = new SimpleTokenStore(convex)
      const token = await tokenStore.getToken(accountId)
      
      if (!token?.accessToken) {
        throw new Error('No valid token found')
      }
      
      const api = new SimpleMetaApi(token.accessToken, accountId)
      
      // datePresetがカスタム日付範囲（last_month）の場合の処理
      let apiParams: any = {
        forceRefresh: true,
        maxPages: 1,  // 最初は1ページのみ
        onProgress: (count: number) => {
          console.log(`📊 取得中: ${count}件`)
        }
      }
      
      // カスタム日付範囲の処理
      const formatDate = (date: Date): string => {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
      }
      
      if (effectiveDatePreset === 'last_month') {
        const now = new Date()
        const lastDayOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)
        const firstDayOfLastMonth = new Date(lastDayOfLastMonth.getFullYear(), lastDayOfLastMonth.getMonth(), 1)
        
        apiParams.dateStart = formatDate(firstDayOfLastMonth)
        apiParams.dateStop = formatDate(lastDayOfLastMonth)
        console.log('📅 先月のデータを取得:', { start: apiParams.dateStart, end: apiParams.dateStop })
      } else if (effectiveDatePreset === 'yesterday') {
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        
        apiParams.dateStart = formatDate(yesterday)
        apiParams.dateStop = formatDate(yesterday)
        console.log('📅 昨日のデータを取得:', { date: apiParams.dateStart })
      } else {
        // その他の標準的なdatePreset
        apiParams.datePreset = effectiveDatePreset
      }
      
      // 1. まず時系列データを取得（新しいメソッドを使用）
      const result = await api.getTimeSeriesInsights(apiParams)
      
      // プラットフォーム別データの取得を一時的に無効化
      // 理由: time_incrementとbreakdownsの非互換性により数値整合性を優先
      console.log('⚠️ プラットフォーム別データ取得をスキップ (数値整合性優先)')
      const platformData = {}
      
      console.log('🎯 API結果:', {
        dataLength: result.data?.length || 0,
        hasMore: result.hasMore,
        totalCount: result.totalCount,
        nextPageUrl: result.nextPageUrl ? 'あり' : 'なし',
        platformDataCount: Object.keys(platformData).length
      })
      
      if (result.data && result.data.length > 0) {
        // 時系列データを合算処理（同一クリエイティブ名で集約）
        const { aggregateTimeSeriesData } = await import('../utils/aggregate-time-series')
        const aggregatedData = aggregateTimeSeriesData(result.data)
        
        console.log('✅ 時系列データ取得・合算完了:', {
          originalCount: result.data.length,
          aggregatedCount: aggregatedData.length,
          totalAds: result.data.length,
          dataIntegrity: 'time_increment使用により保証',
          sampleInsight: result.data[0] ? {
            ad_id: result.data[0].ad_id,
            ad_name: result.data[0].ad_name,
            date_start: result.data[0].date_start,
            date_stop: result.data[0].date_stop,
            impressions: result.data[0].impressions,
            hasDateFields: !!(result.data[0].date_start && result.data[0].date_stop)
          } : null
        })
        
        // 合算済みデータを設定
        setInsights(aggregatedData)
        setLastFetchTime(new Date())
        // キャッシュには元の時系列データを保存（詳細分析用）
        localCache.setCachedData(accountId, aggregatedData, result.nextPageUrl, !result.hasMore)
        vibe.good(`インサイトデータ取得成功: ${result.data.length}件 (時系列データ)`)
        
        setProgress({
          loaded: result.totalCount,
          hasMore: result.hasMore,
          isAutoFetching: result.hasMore
        })
        
        // 続きがある場合、自動取得を開始
        if (result.hasMore && result.nextPageUrl) {
          console.log('🚀 段階的データ取得を開始:', {
            nextPageUrl: result.nextPageUrl.replace(/access_token=[^&]+/, 'access_token=HIDDEN'),
            totalSoFar: result.totalCount
          })
          startAutoFetch(result.nextPageUrl)
        } else {
          console.log('📦 全データ取得完了（追加取得不要）')
        }
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
  }, [accountId, convex, localCache, isLoading, loadCachedData, startAutoFetch])
  
  // クリーンアップ
  useEffect(() => {
    return () => {
      isMounted.current = false
      stopAutoFetch()
    }
  }, [stopAutoFetch])
  
  // datePreset変更時の再取得
  const prevDatePresetRef = useRef(datePreset)
  useEffect(() => {
    // 初回レンダリング時はスキップ、datePresetが実際に変更された時のみ実行
    if (prevDatePresetRef.current !== datePreset && accountId && datePreset) {
      console.log('📅 日付範囲変更を検出:', { 
        oldDatePreset: prevDatePresetRef.current,
        newDatePreset: datePreset, 
        accountId 
      })
      prevDatePresetRef.current = datePreset
      
      // キャッシュをクリアして新しいデータを取得
      localCache.clearCache(accountId)
      // 停止中の自動取得があればクリア
      stopAutoFetch()
      // 新しい日付範囲でデータを取得（datePresetを引数として渡す）
      fetch({ forceRefresh: true, datePresetOverride: datePreset })
    }
  }, [datePreset, accountId, localCache, stopAutoFetch, fetch])
  
  // 自動フェッチ（初回のみ）
  useEffect(() => {
    if (autoFetch && accountId && !insights && !isLoading && !error) {
      console.log('🚀 自動フェッチ実行:', { accountId, hasInsights: !!insights })
      
      // まずキャッシュを確認
      const cached = loadCachedData()
      if (cached && !cached.isComplete && cached.nextPageUrl) {
        console.log('📂 未完了のキャッシュデータを検出。自動補完を開始')
        startAutoFetch(cached.nextPageUrl)
      } else if (!cached) {
        // キャッシュがない場合は初回取得
        fetch({ forceRefresh: false })
      }
    }
  }, [autoFetch, accountId])
  
  // 戻り値をログ出力
  const returnValue = {
    insights,
    isLoading,
    isLoadingMore,
    error,
    fetch,
    lastFetchTime,
    progress,
    stopAutoFetch
  }
  
  console.log('📌 useMetaInsights 戻り値:', {
    hasInsights: !!returnValue.insights,
    insightsCount: returnValue.insights?.length || 0,
    isLoading: returnValue.isLoading,
    hasError: !!returnValue.error,
    lastFetchTime: returnValue.lastFetchTime,
    progress: returnValue.progress
  })
  
  return returnValue
}