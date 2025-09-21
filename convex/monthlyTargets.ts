import { v } from 'convex/values'
import { query, mutation } from './_generated/server'

// 指定月の目標を取得
export const get = query({
  args: {
    yearMonth: v.string(), // "YYYY-MM"形式
  },
  handler: async (ctx, args) => {
    const target = await ctx.db
      .query('monthlyTargets')
      .withIndex('by_yearMonth', (q) => q.eq('yearMonth', args.yearMonth))
      .first()

    return target
  },
})

// 期間指定で目標一覧を取得
export const list = query({
  args: {
    startMonth: v.optional(v.string()),
    endMonth: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query('monthlyTargets').withIndex('by_yearMonth')

    // 期間指定がある場合はフィルタリング
    const targets = await query.collect()

    if (args.startMonth || args.endMonth) {
      return targets.filter(target => {
        if (args.startMonth && target.yearMonth < args.startMonth) return false
        if (args.endMonth && target.yearMonth > args.endMonth) return false
        return true
      })
    }

    return targets
  },
})

// 変更履歴を取得
export const getHistory = query({
  args: {
    yearMonth: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query('targetHistory').withIndex('by_changedAt')

    const history = await query.collect()

    // 月でフィルタリング
    const filtered = args.yearMonth
      ? history.filter(h => h.yearMonth === args.yearMonth)
      : history

    // 新しい順にソート
    const sorted = filtered.sort((a, b) => b.changedAt - a.changedAt)

    // 件数制限
    return args.limit ? sorted.slice(0, args.limit) : sorted
  },
})

// 目標を作成または更新（履歴も記録）
export const upsert = mutation({
  args: {
    yearMonth: v.string(),
    budget: v.number(),
    cvTarget: v.number(),
    cpoTarget: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now()

    // 既存の目標を取得
    const existing = await ctx.db
      .query('monthlyTargets')
      .withIndex('by_yearMonth', (q) => q.eq('yearMonth', args.yearMonth))
      .first()

    if (existing) {
      // 更新の場合、履歴を記録
      await ctx.db.insert('targetHistory', {
        targetId: existing._id,
        yearMonth: args.yearMonth,
        previousValues: {
          budget: existing.budget,
          cvTarget: existing.cvTarget,
          cpoTarget: existing.cpoTarget,
        },
        newValues: {
          budget: args.budget,
          cvTarget: args.cvTarget,
          cpoTarget: args.cpoTarget,
        },
        changedAt: now,
      })

      // 目標を更新
      await ctx.db.patch(existing._id, {
        budget: args.budget,
        cvTarget: args.cvTarget,
        cpoTarget: args.cpoTarget,
        updatedAt: now,
      })

      return existing._id
    } else {
      // 新規作成
      const targetId = await ctx.db.insert('monthlyTargets', {
        yearMonth: args.yearMonth,
        budget: args.budget,
        cvTarget: args.cvTarget,
        cpoTarget: args.cpoTarget,
        createdAt: now,
        updatedAt: now,
      })

      return targetId
    }
  },
})

// 目標を削除
export const remove = mutation({
  args: {
    yearMonth: v.string(),
  },
  handler: async (ctx, args) => {
    const target = await ctx.db
      .query('monthlyTargets')
      .withIndex('by_yearMonth', (q) => q.eq('yearMonth', args.yearMonth))
      .first()

    if (!target) {
      throw new Error(`目標が見つかりません: ${args.yearMonth}`)
    }

    // 関連する履歴も削除
    const history = await ctx.db
      .query('targetHistory')
      .withIndex('by_targetId', (q) => q.eq('targetId', target._id))
      .collect()

    for (const h of history) {
      await ctx.db.delete(h._id)
    }

    // 目標を削除
    await ctx.db.delete(target._id)

    return target._id
  },
})