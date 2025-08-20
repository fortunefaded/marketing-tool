import { MetaInsightsData } from './metaApiService'
import { CreativeMetrics } from './creativeAggregator'

export interface KPIMetrics {
  roas: number
  cpa: number
  cvr: number
  ctr: number
  totalRevenue: number
  totalSpend: number
  totalConversions: number
  totalClicks: number
  totalImpressions: number
}

export interface KPIComparison {
  current: KPIMetrics
  previous: KPIMetrics
  changes: {
    roas: number // 変化率（%）
    cpa: number
    cvr: number
    ctr: number
    totalRevenue: number
    totalSpend: number
    totalConversions: number
  }
}

export interface PeriodData {
  date: string
  roas: number
  cpa: number
  cvr: number
  ctr: number
  conversions: number
  revenue: number
  spend: number
  clicks: number
  impressions: number
}

export class KPICalculator {
  /**
   * KPIメトリクスを計算
   */
  static calculateKPIs(data: MetaInsightsData[] | CreativeMetrics[]): KPIMetrics {
    let totalRevenue = 0
    let totalSpend = 0
    let totalConversions = 0
    let totalClicks = 0
    let totalImpressions = 0

    data.forEach(item => {
      // MetaInsightsDataとCreativeMetricsの両方に対応
      totalRevenue += Number(item.conversion_value || 0)
      totalSpend += Number(item.spend || 0)
      totalConversions += Number(item.conversions || 0)
      totalClicks += Number(item.clicks || 0)
      totalImpressions += Number(item.impressions || 0)
    })

    return {
      roas: this.calculateROAS(totalRevenue, totalSpend),
      cpa: this.calculateCPA(totalSpend, totalConversions),
      cvr: this.calculateCVR(totalConversions, totalClicks),
      ctr: this.calculateCTR(totalClicks, totalImpressions),
      totalRevenue,
      totalSpend,
      totalConversions,
      totalClicks,
      totalImpressions
    }
  }

  /**
   * ROAS（Return On Ad Spend）を計算
   * @param revenue 売上
   * @param spend 広告費
   * @returns ROAS値（倍率）
   */
  static calculateROAS(revenue: number, spend: number): number {
    if (spend <= 0) return 0
    return revenue / spend
  }

  /**
   * CPA（Cost Per Acquisition）を計算
   * @param spend 広告費
   * @param conversions コンバージョン数
   * @returns CPA値
   */
  static calculateCPA(spend: number, conversions: number): number {
    if (conversions <= 0) return 0
    return spend / conversions
  }

  /**
   * CVR（Conversion Rate）を計算
   * @param conversions コンバージョン数
   * @param clicks クリック数
   * @returns CVR（%）
   */
  static calculateCVR(conversions: number, clicks: number): number {
    if (clicks <= 0) return 0
    return (conversions / clicks) * 100
  }

  /**
   * CTR（Click Through Rate）を計算
   * @param clicks クリック数
   * @param impressions インプレッション数
   * @returns CTR（%）
   */
  static calculateCTR(clicks: number, impressions: number): number {
    if (impressions <= 0) return 0
    return (clicks / impressions) * 100
  }

  /**
   * 変化率を計算
   * @param current 現在の値
   * @param previous 前期間の値
   * @returns 変化率（%）
   */
  static calculateChangeRate(current: number, previous: number): number {
    if (previous <= 0) {
      return current > 0 ? 100 : 0
    }
    return ((current - previous) / previous) * 100
  }

  /**
   * 期間比較を実行
   */
  static compareKPIs(currentData: MetaInsightsData[], previousData: MetaInsightsData[]): KPIComparison {
    const current = this.calculateKPIs(currentData)
    const previous = this.calculateKPIs(previousData)

    return {
      current,
      previous,
      changes: {
        roas: this.calculateChangeRate(current.roas, previous.roas),
        cpa: this.calculateChangeRate(current.cpa, previous.cpa),
        cvr: this.calculateChangeRate(current.cvr, previous.cvr),
        ctr: this.calculateChangeRate(current.ctr, previous.ctr),
        totalRevenue: this.calculateChangeRate(current.totalRevenue, previous.totalRevenue),
        totalSpend: this.calculateChangeRate(current.totalSpend, previous.totalSpend),
        totalConversions: this.calculateChangeRate(current.totalConversions, previous.totalConversions)
      }
    }
  }

