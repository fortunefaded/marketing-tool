# src/features/meta-api/fatigue/calculator.ts

```typescript
import { AdInsight, FatigueData } from '../core/types'

export class SimpleFatigueCalculator {
  private thresholds = {
    critical: 70,
    warning: 50,
    caution: 30
  }
  
  calculate(insights: AdInsight[]): FatigueData[] {
    return insights.map(insight => {
      const score = this.calculateScore(insight)
      const status = this.getStatus(score)
      
      return {
        adId: insight.ad_id,
        adName: insight.ad_name || `Ad ${insight.ad_id}`,
        score,
        status,
        metrics: {
          frequency: insight.frequency || 0,
          ctr: insight.ctr || 0,
          cpm: insight.cpm || 0,
          impressions: insight.impressions || 0
        }
      }
    })
  }
  
  private calculateScore(insight: AdInsight): number {
    const frequency = insight.frequency || 0
    const ctr = insight.ctr || 0
    const cpm = insight.cpm || 0
    
    // Simple scoring: higher frequency = higher fatigue
    const frequencyScore = Math.min(100, frequency * 20)
    
    // CTR below 1% adds to fatigue
    const ctrPenalty = ctr < 1 ? 30 : 0
    
    // High CPM indicates fatigue
    const cpmPenalty = cpm > 50 ? 20 : 0
    
    return Math.round((frequencyScore + ctrPenalty + cpmPenalty) / 3)
  }
  
  private getStatus(score: number): FatigueData['status'] {
    if (score >= this.thresholds.critical) return 'critical'
    if (score >= this.thresholds.warning) return 'warning'
    if (score >= this.thresholds.caution) return 'caution'
    return 'healthy'
  }
}
```
