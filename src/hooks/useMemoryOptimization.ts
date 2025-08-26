import { useEffect, useRef, useCallback } from 'react'
import { ECForceOrder } from '@/types'

interface MemoryOptimizationOptions {
  maxDataPoints?: number
  enableSampling?: boolean
  sampleRate?: number
  enableCaching?: boolean
  cacheTimeout?: number
}

interface MemoryStats {
  dataSize: number
  cachedItems: number
  lastOptimization: Date | null
}

// メモリ最適化のためのカスタムフック
export function useMemoryOptimization(options: MemoryOptimizationOptions = {}) {
  const {
    maxDataPoints = 10000,
    enableSampling = true,
    sampleRate = 0.1, // 10%のサンプリング
    enableCaching = true,
    cacheTimeout = 300000, // 5分
  } = options

  const cacheRef = useRef<Map<string, { data: any; timestamp: number }>>(new Map())
  const memoryStatsRef = useRef<MemoryStats>({
    dataSize: 0,
    cachedItems: 0,
    lastOptimization: null,
  })

  // メモリ使用量の推定
  const estimateMemoryUsage = useCallback((data: any): number => {
    const jsonString = JSON.stringify(data)
    return new Blob([jsonString]).size
  }, [])

  // データのサンプリング
  const sampleData = useCallback(
    <T>(data: T[], rate: number = sampleRate): T[] => {
      if (!enableSampling || data.length <= maxDataPoints) {
        return data
      }

      const interval = Math.ceil(1 / rate)
      return data.filter((_, index) => index % interval === 0)
    },
    [enableSampling, maxDataPoints, sampleRate]
  )

  // 集計データの最適化
  const optimizeAggregatedData = useCallback(
    (data: ECForceOrder[]): ECForceOrder[] => {
      if (data.length <= maxDataPoints) {
        return data
      }

      // 時系列データの場合、重要度に基づいてサンプリング
      const sortedData = [...data].sort(
        (a, b) => new Date(b.受注日).getTime() - new Date(a.受注日).getTime()
      )

      // 最新のデータは全て保持、古いデータは段階的にサンプリング
      const recentCount = Math.floor(maxDataPoints * 0.5)
      const recentData = sortedData.slice(0, recentCount)
      const olderData = sortedData.slice(recentCount)

      // 古いデータは徐々にサンプリング率を下げる
      const sampledOlderData = olderData.filter((_, index) => {
        const age = index / olderData.length
        const keepProbability = 1 - age * 0.8 // 最大80%まで削減
        return Math.random() < keepProbability
      })

      return [...recentData, ...sampledOlderData]
    },
    [maxDataPoints]
  )

  // キャッシュ管理
  const getCachedData = useCallback(
    <T>(key: string): T | null => {
      if (!enableCaching) return null

      const cached = cacheRef.current.get(key)
      if (!cached) return null

      const now = Date.now()
      if (now - cached.timestamp > cacheTimeout) {
        cacheRef.current.delete(key)
        return null
      }

      return cached.data as T
    },
    [enableCaching, cacheTimeout]
  )

  const setCachedData = useCallback(
    <T>(key: string, data: T): void => {
      if (!enableCaching) return

      cacheRef.current.set(key, {
        data,
        timestamp: Date.now(),
      })

      // キャッシュサイズ制限（最大100アイテム）
      if (cacheRef.current.size > 100) {
        const oldestKey = Array.from(cacheRef.current.entries()).sort(
          (a, b) => a[1].timestamp - b[1].timestamp
        )[0][0]
        cacheRef.current.delete(oldestKey)
      }

      memoryStatsRef.current.cachedItems = cacheRef.current.size
    },
    [enableCaching]
  )

  // キャッシュクリア
  const clearCache = useCallback(() => {
    cacheRef.current.clear()
    memoryStatsRef.current.cachedItems = 0
  }, [])

  // 定期的なメモリクリーンアップ
  useEffect(() => {
    const interval = setInterval(() => {
      // 期限切れキャッシュの削除
      const now = Date.now()
      for (const [key, value] of cacheRef.current.entries()) {
        if (now - value.timestamp > cacheTimeout) {
          cacheRef.current.delete(key)
        }
      }

      memoryStatsRef.current.cachedItems = cacheRef.current.size
      memoryStatsRef.current.lastOptimization = new Date()
    }, 60000) // 1分ごと

    return () => clearInterval(interval)
  }, [cacheTimeout])

  // グラフ用データの最適化
  const optimizeChartData = useCallback((data: any[], maxPoints: number = 100): any[] => {
    if (data.length <= maxPoints) {
      return data
    }

    // 間隔を計算してデータポイントを選択
    const interval = Math.ceil(data.length / maxPoints)
    const optimized = []

    for (let i = 0; i < data.length; i += interval) {
      // 範囲内のデータを集約
      const rangeEnd = Math.min(i + interval, data.length)
      const rangeData = data.slice(i, rangeEnd)

      // 数値データの場合は平均を取る
      if (rangeData.length > 0 && typeof rangeData[0] === 'object') {
        const aggregated = { ...rangeData[0] }

        // 数値フィールドの平均化
        const numericKeys = Object.keys(aggregated).filter(
          (key) => typeof aggregated[key] === 'number'
        )

        numericKeys.forEach((key) => {
          const sum = rangeData.reduce((acc, item) => acc + (item[key] || 0), 0)
          aggregated[key] = sum / rangeData.length
        })

        optimized.push(aggregated)
      } else {
        optimized.push(rangeData[0])
      }
    }

    return optimized
  }, [])

  // メモリ統計の取得
  const getMemoryStats = useCallback((): MemoryStats => {
    return { ...memoryStatsRef.current }
  }, [])

  // 大量データの分割処理
  const processInBatches = useCallback(
    async <T, R>(
      data: T[],
      processor: (batch: T[]) => R | Promise<R>,
      batchSize: number = 1000
    ): Promise<R[]> => {
      const results: R[] = []

      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize)
        const result = await processor(batch)
        results.push(result)

        // UIの応答性を保つため、各バッチ後に少し待機
        await new Promise((resolve) => setTimeout(resolve, 0))
      }

      return results
    },
    []
  )

  return {
    sampleData,
    optimizeAggregatedData,
    optimizeChartData,
    getCachedData,
    setCachedData,
    clearCache,
    getMemoryStats,
    processInBatches,
    estimateMemoryUsage,
  }
}

// データ集約用のユーティリティ
export function aggregateDataByPeriod(
  orders: ECForceOrder[],
  period: 'day' | 'week' | 'month' = 'day'
): Array<{ date: string; count: number; revenue: number }> {
  const aggregated = new Map<string, { count: number; revenue: number }>()

  orders.forEach((order) => {
    const date = new Date(order.受注日)
    let key: string

    switch (period) {
      case 'week': {
        const weekStart = new Date(date)
        weekStart.setDate(date.getDate() - date.getDay())
        key = weekStart.toISOString().split('T')[0]
        break
      }
      case 'month':
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        break
      default:
        key = date.toISOString().split('T')[0]
    }

    const existing = aggregated.get(key) || { count: 0, revenue: 0 }
    aggregated.set(key, {
      count: existing.count + 1,
      revenue: existing.revenue + order.小計,
    })
  })

  return Array.from(aggregated.entries())
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date))
}
