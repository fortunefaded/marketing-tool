import { useSafeConvexQuery } from './useSafeConvexQuery'

export function useConvexCache(accountId: string) {
  const { data, isLoading, error } = useSafeConvexQuery(
    'metaInsights.getInsights',
    accountId ? { accountId, limit: 1000 } : undefined // limitを増やす
  )

  console.log('📦 Convexキャッシュデータ:', {
    accountId,
    hasData: !!data,
    itemsCount: data?.items?.length || 0,
    hasMore: data?.hasMore,
    isLoading,
    error: error?.message
  })

  return {
    data: data?.items || null,
    isLoading,
    hasCache: !!(data?.items && data.items.length > 0),
    error
  }
}