import { AdInsight, FatigueData } from '@/types'
import { CompositeFatigueCalculator } from './strategies'
import { vibe } from '@/lib/vibelogger'

/**
 * 疲労度計算を行うクラス
 * Strategy パターンを使用してより柔軟で拡張可能な実装に変更
 */
export class SimpleFatigueCalculator {
  private compositeCalculator: CompositeFatigueCalculator

  constructor() {
    this.compositeCalculator = new CompositeFatigueCalculator()
  }

  calculate(insights: AdInsight[]): FatigueData[] {
    vibe.debug('疲労度計算開始', { count: insights.length })

    // TODO: ベースライン計算の実装
    // 現在は仮の値を使用
    const baselines = this.calculateBaselines(insights)

    return insights.map((insight) => {
      const score = this.compositeCalculator.calculateOverallScore(insight, baselines)
      const individualScores = this.compositeCalculator.calculateIndividualScores(
        insight,
        baselines
      )
      const status = this.compositeCalculator.getStatus(score)

      // デバッグ用ログ追加
      console.log(`🎯 疲労度計算結果 [${insight.ad_name}]:`, {
        adId: insight.ad_id,
        総合スコア: score,
        個別スコア: individualScores,
        ステータス: status,
        frequency: insight.frequency,
        ctr: insight.ctr,
        cpm: insight.cpm,
      })

      return {
        adId: insight.ad_id,
        adName: insight.ad_name || 'Unnamed',
        // 広告セット情報を追加
        adset_id: insight.adset_id,
        adset_name: insight.adset_name,
        campaign_id: insight.campaign_id,
        campaign_name: insight.campaign_name,
        score,
        status,
        metrics: {
          frequency: Number(insight.frequency) || 0,
          ctr: Number(insight.ctr) || 0,
          cpm: Number(insight.cpm) || 0,
          // 新しく追加されたメトリクス
          impressions: Number(insight.impressions) || 0,
          clicks: Number(insight.clicks) || 0,
          spend: Number(insight.spend) || 0,
          unique_ctr: Number(insight.unique_ctr) || 0,
          unique_inline_link_click_ctr: Number(insight.unique_inline_link_click_ctr) || 0,
          cpc: Number(insight.cpc) || 0,
          conversions: Number(insight.conversions) || 0,
          // Instagram メトリクス
          instagram_metrics: insight.instagram_metrics || null,
          // 個別スコア（デバッグ用）
          individual_scores: individualScores,
        },
      }
    })
  }

  /**
   * ベースラインを計算（現在は仮実装）
   * TODO: 過去データから動的に計算する
   */
  private calculateBaselines(insights: AdInsight[]): { ctr: number; cpm: number } {
    // 全広告の平均値を仮のベースラインとする
    const validInsights = insights.filter((i) => Number(i.ctr) > 0 && Number(i.cpm) > 0)

    if (validInsights.length === 0) {
      return { ctr: 0.7, cpm: 30 } // 業界平均のデフォルト値
    }

    const avgCTR = validInsights.reduce((sum, i) => sum + Number(i.ctr), 0) / validInsights.length
    const avgCPM = validInsights.reduce((sum, i) => sum + Number(i.cpm), 0) / validInsights.length

    return {
      ctr: avgCTR,
      cpm: avgCPM,
    }
  }
}
