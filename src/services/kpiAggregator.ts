import { MetaInsightsData, ECForceOrder } from '@/types'
import { ECForceSalesData } from '@/types'

export interface UnifiedKPIMetrics {
  // 総合指標
  totalRevenue: number // 実売上（ECForce）
  totalAdSpend: number // 総広告費（Meta + Google）
  trueROAS: number // 真のROAS（実売上 / 広告費）
  trueCPA: number // 真のCPA（広告費 / 実注文数）
  profitMargin: number // 利益率

  // 媒体別指標
  byChannel: {
    meta: ChannelMetrics
    google?: ChannelMetrics
    ecforce: ECForceMetrics
  }

  // 期間比較
  comparison?: {
    previousPeriod: ComparisonMetrics
    change: ChangeMetrics
  }
}

export interface ChannelMetrics {
  spend: number
  impressions: number
  clicks: number
  conversions: number
  revenue: number // 推定または実売上
  ctr: number
  cpc: number
  cpa: number
  roas: number
}

export interface ECForceMetrics {
  revenue: number
  orders: number
  avgOrderValue: number
  newCustomers: number
  returningCustomers: number
  conversionRate: number
}

export interface ComparisonMetrics {
  revenue: number
  adSpend: number
  roas: number
  orders: number
}

export interface ChangeMetrics {
  revenue: number // 変化率（%）
  adSpend: number
  roas: number
  orders: number
}

export interface AggregationOptions {
  dateRange: {
    start: string
    end: string
  }
  previousPeriodComparison?: boolean
  includeGoogle?: boolean
  attributionWindow?: number // 日数
}

export class KPIAggregator {
  constructor() {}

  // 統合KPIを計算
  calculateUnifiedKPIs(
    metaInsights: MetaInsightsData[],
    ecforceOrders: ECForceOrder[],
    ecforceSales?: ECForceSalesData[],
    options?: AggregationOptions
  ): UnifiedKPIMetrics {
    // Meta広告のメトリクスを集計
    const metaMetrics = this.aggregateMetaMetrics(metaInsights)

    // ECForceのメトリクスを集計
    const ecforceMetrics = this.aggregateECForceMetrics(ecforceOrders, ecforceSales)

    // 総合指標を計算
    const totalAdSpend = metaMetrics.spend
    const totalRevenue = ecforceMetrics.revenue
    const trueROAS = totalAdSpend > 0 ? totalRevenue / totalAdSpend : 0
    const trueCPA = ecforceMetrics.orders > 0 ? totalAdSpend / ecforceMetrics.orders : 0
    const profitMargin = totalRevenue > 0 ? (totalRevenue - totalAdSpend) / totalRevenue : 0

    // 結果を構築
    const result: UnifiedKPIMetrics = {
      totalRevenue,
      totalAdSpend,
      trueROAS,
      trueCPA,
      profitMargin,
      byChannel: {
        meta: metaMetrics,
        ecforce: ecforceMetrics,
      },
    }

    // 期間比較を追加（オプション）
    if (options?.previousPeriodComparison) {
      const comparison = this.calculatePeriodComparison(
        metaInsights,
        ecforceOrders,
        options.dateRange
      )
      result.comparison = comparison
    }

    return result
  }

  // Meta広告メトリクスの集計
  private aggregateMetaMetrics(insights: MetaInsightsData[]): ChannelMetrics {
    const totals = insights.reduce(
      (acc, insight) => {
        acc.spend += Number(insight.spend || 0)
        acc.impressions += Number(insight.impressions || 0)
        acc.clicks += Number(insight.clicks || 0)
        acc.conversions += Number(insight.conversions || 0)
        acc.revenue += Number(insight.conversion_value || 0)
        return acc
      },
      {
        spend: 0,
        impressions: 0,
        clicks: 0,
        conversions: 0,
        revenue: 0,
      }
    )

    return {
      ...totals,
      ctr: totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0,
      cpc: totals.clicks > 0 ? totals.spend / totals.clicks : 0,
      cpa: totals.conversions > 0 ? totals.spend / totals.conversions : 0,
      roas: totals.spend > 0 ? totals.revenue / totals.spend : 0,
    }
  }

