// TODO: Replace with new Meta API service
// import { MetaApiService, MetaInsightsData } from '../_archived/services/metaApiService'
import { MetaInsightsData } from '../features/meta-api/core/types'
// import { MetaDataCache } from './metaDataCache' // @deprecated unused
import { logger } from '../utils/logger'

export interface EnhancedCreativeData {
  // 基本情報
  id: string
  name: string
  type: 'IMAGE' | 'VIDEO' | 'CAROUSEL' | 'COLLECTION' | 'DYNAMIC'
  status: string
  // キャンペーン・広告セット情報
  campaignId: string
  campaignName: string
  adsetId: string
  adsetName: string
  adId: string
  adName: string
  // クリエイティブ詳細
  creative: {
    id: string
    name: string
    title?: string
    body?: string
    imageUrl?: string
    thumbnailUrl?: string
    videoUrl?: string
    callToActionType?: string
    linkUrl?: string
    // カルーセル情報
    carouselCards?: Array<{
      name: string
      description: string
      imageUrl: string
      link: string
    }>
    // 動画情報
    videoData?: {
      videoId: string
      title?: string
      duration?: number
      thumbnailUrl?: string
    }
  }
  // パフォーマンスメトリクス
  metrics: {
    impressions: number
    clicks: number
    spend: number
    reach: number
    frequency: number
    cpm: number
    cpc: number
    ctr: number
    conversions: number
    conversionValue: number
    costPerConversion: number
    roas: number
    // 動画メトリクス
    videoMetrics?: {
      plays: number
      thruPlays: number
      avgWatchTime: number
      p25Watched: number
      p50Watched: number
      p75Watched: number
      p100Watched: number
      completionRate: number
    }
    // エンゲージメント指標
    qualityRanking?: string
    engagementRateRanking?: string
    conversionRateRanking?: string
  }
  // デモグラフィック別パフォーマンス
  demographics?: {
    age?: Array<{ range: string; metrics: any }>
    gender?: Array<{ value: string; metrics: any }>
  }
  // 配置面別パフォーマンス
  placements?: Array<{
    platform: string
    position: string
    metrics: any
  }>
  // ターゲティング情報
  targeting?: {
    ageMin?: number
    ageMax?: number
    genders?: string[]
    locations?: any[]
    interests?: any[]
    behaviors?: any[]
    customAudiences?: any[]
  }
  // メタデータ
  createdTime: string
  updatedTime: string
  lastSyncedAt: string
}

export interface AggregationOptions {
  dateRange: {
    since: string
    until: string
  }
  includeVideoMetrics?: boolean
  includeDemographics?: boolean
  includePlacements?: boolean
  includeTargeting?: boolean
}

export class CreativeDataAggregator {
  private metaApi: MetaApiService
  // private __cache: any // @deprecated 未使用

  constructor(metaApi: MetaApiService) {
    this.metaApi = metaApi
    // MetaDataCacheの代わりにローカルストレージを直接使用
    /* this.__cache = {
      get: <T>(key: string): T | null => {
        try {
          const item = localStorage.getItem(key)
          return item ? JSON.parse(item) : null
        } catch (error) {
          logger.error('Cache get error:', error)
          return null
        }
      },
      set: <T>(key: string, value: T): void => {
        try {
          localStorage.setItem(key, JSON.stringify(value))
        } catch (error) {
          logger.error('Cache set error:', error)
        }
      }
    } */
  }

