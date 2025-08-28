/**
 * TASK-202: Enhanced AdDataAggregator - 拡張集約クラス
 * 要件: REQ-003 (媒体別集約), REQ-006, REQ-007 (データ整合性)
 * 
 * 既存AdDataAggregatorを拡張し、プラットフォーム別グラフデータ生成と
 * データ整合性チェック機能を追加
 */

import { AdDataAggregator, type MetaApiInsight, type PlatformType } from './ad-data-aggregator'
import type {
  EnhancedAggregationOptions,
  EnhancedAggregationResult,
  EnhancedAdPerformanceData,
  DataConsistencyResult,
  DataDiscrepancy,
  GraphDataPoint,
  PlatformSpecificMetrics
} from '../types/enhanced-data-structure'

export class EnhancedAdDataAggregator extends AdDataAggregator {
  
  // 定数定義
  private static readonly CONSISTENCY_TOLERANCE_PERCENT = 2.0 // 許容誤差2%
  private static readonly HIGH_VARIANCE_THRESHOLD = 10.0 // 高分散閾値10%  
  private static readonly MEDIUM_VARIANCE_THRESHOLD = 5.0 // 中分散閾値5%
  
  /**
   * 拡張集約メソッド - メイン機能
   * 
   * @param insights - Meta APIからの生インサイトデータ
   * @param options - 拡張集約オプション（グラフデータ生成、整合性チェック等）
   * @returns 拡張集約結果（グラフデータと整合性チェック結果を含む）
   * 
   * @example
   * ```typescript
   * const options: EnhancedAggregationOptions = {
   *   groupBy: 'ad',
   *   includePlatformBreakdown: true,
   *   includeGraphData: true,
   *   graphMetrics: ['ctr', 'cpm'],
   *   performConsistencyCheck: true
   * }
   * const result = EnhancedAdDataAggregator.aggregateEnhanced(insights, options)
   * ```
   */
  static aggregateEnhanced(
    insights: MetaApiInsight[],
    options: EnhancedAggregationOptions
  ): EnhancedAggregationResult {
    console.time('EnhancedAdDataAggregator.aggregateEnhanced')
    const startTime = Date.now()

    try {
      // バリデーション
      if (!insights || insights.length === 0) {
        console.warn('[EnhancedAdDataAggregator] Empty or undefined insights data')
        return {
          data: [],
          consistencyResults: [],
          metadata: {
            totalInputRows: 0,
            totalOutputRows: 0,
            processingTimeMs: Date.now() - startTime,
            dataReduction: '0%',
            graphDataGenerated: false,
            consistencyCheckPerformed: false
          }
        }
      }

      // Step 1: 基本集約を実行
      const baseResult = this.aggregate(insights, {
        groupBy: options.groupBy,
        includePlatformBreakdown: options.includePlatformBreakdown,
        includeDailyBreakdown: options.includeDailyBreakdown,
        calculateFatigue: options.calculateFatigue
      })

      // Step 2: 拡張機能を追加
      const enhancedData: EnhancedAdPerformanceData[] = []
      const consistencyResults: DataConsistencyResult[] = []

      for (const baseAd of baseResult.data) {
        // 該当広告のInsightsを取得
        const adInsights = insights.filter(insight => insight.ad_id === baseAd.ad_id)
        
        // 拡張データ作成
        const enhancedAd: EnhancedAdPerformanceData = {
          ...baseAd,
          platformGraphs: {},
          detailedPlatformMetrics: undefined
        }

        // Step 3: グラフデータ生成（オプション）
        if (options.includeGraphData) {
          enhancedAd.platformGraphs = this.generateGraphData(adInsights, options.graphMetrics)
        }

        // Step 4: 詳細プラットフォームメトリクス生成
        if (options.includePlatformBreakdown) {
          enhancedAd.detailedPlatformMetrics = this.generateDetailedPlatformMetrics(adInsights)
        }

        // Step 5: データ整合性チェック（オプション）
        if (options.performConsistencyCheck) {
          const consistencyResult = this.performConsistencyCheck(adInsights, enhancedAd)
          consistencyResults.push(consistencyResult)
        }

        enhancedData.push(enhancedAd)
      }

      console.timeEnd('EnhancedAdDataAggregator.aggregateEnhanced')

      return {
        data: enhancedData,
        consistencyResults,
        metadata: {
          totalInputRows: insights.length,
          totalOutputRows: enhancedData.length,
          processingTimeMs: Date.now() - startTime,
          dataReduction: `${((1 - enhancedData.length / insights.length) * 100).toFixed(1)}%`,
          graphDataGenerated: options.includeGraphData && enhancedData.length > 0,
          consistencyCheckPerformed: options.performConsistencyCheck
        }
      }
    } catch (error) {
      console.error('[EnhancedAdDataAggregator] Fatal error during enhanced aggregation:', error)
      throw error
    }
  }

