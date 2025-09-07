import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { BatchedMetaApiService } from '../services/BatchedMetaApiService'
import { useCallback, useMemo } from 'react'

// React Queryの設定
export const queryConfig = {
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5分間は再フェッチしない
      cacheTime: 30 * 60 * 1000, // 30分間キャッシュ保持
      refetchOnWindowFocus: false,
      refetchOnReconnect: 'always',
      retry: 3,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    }
  }
}

interface UseMetaInsightsOptions {
  accountId: string
  dateRange: { since: string; until: string }
  level?: 'ad' | 'adset' | 'campaign'
}

/**
 * 最適化されたインサイトデータフック
 */
export function useOptimizedMetaInsights({
  accountId,
  dateRange,
  level = 'ad'
}: UseMetaInsightsOptions) {
  const queryClient = useQueryClient()
  const apiService = useMemo(() => new BatchedMetaApiService(), [])

  // インサイトデータの取得（無限スクロール対応）
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
    refetch
  } = useInfiniteQuery({
    queryKey: ['insights', accountId, dateRange, level],
    queryFn: async ({ pageParam = null }) => {
      const response = await apiService.getInsights({
        accountId,
        dateRange,
        level,
        after: pageParam,
        limit: 100
      })
      
      return {
        data: response.data,
        nextCursor: response.paging?.cursors?.after
      }
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    // 前のデータと新しいデータをマージ
    select: useCallback((data) => ({
      pages: data.pages,
      pageParams: data.pageParams,
      // フラット化されたすべてのインサイト
      insights: data.pages.flatMap(page => page.data)
    }), [])
  })

  // データの事前取得
  const prefetchInsights = useCallback(async (adIds: string[]) => {
    await Promise.all(
      adIds.map(adId =>
        queryClient.prefetchQuery({
          queryKey: ['insight', adId],
          queryFn: () => apiService.getInsightBatched(adId),
          staleTime: 5 * 60 * 1000
        })
      )
    )
  }, [apiService, queryClient])

  // 楽観的更新
  const updateInsight = useMutation({
    mutationFn: async ({ adId, updates }: { adId: string; updates: any }) => {
      // APIコール（実際の更新処理）
      return apiService.updateInsight(adId, updates)
    },
    onMutate: async ({ adId, updates }) => {
      // 楽観的更新のためにクエリをキャンセル
      await queryClient.cancelQueries({ queryKey: ['insights'] })
      
      // 現在のデータのスナップショット
      const previousInsights = queryClient.getQueryData(['insights'])
      
      // 楽観的に更新
      queryClient.setQueryData(['insights'], (old: any) => {
        // データを更新
        return {
          ...old,
          pages: old.pages.map(page => ({
            ...page,
            data: page.data.map(insight => 
              insight.ad_id === adId 
                ? { ...insight, ...updates }
                : insight
            )
          }))
        }
      })
      
      return { previousInsights }
    },
    onError: (err, variables, context) => {
      // エラー時は元に戻す
      if (context?.previousInsights) {
        queryClient.setQueryData(['insights'], context.previousInsights)
      }
    },
    onSettled: () => {
      // 最終的にサーバーデータを再取得
      queryClient.invalidateQueries({ queryKey: ['insights'] })
    }
  })

  // メモ化された集計値
  const metrics = useMemo(() => {
    if (!data?.insights) return null
    
    const insights = data.insights
    return {
      totalSpend: insights.reduce((sum, i) => sum + (i.spend || 0), 0),
      totalImpressions: insights.reduce((sum, i) => sum + (i.impressions || 0), 0),
      totalClicks: insights.reduce((sum, i) => sum + (i.clicks || 0), 0),
      avgCtr: insights.length > 0 
        ? insights.reduce((sum, i) => sum + (i.ctr || 0), 0) / insights.length 
        : 0,
      avgCpm: insights.length > 0
        ? insights.reduce((sum, i) => sum + (i.cpm || 0), 0) / insights.length
        : 0,
      totalReach: insights.reduce((sum, i) => sum + (i.reach || 0), 0),
      avgFrequency: insights.length > 0
        ? insights.reduce((sum, i) => sum + (i.frequency || 0), 0) / insights.length
        : 0
    }
  }, [data?.insights])

  return {
    insights: data?.insights || [],
    metrics,
    isLoading,
    isError,
    error,
    refetch,
    // 無限スクロール用
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    // ユーティリティ
    prefetchInsights,
    updateInsight: updateInsight.mutate,
    isUpdating: updateInsight.isLoading
  }
}

/**
 * 個別のインサイトデータフック（キャッシュから取得）
 */
export function useOptimizedInsight(adId: string) {
  const apiService = useMemo(() => new BatchedMetaApiService(), [])
  
  return useQuery({
    queryKey: ['insight', adId],
    queryFn: () => apiService.getInsightBatched(adId),
    // 親のクエリからキャッシュされている可能性が高い
    staleTime: 10 * 60 * 1000
  })
}