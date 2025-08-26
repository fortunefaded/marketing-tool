import { useSafeConvexQuery } from './useSafeConvexQuery'

export function useConvexCache(accountId: string) {
  const { data, isLoading, error } = useSafeConvexQuery(
    'metaInsights.getInsights',
    accountId ? { accountId, limit: 100 } : undefined
  )

  return {
    data: data?.items || null,
    isLoading,
    hasCache: !!(data?.items && data.items.length > 0),
    error
  }
}