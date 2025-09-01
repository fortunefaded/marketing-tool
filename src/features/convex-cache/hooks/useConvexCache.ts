/**
 * Convexキャッシュレイヤー Hook
 *
 * L2永続化キャッシュとリアルタイム同期を提供
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQuery, useMutation, useConvex } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { ConvexReactClient } from 'convex/react'

// ============================================================================
// 型定義
// ============================================================================

export interface ConvexCacheOptions {
  accountId: string
  dateRange: string
  enabled?: boolean
  autoRefresh?: boolean
  refreshInterval?: number // minutes
  onUpdate?: (data: any) => void
  onError?: (error: Error) => void
}

export interface ConvexCacheEntry {
  id: Id<'cacheEntries'>
  cacheKey: string
  accountId: string
  dateRange: string
  data: any
  dataSize: number
  recordCount: number
  createdAt: number
  updatedAt: number
  expiresAt: number
  accessCount: number
  lastAccessedAt: number
  checksum: string
  isComplete: boolean
  isCompressed: boolean
  fetchTimeMs: number
  processTimeMs: number
}

export interface DataFreshnessInfo {
  id: Id<'dataFreshness'>
  accountId: string
  dateRange: string
  freshnessStatus: 'realtime' | 'neartime' | 'stabilizing' | 'finalized'
  lastUpdated: number
  nextUpdateAt: number
  updatePriority: number
  updateCount: number
  apiCallsToday: number
  apiCallsTotal: number
  dataCompleteness: number
  missingDates?: string[]
  lastVerifiedAt: number
}

export interface ConvexCacheResult {
  data: any | null
  loading: boolean
  error: Error | null
  isStale: boolean
  freshnessInfo: DataFreshnessInfo | null
  cacheInfo: ConvexCacheEntry | null
  refresh: () => Promise<void>
  invalidate: () => Promise<void>
  updateFreshness: (status: DataFreshnessInfo['freshnessStatus']) => Promise<void>
}

// ============================================================================
// Convexキャッシュ Hook
// ============================================================================

export function useConvexCache(options: ConvexCacheOptions): ConvexCacheResult {
  const convex = useConvex()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Convexクエリ: キャッシュエントリ取得
  const cacheEntry = useQuery(
    options.enabled !== false ? api.cache.cacheEntries.getByAccountAndRange : undefined,
    options.enabled !== false
      ? {
          accountId: options.accountId,
          dateRange: options.dateRange,
        }
      : undefined
  )

  // Convexクエリ: データ鮮度情報取得
  const freshnessInfo = useQuery(
    options.enabled !== false ? api.cache.dataFreshness.getByAccountAndRange : undefined,
    options.enabled !== false
      ? {
          accountId: options.accountId,
          dateRange: options.dateRange,
        }
      : undefined
  )

  // Convexミューテーション
  const createCacheEntry = useMutation(api.cache.cacheEntries.create)
  const updateCacheEntry = useMutation(api.cache.cacheEntries.update)
  const removeCacheEntry = useMutation(api.cache.cacheEntries.remove)
  const extendExpiry = useMutation(api.cache.cacheEntries.extendExpiry)

  const createFreshness = useMutation(api.cache.dataFreshness.create)
  const updateFreshnessStatus = useMutation(api.cache.dataFreshness.updateFreshnessStatus)
  const incrementApiCalls = useMutation(api.cache.dataFreshness.incrementApiCalls)

  // キャッシュキー生成
  const cacheKey = useMemo(() => {
    return `${options.accountId}_${options.dateRange}`
  }, [options.accountId, options.dateRange])

  // データの鮮度チェック
  const isStale = useMemo(() => {
    if (!cacheEntry || !freshnessInfo) return true

    const now = Date.now()

    // 有効期限チェック
    if (cacheEntry.expiresAt < now) return true

    // 次の更新時刻を過ぎているか
    if (freshnessInfo.nextUpdateAt < now) return true

    // データ完全性が低い場合
    if (freshnessInfo.dataCompleteness < 80) return true

    return false
  }, [cacheEntry, freshnessInfo])

  // データ更新
  const refresh = useCallback(async () => {
    if (isRefreshing || !options.enabled) return

    setIsRefreshing(true)
    setError(null)

    try {
      // ここで実際のデータ取得ロジックを実装
      // 通常はparent hookから渡されるfetcher関数を使用

      // API呼び出し回数をインクリメント
      if (freshnessInfo) {
        await incrementApiCalls({
          accountId: options.accountId,
          dateRange: options.dateRange,
          count: 1,
        })
      }

      // 成功時のコールバック
      if (cacheEntry?.data) {
        options.onUpdate?.(cacheEntry.data)
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Refresh failed')
      setError(error)
      options.onError?.(error)
    } finally {
      setIsRefreshing(false)
    }
  }, [isRefreshing, options, freshnessInfo, cacheEntry, incrementApiCalls])

  // キャッシュ無効化
  const invalidate = useCallback(async () => {
    if (!cacheEntry) return

    try {
      await removeCacheEntry({
        cacheKey,
      })

      // 無効化後に再取得
      await refresh()
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Invalidation failed')
      setError(error)
      options.onError?.(error)
    }
  }, [cacheEntry, cacheKey, removeCacheEntry, refresh, options])

  // 鮮度状態更新
  const updateFreshness = useCallback(
    async (status: DataFreshnessInfo['freshnessStatus']) => {
      if (!freshnessInfo) {
        // 鮮度情報が存在しない場合は作成
        try {
          await createFreshness({
            accountId: options.accountId,
            dateRange: options.dateRange,
            startDate: '', // 実際の日付範囲から計算
            endDate: '', // 実際の日付範囲から計算
            freshnessStatus: status,
          })
        } catch (err) {
          const error = err instanceof Error ? err : new Error('Failed to create freshness info')
          setError(error)
          options.onError?.(error)
        }
      } else {
        // 既存の鮮度情報を更新
        try {
          await updateFreshnessStatus({
            id: freshnessInfo.id,
            freshnessStatus: status,
          })
        } catch (err) {
          const error = err instanceof Error ? err : new Error('Failed to update freshness status')
          setError(error)
          options.onError?.(error)
        }
      }
    },
    [freshnessInfo, options, createFreshness, updateFreshnessStatus]
  )

  // 自動更新設定
  useEffect(() => {
    if (!options.autoRefresh || !options.refreshInterval) return

    const intervalMs = options.refreshInterval * 60 * 1000
    const interval = setInterval(() => {
      if (isStale) {
        refresh()
      }
    }, intervalMs)

    return () => clearInterval(interval)
  }, [options.autoRefresh, options.refreshInterval, isStale, refresh])

  // リアルタイム更新の監視
  useEffect(() => {
    if (!cacheEntry?.data || !options.onUpdate) return

    // Convexのリアクティブクエリにより自動的に更新される
    options.onUpdate(cacheEntry.data)
  }, [cacheEntry?.data, options.onUpdate])

  // 有効期限の自動延長
  useEffect(() => {
    if (!cacheEntry) return

    const now = Date.now()
    const timeUntilExpiry = cacheEntry.expiresAt - now
    const oneHour = 60 * 60 * 1000

    // 有効期限が1時間以内に切れる場合は延長
    if (timeUntilExpiry < oneHour && timeUntilExpiry > 0) {
      extendExpiry({
        cacheKey,
        additionalHours: 24,
      }).catch((err) => {
        console.error('Failed to extend cache expiry:', err)
      })
    }
  }, [cacheEntry, cacheKey, extendExpiry])

  return {
    data: cacheEntry?.data || null,
    loading: loading || isRefreshing,
    error,
    isStale,
    freshnessInfo: freshnessInfo || null,
    cacheInfo: cacheEntry || null,
    refresh,
    invalidate,
    updateFreshness,
  }
}

// ============================================================================
// Convexキャッシュ統計 Hook
// ============================================================================

export function useConvexCacheStats(accountId?: string) {
  const stats = useQuery(api.cache.cacheEntries.getStats, accountId ? { accountId } : {})

  return stats
}

// ============================================================================
// データ鮮度管理 Hook
// ============================================================================

export function useDataFreshness(accountId: string) {
  const freshnessEntries = useQuery(api.cache.dataFreshness.getByAccount, { accountId })

  const needsUpdate = useQuery(api.cache.dataFreshness.getEntriesNeedingUpdate, { limit: 10 })

  return {
    entries: freshnessEntries || [],
    needsUpdate: needsUpdate || [],
  }
}

// ============================================================================
// リアルタイム同期 Hook
// ============================================================================

export function useRealtimeSync<T = any>(
  accountId: string,
  dateRange: string,
  options?: {
    onSync?: (data: T) => void
    onConflict?: (local: T, remote: T) => T
  }
): {
  isSyncing: boolean
  lastSyncAt: Date | null
  conflicts: number
  forceSync: () => Promise<void>
} {
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null)
  const [conflicts, setConflicts] = useState(0)

  // Convexのリアルタイムクエリ
  const cacheData = useQuery(api.cache.cacheEntries.getByAccountAndRange, { accountId, dateRange })

  // データ同期の監視
  useEffect(() => {
    if (!cacheData?.data) return

    setLastSyncAt(new Date(cacheData.updatedAt))
    options?.onSync?.(cacheData.data)
  }, [cacheData, options])

  // 強制同期
  const forceSync = useCallback(async () => {
    setIsSyncing(true)

    try {
      // ここで同期ロジックを実装
      // 通常はConvexの楽観的更新により自動同期される

      setLastSyncAt(new Date())
    } catch (error) {
      console.error('Sync failed:', error)
    } finally {
      setIsSyncing(false)
    }
  }, [])

  return {
    isSyncing,
    lastSyncAt,
    conflicts,
    forceSync,
  }
}

// ============================================================================
// バッチ操作 Hook
// ============================================================================

export function useConvexCacheBatch() {
  const createMultiple = useMutation(api.cache.cacheEntries.create)
  const removeExpired = useMutation(api.cache.cacheEntries.removeExpired)
  const removeByAccount = useMutation(api.cache.cacheEntries.removeByAccount)

  const batchCreate = useCallback(
    async (
      entries: Array<{
        accountId: string
        dateRange: string
        data: any
      }>
    ) => {
      const results = []

      for (const entry of entries) {
        try {
          const id = await createMultiple({
            accountId: entry.accountId,
            dateRange: entry.dateRange,
            data: entry.data,
          })
          results.push({ success: true, id })
        } catch (error) {
          results.push({ success: false, error })
        }
      }

      return results
    },
    [createMultiple]
  )

  const cleanupExpired = useCallback(
    async (accountId?: string) => {
      return await removeExpired({ accountId })
    },
    [removeExpired]
  )

  const clearAccount = useCallback(
    async (accountId: string) => {
      return await removeByAccount({ accountId })
    },
    [removeByAccount]
  )

  return {
    batchCreate,
    cleanupExpired,
    clearAccount,
  }
}
