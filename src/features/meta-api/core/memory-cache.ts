// TASK-103: Memory Cache Basic Implementation - Green Phase
// メモリキャッシュの基本実装（TTL、サイズ制限、LRU対応）

export interface CacheResult<T> {
  hit: boolean
  data?: T
  timestamp: number
  ttl?: number
}

export interface CacheItem<T> {
  data: T
  timestamp: number
  ttl: number
  lastAccessed: number
  size: number
}

export interface CacheOptions {
  ttl?: number // TTL（ミリ秒）
  maxSize?: number // 最大サイズ（バイト）
  enableLRU?: boolean // LRU機能の有効化
}

export interface CacheStatistics {
  hits: number
  misses: number
  hitRate: number
  memoryUsage: number
  itemCount: number
}

export interface CacheHealth {
  isHealthy: boolean
  memoryUsageRatio: number
  hitRate: number
  itemCount: number
}

export class MemoryCache<T> {
  private cache: Map<string, CacheItem<T>> = new Map()
  private hits: number = 0
  private misses: number = 0
  
  private readonly defaultTTL: number
  private readonly maxSize: number
  private readonly enableLRU: boolean
  private currentSize: number = 0

  constructor(options: CacheOptions = {}) {
    this.defaultTTL = options.ttl ?? 5 * 60 * 1000 // デフォルト5分
    this.maxSize = options.maxSize ?? 50 * 1024 * 1024 // デフォルト50MB
    this.enableLRU = options.enableLRU ?? true

    // バリデーション
    if (this.defaultTTL <= 0) {
      throw new Error('TTL must be positive')
    }
    if (this.maxSize <= 0) {
      throw new Error('Max size must be positive')
    }
  }

  /**
   * キャッシュからデータを取得
   */
  get(key: string): CacheResult<T> {
    const item = this.cache.get(key)
    const now = Date.now()

    if (!item) {
      this.misses++
      return { hit: false, timestamp: now }
    }

    // TTL期限切れチェック
    if (now > item.timestamp + item.ttl) {
      this.cache.delete(key)
      this.currentSize -= item.size
      this.misses++
      return { hit: false, timestamp: now }
    }

    // LRU: アクセス時間更新
    if (this.enableLRU) {
      item.lastAccessed = now
    }

    this.hits++
    return {
      hit: true,
      data: item.data,
      timestamp: now,
      ttl: item.ttl
    }
  }

  /**
   * キャッシュにデータを保存
   */
  set(key: string, data: T, options: { ttl?: number } = {}): void {
    const now = Date.now()
    const ttl = options.ttl ?? this.defaultTTL
    const size = this.calculateSize(data)

    // 大きすぎるデータは保存しない
    if (size > this.maxSize) {
      return
    }

    // 既存データがあれば削除
    if (this.cache.has(key)) {
      const existingItem = this.cache.get(key)!
      this.currentSize -= existingItem.size
    }

    // サイズ制限チェックとエビクション
    this.evictIfNeeded(size)

    const item: CacheItem<T> = {
      data,
      timestamp: now,
      ttl,
      lastAccessed: now,
      size
    }

    this.cache.set(key, item)
    this.currentSize += size
  }

  /**
   * キャッシュクリア
   */
  clear(): void {
    this.cache.clear()
    this.currentSize = 0
  }

  /**
   * 期限切れアイテムの手動クリーンアップ
   */
  cleanup(): void {
    const now = Date.now()
    const keysToDelete: string[] = []

    this.cache.forEach((item, key) => {
      if (now > item.timestamp + item.ttl) {
        keysToDelete.push(key)
      }
    })

    for (const key of keysToDelete) {
      const item = this.cache.get(key)!
      this.cache.delete(key)
      this.currentSize -= item.size
    }
  }

  /**
   * 統計情報取得
   */
  getStatistics(): CacheStatistics {
    const totalRequests = this.hits + this.misses
    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: totalRequests > 0 ? this.hits / totalRequests : 0,
      memoryUsage: this.currentSize,
      itemCount: this.cache.size
    }
  }

  /**
   * 統計リセット
   */
  resetStatistics(): void {
    this.hits = 0
    this.misses = 0
  }

  /**
   * ヘルス状態取得
   */
  getHealth(): CacheHealth {
    const stats = this.getStatistics()
    return {
      isHealthy: stats.memoryUsage < this.maxSize * 0.9, // 90%未満で健康
      memoryUsageRatio: stats.memoryUsage / this.maxSize,
      hitRate: stats.hitRate,
      itemCount: stats.itemCount
    }
  }

  /**
   * キャッシュキー生成（静的メソッド）
   */
  static generateKey(prefix: string, params: Record<string, any>): string {
    // パラメータを正規化（順序独立）
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}=${JSON.stringify(params[key])}`)
      .join('&')
    
    return `${prefix}:${sortedParams}`
  }

  /**
   * 必要に応じてエビクション実行
   */
  private evictIfNeeded(newItemSize: number): void {
    if (!this.enableLRU) return

    // サイズ制限チェック
    while (this.currentSize + newItemSize > this.maxSize && this.cache.size > 0) {
      this.evictLeastRecentlyUsed()
    }
  }

  /**
   * LRU エビクション
   */
  private evictLeastRecentlyUsed(): void {
    let oldestKey: string | null = null
    let oldestAccess = Date.now()

    this.cache.forEach((item, key) => {
      if (item.lastAccessed < oldestAccess) {
        oldestAccess = item.lastAccessed
        oldestKey = key
      }
    })

    if (oldestKey) {
      const item = this.cache.get(oldestKey)!
      this.cache.delete(oldestKey)
      this.currentSize -= item.size
    }
  }

  /**
   * データサイズ計算（概算）
   */
  private calculateSize(data: T): number {
    const str = JSON.stringify(data)
    return str.length * 2 // UTF-16で概算
  }
}