import { MetaApiService, MetaInsightsData } from './metaApiService'
import { MetaDataCache } from './metaDataCache'
import { MetaDataParser } from '../utils/metaDataParser'
import { CreativeMetricsCache } from './creativeMetricsCache'

export type CreativeType = 'image' | 'video' | 'carousel' | 'text' | 'unknown'
export type AggregationPeriod = 'daily' | 'weekly' | 'monthly'

export interface CreativeMetrics {
  creative_id: string
  creative_name: string
  creative_type: CreativeType
  thumbnail_url?: string
  video_url?: string
  carousel_cards?: Array<{
    name: string
    description: string
    image_url: string
    link: string
  }>
  campaign_id?: string
  campaign_name?: string
  ad_id?: string
  ad_name?: string
  
  // メトリクス
  impressions: number
  clicks: number
  ctr: number
  conversions: number
  conversion_value: number
  cpa: number
  roas: number
  spend: number
  cpc: number
  cpm: number
  cvr: number
  
  // 期間情報
  period_start: string
  period_end: string
  aggregation_period: AggregationPeriod
}

export interface AggregationOptions {
  startDate: string
  endDate: string
  period: AggregationPeriod
  creativeTypes?: CreativeType[]
  campaignIds?: string[]
}

export class CreativeAggregator {
  constructor(private apiService: MetaApiService) {}

  /**
   * クリエイティブデータを集計
   */
  async aggregateCreatives(
    accountId: string,
    options: AggregationOptions
  ): Promise<CreativeMetrics[]> {
    // まずキャッシュから取得を試みる
    const cached = CreativeMetricsCache.get(accountId, options)
    if (cached) {
      console.log('キャッシュからクリエイティブメトリクスを返却')
      return cached
    }

    // APIから広告レベルのインサイトデータを取得（アトリビューション設定を含む）
    const insights = await this.apiService.getInsights({
      level: 'ad',
      dateRange: {
        since: options.startDate,
        until: options.endDate
      },
      // アトリビューション設定を含める
      time_increment: '1'
    })
    
    // MetaDataParserを使用してデータを解析・強化
    const enrichedData = insights.map(item => ({
      ...item,
      // パーサーで正確なメトリクスを抽出
      conversions: MetaDataParser.extractConversions(item.actions),
      roas: MetaDataParser.calculateROAS(item),
      cpa: MetaDataParser.calculateCPA(item),
      
      // 元のフィールドも保持（デバッグ用）
      raw_actions: item.actions,
      raw_action_values: item.action_values,
      
      // パーサーの詳細解析結果
      parser_analysis: MetaDataParser.parseInsightData(item)
    }))
    
    // クリエイティブIDのセットを作成
    const creativeIds = new Set<string>()
    const adIds = new Set<string>()
    
    enrichedData.forEach(insight => {
      if (insight.creative_id) {
        creativeIds.add(insight.creative_id)
      }
      if (insight.ad_id) {
        adIds.add(insight.ad_id)
      }
    })
    
    // クリエイティブの詳細情報を取得
    const creativeDetails = await this.getCreativeDetails(Array.from(adIds))
    
    // クリエイティブごとにメトリクスを集計（強化されたデータを使用）
    const aggregatedMetrics = this.aggregateByCreative(
      enrichedData,
      creativeDetails,
      options
    )
    
    // フィルタリング
    let filteredMetrics = aggregatedMetrics
    
    if (options.creativeTypes && options.creativeTypes.length > 0) {
      filteredMetrics = filteredMetrics.filter(metric => 
        options.creativeTypes!.includes(metric.creative_type)
      )
    }
    
    if (options.campaignIds && options.campaignIds.length > 0) {
      filteredMetrics = filteredMetrics.filter(metric => 
        metric.campaign_id && options.campaignIds!.includes(metric.campaign_id)
      )
    }
    
    // 結果をキャッシュに保存
    CreativeMetricsCache.set(accountId, options, filteredMetrics)
    
    return filteredMetrics
  }

