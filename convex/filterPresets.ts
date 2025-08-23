import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

// フィルタープリセットの一覧取得
export const getPresets = query({
  args: {
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.userId) {
      return await ctx.db
        .query('filterPresets')
        .withIndex('by_userId', (query) => query.eq('userId', args.userId))
        .collect()
    } else {
      return await ctx.db
        .query('filterPresets')
        .collect()
    }
  },
})

// 特定の名前のプリセットを取得
export const getPresetByName = query({
  args: {
    name: v.string(),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let q = ctx.db
      .query('filterPresets')
      .withIndex('by_name', (query) => query.eq('name', args.name))
    
    const presets = await q.collect()
    
    // ユーザーIDでフィルタリング
    if (args.userId) {
      return presets.find(p => p.userId === args.userId) || null
    }
    
    return presets[0] || null
  },
})

// フィルタープリセットの保存
export const savePreset = mutation({
  args: {
    name: v.string(),
    filters: v.any(),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString()
    
    // 既存のプリセットを検索
    let existing = null
    const presets = await ctx.db
      .query('filterPresets')
      .withIndex('by_name', (q) => q.eq('name', args.name))
      .collect()
    
    if (args.userId) {
      existing = presets.find(p => p.userId === args.userId)
    } else {
      existing = presets.find(p => !p.userId)
    }
    
    const data = {
      name: args.name,
      filters: args.filters,
      userId: args.userId,
      updatedAt: now,
    }
    
    if (existing) {
      await ctx.db.patch(existing._id, data)
      return { action: 'updated', name: args.name }
    } else {
      await ctx.db.insert('filterPresets', {
        ...data,
        createdAt: now,
      })
      return { action: 'created', name: args.name }
    }
  },
})

// フィルタープリセットの削除
export const deletePreset = mutation({
  args: {
    name: v.string(),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const presets = await ctx.db
      .query('filterPresets')
      .withIndex('by_name', (q) => q.eq('name', args.name))
      .collect()
    
    let toDelete = null
    if (args.userId) {
      toDelete = presets.find(p => p.userId === args.userId)
    } else {
      toDelete = presets.find(p => !p.userId)
    }
    
    if (toDelete) {
      await ctx.db.delete(toDelete._id)
      return { deleted: true }
    }
    
    return { deleted: false }
  },
})

// 複数のフィルタープリセットを一括保存
export const bulkSavePresets = mutation({
  args: {
    presets: v.array(v.object({
      name: v.string(),
      filters: v.any(),
    })),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString()
    let created = 0
    let updated = 0
    
    for (const preset of args.presets) {
      // 既存のプリセットを検索
      const allPresets = await ctx.db
        .query('filterPresets')
        .withIndex('by_name', (q) => q.eq('name', preset.name))
        .collect()
      
      const existing = args.userId 
        ? allPresets.find(p => p.userId === args.userId)
        : allPresets.find(p => !p.userId)
      
      const data = {
        name: preset.name,
        filters: preset.filters,
        userId: args.userId,
        updatedAt: now,
      }
      
      if (existing) {
        await ctx.db.patch(existing._id, data)
        updated++
      } else {
        await ctx.db.insert('filterPresets', {
          ...data,
          createdAt: now,
        })
        created++
      }
    }
    
    return { created, updated, total: created + updated }
  },
})

// すべてのフィルタープリセットをクリア
export const clearAllPresets = mutation({
  args: {
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let presets
    
    if (args.userId) {
      presets = await ctx.db
        .query('filterPresets')
        .withIndex('by_userId', (query) => query.eq('userId', args.userId))
        .collect()
    } else {
      presets = await ctx.db
        .query('filterPresets')
        .collect()
    }
    let deleted = 0
    
    for (const preset of presets) {
      await ctx.db.delete(preset._id)
      deleted++
    }
    
    return { deleted }
  },
})