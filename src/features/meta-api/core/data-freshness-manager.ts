/**
 * TASK-201: データ鮮度管理システム
 * Data Freshness Management System
 * 
 * データの鮮度状態を管理し、更新優先度を決定する
 */

import * as React from 'react'
import type { AdInsight } from '../types'
import { GapDetectionEngine, DateRangeGapDetectionEngine } from './gap-detection-engine'
import type { 
  DailyDeliveryStatus,
  GapDetectionResult,
  DeliveryGap,
  DateRangeGapAnalysisResult,
  AdFatigueGap
} from '../types/gap-detection-types'
import type { TimelineData } from '../types/timeline-interfaces'

// ============================================================================
// 型定義
// ============================================================================

export type FreshnessStatus = 'realtime' | 'neartime' | 'stabilizing' | 'finalized'
export type UpdatePriority = 'critical' | 'high' | 'medium' | 'low' | 'none'

export interface FreshnessState {
  accountId: string
  dateRange: string
  status: FreshnessStatus
  lastUpdated: Date
  nextUpdateAt: Date
  updatePriority: UpdatePriority
  confidence: number // 0-100
  completeness: number // 0-100
  staleness: number // 0-100 (0=fresh, 100=stale)
  gapAnalysis?: GapDetectionResult | DateRangeGapAnalysisResult
}

export interface FreshnessTransition {
  from: FreshnessStatus
  to: FreshnessStatus
  timestamp: Date
  reason: string
  metadata?: Record<string, any>
}

export interface FreshnessConfig {
  // タイムアウト設定（分）
  timeouts: {
    realtime: number      // realtimeの持続時間
    neartime: number      // neartimeの持続時間
    stabilizing: number   // stabilizingの持続時間
  }
  
  // 閾値設定
  thresholds: {
    stalenessWarning: number   // 古さ警告閾値 (0-100)
    stalenessCritical: number  // 古さ危険閾値 (0-100)
    completenessMin: number    // 最小完全性 (0-100)
    confidenceMin: number      // 最小信頼度 (0-100)
  }
  
  // 更新設定
  updateSettings: {
    autoTransition: boolean    // 自動状態遷移
    forceUpdateOnGaps: boolean // ギャップ検出時の強制更新
    priorityBoost: boolean     // 優先度自動ブースト
  }
}

// ============================================================================
// データ鮮度マネージャークラス
// ============================================================================

export class DataFreshnessManager {
  private config: FreshnessConfig
  private gapDetectionEngine: GapDetectionEngine
  private dateRangeGapEngine: DateRangeGapDetectionEngine
  private transitions: Map<string, FreshnessTransition[]>
  
  constructor(config?: Partial<FreshnessConfig>) {
    this.config = this.mergeWithDefaults(config)
    this.gapDetectionEngine = new GapDetectionEngine(this.createGapDetectionConfig())
    this.dateRangeGapEngine = new DateRangeGapDetectionEngine(this.createDateRangeGapConfig())
    this.transitions = new Map()
  }
  
  /**
   * データの鮮度状態を評価
   */
  evaluateFreshness(
    data: AdInsight[],
    metadata: {
      accountId: string
      dateRange: string
      lastFetched?: Date
      lastModified?: Date
      fetchCount?: number
    }
  ): FreshnessState {
    const now = new Date()
    const lastUpdated = metadata.lastFetched || metadata.lastModified || now
    
    // 経過時間の計算（分）
    const minutesSinceUpdate = (now.getTime() - lastUpdated.getTime()) / (1000 * 60)
    
    // 現在の状態を判定
    const status = this.determineStatus(minutesSinceUpdate)
    
    // ギャップ分析の実行
    const gapAnalysis = this.analyzeGaps(data, metadata.dateRange)
    
    // 各種スコアの計算
    const staleness = this.calculateStaleness(minutesSinceUpdate, status)
    const completeness = this.calculateCompleteness(data, gapAnalysis)
    const confidence = this.calculateConfidence(data, staleness, completeness)
    
    // 更新優先度の決定
    const updatePriority = this.determineUpdatePriority(
      status,
      staleness,
      completeness,
      gapAnalysis
    )
    
    // 次回更新時刻の計算
    const nextUpdateAt = this.calculateNextUpdateTime(
      lastUpdated,
      status,
      updatePriority
    )
    
    const state: FreshnessState = {
      accountId: metadata.accountId,
      dateRange: metadata.dateRange,
      status,
      lastUpdated,
      nextUpdateAt,
      updatePriority,
      confidence,
      completeness,
      staleness,
      gapAnalysis
    }
    
    // 状態遷移の記録
    this.recordTransition(metadata.accountId, metadata.dateRange, state)
    
    return state
  }
  
