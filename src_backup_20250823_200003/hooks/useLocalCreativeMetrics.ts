import { useState, useEffect, useCallback, useRef } from 'react'
import { localDB } from '../services/localDataStore'
import { storageManager } from '../services/localStorageManager'
import {
  CreativeDataAggregator,
  EnhancedCreativeData,
  AggregationOptions,
} from '../services/creativeDataAggregator'
// TODO: Replace with new account management
// import { MetaAccountManager } from '../_archived/services/metaAccountManager'

interface UseLocalCreativeMetricsOptions {
  dateRange: {
    since: string
    until: string
  }
  includeVideoMetrics?: boolean
  includeDemographics?: boolean
  includePlacements?: boolean
  includeTargeting?: boolean
  autoRefresh?: boolean
  refreshInterval?: number
  maxCacheAge?: number
}

interface ProgressState {
  stage: 'idle' | 'checking-cache' | 'fetching' | 'saving' | 'complete'
  percentage: number
  message: string
}

export function useLocalCreativeMetrics(options: UseLocalCreativeMetricsOptions) {
  const [data, setData] = useState<EnhancedCreativeData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<ProgressState>({
    stage: 'idle',
    percentage: 0,
    message: '',
  })

  const aggregatorRef = useRef<CreativeDataAggregator | null>(null)
  // TODO: Replace with new account management
  // const manager = MetaAccountManager.getInstance()
  const manager = {
    getActiveAccount: () => null,
    getActiveApiService: () => null
  }
  const abortControllerRef = useRef<AbortController | null>(null)

  const fetchData = useCallback(async () => {
    const activeAccount = manager.getActiveAccount()
    const apiService = manager.getActiveApiService()

    if (!activeAccount || !apiService) {
      setError('Meta広告アカウントが設定されていません')
      return
    }

    // 既存のリクエストをキャンセル
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

    setIsLoading(true)
    setError(null)
    setProgress({
      stage: 'checking-cache',
      percentage: 10,
      message: 'キャッシュを確認中...',
    })

    try {
      // 1. まずローカルキャッシュを確認
      const cached = await localDB.getCachedCreatives(
        activeAccount.accountId,
        options.dateRange,
        options.maxCacheAge || 3600000 // デフォルト1時間
      )

      if (cached && cached.length > 0) {
        setData(cached)
        setProgress({
          stage: 'complete',
          percentage: 100,
          message: 'キャッシュから読み込み完了',
        })
        setIsLoading(false)
        return
      }

      // 2. SessionStorageの短期キャッシュも確認
      const cacheKey = `creatives_${activeAccount.accountId}_${options.dateRange.since}_${options.dateRange.until}`
      const sessionCached = storageManager.getCachedResponse<EnhancedCreativeData[]>(cacheKey)

      if (sessionCached && sessionCached.length > 0) {
        setData(sessionCached)
        setProgress({
          stage: 'complete',
          percentage: 100,
          message: 'セッションキャッシュから読み込み完了',
        })
        setIsLoading(false)
        return
      }

      // 3. キャッシュがなければAPIから取得
      setProgress({
        stage: 'fetching',
        percentage: 30,
        message: 'APIからデータを取得中...',
      })

      // Aggregatorを初期化
      if (!aggregatorRef.current) {
        aggregatorRef.current = new CreativeDataAggregator(apiService)
      }

      const aggregationOptions: AggregationOptions = {
        dateRange: options.dateRange,
        includeVideoMetrics: options.includeVideoMetrics,
        includeDemographics: options.includeDemographics,
        includePlacements: options.includePlacements,
        includeTargeting: options.includeTargeting,
      }

      const freshData = await aggregatorRef.current.getCompleteCreativeData(aggregationOptions)

      // 4. 取得したデータをローカルに保存
      setProgress({
        stage: 'saving',
        percentage: 80,
        message: 'データを保存中...',
      })

      await localDB.saveCreatives(activeAccount.accountId, freshData, options.dateRange)

      // SessionStorageにも保存（高速アクセス用）
      storageManager.cacheApiResponse(cacheKey, freshData, 300000) // 5分間

      // 最終同期時刻を保存
      storageManager.saveLastSyncTime(activeAccount.accountId, 'creatives')

      setData(freshData)
      setProgress({
        stage: 'complete',
        percentage: 100,
        message: '完了',
      })
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('データ取得がキャンセルされました')
        return
      }

      console.error('Creative metrics fetch error:', err)
      setError(err.message || 'データの取得に失敗しました')

      // エラー時も古いキャッシュがあれば表示
      try {
        const staleCache = await localDB.getCachedCreatives(
          activeAccount.accountId,
          options.dateRange,
          Infinity // 期限切れでも取得
        )

        if (staleCache && staleCache.length > 0) {
          setData(staleCache)
          setError(error + ' (古いキャッシュを表示しています)')
          console.log('エラー時の古いキャッシュを使用')
        }
      } catch (cacheError) {
        console.error('キャッシュの取得にも失敗しました:', cacheError)
      }

      setProgress({
        stage: 'idle',
        percentage: 0,
        message: '',
      })
    } finally {
      setIsLoading(false)
    }
  }, [options, manager])

  // 初回ロード
  useEffect(() => {
    fetchData()
  }, [
    options.dateRange.since,
    options.dateRange.until,
    options.includeVideoMetrics,
    options.includeDemographics,
    options.includePlacements,
    options.includeTargeting,
  ])

  // 自動更新
  useEffect(() => {
    if (!options.autoRefresh) return

    const interval = setInterval(() => {
      fetchData()
    }, options.refreshInterval || 300000) // デフォルト5分

    return () => clearInterval(interval)
  }, [options.autoRefresh, options.refreshInterval, fetchData])

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  // ストレージ情報の取得
  const getStorageInfo = useCallback(async () => {
    const info = await localDB.getStorageInfo()
    const usage = storageManager.getStorageUsage()

    return {
      indexedDB: info,
      localStorage: usage,
      lastSync: manager.getActiveAccount()
        ? storageManager.getLastSyncTime(manager.getActiveAccount()!.accountId, 'creatives')
        : null,
    }
  }, [manager])

  // データのエクスポート
  const exportData = useCallback(async () => {
    const allData = await localDB.exportAllData()
    const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `creative_data_${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  // キャッシュのクリア
  const clearCache = useCallback(async () => {
    const activeAccount = manager.getActiveAccount()
    if (!activeAccount) return

    // IndexedDBから削除
    await localDB.creatives.where('accountId').equals(activeAccount.accountId).delete()

    // SessionStorageからも削除
    storageManager.clearAll()

    setData([])
    console.log('キャッシュをクリアしました')
  }, [manager])

  // 計算されたプロパティ
  const hasVideoContent = data.some((d) => d.type === 'VIDEO')
  const totalCreatives = data.length
  const creativesByType = data.reduce(
    (acc, creative) => {
      acc[creative.type] = (acc[creative.type] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  return {
    data,
    isLoading,
    error,
    progress,
    refresh: fetchData,
    clearCache,
    exportData,
    getStorageInfo,
    hasVideoContent,
    totalCreatives,
    creativesByType,
  }
}
