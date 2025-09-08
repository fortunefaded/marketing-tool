// TASK-005: Date Range Aware Gap Detection Engine Implementation  
// TASK-202: Gap Detection Engine Implementation
// 配信ギャップの自動検出と重要度判定エンジン

import type { 
  TimelineData, 
  DailyDeliveryStatus,
  GapDetectionResult,
  DeliveryGap,
  GapSeverity,
  GapType,
  GapImpact,
  AdInsight
} from '../types'
import type { 
  DateRangeGapDetectionConfig, 
  DateRangeGapAnalysisResult, 
  AdFatigueGap 
} from '../types/gap-detection-types'

export interface GapDetectionConfig {
  // 基本設定
  minGapDays: number // 最小ギャップ日数（これ以下は無視）
  maxAnalysisWindow: number // 分析対象期間（日数）
  
  // 重要度判定のしきい値
  thresholds: {
    criticalGapDays: number // 重大ギャップと判定する日数
    majorGapDays: number // 主要ギャップと判定する日数
    minorGapDays: number // 軽微ギャップと判定する日数
    
    // パフォーマンス影響度のしきい値
    performanceDropThreshold: number // パフォーマンス低下率(%)
    recoveryTimeThreshold: number // 回復時間のしきい値(日)
  }
  
  // 特殊なギャップパターンの設定
  patterns: {
    weekendGapTolerance: boolean // 週末ギャップを許容するか
    holidayGapTolerance: boolean // 祝日ギャップを許容するか
    scheduledMaintenanceWindows: string[] // 予定メンテナンス時間帯
  }
}

export class GapDetectionEngine {
  private config: GapDetectionConfig
  
  constructor(config: GapDetectionConfig) {
    this.validateConfig(config)
    this.config = config
  }

  /**
   * メイン検出処理：TimelineDataからギャップを検出
   */
  detectGaps(timelineData: TimelineData): GapDetectionResult {
    console.log('[GapDetection] Starting gap analysis for', timelineData.totalDays, 'days')
    
    // 1. 基本的なギャップの検出
    const rawGaps = this.identifyRawGaps(timelineData.dailyStatuses)
    
    // 2. ギャップのフィルタリング（最小日数未満を除外）
    const filteredGaps = rawGaps.filter(gap => 
      gap.durationDays >= this.config.minGapDays
    )
    
    // 3. ギャップの分類と重要度判定
    const classifiedGaps = filteredGaps.map(gap => 
      this.classifyGap(gap, timelineData.dailyStatuses)
    )
    
    // 4. パフォーマンス影響度の計算
    const gapsWithImpact = classifiedGaps.map(gap =>
      this.calculateGapImpact(gap, timelineData.dailyStatuses)
    )
    
    // 5. 全体統計の計算
    const statistics = this.calculateGapStatistics(gapsWithImpact, timelineData)
    
    const result: GapDetectionResult = {
      totalGaps: gapsWithImpact.length,
      gaps: gapsWithImpact,
      statistics,
      analysisMetadata: {
        analysisDate: new Date(),
        configUsed: this.config,
        timelineDataSummary: {
          totalDays: timelineData.totalDays,
          deliveryDays: timelineData.deliveryDays,
          gapDays: timelineData.gapDays
        }
      }
    }
    
    console.log('[GapDetection] Analysis complete:', {
      totalGaps: result.totalGaps,
      criticalGaps: result.gaps.filter(g => g.severity === 'critical').length,
      majorGaps: result.gaps.filter(g => g.severity === 'major').length
    })
    
    return result
  }

