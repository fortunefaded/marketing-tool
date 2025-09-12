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
  conversions_1d_click: number // F-CV: 初回コンバージョン
  conversion_values: number
  fcv_debug?: any // F-CVデバッグ情報

  // ECForceデータ
  ecforce_cv: number
  ecforce_fcv: number
  ecforce_cpa: number | null
  ecforce_cv_total?: number // 合計行用
  ecforce_fcv_total?: number // 合計行用

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

  console.log('📊 aggregateCreativesByName: Input data:', {
    length: data.length,
    firstItem: data[0]
      ? {
          ad_name: data[0].ad_name,
          date_start: data[0].date_start,
          date_stop: data[0].date_stop,
          impressions: data[0].impressions,
          impressions_type: typeof data[0].impressions,
          clicks: data[0].clicks,
          clicks_type: typeof data[0].clicks,
          spend: data[0].spend,
          spend_type: typeof data[0].spend,
        }
      : null,
    // 同じ広告名のデータ数を確認
    sampleAdName: data[0]?.ad_name,
    sampleAdCount: data.filter((d) => d.ad_name === data[0]?.ad_name).length,
  })

  // クリエイティブ名でグループ化
  const grouped = new Map<string, any[]>()

  data.forEach((item) => {
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
    let totalConversions1dClick = 0 // F-CV集計用
    let totalConversionValues = 0
    let maxFatigueScore = 0
    let totalFrequency = 0
    let frequencyCount = 0

    // ECForceデータの集計
    let totalEcforceCv = 0
    let totalEcforceFcv = 0

    const adIds: string[] = []
    const dailyData: any[] = []

    sortedItems.forEach((item) => {
      // 数値変換（文字列の場合も考慮）
      const impressions =
        typeof item.impressions === 'number' ? item.impressions : parseFloat(item.impressions) || 0
      const clicks = typeof item.clicks === 'number' ? item.clicks : parseFloat(item.clicks) || 0
      const spend = typeof item.spend === 'number' ? item.spend : parseFloat(item.spend) || 0
      const conversions =
        typeof item.conversions === 'number' ? item.conversions : parseFloat(item.conversions) || 0
      const conversions1dClick =
        typeof item.conversions_1d_click === 'number'
          ? item.conversions_1d_click
          : parseFloat(item.conversions_1d_click) || 0
      const conversionValues =
        typeof item.conversion_values === 'number'
          ? item.conversion_values
          : parseFloat(item.conversion_values || item.revenue) || 0
      const frequency =
        typeof item.frequency === 'number' ? item.frequency : parseFloat(item.frequency) || 0
      // 疲労度スコアはオプショナル（ない場合は-1で未計算を表す）
      const fatigueScore =
        item.fatigue_score !== undefined ? parseFloat(item.fatigue_score || item.score) : -1

      totalImpressions += impressions
      totalClicks += clicks
      totalSpend += spend
      totalConversions += conversions
      totalConversions1dClick += conversions1dClick
      totalConversionValues += conversionValues

      // ECForceデータの集計
      const ecforceCv =
        typeof item.ecforce_cv === 'number' ? item.ecforce_cv : parseFloat(item.ecforce_cv) || 0
      const ecforceFcv =
        typeof item.ecforce_fcv === 'number' ? item.ecforce_fcv : parseFloat(item.ecforce_fcv) || 0
      totalEcforceCv += ecforceCv
      totalEcforceFcv += ecforceFcv

      if (frequency > 0) {
        totalFrequency += frequency
        frequencyCount++
      }

      // 疲労度スコアが有効な場合のみ最大値を更新
      if (fatigueScore >= 0) {
        maxFatigueScore = Math.max(maxFatigueScore, fatigueScore)
      }

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
        fatigue_score: fatigueScore,
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
    const dates = dailyData.map((d) => d.date).filter((d) => d)
    const firstDate = dates.length > 0 ? dates[0] : ''
    const lastDate = dates.length > 0 ? dates[dates.length - 1] : ''

    // ECForce合計値を計算（最初のアイテムから取得）
    const ecforceCpa = totalEcforceFcv > 0 ? totalSpend / totalEcforceFcv : null

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
      conversions_1d_click: totalConversions1dClick,
      conversion_values: totalConversionValues,
      fcv_debug: first.fcv_debug, // 最初のアイテムのデバッグ情報を使用
      ecforce_cv: totalEcforceCv,
      ecforce_fcv: totalEcforceFcv,
      ecforce_cpa: ecforceCpa,
      ecforce_cv_total: first.ecforce_cv_total || 0, // 合計値を保持
      ecforce_fcv_total: first.ecforce_fcv_total || 0, // 合計値を保持
      ctr,
      unique_ctr,
      cpm,
      cpc,
      cpa,
      roas,
      frequency: avgFrequency,
      fatigue_score: maxFatigueScore > 0 ? maxFatigueScore : -1, // 疲労度スコアが無い場合は-1
      dailyData,
      firstDate,
      lastDate,
      dayCount: dailyData.length,
      originalInsight: first,
    })
  })

  return aggregated
}
