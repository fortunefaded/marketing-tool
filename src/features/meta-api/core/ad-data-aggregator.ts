/**
 * AdDataAggregator - Meta APIデータ集約クラス
 * 
 * 90,000行の生データ（1000広告 × 30日 × 3プラットフォーム）を
 * 1000件の構造化されたAdPerformanceDataオブジェクトに集約
 * 
 * @version 1.0.0
 * @date 2025-08-27
 */

// 型定義を直接定義（外部ファイルの依存を回避）
export interface MetaApiInsight {
  ad_id: string
  ad_name: string
  campaign_id: string
  campaign_name: string
  adset_id: string
  adset_name: string
  account_id: string
  
  date_start: string
  date_stop: string
  publisher_platform?: string
  
  impressions: string
  clicks: string
  spend: string
  reach?: string
  frequency?: string
  unique_clicks?: string
  ctr: string
  cpm: string
  cpc: string
  
  conversions?: string
  conversion_values?: string
  first_conversions?: string
  
  creative_id?: string
  creative_name?: string
  creative_type?: string
  thumbnail_url?: string
  video_url?: string
  image_url?: string
  object_type?: string
}

export interface BaseMetrics {
  impressions: number
  clicks: number
  spend: number
  reach: number
  frequency: number
  ctr: number
  cpm: number
  cpc: number
  conversions: number
  first_conversions: number
}

export interface CalculatedMetrics extends BaseMetrics {
  cpa: number
  roas: number
  cvr: number
}

export interface DailyMetrics {
  date: string
  metrics: BaseMetrics
}

export type PlatformType = 'facebook' | 'instagram' | 'audience_network' | 'messenger' | 'unknown'

export interface AggregationOptions {
  groupBy: 'ad' | 'adset' | 'campaign'
  includePlatformBreakdown: boolean
  includeDailyBreakdown: boolean
  calculateFatigue: boolean
}

export interface AdPerformanceData {
  ad_id: string
  ad_name: string
  campaign_id: string
  campaign_name: string
  adset_id: string
  adset_name: string
  
  summary: {
    dateRange: { start: string; end: string }
    metrics: CalculatedMetrics
  }
  
  dailyBreakdown: DailyMetrics[]
  platformBreakdown: Record<PlatformType, BaseMetrics>
  
  creative?: {
    type?: string
    thumbnail_url?: string
    video_url?: string
    image_url?: string
  }
  
  fatigueScore?: number
  fatigueTimeline?: Array<{ date: string; score: number }>
}

export interface AggregationError {
  type: 'MISSING_DATA' | 'INVALID_FORMAT' | 'CALCULATION_ERROR'
  message: string
  context?: any
}

export interface AggregationResult {
  data: AdPerformanceData[]
  metadata: {
    totalInputRows: number
    totalOutputRows: number
    processingTimeMs: number
    dataReduction: string
    errors: AggregationError[]
    summary: {
      adCount: number
      dateRange: { start: string; end: string }
      platforms: PlatformType[]
    }
  }
}

export class AdDataAggregator {
  // TASK-102: 常時集約有効のデフォルト設定
  private static readonly DEFAULT_OPTIONS: AggregationOptions = {
    groupBy: 'ad',
    includePlatformBreakdown: true, // 常にプラットフォーム別データを含む
    includeDailyBreakdown: true,    // 常に日別データを含む  
    calculateFatigue: false,
  }