  /**
   * 生のギャップ期間を特定
   */
  private identifyRawGaps(dailyStatuses: DailyDeliveryStatus[]): DeliveryGap[] {
    const gaps: DeliveryGap[] = []
    let currentGapStart: Date | null = null
    let currentGapDays = 0
    
    for (let i = 0; i < dailyStatuses.length; i++) {
      const status = dailyStatuses[i]
      
      if (!status.hasDelivery) {
        // ギャップ期間の開始または継続
        if (currentGapStart === null) {
          currentGapStart = status.date
          currentGapDays = 1
        } else {
          currentGapDays++
        }
      } else {
        // 配信あり：ギャップ期間の終了
        if (currentGapStart !== null && currentGapDays > 0) {
          gaps.push({
            startDate: currentGapStart,
            endDate: status.date,
            durationDays: currentGapDays,
            severity: 'unknown', // 後で分類
            type: 'unknown', // 後で分類
            impact: {
              performanceDrop: 0,
              recoveryTime: 0,
              estimatedLostImpressions: 0,
              estimatedLostRevenue: 0
            },
            beforeGapMetrics: this.getMetricsBeforeGap(dailyStatuses, i - currentGapDays - 1),
            afterGapMetrics: status.metrics,
            gapContext: {
              precedingDeliveryDays: this.countPrecedingDeliveryDays(dailyStatuses, i - currentGapDays - 1),
              followingDeliveryDays: this.countFollowingDeliveryDays(dailyStatuses, i)
            }
          })
          
          // リセット
          currentGapStart = null
          currentGapDays = 0
        }
      }
    }
    
    // 期間終了時にギャップが継続している場合
    if (currentGapStart !== null && currentGapDays > 0) {
      const lastDate = dailyStatuses[dailyStatuses.length - 1]?.date || new Date()
      gaps.push({
        startDate: currentGapStart,
        endDate: lastDate,
        durationDays: currentGapDays,
        severity: 'unknown',
        type: 'unknown',
        impact: {
          performanceDrop: 0,
          recoveryTime: 0,
          estimatedLostImpressions: 0,
          estimatedLostRevenue: 0
        },
        beforeGapMetrics: this.getMetricsBeforeGap(dailyStatuses, dailyStatuses.length - currentGapDays - 1),
        afterGapMetrics: null, // ギャップが継続中
        gapContext: {
          precedingDeliveryDays: this.countPrecedingDeliveryDays(dailyStatuses, dailyStatuses.length - currentGapDays - 1),
          followingDeliveryDays: 0 // 継続中のため0
        }
      })
    }
    
    return gaps
  }

  /**
   * ギャップの分類と重要度判定
   */
  private classifyGap(gap: DeliveryGap, dailyStatuses: DailyDeliveryStatus[]): DeliveryGap {
    // 重要度の判定
    const severity = this.determineSeverity(gap)
    
    // タイプの判定
    const type = this.determineGapType(gap, dailyStatuses)
    
    return {
      ...gap,
      severity,
      type
    }
  }

  /**
   * ギャップの重要度を判定
   */
  private determineSeverity(gap: DeliveryGap): GapSeverity {
    const days = gap.durationDays
    
    if (days >= this.config.thresholds.criticalGapDays) {
      return 'critical'
    } else if (days >= this.config.thresholds.majorGapDays) {
      return 'major'
    } else if (days >= this.config.thresholds.minorGapDays) {
      return 'minor'
    }
    
    return 'negligible'
  }

  /**
   * ギャップのタイプを判定
   */
  private determineGapType(gap: DeliveryGap, _dailyStatuses: DailyDeliveryStatus[]): GapType {
    // 週末ギャップの判定
    if (this.isWeekendGap(gap)) {
      return 'weekend'
    }
    
    // 予定メンテナンスの判定
    if (this.isScheduledMaintenance(gap)) {
      return 'scheduled_maintenance'
    }
    
    // 広告予算切れの判定
    if (this.isBudgetExhaustion(gap)) {
      return 'budget_exhaustion'
    }
    
    // パフォーマンス低下による停止の判定
    if (this.isPerformancePause(gap)) {
      return 'performance_pause'
    }
    
    // その他は予期しないギャップ
    return 'unexpected'
  }

