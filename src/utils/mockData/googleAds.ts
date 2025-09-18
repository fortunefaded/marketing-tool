// Google広告モックデータ生成関数

export interface GoogleAdsData {
  date: string
  cost: number
  impressions: number
  clicks: number
  conversions: number
  ctr: number
  cpc: number
  cvr: number
}

export const generateGoogleAdsData = (startDateParam: Date, endDateParam: Date): {
  dailyData: GoogleAdsData[]
  totalCost: number
  totalImpressions: number
  totalClicks: number
  totalConversions: number
  current?: {
    cost: number
    impressions: number
    clicks: number
    conversions: number
    ctr: number
    cpc: number
    cvr: number
  }
} => {
  const dailyData: GoogleAdsData[] = []
  let totalCost = 0
  let totalImpressions = 0
  let totalClicks = 0
  let totalConversions = 0

  // 日付をコピーして使用（元の日付を変更しない）
  const startDate = new Date(startDateParam)
  const endDate = new Date(endDateParam)
  const currentDate = new Date(startDate)

  console.log('🔵 Google広告モックデータ生成開始:', {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString()
  })

  // 終了日を含むように日付比較
  while (currentDate <= endDate) {
    const dayOfWeek = currentDate.getDay()

    // 曜日による変動を加味（週末は少なめ）
    const weekendFactor = (dayOfWeek === 0 || dayOfWeek === 6) ? 0.75 : 1.0
    const randomFactor = 0.8 + Math.random() * 0.4 // 0.8 ~ 1.2

    // 基準値（1日あたり）- Googleの方がYahooより規模が大きい
    const baseImpressions = Math.floor(20000 * weekendFactor * randomFactor) // 1日2万インプレッション前後
    const baseCTR = 0.055 + Math.random() * 0.02 // CTR 5.5〜7.5%
    const baseCPC = 65 + Math.random() * 15 // CPC 65〜80円
    const baseCVR = 0.0065 + Math.random() * 0.002 // CVR 0.65〜0.85%（CPO 9500-12000円、平均10500円程度）

    // 計算
    const impressions = baseImpressions
    const ctr = baseCTR
    const clicks = Math.floor(impressions * ctr)
    const cpc = baseCPC
    const cost = Math.round(clicks * cpc)
    const cvr = baseCVR
    const conversions = Math.floor(clicks * cvr)

    // 日本時間でYYYY-MM-DD形式に変換
    const year = currentDate.getFullYear()
    const month = String(currentDate.getMonth() + 1).padStart(2, '0')
    const day = String(currentDate.getDate()).padStart(2, '0')
    const dateStr = `${year}-${month}-${day}`

    dailyData.push({
      date: dateStr,
      cost,
      impressions,
      clicks,
      conversions,
      ctr: parseFloat((ctr * 100).toFixed(2)),
      cpc: Math.round(cpc),
      cvr: parseFloat((cvr * 100).toFixed(2))
    })

    // 合計値を更新
    totalCost += cost
    totalImpressions += impressions
    totalClicks += clicks
    totalConversions += conversions

    // 次の日へ
    currentDate.setDate(currentDate.getDate() + 1)
  }

  // 期間全体の平均値を計算（current として返す）
  const avgCtr = totalClicks > 0 ? (totalClicks / totalImpressions) * 100 : 0
  const avgCpc = totalClicks > 0 ? totalCost / totalClicks : 0
  const avgCvr = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0

  return {
    dailyData,
    totalCost,
    totalImpressions,
    totalClicks,
    totalConversions,
    current: {
      cost: totalCost,
      impressions: totalImpressions,
      clicks: totalClicks,
      conversions: totalConversions,
      ctr: parseFloat(avgCtr.toFixed(2)),
      cpc: Math.round(avgCpc),
      cvr: parseFloat(avgCvr.toFixed(2))
    }
  }
}