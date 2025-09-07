/**
 * キャッシュマネージャー
 * メモリキャッシュとConvex永続化を統合管理
 */

import { logger } from '../../utils/logger'

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
  hits: number
}

export class CacheManager {
  private memoryCache = new Map<string, CacheEntry<any>>()
  private maxSize = 1000 // 最大エントリ数
  private maxMemory = 50 * 1024 * 1024 // 50MB
  private currentMemory = 0

  constructor() {
    // 定期的なクリーンアップ
    setInterval(() => this.cleanup(), 60 * 1000) // 1分ごと
  }

  /**
   * キャッシュから取得
   */
  async get<T>(key: string): Promise<T | null> {
    const entry = this.memoryCache.get(key)
    
    if (!entry) {
      return null
    }

    // TTLチェック
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.delete(key)
      return null
    }

    // ヒット数を増加
    entry.hits++
    
    logger.debug(`[CacheManager] Cache hit: ${key}`)
    return entry.data as T
  }

  /**
   * キャッシュに保存
   */
  async set<T>(key: string, data: T, ttl: number = 5 * 60 * 1000): Promise<void> {
    const dataSize = this.estimateSize(data)
    
    // メモリ制限チェック
    if (this.currentMemory + dataSize > this.maxMemory) {
      this.evictLRU()
    }

    // サイズ制限チェック
    if (this.memoryCache.size >= this.maxSize) {
      this.evictLRU()
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
      hits: 0
    }

    this.memoryCache.set(key, entry)
    this.currentMemory += dataSize
    
    logger.debug(`[CacheManager] Cache set: ${key}`)
  }

  /**
   * キャッシュから削除
   */
  delete(key: string): boolean {
    const entry = this.memoryCache.get(key)
    if (entry) {
      this.currentMemory -= this.estimateSize(entry.data)
      this.memoryCache.delete(key)
      return true
    }
    return false
  }

  /**
   * パターンマッチでクリア
   */
  clearPattern(pattern: string): void {
    const regex = new RegExp(pattern)
    const keysToDelete: string[] = []

    this.memoryCache.forEach((_, key) => {
      if (regex.test(key)) {
        keysToDelete.push(key)
      }
    })

    keysToDelete.forEach(key => this.delete(key))
    
    logger.info(`[CacheManager] Cleared ${keysToDelete.length} entries matching pattern: ${pattern}`)
  }

  /**
   * 全キャッシュクリア
   */
  clear(): void {
    this.memoryCache.clear()
    this.currentMemory = 0
    logger.info('[CacheManager] Cache cleared')
  }

  /**
   * キャッシュ統計
   */
  getStats() {
    let totalHits = 0
    let totalSize = 0
    const hotKeys: Array<{ key: string; hits: number }> = []

    this.memoryCache.forEach((entry, key) => {
      totalHits += entry.hits
      totalSize += this.estimateSize(entry.data)
      
      if (entry.hits > 0) {
        hotKeys.push({ key, hits: entry.hits })
      }
    })

    hotKeys.sort((a, b) => b.hits - a.hits)

    return {
      entries: this.memoryCache.size,
      memoryUsed: this.currentMemory,
      memoryLimit: this.maxMemory,
      totalHits,
      averageHits: this.memoryCache.size > 0 ? totalHits / this.memoryCache.size : 0,
      hotKeys: hotKeys.slice(0, 10)
    }
  }

  /**
   * プライベートメソッド
   */

  private cleanup(): void {
    let cleaned = 0
    const now = Date.now()

    this.memoryCache.forEach((entry, key) => {
      if (now - entry.timestamp > entry.ttl) {
        this.delete(key)
        cleaned++
      }
    })

    if (cleaned > 0) {
      logger.debug(`[CacheManager] Cleaned up ${cleaned} expired entries`)
    }
  }

  private evictLRU(): void {
    // 最も使用頻度の低いエントリを見つける
    let lruKey: string | null = null
    let minScore = Infinity

    this.memoryCache.forEach((entry, key) => {
      // スコア = ヒット数 / 経過時間
      const age = Date.now() - entry.timestamp
      const score = entry.hits / (age / 1000 / 60) // 分単位

      if (score < minScore) {
        minScore = score
        lruKey = key
      }
    })

    if (lruKey) {
      this.delete(lruKey)
      logger.debug(`[CacheManager] Evicted LRU entry: ${lruKey}`)
    }
  }

  private estimateSize(obj: any): number {
    // 簡易的なサイズ推定
    try {
      return JSON.stringify(obj).length * 2 // UTF-16
    } catch {
      return 1024 // デフォルト1KB
    }
  }
}