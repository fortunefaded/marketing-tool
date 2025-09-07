/**
 * aggregate-time-series.ts
 * 時系列データの合算処理ユーティリティ
 * 同一クリエイティブ名の日別データを合算して、統合された数値を提供
 */

import type { AdInsight } from '../types'

export interface AggregatedInsight extends AdInsight {
  // 合算された期間情報
  aggregation_period?: {
    start_date: string
    end_date: string
    days_count: number
  }
  // 日別の詳細データ（必要に応じて保持）
  daily_breakdown?: AdInsight[]
}

/**
 * 時系列データを広告名ベースで合算
 * @param timeSeriesData - time_increment=1で取得した日別データ
 * @returns 広告名ごとに合算されたデータ
 */
export function aggregateTimeSeriesData(
  timeSeriesData: AdInsight[]
): AggregatedInsight[] {
  // 広告名でグループ化
  const groupedByAdName = new Map<string, AdInsight[]>()
  
  for (const insight of timeSeriesData) {
    const adName = insight.ad_name || 'Unknown Ad'
    if (!groupedByAdName.has(adName)) {
      groupedByAdName.set(adName, [])
    }
    groupedByAdName.get(adName)!.push(insight)
  }
  
  // 各グループを合算
  const aggregatedResults: AggregatedInsight[] = []
  
  for (const [adName, dailyInsights] of groupedByAdName) {
    // 日付でソート
    const sortedInsights = dailyInsights.sort((a, b) => {
      const dateA = a.date_start || ''
      const dateB = b.date_start || ''
      return dateA.localeCompare(dateB)
    })
    
    // 数値フィールドの合算
    const aggregated: AggregatedInsight = {
      // 基本情報（最初のレコードから取得）
      ad_id: sortedInsights[0].ad_id,
      ad_name: adName,
      campaign_id: sortedInsights[0].campaign_id,
      campaign_name: sortedInsights[0].campaign_name,
      adset_id: sortedInsights[0].adset_id,
      adset_name: sortedInsights[0].adset_name,
      account_id: sortedInsights[0].account_id,
      
      // 期間情報
      date_start: sortedInsights[0].date_start,
      date_stop: sortedInsights[sortedInsights.length - 1].date_stop || sortedInsights[sortedInsights.length - 1].date_start,
      
      // 数値フィールドの合算
      impressions: sumField(sortedInsights, 'impressions'),
      clicks: sumField(sortedInsights, 'clicks'),
      spend: sumField(sortedInsights, 'spend'),
      reach: sumField(sortedInsights, 'reach'),
      conversions: sumField(sortedInsights, 'conversions'),
      
      // 平均値の計算
      frequency: avgField(sortedInsights, 'frequency'),
      ctr: calculateWeightedCTR(sortedInsights),
      cpm: calculateWeightedCPM(sortedInsights),
      cpc: calculateWeightedCPC(sortedInsights),
      
      // アクション関連（合算）
      actions: mergeActions(sortedInsights),
      cost_per_action_type: calculateAverageCostPerAction(sortedInsights),
      
      // その他のフィールド
      unique_clicks: sumField(sortedInsights, 'unique_clicks'),
      unique_ctr: avgField(sortedInsights, 'unique_ctr'),
      
      // 合算期間情報
      aggregation_period: {
        start_date: sortedInsights[0].date_start || '',
        end_date: sortedInsights[sortedInsights.length - 1].date_stop || sortedInsights[sortedInsights.length - 1].date_start || '',
        days_count: sortedInsights.length
      },
      
      // 必要に応じて日別データも保持
      daily_breakdown: sortedInsights
    }
    
    aggregatedResults.push(aggregated)
  }
  
  return aggregatedResults
}

/**
 * 数値フィールドの合計を計算
 */
function sumField(insights: AdInsight[], field: keyof AdInsight): string {
  const sum = insights.reduce((total, insight) => {
    const value = parseFloat(String(insight[field] || 0))
    return total + (isNaN(value) ? 0 : value)
  }, 0)
  // 数値として計算後、最後に文字列化（文字列連結を防ぐ）
  return sum.toString()
}

/**
 * 数値フィールドの平均を計算
 */
