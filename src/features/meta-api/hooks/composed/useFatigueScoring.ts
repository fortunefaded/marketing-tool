/**
 * useFatigueScoring.ts
 * 疲労度計算機能のフック
 */

import { useMemo } from 'react'
import {
  UnifiedAdData,
  FatigueData,
  BaselineMetrics
} from '../../types'
import { FatigueCalculatorV2, FatigueScoreDetail } from '../../core/fatigue-calculator-v2'
import { getSafeMetrics } from '../../utils/safe-data-access'

export interface UseFatigueScoringOptions {
  enabled?: boolean
  baselineDays?: number
  updateInterval?: number
}

export interface UseFatigueScoringResult {
  scoredData: FatigueData[]
  fatigueScores: Map<string, FatigueScoreDetail>
  baseline: BaselineMetrics | null
  statistics: {
    totalAds: number
    criticalCount: number
    warningCount: number
    healthyCount: number
    averageScore: number
  }
  isCalculating: boolean
  error: Error | null
}

/**
 * 疲労度スコアリングフック
 */
export function useFatigueScoring(
  data: UnifiedAdData[],
  options: UseFatigueScoringOptions = {}
): UseFatigueScoringResult {
  const {
    enabled = true,
    baselineDays = 30
  } = options

  const calculator = useMemo(() => new FatigueCalculatorV2(), [])

  const result = useMemo(() => {
    if (!enabled || !data || data.length === 0) {
      return {
        scoredData: [],
        fatigueScores: new Map(),
        baseline: null,
        statistics: {
          totalAds: 0,
          criticalCount: 0,
          warningCount: 0,
          healthyCount: 0,
          averageScore: 0
        },
        isCalculating: false,
        error: null
      }
    }

    try {
      // ベースライン計算
      const allMetrics = data.map(item => getSafeMetrics(item))
      const baseline = calculator.calculateBaseline(allMetrics)

      // 各広告の疲労度計算
      const fatigueScores = new Map<string, FatigueScoreDetail>()
      const scoredData: FatigueData[] = []

      for (const item of data) {
        const metrics = getSafeMetrics(item)
        const scoreDetail = calculator.calculateFatigueScore(metrics, baseline)
        
        fatigueScores.set(item.ad_id, scoreDetail)
        
        // FatigueData形式に変換
        const fatigueItem: FatigueData = {
          ...item,
          score: scoreDetail.totalScore,
          status: scoreDetail.status,
          metrics,
          baseline,
          details: {
            scores: scoreDetail.scores,
            details: scoreDetail.details,
            recommendations: scoreDetail.recommendations
          }
        }
        
        scoredData.push(fatigueItem)
      }

      // 統計計算
      const scores = Array.from(fatigueScores.values())
      const criticalCount = scores.filter(s => s.status === 'critical').length
      const warningCount = scores.filter(s => s.status === 'warning').length
      const healthyCount = scores.filter(s => s.status === 'healthy').length
      const totalScore = scores.reduce((sum, s) => sum + s.totalScore, 0)
      const averageScore = scores.length > 0 ? Math.round(totalScore / scores.length) : 0

      return {
        scoredData,
        fatigueScores,
        baseline,
        statistics: {
          totalAds: scores.length,
          criticalCount,
          warningCount,
          healthyCount,
          averageScore
        },
        isCalculating: false,
        error: null
      }

    } catch (err) {
      console.error('[FatigueScoring] Error:', err)
      return {
        scoredData: [],
        fatigueScores: new Map(),
        baseline: null,
        statistics: {
          totalAds: 0,
          criticalCount: 0,
          warningCount: 0,
          healthyCount: 0,
          averageScore: 0
        },
        isCalculating: false,
        error: err as Error
      }
    }
  }, [data, enabled, calculator, baselineDays])

  return result
}