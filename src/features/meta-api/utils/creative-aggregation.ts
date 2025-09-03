/**
 * クリエイティブ名でグループ化して集約するユーティリティ
 */

export interface AggregatedCreative {
  // 基本情報
  adName: string
  adIds: string[] // 含まれる全ての広告ID
  campaignName: string
  campaignId: string
  adsetName: string
  adsetId: string
  
  // 集約メトリクス
  impressions: number
  clicks: number
  spend: number
  conversions: number
  conversion_values: number
  
  // 計算メトリクス
  ctr: number
  unique_ctr: number
  cpm: number
  cpc: number
  cpa: number
  roas: number
  frequency: number
  
  // 疲労度（最大値）
  fatigue_score: number
  
  // 日別データ（詳細表示用）
  dailyData: Array<{
    date: string
    ad_id: string
    impressions: number
    clicks: number
    spend: number
    conversions: number
    conversion_values: number
    ctr: number
    cpm: number
    cpc: number
    frequency: number
    fatigue_score: number
  }>
  
  // メタデータ
  firstDate: string
  lastDate: string
  dayCount: number
  
  // オリジナルのinsightデータ（最初の1件）
  originalInsight?: any
}

/**
 * クリエイティブデータを名前でグループ化して集約
 */
export function aggregateCreativesByName(data: any[]): AggregatedCreative[] {
  if (!data || !Array.isArray(data)) return []
  
  // クリエイティブ名でグループ化
  const grouped = new Map<string, any[]>()
  
  data.forEach(item => {
    const name = item.ad_name || item.adName || 'Unknown'
    if (!grouped.has(name)) {
      grouped.set(name, [])
    }
    grouped.get(name)!.push(item)
  })
  
  // 各グループを集約
  const aggregated: AggregatedCreative[] = []
  
  grouped.forEach((items, adName) => {
    // 日付でソート
    const sortedItems = [...items].sort((a, b) => {
      const dateA = a.date_start || a.date || ''
      const dateB = b.date_start || b.date || ''
      return dateA.localeCompare(dateB)
    })
    
    // 基本情報（最初のアイテムから取得）
    const first = sortedItems[0]
    const campaignName = first.campaign_name || first.campaignName || 'Unknown'
    const campaignId = first.campaign_id || first.campaignId || ''
    const adsetName = first.adset_name || first.adsetName || 'Unknown'
    const adsetId = first.adset_id || first.adsetId || ''
    
    // メトリクスの集計
    let totalImpressions = 0
    let totalClicks = 0
    let totalSpend = 0
    let totalConversions = 0
    let totalConversionValues = 0
    let maxFatigueScore = 0
    let totalFrequency = 0
    let frequencyCount = 0
    
    const adIds: string[] = []
    const dailyData: any[] = []
    
    sortedItems.forEach(item => {
      const impressions = parseFloat(item.impressions) || 0
      const clicks = parseFloat(item.clicks) || 0
      const spend = parseFloat(item.spend) || 0
      const conversions = parseFloat(item.conversions) || 0
      const conversionValues = parseFloat(item.conversion_values || item.revenue) || 0
      const frequency = parseFloat(item.frequency) || 0
      const fatigueScore = parseFloat(item.fatigue_score || item.score) || 0
      
      totalImpressions += impressions
      totalClicks += clicks
      totalSpend += spend
      totalConversions += conversions
      totalConversionValues += conversionValues
      
      if (frequency > 0) {
        totalFrequency += frequency
        frequencyCount++
      }
      
      maxFatigueScore = Math.max(maxFatigueScore, fatigueScore)
      
      const adId = item.ad_id || item.adId || ''
      if (adId && !adIds.includes(adId)) {
        adIds.push(adId)
      }
      
      // 日別データを保存
      dailyData.push({
        date: item.date_start || item.date || '',
        ad_id: adId,
        impressions,
        clicks,
        spend,
        conversions,
        conversion_values: conversionValues,
        ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
        cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
        cpc: clicks > 0 ? spend / clicks : 0,
        frequency,
        fatigue_score: fatigueScore
      })
    })
    
    // 平均・計算メトリクス
    const avgFrequency = frequencyCount > 0 ? totalFrequency / frequencyCount : 0
    const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0
    const cpm = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0
    const cpc = totalClicks > 0 ? totalSpend / totalClicks : 0
    const cpa = totalConversions > 0 ? totalSpend / totalConversions : 0
    const roas = totalSpend > 0 ? totalConversionValues / totalSpend : 0
    
    // unique_ctr（簡易的に通常CTRと同じにする）
    const unique_ctr = ctr
    
    // 日付範囲
    const dates = dailyData.map(d => d.date).filter(d => d)
    const firstDate = dates.length > 0 ? dates[0] : ''
    const lastDate = dates.length > 0 ? dates[dates.length - 1] : ''
    
    aggregated.push({
      adName,
      adIds,
      campaignName,
      campaignId,
      adsetName,
      adsetId,
      impressions: totalImpressions,
      clicks: totalClicks,
      spend: totalSpend,
      conversions: totalConversions,
      conversion_values: totalConversionValues,
      ctr,
      unique_ctr,
      cpm,
      cpc,
      cpa,
      roas,
      frequency: avgFrequency,
      fatigue_score: maxFatigueScore,
      dailyData,
      firstDate,
      lastDate,
      dayCount: dailyData.length,
      originalInsight: first
    })
  })
  
  return aggregated
}