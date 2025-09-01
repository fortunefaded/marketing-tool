/**
 * 3層キャッシュシステム統合Hook
 *
 * L1: メモリキャッシュ（useRef）
 * L2: Convex永続化キャッシュ
 * L3: Meta API
 */

import { useRef, useCallback, useMemo, useEffect, useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'

// ============================================================================
// 型定義
// ============================================================================

export interface CacheOptions {
  accountId: string
  dateRange: string
  forceRefresh?: boolean
  enableMemoryCache?: boolean
  enableConvexCache?: boolean
  expiresInHours?: number
  onCacheHit?: (source: CacheSource) => void
  onCacheMiss?: () => void
  onError?: (error: Error) => void
}

export type CacheSource = 'memory' | 'convex' | 'api' | 'none'

export interface CacheResult<T> {
  data: T | null
  loading: boolean
  error: Error | null
  source: CacheSource
  cacheStats: CacheStats
  refresh: () => Promise<void>
  clear: () => void
}

export interface CacheStats {
  memoryHits: number
  convexHits: number
  apiCalls: number
  totalRequests: number
  hitRate: number
  lastUpdated: Date | null
  dataSize: number
}

interface MemoryCacheEntry<T> {
  data: T
  timestamp: number
  expiresAt: number
  accessCount: number
  size: number
}

// ============================================================================
// LRUキャッシュ実装
// ============================================================================

class LRUCache<T> {
  private cache: Map<string, MemoryCacheEntry<T>>
  private maxSize: number // bytes
  private maxEntries: number
  private currentSize: number

  constructor(maxSizeMB: number = 50, maxEntries: number = 1000) {
    this.cache = new Map()
    this.maxSize = maxSizeMB * 1024 * 1024
    this.maxEntries = maxEntries
    this.currentSize = 0
  }

  get(key: string): T | null {
    const entry = this.cache.get(key)

    if (!entry) {
      return null
    }

    // 期限チェック
    if (entry.expiresAt < Date.now()) {
      this.delete(key)
      return null
    }

    // LRU: 最近使用したものを最後に移動
    this.cache.delete(key)
    this.cache.set(key, {
      ...entry,
      accessCount: entry.accessCount + 1,
    })

    return entry.data
  }

  set(key: string, data: T, expiresInHours: number = 24): void {
    const dataStr = JSON.stringify(data)
    const size = new Blob([dataStr]).size

    // 既存エントリがある場合はサイズを減算
    const existing = this.cache.get(key)
    if (existing) {
      this.currentSize -= existing.size
      this.cache.delete(key)
    }

    // サイズ制限チェック
    while (this.currentSize + size > this.maxSize || this.cache.size >= this.maxEntries) {
      const firstKey = this.cache.keys().next().value
      if (!firstKey) break
      this.delete(firstKey)
    }

    // 新しいエントリを追加
    const entry: MemoryCacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + expiresInHours * 60 * 60 * 1000,
      accessCount: 0,
      size,
    }

    this.cache.set(key, entry)
    this.currentSize += size
  }

  delete(key: string): boolean {
    const entry = this.cache.get(key)
    if (entry) {
      this.currentSize -= entry.size
      return this.cache.delete(key)
    }
    return false
  }

  clear(): void {
    this.cache.clear()
    this.currentSize = 0
  }

  getStats(): {
    entries: number
    sizeBytes: number
    sizeMB: number
    oldestEntry: Date | null
    newestEntry: Date | null
  } {
    const timestamps = Array.from(this.cache.values()).map((e) => e.timestamp)

    return {
      entries: this.cache.size,
      sizeBytes: this.currentSize,
      sizeMB: this.currentSize / (1024 * 1024),
      oldestEntry: timestamps.length > 0 ? new Date(Math.min(...timestamps)) : null,
      newestEntry: timestamps.length > 0 ? new Date(Math.max(...timestamps)) : null,
    }
  }

  // 期限切れエントリを削除
  evictExpired(): number {
    const now = Date.now()
    let evicted = 0

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt < now) {
        this.delete(key)
        evicted++
      }
    }

    return evicted
  }
}

// ============================================================================
// 3層キャッシュHook
// ============================================================================

