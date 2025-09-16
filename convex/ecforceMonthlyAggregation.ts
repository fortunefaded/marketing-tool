import { v } from 'convex/values'
import { mutation, query, internalMutation } from './_generated/server'

// 月次集計を生成・更新（バッチ処理用）
export const generateMonthlyAggregates = internalMutation({
  handler: async (ctx) => {
    console.log('月次集計バッチ処理開始')

    // すべての日次データを取得
    const allData = await ctx.db.query('ecforcePerformance').collect()

    // 年月と広告主でグループ化
    const aggregateMap = new Map<string, any>()

    allData.forEach((item) => {
      const yearMonth = item.dataDate.substring(0, 7)
      const key = `${yearMonth}_${item.advertiser}`

      if (!aggregateMap.has(key)) {
        aggregateMap.set(key, {
          yearMonth,
          advertiser: item.advertiser,
          advertiserNormalized: item.advertiserNormalized,
          totalOrderAmount: 0,
          totalSalesAmount: 0,
          totalCost: 0,
          totalAccessCount: 0,
          totalCvOrder: 0,
          totalCvPayment: 0,
          totalCvThanksUpsell: 0,
          dataPoints: 0,
          firstDate: item.dataDate,
          lastDate: item.dataDate,
        })
      }

      const agg = aggregateMap.get(key)
      agg.totalOrderAmount += item.orderAmount || 0
      agg.totalSalesAmount += item.salesAmount || 0
      agg.totalCost += item.cost || 0
      agg.totalAccessCount += item.accessCount || 0
      agg.totalCvOrder += item.cvOrder || 0
      agg.totalCvPayment += item.cvPayment || 0
      agg.totalCvThanksUpsell += item.cvThanksUpsell || 0
      agg.dataPoints++

      // 日付範囲の更新
      if (item.dataDate < agg.firstDate) agg.firstDate = item.dataDate
      if (item.dataDate > agg.lastDate) agg.lastDate = item.dataDate
    })

    // 既存の月次集計をクリア
    const existingAggregates = await ctx.db.query('ecforceMonthlyAggregates').collect()
    for (const existing of existingAggregates) {
      await ctx.db.delete(existing._id)
    }

    // 新しい月次集計を保存
    let savedCount = 0
    for (const [key, agg] of aggregateMap) {
      // 平均値と比率を計算
      const avgCvrOrder = agg.totalAccessCount > 0 ? agg.totalCvOrder / agg.totalAccessCount : 0
      const avgCvrPayment = agg.totalAccessCount > 0 ? agg.totalCvPayment / agg.totalAccessCount : 0
      const avgPaymentRate = agg.totalCvOrder > 0 ? agg.totalCvPayment / agg.totalCvOrder : 0
      const avgRealCPA = agg.totalCvPayment > 0 ? agg.totalCost / agg.totalCvPayment : 0
      const avgRoas = agg.totalCost > 0 ? agg.totalSalesAmount / agg.totalCost : 0

      await ctx.db.insert('ecforceMonthlyAggregates', {
        ...agg,
        avgCvrOrder,
        avgCvrPayment,
        avgPaymentRate,
        avgRealCPA,
        avgRoas,
        aggregateHash: key,
        createdAt: Date.now(),
      })
      savedCount++
    }

    console.log(`月次集計完了: ${savedCount}件を保存`)
    return { success: true, count: savedCount }
  },
})