  /**
   * メインの集約メソッド
   * 生データを構造化されたAdPerformanceDataに変換
   */
  static aggregate(
    insights: MetaApiInsight[],
    options: Partial<AggregationOptions> = {}
  ): AggregationResult {
    console.time('AdDataAggregator.aggregate')
    
    const config = { ...this.DEFAULT_OPTIONS, ...options }
    const errors: AggregationError[] = []
    const startTime = Date.now()

    try {
      // Step 1: ad_idでグループ化
      const groupedByAd = this.groupByAdId(insights)
      console.log(`[Aggregator] Grouped ${insights.length} rows into ${groupedByAd.size} ads`)

      // Step 2: 各広告のデータを集約
      const aggregatedData: AdPerformanceData[] = []
      
      for (const [adId, adInsights] of groupedByAd.entries()) {
        try {
          const performanceData = this.aggregateAdData(
            adId,
            adInsights,
            config,
            errors
          )
          aggregatedData.push(performanceData)
        } catch (error) {
          console.error(`[Aggregator] Failed to aggregate ad ${adId}:`, error)
          errors.push({
            adId,
            message: error instanceof Error ? error.message : 'Unknown error',
            severity: 'error',
            timestamp: new Date().toISOString(),
          })
        }
      }

      // Step 3: サマリー計算
      const summary = this.calculateSummary(aggregatedData)

      console.timeEnd('AdDataAggregator.aggregate')

      return {
        data: aggregatedData,
        summary,
        metadata: {
          processedRows: insights.length,
          aggregationTime: Date.now() - startTime,
          errors,
        },
      }
    } catch (error) {
      console.error('[Aggregator] Fatal error during aggregation:', error)
      throw error
    }
  }

  /**
   * Step 1: ad_idでグループ化
   */
  private static groupByAdId(insights: MetaApiInsight[]): Map<string, MetaApiInsight[]> {
    const grouped = new Map<string, MetaApiInsight[]>()
    
    for (const insight of insights) {
      const adId = insight.ad_id
      if (!adId) continue
      
      if (!grouped.has(adId)) {
        grouped.set(adId, [])
      }
      grouped.get(adId)!.push(insight)
    }
    
    return grouped
  }

  /**
   * Step 2: 単一広告のデータを集約
   */
  private static aggregateAdData(
    adId: string,
    insights: MetaApiInsight[],
    options: AggregationOptions,
    errors: AggregationError[]
  ): AdPerformanceData {
    // 基本情報を最初のレコードから取得
    const firstInsight = insights[0]
    
    // 日付範囲を計算
    const dateRange = this.calculateDateRange(insights)
    
    // 期間全体のサマリーを計算
    const summaryMetrics = this.calculateSummaryMetrics(insights)
    
    // 日別データを集約（オプション）
    const dailyBreakdown = options.includeDailyBreakdown
      ? this.aggregateDailyBreakdown(insights)
      : []
    
    // プラットフォーム別集計（オプション）
    const platformBreakdown = options.includePlatformBreakdown
      ? this.aggregatePlatformBreakdown(insights)
      : undefined

    // クリエイティブ情報を抽出
    const creative = this.extractCreativeInfo(firstInsight)

    return {
      // 基本情報
      ad_id: adId,
      ad_name: firstInsight.ad_name || 'Untitled Ad',
      campaign_id: firstInsight.campaign_id || '',
      campaign_name: firstInsight.campaign_name || '',
      adset_id: firstInsight.adset_id || '',
      adset_name: firstInsight.adset_name || '',
      account_id: firstInsight.account_id || '',
      
      // クリエイティブ情報
      creative,
      
      // 期間集計データ
      summary: {
        dateRange,
        metrics: summaryMetrics,
        platformBreakdown,
      },
      
      // 日別詳細データ
      dailyBreakdown,
      
      // メタデータ
      metadata: {
        lastUpdated: new Date().toISOString(),
        dataQuality: this.assessDataQuality(insights, errors),
        warnings: this.collectWarnings(insights),
      },
    }
  }

  /**
   * 日付範囲を計算
   */
  private static calculateDateRange(insights: MetaApiInsight[]): { start: string; end: string } {
    let minDate = insights[0]?.date_start
    let maxDate = insights[0]?.date_stop

    for (const insight of insights) {
      if (insight.date_start && insight.date_start < minDate) {
        minDate = insight.date_start
      }
      if (insight.date_stop && insight.date_stop > maxDate) {
        maxDate = insight.date_stop
      }
    }

    return {
      start: minDate || new Date().toISOString(),
      end: maxDate || new Date().toISOString(),
    }
  }

