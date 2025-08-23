import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

// お気に入り分析の一覧取得
export const getFavorites = query({
  args: {
    userId: v.optional(v.string()),
    type: v.optional(v.string()),
    onlyFavorites: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let results
    
    if (args.userId) {
      results = await ctx.db
        .query('favoriteAnalyses')
        .withIndex('by_userId', (query) => query.eq('userId', args.userId))
        .collect()
    } else {
      results = await ctx.db
        .query('favoriteAnalyses')
        .collect()
    }
    
    // タイプでフィルタリング
    if (args.type) {
      results = results.filter(item => item.type === args.type)
    }
    
    // お気に入りのみフィルタリング
    if (args.onlyFavorites) {
      results = results.filter(item => item.isFavorite)
    }
    
    // 最終アクセス日時で降順ソート
    results.sort((a, b) => {
      const aTime = a.lastAccessedAt ? new Date(a.lastAccessedAt).getTime() : 0
      const bTime = b.lastAccessedAt ? new Date(b.lastAccessedAt).getTime() : 0
      return bTime - aTime
    })
    
    return results
  },
})

// 特定のお気に入り分析を取得
export const getFavorite = query({
  args: {
    id: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('favoriteAnalyses')
      .filter((q) => q.eq(q.field('id'), args.id))
      .first()
  },
})

// お気に入り分析の保存
export const saveFavorite = mutation({
  args: {
    id: v.string(),
    name: v.string(),
    type: v.string(),
    config: v.any(),
    isFavorite: v.boolean(),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString()
    
    // 既存のアイテムを検索
    const existing = await ctx.db
      .query('favoriteAnalyses')
      .filter((q) => q.eq(q.field('id'), args.id))
      .first()
    
    const data = {
      id: args.id,
      name: args.name,
      type: args.type,
      config: args.config,
      isFavorite: args.isFavorite,
      userId: args.userId,
      lastAccessedAt: now,
      updatedAt: now,
    }
    
    if (existing) {
      await ctx.db.patch(existing._id, data)
      return { action: 'updated', id: args.id }
    } else {
      await ctx.db.insert('favoriteAnalyses', {
        ...data,
        createdAt: now,
      })
      return { action: 'created', id: args.id }
    }
  },
})

// お気に入り状態の切り替え
export const toggleFavorite = mutation({
  args: {
    id: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('favoriteAnalyses')
      .filter((q) => q.eq(q.field('id'), args.id))
      .first()
    
    if (!existing) {
      throw new Error('分析が見つかりません')
    }
    
    await ctx.db.patch(existing._id, {
      isFavorite: !existing.isFavorite,
      updatedAt: new Date().toISOString(),
    })
    
    return { isFavorite: !existing.isFavorite }
  },
})

// 最終アクセス日時の更新
export const updateLastAccessed = mutation({
  args: {
    id: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('favoriteAnalyses')
      .filter((q) => q.eq(q.field('id'), args.id))
      .first()
    
    if (!existing) {
      throw new Error('分析が見つかりません')
    }
    
    await ctx.db.patch(existing._id, {
      lastAccessedAt: new Date().toISOString(),
    })
    
    return { success: true }
  },
})

// お気に入り分析の削除
export const deleteFavorite = mutation({
  args: {
    id: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('favoriteAnalyses')
      .filter((q) => q.eq(q.field('id'), args.id))
      .first()
    
    if (existing) {
      await ctx.db.delete(existing._id)
      return { deleted: true }
    }
    
    return { deleted: false }
  },
})

// 複数のお気に入り分析を一括削除
export const bulkDeleteFavorites = mutation({
  args: {
    ids: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    let deleted = 0
    
    for (const id of args.ids) {
      const existing = await ctx.db
        .query('favoriteAnalyses')
        .filter((q) => q.eq(q.field('id'), id))
        .first()
      
      if (existing) {
        await ctx.db.delete(existing._id)
        deleted++
      }
    }
    
    return { deleted }
  },
})

// すべてのお気に入り分析をクリア
export const clearAllFavorites = mutation({
  args: {
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let items
    
    if (args.userId) {
      items = await ctx.db
        .query('favoriteAnalyses')
        .withIndex('by_userId', (query) => query.eq('userId', args.userId))
        .collect()
    } else {
      items = await ctx.db
        .query('favoriteAnalyses')
        .collect()
    }
    let deleted = 0
    
    for (const item of items) {
      await ctx.db.delete(item._id)
      deleted++
    }
    
    return { deleted }
  },
})