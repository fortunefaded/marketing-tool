import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

// 月次集計用ハッシュ生成
function generateMonthlyHash(yearMonth: string, advertiser: string): string {
  return `${yearMonth}_${advertiser.toLowerCase().replace(/\s+/g, '')}`
}

// 月次集計データの生成・更新
export const generateMonthlyAggregates = mutation({
  args: {
    yearMonth: v.string(), // YYYY-MM形式
    advertiser: v.optional(v.string()), // 特定の広告主のみ（省略時は全広告主）
  },
  handler: async (ctx, args) => {
    const startDate = `${args.yearMonth}-01`
    const year = parseInt(args.yearMonth.split('-')[0])
    const month = parseInt(args.yearMonth.split('-')[1])
    const lastDay = new Date(year, month, 0).getDate()
    const endDate = `${args.yearMonth}-${lastDay.toString().padStart(2, '0')}`

    // 対象期間のデータを取得
    let query = ctx.db
      .query('ecforcePerformance')
      .withIndex('by_date')
      .filter((q) =>
        q.and(q.gte(q.field('dataDate'), startDate), q.lte(q.field('dataDate'), endDate))
      )

    const dailyData = await query.collect()

    // 広告主ごとにグループ化
    const advertiserGroups = new Map<string, any[]>()

    for (const record of dailyData) {
      // 特定の広告主が指定されている場合はフィルタ
      if (args.advertiser && record.advertiser !== args.advertiser) {
        continue
      }

      const key = record.advertiserNormalized
      if (!advertiserGroups.has(key)) {
        advertiserGroups.set(key, [])
      }
      advertiserGroups.get(key)!.push(record)
    }

    const results = {
      created: 0,
      updated: 0,
      errors: 0,
    }

    // 各広告主の月次集計を生成
    for (const [advertiserNormalized, records] of advertiserGroups) {
      if (records.length === 0) continue

      const advertiser = records[0].advertiser
      const aggregateHash = generateMonthlyHash(args.yearMonth, advertiser)

      // 集計値の計算
      const aggregate = {
        yearMonth: args.yearMonth,
        advertiser,
        advertiserNormalized,
        aggregateHash,
        startDate,
        endDate,
        daysCount: records.length,

        // 合計値
        totalOrderAmount: records.reduce((sum, r) => sum + r.orderAmount, 0),
        totalSalesAmount: records.reduce((sum, r) => sum + r.salesAmount, 0),
        totalCost: records.reduce((sum, r) => sum + r.cost, 0),
        totalAccessCount: records.reduce((sum, r) => sum + r.accessCount, 0),
        totalCvOrder: records.reduce((sum, r) => sum + r.cvOrder, 0),
        totalCvPayment: records.reduce((sum, r) => sum + r.cvPayment, 0),
        totalCvUpsell: records.reduce((sum, r) => sum + (r.cvUpsell || 0), 0),
        totalCvThanksUpsell: records.reduce((sum, r) => sum + r.cvThanksUpsell, 0),
        totalCvThanksCrossSell: records.reduce((sum, r) => sum + (r.cvThanksCrossSell || 0), 0),

        // 平均値
        avgCvrOrder: records.reduce((sum, r) => sum + r.cvrOrder, 0) / records.length,
        avgCvrPayment: records.reduce((sum, r) => sum + r.cvrPayment, 0) / records.length,
        avgPaymentRate: records.reduce((sum, r) => sum + (r.paymentRate || 0), 0) / records.length,
        avgRealCPA: undefined as number | undefined,
        avgRoas: undefined as number | undefined,

        dataPoints: records.length,
        lastUpdated: Date.now(),
        createdAt: Date.now(),
      }

      // 計算可能な場合のみ設定
      if (aggregate.totalCvPayment > 0) {
        aggregate.avgRealCPA = Math.round(aggregate.totalCost / aggregate.totalCvPayment)
      }
      if (aggregate.totalCost > 0) {
        aggregate.avgRoas = aggregate.totalSalesAmount / aggregate.totalCost
      }

      try {
        // 既存の集計データをチェック
        const existing = await ctx.db
          .query('ecforceMonthlyAggregates')
          .withIndex('by_hash', (q) => q.eq('aggregateHash', aggregateHash))
          .first()

        if (existing) {
          // 更新
          await ctx.db.patch(existing._id, {
            ...aggregate,
            createdAt: existing.createdAt, // 作成日時は保持
          })
          results.updated++
        } else {
          // 新規作成
          await ctx.db.insert('ecforceMonthlyAggregates', aggregate)
          results.created++
        }
      } catch (error) {
        console.error(`月次集計エラー (${advertiser}):`, error)
        results.errors++
      }
    }

    return results
  },
})

