import { AdInsight } from '@/types'
import { vibe } from '@/utils/vibelogger'

/**
 * 疲労度計算のための戦略インターフェース
 */
export interface FatigueStrategy {
  /** 戦略の名前 */
  name: string
  /** 総合スコアにおける重み (0-1) */
  weight: number
  /** 疲労度スコアを計算 (0-100) */
  calculate(insight: AdInsight, baseline?: number): number
  /** この戦略が適用可能かどうか */
  isApplicable(insight: AdInsight): boolean
}

/**
 * Frequency（表示頻度）による疲労度計算
 * 3.5を超えると危険水準と判定
 */
export class FrequencyFatigueStrategy implements FatigueStrategy {
  name = 'frequency'
  weight = 0.4
  private threshold = 3.5

  calculate(insight: AdInsight): number {
    const frequency = Number(insight.frequency) || 0

    if (frequency <= this.threshold) {
      return 0
    }

    // 3.5を超えた分を指数関数的にスコア化
    const excess = frequency - this.threshold
    const score = Math.min(100, (excess / this.threshold) * 100 * 1.5)

    console.log(
      `📊 Frequency fatigue計算: frequency=${frequency}, threshold=${this.threshold}, excess=${excess}, score=${score}`
    )

    vibe.debug(`Frequency fatigue: ${frequency} -> ${score}`, {
      adId: insight.ad_id,
      threshold: this.threshold,
    })

    return Math.round(score)
  }

  isApplicable(insight: AdInsight): boolean {
    return insight.frequency != null && Number(insight.frequency) > 0
  }
}

/**
 * CTR（クリック率）低下による疲労度計算
 * ベースラインから25%以上低下で危険水準
 */
export class CTRDeclineFatigueStrategy implements FatigueStrategy {
  name = 'ctr_decline'
  weight = 0.3
  private declineThreshold = 0.25 // 25%低下

  calculate(insight: AdInsight, baseline?: number): number {
    const currentCTR = Number(insight.ctr) || 0

    // ベースラインがない場合は業界平均を使用
    const baselineCTR = baseline || this.getIndustryAverageCTR(insight)

    if (currentCTR >= baselineCTR * (1 - this.declineThreshold)) {
      return 0
    }

    const declineRate = (baselineCTR - currentCTR) / baselineCTR
    const score = Math.min(100, declineRate * 200) // 50%低下で100点

    vibe.debug(`CTR decline fatigue: ${currentCTR}% vs baseline ${baselineCTR}% -> ${score}`, {
      adId: insight.ad_id,
      declineRate: `${(declineRate * 100).toFixed(1)}%`,
    })

    return Math.round(score)
  }

  isApplicable(insight: AdInsight): boolean {
    return insight.ctr != null && Number(insight.ctr) >= 0
  }

  private getIndustryAverageCTR(insight: AdInsight): number {
    // Instagram Reels の平均CTRは1.23%、その他は0.7%
    const isReels =
      insight.publisher_platform?.includes('instagram') && insight.creative_type?.includes('reel')
    return isReels ? 1.23 : 0.7
  }
}

/**
 * CPM（1000インプレッション単価）上昇による疲労度計算
 * 20%以上上昇かつCTR低下で危険水準
 */
export class CPMIncreaseFatigueStrategy implements FatigueStrategy {
  name = 'cpm_increase'
  weight = 0.3
  private increaseThreshold = 0.2 // 20%上昇

  calculate(insight: AdInsight, baseline?: number): number {
    const currentCPM = Number(insight.cpm) || 0
    const currentCTR = Number(insight.ctr) || 0

    // ベースラインがない場合は0を返す（CPMは比較が必要）
    if (!baseline) {
      return 0
    }

    const increaseRate = (currentCPM - baseline) / baseline

    // CPMが20%未満の上昇なら問題なし
    if (increaseRate < this.increaseThreshold) {
      return 0
    }

    // CTRも同時に低下している場合のみスコアを加算
    const ctrBaseline = this.getIndustryAverageCTR(insight)
    const ctrDeclined = currentCTR < ctrBaseline * 0.75 // 25%以上低下

    if (!ctrDeclined) {
      return Math.min(30, increaseRate * 50) // CTR維持なら軽微なスコア
    }

    const score = Math.min(100, increaseRate * 150) // 67%上昇で100点

    vibe.debug(`CPM increase fatigue: ${currentCPM} vs baseline ${baseline} -> ${score}`, {
      adId: insight.ad_id,
      increaseRate: `${(increaseRate * 100).toFixed(1)}%`,
      ctrDeclined,
    })

    return Math.round(score)
  }