  /**
   * ギャップのパフォーマンス影響度を計算
   */
  private calculateGapImpact(gap: DeliveryGap, dailyStatuses: DailyDeliveryStatus[]): DeliveryGap {
    const impact: GapImpact = {
      performanceDrop: 0,
      recoveryTime: 0,
      estimatedLostImpressions: 0,
      estimatedLostRevenue: 0
    }
    
    // ギャップ前後のパフォーマンス比較
    if (gap.beforeGapMetrics && gap.afterGapMetrics) {
      // CTR低下率の計算
      const ctrBefore = gap.beforeGapMetrics.ctr
      const ctrAfter = gap.afterGapMetrics.ctr
      
      if (ctrBefore > 0) {
        impact.performanceDrop = ((ctrBefore - ctrAfter) / ctrBefore) * 100
      }
      
      // 回復時間の推定
      impact.recoveryTime = this.estimateRecoveryTime(gap, dailyStatuses)
      
      // 推定損失インプレッション
      impact.estimatedLostImpressions = this.estimateLostImpressions(gap, dailyStatuses)
      
      // 推定損失収益
      impact.estimatedLostRevenue = this.estimateLostRevenue(gap, dailyStatuses)
    }
    
    return {
      ...gap,
      impact
    }
  }

  /**
   * 全体的なギャップ統計を計算
   */
  private calculateGapStatistics(gaps: DeliveryGap[], timelineData: TimelineData) {
    const totalGapDays = gaps.reduce((sum, gap) => sum + gap.durationDays, 0)
    const averageGapDuration = gaps.length > 0 ? totalGapDays / gaps.length : 0
    
    const severityDistribution = {
      critical: gaps.filter(g => g.severity === 'critical').length,
      major: gaps.filter(g => g.severity === 'major').length,
      minor: gaps.filter(g => g.severity === 'minor').length,
      negligible: gaps.filter(g => g.severity === 'negligible').length
    }
    
    const typeDistribution = gaps.reduce((acc, gap) => {
      acc[gap.type] = (acc[gap.type] || 0) + 1
      return acc
    }, {} as Record<GapType, number>)
    
    // 最長ギャップ
    const longestGap = gaps.reduce((longest, gap) => 
      gap.durationDays > longest.durationDays ? gap : longest,
      gaps[0] || { durationDays: 0 }
    )
    
    // 全体的な配信継続性スコア（0-100）
    const continuityScore = timelineData.totalDays > 0 
      ? Math.max(0, 100 - (totalGapDays / timelineData.totalDays) * 100)
      : 100 // データがない場合は100とする
    
    return {
      totalGapDays,
      gapRate: (totalGapDays / timelineData.totalDays) * 100,
      averageGapDuration,
      longestGapDays: longestGap?.durationDays || 0,
      continuityScore,
      severityDistribution,
      typeDistribution,
      estimatedTotalImpact: {
        lostImpressions: gaps.reduce((sum, gap) => sum + gap.impact.estimatedLostImpressions, 0),
        lostRevenue: gaps.reduce((sum, gap) => sum + gap.impact.estimatedLostRevenue, 0)
      }
    }
  }

  /**
   * ユーティリティメソッド群
   */
  private getMetricsBeforeGap(dailyStatuses: DailyDeliveryStatus[], index: number) {
    // ギャップ直前の配信日のメトリクスを取得
    for (let i = index; i >= 0; i--) {
      if (dailyStatuses[i]?.hasDelivery) {
        return dailyStatuses[i].metrics
      }
    }
    return null
  }

  private countPrecedingDeliveryDays(dailyStatuses: DailyDeliveryStatus[], index: number): number {
    let count = 0
    for (let i = index; i >= 0 && count < 7; i--) { // 最大7日前まで
      if (dailyStatuses[i]?.hasDelivery) {
        count++
      }
    }
    return count
  }

  private countFollowingDeliveryDays(dailyStatuses: DailyDeliveryStatus[], index: number): number {
    let count = 0
    for (let i = index; i < dailyStatuses.length && count < 7; i++) { // 最大7日後まで
      if (dailyStatuses[i]?.hasDelivery) {
        count++
      }
    }
    return count
  }

