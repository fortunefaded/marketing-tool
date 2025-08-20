// import { MetaApiService } from './metaApiService' // @deprecated unused
import { CreativeMetrics, CreativeAggregator, AggregationOptions } from './creativeAggregator'
import { CreativeMetricsCache } from './creativeMetricsCache'

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

export class CreativeMetricsDiffSync {
  private static LAST_SYNC_KEY = 'creative_metrics_last_sync_'

  constructor(
    // private ___apiService: any // @deprecated 未使用,
    private aggregator: CreativeAggregator
  ) {}

  /**
   * 差分同期を実行
   */
  async syncDiff(syncOptions: DiffSyncOptions): Promise<DiffSyncResult> {
    const startTime = Date.now()
    const { accountId, options, forceFullSync = false } = syncOptions

    // 最後の同期時刻を取得
    const lastSyncTime = this.getLastSyncTime(accountId, options)

    // 完全同期が必要かチェック
    if (forceFullSync || !lastSyncTime || this.needsFullSync(lastSyncTime)) {
      console.log('完全同期を実行')
      return this.performFullSync(accountId, options, startTime)
    }

    // 差分同期を実行
    console.log(`差分同期を実行 (最終同期: ${new Date(lastSyncTime).toLocaleString()})`)
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
    CreativeMetricsCache.invalidate(accountId)

    // 全データを取得
    const metrics = await this.aggregator.aggregateCreatives(accountId, options)

    // 最終同期時刻を更新
    this.updateLastSyncTime(accountId, options)

    return {
      updatedMetrics: metrics,
      addedCount: metrics.length,
      updatedCount: 0,
      deletedCount: 0,
      syncDuration: Date.now() - startTime,
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
    // 既存のメトリクスを取得
    const existingMetrics = CreativeMetricsCache.get(accountId, options) || []
    const existingMap = new Map(
      existingMetrics.map((m) => [`${m.creative_id}_${m.period_start}_${m.period_end}`, m])
    )

    // 最終同期以降の期間を計算
    const diffStartDate = this.calculateDiffStartDate(lastSyncTime, options.startDate)
    const diffOptions: AggregationOptions = {
      ...options,
      startDate: diffStartDate,
    }

    // 差分データを取得（キャッシュを使わない）
    const newMetrics = await this.fetchMetricsWithoutCache(accountId, diffOptions)

    // メトリクスをマージ
    const { updated, added, deleted } = this.mergeMetrics(existingMap, newMetrics)

    // 結果をまとめる
    const allMetrics = Array.from(existingMap.values())

    // キャッシュを更新
    CreativeMetricsCache.set(accountId, options, allMetrics)

    // 最終同期時刻を更新
    this.updateLastSyncTime(accountId, options)

    return {
      updatedMetrics: allMetrics,
      addedCount: added,
      updatedCount: updated,
      deletedCount: deleted,
      syncDuration: Date.now() - startTime,
    }
  }

  /**
   * キャッシュを使わずにメトリクスを取得
   */
  private async fetchMetricsWithoutCache(
    _accountId: string,
    options: AggregationOptions
  ): Promise<CreativeMetrics[]> {
    // 一時的にキャッシュを無効化してデータを取得
    const tempCacheKey = `temp_${Date.now()}`
    const metrics = await this.aggregator.aggregateCreatives(tempCacheKey, options)

    // 一時キャッシュを削除
    CreativeMetricsCache.invalidate(tempCacheKey)

    return metrics
  }

  /**
   * メトリクスをマージ
   */
  private mergeMetrics(
    existingMap: Map<string, CreativeMetrics>,
    newMetrics: CreativeMetrics[]
  ): { updated: number; added: number; deleted: number } {
    let updated = 0
    let added = 0

    newMetrics.forEach((metric) => {
      const key = `${metric.creative_id}_${metric.period_start}_${metric.period_end}`

      if (existingMap.has(key)) {
        // 既存のメトリクスを更新
        existingMap.set(key, metric)
        updated++
      } else {
        // 新しいメトリクスを追加
        existingMap.set(key, metric)
        added++
      }
    })

    // TODO: 削除されたクリエイティブの検出（別途実装が必要）
    const deleted = 0

    return { updated, added, deleted }
  }

  /**
   * 差分同期の開始日を計算
   */
  private calculateDiffStartDate(lastSyncTime: number, requestedStartDate: string): string {
    // 最終同期時刻の7日前から取得（データの更新漏れを防ぐため）
    const diffStart = new Date(lastSyncTime - 7 * 24 * 60 * 60 * 1000)
    const requestedStart = new Date(requestedStartDate)

    // より新しい日付を使用
    const startDate = diffStart > requestedStart ? diffStart : requestedStart

    return startDate.toISOString().split('T')[0]
  }

  /**
   * 完全同期が必要かチェック
   */
  private needsFullSync(lastSyncTime: number): boolean {
    // 7日以上経過している場合は完全同期
    const daysSinceSync = (Date.now() - lastSyncTime) / (1000 * 60 * 60 * 24)
    return daysSinceSync > 7
  }

  /**
   * 最終同期時刻を取得
   */
  private getLastSyncTime(accountId: string, options: AggregationOptions): number | null {
    const key = this.generateSyncKey(accountId, options)
    const stored = localStorage.getItem(key)

    if (!stored) return null

    try {
      const data = JSON.parse(stored)
      return data.timestamp
    } catch {
      return null
    }
  }

  /**
   * 最終同期時刻を更新
   */
  private updateLastSyncTime(accountId: string, options: AggregationOptions): void {
    const key = this.generateSyncKey(accountId, options)
    const data = {
      timestamp: Date.now(),
      options: {
        period: options.period,
        creativeTypes: options.creativeTypes,
        campaignIds: options.campaignIds,
      },
    }

    localStorage.setItem(key, JSON.stringify(data))
  }

  /**
   * 同期キーを生成
   */
  private generateSyncKey(accountId: string, options: AggregationOptions): string {
    const optionsHash = btoa(
      JSON.stringify({
        period: options.period,
        creativeTypes: options.creativeTypes?.sort(),
        campaignIds: options.campaignIds?.sort(),
      })
    )

    return `${CreativeMetricsDiffSync.LAST_SYNC_KEY}${accountId}_${optionsHash}`
  }

  /**
   * デバッグ情報を取得
   */
  static getDebugInfo(accountId: string): {
    syncHistory: Array<{
      key: string
      timestamp: number
      options: any
    }>
  } {
    const syncHistory: Array<{
      key: string
      timestamp: number
      options: any
    }> = []

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(CreativeMetricsDiffSync.LAST_SYNC_KEY + accountId)) {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '{}')
          syncHistory.push({
            key,
            timestamp: data.timestamp,
            options: data.options,
          })
        } catch {
          // エラーは無視
        }
      }
    }

    return { syncHistory: syncHistory.sort((a, b) => b.timestamp - a.timestamp) }
  }
}