  /**
   * Step 3: プラットフォーム別グラフデータ生成
   */
  private static generateGraphData(
    insights: MetaApiInsight[],
    requestedMetrics: (keyof any)[]
  ): Partial<any> {
    const graphData: any = {}

    // 日付でグループ化
    const dailyData = new Map<string, Map<PlatformType, MetaApiInsight[]>>()
    
    for (const insight of insights) {
      const date = insight.date_start
      const platform = this.normalizePlatform(insight.publisher_platform)
      
      if (!dailyData.has(date)) {
        dailyData.set(date, new Map())
      }
      
      const dayData = dailyData.get(date)!
      if (!dayData.has(platform)) {
        dayData.set(platform, [])
      }
      
      dayData.get(platform)!.push(insight)
    }

    // 各指標のグラフデータを生成
    for (const metric of requestedMetrics) {
      const metricData: GraphDataPoint[] = []
      
      for (const [date, platformMap] of dailyData.entries()) {
        const dataPoint: any = { date }
        
        for (const [platform, platformInsights] of platformMap.entries()) {
          const value = this.calculateMetricValue(metric as string, platformInsights)
          if (platform === 'facebook') dataPoint.facebook = value
          else if (platform === 'instagram') dataPoint.instagram = value
          else if (platform === 'audience_network') dataPoint.audience_network = value
          else if (platform === 'messenger') dataPoint.messenger = value
        }
        
        metricData.push(dataPoint)
      }
      
      // 日付順にソート
      metricData.sort((a, b) => a.date.localeCompare(b.date))
      graphData[metric] = metricData
    }

    return graphData
  }

  /**
   * Step 4: 詳細プラットフォームメトリクス生成
   */
  private static generateDetailedPlatformMetrics(insights: MetaApiInsight[]): PlatformSpecificMetrics {
    const platformInsights = new Map<PlatformType, MetaApiInsight[]>()
    
    // プラットフォームでグループ化
    for (const insight of insights) {
      const platform = this.normalizePlatform(insight.publisher_platform)
      
      if (!platformInsights.has(platform)) {
        platformInsights.set(platform, [])
      }
      platformInsights.get(platform)!.push(insight)
    }

    // 各プラットフォームのメトリクスを計算
    const platformMetrics: any = {}
    
    for (const [platform, platformData] of platformInsights.entries()) {
      const metrics = this.calculateSummaryMetrics(platformData)
      platformMetrics[platform] = metrics
    }

    return platformMetrics as PlatformSpecificMetrics
  }

