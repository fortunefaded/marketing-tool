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
  DateRangePreset,
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
  maxRetries = 3,
}: UseMetaInsightsRefactoredOptions): UseMetaInsightsRefactoredResult {
  // 依存関係の初期化
  const convex = useConvex()
  const dateRangeCache = useDateRangeCache()
  const { validateDateRange, suggestOptimalDateRange } = useDateRangeValidator()

  // 日付範囲の正規化と検証
  const normalizedDatePreset = useMemo(() => {
    const preset = typeof datePreset === 'string' ? datePreset : 'last_30d'
    return isValidDateRangePreset(preset) ? (preset as DateRangePreset) : 'last_30d'
  }, [datePreset])

  const validation = useMemo(
    () => validateDateRange(normalizedDatePreset),
    [validateDateRange, normalizedDatePreset]
  )

  // 状態管理
  const [insights, setInsights] = useState<AdInsight[] | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null)
  const [currentDatePreset, setCurrentDatePreset] = useState<DateRangePreset>(normalizedDatePreset)
  const [cacheStats, setCacheStats] = useState<{ hit: boolean; age: number; size: number } | null>(
    null
  )

  // 参照値の管理（循環依存回避）
  const prevDatePresetRef = useRef<DateRangePreset>()
  const retryCountRef = useRef<number>(0)
  const abortControllerRef = useRef<AbortController | null>(null)

  // デバッグログ
  const debugLog = useCallback(
    (message: string, data?: any) => {
      if (debugMode) {
        console.log(`🔍 [useMetaInsightsRefactored] ${message}`, data)
      }
    },
    [debugMode]
  )

  // キャッシュからのデータ読み込み
  const loadFromCache = useCallback(
    (preset: DateRangePreset) => {
      const cached = dateRangeCache.getCachedData(accountId, preset)
      if (cached) {
        setInsights(cached.data)
        setLastFetchTime(cached.timestamp)
        setCurrentDatePreset(preset)

        const age = Math.round((Date.now() - cached.timestamp.getTime()) / 1000 / 60)
        setCacheStats({ hit: true, age, size: cached.data.length })

        debugLog('キャッシュからデータ読み込み', {
          preset,
          dataCount: cached.data.length,
          age,
        })

        return true
      }

      setCacheStats({ hit: false, age: 0, size: 0 })
      return false
    },
    [accountId, dateRangeCache, debugLog]
  )

  // API からのデータ取得
  const fetchFromApi = useCallback(
    async (preset: DateRangePreset, forceRefresh = false): Promise<void> => {
      // 既存の処理をキャンセル
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      abortControllerRef.current = new AbortController()

      try {
        debugLog('API取得開始', { preset, forceRefresh })

        const tokenStore = new SimpleTokenStore(convex)
        const token = await tokenStore.getToken(accountId)

        if (!token?.accessToken) {
          throw new Error('No valid token found')
        }

        const api = new SimpleMetaApi(token.accessToken, accountId)

        // 日付範囲に応じたパラメータ設定
        const thresholds = getDateRangeThresholds(preset)
        const apiParams = {
          datePreset: preset,
          maxPages: thresholds.isShortTerm ? 2 : 1, // 短期間は詳細データ
          signal: abortControllerRef.current.signal,
        }

        const result = await api.getTimeSeriesInsights(apiParams)

        if (result.data && result.data.length > 0) {
          // データ集約処理
          const { aggregateTimeSeriesData } = await import('../utils/aggregate-time-series')
          const aggregatedData = aggregateTimeSeriesData(result.data)

          setInsights(aggregatedData)
          setLastFetchTime(new Date())
          setCurrentDatePreset(preset)
          setError(null)

          // キャッシュに保存
          dateRangeCache.setCachedData(
            accountId,
            preset,
            aggregatedData,
            result.nextPageUrl,
            !result.hasMore
          )

          setCacheStats({ hit: false, age: 0, size: aggregatedData.length })

          // コールバック実行
          if (onDatePresetChange && preset !== normalizedDatePreset) {
            onDatePresetChange(preset)
          }

          debugLog('API取得成功', {
            preset,
            originalCount: result.data.length,
            aggregatedCount: aggregatedData.length,
          })

          vibe.good(`データ取得成功: ${aggregatedData.length}件`)
          retryCountRef.current = 0
        }
      } catch (err: any) {
        if (err.name === 'AbortError') {
          debugLog('API取得キャンセル', { preset })
          return
        }

        setError(err)
        debugLog('API取得エラー', { preset, error: err.message })

        // レート制限の場合は自動リトライ
        if (err.code === 'RATE_LIMIT' && retryCountRef.current < maxRetries) {
          retryCountRef.current++
          const delay = (err.retryAfter || 60) * 1000

          debugLog('レート制限リトライ', {
            preset,
            retryCount: retryCountRef.current,
            delay,
          })

          setTimeout(() => {
            fetchFromApi(preset, forceRefresh)
          }, delay)
          return
        }

        vibe.bad('データ取得エラー', { error: err.message })
      }
    },
    [
      accountId,
      convex,
      dateRangeCache,
      onDatePresetChange,
      normalizedDatePreset,
      debugLog,
      maxRetries,
    ]
  )

  // メインの取得関数
  const fetch = useCallback(
    async (options?: { forceRefresh?: boolean; datePresetOverride?: DateRangePreset }) => {
      const targetPreset = options?.datePresetOverride || normalizedDatePreset
      const forceRefresh = options?.forceRefresh || false

      if (!accountId) {
        debugLog('accountId未設定')
        return
      }

      if (isLoading) {
        debugLog('既にローディング中')
        return
      }

      setIsLoading(true)

      try {
        // キャッシュチェック
        if (!forceRefresh && loadFromCache(targetPreset)) {
          debugLog('キャッシュヒット、API呼び出しスキップ')
          return
        }

        // API取得
        await fetchFromApi(targetPreset, forceRefresh)
      } finally {
        setIsLoading(false)
      }
    },
    [normalizedDatePreset, accountId, isLoading, loadFromCache, fetchFromApi, debugLog]
  )

  // 日付範囲変更の検知
  useEffect(() => {
    if (
      prevDatePresetRef.current !== undefined &&
      prevDatePresetRef.current !== normalizedDatePreset
    ) {
      debugLog('日付範囲変更検知', {
        old: prevDatePresetRef.current,
        new: normalizedDatePreset,
      })

      // 強制リフレッシュ
      fetch({ forceRefresh: true, datePresetOverride: normalizedDatePreset })
    }

    prevDatePresetRef.current = normalizedDatePreset
  }, [normalizedDatePreset, fetch, debugLog])

  // 自動取得
  useEffect(() => {
    if (autoFetch && accountId && !insights && !isLoading && !error) {
      debugLog('自動取得実行')
      fetch()
    }
  }, [autoFetch, accountId, insights, isLoading, error, fetch, debugLog])

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  return {
    insights,
    isLoading,
    error,
    fetch,
    currentDatePreset,
    lastFetchTime,
    cacheStats,
    validation,
  }
}