  private isWeekendGap(gap: DeliveryGap): boolean {
    // 土日のみのギャップかどうかを判定
    const startDay = gap.startDate.getDay() // 0=日曜、6=土曜
    // const endDay = gap.endDate.getDay()
    
    // 土曜日開始 または 日曜日開始で、2日以下のギャップ
    if (gap.durationDays <= 2) {
      return startDay === 6 || startDay === 0 // 土曜日または日曜日開始
    }
    
    return false
  }

  private isScheduledMaintenance(_gap: DeliveryGap): boolean {
    // 予定メンテナンス時間との照合（実装は簡略化）
    return false // TODO: 実際のメンテナンス時刻との照合ロジック
  }

  private isBudgetExhaustion(gap: DeliveryGap): boolean {
    // 予算切れの兆候を判定（配信量の段階的減少など）
    return gap.beforeGapMetrics?.spend ? gap.beforeGapMetrics.spend > 1000 : false
  }

  private isPerformancePause(gap: DeliveryGap): boolean {
    // パフォーマンス低下による自動停止の判定
    return gap.beforeGapMetrics?.ctr ? gap.beforeGapMetrics.ctr < 1.0 : false
  }

  private estimateRecoveryTime(gap: DeliveryGap, _dailyStatuses: DailyDeliveryStatus[]): number {
    // 回復時間の推定（簡略化実装）
    return Math.min(gap.durationDays, 7) // 最大7日と仮定
  }

  private estimateLostImpressions(gap: DeliveryGap, _dailyStatuses: DailyDeliveryStatus[]): number {
    // ギャップ前の平均インプレッション × ギャップ日数
    const avgImpressions = gap.beforeGapMetrics?.impressions || 0
    return avgImpressions * gap.durationDays
  }

  private estimateLostRevenue(gap: DeliveryGap, _dailyStatuses: DailyDeliveryStatus[]): number {
    // 推定損失収益の計算
    const avgSpend = gap.beforeGapMetrics?.spend || 0
    return avgSpend * gap.durationDays * 0.8 // 80%の収益率と仮定
  }

  private validateConfig(config: GapDetectionConfig): void {
    if (config.minGapDays < 1) {
      throw new Error('minGapDays must be at least 1')
    }
    
    if (config.thresholds.criticalGapDays <= config.thresholds.majorGapDays) {
      throw new Error('criticalGapDays must be greater than majorGapDays')
    }
    
    if (config.thresholds.majorGapDays <= config.thresholds.minorGapDays) {
      throw new Error('majorGapDays must be greater than minorGapDays')
    }
  }
}

/**
 * デフォルト設定のファクトリー関数
 */
export function createDefaultGapDetectionConfig(): GapDetectionConfig {
  return {
    minGapDays: 1,
    maxAnalysisWindow: 90,
    thresholds: {
      criticalGapDays: 7,   // 7日以上は重大
      majorGapDays: 3,      // 3日以上は主要
      minorGapDays: 1,      // 1日以上は軽微
      performanceDropThreshold: 25, // 25%以上の低下
      recoveryTimeThreshold: 3      // 3日以上の回復時間
    },
    patterns: {
      weekendGapTolerance: true,
      holidayGapTolerance: true,
      scheduledMaintenanceWindows: []
    }
  }
}

// TASK-005: Date Range Aware Gap Detection Engine Extension
export class DateRangeGapDetectionEngine {
  private config: DateRangeGapDetectionConfig

  constructor(config: DateRangeGapDetectionConfig) {
    this.config = config
    this.validateConfig()
  }

