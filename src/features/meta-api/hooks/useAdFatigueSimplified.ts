import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useMetaInsights } from './useMetaInsights'
import { useFatigueCalculation } from './useFatigueCalculation'
// import { useInsightsCache } from './useInsightsCache' // Convex無効化
import { useCreativeEnrichment } from './useCreativeEnrichment'
import { useMockData } from './useMockData'
import { FatigueData } from '@/types'
import { vibe } from '@/utils/vibelogger'
// TASK-005: リファクタリング - 日付範囲ヘルパーを追加
import { getDateRangeInfo, isShortTermRange, DateRangePreset } from '../utils/date-range-helpers'

// TASK-005: リファクタリング - DateRangeFilterをDateRangePresetに統一
export type DateRangeFilter = DateRangePreset | 'all' | 'custom'

interface UseAdFatigueOptions {
  accountId: string
  preferCache?: boolean
  enrichWithCreatives?: boolean
  dateRange?: DateRangeFilter
  debugMode?: boolean // TASK-005: リファクタリング
}

interface UseAdFatigueResult {
  fatigueData: FatigueData[] | null // TASK-005: 統一
  stats: {
    totalAds: number
    totalSpend: number
    avgFatigueScore: number
  } | null // TASK-005: 統計情報追加
  processTime: {
    dateRange: string
    dataCount: number
    processingDuration: number
    error?: boolean
  } | null // TASK-005: 処理時間情報
  isLoading: boolean
  error: Error | null
  refetch: (options?: { clearCache?: boolean }) => Promise<void>
  dataSource: 'cache' | 'api' | null
  lastUpdateTime: Date | null
  progress?: {
    loaded: number
    hasMore: boolean
    isAutoFetching: boolean
  }
  // フィルター関連の情報
  totalInsights: number
  filteredCount: number
  dateRange: DateRangeFilter
  // 後方互換性のため保持
  data: FatigueData[]
  insights: any[]
  isRefreshing: boolean
}

/**
 * 簡潔化された統合フック
 * TASK-005: 日付範囲パラメータ伝播対応版
 * 各専門フックを組み合わせて疲労度データを提供
 */
