/**
 * 移行用アダプター
 * 既存のMetaApiServiceインターフェースを維持しながら
 * 新しいMetaApiCoreを使用
 */

import { MetaApiService, MetaApiConfig, MetaInsightsData, MetaCampaignData } from './metaApiService'
import { MetaApiCore } from './core/MetaApiCore'
import { logger } from '../utils/logger'

export class MetaApiAdapter extends MetaApiService {
  private core: MetaApiCore
  private initialized = false

  constructor(config: MetaApiConfig, convexClient?: any) {
    super(config, convexClient)
    this.core = MetaApiCore.getInstance()
    
    // 非同期初期化
    this.initializeCore(config)
  }

  private async initializeCore(config: MetaApiConfig) {
    try {
      await this.core.initialize({
        accessToken: config.accessToken,
        accountId: config.accountId,
        apiVersion: config.apiVersion,
        cacheEnabled: true
      })
      this.initialized = true
      logger.info('[MetaApiAdapter] Core initialized successfully')
    } catch (error) {
      logger.error('[MetaApiAdapter] Failed to initialize core:', error)
    }
  }

  async getInsights(params: any): Promise<MetaInsightsData[]> {
    // 既存のインターフェースを新しいAPIにマッピング
    try {
      if (!this.initialized) {
        logger.warn('[MetaApiAdapter] Core not initialized, falling back to legacy')
        return super.getInsights(params)
      }

      const insights = await this.core.getInsights({
        level: params.level,
        dateRange: params.dateRange ? {
          start: params.dateRange.since,
          end: params.dateRange.until
        } : undefined,
        fields: params.fields ? params.fields.split(',') : undefined,
        limit: params.limit,
        filters: params.filtering ? JSON.parse(params.filtering) : undefined
      })

      // レスポンスを既存の形式に変換
      return insights.map(insight => ({
        ...insight,
        impressions: String(insight.impressions),
        clicks: String(insight.clicks),
        spend: String(insight.spend),
        reach: String(insight.reach),
        frequency: String(insight.frequency),
        cpm: String(insight.cpm),
        cpc: String(insight.cpc),
        ctr: String(insight.ctr)
      }))
    } catch (error) {
      logger.error('[MetaApiAdapter] Error in getInsights, falling back:', error)
      return super.getInsights(params)
    }
  }

  async getCampaigns(limit: number = 100): Promise<MetaCampaignData[]> {
    try {
      if (!this.initialized) {
        return super.getCampaigns(limit)
      }

      const campaigns = await this.core.getCampaigns({ limit })
      
      // レスポンスを既存の形式に変換
      return campaigns.map(campaign => ({
        ...campaign,
        dailyBudget: parseFloat(campaign.daily_budget || '0'),
        lifetimeBudget: parseFloat(campaign.lifetime_budget || '0'),
        spend: parseFloat(campaign.spend || '0')
      }))
    } catch (error) {
      logger.error('[MetaApiAdapter] Error in getCampaigns, falling back:', error)
      return super.getCampaigns(limit)
    }
  }

  // 統計情報を提供
  getStats() {
    if (this.initialized) {
      return this.core.getStats()
    }
    return null
  }

  // キャッシュクリア
  clearCache(pattern?: string) {
    if (this.initialized) {
      this.core.clearCache(pattern)
    }
  }
}

/**
 * 既存のMetaApiServiceインスタンスを新しい実装に置き換える
 */
export function upgradeToNewApi(oldService: MetaApiService): MetaApiAdapter {
  const config = oldService.getConfig()
  return new MetaApiAdapter(config)
}