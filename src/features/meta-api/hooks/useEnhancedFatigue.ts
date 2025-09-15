/**
 * useEnhancedFatigue.ts
 * 
 * 強化された疲労度計算フック
 * FatigueCalculatorV2を使用した高度な疲労度スコアリング
 */

import { useState, useEffect, useMemo } from 'react'
import { FatigueCalculatorV2, BaselineMetrics, FatigueScoreDetail } from '../core/fatigue-calculator-v2'
import { getSafeMetrics, UnifiedAdData } from '../utils/safe-data-access'

interface UseEnhancedFatigueOptions {
  enabled?: boolean
  baselineDays?: number // ベースライン計算に使用する日数（デフォルト: 30）
  updateInterval?: number // 更新間隔（ms）
}

interface UseEnhancedFatigueResult {
  // 疲労度スコア（広告ID別）
  fatigueScores: Map<string, FatigueScoreDetail>
  
  // ベースラインメトリクス
  baseline: BaselineMetrics | null
  
  // 統計情報
  statistics: {
    totalAds: number
    criticalCount: number
    warningCount: number
    healthyCount: number
    averageScore: number
  }
  
  // トレンド情報
  trend: {
    direction: 'improving' | 'stable' | 'declining'
    changeRate: number
  }
  
  // 状態
  isCalculating: boolean
  error: Error | null
  
  // アクション
  recalculate: () => void
}

/**
 * 強化された疲労度計算フック
 */
export function useEnhancedFatigue(
  data: UnifiedAdData[],
  options: UseEnhancedFatigueOptions = {}
): UseEnhancedFatigueResult {
  const {
    enabled = true,
    baselineDays = 30,
    updateInterval = 60000 // 1分ごと
  } = options

  const [fatigueScores, setFatigueScores] = useState<Map<string, FatigueScoreDetail>>(new Map())
  const [baseline, setBaseline] = useState<BaselineMetrics | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [_lastCalculation, setLastCalculation] = useState<Date>(new Date())

  // 計算機のインスタンス（メモ化）
  const calculator = useMemo(() => new FatigueCalculatorV2(), [])

  /**
   * ベースラインを計算
   */
  const calculateBaseline = useMemo(() => {
    if (!data || data.length === 0) {
      return null
    }

    console.log('[EnhancedFatigue] ベースライン計算開始:', {
      dataCount: data.length,
      baselineDays
    })

    // 全広告のメトリクスを収集
    const allMetrics = data.map(item => getSafeMetrics(item))
    
    // ベースライン計算
    const baselineMetrics = calculator.calculateBaseline(allMetrics)
    
    console.log('[EnhancedFatigue] ベースライン計算完了:', baselineMetrics)
    
    return baselineMetrics
  }, [data, calculator, baselineDays])

  /**
   * 疲労度スコアを計算
   */
  const calculateFatigueScores = () => {
    if (!enabled || !data || data.length === 0 || !calculateBaseline) {
      console.log('[EnhancedFatigue] 計算スキップ:', { 
        enabled, 
        hasData: !!data, 
        dataLength: data?.length,
        hasBaseline: !!calculateBaseline 
      })
      return
    }

    setIsCalculating(true)
    setError(null)

    try {
      const startTime = performance.now()
      const scores = new Map<string, FatigueScoreDetail>()

      // 各広告の疲労度を計算
      for (const item of data) {
        const metrics = getSafeMetrics(item)
        const score = calculator.calculateFatigueScore(metrics, calculateBaseline)
        scores.set(item.ad_id, score)
      }

      const endTime = performance.now()
      console.log('[EnhancedFatigue] 計算完了:', {
        adsProcessed: scores.size,
        processingTime: `${(endTime - startTime).toFixed(2)}ms`
      })

      setFatigueScores(scores)
      setBaseline(calculateBaseline)
      setLastCalculation(new Date())

    } catch (err) {
      console.error('[EnhancedFatigue] 計算エラー:', err)
      setError(err as Error)
    } finally {
      setIsCalculating(false)
    }
  }

  // 初回計算とデータ更新時の再計算
  useEffect(() => {
    calculateFatigueScores()
  }, [data, enabled, calculateBaseline])

  // 定期的な再計算（オプション）
  useEffect(() => {
    if (!enabled || !updateInterval || updateInterval <= 0) return

    const interval = setInterval(() => {
      console.log('[EnhancedFatigue] 定期更新実行')
      calculateFatigueScores()
    }, updateInterval)

    return () => clearInterval(interval)
  }, [enabled, updateInterval])

  // 統計情報の計算
  const statistics = useMemo(() => {
    const scores = Array.from(fatigueScores.values())
    
    if (scores.length === 0) {
      return {
        totalAds: 0,
        criticalCount: 0,
        warningCount: 0,
        healthyCount: 0,
        averageScore: 0
      }
    }

    const criticalCount = scores.filter(s => s.status === 'critical').length
    const warningCount = scores.filter(s => s.status === 'warning').length
    const healthyCount = scores.filter(s => s.status === 'healthy').length
    
    const totalScore = scores.reduce((sum, s) => sum + s.totalScore, 0)
    const averageScore = Math.round(totalScore / scores.length)

    return {
      totalAds: scores.length,
      criticalCount,
      warningCount,
      healthyCount,
      averageScore
    }
  }, [fatigueScores])

  // トレンド分析
  const trend = useMemo(() => {
    const scores = Array.from(fatigueScores.values())
    
    if (scores.length < 2) {
      return {
        direction: 'stable' as const,
        changeRate: 0
      }
    }

    // 簡易的なトレンド計算（実際の実装では時系列データを使用）
    const avgScore = statistics.averageScore
    
    let direction: 'improving' | 'stable' | 'declining'
    if (avgScore < 30) direction = 'improving'
    else if (avgScore > 60) direction = 'declining'
    else direction = 'stable'

    return {
      direction,
      changeRate: 0 // TODO: 実際の変化率を計算
    }
  }, [fatigueScores, statistics])

  return {
    fatigueScores,
    baseline,
    statistics,
    trend,
    isCalculating,
    error,
    recalculate: calculateFatigueScores
  }
}

/**
 * データに疲労度スコアを追加するヘルパー
 */
export function enrichDataWithFatigueScores(
  data: UnifiedAdData[],
  fatigueScores: Map<string, FatigueScoreDetail>
): UnifiedAdData[] {
  return data.map(item => {
    const score = fatigueScores.get(item.ad_id)
    
    if (!score) {
      return item
    }

    return {
      ...item,
      fatigueScore: score.totalScore,
      status: score.status,
      // 追加の疲労度情報を格納
      fatigueDetails: {
        scores: score.scores,
        details: score.details,
        recommendations: score.recommendations
      }
    } as UnifiedAdData & {
      fatigueDetails?: {
        scores: FatigueScoreDetail['scores']
        details: FatigueScoreDetail['details']
        recommendations: string[]
      }
    }
  })
}