  /**
   * 状態遷移の記録
   */
  private recordTransition(
    accountId: string,
    dateRange: string,
    newState: FreshnessState
  ): void {
    const key = `${accountId}_${dateRange}`
    const transitions = this.transitions.get(key) || []
    
    if (transitions.length > 0) {
      const lastTransition = transitions[transitions.length - 1]
      if (lastTransition.to !== newState.status) {
        transitions.push({
          from: lastTransition.to,
          to: newState.status,
          timestamp: new Date(),
          reason: this.getTransitionReason(lastTransition.to, newState.status),
          metadata: {
            staleness: newState.staleness,
            completeness: newState.completeness,
            confidence: newState.confidence
          }
        })
      }
    } else {
      transitions.push({
        from: 'realtime',
        to: newState.status,
        timestamp: new Date(),
        reason: 'Initial state',
        metadata: {
          staleness: newState.staleness,
          completeness: newState.completeness,
          confidence: newState.confidence
        }
      })
    }
    
    // 最新10件のみ保持
    if (transitions.length > 10) {
      transitions.shift()
    }
    
    this.transitions.set(key, transitions)
  }
  
  /**
   * 状態遷移の理由を取得
   */
  private getTransitionReason(from: FreshnessStatus, to: FreshnessStatus): string {
    const transitions: Record<string, string> = {
      'realtime_neartime': 'リアルタイムウィンドウ終了',
      'neartime_stabilizing': 'データ安定化フェーズ開始',
      'stabilizing_finalized': 'データ確定',
      'finalized_realtime': '新規データ取得',
      'neartime_realtime': '手動リフレッシュ',
      'stabilizing_realtime': '強制更新',
      'finalized_neartime': '部分更新'
    }
    
    return transitions[`${from}_${to}`] || '状態遷移'
  }
  
  /**
   * 現在の状態を判定
   */
  private determineStatus(minutesSinceUpdate: number): FreshnessStatus {
    const { timeouts } = this.config
    
    if (minutesSinceUpdate <= timeouts.realtime) {
      return 'realtime'
    } else if (minutesSinceUpdate <= timeouts.realtime + timeouts.neartime) {
      return 'neartime'
    } else if (minutesSinceUpdate <= timeouts.realtime + timeouts.neartime + timeouts.stabilizing) {
      return 'stabilizing'
    } else {
      return 'finalized'
    }
  }
  
  /**
   * ギャップ分析の実行
   */
  private analyzeGaps(data: AdInsight[], dateRange: string): GapDetectionResult | DateRangeGapAnalysisResult {
    // DateRangeGapDetectionEngineを使用
    try {
      return this.dateRangeGapEngine.analyzeGaps(data, dateRange)
    } catch (error) {
      console.warn('Date range gap analysis failed, falling back to standard analysis:', error)
      
      // フォールバック：標準のギャップ検出
      const timelineData = this.createTimelineData(data)
      return this.gapDetectionEngine.detectGaps(timelineData)
    }
  }
  
  /**
   * TimelineDataの作成（フォールバック用）
   */
  private createTimelineData(data: AdInsight[]): TimelineData {
    const dailyStatuses: DailyDeliveryStatus[] = data.map(insight => ({
      date: new Date(insight.date_start || new Date()),
      hasDelivery: parseInt(insight.impressions || '0') > 0,
      metrics: {
        impressions: parseInt(insight.impressions || '0'),
        clicks: parseInt(insight.clicks || '0'),
        ctr: parseFloat(insight.ctr || '0'),
        cpm: parseFloat(insight.cpm || '0'),
        frequency: parseFloat(insight.frequency || '0'),
        spend: parseFloat(insight.spend || '0')
      }
    }))
    
    const deliveryDays = dailyStatuses.filter(d => d.hasDelivery).length
    const gapDays = dailyStatuses.filter(d => !d.hasDelivery).length
    
    return {
      totalDays: dailyStatuses.length,
      deliveryDays,
      gapDays,
      dailyStatuses
    }
  }
  
