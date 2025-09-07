# FatigueCalculator実装

## ファイル: src/services/fatigue/fatigueCalculator.ts

```typescript
export interface AdFatigueData {
  adId: string
  adName: string
  campaignId: string
  campaignName: string
  fatigueScore: {
    total: number
    breakdown: {
      audience: number
      creative: number
      algorithm: number
    }
    status: 'healthy' | 'caution' | 'warning' | 'critical'
    primaryIssue: 'audience' | 'creative' | 'algorithm'
  }
  metrics: {
    frequency: number
    reach: number
    impressions: number
    ctr: number
    cpm: number
    spend?: number
    firstTimeRatio: number
    ctrDeclineRate: number
    cpmIncreaseRate: number
  }
  recommendedAction: string
  analyzedAt: string
}

export class FatigueCalculator {
  private readonly thresholds = {
    critical: 70,
    warning: 50,
    caution: 30
  }

  private readonly weights = {
    audience: 20,
    creative: 200,
    algorithm: 150
  }

  calculate(insights: any[]): AdFatigueData[] {
    if (!insights || insights.length === 0) {
      return []
    }

    const adGroups = this.groupByAd(insights)
    
    return Array.from(adGroups.entries())
      .map(([adId, adInsights]) => this.calculateAdFatigue(adId, adInsights))
      .filter(data => data !== null) as AdFatigueData[]
  }

  private groupByAd(insights: any[]): Map<string, any[]> {
    const groups = new Map<string, any[]>()
    
    insights.forEach(insight => {
      const adId = insight.ad_id || 'unknown'
      if (!groups.has(adId)) {
        groups.set(adId, [])
      }
      groups.get(adId)!.push(insight)
    })
    
    return groups
  }

  private calculateAdFatigue(adId: string, insights: any[]): AdFatigueData | null {
    if (insights.length === 0) return null

    const latest = insights[insights.length - 1]
    const oldest = insights[0]

    const metrics = this.extractMetrics(latest, oldest)
    const scores = this.calculateScores(metrics)
    const status = this.determineStatus(scores.total)
    const primaryIssue = this.identifyPrimaryIssue(scores)
    const recommendedAction = this.generateRecommendation(status, primaryIssue)

    return {
      adId,
      adName: latest.ad_name || `広告 ${adId}`,
      campaignId: latest.campaign_id || 'unknown',
      campaignName: latest.campaign_name || 'キャンペーン名なし',
      fatigueScore: {
        total: Math.round(scores.total),
        breakdown: {
          audience: Math.round(scores.audience),
          creative: Math.round(scores.creative),
          algorithm: Math.round(scores.algorithm)
        },
        status,
        primaryIssue
      },
      metrics,
      recommendedAction,
      analyzedAt: new Date().toISOString()
    }
  }

  private extractMetrics(latest: any, oldest: any) {
    const frequency = parseFloat(latest.frequency) || 0
    const ctr = parseFloat(latest.ctr) || 0
    const cpm = parseFloat(latest.cpm) || 0
    const reach = parseInt(latest.reach) || 0
    const impressions = parseInt(latest.impressions) || 0
    const spend = parseFloat(latest.spend) || 0

    const oldestCtr = parseFloat(oldest.ctr) || ctr
    const oldestCpm = parseFloat(oldest.cpm) || cpm
    
    const ctrDeclineRate = oldestCtr > 0 
      ? Math.max(0, (oldestCtr - ctr) / oldestCtr) 
      : 0
      
    const cpmIncreaseRate = oldestCpm > 0 
      ? Math.max(0, (cpm - oldestCpm) / oldestCpm) 
      : 0

    return {
      frequency,
      reach,
      impressions,
      ctr,
      cpm,
      spend,
      firstTimeRatio: reach > 0 ? reach / impressions : 0,
      ctrDeclineRate,
      cpmIncreaseRate
    }
  }

  private calculateScores(metrics: any) {
    const audience = Math.min(100, metrics.frequency * this.weights.audience)
    const creative = Math.min(100, metrics.ctrDeclineRate * this.weights.creative)
    const algorithm = Math.min(100, metrics.cpmIncreaseRate * this.weights.algorithm)
    
    return {
      audience,
      creative,
      algorithm,
      total: (audience + creative + algorithm) / 3
    }
  }

  private determineStatus(totalScore: number): 'healthy' | 'caution' | 'warning' | 'critical' {
    if (totalScore >= this.thresholds.critical) return 'critical'
    if (totalScore >= this.thresholds.warning) return 'warning'
    if (totalScore >= this.thresholds.caution) return 'caution'
    return 'healthy'
  }

  private identifyPrimaryIssue(scores: any): 'audience' | 'creative' | 'algorithm' {
    const { audience, creative, algorithm } = scores
    
    if (creative > audience && creative > algorithm) {
      return 'creative'
    }
    if (algorithm > audience && algorithm > creative) {
      return 'algorithm'
    }
    return 'audience'
  }

  private generateRecommendation(
    status: string, 
    primaryIssue: string
  ): string {
    if (status === 'healthy') {
      return '継続的な監視を推奨します'
    }

    const recommendations = {
      critical: {
        audience: 'オーディエンスの拡大または広告の一時停止を検討してください',
        creative: '新しいクリエイティブの追加またはA/Bテストを実施してください',
        algorithm: '入札戦略の見直しまたはターゲティングの最適化を検討してください'
      },
      warning: {
        audience: 'オーディエンスセグメントの見直しを推奨します',
        creative: 'クリエイティブのリフレッシュを検討してください',
        algorithm: '予算配分の最適化を検討してください'
      },
      caution: {
        audience: 'フリークエンシーキャップの設定を検討してください',
        creative: 'クリエイティブのバリエーション追加を検討してください',
        algorithm: '配信時間帯の最適化を検討してください'
      }
    }

    return recommendations[status]?.[primaryIssue] || '継続的な監視を推奨します'
  }
}
```

## 移行方法
useAdFatigueMonitoredのcalculateFatigue関数をこのクラスに置き換える
