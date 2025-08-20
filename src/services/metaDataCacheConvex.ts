import { ConvexClient } from 'convex/browser'
import { api } from '../../convex/_generated/api'
import { MetaInsightsData } from './metaApiService'

export interface CachedInsightsData extends MetaInsightsData {
  syncedAt: string // データが同期された日時
}

export interface DataSyncStatus {
  accountId: string
  lastFullSync: string | null
  lastIncrementalSync: string | null
  totalRecords: number
  dateRange: {
    earliest: string | null
    latest: string | null
  }
}

export class MetaDataCacheConvex {
  private convexClient: ConvexClient

  constructor(convexClient: ConvexClient) {
    this.convexClient = convexClient
  }

  // データを保存
  async saveData(accountId: string, data: MetaInsightsData[]): Promise<void> {
    if (!data || data.length === 0) return

    const transformedData = data.map((item) => ({
      accountId,
      date_start: item.date_start,
      date_stop: item.date_stop || item.date_start,
      campaign_id: item.campaign_id,
      campaign_name: item.campaign_name,
      ad_id: item.ad_id,
      ad_name: item.ad_name,
      creative_id: item.creative_id,
      creative_name: item.creative_name,
      creative_type: item.creative_type,
      thumbnail_url: item.thumbnail_url,
      video_url: item.video_url,
      carousel_cards: item.carousel_cards,
      impressions: Number(item.impressions) || 0,
      clicks: Number(item.clicks) || 0,
      spend: Number(item.spend) || 0,
      reach: Number(item.reach) || 0,
      frequency: Number(item.frequency) || 0,
      cpc: Number(item.cpc) || 0,
      cpm: Number(item.cpm) || 0,
      ctr: Number(item.ctr) || 0,
      conversions: Number(item.conversions) || 0,
      conversion_rate: Number(item.cvr) || 0,
      cost_per_conversion: Number(item.cpa) || 0,
      // 互換性フィールド
      dateStart: item.date_start,
      dateStop: item.date_stop || item.date_start,
      campaignId: item.campaign_id,
      campaignName: item.campaign_name,
      adId: item.ad_id,
      adName: item.ad_name,
    }))

    // バッチで保存
    const batchSize = 100
    for (let i = 0; i < transformedData.length; i += batchSize) {
      const batch = transformedData.slice(i, i + batchSize)
      await this.convexClient.mutation(api.metaInsights.importInsights, {
        insights: batch,
        strategy: 'merge' as const,
      })
    }

    // 同期ステータスを更新
    const dates = data.map((d) => d.date_start).sort()
    await this.updateSyncStatus(accountId, {
      lastIncrementalSync: new Date().toISOString(),
      totalRecords: data.length,
      dateRange: {
        earliest: dates[0] || null,
        latest: dates[dates.length - 1] || null,
      },
    })
  }

  // データを取得
  async getData(
    accountId: string,
    options?: {
      startDate?: string
      endDate?: string
      campaignId?: string
      adId?: string
      limit?: number
    }
  ): Promise<CachedInsightsData[]> {
    let allItems: any[] = []
    let cursor: string | null = null

    do {
      const result: { items: any[]; nextCursor: string | null } = await this.convexClient.query(
        api.metaInsights.getInsights,
        {
          accountId,
          startDate: options?.startDate,
          endDate: options?.endDate,
          campaignId: options?.campaignId,
          adId: options?.adId,
          limit: options?.limit || 1000,
          cursor: cursor || undefined,
        }
      )

      allItems = allItems.concat(result.items)
      cursor = result.nextCursor

      // limitが指定されていて、その数に達したら終了
      if (options?.limit && allItems.length >= options.limit) {
        allItems = allItems.slice(0, options.limit)
        break
      }
    } while (cursor)

    return allItems.map((item) => ({
      ...item,
      syncedAt: item.updatedAt || item.importedAt,
    }))
  }