  private validateConfig(): void {
    if (!this.config.dateRangeAware) {
      throw new Error('DateRangeGapDetectionEngine requires dateRangeAware to be true')
    }

    if (this.config.timeSeriesAnalysis.minDataPoints < 1) {
      throw new Error('minDataPoints must be at least 1')
    }

    if (this.config.thresholds.ctrDeclineThreshold <= 0 || this.config.thresholds.ctrDeclineThreshold >= 1) {
      throw new Error('ctrDeclineThreshold must be between 0 and 1')
    }

    if (this.config.thresholds.frequencyWarningThreshold <= 0) {
      throw new Error('frequencyWarningThreshold must be positive')
    }
  }

  analyzeGaps(data: AdInsight[], dateRange: string): DateRangeGapAnalysisResult {
    const analysisTimestamp = new Date()
    const dataPoints = data.length

    // 日付範囲に応じた分析設定
    const analysisConfig = this.getDateRangeSpecificConfig(dateRange, dataPoints)
    
    // 時系列分析の実行判定
    const timeSeriesEnabled = analysisConfig.timeSeriesEnabled && 
                             dataPoints >= this.config.timeSeriesAnalysis.minDataPoints

    // 広告別のギャップ分析
    const gaps = this.analyzeAdFatigue(data, dateRange, analysisConfig)

    // 時系列分析の実行
    const timeSeriesAnalysis = timeSeriesEnabled 
      ? this.performTimeSeriesAnalysis(data, dateRange)
      : { enabled: false, dateRange, dataPointsCount: dataPoints }

    // サマリー統計の計算
    const summary = this.calculateSummary(gaps)

    return {
      dateRange,
      analysisTimestamp,
      dataPoints,
      gaps: gaps.sort((a, b) => this.getSeverityWeight(b.severity) - this.getSeverityWeight(a.severity)),
      summary,
      timeSeriesAnalysis
    }
  }

  private getDateRangeSpecificConfig(dateRange: string, dataPoints: number) {
    const isShortTerm = this.isShortTermRange(dateRange, dataPoints)
    
    return {
      timeSeriesEnabled: !isShortTerm,
      strictThresholds: isShortTerm,
      ctrThreshold: isShortTerm ? 
        this.config.thresholds.ctrDeclineThreshold * 0.8 : // より厳しく
        this.config.thresholds.ctrDeclineThreshold,
      frequencyThreshold: this.config.thresholds.frequencyWarningThreshold,
      cpmThreshold: isShortTerm ?
        this.config.thresholds.cpmIncreaseThreshold * 0.8 : // より厳しく
        this.config.thresholds.cpmIncreaseThreshold
    }
  }

  private isShortTermRange(dateRange: string, dataPoints: number): boolean {
    const shortTermPatterns = ['last_3d', 'last_7d', 'yesterday', 'today']
    const isShortRangePattern = shortTermPatterns.some(pattern => dateRange.includes(pattern))
    const hasLimitedData = dataPoints < 10
    
    return isShortRangePattern || hasLimitedData
  }

  private analyzeAdFatigue(
    data: AdInsight[], 
    dateRange: string, 
    analysisConfig: any
  ): AdFatigueGap[] {
    const adGroups = this.groupByAd(data)
    const gaps: AdFatigueGap[] = []

    for (const [adId, adData] of Object.entries(adGroups)) {
      const gap = this.analyzeAdFatigueForAd(adId, adData, dateRange, analysisConfig)
      gaps.push(gap)
    }

    return gaps
  }

  private groupByAd(data: AdInsight[]): Record<string, AdInsight[]> {
    return data.reduce((groups, insight) => {
      const adId = insight.ad_id
      if (!groups[adId]) {
        groups[adId] = []
      }
      groups[adId].push(insight)
      return groups
    }, {} as Record<string, AdInsight[]>)
  }

