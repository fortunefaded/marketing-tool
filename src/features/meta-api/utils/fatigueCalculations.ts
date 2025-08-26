// 疲労度スコア計算のユーティリティ関数

export interface FatigueScores {
  creativeFatigue: number
  audienceFatigue: number
  algorithmFatigue: number
  overallScore: number
}

export interface FatigueCalculationData {
  ctr: number
  frequency: number
  cpm: number
}

/**
 * クリエイティブの疲労度を計算
 * CTRが低いほど疲労度が高い
 * 基準: CTR 2%を基準として、それより低いほど疲労度UP
 */
export function calculateCreativeFatigue(ctr: number): number {
  const baseline = 2.0 // CTR 2%を基準
  const fatigue = Math.max(0, (baseline - ctr) / baseline * 100)
  return Math.min(100, fatigue)
}

/**
 * 視聴者側の疲労度を計算
 * Frequencyが高いほど疲労度が高い
 * 基準: Frequency 5を上限として計算
 */
export function calculateAudienceFatigue(frequency: number): number {
  const maxFrequency = 5.0 // Frequency 5を上限
  const fatigue = Math.min(100, (frequency / maxFrequency) * 100)
  return Math.max(0, fatigue)
}

/**
 * Metaアルゴリズムによる疲労度を計算
 * CPMが高いほど疲労度が高い
 * 基準: CPM 30を基準、80で100%疲労度
 */
export function calculateAlgorithmFatigue(cpm: number): number {
  const baseline = 30 // CPM 30を基準
  const maxCpm = 80 // CPM 80で100%疲労度
  const fatigue = Math.max(0, (cpm - baseline) / (maxCpm - baseline) * 100)
  return Math.min(100, fatigue)
}

/**
 * 総合疲労度スコアを計算
 * 3つの疲労度の平均値
 */
export function calculateOverallFatigueScore(
  creativeFatigue: number,
  audienceFatigue: number,
  algorithmFatigue: number
): number {
  return Math.round((creativeFatigue + audienceFatigue + algorithmFatigue) / 3)
}

/**
 * すべての疲労度スコアを一括計算
 */
export function calculateAllFatigueScores(data: FatigueCalculationData): FatigueScores {
  const creativeFatigue = calculateCreativeFatigue(data.ctr)
  const audienceFatigue = calculateAudienceFatigue(data.frequency)
  const algorithmFatigue = calculateAlgorithmFatigue(data.cpm)
  const overallScore = calculateOverallFatigueScore(creativeFatigue, audienceFatigue, algorithmFatigue)

  return {
    creativeFatigue,
    audienceFatigue,
    algorithmFatigue,
    overallScore
  }
}

/**
 * 計算式の文字列を取得
 */
export const FATIGUE_FORMULAS = {
  creative: 'max(0, (2.0 - CTR) / 2.0 × 100)',
  audience: 'min(100, frequency / 5.0 × 100)',
  algorithm: 'max(0, (CPM - 30) / 50 × 100)'
} as const