  /**
   * 古さスコアの計算
   */
  private calculateStaleness(minutesSinceUpdate: number, status: FreshnessStatus): number {
    const maxMinutes = this.config.timeouts.realtime + 
                       this.config.timeouts.neartime + 
                       this.config.timeouts.stabilizing
    
    // 状態に応じた重み付け
    const statusWeight: Record<FreshnessStatus, number> = {
      'realtime': 0,
      'neartime': 0.2,
      'stabilizing': 0.5,
      'finalized': 0.8
    }
    
    const baseScore = Math.min(100, (minutesSinceUpdate / maxMinutes) * 100)
    const weightedScore = baseScore * (1 - statusWeight[status]) + statusWeight[status] * 100
    
    return Math.round(Math.min(100, weightedScore))
  }
  
  /**
   * 完全性スコアの計算
   */
  private calculateCompleteness(
    data: AdInsight[], 
    gapAnalysis: GapDetectionResult | DateRangeGapAnalysisResult
  ): number {
    if (data.length === 0) return 0
    
    // データポイントの密度
    const expectedDataPoints = this.getExpectedDataPoints(data)
    const actualDataPoints = data.length
    const dataPointScore = Math.min(100, (actualDataPoints / expectedDataPoints) * 100)
    
    // ギャップによる減点
    let gapPenalty = 0
    
    if ('gaps' in gapAnalysis && Array.isArray(gapAnalysis.gaps)) {
      // DateRangeGapAnalysisResultの場合
      const dateRangeAnalysis = gapAnalysis as DateRangeGapAnalysisResult
      gapPenalty = dateRangeAnalysis.summary.criticalAdsCount * 10 +
                   dateRangeAnalysis.summary.warningAdsCount * 5
    } else {
      // GapDetectionResultの場合
      const standardAnalysis = gapAnalysis as GapDetectionResult
      if (standardAnalysis.statistics) {
        gapPenalty = (standardAnalysis.statistics.gapRate || 0) * 0.5
      }
    }
    
    const completenessScore = Math.max(0, dataPointScore - gapPenalty)
    
    return Math.round(Math.min(100, completenessScore))
  }
  
  /**
   * 期待されるデータポイント数を計算
   */
  private getExpectedDataPoints(data: AdInsight[]): number {
    if (data.length === 0) return 1
    
    const firstDate = new Date(data[0].date_start || new Date())
    const lastDate = new Date(data[data.length - 1].date_stop || new Date())
    const daysDiff = Math.ceil((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24))
    
    // 日次データを期待
    return Math.max(1, daysDiff + 1)
  }
  
  /**
   * 信頼度スコアの計算
   */
  private calculateConfidence(
    data: AdInsight[],
    staleness: number,
    completeness: number
  ): number {
    // 基本的な信頼度計算
    const baseConfidence = 100 - staleness
    
    // 完全性による調整
    const completenessBonus = completeness * 0.3
    
    // データ量による調整
    const dataVolumeScore = Math.min(30, data.length) / 30 * 20
    
    const totalConfidence = baseConfidence * 0.5 + completenessBonus + dataVolumeScore
    
    return Math.round(Math.min(100, Math.max(0, totalConfidence)))
  }
  
  /**
   * 更新優先度の決定
   */
  private determineUpdatePriority(
    status: FreshnessStatus,
    staleness: number,
    completeness: number,
    gapAnalysis: GapDetectionResult | DateRangeGapAnalysisResult
  ): UpdatePriority {
    // 重大なギャップがある場合
    if (this.hasCriticalGaps(gapAnalysis)) {
      return 'critical'
    }
    
    // 古さが危険レベル
    if (staleness >= this.config.thresholds.stalenessCritical) {
      return 'critical'
    }
    
    // 完全性が最小値未満
    if (completeness < this.config.thresholds.completenessMin) {
      return 'high'
    }
    
    // 古さが警告レベル
    if (staleness >= this.config.thresholds.stalenessWarning) {
      return 'high'
    }
    
    // 状態による判定
    switch (status) {
      case 'realtime':
        return 'none'
      case 'neartime':
        return 'low'
      case 'stabilizing':
        return 'medium'
      case 'finalized':
        return staleness > 50 ? 'medium' : 'low'
      default:
        return 'low'
    }
  }
  
