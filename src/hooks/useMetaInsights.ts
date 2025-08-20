import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useMemo, useState, useCallback } from 'react'
import { MetaInsightsData } from '../services/metaApiService'

interface UseMetaInsightsOptions {
  accountId: string
  startDate?: string | null
  endDate?: string | null
  campaignId?: string | null
  adId?: string | null
  pageSize?: number
}

interface UseMetaInsightsResult {
  insights: MetaInsightsData[]
  isLoading: boolean
  hasMore: boolean
  loadMore: () => void
  stats: {
    totalSpend: number
    totalImpressions: number
    totalClicks: number
    totalConversions: number
    avgCPC: number
    avgCPM: number
    avgCTR: number
    totalRecords: number
    uniqueCampaigns: number
    uniqueAds: number
  } | null
  syncStatus: {
    lastFullSync: string | null
    lastIncrementalSync: string | null
    totalRecords: number
    earliestDate: string | null
    latestDate: string | null
  } | null
  importInsights: (data: MetaInsightsData[], strategy: 'replace' | 'merge') => Promise<any>
  clearAccountData: () => Promise<any>
  findMissingRanges: (
    start: string,
    end: string
  ) => Array<{ start: string; end: string }> | undefined
}

/**
 * Meta InsightsデータをConvexから取得・管理するフック
 */
export function useMetaInsights(options: UseMetaInsightsOptions): UseMetaInsightsResult {
  const { accountId, startDate, endDate, campaignId, adId, pageSize = 1000 } = options
  const [pages, setPages] = useState<string[]>([undefined as any])
  const [allInsights, setAllInsights] = useState<MetaInsightsData[]>([])

  // Mutations
  const importMutation = useMutation(api.metaInsights.importInsights)
  const clearMutation = useMutation(api.metaInsights.clearAccountData)
  const saveSyncStatusMutation = useMutation(api.metaInsights.saveSyncStatus)

  // 最新のページを取得
  const latestCursor = pages[pages.length - 1]
  const latestPageData = useQuery(api.metaInsights.getInsights, {
    accountId,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    campaignId: campaignId || undefined,
    adId: adId || undefined,
    limit: pageSize,
    cursor: latestCursor,
  })

  // 統計情報を取得
  const statsData = useQuery(api.metaInsights.getInsightsStats, {
    accountId,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  })

  // 同期ステータスを取得
  const syncStatus = useQuery(api.metaInsights.getSyncStatus, {
    accountId,
  })

  // 欠損期間を検出
  const findMissingRanges = useCallback(
    (start: string, end: string) => {
      if (!accountId) return undefined
      return useQuery(api.metaInsights.findMissingDateRanges, {
        accountId,
        startDate: start,
        endDate: end,
      })
    },
    [accountId]
  )

  // 新しいページのデータが来たら追加
  useMemo(() => {
    if (latestPageData?.items) {
      // Convexのデータ型をMetaInsightsDataに変換
      const newInsights = latestPageData.items.map((item: any) => ({
        ...item,
        impressions: String(item.impressions || 0),
        clicks: String(item.clicks || 0),
        spend: String(item.spend || 0),
        reach: String(item.reach || 0),
        frequency: String(item.frequency || 0),
        cpm: String(item.cpm || 0),
        cpc: String(item.cpc || 0),
        ctr: String(item.ctr || 0),
        conversions: item.conversions ? String(item.conversions) : undefined,
        conversion_value: item.conversion_value ? String(item.conversion_value) : undefined,
        cost_per_conversion: item.cost_per_conversion
          ? String(item.cost_per_conversion)
          : undefined,
        roas: item.roas ? String(item.roas) : undefined,
      })) as MetaInsightsData[]

      const existingIds = new Set(
        allInsights.map((i) => `${i.date_start}_${i.campaign_id || 'account'}_${i.ad_id || ''}`)
      )

      const uniqueNewInsights = newInsights.filter(
        (i) => !existingIds.has(`${i.date_start}_${i.campaign_id || 'account'}_${i.ad_id || ''}`)
      )

      if (uniqueNewInsights.length > 0) {
        setAllInsights((prev) => [...prev, ...uniqueNewInsights])
      }
    }
  }, [latestPageData])

  // 次のページを読み込む
  const loadMore = useCallback(() => {
    if (latestPageData?.hasMore && latestPageData.nextCursor) {
      setPages((prev) => [...prev, latestPageData.nextCursor!])
    }
  }, [latestPageData])

  // データをインポート
  const importInsights = useCallback(
    async (data: MetaInsightsData[], strategy: 'replace' | 'merge') => {
      // バッチサイズを設定
      const batchSize = 500
      let totalImported = 0
      let totalUpdated = 0
      let totalSkipped = 0

      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize)
        const result = await importMutation({
          insights: batch as any,
          strategy,
        })

        totalImported += result.imported
        totalUpdated += result.updated
        totalSkipped += result.skipped
      }

      // 同期ステータスを更新
      if (data.length > 0) {
        const dates = data
          .map((d) => d.date_start)
          .filter(Boolean)
          .sort()
        await saveSyncStatusMutation({
          accountId,
          lastIncrementalSync: new Date().toISOString(),
          totalRecords: totalImported + totalUpdated,
          earliestDate: dates[0],
          latestDate: dates[dates.length - 1],
        })
      }

      // ページをリセットして再読み込み
      setPages([undefined as any])
      setAllInsights([])

      return {
        imported: totalImported,
        updated: totalUpdated,
        skipped: totalSkipped,
        total: totalImported + totalUpdated + totalSkipped,
      }
    },
    [accountId, importMutation, saveSyncStatusMutation]
  )

  // アカウントデータをクリア
  const clearAccountData = useCallback(async () => {
    const result = await clearMutation({ accountId })

    // ローカル状態もクリア
    setPages([undefined as any])
    setAllInsights([])

    return result
  }, [accountId, clearMutation])

  // 統計情報を整形
  const stats = useMemo(() => {
    if (!statsData) return null

    return {
      totalSpend: statsData.totalSpend,
      totalImpressions: statsData.totalImpressions,
      totalClicks: statsData.totalClicks,
      totalConversions: statsData.totalConversions,
      avgCPC: statsData.avgCPC,
      avgCPM: statsData.avgCPM,
      avgCTR: statsData.avgCTR,
      totalRecords: statsData.totalRecords,
      uniqueCampaigns: statsData.uniqueCampaigns,
      uniqueAds: statsData.uniqueAds,
    }
  }, [statsData])

  // 同期ステータスを整形
  const formattedSyncStatus = useMemo(() => {
    if (!syncStatus) return null

    return {
      lastFullSync: syncStatus.lastFullSync || null,
      lastIncrementalSync: syncStatus.lastIncrementalSync || null,
      totalRecords: syncStatus.totalRecords || 0,
      earliestDate: syncStatus.earliestDate || null,
      latestDate: syncStatus.latestDate || null,
    }
  }, [syncStatus])

  return {
    insights: allInsights,
    isLoading: latestPageData === undefined || statsData === undefined,
    hasMore: latestPageData?.hasMore || false,
    loadMore,
    stats,
    syncStatus: formattedSyncStatus,
    importInsights,
    clearAccountData,
    findMissingRanges,
  }
}