  /**
   * 日別データを集計
   */
  static aggregateByDate(data: MetaInsightsData[]): PeriodData[] {
    const dateMap = new Map<string, {
      revenue: number
      spend: number
      conversions: number
      clicks: number
      impressions: number
    }>()

    // 日付ごとにデータを集計
    data.forEach(item => {
      const date = item.date_start || item.dateStart || ''
      if (!date || typeof date !== 'string') return

      const existing = dateMap.get(date) || {
        revenue: 0,
        spend: 0,
        conversions: 0,
        clicks: 0,
        impressions: 0
      }

      dateMap.set(date, {
        revenue: existing.revenue + Number(item.conversion_value || 0),
        spend: existing.spend + Number(item.spend || 0),
        conversions: existing.conversions + Number(item.conversions || 0),
        clicks: existing.clicks + Number(item.clicks || 0),
        impressions: existing.impressions + Number(item.impressions || 0)
      })
    })

    // PeriodData形式に変換
    return Array.from(dateMap.entries())
      .map(([date, metrics]) => ({
        date,
        roas: this.calculateROAS(metrics.revenue, metrics.spend),
        cpa: this.calculateCPA(metrics.spend, metrics.conversions),
        cvr: this.calculateCVR(metrics.conversions, metrics.clicks),
        ctr: this.calculateCTR(metrics.clicks, metrics.impressions),
        conversions: metrics.conversions,
        revenue: metrics.revenue,
        spend: metrics.spend,
        clicks: metrics.clicks,
        impressions: metrics.impressions
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }

  /**
   * 週別データを集計
   */
  static aggregateByWeek(data: MetaInsightsData[]): PeriodData[] {
    const weekMap = new Map<string, {
      revenue: number
      spend: number
      conversions: number
      clicks: number
      impressions: number
      startDate: string
    }>()

    data.forEach(item => {
      const dateValue = item.date_start || item.dateStart || ''
      if (!dateValue || typeof dateValue !== 'string') return
      const date = dateValue

      const weekKey = this.getWeekKey(date)
      const existing = weekMap.get(weekKey) || {
        revenue: 0,
        spend: 0,
        conversions: 0,
        clicks: 0,
        impressions: 0,
        startDate: this.getWeekStartDate(date)
      }

      weekMap.set(weekKey, {
        revenue: existing.revenue + Number(item.conversion_value || 0),
        spend: existing.spend + Number(item.spend || 0),
        conversions: existing.conversions + Number(item.conversions || 0),
        clicks: existing.clicks + Number(item.clicks || 0),
        impressions: existing.impressions + Number(item.impressions || 0),
        startDate: existing.startDate
      })
    })

    return Array.from(weekMap.entries())
      .map(([_, metrics]) => ({
        date: metrics.startDate,
        roas: this.calculateROAS(metrics.revenue, metrics.spend),
        cpa: this.calculateCPA(metrics.spend, metrics.conversions),
        cvr: this.calculateCVR(metrics.conversions, metrics.clicks),
        ctr: this.calculateCTR(metrics.clicks, metrics.impressions),
        conversions: metrics.conversions,
        revenue: metrics.revenue,
        spend: metrics.spend,
        clicks: metrics.clicks,
        impressions: metrics.impressions
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }

  /**
   * 月別データを集計
   */
  static aggregateByMonth(data: MetaInsightsData[]): PeriodData[] {
    const monthMap = new Map<string, {
      revenue: number
      spend: number
      conversions: number
      clicks: number
      impressions: number
    }>()

    data.forEach(item => {
      const dateValue = item.date_start || item.dateStart || ''
      if (!dateValue || typeof dateValue !== 'string') return
      const date = dateValue

      const monthKey = date.substring(0, 7) // YYYY-MM形式
      const existing = monthMap.get(monthKey) || {
        revenue: 0,
        spend: 0,
        conversions: 0,
        clicks: 0,
        impressions: 0
      }

      monthMap.set(monthKey, {
        revenue: existing.revenue + Number(item.conversion_value || 0),
        spend: existing.spend + Number(item.spend || 0),
        conversions: existing.conversions + Number(item.conversions || 0),
        clicks: existing.clicks + Number(item.clicks || 0),
        impressions: existing.impressions + Number(item.impressions || 0)
      })
    })

    return Array.from(monthMap.entries())
      .map(([month, metrics]) => ({
        date: `${month}-01`,
        roas: this.calculateROAS(metrics.revenue, metrics.spend),
        cpa: this.calculateCPA(metrics.spend, metrics.conversions),
        cvr: this.calculateCVR(metrics.conversions, metrics.clicks),
        ctr: this.calculateCTR(metrics.clicks, metrics.impressions),
        conversions: metrics.conversions,
        revenue: metrics.revenue,
        spend: metrics.spend,
        clicks: metrics.clicks,
        impressions: metrics.impressions
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }

  /**
   * 週のキーを取得
   */
  private static getWeekKey(dateStr: string): string {
    const date = new Date(dateStr)
    const year = date.getFullYear()
    const weekNum = this.getWeekNumber(date)
    return `${year}-W${weekNum.toString().padStart(2, '0')}`
  }

  /**
   * 週の開始日を取得
   */
  private static getWeekStartDate(dateStr: string): string {
    const date = new Date(dateStr)
    const day = date.getDay()
    const diff = date.getDate() - day + (day === 0 ? -6 : 1) // 月曜日開始
    const weekStart = new Date(date.setDate(diff))
    return weekStart.toISOString().split('T')[0]
  }

  /**
   * 週番号を取得
   */
  private static getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
    const dayNum = d.getUTCDay() || 7
    d.setUTCDate(d.getUTCDate() + 4 - dayNum)
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  }
}