function avgField(insights: AdInsight[], field: keyof AdInsight): string {
  const validValues = insights
    .map(insight => parseFloat(String(insight[field] || 0)))
    .filter(value => !isNaN(value))
  
  if (validValues.length === 0) return '0'
  
  const avg = validValues.reduce((sum, val) => sum + val, 0) / validValues.length
  // 数値として計算後、最後に文字列化
  return avg.toString()
}

/**
 * インプレッションで重み付けされたCTRを計算
 */
function calculateWeightedCTR(insights: AdInsight[]): string {
  const totalImpressions = insights.reduce((sum, i) => sum + parseFloat(i.impressions || '0'), 0)
  const totalClicks = insights.reduce((sum, i) => sum + parseFloat(i.clicks || '0'), 0)
  
  if (totalImpressions === 0) return '0'
  const ctr = (totalClicks / totalImpressions) * 100
  return ctr.toString()
}

/**
 * インプレッションで重み付けされたCPMを計算
 */
function calculateWeightedCPM(insights: AdInsight[]): string {
  const totalImpressions = insights.reduce((sum, i) => sum + parseFloat(i.impressions || '0'), 0)
  const totalSpend = insights.reduce((sum, i) => sum + parseFloat(i.spend || '0'), 0)
  
  if (totalImpressions === 0) return '0'
  const cpm = (totalSpend / totalImpressions) * 1000
  return cpm.toString()
}

/**
 * クリックで重み付けされたCPCを計算
 */
function calculateWeightedCPC(insights: AdInsight[]): string {
  const totalClicks = insights.reduce((sum, i) => sum + parseFloat(i.clicks || '0'), 0)
  const totalSpend = insights.reduce((sum, i) => sum + parseFloat(i.spend || '0'), 0)
  
  if (totalClicks === 0) return '0'
  const cpc = totalSpend / totalClicks
  return cpc.toString()
}

/**
 * アクションデータをマージ
 */
function mergeActions(insights: AdInsight[]): any[] {
  const actionMap = new Map<string, number>()
  
  for (const insight of insights) {
    if (insight.actions && Array.isArray(insight.actions)) {
      for (const action of insight.actions) {
        const key = action.action_type
        const value = parseFloat(action.value || '0')
        actionMap.set(key, (actionMap.get(key) || 0) + value)
      }
    }
  }
  
  return Array.from(actionMap.entries()).map(([action_type, value]) => ({
    action_type,
    value: value.toString()  // 数値を文字列化
  }))
}

/**
 * cost_per_action_typeの平均を計算
 */
function calculateAverageCostPerAction(insights: AdInsight[]): any[] {
  const actionCostMap = new Map<string, { total: number, count: number }>()
  
  for (const insight of insights) {
    if (insight.cost_per_action_type && Array.isArray(insight.cost_per_action_type)) {
      for (const costAction of insight.cost_per_action_type) {
        const key = costAction.action_type
        const value = parseFloat(costAction.value || '0')
        
        if (!actionCostMap.has(key)) {
          actionCostMap.set(key, { total: 0, count: 0 })
        }
        
        const current = actionCostMap.get(key)!
        current.total += value
        current.count += 1
      }
    }
  }
  
  return Array.from(actionCostMap.entries()).map(([action_type, data]) => ({
    action_type,
    value: (data.count > 0 ? data.total / data.count : 0).toString()
  }))
}

/**
 * 時系列データから特定の広告の日別データを抽出
 */
export function extractDailyDataForAd(
  timeSeriesData: AdInsight[],
  adId: string
): AdInsight[] {
  return timeSeriesData
    .filter(insight => insight.ad_id === adId)
    .sort((a, b) => {
      const dateA = a.date_start || ''
      const dateB = b.date_start || ''
      return dateA.localeCompare(dateB)
    })
}

/**
 * 合算されたデータから時系列チャート用のデータを生成
 */
export function prepareTimeSeriesChartData(
  aggregatedInsight: AggregatedInsight
): Array<{
  date: string
  impressions: number
  clicks: number
  ctr: number
  cpm: number
  spend: number
}> {
  if (!aggregatedInsight.daily_breakdown) {
    return []
  }
  
  return aggregatedInsight.daily_breakdown.map(daily => ({
    date: daily.date_start || '',
    impressions: parseFloat(daily.impressions || '0'),
    clicks: parseFloat(daily.clicks || '0'),
    ctr: parseFloat(daily.ctr || '0'),
    cpm: parseFloat(daily.cpm || '0'),
    spend: parseFloat(daily.spend || '0')
  }))
}