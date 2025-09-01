/**
 * useMetaInsightsRefactored.ts
 * TASK-005: リファクタリング版 - 日付範囲パラメータ伝播対応の最適化版
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { useConvex } from 'convex/react'
import { SimpleTokenStore } from '../core/token'
import { SimpleMetaApi } from '../core/api-client'
import { AdInsight } from '@/types'
import { vibe } from '@/lib/vibelogger'
import { useDateRangeCache } from './useDateRangeCache'
import { useDateRangeValidator } from './useDateRangeValidator'
import { 
  isValidDateRangePreset, 
  getDateRangeThresholds,
  DateRangePreset 
} from '../utils/date-range-helpers'

interface UseMetaInsightsRefactoredOptions {
  accountId: string
  datePreset?: DateRangePreset | string
  autoFetch?: boolean
  onDatePresetChange?: (newPreset: DateRangePreset) => void
  debugMode?: boolean
  maxRetries?: number
}

interface UseMetaInsightsRefactoredResult {
  insights: AdInsight[] | null
  isLoading: boolean
  error: Error | null
  fetch: (options?: { 
    forceRefresh?: boolean
    datePresetOverride?: DateRangePreset
  }) => Promise<void>
  currentDatePreset: DateRangePreset
  lastFetchTime: Date | null
  cacheStats: {
    hit: boolean
    age: number // minutes
    size: number
  } | null
  validation: {
    isValid: boolean
    warnings: string[]
    recommendations: string[]
  }
}

/**
 * リファクタリング版 Meta API フック
 * TASK-005: 循環依存解決、キャッシュ最適化、バリデーション強化
 */
