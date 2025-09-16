// データ統合ユーティリティ
export interface IntegratedData {
  date: string
  meta: {
    impressions: number
    clicks: number
    spend: number
    conversions: number
    ctr: number
    cpc: number
    cpa: number
    reach?: number
    frequency?: number
  }
  ecforce: {
    access: number
    cvOrder: number
    cvPayment: number
    cvThanksUpsell: number
    revenue: number
    orderRevenue: number
    cvrOrder: number
    cvrPayment: number
    upsellRevenue?: number
    offerSuccessRate?: number
  }
}

/**
 * Meta APIとECForceのデータを日付でマージして統合データを作成
 */
export const integrateMetaAndEcforceData = (
  metaData: any[],
  ecforceData: any[]
): IntegratedData[] => {
  // 日付をキーにしてデータを統合
  const integratedMap = new Map<string, IntegratedData>()

  // Meta APIデータを日付でグループ化
  metaData.forEach(item => {
    const date = item.date_start || item.date || new Date().toISOString().split('T')[0]

    if (!integratedMap.has(date)) {
      integratedMap.set(date, {
        date,
        meta: {
          impressions: 0,
          clicks: 0,
          spend: 0,
          conversions: 0,
          ctr: 0,
          cpc: 0,
          cpa: 0,
          reach: 0,
          frequency: 0
        },
        ecforce: {
          access: 0,
          cvOrder: 0,
          cvPayment: 0,
          cvThanksUpsell: 0,
          revenue: 0,
          orderRevenue: 0,
          cvrOrder: 0,
          cvrPayment: 0,
          upsellRevenue: 0,
          offerSuccessRate: 0
        }
      })
    }

    const dayData = integratedMap.get(date)!
    dayData.meta.impressions += item.impressions || 0
    dayData.meta.clicks += item.clicks || 0
    dayData.meta.spend += item.spend || 0
    dayData.meta.conversions += item.conversions || 0
    dayData.meta.reach = (dayData.meta.reach || 0) + (item.reach || 0)
    dayData.meta.frequency = item.frequency || dayData.meta.frequency

    // 比率の再計算
    if (dayData.meta.impressions > 0) {
      dayData.meta.ctr = (dayData.meta.clicks / dayData.meta.impressions) * 100
    }
    if (dayData.meta.clicks > 0) {
      dayData.meta.cpc = dayData.meta.spend / dayData.meta.clicks
    }
    if (dayData.meta.conversions > 0) {
      dayData.meta.cpa = dayData.meta.spend / dayData.meta.conversions
    }
  })

  // ECForceデータを統合
  ecforceData.forEach(item => {
    const date = item.date || new Date().toISOString().split('T')[0]

    if (!integratedMap.has(date)) {
      integratedMap.set(date, {
        date,
        meta: {
          impressions: 0,
          clicks: 0,
          spend: 0,
          conversions: 0,
          ctr: 0,
          cpc: 0,
          cpa: 0,
          reach: 0,
          frequency: 0
        },
        ecforce: {
          access: 0,
          cvOrder: 0,
          cvPayment: 0,
          cvThanksUpsell: 0,
          revenue: 0,
          orderRevenue: 0,
          cvrOrder: 0,
          cvrPayment: 0,
          upsellRevenue: 0,
          offerSuccessRate: 0
        }
      })
    }

    const dayData = integratedMap.get(date)!
    dayData.ecforce.access += item.access || 0
    dayData.ecforce.cvOrder += item.cvOrder || 0
    dayData.ecforce.cvPayment += item.cvPayment || 0
    dayData.ecforce.cvThanksUpsell += item.cvThanksUpsell || 0
    dayData.ecforce.revenue += item.revenue || 0
    dayData.ecforce.orderRevenue += item.orderRevenue || 0
    dayData.ecforce.upsellRevenue = (dayData.ecforce.upsellRevenue || 0) + (item.upsellRevenue || 0)
    dayData.ecforce.offerSuccessRate = item.offerSuccessRate || dayData.ecforce.offerSuccessRate

    // CVRの計算
    if (dayData.ecforce.access > 0) {
      dayData.ecforce.cvrOrder = (dayData.ecforce.cvOrder / dayData.ecforce.access) * 100
    }
    if (dayData.ecforce.cvOrder > 0) {
      dayData.ecforce.cvrPayment = (dayData.ecforce.cvPayment / dayData.ecforce.cvOrder) * 100
    }
  })

  // 日付順でソートして返す
  return Array.from(integratedMap.values()).sort((a, b) => a.date.localeCompare(b.date))
}

/**
 * 期間内のデータをフィルタリング
 */
export const filterDataByDateRange = (
  data: IntegratedData[],
  startDate: string,
  endDate: string
): IntegratedData[] => {
  return data.filter(item => {
    return item.date >= startDate && item.date <= endDate
  })
}

/**
 * 集計メトリクスを計算
 */
export const calculateAggregatedMetrics = (data: IntegratedData[]) => {
  const totals = {
    impressions: 0,
    clicks: 0,
    spend: 0,
    conversions: 0,
    reach: 0,
    access: 0,
    cvOrder: 0,
    cvPayment: 0,
    cvThanksUpsell: 0,
    revenue: 0,
    orderRevenue: 0,
    upsellRevenue: 0
  }

  data.forEach(item => {
    totals.impressions += item.meta.impressions
    totals.clicks += item.meta.clicks
    totals.spend += item.meta.spend
    totals.conversions += item.meta.conversions
    totals.reach += item.meta.reach || 0
    totals.access += item.ecforce.access
    totals.cvOrder += item.ecforce.cvOrder
    totals.cvPayment += item.ecforce.cvPayment
    totals.cvThanksUpsell += item.ecforce.cvThanksUpsell
    totals.revenue += item.ecforce.revenue
    totals.orderRevenue += item.ecforce.orderRevenue
    totals.upsellRevenue += item.ecforce.upsellRevenue || 0
  })

  // 平均値や比率の計算
  return {
    ...totals,
    ctr: totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0,
    cpc: totals.clicks > 0 ? totals.spend / totals.clicks : 0,
    cpa: totals.conversions > 0 ? totals.spend / totals.conversions : 0,
    roas: totals.spend > 0 ? totals.revenue / totals.spend : 0,
    roi: totals.spend > 0 ? ((totals.revenue - totals.spend) / totals.spend) * 100 : 0,
    cvrOrder: totals.access > 0 ? (totals.cvOrder / totals.access) * 100 : 0,
    cvrPayment: totals.cvOrder > 0 ? (totals.cvPayment / totals.cvOrder) * 100 : 0,
    customerUnitPrice: totals.cvPayment > 0 ? totals.revenue / totals.cvPayment : 0
  }
}