export function useAdFatigueSimplified({
  accountId,
  preferCache = false, // Convexキャッシュを無効化
  enrichWithCreatives = true,
  dateRange = 'last_30d',
  debugMode = false // TASK-005: リファクタリング
}: UseAdFatigueOptions): UseAdFatigueResult {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [dataSource, setDataSource] = useState<'cache' | 'api' | null>(null)
  const [lastRefreshTime, setLastRefreshTime] = useState(0)
  const [loadingTimeout, setLoadingTimeout] = useState<NodeJS.Timeout | null>(null)
  
  // TASK-005: リファクタリング - デバッグログヘルパーと日付範囲情報
  const debugLog = useCallback((message: string, data?: any) => {
    if (debugMode) {
      console.log(`🔍 [useAdFatigueSimplified] ${message}`, data)
    }
  }, [debugMode])
  
  const dateRangeInfo = useMemo(() => getDateRangeInfo(dateRange === 'all' ? 'last_30d' : dateRange as DateRangePreset), [dateRange])
  const isShortTerm = useMemo(() => isShortTermRange(dateRange), [dateRange])
  
  // 専門フックの利用
  // Convexキャッシュは無効化
  const cache = {
    cachedInsights: null,
    hasCache: false,
    isLoadingCache: false,
    cacheError: null,
    clearCache: async () => {},
    saveToCache: async () => {}
  }
  // TASK-005: useMetaInsightsの日付範囲対応（リファクタリング版）
  const api = useMetaInsights({ 
    accountId, 
    autoFetch: true, // 自動取得を有効化（キャッシュがない場合のみ発動）
    datePreset: dateRange === 'all' ? 'last_30d' : dateRange, // 日付範囲を渡す
    debugMode,
    onDatePresetChange: (newPreset) => {
      debugLog('datePreset変更通知', { oldPreset: dateRange, newPreset })
    }
  })
  
  // TASK-005: 日付範囲変更の検知と処理（リファクタリング版）
  const prevDateRangeRef = useRef<string>()
  useEffect(() => {
    debugLog('日付範囲変更検知', { 
      oldRange: prevDateRangeRef.current,
      newRange: dateRange,
      dateRangeInfo,
      isShortTerm
    })
    
    if (prevDateRangeRef.current && prevDateRangeRef.current !== dateRange) {
      // 強制リフレッシュ with datePresetOverride
      const effectivePreset = dateRange === 'all' ? 'last_30d' : dateRange
      api.fetch({ forceRefresh: true, datePresetOverride: effectivePreset })
    }
    
    prevDateRangeRef.current = dateRange
  }, [dateRange, api.fetch, debugLog, dateRangeInfo, isShortTerm])
  
  // APIデータの変化を監視
  useEffect(() => {
    console.log('🔄 APIインサイト更新:', {
      hasData: !!api.insights,
      count: api.insights?.length || 0,
      isLoading: api.isLoading,
      error: api.error?.message
    })
    
    // ウェブページのコンソールにも表示
    if (typeof window !== 'undefined' && (window as any).DEBUG_FATIGUE) {
      (window as any).DEBUG_FATIGUE_LOGS = (window as any).DEBUG_FATIGUE_LOGS || []
      ;(window as any).DEBUG_FATIGUE_LOGS.push({
        type: 'API_INSIGHTS_UPDATE',
        timestamp: new Date(),
        data: {
          hasData: !!api.insights,
          count: api.insights?.length || 0,
          isLoading: api.isLoading,
          error: api.error?.message
        }
      })
    }
  }, [api.insights, api.isLoading, api.error])
  
  // 🎭 開発用: モックデータ（レート制限回避）
  const USE_MOCK_DATA = false // 本番APIを使用
  const mockData = useMockData(USE_MOCK_DATA)
  
  // 現在のデータソースを決定
  const currentInsights = useMemo(() => {
    // モックデータが有効な場合（開発用）
    if (USE_MOCK_DATA && mockData) {
      console.log('🎭 モックデータを使用（レート制限回避）')
      setDataSource('api')
      return mockData
    }
    console.log('📊 データソース選択:', {
      preferCache,
      hasCacheData: !!(cache.cachedInsights && cache.cachedInsights.length > 0),
      hasApiData: !!(api.insights && api.insights.length > 0),
      cacheLength: cache.cachedInsights?.length || 0,
      apiLength: api.insights?.length || 0,
      apiInsightsType: Array.isArray(api.insights) ? 'array' : typeof api.insights,
      sampleApiData: api.insights?.[0]
    })
    
    // キャッシュ優先モードかつキャッシュが存在する場合
    if (preferCache && cache.cachedInsights && cache.cachedInsights.length > 0) {
      console.log('📁 キャッシュデータを使用')
      setDataSource('cache')
      return cache.cachedInsights
    }
    
    // APIデータが存在する場合
    if (api.insights && api.insights.length > 0) {
      console.log('🌐 APIデータを使用:', {
        count: api.insights.length,
        firstItem: api.insights[0],
        dataType: typeof api.insights
      })
      setDataSource('api')
      return api.insights
    }
    
    // どちらもない場合
    console.log('❌ データなし')
    setDataSource(null)
    return []
  }, [api.insights, cache.cachedInsights, preferCache, mockData])
  
  // クリエイティブデータでエンリッチ
  const { enrichedInsights, enrichInsights } = useCreativeEnrichment(accountId)
  
  // エンリッチ処理
  useEffect(() => {
    console.log('🔄 エンリッチ処理チェック:', {
      hasCurrentInsights: !!currentInsights,
      currentInsightsLength: currentInsights?.length || 0,
      enrichWithCreatives,
      hasEnrichedInsights: !!enrichedInsights,
      enrichedInsightsLength: enrichedInsights?.length || 0
    })
    
    // currentInsightsがあり、エンリッチが有効で、まだエンリッチされていない場合
    if (currentInsights && currentInsights.length > 0 && enrichWithCreatives && !enrichedInsights) {
      console.log('🎯 エンリッチ処理を開始')
      enrichInsights(currentInsights)
    }
  }, [currentInsights, enrichWithCreatives, enrichedInsights, enrichInsights])
  
  // 使用するインサイトデータ（エンリッチ済み or オリジナル）
  // 第1段階修正: 一旦エンリッチメントを無視してcurrentInsightsを使用
  console.log('🔍 finalInsights計算前:', {
    enrichedInsights,
    enrichedInsightsType: Array.isArray(enrichedInsights) ? 'array' : typeof enrichedInsights,
    enrichedInsightsLength: enrichedInsights?.length || 0,
    currentInsightsLength: currentInsights?.length || 0,
    enrichedIsNull: enrichedInsights === null,
    enrichedIsEmpty: Array.isArray(enrichedInsights) && enrichedInsights.length === 0
  })
  
  // 第2段階実装: エンリッチメントデータの正しい処理
  const finalInsights = (enrichedInsights && enrichedInsights.length > 0) 
    ? enrichedInsights 
    : currentInsights || []
  
  console.log('📊 finalInsights計算後:', {
    finalInsightsLength: finalInsights.length,
    source: (enrichedInsights && enrichedInsights.length > 0) ? 'enriched' : 'current',
    enrichedWasUsed: !!(enrichedInsights && enrichedInsights.length > 0)
  })
  
  // 期間フィルターの適用
  const filteredInsights = useMemo(() => {
    if (!finalInsights || !dateRange || dateRange === 'all') {
      console.log('🗓️ フィルターなし:', { count: finalInsights.length, dateRange })
      return finalInsights
    }
    
    const now = new Date()
    const getDaysAgo = (days: number) => {
      const date = new Date()
      date.setDate(date.getDate() - days)
      return date
    }
    
    const filterByDays = (days: number) => {
      const cutoffDate = getDaysAgo(days)
      return finalInsights.filter(insight => {
        // date_stop または date_start を使用
        const insightDate = new Date(insight.date_stop || insight.date_start || '')
        return insightDate >= cutoffDate
      })
    }
    
    let filtered = finalInsights
    
    switch (dateRange) {
      case 'today':
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        filtered = finalInsights.filter(insight => {
          const date = new Date(insight.date_stop || insight.date_start || '')
          return date >= today
        })
        break
      case 'last_7d':
        filtered = filterByDays(7)
        break
      case 'last_14d':
        filtered = filterByDays(14)
        break
      case 'last_30d':
        filtered = filterByDays(30)
        break
      case 'last_90d':
        filtered = filterByDays(90)
        break
      default:
        filtered = finalInsights
    }
    
    console.log('🗓️ 期間フィルター適用結果:', {
      dateRange,
      originalCount: finalInsights.length,
      filteredCount: filtered.length,
      removed: finalInsights.length - filtered.length
    })
    
    return filtered
  }, [finalInsights, dateRange])
  
  console.log('📈 最終インサイトデータ:', {
    count: finalInsights.length,
    hasData: finalInsights.length > 0,
    sampleData: finalInsights[0],
    dataSource,
    enrichedInsightsLength: enrichedInsights?.length || 0,
    currentInsightsLength: currentInsights?.length || 0,
    hasEnrichedInsights: !!enrichedInsights,
    hasCurrentInsights: !!currentInsights,
    enrichedType: Array.isArray(enrichedInsights) ? 'array' : typeof enrichedInsights,
    currentType: Array.isArray(currentInsights) ? 'array' : typeof currentInsights
  })
  
  // ウェブページのコンソールにも表示
  if (typeof window !== 'undefined' && (window as any).DEBUG_FATIGUE) {
    (window as any).DEBUG_FATIGUE_LOGS = (window as any).DEBUG_FATIGUE_LOGS || []
    ;(window as any).DEBUG_FATIGUE_LOGS.push({
      type: 'FINAL_INSIGHTS',
      timestamp: new Date(),
      data: {
        count: finalInsights.length,
        hasData: finalInsights.length > 0,
        dataSource
      }
    })
  }
  
  // TASK-005: 疲労度計算（処理時間計測付き）リファクタリング版
  const startProcessTime = performance.now()
  const fatigueData = useFatigueCalculation(filteredInsights)
  const endProcessTime = performance.now()
  
  debugLog('疲労度計算完了', {
    inputCount: filteredInsights.length,
    outputCount: fatigueData.length,
    processingTime: Math.round(endProcessTime - startProcessTime),
    dateRangeInfo
  })
  
  // TASK-005: 統計情報の計算
  const stats = useMemo(() => {
    if (!fatigueData || fatigueData.length === 0) return null
    
    const totalSpend = fatigueData.reduce((sum, item) => sum + (item.spend || 0), 0)
    const avgFatigueScore = fatigueData.reduce((sum, item) => sum + (item.totalScore || 0), 0) / fatigueData.length
    
    return {
      totalAds: fatigueData.length,
      totalSpend,
      avgFatigueScore
    }
  }, [fatigueData])
  
  // TASK-005: 処理時間情報
  const processTime = useMemo(() => {
    if (!fatigueData) return null
    
    return {
      dateRange,
      dataCount: filteredInsights.length,
      processingDuration: endProcessTime - startProcessTime,
      error: !!api.error
    }
  }, [fatigueData, dateRange, filteredInsights.length, startProcessTime, endProcessTime, api.error])
  
  console.log('🎯 疲労度計算結果:', {
    count: fatigueData.length,
    hasData: fatigueData.length > 0,
    sampleData: fatigueData[0],
    stats,
    processTime
  })
  
  // ウェブページのコンソールにも表示
  if (typeof window !== 'undefined' && (window as any).DEBUG_FATIGUE) {
    (window as any).DEBUG_FATIGUE_LOGS = (window as any).DEBUG_FATIGUE_LOGS || []
    ;(window as any).DEBUG_FATIGUE_LOGS.push({
      type: 'FATIGUE_CALCULATION_RESULT',
      timestamp: new Date(),
      data: {
        count: fatigueData.length,
        hasData: fatigueData.length > 0
      }
    })
  }
  
  // クールダウンチェック（一時的に無効化）
  const canRefresh = useCallback(() => {
    console.log('🕒 クールダウンチェック（無効化）:', { isRefreshing })
    return !isRefreshing // シンプルにrefreshing状態のみチェック
  }, [isRefreshing])
  
  // リフレッシュ処理（シンプル化）
  const refetch = useCallback(async (options?: { clearCache?: boolean }) => {
    console.log('🚀 refetch開始:', { 
      isRefreshing, 
      canRefresh: canRefresh(), 
      accountId, 
      hasAccountId: !!accountId,
      accountIdLength: accountId?.length,
      apiHasFetch: typeof api.fetch === 'function',
      cacheHasClearCache: typeof cache.clearCache === 'function'
    })
    
    // accountIdの検証を強化
    if (!accountId || accountId.trim() === '') {
      console.error('❌ accountIdが設定されていません', {
        accountId,
        isNull: accountId === null,
        isUndefined: accountId === undefined,
        isEmpty: accountId === '',
        trimmed: accountId?.trim()
      })
      vibe.warn('アカウントを選択してください')
      
      // エラー状態をUIに伝える（errorオブジェクトは使用しない）
      setIsRefreshing(false)
      return
    }
    
    if (isRefreshing) {
      console.log('⏸️ 既に更新中です')
      return
    }
    
    setLastRefreshTime(Date.now())
    setIsRefreshing(true)
    
    try {
      console.log('🧹 キャッシュクリア処理:', { clearCache: options?.clearCache })
      if (options?.clearCache) {
        await cache.clearCache()
        console.log('✅ キャッシュクリア完了')
      }
      
      // TASK-005: APIからデータ取得（日付範囲を考慮）
      console.log('📡 API fetch開始', { clearCache: options?.clearCache, dateRange })
      await api.fetch({ 
        forceRefresh: options?.clearCache || true,
        datePresetOverride: dateRange // 現在のdateRangeで取得
      })
      console.log('✅ API fetch完了:', { 
        insightsCount: api.insights?.length || 0,
        hasData: !!(api.insights && api.insights.length > 0),
        firstItem: api.insights?.[0],
        apiError: api.error,
        currentDatePreset: api.currentDatePreset
      })
      
      // 取得したデータをConvexに保存
      if (api.insights && api.insights.length > 0) {
        console.log('💾 Convexに保存を検討:', { count: api.insights.length })
        
        // ⚠️ 従量課金を考慮して、一時的に保存を無効化
        console.warn('⚠️ Convex保存は一時的に無効化されています（従量課金対策）')
        
        // TODO: 以下の条件で保存を有効化
        // 1. ユーザーが明示的に「保存」ボタンをクリックした場合
        // 2. データ量が少ない場合（例: 100件以下）
        // 3. 最後の保存から一定時間経過した場合（例: 1時間以上）
        
        // await cache.saveToCache(api.insights)
        // console.log('✅ Convex保存完了')
      }
      
      // 新しいデータでエンリッチ
      if (api.insights && enrichWithCreatives) {
        console.log('🎨 クリエイティブエンリッチ開始')
        await enrichInsights(api.insights)
        console.log('✅ クリエイティブエンリッチ完了')
      }
      
      console.log('🎉 データ更新処理完了')
      vibe.good('データ更新完了')
    } catch (error: any) {
      console.error('❌ refetchエラー詳細:', {
        error: error.message,
        errorCode: error.code,
        retryAfter: error.retryAfter,
        stack: error.stack,
        accountId,
        timestamp: new Date().toISOString()
      })
      
      // レート制限エラーの特別処理
      if (error.code === 'RATE_LIMIT' || error.message?.includes('Rate limit')) {
        const waitTime = error.retryAfter || 60
        vibe.warn(`Meta APIのレート制限に達しました。${waitTime}秒後に再試行してください。`)
        console.warn(`⏱️ レート制限: ${waitTime}秒後に再試行可能`)
        
        // レート制限を記録
        if ((window as any).recordMetaApiRateLimit) {
          (window as any).recordMetaApiRateLimit(waitTime)
        }
      } else if (error.message?.includes('No valid token')) {
        vibe.bad('Meta APIトークンが無効です。接続設定を確認してください。')
        console.error('🔐 認証エラー: トークンが無効または期限切れ')
      } else {
        vibe.bad('データ更新エラー', { error: error.message })
      }
    } finally {
      console.log('🏁 refetch処理終了: isRefreshingをfalseに設定')
      setIsRefreshing(false)
    }
  }, [isRefreshing, cache, api, enrichWithCreatives, enrichInsights, accountId])
  
  // シンプルなローディング状態の判定
  const isActuallyLoading = useMemo(() => {
    // 初回ロード時のみローディング表示（データが全くない場合）
    const hasData = fatigueData.length > 0 || finalInsights.length > 0
    const isInitialLoad = api.isLoading && !hasData && !cache.cachedInsights
    
    console.log('🔄 ローディング状態:', {
      isInitialLoad,
      hasData,
      fatigueDataLength: fatigueData.length,
      finalInsightsLength: finalInsights.length,
      apiLoading: api.isLoading
    })
    
    return isInitialLoad
  }, [api.isLoading, fatigueData.length, finalInsights.length, cache.cachedInsights])

  const result = {
    // TASK-005: 新しいインターフェース
    fatigueData: fatigueData.length > 0 ? fatigueData : null,
    stats,
    processTime,
    isLoading: isActuallyLoading,
    error: api.error || cache.cacheError,
    refetch,
    dataSource,
    lastUpdateTime: api.lastFetchTime,
    progress: api.progress,
    // フィルター情報も返す
    totalInsights: finalInsights.length,  // フィルター前の総数
    filteredCount: filteredInsights.length,  // フィルター後の数
    dateRange,
    // 後方互換性のため保持
    data: fatigueData,
    insights: filteredInsights,  // フィルター済みのデータを返す
    isRefreshing
  }
  
  // TASK-005: 戻り値をログ出力（新しいフィールドを含む）
  useEffect(() => {
    console.log('🚀 useAdFatigueSimplified 戻り値:', {
      fatigueDataCount: result.fatigueData?.length || 0,
      hasStats: !!result.stats,
      hasProcessTime: !!result.processTime,
      isLoading: result.isLoading,
      isRefreshing: result.isRefreshing,
      dataSource: result.dataSource,
      error: result.error?.message,
      progress: result.progress,
      dateRange: result.dateRange,
      currentDatePreset: api.currentDatePreset
    })
  }, [result.fatigueData?.length, result.stats, result.processTime, result.isLoading, result.isRefreshing, result.dataSource, result.error, api.currentDatePreset])
  
  return result
}