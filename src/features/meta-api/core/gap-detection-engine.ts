// TASK-202: Gap Detection Engine Implementation
// 配信ギャップの自動検出と重要度判定エンジン

import type { 
  TimelineData, 
  DailyDeliveryStatus,
  GapDetectionResult,
  DeliveryGap,
  GapSeverity,
  GapType,
  GapImpact
} from '../types'

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
  private determineGapType(gap: DeliveryGap, dailyStatuses: DailyDeliveryStatus[]): GapType {
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
    const endDay = gap.endDate.getDay()
    
    // 土曜日開始 または 日曜日開始で、2日以下のギャップ
    if (gap.durationDays <= 2) {
      return startDay === 6 || startDay === 0 // 土曜日または日曜日開始
    }
    
    return false
  }

  private isScheduledMaintenance(gap: DeliveryGap): boolean {
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

  private estimateRecoveryTime(gap: DeliveryGap, dailyStatuses: DailyDeliveryStatus[]): number {
    // 回復時間の推定（簡略化実装）
    return Math.min(gap.durationDays, 7) // 最大7日と仮定
  }

  private estimateLostImpressions(gap: DeliveryGap, dailyStatuses: DailyDeliveryStatus[]): number {
    // ギャップ前の平均インプレッション × ギャップ日数
    const avgImpressions = gap.beforeGapMetrics?.impressions || 0
    return avgImpressions * gap.durationDays
  }

  private estimateLostRevenue(gap: DeliveryGap, dailyStatuses: DailyDeliveryStatus[]): number {
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