// Meta広告モックデータ生成関数

export interface MetaAdsData {
  date: string
  spend: number
  impressions: number
  clicks: number
  conversions: number
  ctr: number
  cpc: number
  cpm: number
}

export const generateMetaAdsData = (startDateParam: Date, endDateParam: Date): {
  dailyData: MetaAdsData[]
  totalSpend: number
  totalImpressions: number
  totalClicks: number
  totalConversions: number
  current?: {
    spend: number
    impressions: number
    clicks: number
    conversions: number
    ctr: number
    cpc: number
    cpm: number
  }
} => {
  const dailyData: MetaAdsData[] = []
  let totalSpend = 0
  let totalImpressions = 0
  let totalClicks = 0
  let totalConversions = 0

  // 日付をコピーして使用（元の日付を変更しない）
  const startDate = new Date(startDateParam)
  const endDate = new Date(endDateParam)
  const currentDate = new Date(startDate)

  console.log('🔷 Meta広告モックデータ生成開始:', {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString()
  })

  // 終了日を含むように日付比較
  while (currentDate <= endDate) {
    const dayOfWeek = currentDate.getDay()

    // 曜日による変動を加味（週末は少なめ）
    const weekendFactor = (dayOfWeek === 0 || dayOfWeek === 6) ? 0.75 : 1.0
    const randomFactor = 0.8 + Math.random() * 0.4 // 0.8 ~ 1.2

    // 基準値（1日あたり）- Metaは最大規模
    const baseImpressions = Math.floor(30000 * weekendFactor * randomFactor) // 1日3万インプレッション前後
    const baseCTR = 0.04 + Math.random() * 0.015 // CTR 4.0〜5.5%
    const baseCPC = 70 + Math.random() * 20 // CPC 70〜90円
    const baseCVR = 0.0065 + Math.random() * 0.002 // CVR 0.65〜0.85%（CPO 9500-12000円、平均10500円程度）

    // 計算
    const impressions = baseImpressions
    const ctr = baseCTR
    const clicks = Math.floor(impressions * ctr)
    const cpc = baseCPC
    const spend = Math.round(clicks * cpc)
    const cvr = baseCVR
    const conversions = Math.floor(clicks * cvr)
    const cpm = impressions > 0 ? (spend / impressions) * 1000 : 0

    // 日本時間でYYYY-MM-DD形式に変換
    const year = currentDate.getFullYear()
    const month = String(currentDate.getMonth() + 1).padStart(2, '0')
    const day = String(currentDate.getDate()).padStart(2, '0')
    const dateStr = `${year}-${month}-${day}`

    dailyData.push({
      date: dateStr,
      spend,
      impressions,
      clicks,
      conversions,
      ctr: parseFloat((ctr * 100).toFixed(2)),
      cpc: Math.round(cpc),
      cpm: Math.round(cpm)
    })

    // 合計値を更新
    totalSpend += spend
    totalImpressions += impressions
    totalClicks += clicks
    totalConversions += conversions

    // 次の日へ
    currentDate.setDate(currentDate.getDate() + 1)
  }

  // 期間全体の平均値を計算（current として返す）
  const avgCtr = totalClicks > 0 ? (totalClicks / totalImpressions) * 100 : 0
  const avgCpc = totalClicks > 0 ? totalSpend / totalClicks : 0
  const avgCpm = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0

  console.log('🔷 Meta広告モックデータ生成完了:', {
    days: dailyData.length,
    totalSpend,
    totalConversions,
    cpo: totalConversions > 0 ? Math.round(totalSpend / totalConversions) : 0
  })

  return {
    dailyData,
    totalSpend,
    totalImpressions,
    totalClicks,
    totalConversions,
    current: {
      spend: totalSpend,
      impressions: totalImpressions,
      clicks: totalClicks,
      conversions: totalConversions,
      ctr: parseFloat(avgCtr.toFixed(2)),
      cpc: Math.round(avgCpc),
      cpm: Math.round(avgCpm)
    }
  }
}