  async getCompleteCreativeData(options: AggregationOptions): Promise<EnhancedCreativeData[]> {
    try {
      // キャッシュチェック
      // const cacheKey = this.getCacheKey(options)
      // const cached = this.cache.get<EnhancedCreativeData[]>(cacheKey)
      // if (cached) {
      //   logger.debug('キャッシュからデータを返却')
      //   return cached
      // }

      logger.debug('包括的なクリエイティブデータを取得中...')
      logger.debug('dateRange:', options.dateRange)

      // 日付範囲の検証
      if (!options.dateRange || !options.dateRange.since || !options.dateRange.until) {
        logger.error('無効な日付範囲:', options.dateRange)
        throw new Error('有効な日付範囲を指定してください')
      }

      // Step 1: 基本的なインサイトデータを取得
      const insights = await this.metaApi.getComprehensiveInsights(options.dateRange)
      logger.debug(`${insights.length}件のインサイトデータを取得`)

      // 広告IDのリストを作成
      const adIds = [...new Set(insights.map((i) => i.ad_id).filter(Boolean))] as string[]

      if (adIds.length === 0) {
        logger.warn('広告IDが見つかりません')
        return []
      }

      // Step 2: 並列でデータを取得
      const [creatives, accountMetrics, videoData] = await Promise.all([
        // クリエイティブ詳細
        this.metaApi.getEnhancedCreatives(adIds),
        // アカウントレベルメトリクス
        this.metaApi.getAccountLevelMetrics(options.dateRange),
        // 動画パフォーマンス（オプション）
        options.includeVideoMetrics
          ? this.metaApi.getVideoPerformanceData(adIds, options.dateRange)
          : Promise.resolve([]),
      ])

      logger.debug(`${creatives.length}件のクリエイティブ詳細を取得`)

      // Step 3: データを統合
      const enhancedData = this.mergeCreativeData(
        insights,
        creatives,
        accountMetrics,
        videoData,
        options
      )

      // キャッシュに保存
      // this.cache.set(cacheKey, enhancedData)

      return enhancedData
    } catch (error) {
      logger.error('クリエイティブデータ集約エラー:', error)
      throw error
    }
  }

  private mergeCreativeData(
    insights: MetaInsightsData[],
    creatives: any[],
    _accountMetrics: any,
    videoData: any[],
    options: AggregationOptions
  ): EnhancedCreativeData[] {
    // インサイトを広告IDでグループ化
    const insightsByAdId = new Map<string, MetaInsightsData[]>()
    insights.forEach((insight) => {
      if (insight.ad_id) {
        const existing = insightsByAdId.get(insight.ad_id) || []
        existing.push(insight)
        insightsByAdId.set(insight.ad_id, existing)
      }
    })

    // クリエイティブを広告IDでマップ化
    const creativesByAdId = new Map<string, any>()
    creatives.forEach((creative) => {
      if (creative.id) {
        creativesByAdId.set(creative.id, creative)
      }
    })

    // 動画データを広告IDでマップ化
    const videoDataByAdId = new Map<string, any>()
    videoData.forEach((data) => {
      if (data.adId) {
        videoDataByAdId.set(data.adId, data)
      }
    })

    // データを統合
    const enhancedData: EnhancedCreativeData[] = []

    for (const [adId, adInsights] of insightsByAdId) {
      const creative = creativesByAdId.get(adId)
      const video = videoDataByAdId.get(adId)

      if (!creative) continue

      // メトリクスを集計
      const aggregatedMetrics = this.aggregateMetrics(adInsights)

      // クリエイティブタイプを判定
      const creativeType = this.detectCreativeType(creative)

      // 動画メトリクスを処理
      const videoMetrics = video ? this.processVideoMetrics(video) : undefined

      // デモグラフィック別データを処理
      const demographics = options.includeDemographics
        ? this.processDemographics(adInsights)
        : undefined

      // 配置面別データを処理
      const placements = options.includePlacements ? this.processPlacements(adInsights) : undefined

      const enhanced: EnhancedCreativeData = {
        id: creative.creative?.id || adId,
        name: creative.creative?.name || creative.name,
        type: creativeType,
        status: creative.status,
        campaignId: adInsights[0]?.campaign_id || '',
        campaignName: adInsights[0]?.campaign_name || '',
        adsetId: adInsights[0]?.adset_id || '',
        adsetName: adInsights[0]?.adset_name || '',
        adId: adId,
        adName: creative.name,
        creative: {
          id: creative.creative?.id || '',
          name: creative.creative?.name || '',
          title: creative.creative?.title,
          body: creative.creative?.body,
          imageUrl: creative.creative?.image_url,
          thumbnailUrl: creative.creative?.thumbnail_url,
          videoUrl: this.extractVideoUrl(creative),
          callToActionType: creative.creative?.call_to_action_type,
          linkUrl: creative.creative?.link_url,
          carouselCards: this.extractCarouselCards(creative),
          videoData: this.extractVideoData(creative),
        },
        metrics: {
          ...aggregatedMetrics,
          videoMetrics,
        },
        demographics,
        placements,
        targeting: options.includeTargeting ? creative.targeting : undefined,
        createdTime: creative.created_time || '',
        updatedTime: creative.updated_time || '',
        lastSyncedAt: new Date().toISOString(),
      }

      enhancedData.push(enhanced)
    }

    return enhancedData
  }