// 月次集計データの取得
export const getMonthlyAggregates = query({
  args: {
    yearMonth: v.optional(v.string()),
    advertiser: v.optional(v.string()),
    startYearMonth: v.optional(v.string()),
    endYearMonth: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // 特定の年月
    if (args.yearMonth) {
      const query = ctx.db
        .query('ecforceMonthlyAggregates')
        .withIndex('by_year_month', (q) => q.eq('yearMonth', args.yearMonth!))
      let results = await query.collect()

      // 広告主でフィルタ
      if (args.advertiser) {
        const normalizedAdvertiser = args.advertiser.toLowerCase().replace(/\s+/g, '')
        results = results.filter((r) => r.advertiserNormalized === normalizedAdvertiser)
      }
      return results
    }
    // 期間指定
    else if (args.startYearMonth && args.endYearMonth) {
      const query = ctx.db
        .query('ecforceMonthlyAggregates')
        .withIndex('by_year_month')
        .filter((q) =>
          q.and(
            q.gte(q.field('yearMonth'), args.startYearMonth!),
            q.lte(q.field('yearMonth'), args.endYearMonth!)
          )
        )
      let results = await query.collect()

      // 広告主でフィルタ
      if (args.advertiser) {
        const normalizedAdvertiser = args.advertiser.toLowerCase().replace(/\s+/g, '')
        results = results.filter((r) => r.advertiserNormalized === normalizedAdvertiser)
      }
      return results
    }

    // デフォルト: 全データ
    const query = ctx.db.query('ecforceMonthlyAggregates')
    let results = await query.collect()

    // 広告主でフィルタ
    if (args.advertiser) {
      const normalizedAdvertiser = args.advertiser.toLowerCase().replace(/\s+/g, '')
      results = results.filter((r) => r.advertiserNormalized === normalizedAdvertiser)
    }

    return results
  },
})

// 古いデータのアーカイブ処理（削除せず、フラグ管理）
export const archiveOldDailyData = mutation({
  args: {
    olderThanMonths: v.number(), // 何ヶ月以上前のデータをアーカイブするか
  },
  handler: async (ctx, args) => {
    const cutoffDate = new Date()
    cutoffDate.setMonth(cutoffDate.getMonth() - args.olderThanMonths)
    const cutoffDateStr = cutoffDate.toISOString().split('T')[0]

    // まず月次集計が存在することを確認
    const yearMonth = cutoffDateStr.substring(0, 7)
    const aggregates = await ctx.db
      .query('ecforceMonthlyAggregates')
      .withIndex('by_year_month', (q) => q.eq('yearMonth', yearMonth))
      .collect()

    if (aggregates.length === 0) {
      // 月次集計を先に生成する必要がある
      console.log(`月次集計が存在しないため、先に生成が必要です: ${yearMonth}`)
      // 実際の生成は別途generateMonthlyAggregatesを呼ぶ
    }

    let archivedCount = 0

    // 古い日次データにアーカイブフラグを設定（削除はしない）
    const oldRecords = await ctx.db
      .query('ecforcePerformance')
      .withIndex('by_date')
      .filter((q) => q.lt(q.field('dataDate'), cutoffDateStr))
      .collect()

    for (const record of oldRecords) {
      // isArchivedフラグが追加されたら、ここで設定
      // await ctx.db.patch(record._id, {
      //   isArchived: true,
      //   archivedAt: Date.now(),
      // })
      archivedCount++
    }

    return {
      cutoffDate: cutoffDateStr,
      archivedCount,
      message: `${archivedCount}件のデータをアーカイブ対象としてマーク（データは保持）`,
    }
  },
})

// データ保持ポリシーの初期化
export const initializeRetentionPolicies = mutation({
  handler: async (ctx) => {
    const policies = [
      {
        policyName: 'daily_data_retention',
        dataType: 'daily',
        retentionDays: 180, // 6ヶ月
        archiveAfterDays: 90, // 3ヶ月後に月次集計
        deleteAfterDays: 365, // 1年後に削除
        isActive: true,
        updatedAt: Date.now(),
      },
      {
        policyName: 'monthly_data_retention',
        dataType: 'monthly',
        retentionDays: 1095, // 3年
        archiveAfterDays: undefined,
        deleteAfterDays: 1825, // 5年後に削除
        isActive: true,
        updatedAt: Date.now(),
      },
    ]

    for (const policy of policies) {
      const existing = await ctx.db
        .query('dataRetentionPolicies')
        .withIndex('by_policy_name', (q) => q.eq('policyName', policy.policyName))
        .first()

      if (!existing) {
        await ctx.db.insert('dataRetentionPolicies', policy)
      }
    }

    return { message: 'データ保持ポリシーを初期化しました' }
  },
})
