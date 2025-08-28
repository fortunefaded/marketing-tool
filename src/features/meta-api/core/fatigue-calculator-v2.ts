/**
 * fatigue-calculator-v2.ts
 * 
 * 広告疲労度計算エンジン v2
 * 3つの指標（クリエイティブ、視聴者、アルゴリズム）を統合した総合スコアリング
 * 
 * @version 2.0.0
 * @date 2025-08-27
 */

import { SafeMetrics } from '../utils/safe-data-access'

/**
 * 疲労度計算の設定
 */
export interface FatigueConfig {
  // CTR低下の閾値
  ctrDeclineThreshold: number // デフォルト: 25%
  // Frequency（頻度）の危険水準
  frequencyDangerLevel: number // デフォルト: 3.5
  // CPM上昇の閾値
  cpmIncreaseThreshold: number // デフォルト: 20%
  // 重み付け
  weights: {
    creative: number // デフォルト: 0.4
    audience: number // デフォルト: 0.3
    algorithm: number // デフォルト: 0.3
  }
}

/**
 * ベースラインデータ
 */
export interface BaselineMetrics {
  ctr: number
  cpm: number
  frequency: number
  calculatedAt: string
  dataPoints: number
}

/**
 * 疲労度スコアの詳細
 */
export interface FatigueScoreDetail {
  // 総合スコア (0-100)
  totalScore: number
  // 状態
  status: 'healthy' | 'warning' | 'critical'
  // 個別スコア
  scores: {
    creative: number // クリエイティブ疲労
    audience: number // 視聴者疲労
    algorithm: number // アルゴリズム疲労
  }
  // 詳細情報
  details: {
    ctrDecline: number // CTR低下率
    frequencyLevel: number // 現在のFrequency
    cpmIncrease: number // CPM上昇率
  }
  // 推奨アクション
  recommendations: string[]
}

/**
 * デフォルト設定
 */
const DEFAULT_CONFIG: FatigueConfig = {
  ctrDeclineThreshold: 25, // 25%低下で警告
  frequencyDangerLevel: 3.5, // 3.5回以上で警告
  cpmIncreaseThreshold: 20, // 20%上昇で警告
  weights: {
    creative: 0.4,
    audience: 0.3,
    algorithm: 0.3
  }
}

/**
 * 広告疲労度計算クラス v2
 */
export class FatigueCalculatorV2 {
  private config: FatigueConfig

