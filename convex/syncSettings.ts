import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

// 同期設定の取得
export const getSettings = query({
  args: {
    accountId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('syncSettings')
      .withIndex('by_account', (q) => q.eq('accountId', args.accountId))
      .first()
  },
})

// 同期設定の保存
export const saveSettings = mutation({
  args: {
    accountId: v.string(),
    autoSync: v.boolean(),
    syncInterval: v.string(), // 'manual', 'hourly', 'daily', 'weekly'
    debugMode: v.boolean(),
    retentionDays: v.number(),
    excludeTestCampaigns: v.boolean(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('syncSettings')
      .withIndex('by_account', (q) => q.eq('accountId', args.accountId))
      .first()

    const data = {
      ...args,
      updatedAt: new Date().toISOString(),
    }

    if (existing) {
      await ctx.db.patch(existing._id, data)
      return { action: 'updated' }
    } else {
      await ctx.db.insert('syncSettings', data)
      return { action: 'created' }
    }
  },
})

// 同期設定の部分更新
export const updateSettings = mutation({
  args: {
    accountId: v.string(),
    autoSync: v.optional(v.boolean()),
    syncInterval: v.optional(v.string()),
    debugMode: v.optional(v.boolean()),
    retentionDays: v.optional(v.number()),
    excludeTestCampaigns: v.optional(v.boolean()),
    maxMonths: v.optional(v.number()),
    limitPerRequest: v.optional(v.number()),
    skipCreatives: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { accountId, ...updates } = args

    const existing = await ctx.db
      .query('syncSettings')
      .withIndex('by_account', (q) => q.eq('accountId', accountId))
      .first()

    if (!existing) {
      // 存在しない場合はデフォルト値で作成
      const defaultSettings = {
        accountId,
        autoSync: updates.autoSync ?? false,
        syncInterval: updates.syncInterval ?? 'manual',
        debugMode: updates.debugMode ?? false,
        retentionDays: updates.retentionDays ?? 30,
        excludeTestCampaigns: updates.excludeTestCampaigns ?? false,
        maxMonths: updates.maxMonths ?? 1,
        limitPerRequest: updates.limitPerRequest ?? 100,
        skipCreatives: updates.skipCreatives ?? false,
        updatedAt: new Date().toISOString(),
      }
      await ctx.db.insert('syncSettings', defaultSettings)
      return { action: 'created' }
    }

    // 更新するフィールドのみを含むオブジェクトを作成
    const updateData: any = { updatedAt: new Date().toISOString() }
    if (updates.autoSync !== undefined) updateData.autoSync = updates.autoSync
    if (updates.syncInterval !== undefined) updateData.syncInterval = updates.syncInterval
    if (updates.debugMode !== undefined) updateData.debugMode = updates.debugMode
    if (updates.retentionDays !== undefined) updateData.retentionDays = updates.retentionDays
    if (updates.excludeTestCampaigns !== undefined)
      updateData.excludeTestCampaigns = updates.excludeTestCampaigns
    if (updates.maxMonths !== undefined) updateData.maxMonths = updates.maxMonths
    if (updates.limitPerRequest !== undefined) updateData.limitPerRequest = updates.limitPerRequest
    if (updates.skipCreatives !== undefined) updateData.skipCreatives = updates.skipCreatives

    await ctx.db.patch(existing._id, updateData)
    return { action: 'updated' }
  },
})

// 同期設定の削除
export const deleteSettings = mutation({
  args: {
    accountId: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('syncSettings')
      .withIndex('by_account', (q) => q.eq('accountId', args.accountId))
      .first()

    if (existing) {
      await ctx.db.delete(existing._id)
      return { deleted: true }
    }

    return { deleted: false }
  },
})

// デフォルト設定の取得（設定が存在しない場合のフォールバック用）
export const getDefaultSettings = query({
  args: {},
  handler: async () => {
    return {
      autoSync: false,
      syncInterval: 'manual' as const,
      debugMode: false,
      retentionDays: 30,
      excludeTestCampaigns: false,
    }
  },
})

// すべてのアカウントの設定を取得（管理用）
export const getAllSettings = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 100
    return await ctx.db.query('syncSettings').take(limit)
  },
})