// 特定月の集計を更新（インクリメンタル更新用）
export const updateMonthlyAggregate = mutation({
  args: {
    yearMonth: v.string(),
    advertiser: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // 指定月のデータを取得
    const startDate = `${args.yearMonth}-01`
    const [year, month] = args.yearMonth.split('-').map(Number)
    const lastDay = new Date(year, month, 0).getDate()
    const endDate = `${args.yearMonth}-${lastDay.toString().padStart(2, '0')}`

    let query = ctx.db
      .query('ecforcePerformance')
      .withIndex('by_date')
      .filter((q) =>
        q.and(
          q.gte(q.field('dataDate'), startDate),
          q.lte(q.field('dataDate'), endDate)
        )
      )

    let data = await query.collect()

    // 広告主フィルタ
    if (args.advertiser) {
      const normalizedAdvertiser = args.advertiser.toLowerCase().replace(/\s+/g, '')
      data = data.filter((item) => item.advertiserNormalized === normalizedAdvertiser)
    }

    // 広告主ごとに集計
    const advertiserMap = new Map<string, any>()

    data.forEach((item) => {
      if (!advertiserMap.has(item.advertiser)) {
        advertiserMap.set(item.advertiser, {
          yearMonth: args.yearMonth,
          advertiser: item.advertiser,
          advertiserNormalized: item.advertiserNormalized,
          totalOrderAmount: 0,
          totalSalesAmount: 0,
          totalCost: 0,
          totalAccessCount: 0,
          totalCvOrder: 0,
          totalCvPayment: 0,
          totalCvThanksUpsell: 0,
          dataPoints: 0,
          firstDate: item.dataDate,
          lastDate: item.dataDate,
        })
      }

      const agg = advertiserMap.get(item.advertiser)
      agg.totalOrderAmount += item.orderAmount || 0
      agg.totalSalesAmount += item.salesAmount || 0
      agg.totalCost += item.cost || 0
      agg.totalAccessCount += item.accessCount || 0
      agg.totalCvOrder += item.cvOrder || 0
      agg.totalCvPayment += item.cvPayment || 0
      agg.totalCvThanksUpsell += item.cvThanksUpsell || 0
      agg.dataPoints++

      if (item.dataDate < agg.firstDate) agg.firstDate = item.dataDate
      if (item.dataDate > agg.lastDate) agg.lastDate = item.dataDate
    })

    // 既存の集計を更新または新規作成
    let updatedCount = 0
    for (const [advertiser, agg] of advertiserMap) {
      const hash = `${args.yearMonth}_${advertiser}`

      // 既存レコードを検索
      const existing = await ctx.db
        .query('ecforceMonthlyAggregates')
        .withIndex('by_year_month_advertiser', (q) =>
          q.eq('yearMonth', args.yearMonth).eq('advertiserNormalized', agg.advertiserNormalized)
        )
        .first()

      // 平均値と比率を計算
      const avgCvrOrder = agg.totalAccessCount > 0 ? agg.totalCvOrder / agg.totalAccessCount : 0
      const avgCvrPayment = agg.totalAccessCount > 0 ? agg.totalCvPayment / agg.totalAccessCount : 0
      const avgPaymentRate = agg.totalCvOrder > 0 ? agg.totalCvPayment / agg.totalCvOrder : 0
      const avgRealCPA = agg.totalCvPayment > 0 ? agg.totalCost / agg.totalCvPayment : 0
      const avgRoas = agg.totalCost > 0 ? agg.totalSalesAmount / agg.totalCost : 0

      if (existing) {
        // 更新
        await ctx.db.patch(existing._id, {
          ...agg,
          avgCvrOrder,
          avgCvrPayment,
          avgPaymentRate,
          avgRealCPA,
          avgRoas,
        })
      } else {
        // 新規作成
        await ctx.db.insert('ecforceMonthlyAggregates', {
          ...agg,
          avgCvrOrder,
          avgCvrPayment,
          avgPaymentRate,
          avgRealCPA,
          avgRoas,
          aggregateHash: hash,
          createdAt: Date.now(),
        })
      }
      updatedCount++
    }

    return { success: true, updatedCount }
  },
})

// 月次集計データ取得（高速）
export const getMonthlyAggregatedDataFast = query({
  args: {
    startMonth: v.optional(v.string()), // YYYY-MM形式
    endMonth: v.optional(v.string()),
    advertiser: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // デフォルト期間設定
    const endMonth = args.endMonth || new Date().toISOString().substring(0, 7)
    const startMonth = args.startMonth ||
      new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().substring(0, 7)

    // 月次集計テーブルから取得
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

    // ソート（新しい順）
    results.sort((a, b) => b.yearMonth.localeCompare(a.yearMonth))

    return {
      data: results.map((r) => ({
        yearMonth: r.yearMonth,
        advertiser: r.advertiser,
        orderAmount: r.totalOrderAmount,
        salesAmount: r.totalSalesAmount,
        cost: r.totalCost,
        accessCount: r.totalAccessCount,
        cvOrder: r.totalCvOrder,
        cvPayment: r.totalCvPayment,
        cvThanksUpsell: r.totalCvThanksUpsell,
        cvrOrder: r.avgCvrOrder,
        cvrPayment: r.avgCvrPayment,
        paymentRate: r.avgPaymentRate,
        realCPA: r.avgRealCPA,
        roas: r.avgRoas,
        dataPoints: r.dataPoints,
      })),
      total: results.length,
      dateRange: {
        start: startMonth,
        end: endMonth,
      },
      fromCache: true, // キャッシュから取得したことを示す
    }
  },
})

// 最後の集計更新日時を取得
export const getLastAggregationTime = query({
  handler: async (ctx) => {
    const latest = await ctx.db
      .query('ecforceMonthlyAggregates')
      .order('desc')
      .first()

    if (!latest) return null

    return {
      updatedAt: latest.createdAt,
      totalRecords: await ctx.db.query('ecforceMonthlyAggregates').collect().then(r => r.length),
    }
  },
})