  constructor(config: Partial<FatigueConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * ベースラインを計算
   * 過去30日間のデータから基準値を算出
   */
  calculateBaseline(historicalData: SafeMetrics[]): BaselineMetrics {
    if (historicalData.length === 0) {
      return {
        ctr: 0,
        cpm: 0,
        frequency: 0,
        calculatedAt: new Date().toISOString(),
        dataPoints: 0
      }
    }

    // 外れ値を除外するため、中央値を使用
    const sortedCtr = [...historicalData].map(d => d.ctr).sort((a, b) => a - b)
    const sortedCpm = [...historicalData].map(d => d.cpm).sort((a, b) => a - b)
    const sortedFreq = [...historicalData].map(d => d.frequency).sort((a, b) => a - b)

    const medianIndex = Math.floor(historicalData.length / 2)

    return {
      ctr: sortedCtr[medianIndex] || 0,
      cpm: sortedCpm[medianIndex] || 0,
      frequency: sortedFreq[medianIndex] || 0,
      calculatedAt: new Date().toISOString(),
      dataPoints: historicalData.length
    }
  }

  /**
   * 疲労度スコアを計算
   */
  calculateFatigueScore(
    currentMetrics: SafeMetrics,
    baseline: BaselineMetrics
  ): FatigueScoreDetail {
    // 指標①: クリエイティブ疲労（CTR低下）
    const creativeFatigue = this.calculateCreativeFatigue(currentMetrics.ctr, baseline.ctr)
    
    // 指標②: 視聴者疲労（Frequency過多）
    const audienceFatigue = this.calculateAudienceFatigue(currentMetrics.frequency)
    
    // 指標③: アルゴリズム疲労（CPM上昇）
    const algorithmFatigue = this.calculateAlgorithmFatigue(currentMetrics.cpm, baseline.cpm)

    // 総合スコア計算（加重平均）
    const totalScore = Math.round(
      creativeFatigue * this.config.weights.creative +
      audienceFatigue * this.config.weights.audience +
      algorithmFatigue * this.config.weights.algorithm
    )

    // 状態判定
    const status = this.determineStatus(totalScore)

    // 詳細情報
    const ctrDecline = baseline.ctr > 0 
      ? ((baseline.ctr - currentMetrics.ctr) / baseline.ctr) * 100 
      : 0
    
    const cpmIncrease = baseline.cpm > 0 
      ? ((currentMetrics.cpm - baseline.cpm) / baseline.cpm) * 100 
      : 0

    // 推奨アクション
    const recommendations = this.generateRecommendations(
      { creative: creativeFatigue, audience: audienceFatigue, algorithm: algorithmFatigue },
      { ctrDecline, frequencyLevel: currentMetrics.frequency, cpmIncrease }
    )

    return {
      totalScore,
      status,
      scores: {
        creative: creativeFatigue,
        audience: audienceFatigue,
        algorithm: algorithmFatigue
      },
      details: {
        ctrDecline,
        frequencyLevel: currentMetrics.frequency,
        cpmIncrease
      },
      recommendations
    }
  }

  /**
   * クリエイティブ疲労を計算（CTR低下ベース）
   */
  private calculateCreativeFatigue(currentCtr: number, baselineCtr: number): number {
    if (baselineCtr === 0) return 0

    const declineRate = ((baselineCtr - currentCtr) / baselineCtr) * 100

    // 低下率に基づいてスコアを計算（0-100）
    if (declineRate <= 0) return 0 // CTRが改善している
    if (declineRate < 10) return Math.round(declineRate * 2) // 軽微
    if (declineRate < this.config.ctrDeclineThreshold) return Math.round(declineRate * 2.5) // 警告レベル
    if (declineRate < 50) return Math.round(60 + (declineRate - 25) * 1.6) // 危険レベル
    return Math.min(100, Math.round(80 + (declineRate - 50) * 0.4)) // クリティカル
  }

  /**
   * 視聴者疲労を計算（Frequencyベース）
   */
  private calculateAudienceFatigue(frequency: number): number {
    const dangerLevel = this.config.frequencyDangerLevel

    if (frequency <= 1) return 0 // 健全
    if (frequency <= 2) return Math.round((frequency - 1) * 20) // 良好
    if (frequency <= dangerLevel) return Math.round(20 + (frequency - 2) * 30) // 注意
    if (frequency <= 5) return Math.round(65 + (frequency - dangerLevel) * 20) // 警告
    return Math.min(100, Math.round(85 + (frequency - 5) * 5)) // クリティカル
  }

  /**
   * アルゴリズム疲労を計算（CPM上昇ベース）
   */
  private calculateAlgorithmFatigue(currentCpm: number, baselineCpm: number): number {
    if (baselineCpm === 0) return 0

    const increaseRate = ((currentCpm - baselineCpm) / baselineCpm) * 100

    // 上昇率に基づいてスコアを計算（0-100）
    if (increaseRate <= 0) return 0 // CPMが改善している
    if (increaseRate < 10) return Math.round(increaseRate * 2) // 軽微
    if (increaseRate < this.config.cpmIncreaseThreshold) return Math.round(increaseRate * 2.5) // 警告レベル
    if (increaseRate < 40) return Math.round(50 + (increaseRate - 20) * 2) // 危険レベル
    return Math.min(100, Math.round(90 + (increaseRate - 40) * 0.25)) // クリティカル
  }

  /**
   * スコアから状態を判定
   */
  private determineStatus(score: number): 'healthy' | 'warning' | 'critical' {
    if (score <= 30) return 'healthy'
    if (score <= 60) return 'warning'
    return 'critical'
  }

  /**
   * 推奨アクションを生成
   */
  private generateRecommendations(
    scores: { creative: number; audience: number; algorithm: number },
    details: { ctrDecline: number; frequencyLevel: number; cpmIncrease: number }
  ): string[] {
    const recommendations: string[] = []

    // クリエイティブ疲労への対処
    if (scores.creative > 60) {
      recommendations.push('🎨 新しいクリエイティブを制作してください')
      if (details.ctrDecline > 40) {
        recommendations.push('⚠️ CTRが大幅に低下しています。広告コンテンツの刷新が急務です')
      }
    } else if (scores.creative > 30) {
      recommendations.push('💡 クリエイティブのバリエーションを増やすことを検討してください')
    }

    // 視聴者疲労への対処
    if (scores.audience > 60) {
      recommendations.push('👥 ターゲティングを拡大して新しいオーディエンスにリーチしてください')
      if (details.frequencyLevel > 5) {
        recommendations.push('🔄 フリークエンシーキャップの設定を強化してください')
      }
    } else if (scores.audience > 30) {
      recommendations.push('📊 オーディエンスセグメントを見直すことを推奨します')
    }

    // アルゴリズム疲労への対処
    if (scores.algorithm > 60) {
      recommendations.push('⏸️ 広告を一時停止して、リフレッシュ期間を設けることを検討してください')
      if (details.cpmIncrease > 30) {
        recommendations.push('💰 CPMの上昇が顕著です。入札戦略の見直しが必要です')
      }
    } else if (scores.algorithm > 30) {
      recommendations.push('🎯 入札額の最適化を行ってください')
    }

    // 総合的な推奨
    const totalScore = (scores.creative * 0.4 + scores.audience * 0.3 + scores.algorithm * 0.3)
    if (totalScore > 70) {
      recommendations.unshift('🚨 緊急対応が必要です: この広告は深刻な疲労状態にあります')
    } else if (totalScore > 50) {
      recommendations.unshift('⚡ 早急な対応を推奨: パフォーマンス低下が顕著です')
    }

    return recommendations
  }

  /**
   * バッチ処理: 複数の広告の疲労度を一括計算
   */
  calculateBatch(
    items: Array<{ id: string; metrics: SafeMetrics }>,
    baseline: BaselineMetrics
  ): Map<string, FatigueScoreDetail> {
    const results = new Map<string, FatigueScoreDetail>()

    for (const item of items) {
      const score = this.calculateFatigueScore(item.metrics, baseline)
      results.set(item.id, score)
    }

    return results
  }

  /**
   * トレンド分析: 時系列データから疲労度の推移を分析
   */
  analyzeTrend(
    timeSeriesData: Array<{ date: string; metrics: SafeMetrics }>
  ): {
    trend: 'improving' | 'stable' | 'declining'
    changeRate: number
    projection: number // 7日後の予測スコア
  } {
    if (timeSeriesData.length < 2) {
      return { trend: 'stable', changeRate: 0, projection: 0 }
    }

    // 最初と最後のデータポイントでベースライン計算
    const earlyData = timeSeriesData.slice(0, Math.floor(timeSeriesData.length / 3))
    const recentData = timeSeriesData.slice(-Math.floor(timeSeriesData.length / 3))

    const earlyBaseline = this.calculateBaseline(earlyData.map(d => d.metrics))
    const recentBaseline = this.calculateBaseline(recentData.map(d => d.metrics))

    const earlyScore = this.calculateFatigueScore(earlyData[0].metrics, earlyBaseline)
    const recentScore = this.calculateFatigueScore(recentData[recentData.length - 1].metrics, recentBaseline)

    const changeRate = recentScore.totalScore - earlyScore.totalScore
    
    // トレンド判定
    let trend: 'improving' | 'stable' | 'declining'
    if (changeRate < -10) trend = 'improving'
    else if (changeRate > 10) trend = 'declining'
    else trend = 'stable'

    // 簡単な線形予測（7日後）
    const dailyChange = changeRate / timeSeriesData.length
    const projection = Math.max(0, Math.min(100, recentScore.totalScore + (dailyChange * 7)))

    return { trend, changeRate, projection }
  }
}