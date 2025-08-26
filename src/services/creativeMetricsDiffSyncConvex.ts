import { ConvexReactClient } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { CreativeMetrics, CreativeAggregator, AggregationOptions } from './creativeAggregator'
import { CreativeMetricsCacheConvex } from '../_archived/services/meta-api/creativeMetricsCacheConvex'
import { logger } from '../utils/logger'

interface DiffSyncOptions {
  accountId: string
  options: AggregationOptions
  forceFullSync?: boolean
}

interface DiffSyncResult {
  updatedMetrics: CreativeMetrics[]
  addedCount: number
  updatedCount: number
  deletedCount: number
  syncDuration: number
}

export class CreativeMetricsDiffSyncConvex {
  private convexClient: ConvexReactClient
  private aggregator: CreativeAggregator
  private cache: CreativeMetricsCacheConvex

  constructor(
    convexClient: ConvexReactClient,
    aggregator: CreativeAggregator
  ) {
    this.convexClient = convexClient
    this.aggregator = aggregator
    this.cache = new CreativeMetricsCacheConvex(convexClient)
  }

  /**
   * 差分同期を実行
   */
  async syncDiff(syncOptions: DiffSyncOptions): Promise<DiffSyncResult> {
    const startTime = Date.now()
    const { accountId, options, forceFullSync = false } = syncOptions

    // 最後の同期時刻を取得
    const lastSyncTime = await this.getLastSyncTime(accountId, options)

    // 完全同期が必要かチェック
    if (forceFullSync || !lastSyncTime || this.needsFullSync(lastSyncTime)) {
      logger.debug('完全同期を実行')
      return this.performFullSync(accountId, options, startTime)
    }

    // 差分同期を実行
    logger.debug(`差分同期を実行 (最終同期: ${new Date(lastSyncTime).toLocaleString()})`)
    return this.performDiffSync(accountId, options, lastSyncTime, startTime)
  }

  /**
   * 完全同期を実行
   */
  private async performFullSync(
    accountId: string,
    options: AggregationOptions,
    startTime: number
  ): Promise<DiffSyncResult> {
    // キャッシュを無効化
    await this.cache.invalidate(accountId)

    // 全データを取得
    const metrics = await this.aggregator.aggregateCreatives(accountId, options)

    // キャッシュに保存
    await this.cache.set(accountId, {
      startDate: options.startDate,
      endDate: options.endDate,
      period: 'daily',
    }, metrics)

    // 同期時刻を記録
    await this.setLastSyncTime(accountId, options, Date.now())

    const syncDuration = Date.now() - startTime

    return {
      updatedMetrics: metrics,
      addedCount: metrics.length,
      updatedCount: 0,
      deletedCount: 0,
      syncDuration,
    }
  }

  /**
   * 差分同期を実行
   */
  private async performDiffSync(
    accountId: string,
    options: AggregationOptions,
    lastSyncTime: number,
    startTime: number
  ): Promise<DiffSyncResult> {
    // 最後の同期以降のデータのみを取得
    const diffOptions: AggregationOptions = {
      ...options,
      startDate: new Date(lastSyncTime).toISOString().split('T')[0],
      endDate: options.endDate,
    }

    // 差分データを取得
    const diffMetrics = await this.aggregator.aggregateCreatives(accountId, diffOptions)

    // 既存のキャッシュデータを取得
    const cachedMetrics = await this.cache.get(accountId, {
      startDate: options.startDate,
      endDate: options.endDate,
      period: 'daily',
    }) || []

    // マージ処理
    const mergedMetrics = this.mergeMetrics(cachedMetrics, diffMetrics)

    // キャッシュを更新
    await this.cache.set(accountId, {
      startDate: options.startDate,
      endDate: options.endDate,
      period: 'daily',
    }, mergedMetrics.metrics)

    // 同期時刻を記録
    await this.setLastSyncTime(accountId, options, Date.now())

    const syncDuration = Date.now() - startTime

    return {
      updatedMetrics: mergedMetrics.metrics,
      addedCount: mergedMetrics.addedCount,
      updatedCount: mergedMetrics.updatedCount,
      deletedCount: mergedMetrics.deletedCount,
      syncDuration,
    }
  }

