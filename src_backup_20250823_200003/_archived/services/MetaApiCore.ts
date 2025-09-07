/**
 * Meta API Core - 新しいアーキテクチャの中核
 * すべてのMeta API操作を統一的に管理
 */

import { logger } from '../../utils/logger'
import { monitorMetaApiCall } from '../../utils/metaApiMonitor'
import { handleMetaApiError } from '../../utils/globalErrorHandler'
import { CacheManager } from './CacheManager'
import { RateLimiter } from './RateLimiter'
import { MetaApiTypes } from './types'

export interface ApiConfig {
  accessToken: string
  accountId: string
  apiVersion?: string
  maxRetries?: number
  timeout?: number
  cacheEnabled?: boolean
}

export interface InsightParams {
  level?: 'account' | 'campaign' | 'adset' | 'ad'
  dateRange?: { start: string; end: string }
  fields?: string[]
  filters?: Record<string, any>
  limit?: number
  cursor?: string
}

export interface ApiStats {
  totalCalls: number
  successRate: number
  avgResponseTime: number
  cacheHitRate: number
  activeRequests: number
  errors: Array<{ timestamp: Date; error: string; context: string }>
}

type ErrorHandler = (error: Error, context: string) => void

export class MetaApiCore {
  private static instance: MetaApiCore | null = null
  private config: ApiConfig | null = null
  private cache: CacheManager
  private rateLimiter: RateLimiter
  private errorHandlers: Set<ErrorHandler> = new Set()
  private stats = {
    totalCalls: 0,
    successfulCalls: 0,
    cacheHits: 0,
    totalResponseTime: 0,
    activeRequests: 0,
    errors: [] as Array<{ timestamp: Date; error: string; context: string }>
  }

  private constructor() {
    this.cache = new CacheManager()
    this.rateLimiter = new RateLimiter()
    logger.info('[MetaApiCore] Initialized')
  }

  /**
   * シングルトンインスタンスの取得
   */
  static getInstance(): MetaApiCore {
    if (!MetaApiCore.instance) {
      MetaApiCore.instance = new MetaApiCore()
    }
    return MetaApiCore.instance
  }

  /**
   * APIの初期化
   */
  async initialize(config: ApiConfig): Promise<void> {
    this.config = config
    
    // アクセストークンの検証
    try {
      await this.validateToken()
      logger.info('[MetaApiCore] Initialization successful', {
        accountId: config.accountId,
        cacheEnabled: config.cacheEnabled
      })
    } catch (error) {
      logger.error('[MetaApiCore] Initialization failed', error)
      throw error
    }
  }

  /**
   * インサイトデータの取得
   */
  async getInsights(params: InsightParams): Promise<MetaApiTypes.Insight[]> {
    const cacheKey = this.getCacheKey('insights', params)
    
    // キャッシュチェック
    if (this.config?.cacheEnabled) {
      const cached = await this.cache.get<MetaApiTypes.Insight[]>(cacheKey)
      if (cached) {
        this.stats.cacheHits++
        logger.debug('[MetaApiCore] Cache hit for insights')
        return cached
      }
    }

    // API呼び出し
    return monitorMetaApiCall(async () => {
      await this.rateLimiter.waitIfNeeded()
      
      const response = await this.makeRequest('/insights', {
        level: params.level || 'ad',
        fields: this.buildFieldsString(params.fields),
        limit: params.limit || 100,
        ...(params.dateRange && {
          time_range: JSON.stringify({
            since: params.dateRange.start,
            until: params.dateRange.end
          })
        }),
        ...(params.filters || {})
      })

      const insights = this.parseInsightsResponse(response)
      
      // キャッシュに保存
      if (this.config?.cacheEnabled) {
        await this.cache.set(cacheKey, insights, 5 * 60 * 1000) // 5分
      }

      return insights
    }, `getInsights_${params.level}`)
  }

  /**
   * キャンペーンデータの取得
   */
  async getCampaigns(params: { limit?: number; fields?: string[] } = {}): Promise<MetaApiTypes.Campaign[]> {
    const cacheKey = this.getCacheKey('campaigns', params)
    
    // キャッシュチェック
    if (this.config?.cacheEnabled) {
      const cached = await this.cache.get<MetaApiTypes.Campaign[]>(cacheKey)
      if (cached) {
        this.stats.cacheHits++
        return cached
      }
    }

    return monitorMetaApiCall(async () => {
      await this.rateLimiter.waitIfNeeded()
      
      const response = await this.makeRequest('/campaigns', {
        fields: this.buildFieldsString(params.fields || [
          'id', 'name', 'status', 'objective', 
          'daily_budget', 'lifetime_budget', 'spend'
        ]),
        limit: params.limit || 100
      })

      const campaigns = response.data || []
      
      // キャッシュに保存
      if (this.config?.cacheEnabled) {
        await this.cache.set(cacheKey, campaigns, 10 * 60 * 1000) // 10分
      }

      return campaigns
    }, 'getCampaigns')
  }

  /**
   * キャッシュのクリア
   */
  clearCache(pattern?: string): void {
    if (pattern) {
      this.cache.clearPattern(pattern)
    } else {
      this.cache.clear()
    }
    logger.info('[MetaApiCore] Cache cleared', { pattern })
  }

