import { CacheInterface } from './storage/CacheInterface'
// import { MetricsData, CreativeSummary } from '../types/creative-metrics'
// TODO: Define MetricsData and CreativeSummary types in @/types
type MetricsData = any
type CreativeSummary = any
import LZString from 'lz-string'
import { ConvexReactClient } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { vibe } from '@/lib/vibelogger'

// キャッシュキーのプレフィックス
const CACHE_PREFIX = 'creative_metrics_'
const TTL_HOURS = 24

export class CreativeMetricsCacheUnified {
  private cache: CacheInterface

  constructor(cache: CacheInterface) {
    this.cache = cache
  }

  // 静的ファクトリーメソッド
  static createLocalStorage(): CreativeMetricsCacheUnified {
    return new CreativeMetricsCacheUnified(new LocalStorageCache())
  }

  static createConvex(client: ConvexReactClient): CreativeMetricsCacheUnified {
    return new CreativeMetricsCacheUnified(new ConvexCache(client))
  }

  // キャッシュキーを生成
  private getCacheKey(accountId: string, dateRange?: { start: string; end: string }): string {
    const base = `${CACHE_PREFIX}${accountId}`
    if (dateRange) {
      return `${base}_${dateRange.start}_${dateRange.end}`
    }
    return base
  }

  // メトリクスデータをキャッシュに保存
  async saveMetrics(
    accountId: string,
    data: MetricsData,
    dateRange?: { start: string; end: string }
  ): Promise<void> {
    const key = this.getCacheKey(accountId, dateRange)
    await this.cache.set(key, data, TTL_HOURS * 60 * 60 * 1000)
  }

  // キャッシュからメトリクスデータを取得
  async getMetrics(
    accountId: string,
    dateRange?: { start: string; end: string }
  ): Promise<MetricsData | null> {
    const key = this.getCacheKey(accountId, dateRange)
    return await this.cache.get<MetricsData>(key)
  }

  // クリエイティブサマリーを保存
  async saveCreativeSummary(
    accountId: string,
    creativeId: string,
    summary: CreativeSummary
  ): Promise<void> {
    const key = `${CACHE_PREFIX}summary_${accountId}_${creativeId}`
    await this.cache.set(key, summary, TTL_HOURS * 60 * 60 * 1000)
  }

  // クリエイティブサマリーを取得
  async getCreativeSummary(
    accountId: string,
    creativeId: string
  ): Promise<CreativeSummary | null> {
    const key = `${CACHE_PREFIX}summary_${accountId}_${creativeId}`
    return await this.cache.get<CreativeSummary>(key)
  }

  // キャッシュをクリア
  async clearCache(accountId?: string): Promise<void> {
    if (accountId) {
      await this.cache.clear(`${CACHE_PREFIX}${accountId}`)
    } else {
      await this.cache.clear(CACHE_PREFIX)
    }
  }

  // キャッシュの有効性をチェック
  async isCacheValid(
    accountId: string,
    dateRange?: { start: string; end: string }
  ): Promise<boolean> {
    const key = this.getCacheKey(accountId, dateRange)
    return await this.cache.has(key)
  }
}

// LocalStorage実装
class LocalStorageCache implements CacheInterface {
  async get<T>(key: string): Promise<T | null> {
    try {
      const item = localStorage.getItem(key)
      if (!item) return null

      const { data, timestamp, ttl } = JSON.parse(item)
      
      // TTLチェック
      if (ttl && Date.now() - timestamp > ttl) {
        await this.delete(key)
        return null
      }

      // 圧縮されたデータの解凍
      if (typeof data === 'string' && data.startsWith('LZ:')) {
        const decompressed = LZString.decompressFromBase64(data.substring(3))
        return decompressed ? JSON.parse(decompressed) : null
      }

      return data
    } catch (error) {
      vibe.bad('キャッシュ取得失敗', { key, error })
      return null
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      const dataStr = JSON.stringify(value)
      
      // 大きなデータは圧縮
      const data = dataStr.length > 1024 
        ? 'LZ:' + LZString.compressToBase64(dataStr)
        : value

      const item = {
        data,
        timestamp: Date.now(),
        ttl
      }

      localStorage.setItem(key, JSON.stringify(item))
    } catch (error) {
      vibe.bad('キャッシュ設定失敗', { key, error })
    }
  }

  async delete(key: string): Promise<void> {
    localStorage.removeItem(key)
  }

  async clear(prefix?: string): Promise<void> {
    const keys = await this.keys(prefix)
    keys.forEach(key => localStorage.removeItem(key))
  }

  async has(key: string): Promise<boolean> {
    const value = await this.get(key)
    return value !== null
  }

  async keys(prefix?: string): Promise<string[]> {
    const keys: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && (!prefix || key.startsWith(prefix))) {
        keys.push(key)
      }
    }
    return keys
  }
}

// Convex実装
class ConvexCache implements CacheInterface {
  constructor(private client: ConvexReactClient) {}

  async get<T>(key: string): Promise<T | null> {
    try {
      const result = await this.client.query(api.creativeMetricsCache.get, { key })
      return result?.data || null
    } catch {
      return null
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      await this.client.mutation(api.creativeMetricsCache.set, {
        key,
        data: value as any,
        ttl
      })
    } catch (error) {
      vibe.bad('Convexキャッシュ設定失敗', { key, error })
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.client.mutation(api.creativeMetricsCache.delete, { key })
    } catch (error) {
      vibe.bad('Convexキャッシュ削除失敗', { key, error })
    }
  }

  async clear(prefix?: string): Promise<void> {
    try {
      await this.client.mutation(api.creativeMetricsCache.clear, { prefix })
    } catch (error) {
      vibe.bad('Convexキャッシュクリア失敗', { error })
    }
  }

  async has(key: string): Promise<boolean> {
    const value = await this.get(key)
    return value !== null
  }

  async keys(prefix?: string): Promise<string[]> {
    try {
      return await this.client.query(api.creativeMetricsCache.keys, { prefix }) || []
    } catch {
      return []
    }
  }
}