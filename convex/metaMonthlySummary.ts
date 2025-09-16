import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

// 月次サマリーを取得（過去3ヶ月分）
export const getMonthlySummaries = query({
  args: {
    accountId: v.string(),
  },
  handler: async (ctx, args) => {
    const now = new Date()
    const months: string[] = []

    // 過去3ヶ月分の年月を生成（現在月を含む）
    for (let i = 2; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      months.push(yearMonth)
    }

    // デバッグ情報
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    console.log('📊 現在月:', currentMonth)
    console.log('📊 取得対象月:', months)

    // 各月のサマリーを取得
    const summaries = await Promise.all(
      months.map(async (yearMonth) => {
        // キャッシュから取得を試みる
        const cached = await ctx.db
          .query('metaMonthlySummary')
          .withIndex('by_account_month', (q) =>
            q.eq('accountId', args.accountId).eq('yearMonth', yearMonth)
          )
          .first()

        if (cached) {
          console.log(`✅ ${yearMonth}: キャッシュから取得`)
          return {
            yearMonth,
            data: cached,
            source: 'cache' as const,
          }
        }

        // キャッシュがない場合は null を返す（クライアント側でAPI取得をトリガー）
        console.log(`⚠️ ${yearMonth}: キャッシュなし`)
        return {
          yearMonth,
          data: null,
          source: 'missing' as const,
        }
      })
    )

    return summaries
  },
})

// 月次サマリーを生成・保存
export const generateMonthlySummary = mutation({
  args: {
    accountId: v.string(),
    yearMonth: v.string(),
    data: v.object({
      totalAds: v.number(),
      avgFrequency: v.number(),
      totalReach: v.number(),
      totalImpressions: v.number(),
      totalClicks: v.number(),
      avgCtr: v.number(),
      avgUctr: v.optional(v.number()),
      avgCpc: v.number(),
      totalSpend: v.number(),
      totalFcv: v.optional(v.number()),
      totalCv: v.number(),
      totalCvOrder: v.optional(v.number()),  // 受注CV（追加）
      avgCpa: v.number(),
      avgCpm: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    const currentYearMonth = new Date().toISOString().slice(0, 7)

    // 既存のサマリーを確認
    const existing = await ctx.db
      .query('metaMonthlySummary')
      .withIndex('by_account_month', (q) =>
        q.eq('accountId', args.accountId).eq('yearMonth', args.yearMonth)
      )
      .first()

    // 月が完了しているかどうかを判定（当月以外は完了）
    // ただし月末を過ぎた当月は完了扱い
    const nowDate = new Date()
    const nowTimestamp = Date.now()
    const [year, month] = args.yearMonth.split('-').map(Number)
    const lastDayOfMonth = new Date(year, month, 0).getDate()
    const isMonthComplete = args.yearMonth !== currentYearMonth || nowDate.getDate() === lastDayOfMonth
    const isComplete = isMonthComplete

    const summaryData = {
      accountId: args.accountId,
      yearMonth: args.yearMonth,
      ...args.data,
      isComplete,
      lastUpdated: nowTimestamp,
      createdAt: existing?.createdAt || nowTimestamp,
    }

    if (existing) {
      // 更新
      await ctx.db.patch(existing._id, summaryData)
      console.log(`📝 ${args.yearMonth}: サマリー更新`)
    } else {
      // 新規作成
      await ctx.db.insert('metaMonthlySummary', summaryData)
      console.log(`✨ ${args.yearMonth}: サマリー作成`)
    }

    return { success: true }
  },
})

// 月次サマリーをクリア（デバッグ用）
export const clearMonthlySummaries = mutation({
  args: {
    accountId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let summaries
    if (args.accountId) {
      summaries = await ctx.db
        .query('metaMonthlySummary')
        .withIndex('by_account', (q) => q.eq('accountId', args.accountId!))
        .collect()
    } else {
      summaries = await ctx.db.query('metaMonthlySummary').collect()
    }

    for (const summary of summaries) {
      await ctx.db.delete(summary._id)
    }

    console.log(`🗑️ ${summaries.length}件のサマリーを削除`)
    return { deleted: summaries.length }
  },
})