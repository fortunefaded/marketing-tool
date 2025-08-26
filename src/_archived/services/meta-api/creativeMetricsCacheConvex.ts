import { CreativeMetrics } from './creativeAggregator'
import { ConvexReactClient } from 'convex/react'
import { api } from '../../convex/_generated/api'
import LZString from 'lz-string'

interface CachedCreativeMetrics {
  data: CreativeMetrics[]
  cachedAt: string
  accountId: string
  params: {
    startDate: string
    endDate: string
    period: string
    creativeTypes?: string[]
    campaignIds?: string[]
  }
}

export class CreativeMetricsCacheConvex {
  private static CACHE_DURATION_HOURS = 0.083 // 5分 = 0.083時間
  private convexClient: ConvexReactClient

  constructor(convexClient: ConvexReactClient) {
    this.convexClient = convexClient
  }

  // キャッシュキーを生成
  private generateCacheKey(
    accountId: string,
    params: CachedCreativeMetrics['params']
  ): string {
    const sortedParams = {
      accountId,
      startDate: params.startDate,
      endDate: params.endDate,
      period: params.period,
      creativeTypes: params.creativeTypes?.sort().join(',') || '',
      campaignIds: params.campaignIds?.sort().join(',') || '',
    }

    return btoa(JSON.stringify(sortedParams))
  }

  // キャッシュから取得
  async get(accountId: string, params: CachedCreativeMetrics['params']): Promise<CreativeMetrics[] | null> {
    try {
      const cacheKey = this.generateCacheKey(accountId, params)
      const cache = await this.convexClient.query(api.creativeMetricsCache.getCache, {
        cacheKey,
      })

      if (!cache || !cache.data) return null

      // 圧縮データを解凍（Convexに保存する際に圧縮している場合）
      let data: CreativeMetrics[]
      if (typeof cache.data === 'string') {
        const decompressed = LZString.decompressFromUTF16(cache.data)
        if (!decompressed) return null
        data = JSON.parse(decompressed)
      } else {
        data = cache.data as CreativeMetrics[]
      }

      logger.debug(`キャッシュヒット: ${data.length}件のクリエイティブメトリクス`)
      return data
    } catch (error) {
      logger.error('キャッシュ読み込みエラー:', error)
      return null
    }
  }

  // キャッシュに保存
  async set(
    accountId: string,
    params: CachedCreativeMetrics['params'],
    data: CreativeMetrics[]
  ): Promise<void> {
    try {
      const cacheKey = this.generateCacheKey(accountId, params)

      // データを圧縮（大きなデータセットの場合）
      let dataToStore: any
      const jsonString = JSON.stringify(data)
      
      // 1MB以上のデータは圧縮
      if (jsonString.length > 1024 * 1024) {
        dataToStore = LZString.compressToUTF16(jsonString)
      } else {
        dataToStore = data
      }

      await this.convexClient.mutation(api.creativeMetricsCache.saveCache, {
        cacheKey,
        accountId,
        startDate: params.startDate,
        endDate: params.endDate,
        data: dataToStore,
        ttlHours: CreativeMetricsCacheConvex.CACHE_DURATION_HOURS,
      })

      logger.debug(`キャッシュに保存: ${data.length}件のクリエイティブメトリクス`)
    } catch (error) {
      logger.error('キャッシュ保存エラー:', error)
      // キャッシュの保存に失敗してもアプリケーションは続行
    }
  }

  // キャッシュを無効化
  async invalidate(accountId: string): Promise<void> {
    try {
      const result = await this.convexClient.mutation(api.creativeMetricsCache.clearAccountCache, {
        accountId,
      })
      logger.debug(`${result.deleted}件のキャッシュエントリを削除`)
    } catch (error) {
      logger.error('キャッシュ無効化エラー:', error)
    }
  }

  // デバッグ情報を取得
  async getDebugInfo(): Promise<{
    totalEntries: number
    totalSizeMB: number
    activeCount: number
    expiredCount: number
  }> {
    try {
      const stats = await this.convexClient.query(api.creativeMetricsCache.getCacheStats, {})
      
      return {
        totalEntries: stats.totalCount,
        totalSizeMB: parseFloat(stats.totalSizeMB),
        activeCount: stats.activeCount,
        expiredCount: stats.expiredCount,
      }
    } catch (error) {
      logger.error('デバッグ情報取得エラー:', error)
      return {
        totalEntries: 0,
        totalSizeMB: 0,
        activeCount: 0,
        expiredCount: 0,
      }
    }
  }

  // 期限切れキャッシュのクリーンアップ
  async cleanupExpired(): Promise<number> {
    try {
      const result = await this.convexClient.mutation(api.creativeMetricsCache.cleanupExpiredCache, {})
      logger.debug(`${result.deleted}件の期限切れキャッシュを削除`)
      return result.deleted
    } catch (error) {
      logger.error('キャッシュクリーンアップエラー:', error)
      return 0
    }
  }

  // キャッシュキーの一覧取得
  async getCacheKeys(accountId?: string, limit?: number): Promise<Array<{
    cacheKey: string
    accountId: string
    startDate: string
    endDate: string
    createdAt: string
    expiresAt: string
  }>> {
    try {
      return await this.convexClient.query(api.creativeMetricsCache.getCacheKeys, {
        accountId,
        limit,
      })
    } catch (error) {
      logger.error('キャッシュキー一覧取得エラー:', error)
      return []
    }
  }
}

// シングルトンインスタンスの管理
let cacheInstance: CreativeMetricsCacheConvex | null = null

export function getCreativeMetricsCacheInstance(convexClient: ConvexReactClient): CreativeMetricsCacheConvex {
  if (!cacheInstance) {
    cacheInstance = new CreativeMetricsCacheConvex(convexClient)
  }
  return cacheInstance
}