  /**
   * 重大なギャップの存在確認
   */
  private hasCriticalGaps(gapAnalysis: GapDetectionResult | DateRangeGapAnalysisResult): boolean {
    if ('gaps' in gapAnalysis && Array.isArray(gapAnalysis.gaps)) {
      // DateRangeGapAnalysisResultの場合
      const dateRangeAnalysis = gapAnalysis as DateRangeGapAnalysisResult
      return dateRangeAnalysis.summary.criticalAdsCount > 0
    } else {
      // GapDetectionResultの場合
      const standardAnalysis = gapAnalysis as GapDetectionResult
      return standardAnalysis.gaps.some(gap => gap.severity === 'critical')
    }
  }
  
  /**
   * 次回更新時刻の計算
   */
  private calculateNextUpdateTime(
    lastUpdated: Date,
    status: FreshnessStatus,
    priority: UpdatePriority
  ): Date {
    const baseIntervals: Record<FreshnessStatus, number> = {
      'realtime': 5,        // 5分
      'neartime': 15,       // 15分
      'stabilizing': 60,    // 1時間
      'finalized': 1440     // 24時間
    }
    
    const priorityMultipliers: Record<UpdatePriority, number> = {
      'critical': 0.1,
      'high': 0.25,
      'medium': 0.5,
      'low': 1,
      'none': 2
    }
    
    const intervalMinutes = baseIntervals[status] * priorityMultipliers[priority]
    
    return new Date(lastUpdated.getTime() + intervalMinutes * 60 * 1000)
  }
  
  /**
   * デフォルト設定とマージ
   */
  private mergeWithDefaults(config?: Partial<FreshnessConfig>): FreshnessConfig {
    const defaults: FreshnessConfig = {
      timeouts: {
        realtime: 5,        // 5分
        neartime: 30,       // 30分
        stabilizing: 120    // 2時間
      },
      thresholds: {
        stalenessWarning: 50,
        stalenessCritical: 80,
        completenessMin: 60,
        confidenceMin: 40
      },
      updateSettings: {
        autoTransition: true,
        forceUpdateOnGaps: true,
        priorityBoost: true
      }
    }
    
    return {
      ...defaults,
      ...config,
      timeouts: { ...defaults.timeouts, ...config?.timeouts },
      thresholds: { ...defaults.thresholds, ...config?.thresholds },
      updateSettings: { ...defaults.updateSettings, ...config?.updateSettings }
    }
  }
  
  /**
   * ギャップ検出設定の作成
   */
  private createGapDetectionConfig() {
    return {
      minGapDays: 1,
      maxAnalysisWindow: 90,
      thresholds: {
        criticalGapDays: 7,
        majorGapDays: 3,
        minorGapDays: 1,
        performanceDropThreshold: 25,
        recoveryTimeThreshold: 3
      },
      patterns: {
        weekendGapTolerance: true,
        holidayGapTolerance: true,
        scheduledMaintenanceWindows: []
      }
    }
  }
  
  /**
   * 日付範囲ギャップ検出設定の作成
   */
  private createDateRangeGapConfig() {
    return {
      dateRangeAware: true,
      timeSeriesAnalysis: {
        enabled: true,
        minDataPoints: 7,
        trendAnalysisWindow: 30 // 追加: 必須プロパティ
      },
      thresholds: {
        ctrDeclineThreshold: 0.25,
        frequencyWarningThreshold: 3.5,
        frequencyCriticalThreshold: 5.0,
        cpmIncreaseThreshold: 0.2
      },
      adFatigueWeights: {
        creative: 0.35,
        audience: 0.35,
        platform: 0.3
      }
    }
  }
  
