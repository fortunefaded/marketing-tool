import { useQuery, useMutation, useInfiniteQuery, useQueryClient, UseQueryOptions } from '@tanstack/react-query'
import { MetaApiServiceV2, MetaApiConfig, Insight } from '../services/MetaApiServiceV2'
import { useCallback, useMemo } from 'react'

// React Query キーファクトリー
export const metaApiKeys = {
  all: ['meta'] as const,
  insights: () => [...metaApiKeys.all, 'insights'] as const,
  insightsList: (filters: any) => [...metaApiKeys.insights(), filters] as const,
  campaigns: () => [...metaApiKeys.all, 'campaigns'] as const,
  campaignsList: (filters: any) => [...metaApiKeys.campaigns(), filters] as const,
  creative: (adId: string) => [...metaApiKeys.all, 'creative', adId] as const,
}

/**
 * Meta APIクライアントフック
 */
export function useMetaApiClient(config: MetaApiConfig) {
  return useMemo(() => new MetaApiServiceV2(config), [
    config.accessToken,
    config.accountId,
    config.apiVersion
  ])
}

/**
 * インサイトデータ取得フック
 */
export function useMetaInsights(
  config: MetaApiConfig,
  params?: {
    level?: 'account' | 'campaign' | 'adset' | 'ad'
    dateRange?: { since: string; until: string }
    fields?: string[]
  },
  options?: UseQueryOptions<{ data: Insight[] }>
) {
  const client = useMetaApiClient(config)

  return useQuery({
    queryKey: metaApiKeys.insightsList(params),
    queryFn: () => client.getInsights(params),
    staleTime: 5 * 60 * 1000, // 5分
    gcTime: 30 * 60 * 1000, // 30分
    ...options
  })
}

/**
 * インサイトデータ無限スクロールフック
 */
export function useMetaInsightsInfinite(
  config: MetaApiConfig,
  params?: {
    level?: 'account' | 'campaign' | 'adset' | 'ad'
    dateRange?: { since: string; until: string }
    fields?: string[]
    limit?: number
  }
) {
  const client = useMetaApiClient(config)

  return useInfiniteQuery({
    queryKey: metaApiKeys.insightsList(params),
    queryFn: ({ pageParam }) => 
      client.getInsights({ ...params, after: pageParam }),
    getNextPageParam: (lastPage) => lastPage.paging?.cursors?.after,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000
  })
}

/**
 * キャンペーンデータ取得フック
 */
export function useMetaCampaigns(
  config: MetaApiConfig,
  params?: {
    fields?: string[]
    limit?: number
  }
) {
  const client = useMetaApiClient(config)

  return useQuery({
    queryKey: metaApiKeys.campaignsList(params),
    queryFn: () => client.getCampaigns(params),
    staleTime: 10 * 60 * 1000, // 10分
    gcTime: 60 * 60 * 1000 // 1時間
  })
}

/**
 * クリエイティブデータ取得フック
 */
export function useMetaCreative(
  config: MetaApiConfig,
  adId: string,
  options?: UseQueryOptions<any>
) {
  const client = useMetaApiClient(config)

  return useQuery({
    queryKey: metaApiKeys.creative(adId),
    queryFn: () => client.getAdCreatives(adId),
    enabled: !!adId,
    staleTime: 30 * 60 * 1000, // 30分
    ...options
  })
}

/**
 * バッチリクエストフック
 */
export function useMetaBatch(config: MetaApiConfig) {
  const client = useMetaApiClient(config)

  return useMutation({
    mutationFn: (requests: Parameters<typeof client.batch>[0]) => 
      client.batch(requests)
  })
}

/**
 * 複数広告のデータを効率的に取得するフック
 */
export function useMetaAdsBatch(
  config: MetaApiConfig,
  adIds: string[]
) {
  const batch = useMetaBatch(config)

  const fetchAds = useCallback(async () => {
    if (!adIds.length) return []

    const requests = adIds.map(id => ({
      method: 'GET',
      relative_url: `${id}?fields=id,name,status,creative`
    }))

    const result = await batch.mutateAsync(requests)
    return Object.values(result)
  }, [adIds, batch])

  return useQuery({
    queryKey: ['meta', 'ads-batch', adIds],
    queryFn: fetchAds,
    enabled: adIds.length > 0,
    staleTime: 10 * 60 * 1000
  })
}

/**
 * データプリフェッチ用フック
 */
export function useMetaPrefetch(config: MetaApiConfig) {
  const queryClient = useQueryClient()
  const client = useMetaApiClient(config)

  const prefetchInsights = useCallback(
    async (params?: Parameters<typeof client.getInsights>[0]) => {
      await queryClient.prefetchQuery({
        queryKey: metaApiKeys.insightsList(params),
        queryFn: () => client.getInsights(params),
        staleTime: 5 * 60 * 1000
      })
    },
    [client, queryClient]
  )

  const prefetchCampaigns = useCallback(
    async (params?: Parameters<typeof client.getCampaigns>[0]) => {
      await queryClient.prefetchQuery({
        queryKey: metaApiKeys.campaignsList(params),
        queryFn: () => client.getCampaigns(params),
        staleTime: 10 * 60 * 1000
      })
    },
    [client, queryClient]
  )

  return {
    prefetchInsights,
    prefetchCampaigns
  }
}