  private analyzeAdFatigueForAd(
    adId: string, 
    adData: AdInsight[], 
    dateRange: string,
    analysisConfig: any
  ): AdFatigueGap {
    const latestData = adData[adData.length - 1]
    
    // 基本メトリクスの計算
    const metrics = this.calculateAdMetrics(adData)
    
    // 疲労度指標の分析
    const fatigueIndicators = this.analyzeFatigueIndicators(adData, analysisConfig)
    
    // 総合的な重要度判定
    const severity = this.calculateOverallSeverity(fatigueIndicators, analysisConfig)
    
    // 推奨アクションの生成
    const recommendations = this.generateRecommendations(fatigueIndicators, severity, dateRange)

    return {
      adId,
      adName: latestData.ad_name,
      campaignId: latestData.campaign_id,
      campaignName: latestData.campaign_name,
      severity,
      fatigueIndicators,
      recommendations,
      metrics
    }
  }

  private calculateAdMetrics(adData: AdInsight[]) {
    const latest = adData[adData.length - 1]
    
    return {
      currentCtr: parseFloat(latest.ctr || '0'),
      currentFrequency: parseFloat(latest.frequency || '0'),
      currentCpm: parseFloat(latest.cpm || '0'),
      impressions: parseInt(latest.impressions || '0'),
      clicks: parseInt(latest.clicks || '0'),
      spend: parseFloat(latest.spend || '0')
    }
  }

  private analyzeFatigueIndicators(adData: AdInsight[], analysisConfig: any) {
    return {
      creative: this.analyzeCreativeFatigue(adData, analysisConfig),
      audience: this.analyzeAudienceFatigue(adData, analysisConfig),
      platform: this.analyzePlatformFatigue(adData, analysisConfig)
    }
  }

  private analyzeCreativeFatigue(adData: AdInsight[], analysisConfig: any) {
    if (adData.length < 2) {
      return {
        trend: 'stable' as const,
        severity: 'low' as const,
        ctrChange: 0
      }
    }

    const firstCtr = parseFloat(adData[0].ctr || '0')
    const lastCtr = parseFloat(adData[adData.length - 1].ctr || '0')
    const ctrChange = firstCtr > 0 ? (lastCtr - firstCtr) / firstCtr : 0

    const trend = ctrChange < -analysisConfig.ctrThreshold ? 'declining' :
                  ctrChange > analysisConfig.ctrThreshold ? 'improving' : 'stable'

    const severity = Math.abs(ctrChange) > analysisConfig.ctrThreshold * 1.5 ? 'high' :
                    Math.abs(ctrChange) > analysisConfig.ctrThreshold ? 'medium' : 'low'

    return { trend, severity, ctrChange: ctrChange * 100 }
  }

  private analyzeAudienceFatigue(adData: AdInsight[], analysisConfig: any) {
    const latest = adData[adData.length - 1]
    const currentFrequency = parseFloat(latest.frequency || '0')

    let frequencyTrend: 'increasing' | 'stable' | 'decreasing' = 'stable'
    
    if (adData.length >= 2) {
      const firstFreq = parseFloat(adData[0].frequency || '0')
      const change = currentFrequency - firstFreq
      
      frequencyTrend = change > 0.2 ? 'increasing' :
                      change < -0.2 ? 'decreasing' : 'stable'
    }

    const severity = currentFrequency > analysisConfig.frequencyThreshold * 1.3 ? 'high' :
                    currentFrequency > analysisConfig.frequencyThreshold ? 'medium' : 'low'

    return { 
      frequencyTrend, 
      severity, 
      currentFrequency 
    }
  }

  private analyzePlatformFatigue(adData: AdInsight[], analysisConfig: any) {
    if (adData.length < 2) {
      return {
        cpmTrend: 'stable' as const,
        severity: 'low' as const,
        cpmChange: 0
      }
    }

    const firstCpm = parseFloat(adData[0].cpm || '0')
    const lastCpm = parseFloat(adData[adData.length - 1].cpm || '0')
    const cpmChange = firstCpm > 0 ? (lastCpm - firstCpm) / firstCpm : 0

    const cpmTrend = cpmChange > analysisConfig.cpmThreshold ? 'increasing' :
                    cpmChange < -analysisConfig.cpmThreshold ? 'decreasing' : 'stable'

    const severity = Math.abs(cpmChange) > analysisConfig.cpmThreshold * 1.5 ? 'high' :
                    Math.abs(cpmChange) > analysisConfig.cpmThreshold ? 'medium' : 'low'

    return { cpmTrend, severity, cpmChange: cpmChange * 100 }
  }