  /**
   * Step 5: データ整合性チェック
   */
  private static performConsistencyCheck(
    insights: MetaApiInsight[],
    enhancedData: EnhancedAdPerformanceData
  ): DataConsistencyResult {
    const discrepancies: DataDiscrepancy[] = []
    let totalChecks = 0
    let passedChecks = 0

    // プラットフォーム別の合計値vs全体値の整合性をチェック
    if (enhancedData.detailedPlatformMetrics) {
      const platformMetrics = enhancedData.detailedPlatformMetrics
      const overallMetrics = enhancedData.summary.metrics

      // 主要指標のチェック
      const metricsToCheck = ['impressions', 'clicks', 'spend', 'conversions'] as const
      
      for (const metric of metricsToCheck) {
        totalChecks++
        
        // プラットフォーム別合計を計算（null安全）
        const platformTotal = 
          (platformMetrics.facebook?.[metric] || 0) +
          (platformMetrics.instagram?.[metric] || 0) +
          (platformMetrics.audience_network?.[metric] || 0) +
          (platformMetrics.messenger?.[metric] || 0)
        
        const overallValue = overallMetrics[metric]
        const variance = Math.abs((platformTotal - overallValue) / overallValue * 100)
        
        // 許容誤差範囲をチェック
        if (variance <= this.CONSISTENCY_TOLERANCE_PERCENT) {
          passedChecks++
        } else {
          const severity = variance > this.HIGH_VARIANCE_THRESHOLD 
            ? 'high' 
            : variance > this.MEDIUM_VARIANCE_THRESHOLD 
            ? 'medium' 
            : 'low'
          
          discrepancies.push({
            platform: 'all',
            metric,
            expected: overallValue,
            actual: platformTotal,
            variance,
            severity
          })
        }
      }
    }

    const failedChecks = totalChecks - passedChecks
    const overallVariance = discrepancies.length > 0 
      ? discrepancies.reduce((sum, d) => sum + d.variance, 0) / discrepancies.length
      : 0

    return {
      isConsistent: discrepancies.length === 0,
      discrepancies,
      summary: {
        totalChecks,
        passedChecks,
        failedChecks,
        overallVariance
      }
    }
  }

  /**
   * ユーティリティ: 指標値計算
   */
  private static calculateMetricValue(metric: string, insights: MetaApiInsight[]): number {
    switch (metric) {
      case 'ctr':
        const totalImpressions = insights.reduce((sum, i) => sum + this.parseNumber(i.impressions), 0)
        const totalClicks = insights.reduce((sum, i) => sum + this.parseNumber(i.clicks), 0)
        return totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0
        
      case 'cpm':
        const impressions = insights.reduce((sum, i) => sum + this.parseNumber(i.impressions), 0)
        const spend = insights.reduce((sum, i) => sum + this.parseNumber(i.spend), 0)
        return impressions > 0 ? (spend / impressions) * 1000 : 0
        
      case 'cpc':
        const clicks = insights.reduce((sum, i) => sum + this.parseNumber(i.clicks), 0)
        const totalSpend = insights.reduce((sum, i) => sum + this.parseNumber(i.spend), 0)
        return clicks > 0 ? totalSpend / clicks : 0
        
      case 'cpa':
        const conversions = insights.reduce((sum, i) => sum + this.parseNumber(i.conversions), 0)
        const spendForCpa = insights.reduce((sum, i) => sum + this.parseNumber(i.spend), 0)
        return conversions > 0 ? spendForCpa / conversions : 0
        
      case 'roas':
        const conversionValue = insights.reduce((sum, i) => sum + this.parseNumber(i.conversion_values), 0)
        const spendForRoas = insights.reduce((sum, i) => sum + this.parseNumber(i.spend), 0)
        return spendForRoas > 0 ? conversionValue / spendForRoas : 0
        
      case 'conversions':
        return insights.reduce((sum, i) => sum + this.parseNumber(i.conversions), 0)
        
      case 'impressions':
        return insights.reduce((sum, i) => sum + this.parseNumber(i.impressions), 0)
        
      case 'spend':
        return insights.reduce((sum, i) => sum + this.parseNumber(i.spend), 0)
        
      default:
        return 0
    }
  }

  /**
   * プラットフォーム名正規化（継承）
   */
  private static normalizePlatform(platform?: string): PlatformType {
    if (!platform) return 'unknown'
    
    const normalized = platform.toLowerCase()
    if (normalized.includes('facebook')) return 'facebook'
    if (normalized.includes('instagram')) return 'instagram'
    if (normalized.includes('audience')) return 'audience_network'
    if (normalized.includes('messenger')) return 'messenger'
    
    return 'unknown'
  }
}