  isApplicable(insight: AdInsight): boolean {
    return insight.cpm != null && Number(insight.cpm) > 0
  }

  private getIndustryAverageCTR(insight: AdInsight): number {
    const isReels =
      insight.publisher_platform?.includes('instagram') && insight.creative_type?.includes('reel')
    return isReels ? 1.23 : 0.7
  }
}

/**
 * First Time Impression Ratio（初回インプレッション比率）の擬似計算
 * Meta APIでは直接取得できないため、Frequency と Reach から推定
 */
export class FirstTimeImpressionRatioStrategy implements FatigueStrategy {
  name = 'first_time_impression_ratio'
  weight = 0.2

  calculate(insight: AdInsight): number {
    const impressions = Number(insight.impressions) || 0
    const reach = Number(insight.reach) || 0
    const frequency = Number(insight.frequency) || 1

    if (impressions === 0 || reach === 0) {
      return 0
    }

    // 初回インプレッション比率を推定
    // frequency が低いほど初回インプレッションの比率が高い
    // frequency = impressions / reach なので、
    // 初回インプレッション推定比率 = reach / impressions = 1 / frequency
    const estimatedFirstTimeRatio = 1 / frequency

    // 理想的な初回インプレッション比率を 0.5（50%）とする
    // これより低いと疲労度が高い
    const idealRatio = 0.5

    let score = 0
    if (estimatedFirstTimeRatio < idealRatio) {
      // 初回インプレッション比率が低い = 同じユーザーに何度も表示されている
      const deficit = idealRatio - estimatedFirstTimeRatio
      score = Math.min(100, (deficit / idealRatio) * 100)
    }

    vibe.debug(
      `First Time Impression Ratio fatigue: ${estimatedFirstTimeRatio.toFixed(2)} -> ${score}`,
      {
        adId: insight.ad_id,
        impressions,
        reach,
        frequency,
      }
    )

    return Math.round(score)
  }

  isApplicable(insight: AdInsight): boolean {
    return (
      insight.impressions != null &&
      insight.reach != null &&
      Number(insight.impressions) > 0 &&
      Number(insight.reach) > 0
    )
  }
}

/**
 * 統合的な疲労度計算マネージャー
 */
export class CompositeFatigueCalculator {
  private strategies: FatigueStrategy[]

  constructor(strategies?: FatigueStrategy[]) {
    this.strategies = strategies || [
      new FrequencyFatigueStrategy(),
      new CTRDeclineFatigueStrategy(),
      new CPMIncreaseFatigueStrategy(),
      new FirstTimeImpressionRatioStrategy(),
    ]
  }

  /**
   * 総合疲労度スコアを計算
   */
  calculateOverallScore(
    insight: AdInsight,
    baselines?: {
      ctr?: number
      cpm?: number
    }
  ): number {
    let totalScore = 0
    let totalWeight = 0

    for (const strategy of this.strategies) {
      if (!strategy.isApplicable(insight)) {
        continue
      }

      const baseline =
        strategy.name === 'ctr_decline'
          ? baselines?.ctr
          : strategy.name === 'cpm_increase'
            ? baselines?.cpm
            : undefined

      const score = strategy.calculate(insight, baseline)
      totalScore += score * strategy.weight
      totalWeight += strategy.weight
    }

    // 重み付け平均を計算
    const overallScore = totalWeight > 0 ? totalScore / totalWeight : 0

    console.log(`🎯 総合疲労度計算:`, {
      adId: insight.ad_id,
      totalScore,
      totalWeight,
      overallScore: Math.round(overallScore),
      各戦略: this.strategies.map((s) => ({
        名前: s.name,
        重み: s.weight,
        適用: s.isApplicable(insight),
      })),
    })

    return Math.round(overallScore)
  }

  /**
   * 個別の疲労度スコアを取得
   */
  calculateIndividualScores(
    insight: AdInsight,
    baselines?: {
      ctr?: number
      cpm?: number
    }
  ): Record<string, number> {
    const scores: Record<string, number> = {}

    for (const strategy of this.strategies) {
      if (!strategy.isApplicable(insight)) {
        scores[strategy.name] = 0
        continue
      }

      const baseline =
        strategy.name === 'ctr_decline'
          ? baselines?.ctr
          : strategy.name === 'cpm_increase'
            ? baselines?.cpm
            : undefined

      scores[strategy.name] = strategy.calculate(insight, baseline)
    }

    return scores
  }

  /**
   * 疲労度ステータスを判定
   */
  getStatus(score: number): 'critical' | 'warning' | 'caution' | 'healthy' {
    if (score >= 70) return 'critical'
    if (score >= 50) return 'warning'
    if (score >= 30) return 'caution'
    return 'healthy'
  }
}
