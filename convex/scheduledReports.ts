import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

// スケジュールレポートの一覧取得
export const getReports = query({
  args: {
    enabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    if (args.enabled !== undefined) {
      return await ctx.db
        .query('scheduledReports')
        .withIndex('by_enabled', (query) => query.eq('enabled', args.enabled as boolean))
        .collect()
    } else {
      return await ctx.db
        .query('scheduledReports')
        .collect()
    }
  },
})

// 特定のレポートを取得
export const getReport = query({
  args: {
    id: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('scheduledReports')
      .filter((q) => q.eq(q.field('id'), args.id))
      .first()
  },
})

// レポートの保存
export const saveReport = mutation({
  args: {
    id: v.string(),
    name: v.string(),
    type: v.string(),
    config: v.any(),
    recipients: v.array(v.string()),
    enabled: v.boolean(),
    nextRun: v.string(),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString()
    
    // 既存のレポートを検索
    const existing = await ctx.db
      .query('scheduledReports')
      .filter((q) => q.eq(q.field('id'), args.id))
      .first()
    
    const data = {
      ...args,
      updatedAt: now,
    }
    
    if (existing) {
      await ctx.db.patch(existing._id, data)
      return { action: 'updated', id: args.id }
    } else {
      await ctx.db.insert('scheduledReports', {
        ...data,
        createdAt: now,
      })
      return { action: 'created', id: args.id }
    }
  },
})

// レポートの部分更新
export const updateReport = mutation({
  args: {
    id: v.string(),
    name: v.optional(v.string()),
    type: v.optional(v.string()),
    config: v.optional(v.any()),
    recipients: v.optional(v.array(v.string())),
    enabled: v.optional(v.boolean()),
    lastRun: v.optional(v.string()),
    nextRun: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args
    
    const existing = await ctx.db
      .query('scheduledReports')
      .filter((q) => q.eq(q.field('id'), id))
      .first()
    
    if (!existing) {
      throw new Error('レポートが見つかりません')
    }
    
    const updateData: any = { updatedAt: new Date().toISOString() }
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        updateData[key] = value
      }
    })
    
    await ctx.db.patch(existing._id, updateData)
    return { success: true }
  },
})

// レポートの削除
export const deleteReport = mutation({
  args: {
    id: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('scheduledReports')
      .filter((q) => q.eq(q.field('id'), args.id))
      .first()
    
    if (existing) {
      await ctx.db.delete(existing._id)
      return { deleted: true }
    }
    
    return { deleted: false }
  },
})

// 複数のレポートを一括保存
export const bulkSaveReports = mutation({
  args: {
    reports: v.array(v.object({
      id: v.string(),
      name: v.string(),
      type: v.string(),
      config: v.any(),
      recipients: v.array(v.string()),
      enabled: v.boolean(),
      nextRun: v.string(),
    })),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString()
    let created = 0
    let updated = 0
    
    for (const report of args.reports) {
      const existing = await ctx.db
        .query('scheduledReports')
        .filter((q) => q.eq(q.field('id'), report.id))
        .first()
      
      const data = {
        ...report,
        updatedAt: now,
      }
      
      if (existing) {
        await ctx.db.patch(existing._id, data)
        updated++
      } else {
        await ctx.db.insert('scheduledReports', {
          ...data,
          createdAt: now,
        })
        created++
      }
    }
    
    return { created, updated, total: created + updated }
  },
})

// すべてのレポートをクリア
export const clearAllReports = mutation({
  args: {},
  handler: async (ctx) => {
    const reports = await ctx.db.query('scheduledReports').collect()
    let deleted = 0
    
    for (const report of reports) {
      await ctx.db.delete(report._id)
      deleted++
    }
    
    return { deleted }
  },
})

// 次回実行予定のレポートを取得
export const getUpcomingReports = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10
    const now = new Date().toISOString()
    
    const reports = await ctx.db
      .query('scheduledReports')
      .withIndex('by_enabled', (q) => q.eq('enabled', true))
      .filter((q) => q.gte(q.field('nextRun'), now))
      .take(limit)
    
    // 次回実行日時でソート
    reports.sort((a, b) => a.nextRun.localeCompare(b.nextRun))
    
    return reports
  },
})