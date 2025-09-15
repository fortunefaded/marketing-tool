import { vibe } from '@/utils/vibelogger'

/**
 * Convexが利用できない場合のダミー実装
 */
export function useDummyConvexCache(_accountId: string) {
  vibe.warn('Using dummy Convex cache - no real data available')
  
  return {
    data: null,
    isLoading: false,
    hasCache: false,
    error: new Error('Convex not available - using dummy data')
  }
}

/**
 * 緊急時用：最低限のダミーデータを返す
 */
export function useEmergencyConvexCache(accountId: string) {
  vibe.warn('Using emergency dummy data for Convex cache')
  
  // 少し遅延してローディング感を演出
  
  const dummyData = accountId ? [
    {
      adId: 'dummy-1',
      adName: 'Sample Ad 1',
      metrics: { frequency: 2.5, ctr: 1.2, cpm: 15.0 },
      score: 85,
      status: 'healthy'
    },
    {
      adId: 'dummy-2', 
      adName: 'Sample Ad 2',
      metrics: { frequency: 4.2, ctr: 0.8, cpm: 22.0 },
      score: 65,
      status: 'warning'
    }
  ] : null
  
  return {
    data: dummyData,
    isLoading: false,
    hasCache: !!dummyData,
    error: null
  }
}