  /**
   * 状態遷移履歴の取得
   */
  getTransitionHistory(accountId: string, dateRange: string): FreshnessTransition[] {
    const key = `${accountId}_${dateRange}`
    return this.transitions.get(key) || []
  }
  
  /**
   * 更新推奨アクションの生成
   */
  generateUpdateRecommendations(state: FreshnessState): string[] {
    const recommendations: string[] = []
    
    // 優先度に基づく推奨
    switch (state.updatePriority) {
      case 'critical':
        recommendations.push('即座にデータを更新してください')
        recommendations.push('パフォーマンスの著しい低下が検出されています')
        break
      case 'high':
        recommendations.push('30分以内にデータ更新を推奨')
        recommendations.push('データの完全性が低下しています')
        break
      case 'medium':
        recommendations.push('次回の定期更新で更新予定')
        break
      case 'low':
        recommendations.push('データは比較的新鮮です')
        break
      case 'none':
        recommendations.push('更新の必要はありません')
        break
    }
    
    // 状態に基づく追加推奨
    if (state.staleness > this.config.thresholds.stalenessWarning) {
      recommendations.push(`データの古さ: ${state.staleness}% - 更新を検討`)
    }
    
    if (state.completeness < this.config.thresholds.completenessMin) {
      recommendations.push(`データ完全性: ${state.completeness}% - データ欠損の可能性`)
    }
    
    // ギャップ分析に基づく推奨
    if (state.gapAnalysis && this.hasCriticalGaps(state.gapAnalysis)) {
      recommendations.push('重大な配信ギャップが検出されました')
    }
    
    return recommendations
  }
  
  /**
   * バッチ評価
   */
  evaluateBatch(
    dataMap: Map<string, AdInsight[]>,
    metadataMap: Map<string, { accountId: string; dateRange: string; lastFetched?: Date }>
  ): Map<string, FreshnessState> {
    const results = new Map<string, FreshnessState>()
    
    for (const [key, data] of dataMap.entries()) {
      const metadata = metadataMap.get(key)
      if (metadata) {
        const state = this.evaluateFreshness(data, metadata)
        results.set(key, state)
      }
    }
    
    return results
  }
  
  /**
   * 優先度順でソート
   */
  sortByPriority(states: FreshnessState[]): FreshnessState[] {
    const priorityOrder: Record<UpdatePriority, number> = {
      'critical': 0,
      'high': 1,
      'medium': 2,
      'low': 3,
      'none': 4
    }
    
    return states.sort((a, b) => {
      const priorityDiff = priorityOrder[a.updatePriority] - priorityOrder[b.updatePriority]
      if (priorityDiff !== 0) return priorityDiff
      
      // 同じ優先度の場合は古さでソート
      return b.staleness - a.staleness
    })
  }
}

// ============================================================================
// React Hook
// ============================================================================

export function useDataFreshness(
  accountId: string,
  dateRange: string,
  data: AdInsight[],
  options?: {
    lastFetched?: Date
    fetchCount?: number
    onStateChange?: (state: FreshnessState) => void
  }
) {
  const [manager] = React.useState(() => new DataFreshnessManager())
  const [state, setState] = React.useState<FreshnessState | null>(null)
  
  React.useEffect(() => {
    if (data.length > 0) {
      const freshState = manager.evaluateFreshness(data, {
        accountId,
        dateRange,
        lastFetched: options?.lastFetched,
        fetchCount: options?.fetchCount
      })
      
      setState(freshState)
      options?.onStateChange?.(freshState)
    }
  }, [data, accountId, dateRange, options?.lastFetched, options?.fetchCount])
  
  const recommendations = React.useMemo(() => {
    return state ? manager.generateUpdateRecommendations(state) : []
  }, [state, manager])
  
  const transitions = React.useMemo(() => {
    return manager.getTransitionHistory(accountId, dateRange)
  }, [accountId, dateRange, manager])
  
  return {
    state,
    recommendations,
    transitions,
    isStale: state ? state.staleness > 50 : false,
    needsUpdate: state ? state.updatePriority === 'critical' || state.updatePriority === 'high' : false,
    confidence: state?.confidence || 0
  }
}

// ============================================================================
// エクスポート
// ============================================================================

export default DataFreshnessManager