export function useThreeLayerCache<T = any>(
  options: CacheOptions,
  fetcher: () => Promise<T>
): CacheResult<T> {
  // L1: メモリキャッシュ
  const memoryCacheRef = useRef<LRUCache<T>>(new LRUCache<T>())

  // 状態管理
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [source, setSource] = useState<CacheSource>('none')
  const [stats, setStats] = useState<CacheStats>({
    memoryHits: 0,
    convexHits: 0,
    apiCalls: 0,
    totalRequests: 0,
    hitRate: 0,
    lastUpdated: null,
    dataSize: 0,
  })

  // キャッシュキー生成
  const cacheKey = useMemo(() => {
    return `${options.accountId}_${options.dateRange}`
  }, [options.accountId, options.dateRange])

  // L2: Convexキャッシュクエリ
  const convexData = useQuery(
    options.enableConvexCache !== false ? api.cache.cacheEntries.getByAccountAndRange : undefined,
    options.enableConvexCache !== false
      ? {
          accountId: options.accountId,
          dateRange: options.dateRange,
        }
      : undefined
  )

  // Convexミューテーション
  const createCacheEntry = useMutation(api.cache.cacheEntries.create)
  const updateCacheEntry = useMutation(api.cache.cacheEntries.update)

  // 統計更新
  const updateStats = useCallback((hitSource: CacheSource) => {
    setStats((prev) => {
      const newStats = { ...prev }
      newStats.totalRequests++

      switch (hitSource) {
        case 'memory':
          newStats.memoryHits++
          break
        case 'convex':
          newStats.convexHits++
          break
        case 'api':
          newStats.apiCalls++
          break
      }

      const hits = newStats.memoryHits + newStats.convexHits
      newStats.hitRate = newStats.totalRequests > 0 ? (hits / newStats.totalRequests) * 100 : 0

      return newStats
    })
  }, [])

  // データ取得ロジック
  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // 強制リフレッシュでない場合はキャッシュをチェック
      if (!options.forceRefresh) {
        // L1: メモリキャッシュチェック
        if (options.enableMemoryCache !== false) {
          const memoryData = memoryCacheRef.current.get(cacheKey)
          if (memoryData) {
            setData(memoryData)
            setSource('memory')
            updateStats('memory')
            options.onCacheHit?.('memory')
            setLoading(false)
            return
          }
        }

        // L2: Convexキャッシュチェック
        if (options.enableConvexCache !== false && convexData?.data) {
          const convexCachedData = convexData.data as T
          setData(convexCachedData)
          setSource('convex')
          updateStats('convex')
          options.onCacheHit?.('convex')

          // メモリキャッシュに保存
          if (options.enableMemoryCache !== false) {
            memoryCacheRef.current.set(cacheKey, convexCachedData, options.expiresInHours)
          }

          setLoading(false)
          return
        }
      }

      // L3: API呼び出し
      options.onCacheMiss?.()
      const apiData = await fetcher()

      setData(apiData)
      setSource('api')
      updateStats('api')

      // 両キャッシュレイヤーに保存
      if (options.enableMemoryCache !== false) {
        memoryCacheRef.current.set(cacheKey, apiData, options.expiresInHours)
      }

      if (options.enableConvexCache !== false) {
        try {
          if (convexData) {
            // 既存エントリを更新
            await updateCacheEntry({
              cacheKey,
              data: apiData as any,
              expiresInHours: options.expiresInHours,
            })
          } else {
            // 新規エントリを作成
            await createCacheEntry({
              accountId: options.accountId,
              dateRange: options.dateRange,
              data: apiData as any,
              expiresInHours: options.expiresInHours,
            })
          }
        } catch (convexError) {
          console.error('Failed to save to Convex cache:', convexError)
        }
      }

      setStats((prev) => ({
        ...prev,
        lastUpdated: new Date(),
        dataSize: new Blob([JSON.stringify(apiData)]).size,
      }))
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error')
      setError(error)
      options.onError?.(error)
    } finally {
      setLoading(false)
    }
  }, [cacheKey, options, convexData, fetcher, updateStats, createCacheEntry, updateCacheEntry])

  // 初回取得
  useEffect(() => {
    fetchData()
  }, []) // fetchDataの依存を意図的に除外（無限ループ防止）

  // リフレッシュ関数
  const refresh = useCallback(async () => {
    // 強制リフレッシュフラグを立てて再取得
    const originalForceRefresh = options.forceRefresh
    options.forceRefresh = true
    await fetchData()
    options.forceRefresh = originalForceRefresh
  }, [fetchData, options])

  // クリア関数
  const clear = useCallback(() => {
    memoryCacheRef.current.delete(cacheKey)
    setData(null)
    setSource('none')
  }, [cacheKey])

  // 定期的な期限切れエントリの削除
  useEffect(() => {
    const interval = setInterval(() => {
      memoryCacheRef.current.evictExpired()
    }, 60 * 1000) // 1分ごと

    return () => clearInterval(interval)
  }, [])

  return {
    data,
    loading,
    error,
    source,
    cacheStats: stats,
    refresh,
    clear,
  }
}

// ============================================================================
// ユーティリティHooks
// ============================================================================

/**
 * メモリキャッシュの統計を取得
 */
export function useMemoryCacheStats(): {
  entries: number
  sizeBytes: number
  sizeMB: number
  oldestEntry: Date | null
  newestEntry: Date | null
} {
  const cacheRef = useRef<LRUCache<any>>(new LRUCache<any>())
  const [stats, setStats] = useState(cacheRef.current.getStats())

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(cacheRef.current.getStats())
    }, 5000) // 5秒ごとに更新

    return () => clearInterval(interval)
  }, [])

  return stats
}

/**
 * キャッシュのプリロード
 */
export function useCachePreload<T = any>(
  configs: Array<{
    accountId: string
    dateRange: string
    fetcher: () => Promise<T>
  }>
): {
  preload: () => Promise<void>
  progress: number
  loading: boolean
} {
  const [progress, setProgress] = useState(0)
  const [loading, setLoading] = useState(false)

  const preload = useCallback(async () => {
    setLoading(true)
    setProgress(0)

    for (let i = 0; i < configs.length; i++) {
      const config = configs[i]
      const cacheKey = `${config.accountId}_${config.dateRange}`

      try {
        // APIからデータを取得してキャッシュに保存
        const data = await config.fetcher()
        // ここでキャッシュに保存する処理を実装
      } catch (error) {
        console.error(`Failed to preload ${cacheKey}:`, error)
      }

      setProgress(((i + 1) / configs.length) * 100)
    }

    setLoading(false)
  }, [configs])

  return { preload, progress, loading }
}
