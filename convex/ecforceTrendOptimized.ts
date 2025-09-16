import { v } from 'convex/values'
import { query } from './_generated/server'

// 最適化されたトレンドデータ取得（キャッシュとページング対応）
export const getTrendDataOptimized = query({
  args: {
    startDate: v.string(),
    endDate: v.string(),
    advertiser: v.optional(v.string()),
    granularity: v.optional(v.union(v.literal('daily'), v.literal('weekly'), v.literal('monthly'))),
  },
  handler: async (ctx, args) => {
    const granularity = args.granularity || 'daily'

    // 月別集計の場合は、事前計算された月次集計テーブルから取得（高速）
    if (granularity === 'monthly') {
      const startMonth = args.startDate.substring(0, 7)
      const endMonth = args.endDate.substring(0, 7)

      let results = await ctx.db
        .query('ecforceMonthlyAggregates')
        .withIndex('by_year_month')
        .filter((q) =>
          q.and(
            q.gte(q.field('yearMonth'), startMonth),
            q.lte(q.field('yearMonth'), endMonth)
          )
        )
        .collect()

      // 広告主フィルタ
      if (args.advertiser) {
        const normalizedAdvertiser = args.advertiser.toLowerCase().replace(/\s+/g, '')
        results = results.filter((r) => r.advertiserNormalized === normalizedAdvertiser)
      }

      // 月別に集計（同じ月の複数広告主を合算）
      const monthlyMap = new Map<string, any>()

      results.forEach((item) => {
        const month = item.yearMonth
        if (!monthlyMap.has(month)) {
          monthlyMap.set(month, {
            month,
            date: `${month}-01`, // グラフ表示用
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
        monthData.orderAmount += item.totalOrderAmount || 0
        monthData.salesAmount += item.totalSalesAmount || 0
        monthData.cost += item.totalCost || 0
        monthData.accessCount += item.totalAccessCount || 0
        monthData.cvOrder += item.totalCvOrder || 0
        monthData.cvPayment += item.totalCvPayment || 0
        monthData.dataPoints += item.dataPoints || 0
      })

      const trendData = Array.from(monthlyMap.values()).map((month) => ({
        ...month,
        cvrOrder: month.accessCount > 0 ? month.cvOrder / month.accessCount : 0,
        cvrPayment: month.accessCount > 0 ? month.cvPayment / month.accessCount : 0,
      }))

      // ソート
      trendData.sort((a, b) => a.month.localeCompare(b.month))

      console.log(`月次トレンドデータ取得完了: ${trendData.length}ヶ月分`)
      return trendData
    }

    // 日別・週別の場合は、ページング処理で取得
    const BATCH_SIZE = 500 // バッチサイズを制限
    let allData: any[] = []
    let hasMore = true
    let lastId: any = null

    while (hasMore) {
      let query = ctx.db
        .query('ecforcePerformance')
        .withIndex('by_date')
        .filter((q) => {
          const conditions = [
            q.gte(q.field('dataDate'), args.startDate),
            q.lte(q.field('dataDate'), args.endDate)
          ]

          // ページング用のカーソル
          if (lastId) {
            conditions.push(q.gt(q.field('_id'), lastId))
          }

          return q.and(...conditions)
        })
        .take(BATCH_SIZE)

      const batch = await query

      if (batch.length === 0) {
        hasMore = false
      } else {
        // 広告主フィルタリング
        let filteredBatch = batch
        if (args.advertiser) {
          const normalizedAdvertiser = args.advertiser.toLowerCase().replace(/\s+/g, '')
          filteredBatch = batch.filter((item: any) => item.advertiserNormalized === normalizedAdvertiser)
        }

        allData = allData.concat(filteredBatch)
        lastId = batch[batch.length - 1]._id

        // バッチサイズより少ない場合は終了
        if (batch.length < BATCH_SIZE) {
          hasMore = false
        }
      }

      // メモリ使用量を抑えるため、大量データの場合は早期終了
      if (allData.length > 10000) {
        console.warn('データ量が多すぎるため、最初の10000件のみ処理します')
        break
      }
    }

    console.log(`取得したデータ件数: ${allData.length}`)

    // 粒度に応じた集計
    if (granularity === 'daily') {
      // 日別集計
      const dailyMap = new Map<string, any>()

      allData.forEach((item) => {
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
            cvThanksUpsell: 0,
            offerRateThanksUpsell: 0,
            offerRateCount: 0,
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
      }))

      // 日付でソート
      trendData.sort((a, b) => a.date.localeCompare(b.date))

      return trendData
    } else {
      // 週別集計
      const weeklyMap = new Map<string, any>()

      allData.forEach((item) => {
        const week = getWeekString(item.dataDate)
        if (!weeklyMap.has(week)) {
          weeklyMap.set(week, {
            week,
            date: week, // グラフ表示用
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
      }))

      // 週でソート
      trendData.sort((a, b) => a.week.localeCompare(b.week))

      return trendData
    }
  },
})

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

// データ存在確認（軽量版）
export const checkDataAvailability = query({
  args: {
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    // 期間内のデータ数を確認（最初の1件のみ取得）
    const sample = await ctx.db
      .query('ecforcePerformance')
      .withIndex('by_date')
      .filter((q) =>
        q.and(
          q.gte(q.field('dataDate'), args.startDate),
          q.lte(q.field('dataDate'), args.endDate)
        )
      )
      .first()

    if (!sample) {
      return {
        hasData: false,
        message: 'この期間にはデータが存在しません',
      }
    }

    // 期間内の大まかなデータ量を推定
    const days = Math.ceil(
      (new Date(args.endDate).getTime() - new Date(args.startDate).getTime()) / (1000 * 60 * 60 * 24)
    )

    return {
      hasData: true,
      estimatedDays: days + 1,
      startDate: args.startDate,
      endDate: args.endDate,
    }
  },
})