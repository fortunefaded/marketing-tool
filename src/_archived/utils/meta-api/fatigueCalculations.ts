/**
 * Ad Fatigue計算ロジック
 */

import { MetaApiTypes } from '../services/core/types'

/**
 * Ad Fatigueスコアを計算（0-100）
 */
export function calculateAdFatigue(insight: MetaApiTypes.Insight): number {
  let score = 0
  
  // 1. CTRの低下（重み: 30%）
  const ctrScore = calculateCTRScore(insight.ctr)
  score += ctrScore * 0.3
  
  // 2. フリークエンシー（重み: 25%）
  const frequencyScore = calculateFrequencyScore(insight.frequency)
  score += frequencyScore * 0.25
  
  // 3. CPMの上昇（重み: 20%）
  const cpmScore = calculateCPMScore(insight.cpm)
  score += cpmScore * 0.2
  
  // 4. エンゲージメント率（重み: 15%）
  const engagementScore = calculateEngagementScore(insight)
  score += engagementScore * 0.15
  
  // 5. インプレッション数（重み: 10%）
  const impressionScore = calculateImpressionScore(insight.impressions)
  score += impressionScore * 0.1
  
  return Math.round(Math.min(100, Math.max(0, score)))
}

/**
 * CTRスコアを計算
 */
function calculateCTRScore(ctr: number): number {
  // CTRのベンチマーク（業界平均）
  const benchmark = 1.0 // 1.0%
  
  if (ctr >= benchmark) return 0
  if (ctr >= benchmark * 0.8) return 20
  if (ctr >= benchmark * 0.6) return 50
  if (ctr >= benchmark * 0.4) return 80
  return 100
}

/**
 * フリークエンシースコアを計算
 */
function calculateFrequencyScore(frequency: number): number {
  if (frequency <= 2) return 0
  if (frequency <= 3) return 20
  if (frequency <= 5) return 50
  if (frequency <= 7) return 80
  return 100
}

/**
 * CPMスコアを計算
 */
function calculateCPMScore(cpm: number): number {
  // CPMのベンチマーク（円）
  const benchmark = 1000
  
  if (cpm <= benchmark) return 0
  if (cpm <= benchmark * 1.5) return 20
  if (cpm <= benchmark * 2) return 50
  if (cpm <= benchmark * 3) return 80
  return 100
}

/**
 * エンゲージメントスコアを計算
 */
function calculateEngagementScore(insight: MetaApiTypes.Insight): number {
  // アクションがある場合は、エンゲージメント率を計算
  if (insight.actions && insight.actions.length > 0) {
    const totalActions = insight.actions.reduce((sum, action) => {
      return sum + parseFloat(action.value)
    }, 0)
    
    const engagementRate = (totalActions / insight.impressions) * 100
    
    if (engagementRate >= 2) return 0
    if (engagementRate >= 1.5) return 20
    if (engagementRate >= 1) return 50
    if (engagementRate >= 0.5) return 80
    return 100
  }
  
  // アクションデータがない場合は、CTRベースで推定
  return calculateCTRScore(insight.ctr)
}

/**
 * インプレッション数スコアを計算
 */
function calculateImpressionScore(impressions: number): number {
  // 非常に多くのインプレッションがある場合、疲労の可能性が高い
  if (impressions < 100000) return 0
  if (impressions < 500000) return 20
  if (impressions < 1000000) return 50
  if (impressions < 5000000) return 80
  return 100
}

/**
 * Fatigueトレンドを分析
 */
export interface FatigueTrend {
  direction: 'improving' | 'stable' | 'worsening'
  rate: number // 変化率（%）
  prediction: 'will_improve' | 'will_stabilize' | 'will_worsen'
}

export function analyzeFatigueTrend(
  currentScore: number,
  historicalScores: number[]
): FatigueTrend {
  if (historicalScores.length < 2) {
    return {
      direction: 'stable',
      rate: 0,
      prediction: 'will_stabilize'
    }
  }
  
  // 直近のスコアと比較
  const previousScore = historicalScores[historicalScores.length - 1]
  const rate = ((currentScore - previousScore) / previousScore) * 100
  
  let direction: FatigueTrend['direction']
  if (rate > 5) direction = 'worsening'
  else if (rate < -5) direction = 'improving'
  else direction = 'stable'
  
  // 簡単な予測（移動平均ベース）
  const avgRate = historicalScores.slice(-3).reduce((sum, score, index, array) => {
    if (index === 0) return 0
    return sum + ((score - array[index - 1]) / array[index - 1]) * 100
  }, 0) / (Math.min(historicalScores.length, 3) - 1)
  
  let prediction: FatigueTrend['prediction']
  if (avgRate > 5) prediction = 'will_worsen'
  else if (avgRate < -5) prediction = 'will_improve'
  else prediction = 'will_stabilize'
  
  return {
    direction,
    rate,
    prediction
  }
}

/**
 * 複数広告のFatigueを集計
 */
export interface FatigueSummary {
  totalAds: number
  avgFatigueScore: number
  distribution: {
    critical: number
    high: number
    medium: number
    low: number
  }
  topFatiguedAds: Array<{
    adId: string
    adName: string
    fatigueScore: number
  }>
}

export function summarizeFatigue(
  ads: Array<{ adId: string; adName: string; fatigueScore: number }>
): FatigueSummary {
  const distribution = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0
  }
  
  let totalScore = 0
  
  ads.forEach(ad => {
    totalScore += ad.fatigueScore
    
    if (ad.fatigueScore >= 80) distribution.critical++
    else if (ad.fatigueScore >= 60) distribution.high++
    else if (ad.fatigueScore >= 40) distribution.medium++
    else distribution.low++
  })
  
  return {
    totalAds: ads.length,
    avgFatigueScore: ads.length > 0 ? totalScore / ads.length : 0,
    distribution,
    topFatiguedAds: ads
      .sort((a, b) => b.fatigueScore - a.fatigueScore)
      .slice(0, 5)
  }
}