import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

// ダッシュボード設定の取得
export const getSettings = query({
  args: {
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.userId) {
      return await ctx.db
        .query('dashboardSettings')
        .withIndex('by_userId', (q) => q.eq('userId', args.userId))
        .first()
    } else {
      // userIdがない場合はデフォルト設定を取得
      return await ctx.db
        .query('dashboardSettings')
        .filter((q) => q.eq(q.field('userId'), undefined))
        .first()
    }
  },
})

// ダッシュボード設定の保存
export const saveSettings = mutation({
  args: {
    userId: v.optional(v.string()),
    layouts: v.any(),
    theme: v.optional(v.string()),
    preferences: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    // 既存の設定を検索
    let existing = null
    if (args.userId) {
      existing = await ctx.db
        .query('dashboardSettings')
        .withIndex('by_userId', (q) => q.eq('userId', args.userId))
        .first()
    } else {
      existing = await ctx.db
        .query('dashboardSettings')
        .filter((q) => q.eq(q.field('userId'), undefined))
        .first()
    }

    const data = {
      userId: args.userId,
      layouts: args.layouts,
      theme: args.theme,
      preferences: args.preferences,
      updatedAt: new Date().toISOString(),
    }

    if (existing) {
      await ctx.db.patch(existing._id, data)
      return { action: 'updated' }
    } else {
      await ctx.db.insert('dashboardSettings', data)
      return { action: 'created' }
    }
  },
})

// ダッシュボード設定の部分更新
export const updateSettings = mutation({
  args: {
    userId: v.optional(v.string()),
    layouts: v.optional(v.any()),
    theme: v.optional(v.string()),
    preferences: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const { userId, ...updates } = args
    
    // 既存の設定を検索
    let existing = null
    if (userId) {
      existing = await ctx.db
        .query('dashboardSettings')
        .withIndex('by_userId', (q) => q.eq('userId', userId))
        .first()
    } else {
      existing = await ctx.db
        .query('dashboardSettings')
        .filter((q) => q.eq(q.field('userId'), undefined))
        .first()
    }

    if (!existing) {
      // 存在しない場合は新規作成
      await ctx.db.insert('dashboardSettings', {
        userId,
        layouts: updates.layouts || {},
        theme: updates.theme,
        preferences: updates.preferences,
        updatedAt: new Date().toISOString(),
      })
      return { action: 'created' }
    }

    // 更新するフィールドのみを含むオブジェクトを作成
    const updateData: any = { updatedAt: new Date().toISOString() }
    if (updates.layouts !== undefined) updateData.layouts = updates.layouts
    if (updates.theme !== undefined) updateData.theme = updates.theme
    if (updates.preferences !== undefined) updateData.preferences = updates.preferences

    await ctx.db.patch(existing._id, updateData)
    return { action: 'updated' }
  },
})

// ダッシュボード設定の削除
export const deleteSettings = mutation({
  args: {
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let existing = null
    if (args.userId) {
      existing = await ctx.db
        .query('dashboardSettings')
        .withIndex('by_userId', (q) => q.eq('userId', args.userId))
        .first()
    } else {
      existing = await ctx.db
        .query('dashboardSettings')
        .filter((q) => q.eq(q.field('userId'), undefined))
        .first()
    }

    if (existing) {
      await ctx.db.delete(existing._id)
      return { deleted: true }
    }

    return { deleted: false }
  },
})

// レイアウトの更新
export const updateLayout = mutation({
  args: {
    userId: v.optional(v.string()),
    layoutId: v.string(),
    layout: v.any(),
  },
  handler: async (ctx, args) => {
    // 既存の設定を取得
    let existing = null
    if (args.userId) {
      existing = await ctx.db
        .query('dashboardSettings')
        .withIndex('by_userId', (q) => q.eq('userId', args.userId))
        .first()
    } else {
      existing = await ctx.db
        .query('dashboardSettings')
        .filter((q) => q.eq(q.field('userId'), undefined))
        .first()
    }

    const currentLayouts = existing?.layouts || {}
    const updatedLayouts = {
      ...currentLayouts,
      [args.layoutId]: args.layout,
    }

    if (existing) {
      await ctx.db.patch(existing._id, {
        layouts: updatedLayouts,
        updatedAt: new Date().toISOString(),
      })
    } else {
      await ctx.db.insert('dashboardSettings', {
        userId: args.userId,
        layouts: updatedLayouts,
        updatedAt: new Date().toISOString(),
      })
    }

    return { success: true }
  },
})

// レイアウトの削除
export const deleteLayout = mutation({
  args: {
    userId: v.optional(v.string()),
    layoutId: v.string(),
  },
  handler: async (ctx, args) => {
    // 既存の設定を取得
    let existing = null
    if (args.userId) {
      existing = await ctx.db
        .query('dashboardSettings')
        .withIndex('by_userId', (q) => q.eq('userId', args.userId))
        .first()
    } else {
      existing = await ctx.db
        .query('dashboardSettings')
        .filter((q) => q.eq(q.field('userId'), undefined))
        .first()
    }

    if (!existing || !existing.layouts) {
      return { deleted: false }
    }

    const updatedLayouts = { ...existing.layouts }
    delete updatedLayouts[args.layoutId]

    await ctx.db.patch(existing._id, {
      layouts: updatedLayouts,
      updatedAt: new Date().toISOString(),
    })

    return { deleted: true }
  },
})