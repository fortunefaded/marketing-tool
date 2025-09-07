// Web Worker for heavy calculations

interface CalculateMetricsMessage {
  type: 'CALCULATE_METRICS'
  data: {
    insights: any[]
    dateRange: { since: string; until: string }
  }
}

interface CalculateFatigueMessage {
  type: 'CALCULATE_FATIGUE'
  data: {
    ads: any[]
  }
}

type WorkerMessage = CalculateMetricsMessage | CalculateFatigueMessage

// メトリクス計算（CPU負荷の高い処理）
function calculateMetrics(insights: any[]) {
  const metrics = {
    byDate: new Map<string, any>(),
    byCampaign: new Map<string, any>(),
    byAdSet: new Map<string, any>(),
    totals: {
      spend: 0,
      impressions: 0,
      clicks: 0,
      reach: 0,
      conversions: 0
    }
  }

  // 日付ごとの集計
  insights.forEach(insight => {
    const date = insight.date_start || 'unknown'
    
    if (!metrics.byDate.has(date)) {
      metrics.byDate.set(date, {
        spend: 0,
        impressions: 0,
        clicks: 0,
        reach: 0,
        conversions: 0,
        ctr: 0,
        cpm: 0,
        cpc: 0
      })
    }
    
    const dateMetrics = metrics.byDate.get(date)!
    dateMetrics.spend += insight.spend || 0
    dateMetrics.impressions += insight.impressions || 0
    dateMetrics.clicks += insight.clicks || 0
    dateMetrics.reach += insight.reach || 0
    
    // アクションから変換を計算
    if (insight.actions) {
      const purchases = insight.actions.find(a => a.action_type === 'purchase')
      if (purchases) {
        dateMetrics.conversions += parseInt(purchases.value) || 0
      }
    }
    
    // 派生メトリクスの計算
    if (dateMetrics.impressions > 0) {
      dateMetrics.ctr = (dateMetrics.clicks / dateMetrics.impressions) * 100
      dateMetrics.cpm = (dateMetrics.spend / dateMetrics.impressions) * 1000
    }
    if (dateMetrics.clicks > 0) {
      dateMetrics.cpc = dateMetrics.spend / dateMetrics.clicks
    }
    
    // 総計の更新
    metrics.totals.spend += insight.spend || 0
    metrics.totals.impressions += insight.impressions || 0
    metrics.totals.clicks += insight.clicks || 0
    metrics.totals.reach += insight.reach || 0
  })

  // キャンペーンごとの集計
  insights.forEach(insight => {
    const campaignId = insight.campaign_id
    if (!campaignId) return
    
    if (!metrics.byCampaign.has(campaignId)) {
      metrics.byCampaign.set(campaignId, {
        id: campaignId,
        name: insight.campaign_name,
        spend: 0,
        impressions: 0,
        clicks: 0,
        adCount: new Set()
      })
    }
    
    const campaign = metrics.byCampaign.get(campaignId)!
    campaign.spend += insight.spend || 0
    campaign.impressions += insight.impressions || 0
    campaign.clicks += insight.clicks || 0
    campaign.adCount.add(insight.ad_id)
  })

  // Map をシリアライズ可能な形式に変換
  return {
    byDate: Array.from(metrics.byDate.entries()),
    byCampaign: Array.from(metrics.byCampaign.entries()).map(([id, data]) => ({
      ...data,
      adCount: data.adCount.size
    })),
    totals: metrics.totals
  }
}

// 疲労度スコア計算（CPU負荷の高い処理）
function calculateFatigueScores(ads: any[]) {
  return ads.map(ad => {
    // ベースライン計算
    const avgCtr = ads.reduce((sum, a) => sum + a.ctr, 0) / ads.length
    const avgFrequency = ads.reduce((sum, a) => sum + a.frequency, 0) / ads.length
    const avgCpm = ads.reduce((sum, a) => sum + a.cpm, 0) / ads.length
    
    // 各疲労度スコアの計算
    const creativeScore = Math.max(0, Math.min(100, 
      ((avgCtr - ad.ctr) / avgCtr) * 100
    ))
    
    const audienceScore = Math.max(0, Math.min(100,
      ((ad.frequency - avgFrequency) / avgFrequency) * 50
    ))
    
    const algorithmScore = Math.max(0, Math.min(100,
      ((ad.cpm - avgCpm) / avgCpm) * 50
    ))
    
    const totalScore = (creativeScore + audienceScore + algorithmScore) / 3
    
    return {
      ad_id: ad.ad_id,
      scores: {
        creative: Math.round(creativeScore),
        audience: Math.round(audienceScore),
        algorithm: Math.round(algorithmScore),
        total: Math.round(totalScore)
      },
      recommendations: generateRecommendations({
        creativeScore,
        audienceScore,
        algorithmScore
      })
    }
  })
}

// 推奨事項の生成
function generateRecommendations(scores: {
  creativeScore: number
  audienceScore: number  
  algorithmScore: number
}) {
  const recommendations: string[] = []
  
  if (scores.creativeScore > 70) {
    recommendations.push('クリエイティブを更新してください')
  }
  if (scores.audienceScore > 70) {
    recommendations.push('ターゲティングを拡大してください')
  }
  if (scores.algorithmScore > 70) {
    recommendations.push('入札戦略を見直してください')
  }
  
  return recommendations
}

// Worker メッセージハンドラー
self.addEventListener('message', (event: MessageEvent<WorkerMessage>) => {
  const { type, data } = event.data
  
  switch (type) {
    case 'CALCULATE_METRICS':
      const metrics = calculateMetrics(data.insights)
      self.postMessage({ type: 'METRICS_CALCULATED', data: metrics })
      break
      
    case 'CALCULATE_FATIGUE':
      const fatigueScores = calculateFatigueScores(data.ads)
      self.postMessage({ type: 'FATIGUE_CALCULATED', data: fatigueScores })
      break
      
    default:
      self.postMessage({ type: 'ERROR', error: 'Unknown message type' })
  }
})

export {}