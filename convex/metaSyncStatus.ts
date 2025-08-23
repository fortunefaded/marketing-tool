import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

// 同期ステータスの取得
export const getSyncStatus = query({
  args: {
    accountId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('metaSyncStatus')
      .withIndex('by_account', (q) => q.eq('accountId', args.accountId))
      .first()
  },
})

// 同期ステータスの更新
export const updateSyncStatus = mutation({
  args: {
    accountId: v.string(),
    lastFullSync: v.optional(v.string()),
    lastIncrementalSync: v.optional(v.string()),
    totalRecords: v.optional(v.number()),
    earliestDate: v.optional(v.string()),
    latestDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { accountId, ...updateData } = args

    // 既存のステータスを検索
    const existing = await ctx.db
      .query('metaSyncStatus')
      .withIndex('by_account', (q) => q.eq('accountId', accountId))
      .first()

    const data = {
      accountId,
      lastFullSync: updateData.lastFullSync || existing?.lastFullSync,
      lastIncrementalSync: updateData.lastIncrementalSync || existing?.lastIncrementalSync,
      totalRecords: updateData.totalRecords ?? existing?.totalRecords,
      earliestDate: updateData.earliestDate || existing?.earliestDate,
      latestDate: updateData.latestDate || existing?.latestDate,
      updatedAt: new Date().toISOString(),
    }

    if (existing) {
      await ctx.db.patch(existing._id, data)
    } else {
      await ctx.db.insert('metaSyncStatus', data)
    }

    return { success: true }
  },
})

// 同期ステータスのクリア
export const clearSyncStatus = mutation({
  args: {
    accountId: v.string(),
  },
  handler: async (ctx, args) => {
    const status = await ctx.db
      .query('metaSyncStatus')
      .withIndex('by_account', (q) => q.eq('accountId', args.accountId))
      .first()

    if (status) {
      await ctx.db.delete(status._id)
      return { deleted: true }
    }

    return { deleted: false }
  },
})