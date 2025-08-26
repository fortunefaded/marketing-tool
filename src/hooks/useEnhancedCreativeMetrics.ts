import { useState, useEffect, useCallback, useRef } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { vibe } from '@/lib/vibelogger'
// TODO: Replace with new account management
// import { MetaAccountManager } from '../_archived/services/metaAccountManager'
import {
  CreativeDataAggregator,
  EnhancedCreativeData,
  AggregationOptions,
} from '../services/creativeDataAggregator'

export interface UseEnhancedCreativeMetricsOptions {
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
  progressiveLoading?: boolean
}

export interface UseEnhancedCreativeMetricsReturn {
  data: EnhancedCreativeData[]
  isLoading: boolean
  error: string | null
  progress: {
    stage: 'idle' | 'basic' | 'details' | 'analytics' | 'complete'
    percentage: number
    message: string
  }
  refresh: () => Promise<void>
  hasVideoContent: boolean
  totalCreatives: number
  creativesByType: Record<string, number>
}

export const useEnhancedCreativeMetrics = (
  options: UseEnhancedCreativeMetricsOptions
): UseEnhancedCreativeMetricsReturn => {
  const [data, setData] = useState<EnhancedCreativeData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<{
    stage: 'idle' | 'basic' | 'details' | 'analytics' | 'complete'
    percentage: number
    message: string
  }>({
    stage: 'idle',
    percentage: 0,
    message: '',
  })

  // TODO: Replace with new account management
  // const manager = MetaAccountManager.getInstance()
  const manager = {
    getActiveAccount: () => null,
    getActiveApiService: () => null
  }
  const aggregatorRef = useRef<CreativeDataAggregator | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const activeAccount = manager.getActiveAccount()
  const apiService = manager.getActiveApiService()

  // Convexからキャッシュデータを取得
  const cachedData = useQuery(
    api.creativeAnalytics.getEnhancedCreativeData,
    activeAccount
      ? {
          accountId: activeAccount.accountId,
          dateRange: options.dateRange,
          includeVideoMetrics: options.includeVideoMetrics,
          includeDemographics: options.includeDemographics,
          includePlacements: options.includePlacements,
          includeTargeting: options.includeTargeting,
        }
      : 'skip'
  )

  // Convexにデータを保存
  const saveData = useMutation(api.creativeAnalytics.saveEnhancedCreativeData)

  // データ取得の本体
  const fetchData = useCallback(async () => {
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
      stage: 'basic',
      percentage: 10,
      message: '基本データを取得中...',
    })

    try {
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

      // プログレッシブローディングが有効な場合
      if (options.progressiveLoading) {
        // Step 1: 基本データのみ取得
        setProgress({
          stage: 'basic',
          percentage: 30,
          message: 'クリエイティブ情報を取得中...',
        })

        const basicData = await aggregatorRef.current.getCompleteCreativeData({
          ...aggregationOptions,
          includeVideoMetrics: false,
          includeDemographics: false,
          includePlacements: false,
          includeTargeting: false,
        })

        setData(basicData)
        setProgress({
          stage: 'details',
          percentage: 50,
          message: '詳細データを取得中...',
        })

        // Step 2: 詳細データを追加
        if (
          options.includeVideoMetrics ||
          options.includeDemographics ||
          options.includePlacements
        ) {
          const detailedData =
            await aggregatorRef.current.getCompleteCreativeData(aggregationOptions)
          setData(detailedData)
        }

        setProgress({
          stage: 'complete',
          percentage: 100,
          message: '完了',
        })
      } else {
        // 一括取得
        const completeData = await aggregatorRef.current.getCompleteCreativeData(aggregationOptions)
        setData(completeData)
        setProgress({
          stage: 'complete',
          percentage: 100,
          message: '完了',
        })
      }

      // Convexに保存
      await saveData({
        accountId: activeAccount.accountId,
        data: data.map((d) => ({
          ...d,
          _id: undefined, // Convexのシステムフィールドを除外
          _creationTime: undefined,
        })),
        dateRange: options.dateRange,
        options: {
          includeVideoMetrics: options.includeVideoMetrics,
          includeDemographics: options.includeDemographics,
          includePlacements: options.includePlacements,
          includeTargeting: options.includeTargeting,
        },
      })
    } catch (err: any) {
      if (err.name === 'AbortError') {
        vibe.info('データ取得がキャンセルされました')
        return
      }

      vibe.bad('拡張クリエイティブメトリクス取得エラー', { error: err.message || err })
      setError(err.message || 'データの取得に失敗しました')
      setProgress({
        stage: 'idle',
        percentage: 0,
        message: '',
      })
    } finally {
      setIsLoading(false)
    }
  }, [activeAccount, apiService, options, saveData])

  // 初回ロード
  useEffect(() => {
    if (cachedData && cachedData.length > 0) {
      setData(cachedData as any)
      vibe.good('キャッシュからデータをロード', { count: cachedData.length })
    } else if (activeAccount && apiService) {
      fetchData()
    }
  }, [activeAccount?.accountId])

  // 自動更新
  useEffect(() => {
    if (!options.autoRefresh || !activeAccount || !apiService) return

    const interval = setInterval(() => {
      fetchData()
    }, options.refreshInterval || 300000) // デフォルト5分

    return () => clearInterval(interval)
  }, [options.autoRefresh, options.refreshInterval, activeAccount?.accountId, fetchData])

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

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
    hasVideoContent,
    totalCreatives,
    creativesByType,
  }
}
