import { useState, useCallback } from 'react'
import { AdInsight } from '@/types'
import { vibe } from '@/lib/vibelogger'

const CACHE_PREFIX = 'meta-insights-cache-'
// キャッシュ有効期限の設定
// 24時間 = 24 * 60 * 60 * 1000
// 12時間 = 12 * 60 * 60 * 1000
// 6時間 = 6 * 60 * 60 * 1000
// 3時間 = 3 * 60 * 60 * 1000
const CACHE_EXPIRY = 24 * 60 * 60 * 1000 // 24時間

// 拡張されたキャッシュデータ構造
interface CacheData {
  accountId: string
  data: AdInsight[]
  timestamp: number
  expiresAt: number
  nextPageUrl: string | null // 次ページのURL
  isComplete: boolean // 全データ取得完了フラグ
  totalFetched: number // 取得済み件数
  lastFetchTime: number // 最後の取得時刻
}

interface UseLocalCacheResult {
  getCachedData: (accountId: string) => AdInsight[] | null
  setCachedData: (
    accountId: string,
    data: AdInsight[],
    nextPageUrl?: string | null,
    isComplete?: boolean
  ) => void
  getCachedDataFull: (accountId: string) => CacheData | null
  clearCache: (accountId: string) => void
  clearAllCaches: () => void
  isCacheValid: (accountId: string) => boolean
  getCacheInfo: (accountId: string) => { timestamp: Date | null; expiresAt: Date | null }
}

/**
 * ローカルストレージベースのキャッシュフック
 */
export function useLocalCache(): UseLocalCacheResult {
  const getCacheKey = (accountId: string) => `${CACHE_PREFIX}${accountId}`

  const getCachedData = useCallback((accountId: string): AdInsight[] | null => {
    try {
      const key = getCacheKey(accountId)
      console.log('🔍 キャッシュ検索:', { key, accountId })

      const cached = localStorage.getItem(key)

      if (!cached) {
        console.log('📭 キャッシュなし:', { accountId, key })
        // 全キーを確認
        const allKeys = Object.keys(localStorage).filter((k) => k.startsWith(CACHE_PREFIX))
        console.log('📋 利用可能なキャッシュキー:', allKeys)
        return null
      }

      const cacheData: CacheData = JSON.parse(cached)

      // アカウントIDチェック
      if (cacheData.accountId !== accountId) {
        console.log('🔄 キャッシュのアカウントIDが異なる:', {
          expected: accountId,
          cached: cacheData.accountId,
        })
        return null
      }

      // 有効期限チェック
      if (Date.now() > cacheData.expiresAt) {
        console.log('⏰ キャッシュ期限切れ:', {
          expired: new Date(cacheData.expiresAt),
          now: new Date(),
        })
        localStorage.removeItem(key)
        return null
      }

      console.log('📦 有効なキャッシュ発見:', {
        accountId,
        itemCount: cacheData.data.length,
        timestamp: new Date(cacheData.timestamp),
        expiresAt: new Date(cacheData.expiresAt),
      })

      return cacheData.data
    } catch (error) {
      console.error('❌ キャッシュ読み込みエラー:', error)
      return null
    }
  }, [])

  const setCachedData = useCallback(
    (accountId: string, data: AdInsight[], nextPageUrl?: string | null, isComplete?: boolean) => {
      try {
        const key = getCacheKey(accountId)
        const timestamp = Date.now()
        const cacheData: CacheData = {
          accountId,
          data,
          timestamp,
          expiresAt: timestamp + CACHE_EXPIRY,
          nextPageUrl: nextPageUrl || null,
          isComplete: isComplete || false,
          totalFetched: data.length,
          lastFetchTime: timestamp,
        }

        console.log('💾 キャッシュ保存開始:', {
          key,
          accountId,
          dataCount: data.length,
          isComplete,
          hasNextPage: !!nextPageUrl,
          expiresIn: '24時間',
        })

        localStorage.setItem(key, JSON.stringify(cacheData))

        // 保存確認
        const saved = localStorage.getItem(key)
        console.log('✅ キャッシュ保存確認:', {
          saved: !!saved,
          size: saved ? saved.length : 0,
        })

        vibe.good(`キャッシュ保存完了: ${data.length}件`, {
          accountId,
          expiresAt: new Date(cacheData.expiresAt),
        })
      } catch (error) {
        console.error('❌ キャッシュ保存エラー:', error)
        vibe.bad('キャッシュ保存に失敗しました')
      }
    },
    []
  )

  const clearCache = useCallback((accountId: string) => {
    const key = getCacheKey(accountId)
    localStorage.removeItem(key)
    vibe.info('キャッシュクリア完了', { accountId })
  }, [])

  const clearAllCaches = useCallback(() => {
    const keys = Object.keys(localStorage)
    let cleared = 0

    keys.forEach((key) => {
      if (key.startsWith(CACHE_PREFIX)) {
        localStorage.removeItem(key)
        cleared++
      }
    })

    vibe.info(`全キャッシュクリア完了: ${cleared}件`)
  }, [])

  const isCacheValid = useCallback(
    (accountId: string): boolean => {
      const data = getCachedData(accountId)
      return data !== null && data.length > 0
    },
    [getCachedData]
  )

  const getCacheInfo = useCallback(
    (accountId: string): { timestamp: Date | null; expiresAt: Date | null } => {
      try {
        const key = getCacheKey(accountId)
        const cached = localStorage.getItem(key)

        if (!cached) {
          return { timestamp: null, expiresAt: null }
        }

        const cacheData: CacheData = JSON.parse(cached)
        return {
          timestamp: new Date(cacheData.timestamp),
          expiresAt: new Date(cacheData.expiresAt),
        }
      } catch (error) {
        return { timestamp: null, expiresAt: null }
      }
    },
    []
  )

  // 完全なキャッシュデータを取得
  const getCachedDataFull = useCallback((accountId: string): CacheData | null => {
    try {
      const key = getCacheKey(accountId)
      const cached = localStorage.getItem(key)

      if (!cached) {
        return null
      }

      const cacheData: CacheData = JSON.parse(cached)

      // アカウントIDチェック
      if (cacheData.accountId !== accountId) {
        return null
      }

      // 有効期限チェック
      if (Date.now() > cacheData.expiresAt) {
        localStorage.removeItem(key)
        return null
      }

      return cacheData
    } catch (error) {
      console.error('❌ キャッシュ読み込みエラー:', error)
      return null
    }
  }, [])

  return {
    getCachedData,
    setCachedData,
    getCachedDataFull,
    clearCache,
    clearAllCaches,
    isCacheValid,
    getCacheInfo,
  }
}
