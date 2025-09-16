import { v } from 'convex/values'
import { query } from './_generated/server'

// 期間比較データ取得
export const getPeriodComparison = query({
  args: {
    period1Start: v.string(),
    period1End: v.string(),
    period2Start: v.string(),
    period2End: v.string(),
    advertiser: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Period 1のデータ取得
    let period1Query = ctx.db
      .query('ecforcePerformance')
      .withIndex('by_date')
      .filter((q) =>
        q.and(
          q.gte(q.field('dataDate'), args.period1Start),
          q.lte(q.field('dataDate'), args.period1End)
        )
      )

    let period1Data = await period1Query.collect()

    // Period 2のデータ取得
    let period2Query = ctx.db
      .query('ecforcePerformance')
      .withIndex('by_date')
      .filter((q) =>
        q.and(
          q.gte(q.field('dataDate'), args.period2Start),
          q.lte(q.field('dataDate'), args.period2End)
        )
      )

    let period2Data = await period2Query.collect()

    // 広告主フィルタリング
    if (args.advertiser) {
      const normalizedAdvertiser = args.advertiser.toLowerCase().replace(/\s+/g, '')
      period1Data = period1Data.filter((item) => item.advertiserNormalized === normalizedAdvertiser)
      period2Data = period2Data.filter((item) => item.advertiserNormalized === normalizedAdvertiser)
    }

    // 期間1の集計
    const period1Stats = calculatePeriodStats(period1Data)

    // 期間2の集計
    const period2Stats = calculatePeriodStats(period2Data)

    // 変化率計算
    const changes = calculateChanges(period1Stats, period2Stats)

    return {
      period1: {
        ...period1Stats,
        startDate: args.period1Start,
        endDate: args.period1End,
        days: calculateDays(args.period1Start, args.period1End),
      },
      period2: {
        ...period2Stats,
        startDate: args.period2Start,
        endDate: args.period2End,
        days: calculateDays(args.period2Start, args.period2End),
      },
      changes,
    }
  },
})

