import { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { MetaAccountManager } from '../services/metaAccountManager'
import { CreativeAggregator, CreativeMetrics, AggregationOptions } from '../services/creativeAggregator'

interface UseCreativeMetricsOptions {
  startDate?: string
  endDate?: string
  period?: 'daily' | 'weekly' | 'monthly'
  creativeTypes?: ('image' | 'video' | 'carousel' | 'text')[]
  campaignIds?: string[]
  autoRefresh?: boolean
  refreshInterval?: number // ミリ秒
}

interface UseCreativeMetricsReturn {
  metrics: CreativeMetrics[]
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
  campaigns: Array<{ id: string; name: string }>
  summary: {
    totalCreatives: number
    totalImpressions: number
    totalClicks: number
    totalConversions: number
    totalSpend: number
    totalRevenue: number
    avgCtr: number
    avgRoas: number
  } | null
}

export const useCreativeMetrics = (
  options: UseCreativeMetricsOptions = {}
): UseCreativeMetricsReturn => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [metrics, setMetrics] = useState<CreativeMetrics[]>([])
  const manager = MetaAccountManager.getInstance()

  const {
    startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate = new Date().toISOString().split('T')[0],
    period = 'daily',
    creativeTypes,
    campaignIds,
    autoRefresh = false,
    refreshInterval = 300000, // 5分
  } = options

  const activeAccount = manager.getActiveAccount()
  const apiService = manager.getActiveApiService()

  // Convexクエリ
  const convexMetrics = useQuery(
    api.creativeMetrics.getCreativeMetrics,
    activeAccount
      ? {
          accountId: activeAccount.accountId,
          startDate,
          endDate,
          creativeTypes,
          campaignIds,
          aggregationPeriod: period,
        }
      : 'skip'
  )

  const campaigns = useQuery(
    api.creativeMetrics.getCampaigns,
    activeAccount ? { accountId: activeAccount.accountId } : 'skip'
  ) || []

  const summary = useQuery(
    api.creativeMetrics.getMetricsSummary,
    activeAccount
      ? {
          accountId: activeAccount.accountId,
          startDate,
          endDate,
        }
      : 'skip'
  )

  // Convexミューテーション
  const saveMetrics = useMutation(api.creativeMetrics.saveCreativeMetrics)

  // メトリクスを更新
  const refresh = async () => {
    if (!activeAccount || !apiService) {
      setError('Meta広告アカウントが設定されていません')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // CreativeAggregatorを使用してデータを集計
      const aggregator = new CreativeAggregator(apiService)
      
      const aggregationOptions: AggregationOptions = {
        startDate,
        endDate,
        period,
        creativeTypes,
        campaignIds,
      }

      const aggregatedMetrics = await aggregator.aggregateCreatives(
        activeAccount.accountId,
        aggregationOptions
      )

      // Convexに保存
      await saveMetrics({
        accountId: activeAccount.accountId,
        metrics: aggregatedMetrics,
      })

      setMetrics(aggregatedMetrics)
    } catch (err) {
      console.error('Failed to refresh creative metrics:', err)
      setError(err instanceof Error ? err.message : 'メトリクスの更新に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  // 初回ロード
  useEffect(() => {
    if (convexMetrics && convexMetrics.length > 0) {
      setMetrics(convexMetrics as any)
    } else if (activeAccount && apiService) {
      // Convexにデータがない場合は初回取得
      refresh()
    }
  }, [activeAccount?.accountId])

  // 自動更新
  useEffect(() => {
    if (!autoRefresh || !activeAccount || !apiService) return

    const interval = setInterval(() => {
      refresh()
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, activeAccount?.accountId])

  // フィルタリング後のメトリクス
  const filteredMetrics = useMemo(() => {
    let filtered = metrics

    // 追加のクライアントサイドフィルタリング（必要に応じて）
    
    return filtered
  }, [metrics])

  return {
    metrics: filteredMetrics,
    isLoading,
    error,
    refresh,
    campaigns,
    summary: summary || null,
  }
}