export function useMetaInsightsRefactored({
  accountId,
  datePreset = 'last_30d',
  autoFetch = false,
  onDatePresetChange,
  debugMode = false,
  maxRetries = 3
}: UseMetaInsightsRefactoredOptions): UseMetaInsightsRefactoredResult {
  
  // 依存関係の初期化
  const convex = useConvex()
  const dateRangeCache = useDateRangeCache()
  const { validateDateRange, suggestOptimalDateRange } = useDateRangeValidator()
  
  // 日付範囲の正規化と検証
  const normalizedDatePreset = useMemo(() => {
    const preset = typeof datePreset === 'string' ? datePreset : 'last_30d'
    return isValidDateRangePreset(preset) ? preset as DateRangePreset : 'last_30d'
  }, [datePreset])
  
  const validation = useMemo(() => 
    validateDateRange(normalizedDatePreset), 
    [validateDateRange, normalizedDatePreset]
  )
  
  // 状態管理
  const [insights, setInsights] = useState<AdInsight[] | null>(null)\n  const [isLoading, setIsLoading] = useState(false)\n  const [error, setError] = useState<Error | null>(null)\n  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null)\n  const [currentDatePreset, setCurrentDatePreset] = useState<DateRangePreset>(normalizedDatePreset)\n  const [cacheStats, setCacheStats] = useState<{hit: boolean, age: number, size: number} | null>(null)\n  \n  // 参照値の管理（循環依存回避）\n  const prevDatePresetRef = useRef<DateRangePreset>()\n  const retryCountRef = useRef<number>(0)\n  const abortControllerRef = useRef<AbortController | null>(null)\n  \n  // デバッグログ\n  const debugLog = useCallback((message: string, data?: any) => {\n    if (debugMode) {\n      console.log(`🔍 [useMetaInsightsRefactored] ${message}`, data)\n    }\n  }, [debugMode])\n  \n  // キャッシュからのデータ読み込み\n  const loadFromCache = useCallback((preset: DateRangePreset) => {\n    const cached = dateRangeCache.getCachedData(accountId, preset)\n    if (cached) {\n      setInsights(cached.data)\n      setLastFetchTime(cached.timestamp)\n      setCurrentDatePreset(preset)\n      \n      const age = Math.round((Date.now() - cached.timestamp.getTime()) / 1000 / 60)\n      setCacheStats({ hit: true, age, size: cached.data.length })\n      \n      debugLog('キャッシュからデータ読み込み', {\n        preset,\n        dataCount: cached.data.length,\n        age\n      })\n      \n      return true\n    }\n    \n    setCacheStats({ hit: false, age: 0, size: 0 })\n    return false\n  }, [accountId, dateRangeCache, debugLog])\n  \n  // API からのデータ取得\n  const fetchFromApi = useCallback(async (\n    preset: DateRangePreset,\n    forceRefresh = false\n  ): Promise<void> => {\n    // 既存の処理をキャンセル\n    if (abortControllerRef.current) {\n      abortControllerRef.current.abort()\n    }\n    abortControllerRef.current = new AbortController()\n    \n    try {\n      debugLog('API取得開始', { preset, forceRefresh })\n      \n      const tokenStore = new SimpleTokenStore(convex)\n      const token = await tokenStore.getToken(accountId)\n      \n      if (!token?.accessToken) {\n        throw new Error('No valid token found')\n      }\n      \n      const api = new SimpleMetaApi(token.accessToken, accountId)\n      \n      // 日付範囲に応じたパラメータ設定\n      const thresholds = getDateRangeThresholds(preset)\n      const apiParams = {\n        datePreset: preset,\n        maxPages: thresholds.isShortTerm ? 2 : 1, // 短期間は詳細データ\n        signal: abortControllerRef.current.signal\n      }\n      \n      const result = await api.getTimeSeriesInsights(apiParams)\n      \n      if (result.data && result.data.length > 0) {\n        // データ集約処理\n        const { aggregateTimeSeriesData } = await import('../utils/aggregate-time-series')\n        const aggregatedData = aggregateTimeSeriesData(result.data)\n        \n        setInsights(aggregatedData)\n        setLastFetchTime(new Date())\n        setCurrentDatePreset(preset)\n        setError(null)\n        \n        // キャッシュに保存\n        dateRangeCache.setCachedData(\n          accountId,\n          preset,\n          aggregatedData,\n          result.nextPageUrl,\n          !result.hasMore\n        )\n        \n        setCacheStats({ hit: false, age: 0, size: aggregatedData.length })\n        \n        // コールバック実行\n        if (onDatePresetChange && preset !== normalizedDatePreset) {\n          onDatePresetChange(preset)\n        }\n        \n        debugLog('API取得成功', {\n          preset,\n          originalCount: result.data.length,\n          aggregatedCount: aggregatedData.length\n        })\n        \n        vibe.good(`データ取得成功: ${aggregatedData.length}件`)\n        retryCountRef.current = 0\n      }\n    } catch (err: any) {\n      if (err.name === 'AbortError') {\n        debugLog('API取得キャンセル', { preset })\n        return\n      }\n      \n      setError(err)\n      debugLog('API取得エラー', { preset, error: err.message })\n      \n      // レート制限の場合は自動リトライ\n      if (err.code === 'RATE_LIMIT' && retryCountRef.current < maxRetries) {\n        retryCountRef.current++\n        const delay = (err.retryAfter || 60) * 1000\n        \n        debugLog('レート制限リトライ', {\n          preset,\n          retryCount: retryCountRef.current,\n          delay\n        })\n        \n        setTimeout(() => {\n          fetchFromApi(preset, forceRefresh)\n        }, delay)\n        return\n      }\n      \n      vibe.bad('データ取得エラー', { error: err.message })\n    }\n  }, [accountId, convex, dateRangeCache, onDatePresetChange, normalizedDatePreset, debugLog, maxRetries])\n  \n  // メインの取得関数\n  const fetch = useCallback(async (options?: {\n    forceRefresh?: boolean\n    datePresetOverride?: DateRangePreset\n  }) => {\n    const targetPreset = options?.datePresetOverride || normalizedDatePreset\n    const forceRefresh = options?.forceRefresh || false\n    \n    if (!accountId) {\n      debugLog('accountId未設定')\n      return\n    }\n    \n    if (isLoading) {\n      debugLog('既にローディング中')\n      return\n    }\n    \n    setIsLoading(true)\n    \n    try {\n      // キャッシュチェック\n      if (!forceRefresh && loadFromCache(targetPreset)) {\n        debugLog('キャッシュヒット、API呼び出しスキップ')\n        return\n      }\n      \n      // API取得\n      await fetchFromApi(targetPreset, forceRefresh)\n      \n    } finally {\n      setIsLoading(false)\n    }\n  }, [normalizedDatePreset, accountId, isLoading, loadFromCache, fetchFromApi, debugLog])\n  \n  // 日付範囲変更の検知\n  useEffect(() => {\n    if (prevDatePresetRef.current !== undefined && \n        prevDatePresetRef.current !== normalizedDatePreset) {\n      \n      debugLog('日付範囲変更検知', {\n        old: prevDatePresetRef.current,\n        new: normalizedDatePreset\n      })\n      \n      // 強制リフレッシュ\n      fetch({ forceRefresh: true, datePresetOverride: normalizedDatePreset })\n    }\n    \n    prevDatePresetRef.current = normalizedDatePreset\n  }, [normalizedDatePreset, fetch, debugLog])\n  \n  // 自動取得\n  useEffect(() => {\n    if (autoFetch && accountId && !insights && !isLoading && !error) {\n      debugLog('自動取得実行')\n      fetch()\n    }\n  }, [autoFetch, accountId, insights, isLoading, error, fetch, debugLog])\n  \n  // クリーンアップ\n  useEffect(() => {\n    return () => {\n      if (abortControllerRef.current) {\n        abortControllerRef.current.abort()\n      }\n    }\n  }, [])\n  \n  return {\n    insights,\n    isLoading,\n    error,\n    fetch,\n    currentDatePreset,\n    lastFetchTime,\n    cacheStats,\n    validation\n  }\n}