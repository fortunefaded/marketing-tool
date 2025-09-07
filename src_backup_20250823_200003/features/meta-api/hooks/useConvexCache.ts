import { useQuery } from 'convex/react'
import { api } from '../../../../convex/_generated/api'

export function useConvexCache(accountId: string) {
  // Check if api.metaInsights exists
  const queryFunction = api?.metaInsights?.getInsights
  
  const convexData = useQuery(
    accountId && queryFunction ? queryFunction : undefined,
    accountId ? { accountId, limit: 100 } : undefined
  )
  
  // Handle case where API might not be available
  if (!api?.metaInsights) {
    console.warn('Convex API metaInsights not available')
    return {
      data: null,
      isLoading: false,
      hasCache: false,
      error: new Error('Convex API not available')
    }
  }
  
  return {
    data: convexData?.items || null,
    isLoading: convexData === undefined && !!accountId,
    hasCache: !!(convexData?.items && convexData.items.length > 0),
    error: null
  }
}