  /**
   * インサイトデータを取得
   */
  private async getInsightsData(
    accountId: string,
    startDate: string,
    endDate: string
  ): Promise<MetaInsightsData[]> {
    // まずキャッシュから取得を試みる
    const cachedData = MetaDataCache.getInsights(accountId)
    
    // 指定期間のデータをフィルタリング
    const filteredData = cachedData.filter(insight => {
      const insightDate = insight.date_start || insight.dateStart
      if (!insightDate) return false
      
      return insightDate >= startDate && insightDate <= endDate
    })
    
    // データが不足している場合は追加取得
    if (filteredData.length === 0) {
      const newData = await this.apiService.getInsights(
        'ad',
        startDate,
        endDate,
        ['creative']
      )
      
      // キャッシュに保存
      const existingData = MetaDataCache.getInsights(accountId)
      const mergedData = MetaDataCache.mergeInsights(existingData, newData)
      MetaDataCache.saveInsights(accountId, mergedData)
      
      return newData.filter(insight => {
        const insightDate = insight.date_start || insight.dateStart
        return insightDate && insightDate >= startDate && insightDate <= endDate
      })
    }
    
    return filteredData
  }

  /**
   * クリエイティブの詳細情報を取得
   */
  private async getCreativeDetails(adIds: string[]): Promise<Map<string, any>> {
    const creativeMap = new Map<string, any>()
    
    if (adIds.length === 0) return creativeMap
    
    try {
      const creatives = await this.apiService.getAdCreatives(adIds)
      
      creatives.forEach(creative => {
        if (creative.creative_id) {
          creativeMap.set(creative.creative_id, creative)
        }
      })
    } catch (error) {
      console.error('Failed to fetch creative details:', error)
    }
    
    return creativeMap
  }

  /**
   * クリエイティブごとにメトリクスを集計
   */
  private aggregateByCreative(
    insights: MetaInsightsData[],
    creativeDetails: Map<string, any>,
    options: AggregationOptions
  ): CreativeMetrics[] {
    const metricsMap = new Map<string, CreativeMetrics>()
    
    // 期間ごとにグループ化
    const periodGroups = this.groupByPeriod(insights, options.period)
    
    periodGroups.forEach((periodInsights, periodKey) => {
      const [periodStart, periodEnd] = periodKey.split('_')
      
      // クリエイティブごとに集計
      const creativeGroups = this.groupByCreative(periodInsights)
      
      creativeGroups.forEach((creativeInsights, creativeId) => {
        const firstInsight = creativeInsights[0]
        const creativeDetail = creativeDetails.get(creativeId) || {}
        
        // メトリクスを集計
        const metrics = this.calculateMetrics(creativeInsights)
        
        const aggregatedMetric: CreativeMetrics = {
          creative_id: creativeId,
          creative_name: creativeDetail.creative_name || firstInsight.creative_name || 'Unknown',
          creative_type: this.determineCreativeType(creativeDetail, firstInsight),
          thumbnail_url: creativeDetail.thumbnail_url || firstInsight.thumbnail_url,
          video_url: creativeDetail.video_url || firstInsight.video_url,
          carousel_cards: creativeDetail.carousel_cards || firstInsight.carousel_cards,
          campaign_id: firstInsight.campaign_id || firstInsight.campaignId,
          campaign_name: firstInsight.campaign_name || firstInsight.campaignName,
          ad_id: firstInsight.ad_id,
          ad_name: firstInsight.ad_name,
          ...metrics,
          period_start: periodStart,
          period_end: periodEnd,
          aggregation_period: options.period
        }
        
        const key = `${creativeId}_${periodKey}`
        metricsMap.set(key, aggregatedMetric)
      })
    })
    
    return Array.from(metricsMap.values())
  }