// トレンドデータ取得
export const getTrendData = query({
  args: {
    startDate: v.string(),
    endDate: v.string(),
    advertiser: v.optional(v.string()),
    granularity: v.optional(v.union(v.literal('daily'), v.literal('weekly'), v.literal('monthly'))),
  },
  handler: async (ctx, args) => {
    const granularity = args.granularity || 'daily'

    // データ取得
    let query = ctx.db
      .query('ecforcePerformance')
      .withIndex('by_date')
      .filter((q) =>
        q.and(
          q.gte(q.field('dataDate'), args.startDate),
          q.lte(q.field('dataDate'), args.endDate)
        )
      )

    let data = await query.collect()

    // 広告主フィルタリング
    if (args.advertiser) {
      const normalizedAdvertiser = args.advertiser.toLowerCase().replace(/\s+/g, '')
      data = data.filter((item) => item.advertiserNormalized === normalizedAdvertiser)
    }

    // 粒度に応じた集計
    if (granularity === 'daily') {
      // 日別集計（広告主ごとの合計）
      const dailyMap = new Map<string, any>()

      data.forEach((item) => {
        const key = item.dataDate
        if (!dailyMap.has(key)) {
          dailyMap.set(key, {
            date: key,
            orderAmount: 0,
            salesAmount: 0,
            cost: 0,
            accessCount: 0,
            cvOrder: 0,
            cvPayment: 0,
          })
        }

        const day = dailyMap.get(key)
        day.orderAmount += item.orderAmount || 0
        day.salesAmount += item.salesAmount || 0
        day.cost += item.cost || 0
        day.accessCount += item.accessCount || 0
        day.cvOrder += item.cvOrder || 0
        day.cvPayment += item.cvPayment || 0
      })

      const trendData = Array.from(dailyMap.values()).map((day) => ({
        ...day,
        cvrOrder: day.accessCount > 0 ? day.cvOrder / day.accessCount : 0,
        cvrPayment: day.accessCount > 0 ? day.cvPayment / day.accessCount : 0,
        roas: day.cost > 0 ? day.salesAmount / day.cost : 0,
        cpa: day.cvPayment > 0 ? day.cost / day.cvPayment : 0,
      }))

      // 日付でソート
      trendData.sort((a, b) => a.date.localeCompare(b.date))

      return trendData
    } else if (granularity === 'weekly') {
      // 週別集計
      const weeklyMap = new Map<string, any>()

      data.forEach((item) => {
        const week = getWeekString(item.dataDate)
        if (!weeklyMap.has(week)) {
          weeklyMap.set(week, {
            week,
            orderAmount: 0,
            salesAmount: 0,
            cost: 0,
            accessCount: 0,
            cvOrder: 0,
            cvPayment: 0,
            dataPoints: 0,
          })
        }

        const weekData = weeklyMap.get(week)
        weekData.orderAmount += item.orderAmount || 0
        weekData.salesAmount += item.salesAmount || 0
        weekData.cost += item.cost || 0
        weekData.accessCount += item.accessCount || 0
        weekData.cvOrder += item.cvOrder || 0
        weekData.cvPayment += item.cvPayment || 0
        weekData.dataPoints++
      })

      const trendData = Array.from(weeklyMap.values()).map((week) => ({
        ...week,
        cvrOrder: week.accessCount > 0 ? week.cvOrder / week.accessCount : 0,
        cvrPayment: week.accessCount > 0 ? week.cvPayment / week.accessCount : 0,
        roas: week.cost > 0 ? week.salesAmount / week.cost : 0,
        cpa: week.cvPayment > 0 ? week.cost / week.cvPayment : 0,
      }))

      // 週でソート
      trendData.sort((a, b) => a.week.localeCompare(b.week))

      return trendData
    } else {
      // 月別集計
      const monthlyMap = new Map<string, any>()

      data.forEach((item) => {
        const month = item.dataDate.substring(0, 7)
        if (!monthlyMap.has(month)) {
          monthlyMap.set(month, {
            month,
            orderAmount: 0,
            salesAmount: 0,
            cost: 0,
            accessCount: 0,
            cvOrder: 0,
            cvPayment: 0,
            dataPoints: 0,
          })
        }

        const monthData = monthlyMap.get(month)
        monthData.orderAmount += item.orderAmount || 0
        monthData.salesAmount += item.salesAmount || 0
        monthData.cost += item.cost || 0
        monthData.accessCount += item.accessCount || 0
        monthData.cvOrder += item.cvOrder || 0
        monthData.cvPayment += item.cvPayment || 0
        monthData.dataPoints++
      })

      const trendData = Array.from(monthlyMap.values()).map((month) => ({
        ...month,
        cvrOrder: month.accessCount > 0 ? month.cvOrder / month.accessCount : 0,
        cvrPayment: month.accessCount > 0 ? month.cvPayment / month.accessCount : 0,
        roas: month.cost > 0 ? month.salesAmount / month.cost : 0,
        cpa: month.cvPayment > 0 ? month.cost / month.cvPayment : 0,
      }))

      // 月でソート
      trendData.sort((a, b) => a.month.localeCompare(b.month))

      return trendData
    }
  },
})

// KPIサマリー取得
export const getKPISummary = query({
  args: {
    startDate: v.string(),
    endDate: v.string(),
    advertiser: v.optional(v.string()),
    compareWithPrevious: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // 現在期間のデータ取得
    let currentQuery = ctx.db
      .query('ecforcePerformance')
      .withIndex('by_date')
      .filter((q) =>
        q.and(
          q.gte(q.field('dataDate'), args.startDate),
          q.lte(q.field('dataDate'), args.endDate)
        )
      )

    let currentData = await currentQuery.collect()

    // 広告主フィルタリング
    if (args.advertiser) {
      const normalizedAdvertiser = args.advertiser.toLowerCase().replace(/\s+/g, '')
      currentData = currentData.filter((item) => item.advertiserNormalized === normalizedAdvertiser)
    }

    const currentStats = calculatePeriodStats(currentData)

    // 前期間との比較
    let comparison = null
    if (args.compareWithPrevious) {
      const days = calculateDays(args.startDate, args.endDate)
      const previousStart = addDays(args.startDate, -days - 1)
      const previousEnd = addDays(args.endDate, -days - 1)

      let previousQuery = ctx.db
        .query('ecforcePerformance')
        .withIndex('by_date')
        .filter((q) =>
          q.and(
            q.gte(q.field('dataDate'), previousStart),
            q.lte(q.field('dataDate'), previousEnd)
          )
        )

      let previousData = await previousQuery.collect()

      if (args.advertiser) {
        const normalizedAdvertiser = args.advertiser.toLowerCase().replace(/\s+/g, '')
        previousData = previousData.filter((item) => item.advertiserNormalized === normalizedAdvertiser)
      }

      const previousStats = calculatePeriodStats(previousData)
      comparison = calculateChanges(previousStats, currentStats)
    }

    return {
      current: currentStats,
      comparison,
      period: {
        startDate: args.startDate,
        endDate: args.endDate,
        days: calculateDays(args.startDate, args.endDate),
      },
    }
  },
})

