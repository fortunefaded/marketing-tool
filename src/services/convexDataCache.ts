import { ConvexReactClient } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { MetaInsightsData } from './metaApiService'
import { logger } from '../utils/logger'

export interface CachedInsightsData extends MetaInsightsData {
  syncedAt: string
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

export class ConvexDataCache {
  private convexClient: ConvexReactClient

  constructor(convexClient: ConvexReactClient) {
    this.convexClient = convexClient
  }

  // Static methods for backward compatibility
  private static instance: ConvexDataCache | null = null

  static getInstance(convexClient?: ConvexReactClient): ConvexDataCache {
    if (!ConvexDataCache.instance && convexClient) {
      ConvexDataCache.instance = new ConvexDataCache(convexClient)
    }
    if (!ConvexDataCache.instance) {
      throw new Error('ConvexDataCache not initialized with ConvexReactClient')
    }
    return ConvexDataCache.instance
  }

  // Instance methods
  async saveInsights(accountId: string, data: MetaInsightsData[] | CachedInsightsData[]): Promise<void> {
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
      video_id: item.video_id,
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
      conversion_rate: Number(item.conversion_rate) || 0,
      cost_per_conversion: Number(item.cost_per_conversion) || 0,
      engagement_rate: Number(item.engagement_rate) || 0,
      video_views: Number(item.video_views) || 0,
      video_view_rate: Number(item.video_view_rate) || 0,
      // Instagram関連
      saves: Number(item.saves) || 0,
      shares: Number(item.shares) || 0,
      comments: Number(item.comments) || 0,
      likes: Number(item.likes) || 0,
      // その他のフィールドも必要に応じて追加
    }))

    await this.convexClient.mutation(api.metaInsights.saveInsights, {
      accountId,
      insights: transformedData as any,
    })
  }

  async getInsights(accountId: string): Promise<CachedInsightsData[]> {
    try {
      const result = await this.convexClient.query(api.metaInsights.getInsights, {
        accountId,
        limit: 10000, // 大きめの制限
      })

      if (!result || !result.items) {
        return []
      }

      return result.items.map((item: any) => ({
        ...item,
        syncedAt: item.createdAt || new Date().toISOString(),
      }))
    } catch (error) {
      logger.error('Failed to get insights from Convex:', error)
      return []
    }
  }

  async clearInsights(accountId: string): Promise<void> {
    await this.convexClient.mutation(api.metaInsights.clearInsights, {
      accountId,
    })
  }

  async getSyncStatus(accountId: string): Promise<DataSyncStatus | null> {
    try {
      const status = await this.convexClient.query(api.metaSyncStatus.getSyncStatus, {
        accountId,
      })

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
    } catch (error) {
      logger.error('Failed to get sync status from Convex:', error)
      return null
    }
  }

  async updateSyncStatus(status: DataSyncStatus): Promise<void> {
    await this.convexClient.mutation(api.metaSyncStatus.updateSyncStatus, {
      accountId: status.accountId,
      lastFullSync: status.lastFullSync || undefined,
      lastIncrementalSync: status.lastIncrementalSync || undefined,
      totalRecords: status.totalRecords,
      earliestDate: status.dateRange.earliest || undefined,
      latestDate: status.dateRange.latest || undefined,
    })
  }

  async getCacheUsage(accountId: string): Promise<{ sizeKB: number; records: number }> {
    try {
      const result = await this.convexClient.query(api.metaInsights.getInsights, {
        accountId,
        limit: 10000,
      })

      const records = result?.items?.length || 0
      // 概算サイズ計算（1レコードあたり約1KB）
      const sizeKB = Math.round(records * 1)

      return { sizeKB, records }
    } catch (error) {
      logger.error('Failed to get cache usage:', error)
      return { sizeKB: 0, records: 0 }
    }
  }

  // Static wrapper methods for backward compatibility
  static async saveInsights(accountId: string, data: MetaInsightsData[] | CachedInsightsData[]): Promise<void> {
    const instance = ConvexDataCache.getInstance()
    return instance.saveInsights(accountId, data)
  }

  static async getInsights(accountId: string): Promise<CachedInsightsData[]> {
    const instance = ConvexDataCache.getInstance()
    return instance.getInsights(accountId)
  }

  static async clearInsights(accountId: string): Promise<void> {
    const instance = ConvexDataCache.getInstance()
    return instance.clearInsights(accountId)
  }

  static async getSyncStatus(accountId: string): Promise<DataSyncStatus | null> {
    const instance = ConvexDataCache.getInstance()
    return instance.getSyncStatus(accountId)
  }

  static async updateSyncStatus(status: DataSyncStatus): Promise<void> {
    const instance = ConvexDataCache.getInstance()
    return instance.updateSyncStatus(status)
  }

  static async getCacheUsage(accountId: string): Promise<{ sizeKB: number; records: number }> {
    const instance = ConvexDataCache.getInstance()
    return instance.getCacheUsage(accountId)
  }

  // データ履歴は現在Convexには実装しないが、空の配列を返す
  static getDataHistory(_accountId: string): any[] {
    return []
  }
}