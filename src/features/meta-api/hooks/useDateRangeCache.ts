/**
 * useDateRangeCache.ts
 * TASK-005: 日付範囲対応のキャッシュ管理フック
 */

import { useCallback, useRef } from 'react'
import type { AdInsight } from '../types'
import type { DateRangePreset } from '../utils/date-range-helpers'
import { generateDateRangeCacheKey, getDateRangeInfo } from '../utils/date-range-helpers'

interface CachedData {
  data: AdInsight[]
  timestamp: Date
  dateRange: DateRangePreset
  nextPageUrl?: string
  isComplete: boolean
  totalFetched: number
}

interface CacheEntry {
  key: string
  data: CachedData
  lastAccess: Date
  priority: number
}

/**
 * 日付範囲別のキャッシュ管理フック
 */
export function useDateRangeCache() {
  // メモリベースのキャッシュ（日付範囲別）
  const cacheRef = useRef<Map<string, CacheEntry>>(new Map())
  
  // キャッシュの最大サイズ
  const MAX_CACHE_SIZE = 10
  
  /**
   * キャッシュからデータを取得
   */
  const getCachedData = useCallback((accountId: string, dateRange: DateRangePreset): CachedData | null => {
    const key = generateDateRangeCacheKey(accountId, dateRange)
    const entry = cacheRef.current.get(key)
    
    if (!entry) {
      console.log('📦 キャッシュミス:', { accountId, dateRange, key })
      return null
    }
    
    // アクセス時刻を更新
    entry.lastAccess = new Date()
    
    // データの有効性チェック（1時間以内のデータのみ有効）
    const age = Date.now() - entry.data.timestamp.getTime()
    const isStale = age > 60 * 60 * 1000 // 1時間
    
    if (isStale) {
      console.log('📦 キャッシュ期限切れ:', { 
        accountId, 
        dateRange, 
        age: Math.round(age / 1000 / 60), // 分単位
        key 
      })
      cacheRef.current.delete(key)
      return null
    }
    
    console.log('📦 キャッシュヒット:', { 
      accountId, 
      dateRange, 
      dataCount: entry.data.data.length,
      age: Math.round(age / 1000 / 60), // 分単位
      key 
    })
    
    return entry.data
  }, [])
  
  /**
   * キャッシュにデータを保存
   */
  const setCachedData = useCallback((
    accountId: string, 
    dateRange: DateRangePreset,
    data: AdInsight[],
    nextPageUrl?: string,
    isComplete = false
  ): void => {
    const key = generateDateRangeCacheKey(accountId, dateRange)
    const rangeInfo = getDateRangeInfo(dateRange)
    
    const cachedData: CachedData = {
      data,
      timestamp: new Date(),
      dateRange,
      nextPageUrl,
      isComplete,
      totalFetched: data.length
    }
    
    const entry: CacheEntry = {
      key,
      data: cachedData,
      lastAccess: new Date(),
      priority: rangeInfo.daysCount === Infinity ? 9 : rangeInfo.daysCount
    }
    
    // キャッシュサイズ制限
    if (cacheRef.current.size >= MAX_CACHE_SIZE) {
      evictLeastRecentlyUsed()
    }
    
    cacheRef.current.set(key, entry)
    
    console.log('📦 キャッシュ保存:', { 
      accountId, 
      dateRange, 
      dataCount: data.length,
      isComplete,
      totalCacheSize: cacheRef.current.size,
      key 
    })
  }, [])
  
  /**
   * 特定の日付範囲のキャッシュをクリア
   */
  const clearDateRangeCache = useCallback((accountId: string, dateRange: DateRangePreset): void => {
    const key = generateDateRangeCacheKey(accountId, dateRange)
    const deleted = cacheRef.current.delete(key)
    
    console.log('📦 キャッシュクリア:', { 
      accountId, 
      dateRange, 
      deleted,
      key 
    })
  }, [])
  
  /**
   * アカウント全体のキャッシュをクリア
   */
  const clearAccountCache = useCallback((accountId: string): void => {
    let deletedCount = 0
    
    for (const [key, entry] of cacheRef.current.entries()) {
      if (key.includes(`insights_${accountId}_`)) {
        cacheRef.current.delete(key)
        deletedCount++
      }
    }
    
    console.log('📦 アカウントキャッシュクリア:', { 
      accountId, 
      deletedCount,
      remainingSize: cacheRef.current.size 
    })
  }, [])
  
  /**
   * 全キャッシュをクリア
   */
  const clearAllCache = useCallback((): void => {
    const previousSize = cacheRef.current.size
    cacheRef.current.clear()
    
    console.log('📦 全キャッシュクリア:', { previousSize })
  }, [])
  
  /**
   * LRU方式でキャッシュエビクション
   */
  const evictLeastRecentlyUsed = useCallback((): void => {
    if (cacheRef.current.size === 0) return
    
    // 最も古いアクセスのエントリを見つける
    let oldestKey: string | null = null
    let oldestTime = Date.now()
    
    for (const [key, entry] of cacheRef.current.entries()) {
      if (entry.lastAccess.getTime() < oldestTime) {
        oldestTime = entry.lastAccess.getTime()
        oldestKey = key
      }
    }
    
    if (oldestKey) {
      cacheRef.current.delete(oldestKey)
      console.log('📦 LRUエビクション:', { 
        evictedKey: oldestKey,
        age: Math.round((Date.now() - oldestTime) / 1000 / 60) // 分単位
      })
    }
  }, [])
  
  /**
   * キャッシュ統計を取得
   */
  const getCacheStats = useCallback(() => {
    const entries = Array.from(cacheRef.current.values())
    const totalDataPoints = entries.reduce((sum, entry) => sum + entry.data.data.length, 0)
    const dateRanges = [...new Set(entries.map(entry => entry.data.dateRange))]
    
    return {
      totalEntries: cacheRef.current.size,
      totalDataPoints,
      dateRanges,
      maxSize: MAX_CACHE_SIZE,
      usage: Math.round((cacheRef.current.size / MAX_CACHE_SIZE) * 100), // %
      entries: entries.map(entry => ({
        dateRange: entry.data.dateRange,
        dataCount: entry.data.data.length,
        age: Math.round((Date.now() - entry.data.timestamp.getTime()) / 1000 / 60), // 分単位
        isComplete: entry.data.isComplete
      }))
    }
  }, [])
  
  /**
   * データの更新が必要かチェック
   */
  const shouldRefreshData = useCallback((accountId: string, dateRange: DateRangePreset): boolean => {
    const cached = getCachedData(accountId, dateRange)
    
    if (!cached) return true // キャッシュがない場合は更新必要
    
    const age = Date.now() - cached.timestamp.getTime()
    const isStale = age > 30 * 60 * 1000 // 30分で古いと判定
    
    return isStale || !cached.isComplete
  }, [getCachedData])
  
  return {
    getCachedData,
    setCachedData,
    clearDateRangeCache,
    clearAccountCache,
    clearAllCache,
    getCacheStats,
    shouldRefreshData
  }
}