// ヘルパー関数：期間の統計計算
function calculatePeriodStats(data: any[]) {
  const stats = {
    orderAmount: 0,
    salesAmount: 0,
    cost: 0,
    accessCount: 0,
    cvOrder: 0,
    cvPayment: 0,
    cvThanksUpsell: 0,
    offerRateThanksUpsell: 0,
    dataPoints: data.length,
  }

  let totalOfferRateSum = 0
  let offerRateCount = 0

  data.forEach((item) => {
    stats.orderAmount += item.orderAmount || 0
    stats.salesAmount += item.salesAmount || 0
    stats.cost += item.cost || 0
    stats.accessCount += item.accessCount || 0
    stats.cvOrder += item.cvOrder || 0
    stats.cvPayment += item.cvPayment || 0
    stats.cvThanksUpsell += item.cvThanksUpsell || 0

    // オファー成功率の平均を計算
    if (item.offerRateThanksUpsell !== undefined && item.offerRateThanksUpsell !== null) {
      totalOfferRateSum += item.offerRateThanksUpsell
      offerRateCount++
    }
  })

  // オファー成功率の平均
  if (offerRateCount > 0) {
    stats.offerRateThanksUpsell = totalOfferRateSum / offerRateCount
  }

  // 計算指標（CVRは保持）
  const cvrOrder = stats.accessCount > 0 ? stats.cvOrder / stats.accessCount : 0
  const cvrPayment = stats.accessCount > 0 ? stats.cvPayment / stats.accessCount : 0
  const offerRateThanksUpsell = stats.offerRateThanksUpsell || 0

  return {
    ...stats,
    cvrOrder,
    cvrPayment,
    offerRateThanksUpsell,
  }
}

// ヘルパー関数：変化率計算
function calculateChanges(oldStats: any, newStats: any) {
  const calculateChange = (oldVal: number, newVal: number) => {
    if (oldVal === 0) return newVal > 0 ? 100 : 0
    return ((newVal - oldVal) / oldVal) * 100
  }

  return {
    orderAmount: calculateChange(oldStats.orderAmount, newStats.orderAmount),
    salesAmount: calculateChange(oldStats.salesAmount, newStats.salesAmount),
    cost: calculateChange(oldStats.cost, newStats.cost),
    accessCount: calculateChange(oldStats.accessCount, newStats.accessCount),
    cvOrder: calculateChange(oldStats.cvOrder, newStats.cvOrder),
    cvPayment: calculateChange(oldStats.cvPayment, newStats.cvPayment),
    cvThanksUpsell: calculateChange(oldStats.cvThanksUpsell, newStats.cvThanksUpsell),
    cvrOrder: calculateChange(oldStats.cvrOrder, newStats.cvrOrder),
    cvrPayment: calculateChange(oldStats.cvrPayment, newStats.cvrPayment),
    offerRateThanksUpsell: calculateChange(oldStats.offerRateThanksUpsell, newStats.offerRateThanksUpsell),
  }
}

// ヘルパー関数：日数計算
function calculateDays(startDate: string, endDate: string): number {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const diffTime = Math.abs(end.getTime() - start.getTime())
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
}

// ヘルパー関数：日付加算
function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr)
  date.setDate(date.getDate() + days)
  return date.toISOString().split('T')[0]
}

// ヘルパー関数：週文字列取得
function getWeekString(dateStr: string): string {
  const date = new Date(dateStr)
  const year = date.getFullYear()
  const onejan = new Date(year, 0, 1)
  const millisecsInDay = 86400000
  const dayOfYear = Math.ceil((date.getTime() - onejan.getTime()) / millisecsInDay)
  const weekNum = Math.ceil(dayOfYear / 7)
  return `${year}-W${weekNum.toString().padStart(2, '0')}`
}