  // ECForceメトリクスの集計
  private aggregateECForceMetrics(
    orders: ECForceOrder[],
    salesData?: ECForceSalesData[]
  ): ECForceMetrics {
    if (salesData && salesData.length > 0) {
      // 売上サマリーデータがある場合はそれを使用
      const totals = salesData.reduce(
        (acc, data) => {
          acc.revenue += data.total_sales
          acc.orders += data.orders_count
          acc.newCustomers += data.new_customers
          acc.returningCustomers += data.returning_customers
          return acc
        },
        {
          revenue: 0,
          orders: 0,
          newCustomers: 0,
          returningCustomers: 0,
        }
      )

      return {
        ...totals,
        avgOrderValue: totals.orders > 0 ? totals.revenue / totals.orders : 0,
        conversionRate: 0, // 別途計算が必要
      }
    }

    // 注文データから集計
    const revenue = orders.reduce((sum, order) => sum + (order.合計 || order.小計 || 0), 0)
    const orderCount = orders.length

    // ユニーク顧客数を計算
    const uniqueCustomers = new Set(orders.map((o) => o.顧客ID || o.顧客番号 || ''))

    return {
      revenue,
      orders: orderCount,
      avgOrderValue: orderCount > 0 ? revenue / orderCount : 0,
      newCustomers: uniqueCustomers.size, // 簡易的な計算
      returningCustomers: 0, // 詳細な計算が必要
      conversionRate: 0, // セッションデータが必要
    }
  }

  // 期間比較の計算
  private calculatePeriodComparison(
    metaInsights: MetaInsightsData[],
    ecforceOrders: ECForceOrder[],
    currentPeriod: { start: string; end: string }
  ): { previousPeriod: ComparisonMetrics; change: ChangeMetrics } {
    // 期間の長さを計算
    const startDate = new Date(currentPeriod.start)
    const endDate = new Date(currentPeriod.end)
    const periodLength = endDate.getTime() - startDate.getTime()

    // 前期間の日付を計算
    const previousStart = new Date(startDate.getTime() - periodLength)
    const previousEnd = new Date(startDate.getTime() - 1)

    // 現期間のデータをフィルタ
    const currentMetaData = metaInsights.filter((i) => {
      const date = new Date(i.date_start || '')
      return date >= startDate && date <= endDate
    })

    const currentOrders = ecforceOrders.filter((o) => {
      const date = new Date(o.受注日 || '')
      return date >= startDate && date <= endDate
    })

    // 前期間のデータをフィルタ
    const previousMetaData = metaInsights.filter((i) => {
      const date = new Date(i.date_start || '')
      return date >= previousStart && date <= previousEnd
    })

    const previousOrders = ecforceOrders.filter((o) => {
      const date = new Date(o.受注日 || '')
      return date >= previousStart && date <= previousEnd
    })

    // メトリクスを計算
    const currentMetrics = {
      revenue: currentOrders.reduce((sum, o) => sum + (o.合計 || o.小計 || 0), 0),
      adSpend: currentMetaData.reduce((sum, i) => sum + Number(i.spend || 0), 0),
      orders: currentOrders.length,
      roas: 0,
    }
    currentMetrics.roas =
      currentMetrics.adSpend > 0 ? currentMetrics.revenue / currentMetrics.adSpend : 0

    const previousMetrics = {
      revenue: previousOrders.reduce((sum, o) => sum + (o.合計 || o.小計 || 0), 0),
      adSpend: previousMetaData.reduce((sum, i) => sum + Number(i.spend || 0), 0),
      orders: previousOrders.length,
      roas: 0,
    }
    previousMetrics.roas =
      previousMetrics.adSpend > 0 ? previousMetrics.revenue / previousMetrics.adSpend : 0

    // 変化率を計算
    const calculateChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0
      return ((current - previous) / previous) * 100
    }