  /**
   * 期間ごとにグループ化
   */
  private groupByPeriod(
    insights: MetaInsightsData[],
    period: AggregationPeriod
  ): Map<string, MetaInsightsData[]> {
    const groups = new Map<string, MetaInsightsData[]>()
    
    insights.forEach(insight => {
      const date = insight.date_start || insight.dateStart
      if (!date) return
      
      const periodKey = this.getPeriodKey(date, period)
      
      if (!groups.has(periodKey)) {
        groups.set(periodKey, [])
      }
      
      groups.get(periodKey)!.push(insight)
    })
    
    return groups
  }

  /**
   * クリエイティブごとにグループ化
   */
  private groupByCreative(
    insights: MetaInsightsData[]
  ): Map<string, MetaInsightsData[]> {
    const groups = new Map<string, MetaInsightsData[]>()
    
    insights.forEach(insight => {
      const creativeId = insight.creative_id
      if (!creativeId) return
      
      if (!groups.has(creativeId)) {
        groups.set(creativeId, [])
      }
      
      groups.get(creativeId)!.push(insight)
    })
    
    return groups
  }

  /**
   * 期間キーを生成
   */
  private getPeriodKey(date: string, period: AggregationPeriod): string {
    const d = new Date(date)
    
    switch (period) {
      case 'daily':
        return `${date}_${date}`
        
      case 'weekly': {
        const weekStart = new Date(d)
        weekStart.setDate(d.getDate() - d.getDay())
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekStart.getDate() + 6)
        
        return `${weekStart.toISOString().split('T')[0]}_${weekEnd.toISOString().split('T')[0]}`
      }
      
      case 'monthly': {
        const monthStart = new Date(d.getFullYear(), d.getMonth(), 1)
        const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0)
        
        return `${monthStart.toISOString().split('T')[0]}_${monthEnd.toISOString().split('T')[0]}`
      }
    }
  }

  /**
   * メトリクスを計算
   */
  private calculateMetrics(insights: MetaInsightsData[]): Omit<CreativeMetrics, 
    'creative_id' | 'creative_name' | 'creative_type' | 'thumbnail_url' | 
    'video_url' | 'carousel_cards' | 'campaign_id' | 'campaign_name' | 
    'ad_id' | 'ad_name' | 'period_start' | 'period_end' | 'aggregation_period'
  > {
    let impressions = 0
    let clicks = 0
    let conversions = 0
    let conversion_value = 0
    let spend = 0
    
    insights.forEach(insight => {
      impressions += Number(insight.impressions) || 0
      clicks += Number(insight.clicks) || 0
      conversions += Number(insight.conversions) || 0
      conversion_value += Number(insight.conversion_value) || 0
      spend += Number(insight.spend) || 0
    })
    
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0
    const cpc = clicks > 0 ? spend / clicks : 0
    const cpm = impressions > 0 ? (spend / impressions) * 1000 : 0
    const cpa = conversions > 0 ? spend / conversions : 0
    const cvr = clicks > 0 ? (conversions / clicks) * 100 : 0
    const roas = spend > 0 ? conversion_value / spend : 0
    
    return {
      impressions,
      clicks,
      ctr,
      conversions,
      conversion_value,
      cpa,
      roas,
      spend,
      cpc,
      cpm,
      cvr
    }
  }

  /**
   * クリエイティブタイプを判定
   */
  private determineCreativeType(
    creativeDetail: any,
    insight: MetaInsightsData
  ): CreativeType {
    const type = creativeDetail.creative_type || insight.creative_type
    
    if (type === 'video' || creativeDetail.video_url || insight.video_url) {
      return 'video'
    }
    
    if (type === 'carousel' || creativeDetail.carousel_cards || insight.carousel_cards) {
      return 'carousel'
    }
    
    if (type === 'image' || creativeDetail.thumbnail_url || insight.thumbnail_url) {
      return 'image'
    }
    
    if (type === 'text') {
      return 'text'
    }
    
    return 'unknown'
  }
}