  private calculateOverallSeverity(fatigueIndicators: any, analysisConfig: any): 'low' | 'medium' | 'high' {
    const severityScores = {
      low: 1,
      medium: 2, 
      high: 3
    }

    const totalScore = severityScores[fatigueIndicators.creative.severity] +
                      severityScores[fatigueIndicators.audience.severity] +
                      severityScores[fatigueIndicators.platform.severity]

    // 短期データでは厳しく判定
    const threshold = analysisConfig.strictThresholds ? 
      { low: 3, medium: 5, high: 7 } : 
      { low: 4, medium: 6, high: 8 }

    if (totalScore >= threshold.high) return 'high'
    if (totalScore >= threshold.medium) return 'medium'
    return 'low'
  }

  private generateRecommendations(
    fatigueIndicators: any, 
    severity: 'low' | 'medium' | 'high',
    dateRange: string
  ): string[] {
    const recommendations: string[] = []
    const isShortTerm = this.isShortTermRange(dateRange, 0)

    if (severity === 'high') {
      if (isShortTerm) {
        recommendations.push('immediate')
        recommendations.push('広告を一時停止して新しいクリエイティブに差し替え')
      } else {
        recommendations.push('gradual')
        recommendations.push('段階的な予算調整と新クリエイティブテスト')
      }
    }

    if (fatigueIndicators.creative.severity === 'high') {
      recommendations.push('クリエイティブの刷新が必要')
    }

    if (fatigueIndicators.audience.severity === 'high') {
      recommendations.push('ターゲティング設定の見直し')
    }

    if (fatigueIndicators.platform.severity === 'high') {
      recommendations.push('入札戦略の最適化')
    }

    if (recommendations.length === 0) {
      recommendations.push('継続監視')
    }

    return recommendations
  }

  private performTimeSeriesAnalysis(data: AdInsight[], dateRange: string) {
    // 簡素化された時系列分析
    const dataPointsCount = data.length
    const hasSeasonality = this.detectSeasonality(data)
    const trendStrength = this.calculateTrendStrength(data)

    return {
      enabled: true,
      dateRange,
      dataPointsCount,
      trendStrength,
      seasonalityDetected: hasSeasonality,
      seasonalPattern: hasSeasonality ? this.extractSeasonalPattern(data) : null
    }
  }

  private detectSeasonality(data: AdInsight[]): boolean {
    // 30日以上のデータでパターン検出を試行
    return data.length >= 30
  }

  private calculateTrendStrength(data: AdInsight[]): number {
    if (data.length < 2) return 0
    
    // CTRの変化率を基にトレンド強度を計算
    const ctrs = data.map(d => parseFloat(d.ctr || '0'))
    const firstHalf = ctrs.slice(0, Math.floor(ctrs.length / 2))
    const secondHalf = ctrs.slice(Math.floor(ctrs.length / 2))
    
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length
    
    return Math.abs((secondAvg - firstAvg) / firstAvg)
  }

  private extractSeasonalPattern(_data: AdInsight[]): any {
    // プレースホルダー実装
    return {
      pattern: 'weekly',
      strength: 0.3
    }
  }

  private calculateSummary(gaps: AdFatigueGap[]) {
    return {
      criticalAdsCount: gaps.filter(g => g.severity === 'high').length,
      warningAdsCount: gaps.filter(g => g.severity === 'medium').length,
      healthyAdsCount: gaps.filter(g => g.severity === 'low').length
    }
  }

  private getSeverityWeight(severity: 'low' | 'medium' | 'high'): number {
    const weights = { low: 1, medium: 2, high: 3 }
    return weights[severity]
  }
}