  private aggregateMetrics(insights: MetaInsightsData[]): any {
    const totals = {
      impressions: 0,
      clicks: 0,
      spend: 0,
      reach: 0,
      frequency: 0,
      conversions: 0,
      conversionValue: 0,
    }

    insights.forEach((insight) => {
      totals.impressions += Number(insight.impressions) || 0
      totals.clicks += Number(insight.clicks) || 0
      totals.spend += Number(insight.spend) || 0
      totals.reach += Number(insight.reach) || 0
      totals.conversions += Number(insight.conversions) || 0
      totals.conversionValue += Number(insight.conversion_value) || 0
    })

    // 平均頻度を計算
    totals.frequency = totals.reach > 0 ? totals.impressions / totals.reach : 0

    return {
      impressions: totals.impressions,
      clicks: totals.clicks,
      spend: totals.spend,
      reach: totals.reach,
      frequency: totals.frequency,
      cpm: totals.impressions > 0 ? (totals.spend / totals.impressions) * 1000 : 0,
      cpc: totals.clicks > 0 ? totals.spend / totals.clicks : 0,
      ctr: totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0,
      conversions: totals.conversions,
      conversionValue: totals.conversionValue,
      costPerConversion: totals.conversions > 0 ? totals.spend / totals.conversions : 0,
      roas: totals.spend > 0 ? totals.conversionValue / totals.spend : 0,
    }
  }

  private detectCreativeType(creative: any): EnhancedCreativeData['type'] {
    const objectType = creative.creative?.object_type?.toLowerCase()

    if (objectType?.includes('video')) return 'VIDEO'
    if (objectType?.includes('carousel')) return 'CAROUSEL'
    if (objectType?.includes('collection')) return 'COLLECTION'
    if (creative.creative?.asset_feed_spec) return 'DYNAMIC'

    // カルーセルカードがあるかチェック
    const hasCarouselCards =
      creative.creative?.object_story_spec?.link_data?.child_attachments?.length > 0
    if (hasCarouselCards) return 'CAROUSEL'

    // 動画データがあるかチェック
    const hasVideoData = creative.creative?.object_story_spec?.video_data?.video_id
    if (hasVideoData) return 'VIDEO'

    return 'IMAGE'
  }

  private processVideoMetrics(videoData: any): any {
    const plays = videoData.video_play_actions?.[0]?.value || 0
    const p25 = videoData.video_p25_watched_actions?.[0]?.value || 0
    const p50 = videoData.video_p50_watched_actions?.[0]?.value || 0
    const p75 = videoData.video_p75_watched_actions?.[0]?.value || 0
    const p100 = videoData.video_p100_watched_actions?.[0]?.value || 0

    return {
      plays,
      thruPlays: videoData.video_thruplay_watched_actions?.[0]?.value || 0,
      avgWatchTime: videoData.video_avg_time_watched_actions?.[0]?.value || 0,
      p25Watched: p25,
      p50Watched: p50,
      p75Watched: p75,
      p100Watched: p100,
      completionRate: plays > 0 ? (p100 / plays) * 100 : 0,
    }
  }

  private processDemographics(_insights: MetaInsightsData[]): any {
    // TODO: デモグラフィック別データの処理
    return undefined
  }

  private processPlacements(_insights: MetaInsightsData[]): any {
    // TODO: 配置面別データの処理
    return undefined
  }

  private extractVideoUrl(creative: any): string | undefined {
    return (
      creative.creative?.video_url || creative.creative?.object_story_spec?.video_data?.video_id
    )
  }

  private extractCarouselCards(creative: any): any[] | undefined {
    const childAttachments = creative.creative?.object_story_spec?.link_data?.child_attachments
    if (!childAttachments || childAttachments.length === 0) return undefined

    return childAttachments.map((attachment: any) => ({
      name: attachment.name || '',
      description: attachment.description || '',
      imageUrl: attachment.picture || '',
      link: attachment.link || '',
    }))
  }

  private extractVideoData(creative: any): any | undefined {
    const videoData = creative.creative?.object_story_spec?.video_data
    if (!videoData) return undefined

    return {
      videoId: videoData.video_id,
      title: videoData.title,
      duration: undefined, // APIから取得できない場合がある
      thumbnailUrl: creative.creative?.thumbnail_url,
    }
  }

  /*
  private ___getCacheKey(options: AggregationOptions): string {
    return `creative-data-${options.dateRange.since}-${options.dateRange.until}-${JSON.stringify(options)}`
  }
  */
}