    return {
      previousPeriod: previousMetrics,
      change: {
        revenue: calculateChange(currentMetrics.revenue, previousMetrics.revenue),
        adSpend: calculateChange(currentMetrics.adSpend, previousMetrics.adSpend),
        roas: calculateChange(currentMetrics.roas, previousMetrics.roas),
        orders: calculateChange(currentMetrics.orders, previousMetrics.orders),
      },
    }
  }

  // 日別KPIの計算
  calculateDailyKPIs(
    metaInsights: MetaInsightsData[],
    ecforceOrders: ECForceOrder[],
    dateRange: { start: string; end: string }
  ): Array<{
    date: string
    revenue: number
    adSpend: number
    orders: number
    roas: number
    meta: ChannelMetrics
    ecforce: { revenue: number; orders: number }
  }> {
    const dailyData = new Map<string, any>()

    // 日付範囲内のすべての日付を生成
    const startDate = new Date(dateRange.start)
    const endDate = new Date(dateRange.end)
    const currentDate = new Date(startDate)

    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0]
      dailyData.set(dateStr, {
        date: dateStr,
        meta: { spend: 0, impressions: 0, clicks: 0, conversions: 0, revenue: 0 },
        ecforce: { revenue: 0, orders: 0 },
      })
      currentDate.setDate(currentDate.getDate() + 1)
    }

    // Meta広告データを日別に集計
    metaInsights.forEach((insight) => {
      const date = insight.date_start || ''
      if (dailyData.has(date)) {
        const day = dailyData.get(date)
        day.meta.spend += Number(insight.spend || 0)
        day.meta.impressions += Number(insight.impressions || 0)
        day.meta.clicks += Number(insight.clicks || 0)
        day.meta.conversions += Number(insight.conversions || 0)
        day.meta.revenue += Number(insight.conversion_value || 0)
      }
    })

    // ECForceデータを日別に集計
    ecforceOrders.forEach((order) => {
      const dateStr = order.注文日 || ''
      const date = dateStr.split('T')[0]
      if (dailyData.has(date)) {
        const day = dailyData.get(date)
        day.ecforce.revenue += order.小計 || 0
        day.ecforce.orders += 1
      }
    })

    // 日別KPIを計算
    return Array.from(dailyData.values()).map((day) => {
      const metaMetrics = this.calculateChannelMetrics(day.meta)
      const totalRevenue = day.ecforce.revenue
      const totalAdSpend = metaMetrics.spend

      return {
        date: day.date,
        revenue: totalRevenue,
        adSpend: totalAdSpend,
        orders: day.ecforce.orders,
        roas: totalAdSpend > 0 ? totalRevenue / totalAdSpend : 0,
        meta: metaMetrics,
        ecforce: day.ecforce,
      }
    })
  }

  // チャネルメトリクスの計算
  private calculateChannelMetrics(data: any): ChannelMetrics {
    return {
      spend: data.spend,
      impressions: data.impressions,
      clicks: data.clicks,
      conversions: data.conversions,
      revenue: data.revenue,
      ctr: data.impressions > 0 ? (data.clicks / data.impressions) * 100 : 0,
      cpc: data.clicks > 0 ? data.spend / data.clicks : 0,
      cpa: data.conversions > 0 ? data.spend / data.conversions : 0,
      roas: data.spend > 0 ? data.revenue / data.spend : 0,
    }
  }

  // アトリビューション分析
  analyzeAttribution(
    metaInsights: MetaInsightsData[],
    ecforceOrders: ECForceOrder[]
  ): {
    direct: number // fbclidによる直接紐付け
    utm: number // UTMパラメータによる紐付け
    viewThrough: number // ビュースルー（推定）
    unknown: number // 紐付け不可
  } {
    let direct = 0
    let utm = 0
    let unknown = 0

    ecforceOrders.forEach((order) => {
      // ECForceの日本語フィールドでは広告URLグループ名で判定
      if (
        order.広告URLグループ名?.includes('facebook') ||
        order.広告URLグループ名?.includes('meta')
      ) {
        direct++
      } else if (order.広告主名?.includes('Facebook') || order.広告主名?.includes('Meta')) {
        utm++
      } else {
        unknown++
      }
    })

    // ビュースルーは推定値（Meta広告のコンバージョン数 - 直接紐付け数）
    const metaConversions = metaInsights.reduce((sum, i) => sum + Number(i.conversions || 0), 0)
    const viewThrough = Math.max(0, metaConversions - direct - utm)

    return { direct, utm, viewThrough, unknown }
  }
}
