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

/**
 * Platform breakdown（プラットフォーム分割）されたデータを広告単位に集約
 * 同じ広告IDで複数のプラットフォーム（Facebook、Instagram、Audience Network）
 * に分割されたデータを1つに統合します
 */
export function aggregatePlatformBreakdowns(insights: AdInsight[]): AdInsight[] {
  // 広告ID単位でグループ化
  const aggregated = new Map<string, AdInsight>()

  for (const insight of insights) {
    const adId = insight.ad_id

    if (!aggregated.has(adId)) {
      // 最初のレコードをベースとして使用
      aggregated.set(adId, { ...insight })
    } else {
      // 既存のレコードに値を加算
      const existing = aggregated.get(adId)!

      // 数値メトリクスを加算（文字列を確実に数値に変換）
      existing.impressions = Number(existing.impressions) + Number(insight.impressions)
      existing.reach = Math.max(Number(existing.reach), Number(insight.reach)) // Reachは最大値を採用（重複を避けるため）
      existing.clicks = Number(existing.clicks) + Number(insight.clicks)
      existing.spend = Number(existing.spend) + Number(insight.spend)
      existing.conversions = Number(existing.conversions || 0) + Number(insight.conversions || 0)

      // 計算メトリクスは再計算が必要
      // CTR = (総クリック数 / 総インプレッション数) * 100
      existing.ctr = existing.impressions > 0 ? (existing.clicks / existing.impressions) * 100 : 0

      // CPC = 総費用 / 総クリック数
      existing.cpc = existing.clicks > 0 ? existing.spend / existing.clicks : 0

      // CPM = (総費用 / 総インプレッション数) * 1000
      existing.cpm = existing.impressions > 0 ? (existing.spend / existing.impressions) * 1000 : 0

      // Frequency = 総インプレッション数 / 総リーチ
      existing.frequency = existing.reach > 0 ? existing.impressions / existing.reach : 0

      // actionsフィールドも集約（存在する場合）
      if (insight.actions && existing.actions) {
        // action_typeごとに集約
        const actionMap = new Map<string, any>()

        // 既存のアクションをマップに追加
        for (const action of existing.actions) {
          actionMap.set(action.action_type, { ...action })
        }

        // 新しいアクションを加算
        for (const action of insight.actions) {
          if (actionMap.has(action.action_type)) {
            actionMap.get(action.action_type)!.value =
              (parseFloat(actionMap.get(action.action_type)!.value) || 0) +
              (parseFloat(action.value) || 0)
          } else {
            actionMap.set(action.action_type, { ...action })
          }
        }

        existing.actions = Array.from(actionMap.values())
      }
    }
  }

  // Map から配列に変換して返す
  return Array.from(aggregated.values())
}

export function aggregateByLevel(insights: AdInsight[], level: AggregationLevel): AggregatedData[] {
  // デバッグログ: 受け取ったinsightsの最初のアイテムを確認
  console.log('🔍 aggregateByLevel 受信データ確認:', {
    level,
    count: insights.length,
    firstItem: insights[0],
    firstItemAdsetId: insights[0]?.adset_id,
    firstItemAdsetName: insights[0]?.adset_name,
    hasAdsetId: !!insights[0]?.adset_id,
    hasAdsetName: !!insights[0]?.adset_name,
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
        spend: Number(insight.spend) || 0,
        impressions: Number(insight.impressions) || 0,
        clicks: Number(insight.clicks) || 0,
        conversions: Number(insight.conversions) || 0,
        reach: Number(insight.reach) || 0,
        frequency: Number(insight.frequency) || 0,
        cpa:
          Number(insight.conversions) > 0 ? Number(insight.spend) / Number(insight.conversions) : 0,
        ctr: Number(insight.ctr) || 0,
        cpc: Number(insight.cpc) || 0,
        cvr:
          Number(insight.clicks) > 0
            ? (Number(insight.conversions || 0) / Number(insight.clicks)) * 100
            : 0,
        cpm: Number(insight.cpm) || 0,
      },
      adCount: 1,
      fatigueScore: fatigueData[index]?.score,
      fatigueStatus: fatigueData[index]?.status,
      insights: [insight],
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
        hasValidAdsetName: !!(insight.adset_name && insight.adset_name.trim()),
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
          cpm: 0,
        },
        adCount: 0,
        insights: [],
      }
    }

    // メトリクスを累積（文字列を確実に数値に変換）
    acc[key].metrics.spend += Number(insight.spend) || 0
    acc[key].metrics.impressions += Number(insight.impressions) || 0
    acc[key].metrics.clicks += Number(insight.clicks) || 0
    acc[key].metrics.conversions += Number(insight.conversions) || 0
    acc[key].metrics.reach += Number(insight.reach) || 0
    acc[key].adCount += 1
    acc[key].insights.push(insight)

    return acc
  }, {})

  // 集計値から計算指標を算出
  return Object.values(grouped).map((group) => {
    const metrics = group.metrics

    // 計算メトリクスを更新
    metrics.cpa = metrics.conversions > 0 ? metrics.spend / metrics.conversions : 0

    metrics.ctr = metrics.impressions > 0 ? (metrics.clicks / metrics.impressions) * 100 : 0

    metrics.cpc = metrics.clicks > 0 ? metrics.spend / metrics.clicks : 0

    metrics.cvr = metrics.clicks > 0 ? (metrics.conversions / metrics.clicks) * 100 : 0

    metrics.cpm = metrics.impressions > 0 ? (metrics.spend / metrics.impressions) * 1000 : 0

    // Frequencyは平均値として計算（総インプレッション÷総リーチ）
    metrics.frequency = metrics.reach > 0 ? metrics.impressions / metrics.reach : 0

    // 集計レベルでの疲労度スコア計算
    const aggregatedFatigueScore = calculateAggregatedFatigueScore(group)

    return {
      ...group,
      fatigueScore: aggregatedFatigueScore.score,
      fatigueStatus: aggregatedFatigueScore.status,
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
