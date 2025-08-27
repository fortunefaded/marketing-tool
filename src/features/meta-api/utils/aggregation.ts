import { AdInsight, FatigueData } from '@/types'
import { SimpleFatigueCalculator } from '../fatigue/calculator'

export type AggregationLevel = 'creative' | 'campaign' | 'adset'

export interface AggregatedData {
  id: string
  name: string
  level: AggregationLevel
  // 集計されたメトリクス
  metrics: {
    spend: number
    impressions: number
    clicks: number
    conversions: number
    reach: number
    frequency: number
    // 計算されるメトリクス
    cpa: number
    ctr: number
    cpc: number
    cvr: number
    cpm: number
  }
  // 集計対象の広告数
  adCount: number
  // 疲労度関連
  fatigueScore?: number
  fatigueStatus?: FatigueData['status']
  // 元のインサイトデータ（詳細分析用）
  insights: AdInsight[]
}

export function aggregateByLevel(
  insights: AdInsight[], 
  level: AggregationLevel
): AggregatedData[] {
  
  // デバッグログ: 受け取ったinsightsの最初のアイテムを確認
  console.log('🔍 aggregateByLevel 受信データ確認:', {
    level,
    count: insights.length,
    firstItem: insights[0],
    firstItemAdsetId: insights[0]?.adset_id,
    firstItemAdsetName: insights[0]?.adset_name,
    hasAdsetId: !!insights[0]?.adset_id,
    hasAdsetName: !!insights[0]?.adset_name
  })
  if (level === 'creative') {
    // クリエイティブレベルは集計不要
    const calculator = new SimpleFatigueCalculator()
    const fatigueData = calculator.calculate(insights)
    
    return insights.map((insight, index) => ({
      id: insight.ad_id,
      name: insight.ad_name || 'Unnamed Ad',
      level: 'creative' as AggregationLevel,
      metrics: {
        spend: insight.spend,
        impressions: insight.impressions,
        clicks: insight.clicks,
        conversions: insight.conversions || 0,
        reach: insight.reach,
        frequency: insight.frequency,
        cpa: (insight.conversions || 0) > 0 ? insight.spend / (insight.conversions || 1) : 0,
        ctr: insight.ctr,
        cpc: insight.cpc,
        cvr: insight.clicks > 0 ? ((insight.conversions || 0) / insight.clicks) * 100 : 0,
        cpm: insight.cpm
      },
      adCount: 1,
      fatigueScore: fatigueData[index]?.score,
      fatigueStatus: fatigueData[index]?.status,
      insights: [insight]
    }))
  }

  // キャンペーンまたは広告セット単位で集計
  const grouped = insights.reduce<Record<string, AggregatedData>>((acc, insight) => {
    let key: string
    let name: string
    
    if (level === 'campaign') {
      key = insight.campaign_id
      name = insight.campaign_name || 'Unnamed Campaign'
    } else {
      key = insight.adset_id && insight.adset_id.trim() ? insight.adset_id : 'no_adset'
      name = insight.adset_name && insight.adset_name.trim() ? insight.adset_name : '広告セットなし'
      
      // デバッグログ追加
      console.log('🏗️ 広告セット集計処理:', {
        adId: insight.ad_id,
        originalAdsetId: insight.adset_id,
        originalAdsetName: insight.adset_name,
        processedKey: key,
        processedName: name,
        hasValidAdsetId: !!(insight.adset_id && insight.adset_id.trim()),
        hasValidAdsetName: !!(insight.adset_name && insight.adset_name.trim())
      })
    }
    
    if (!acc[key]) {
      acc[key] = {
        id: key,
        name: name,
        level: level,
        metrics: {
          spend: 0,
          impressions: 0,
          clicks: 0,
          conversions: 0,
          reach: 0,
          frequency: 0,
          cpa: 0,
          ctr: 0,
          cpc: 0,
          cvr: 0,
          cpm: 0
        },
        adCount: 0,
        insights: []
      }
    }
    
    // メトリクスを累積
    acc[key].metrics.spend += insight.spend
    acc[key].metrics.impressions += insight.impressions
    acc[key].metrics.clicks += insight.clicks
    acc[key].metrics.conversions += (insight.conversions || 0)
    acc[key].metrics.reach += insight.reach
    acc[key].adCount += 1
    acc[key].insights.push(insight)
    
    return acc
  }, {})
  
  // 集計値から計算指標を算出
  return Object.values(grouped).map(group => {
    const metrics = group.metrics
    
    // 計算メトリクスを更新
    metrics.cpa = metrics.conversions > 0 
      ? metrics.spend / metrics.conversions 
      : 0
    
    metrics.ctr = metrics.impressions > 0 
      ? (metrics.clicks / metrics.impressions) * 100 
      : 0
    
    metrics.cpc = metrics.clicks > 0 
      ? metrics.spend / metrics.clicks 
      : 0
    
    metrics.cvr = metrics.clicks > 0 
      ? (metrics.conversions / metrics.clicks) * 100 
      : 0
    
    metrics.cpm = metrics.impressions > 0 
      ? (metrics.spend / metrics.impressions) * 1000 
      : 0
    
    // Frequencyは平均値として計算（総インプレッション÷総リーチ）
    metrics.frequency = metrics.reach > 0
      ? metrics.impressions / metrics.reach
      : 0
    
    // 集計レベルでの疲労度スコア計算
    const aggregatedFatigueScore = calculateAggregatedFatigueScore(group)
    
    return {
      ...group,
      fatigueScore: aggregatedFatigueScore.score,
      fatigueStatus: aggregatedFatigueScore.status
    }
  })
}

function calculateAggregatedFatigueScore(data: AggregatedData): {
  score: number
  status: FatigueData['status']
} {
  const { frequency, ctr, cpm } = data.metrics
  
  // 集計レベルでの疲労度計算（既存のロジックを適用）
  const frequencyScore = Math.min(100, frequency * 20)
  const ctrPenalty = ctr < 1 ? 30 : 0
  const cpmPenalty = cpm > 50 ? 20 : 0
  
  const score = Math.round((frequencyScore + ctrPenalty + cpmPenalty) / 3)
  
  let status: FatigueData['status']
  if (score >= 70) status = 'critical'
  else if (score >= 50) status = 'warning'
  else if (score >= 30) status = 'caution'
  else status = 'healthy'
  
  return { score, status }
}