  /**
   * サマリーメトリクスを計算
   */
  private static calculateSummaryMetrics(insights: MetaApiInsight[]): CalculatedMetrics {
    let totalImpressions = 0
    let totalClicks = 0
    let totalSpend = 0
    let maxReach = 0
    let totalUniqueClicks = 0
    let totalConversions = 0
    let totalConversionValue = 0
    let totalFirstConversions = 0
    let frequencySum = 0
    let frequencyCount = 0

    for (const insight of insights) {
      totalImpressions += this.parseNumber(insight.impressions)
      totalClicks += this.parseNumber(insight.clicks)
      totalSpend += this.parseNumber(insight.spend)
      maxReach = Math.max(maxReach, this.parseNumber(insight.reach))
      totalUniqueClicks += this.parseNumber(insight.unique_clicks)
      totalConversions += this.parseNumber(insight.conversions)
      totalConversionValue += this.parseNumber(insight.conversion_values)
      totalFirstConversions += this.parseNumber(insight.first_conversions)
      
      const freq = this.parseNumber(insight.frequency)
      if (freq > 0) {
        frequencySum += freq
        frequencyCount++
      }
    }

    // 比率メトリクスを再計算
    const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0
    const cpc = totalClicks > 0 ? totalSpend / totalClicks : 0
    const cpm = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0
    const uniqueCtr = maxReach > 0 ? (totalUniqueClicks / maxReach) * 100 : 0
    const frequency = frequencyCount > 0 ? frequencySum / frequencyCount : 0
    const cpa = totalConversions > 0 ? totalSpend / totalConversions : 0
    const roas = totalSpend > 0 ? totalConversionValue / totalSpend : 0

    return {
      impressions: totalImpressions,
      clicks: totalClicks,
      spend: totalSpend,
      reach: maxReach,
      frequency,
      unique_clicks: totalUniqueClicks,
      unique_ctr: uniqueCtr,
      ctr,
      cpc,
      cpm,
      conversions: totalConversions,
      conversion_value: totalConversionValue,
      cpa,
      roas,
      first_conversions: totalFirstConversions,
    }
  }

  /**
   * 日別データを集約
   */
  private static aggregateDailyBreakdown(insights: MetaApiInsight[]): DailyMetrics[] {
    const dailyMap = new Map<string, MetaApiInsight[]>()
    
    // 日付でグループ化
    for (const insight of insights) {
      const date = insight.date_start
      if (!date) continue
      
      if (!dailyMap.has(date)) {
        dailyMap.set(date, [])
      }
      dailyMap.get(date)!.push(insight)
    }
    
    // 各日のメトリクスを計算
    const dailyMetrics: DailyMetrics[] = []
    for (const [date, dayInsights] of dailyMap.entries()) {
      const metrics = this.calculateSummaryMetrics(dayInsights)
      dailyMetrics.push({
        date,
        ...metrics,
      })
    }
    
    // 日付順にソート
    dailyMetrics.sort((a, b) => a.date.localeCompare(b.date))
    
    return dailyMetrics
  }

  /**
   * プラットフォーム別データを集約
   */
  private static aggregatePlatformBreakdown(
    insights: MetaApiInsight[]
  ): Record<string, CalculatedMetrics> {
    const platformMap = new Map<PlatformType, MetaApiInsight[]>()
    
    // プラットフォームでグループ化
    for (const insight of insights) {
      const platform = this.normalizePlatform(insight.publisher_platform)
      
      if (!platformMap.has(platform)) {
        platformMap.set(platform, [])
      }
      platformMap.get(platform)!.push(insight)
    }
    
    // 各プラットフォームのメトリクスを計算
    const breakdown: Record<string, CalculatedMetrics> = {}
    for (const [platform, platformInsights] of platformMap.entries()) {
      breakdown[platform] = this.calculateSummaryMetrics(platformInsights)
    }
    
    return breakdown
  }