  /**
   * データのプリロード
   */
  async preload(params: {
    insights?: InsightParams[]
    campaigns?: boolean
  }): Promise<void> {
    const promises: Promise<any>[] = []

    if (params.insights) {
      params.insights.forEach(insightParam => {
        promises.push(this.getInsights(insightParam))
      })
    }

    if (params.campaigns) {
      promises.push(this.getCampaigns())
    }

    await Promise.allSettled(promises)
    logger.info('[MetaApiCore] Preload completed')
  }

  /**
   * 統計情報の取得
   */
  getStats(): ApiStats {
    return {
      totalCalls: this.stats.totalCalls,
      successRate: this.stats.totalCalls > 0 
        ? (this.stats.successfulCalls / this.stats.totalCalls) * 100 
        : 0,
      avgResponseTime: this.stats.totalCalls > 0
        ? this.stats.totalResponseTime / this.stats.totalCalls
        : 0,
      cacheHitRate: this.stats.totalCalls > 0
        ? (this.stats.cacheHits / this.stats.totalCalls) * 100
        : 0,
      activeRequests: this.stats.activeRequests,
      errors: this.stats.errors.slice(-10) // 最新10件
    }
  }

  /**
   * エラーハンドラーの登録
   */
  onError(handler: ErrorHandler): () => void {
    this.errorHandlers.add(handler)
    return () => this.errorHandlers.delete(handler)
  }

  /**
   * プライベートメソッド
   */

  private async validateToken(): Promise<void> {
    try {
      // アカウントIDが設定されている場合はアカウント情報を取得
      // そうでない場合は /me エンドポイントを使用
      if (this.config?.accountId) {
        await this.makeRequest('', { fields: 'id,name' })
      } else {
        // アカウントIDがない場合は、まず /me でユーザー情報を取得
        const meUrl = `${this.config?.apiUrl || this.API_BASE_URL}/me`
        const response = await fetch(`${meUrl}?access_token=${this.config?.accessToken}&fields=id,name`)
        if (!response.ok) {
          throw new Error('Invalid access token')
        }
      }
    } catch (error) {
      throw new Error('Invalid access token')
    }
  }

  private async makeRequest(endpoint: string, params: Record<string, any> = {}): Promise<any> {
    if (!this.config) {
      throw new Error('MetaApiCore not initialized')
    }

    this.stats.totalCalls++
    this.stats.activeRequests++
    const startTime = Date.now()

    try {
      const accountId = this.config.accountId.startsWith('act_') 
        ? this.config.accountId 
        : `act_${this.config.accountId}`
      
      // エンドポイントが空の場合は、アカウントID自体をエンドポイントとする
      const path = endpoint ? `${accountId}${endpoint}` : accountId
      
      const url = new URL(
        `https://graph.facebook.com/${this.config.apiVersion || 'v18.0'}/${path}`
      )

      // パラメータの追加
      url.searchParams.append('access_token', this.config.accessToken)
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value))
        }
      })

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(this.config.timeout || 30000)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error?.message || `API request failed: ${response.status}`)
      }

      const data = await response.json()
      
      this.stats.successfulCalls++
      this.stats.totalResponseTime += Date.now() - startTime
      
      return data
    } catch (error) {
      this.handleError(error as Error, endpoint)
      throw error
    } finally {
      this.stats.activeRequests--
    }
  }

  private handleError(error: Error, context: string): void {
    const errorInfo = handleMetaApiError(error, context)
    
    this.stats.errors.push({
      timestamp: new Date(),
      error: error.message,
      context
    })

    // 登録されたエラーハンドラーを呼び出し
    this.errorHandlers.forEach(handler => {
      try {
        handler(error, context)
      } catch (e) {
        logger.error('[MetaApiCore] Error in error handler', e)
      }
    })
  }

  private getCacheKey(type: string, params: any): string {
    return `meta_api_${type}_${JSON.stringify(params)}`
  }

  private buildFieldsString(fields?: string[]): string {
    const defaultFields = {
      insights: [
        'ad_id', 'ad_name', 'campaign_id', 'campaign_name',
        'impressions', 'clicks', 'spend', 'reach', 'frequency',
        'cpm', 'cpc', 'ctr', 'actions', 'action_values'
      ],
      campaigns: [
        'id', 'name', 'status', 'objective',
        'daily_budget', 'lifetime_budget', 'spend'
      ]
    }

    return (fields || defaultFields.insights).join(',')
  }

  private parseInsightsResponse(response: any): MetaApiTypes.Insight[] {
    if (!response.data || !Array.isArray(response.data)) {
      return []
    }

    return response.data.map((item: any) => ({
      ad_id: item.ad_id,
      ad_name: item.ad_name,
      campaign_id: item.campaign_id,
      campaign_name: item.campaign_name,
      impressions: parseInt(item.impressions) || 0,
      clicks: parseInt(item.clicks) || 0,
      spend: parseFloat(item.spend) || 0,
      reach: parseInt(item.reach) || 0,
      frequency: parseFloat(item.frequency) || 0,
      cpm: parseFloat(item.cpm) || 0,
      cpc: parseFloat(item.cpc) || 0,
      ctr: parseFloat(item.ctr) || 0,
      date_start: item.date_start,
      date_stop: item.date_stop,
      actions: item.actions || [],
      action_values: item.action_values || []
    }))
  }
}