// Yahoo広告モックデータ生成関数

export interface YahooAdsData {
  date: string
  cost: number
  impressions: number
  clicks: number
  conversions: number
  ctr: number
  cpc: number
  cvr: number
}

export const generateYahooAdsData = (startDateParam: Date, endDateParam: Date): {
  dailyData: YahooAdsData[]
  totalCost: number
  totalImpressions: number
  totalClicks: number
  totalConversions: number
} => {
  const dailyData: YahooAdsData[] = []
  let totalCost = 0
  let totalImpressions = 0
  let totalClicks = 0
  let totalConversions = 0

  // 日付をコピーして使用（元の日付を変更しない）
  const startDate = new Date(startDateParam)
  const endDate = new Date(endDateParam)
  const currentDate = new Date(startDate)

  console.log('🔴 Yahoo広告モックデータ生成開始:', {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString()
  })

  // 終了日を含むように日付比較
  while (currentDate <= endDate) {
    const dayOfWeek = currentDate.getDay()

    // Yahoo広告はGoogle広告の60-70%程度の規模で生成
    // 曜日による変動を加味（週末は少なめ）
    const weekendFactor = (dayOfWeek === 0 || dayOfWeek === 6) ? 0.7 : 1.0
    const randomFactor = 0.8 + Math.random() * 0.4 // 0.8 ~ 1.2

    // 基準値（1日あたり）
    const baseImpressions = Math.floor(12000 * weekendFactor * randomFactor) // 1日1.2万インプレッション前後
    const baseCTR = 0.045 + Math.random() * 0.02 // CTR 4.5〜6.5%
    const baseCPC = 55 + Math.random() * 20 // CPC 55〜75円
    const baseCVR = 0.004 + Math.random() * 0.003 // CVR 0.4〜0.7%（CPO 8000-15000円になるよう調整）

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

    console.log('🔴 Yahoo広告データ生成:', dateStr)

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

  console.log('🔴 Yahoo広告モックデータ生成完了:', {
    日数: dailyData.length,
    最初の日: dailyData[0]?.date,
    最後の日: dailyData[dailyData.length - 1]?.date
  })

  return {
    dailyData,
    totalCost,
    totalImpressions,
    totalClicks,
    totalConversions
  }
}