  /**
   * クリエイティブ情報を抽出
   */
  private static extractCreativeInfo(insight: MetaApiInsight) {
    if (!insight.creative_id) return undefined
    
    return {
      id: insight.creative_id,
      name: insight.creative_name,
      type: insight.creative_type,
      thumbnail_url: insight.thumbnail_url,
      video_url: insight.video_url,
      image_url: insight.image_url,
      object_type: insight.object_type,
    }
  }

  /**
   * プラットフォーム名を正規化
   */
  private static normalizePlatform(platform?: string): PlatformType {
    if (!platform) return 'other'
    
    const normalized = platform.toLowerCase()
    if (normalized.includes('facebook')) return 'facebook'
    if (normalized.includes('instagram')) return 'instagram'
    if (normalized.includes('audience')) return 'audience_network'
    
    return 'other'
  }

  /**
   * 文字列を数値に変換
   */
  private static parseNumber(value: any): number {
    if (typeof value === 'number') return value
    if (typeof value === 'string') {
      const parsed = parseFloat(value)
      return isNaN(parsed) ? 0 : parsed
    }
    return 0
  }

  /**
   * データ品質を評価
   */
  private static assessDataQuality(
    insights: MetaApiInsight[],
    errors: AggregationError[]
  ): 'complete' | 'partial' | 'estimated' {
    if (errors.some(e => e.severity === 'error')) {
      return 'partial'
    }
    
    // 欠損値の割合をチェック
    const missingRatio = this.calculateMissingRatio(insights)
    if (missingRatio > 0.1) return 'partial'
    
    return 'complete'
  }

  /**
   * 欠損値の割合を計算
   */
  private static calculateMissingRatio(insights: MetaApiInsight[]): number {
    if (insights.length === 0) return 1
    
    let missingCount = 0
    const totalFields = insights.length * 5 // 5つの主要フィールド
    
    for (const insight of insights) {
      if (!insight.impressions) missingCount++
      if (!insight.clicks) missingCount++
      if (!insight.spend) missingCount++
      if (!insight.reach) missingCount++
      if (!insight.frequency) missingCount++
    }
    
    return missingCount / totalFields
  }

  /**
   * 警告メッセージを収集
   */
  private static collectWarnings(insights: MetaApiInsight[]): string[] {
    const warnings: string[] = []
    
    // 異常に高いCTRをチェック
    for (const insight of insights) {
      const ctr = this.parseNumber(insight.ctr)
      if (ctr > 50) {
        warnings.push(`Unusually high CTR detected: ${ctr}%`)
        break
      }
    }
    
    // データの一貫性をチェック
    const dates = new Set(insights.map(i => i.date_start))
    if (dates.size < 7 && insights.length > 100) {
      warnings.push('Limited date range in dataset')
    }
    
    return warnings
  }

  /**
   * 全体サマリーを計算
   */
  private static calculateSummary(data: AdPerformanceData[]) {
    let totalSpend = 0
    let totalImpressions = 0
    let totalConversions = 0
    let totalClicks = 0
    let totalRevenue = 0

    for (const ad of data) {
      totalSpend += ad.summary.metrics.spend
      totalImpressions += ad.summary.metrics.impressions
      totalConversions += ad.summary.metrics.conversions || 0
      totalClicks += ad.summary.metrics.clicks
      totalRevenue += ad.summary.metrics.conversion_value || 0
    }

    return {
      totalAds: data.length,
      totalSpend,
      totalImpressions,
      totalConversions,
      averageCtr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
      averageRoas: totalSpend > 0 ? totalRevenue / totalSpend : 0,
    }
  }
}