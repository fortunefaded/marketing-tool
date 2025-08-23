import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

// ECForce設定の取得
export const getConfig = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('ecforceConfig').first()
  },
})

// ECForce設定の保存
export const saveConfig = mutation({
  args: {
    apiUrl: v.string(),
    apiKey: v.string(),
    shopId: v.string(),
    syncEnabled: v.boolean(),
    syncInterval: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query('ecforceConfig').first()
    const now = new Date().toISOString()

    const data = {
      ...args,
      updatedAt: now,
    }

    if (existing) {
      await ctx.db.patch(existing._id, data)
    } else {
      await ctx.db.insert('ecforceConfig', data)
    }

    return { success: true }
  },
})

// インポート履歴の一覧取得
export const getImportHistory = query({
  args: {
    limit: v.optional(v.number()),
    status: v.optional(v.union(v.literal('pending'), v.literal('processing'), v.literal('completed'), v.literal('failed'))),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50

    if (args.status) {
      const history = await ctx.db
        .query('ecforceImportHistory')
        .withIndex('by_status', (query) => query.eq('status', args.status as 'pending' | 'processing' | 'completed' | 'failed'))
        .take(limit)
      return history
    } else {
      const history = await ctx.db
        .query('ecforceImportHistory')
        .withIndex('by_startedAt')
        .order('desc')
        .take(limit)
      return history
    }
  },
})

// インポート履歴の追加
export const addImportHistory = mutation({
  args: {
    id: v.string(),
    fileName: v.string(),
    fileSize: v.number(),
    totalRows: v.number(),
    importedBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert('ecforceImportHistory', {
      ...args,
      importedRows: 0,
      failedRows: 0,
      startedAt: new Date().toISOString(),
      status: 'processing',
    })

    return { id: args.id }
  },
})

// インポート履歴の更新
export const updateImportHistory = mutation({
  args: {
    id: v.string(),
    importedRows: v.optional(v.number()),
    failedRows: v.optional(v.number()),
    errors: v.optional(v.array(v.string())),
    status: v.optional(v.union(v.literal('pending'), v.literal('processing'), v.literal('completed'), v.literal('failed'))),
    completedAt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const history = await ctx.db
      .query('ecforceImportHistory')
      .filter((q) => q.eq(q.field('id'), args.id))
      .first()

    if (!history) {
      throw new Error('Import history not found')
    }

    const updateData: any = {}
    if (args.importedRows !== undefined) updateData.importedRows = args.importedRows
    if (args.failedRows !== undefined) updateData.failedRows = args.failedRows
    if (args.errors !== undefined) updateData.errors = args.errors
    if (args.status !== undefined) updateData.status = args.status
    if (args.completedAt !== undefined) updateData.completedAt = args.completedAt

    await ctx.db.patch(history._id, updateData)

    return { success: true }
  },
})

// インポート履歴の削除
export const deleteImportHistory = mutation({
  args: {
    id: v.string(),
  },
  handler: async (ctx, args) => {
    const history = await ctx.db
      .query('ecforceImportHistory')
      .filter((q) => q.eq(q.field('id'), args.id))
      .first()

    if (history) {
      await ctx.db.delete(history._id)
      return { deleted: true }
    }

    return { deleted: false }
  },
})

// すべてのインポート履歴をクリア
export const clearImportHistory = mutation({
  args: {},
  handler: async (ctx) => {
    const histories = await ctx.db.query('ecforceImportHistory').collect()
    let deleted = 0

    for (const history of histories) {
      await ctx.db.delete(history._id)
      deleted++
    }

    return { deleted }
  },
})