  // 統計情報を取得
  async getStats(
    accountId: string,
    options?: {
      startDate?: string
      endDate?: string
    }
  ): Promise<any> {
    return await this.convexClient.query(api.metaInsights.getInsightsStats, {
      accountId,
      startDate: options?.startDate,
      endDate: options?.endDate,
    })
  }

  // 同期ステータスを取得
  async getSyncStatus(accountId: string): Promise<DataSyncStatus | null> {
    const status = await this.convexClient.query(api.metaInsights.getSyncStatus, { accountId })

    if (!status) return null

    return {
      accountId: status.accountId,
      lastFullSync: status.lastFullSync || null,
      lastIncrementalSync: status.lastIncrementalSync || null,
      totalRecords: status.totalRecords || 0,
      dateRange: {
        earliest: status.earliestDate || null,
        latest: status.latestDate || null,
      },
    }
  }

  // 同期ステータスを更新
  async updateSyncStatus(accountId: string, status: Partial<DataSyncStatus>): Promise<void> {
    await this.convexClient.mutation(api.metaInsights.saveSyncStatus, {
      accountId,
      lastFullSync: status.lastFullSync || undefined,
      lastIncrementalSync: status.lastIncrementalSync || undefined,
      totalRecords: status.totalRecords,
      earliestDate: status.dateRange?.earliest || undefined,
      latestDate: status.dateRange?.latest || undefined,
    })
  }

  // データをクリア
  async clearData(accountId: string): Promise<void> {
    await this.convexClient.mutation(api.metaInsights.clearAccountData, { accountId })
  }

  // データサイズを取得（推定）
  async getDataSize(accountId: string): Promise<{ sizeKB: number; records: number }> {
    const stats = await this.getStats(accountId)
    // 1レコードあたり約1KBと推定
    return {
      sizeKB: Math.round(stats.totalRecords),
      records: stats.totalRecords,
    }
  }

  // 欠損期間を検出
  async findMissingDateRanges(
    accountId: string,
    startDate: string,
    endDate: string
  ): Promise<Array<{ start: string; end: string }>> {
    return await this.convexClient.query(api.metaInsights.findMissingDateRanges, {
      accountId,
      startDate,
      endDate,
    })
  }

  // データの日付範囲を取得
  async getDateRange(
    accountId: string
  ): Promise<{ earliest: string | null; latest: string | null }> {
    const status = await this.getSyncStatus(accountId)
    return status?.dateRange || { earliest: null, latest: null }
  }

  // 増分更新（新しいデータのみ保存）
  async mergeData(accountId: string, newData: MetaInsightsData[]): Promise<void> {
    if (!newData || newData.length === 0) return

    // そのまま保存（Convex側でマージ処理）
    await this.saveData(accountId, newData)
  }

  // localStorage からのマイグレーション用
  static async migrateFromLocalStorage(
    accountId: string,
    convexClient: ConvexClient
  ): Promise<void> {
    console.log(`Starting migration from localStorage to Convex for account ${accountId}`)

    const cache = new MetaDataCacheConvex(convexClient)

    // localStorage からデータを読み込み
    const localStorageKey = `meta_insights_cache_${accountId}`
    const compressedData = localStorage.getItem(localStorageKey)

    if (!compressedData) {
      console.log('No data found in localStorage')
      return
    }

    try {
      // LZString で解凍
      const LZString = await import('lz-string')
      const jsonString = LZString.decompressFromUTF16(compressedData)

      if (!jsonString) {
        console.error('Failed to decompress data')
        return
      }

      const data = JSON.parse(jsonString) as MetaInsightsData[]
      console.log(`Found ${data.length} records in localStorage`)

      // Convex に保存
      await cache.saveData(accountId, data)

      console.log('Migration completed successfully')

      // 移行成功後、localStorage のデータを削除（オプション）
      // localStorage.removeItem(localStorageKey)
    } catch (error) {
      console.error('Migration failed:', error)
      throw error
    }
  }
}
