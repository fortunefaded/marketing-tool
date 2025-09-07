import { AdInsight } from '../core/types'
import { FatigueData } from './types'

export class SimpleFatigueCalculator {
  calculate(insights: AdInsight[]): FatigueData[] {
    return insights.map(insight => ({
      adId: insight.ad_id,
      adName: insight.ad_name || 'Unnamed',
      score: this.calculateScore(insight),
      status: this.getStatus(this.calculateScore(insight)),
      metrics: {
        frequency: Number(insight.frequency) || 0,
        ctr: Number(insight.ctr) || 0,
        cpm: Number(insight.cpm) || 0
      }
    }))
  }
  
  private calculateScore(insight: AdInsight): number {
    const frequency = Number(insight.frequency) || 0
    const ctr = Number(insight.ctr) || 0
    const cpm = Number(insight.cpm) || 0
    
    const frequencyScore = Math.min(100, frequency * 20)
    const ctrPenalty = ctr < 1 ? 30 : 0
    const cpmPenalty = cpm > 50 ? 20 : 0
    
    return Math.round((frequencyScore + ctrPenalty + cpmPenalty) / 3)
  }
  
  private getStatus(score: number): FatigueData['status'] {
    if (score >= 70) return 'critical'
    if (score >= 50) return 'warning'
    if (score >= 30) return 'caution'
    return 'healthy'
  }
}