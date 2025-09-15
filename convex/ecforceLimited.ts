import { v } from 'convex/values'
import { query } from './_generated/server'

// 設定画面用のデータ取得（制限付き）
export const getPerformanceDataLimited = query({
  args: {
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    advertiser: v.optional(v.string()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
    useMonthlyAggregates: v.optional(v.boolean()), // 月次集計を使用するか
  },
  handler: async (ctx, args) => {
    // 厳格な制限値
    const MAX_LIMIT = 50 // 最大50件（設定画面用）
    const DEFAULT_LIMIT = 5 // デフォルト5件（最新データのみ）
    const requestedLimit = Math.min(args.limit || DEFAULT_LIMIT, MAX_LIMIT)
    const offset = args.offset || 0

    // 月次集計を優先的に使用（パフォーマンス最適化）
    if (args.useMonthlyAggregates !== false) {
      // デフォルトで月次集計を使用

      // 日付範囲を年月に変換
      let yearMonthStart: string | undefined
      let yearMonthEnd: string | undefined

      if (args.startDate) {
        yearMonthStart = args.startDate.substring(0, 7)
      }
      if (args.endDate) {
        yearMonthEnd = args.endDate.substring(0, 7)
      }

      // 月次集計から取得
      let results: any[]

      if (yearMonthStart && yearMonthEnd) {
        results = await ctx.db
          .query('ecforceMonthlyAggregates')
          .withIndex('by_year_month')
          .filter((q) =>
            q.and(
              q.gte(q.field('yearMonth'), yearMonthStart!),
              q.lte(q.field('yearMonth'), yearMonthEnd!)
            )
          )
          .collect()
      } else if (yearMonthStart) {
        results = await ctx.db
          .query('ecforceMonthlyAggregates')
          .withIndex('by_year_month')
          .filter((q) => q.eq(q.field('yearMonth'), yearMonthStart!))
          .collect()
      } else {
        results = await ctx.db.query('ecforceMonthlyAggregates').collect()
      }

      if (args.advertiser) {
        const normalizedAdvertiser = args.advertiser.toLowerCase().replace(/\s+/g, '')
        results = results.filter((r) => r.advertiserNormalized === normalizedAdvertiser)
      }

      // ソート（新しい順）
      results.sort((a, b) => {
        if (a.yearMonth > b.yearMonth) return -1
        if (a.yearMonth < b.yearMonth) return 1
        return 0
      })

      // ページネーション
      const paginatedResults = results.slice(offset, offset + requestedLimit)

      return {
        data: paginatedResults.map((r) => ({
          // 月次集計データを日次データ風に変換
          dataDate: `${r.yearMonth}-01`,
          yearMonth: r.yearMonth,
          advertiser: r.advertiser,
          advertiserNormalized: r.advertiserNormalized,
          orderAmount: r.totalOrderAmount,
          salesAmount: r.totalSalesAmount,
          cost: r.totalCost,
          accessCount: r.totalAccessCount,
          cvOrder: r.totalCvOrder,
          cvPayment: r.totalCvPayment,
          cvrOrder: r.avgCvrOrder,
          cvrPayment: r.avgCvrPayment,
          paymentRate: r.avgPaymentRate,
          realCPA: r.avgRealCPA,
          roas: r.avgRoas,
          isMonthlyAggregate: true, // 月次集計データであることを示すフラグ
          dataPoints: r.dataPoints, // 集計に使用したデータポイント数
        })),
        total: results.length,
        hasMore: offset + requestedLimit < results.length,
        limit: requestedLimit,
        offset,
        dataType: 'monthly', // データタイプを明示
        message:
          '月次集計データを表示しています。日次データが必要な場合は、useMonthlyAggregates: false を指定してください。',
      }
    }

    // 日次データを取得（明示的に指定された場合のみ）
    // 期間指定がない場合は直近30日のみ
    const today = new Date()
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
    const defaultStartDate = args.startDate || thirtyDaysAgo.toISOString().split('T')[0]
    const defaultEndDate = args.endDate || today.toISOString().split('T')[0]

    // 日付範囲でフィルタ
    const query = ctx.db
      .query('ecforcePerformance')
      .withIndex('by_date')
      .filter((q) =>
        q.and(
          q.gte(q.field('dataDate'), defaultStartDate),
          q.lte(q.field('dataDate'), defaultEndDate)
        )
      )

    let allData = await query.collect()

    // 広告主フィルタ
    if (args.advertiser) {
      const normalizedAdvertiser = args.advertiser.toLowerCase().replace(/\s+/g, '')
      allData = allData.filter((item) => item.advertiserNormalized === normalizedAdvertiser)
    }

    // ソート（新しい順）
    allData.sort((a, b) => {
      if (a.dataDate > b.dataDate) return -1
      if (a.dataDate < b.dataDate) return 1
      return 0
    })

    // ページネーション
    const paginatedData = allData.slice(offset, offset + requestedLimit)

    return {
      data: paginatedData,
      total: allData.length,
      hasMore: offset + requestedLimit < allData.length,
      limit: requestedLimit,
      offset,
      dataType: 'daily',
      dateRange: {
        start: defaultStartDate,
        end: defaultEndDate,
      },
      message:
        allData.length === 0
          ? '指定された期間にデータがありません。'
          : allData.length >= MAX_LIMIT
            ? `表示件数が制限されています（最大${MAX_LIMIT}件）。詳細なデータが必要な場合は期間を絞り込んでください。`
            : undefined,
    }
  },
})

// インポート履歴の取得（最新10件のみ）
export const getRecentImports = query({
  handler: async (ctx) => {
    const imports = await ctx.db.query('ecforceImports').withIndex('by_date').order('desc').take(10)

    return imports.map((imp: any) => ({
      importId: imp.importId,
      fileName: imp.fileName,
      dataDate: imp.dataDate,
      status: imp.status,
      totalRows: imp.totalRows,
      successRows: imp.successRows,
      errorRows: imp.errorRows,
      startedAt: imp.startedAt,
      completedAt: imp.completedAt,
    }))
  },
})

// データ統計情報の取得（軽量版）
export const getDataStatistics = query({
  handler: async (ctx) => {
    // 月次集計から統計を取得（高速）
    const monthlyAggregates = await ctx.db.query('ecforceMonthlyAggregates').collect()

    if (monthlyAggregates.length === 0) {
      return {
        totalRecords: 0,
        dateRange: null,
        advertisers: [],
        monthlyDataAvailable: false,
      }
    }

    // 年月のリスト
    const yearMonths = [...new Set(monthlyAggregates.map((a) => a.yearMonth))].sort()

    // 広告主のリスト
    const advertisers = [...new Set(monthlyAggregates.map((a) => a.advertiser))]

    // 総レコード数（推定）
    const totalDataPoints = monthlyAggregates.reduce((sum, a) => sum + a.dataPoints, 0)

    return {
      totalRecords: totalDataPoints,
      dateRange: {
        start: yearMonths[0],
        end: yearMonths[yearMonths.length - 1],
      },
      advertisers,
      monthlyDataAvailable: true,
      monthlyAggregateCount: monthlyAggregates.length,
      yearMonths,
    }
  },
})