  /**
   * メトリクスをマージ
   */
  private mergeMetrics(
    existing: CreativeMetrics[],
    updates: CreativeMetrics[]
  ): {
    metrics: CreativeMetrics[]
    addedCount: number
    updatedCount: number
    deletedCount: number
  } {
    const mergedMap = new Map<string, CreativeMetrics>()
    let updatedCount = 0
    let addedCount = 0

    // 既存データをマップに追加
    existing.forEach((metric) => {
      mergedMap.set(metric.creative_id, metric)
    })

    // 更新データをマージ
    updates.forEach((update) => {
      if (mergedMap.has(update.creative_id)) {
        // 既存データを更新
        const existing = mergedMap.get(update.creative_id)!
        if (this.hasChanged(existing, update)) {
          mergedMap.set(update.creative_id, update)
          updatedCount++
        }
      } else {
        // 新規追加
        mergedMap.set(update.creative_id, update)
        addedCount++
      }
    })

    return {
      metrics: Array.from(mergedMap.values()),
      addedCount,
      updatedCount,
      deletedCount: 0, // 削除は現在サポートしていない
    }
  }

  /**
   * メトリクスが変更されたかチェック
   */
  private hasChanged(existing: CreativeMetrics, update: CreativeMetrics): boolean {
    // 主要なメトリクスを比較
    return (
      existing.impressions !== update.impressions ||
      existing.clicks !== update.clicks ||
      existing.spend !== update.spend ||
      existing.conversions !== update.conversions ||
      existing.conversion_value !== update.conversion_value
    )
  }

  /**
   * 完全同期が必要かチェック
   */
  private needsFullSync(lastSyncTime: number): boolean {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000
    return lastSyncTime < oneDayAgo
  }

  /**
   * 最後の同期時刻を取得
   */
  private async getLastSyncTime(
    accountId: string,
    options: AggregationOptions
  ): Promise<number | null> {
    try {
      const metadata = await this.convexClient.query(api.syncMetadata.getSyncMetadata, {
        accountId,
        syncType: 'creative_metrics',
      })

      if (!metadata?.value) return null

      const syncData = metadata.value as any
      // オプションが一致するかチェック
      if (
        syncData.options?.startDate === options.startDate &&
        syncData.options?.endDate === options.endDate
      ) {
        return syncData.timestamp
      }

      return null
    } catch {
      return null
    }
  }

  /**
   * 最後の同期時刻を設定
   */
  private async setLastSyncTime(
    accountId: string,
    options: AggregationOptions,
    timestamp: number
  ): Promise<void> {
    await this.convexClient.mutation(api.syncMetadata.saveSyncMetadata, {
      accountId,
      syncType: 'creative_metrics',
      metadata: {
        timestamp,
        options: {
          startDate: options.startDate,
          endDate: options.endDate,
        },
      },
    })
  }

  /**
   * 同期統計を取得
   */
  async getSyncStats(accountId: string): Promise<{
    lastSyncTime: number | null
    totalSyncs: number
    cacheSize: number
  }> {
    const metadata = await this.convexClient.query(api.syncMetadata.getSyncMetadata, {
      accountId,
      syncType: 'creative_metrics',
    })

    const cacheDebugInfo = await this.cache.getDebugInfo()

    return {
      lastSyncTime: metadata?.value?.timestamp || null,
      totalSyncs: metadata?.value?.totalSyncs || 0,
      cacheSize: cacheDebugInfo.totalEntries,
    }
  }

  /**
   * 同期履歴をクリア
   */
  async clearSyncHistory(accountId: string): Promise<void> {
    await this.convexClient.mutation(api.syncMetadata.clearSyncMetadata, {
      accountId,
      syncType: 'creative_metrics',
    })
  }
}