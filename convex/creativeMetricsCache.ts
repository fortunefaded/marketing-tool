import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

// キャッシュの取得
export const getCache = query({
  args: {
    cacheKey: v.string(),
  },
  handler: async (ctx, args) => {
    const cache = await ctx.db
      .query('creativeMetricsCache')
      .withIndex('by_cacheKey', (q) => q.eq('cacheKey', args.cacheKey))
      .first()
    
    if (!cache) {
      return null
    }
    
    // 有効期限のチェック
    const now = new Date()
    const expiresAt = new Date(cache.expiresAt)
    
    if (now > expiresAt) {
      // 期限切れの場合はnullを返す（削除は別のmutationで行う）
      return null
    }
    
    return cache
  },
})

// キャッシュの保存
export const saveCache = mutation({
  args: {
    cacheKey: v.string(),
    accountId: v.string(),
    startDate: v.string(),
    endDate: v.string(),
    data: v.any(),
    ttlHours: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = new Date()
    const ttl = args.ttlHours || 24 // デフォルト24時間
    const expiresAt = new Date(now.getTime() + ttl * 60 * 60 * 1000)
    
    // 既存のキャッシュを検索
    const existing = await ctx.db
      .query('creativeMetricsCache')
      .withIndex('by_cacheKey', (q) => q.eq('cacheKey', args.cacheKey))
      .first()
    
    const cacheData = {
      cacheKey: args.cacheKey,
      accountId: args.accountId,
      startDate: args.startDate,
      endDate: args.endDate,
      data: args.data,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    }
    
    if (existing) {
      await ctx.db.patch(existing._id, cacheData)
      return { action: 'updated', cacheKey: args.cacheKey }
    } else {
      await ctx.db.insert('creativeMetricsCache', cacheData)
      return { action: 'created', cacheKey: args.cacheKey }
    }
  },
})

// キャッシュの削除
export const deleteCache = mutation({
  args: {
    cacheKey: v.string(),
  },
  handler: async (ctx, args) => {
    const cache = await ctx.db
      .query('creativeMetricsCache')
      .withIndex('by_cacheKey', (q) => q.eq('cacheKey', args.cacheKey))
      .first()
    
    if (cache) {
      await ctx.db.delete(cache._id)
      return { deleted: true }
    }
    
    return { deleted: false }
  },
})

// アカウント別のキャッシュをクリア
export const clearAccountCache = mutation({
  args: {
    accountId: v.string(),
  },
  handler: async (ctx, args) => {
    const caches = await ctx.db
      .query('creativeMetricsCache')
      .withIndex('by_accountId', (q) => q.eq('accountId', args.accountId))
      .collect()
    
    let deleted = 0
    for (const cache of caches) {
      await ctx.db.delete(cache._id)
      deleted++
    }
    
    return { deleted }
  },
})

// 期限切れキャッシュのクリーンアップ
export const cleanupExpiredCache = mutation({
  args: {},
  handler: async (ctx) => {
    const now = new Date().toISOString()
    
    // 期限切れのキャッシュを取得
    const expiredCaches = await ctx.db
      .query('creativeMetricsCache')
      .withIndex('by_expiresAt')
      .filter((q) => q.lt(q.field('expiresAt'), now))
      .collect()
    
    let deleted = 0
    for (const cache of expiredCaches) {
      await ctx.db.delete(cache._id)
      deleted++
    }
    
    return { deleted }
  },
})

// キャッシュ統計の取得
export const getCacheStats = query({
  args: {
    accountId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const caches = args.accountId 
      ? await ctx.db
          .query('creativeMetricsCache')
          .withIndex('by_accountId', (q) => q.eq('accountId', args.accountId as string))
          .collect()
      : await ctx.db.query('creativeMetricsCache').collect()
    
    const now = new Date()
    let totalSize = 0
    let activeCount = 0
    let expiredCount = 0
    
    for (const cache of caches) {
      const dataSize = JSON.stringify(cache.data).length
      totalSize += dataSize
      
      const expiresAt = new Date(cache.expiresAt)
      if (now <= expiresAt) {
        activeCount++
      } else {
        expiredCount++
      }
    }
    
    return {
      totalCount: caches.length,
      activeCount,
      expiredCount,
      totalSizeBytes: totalSize,
      totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
    }
  },
})

// キャッシュキーの一覧取得
export const getCacheKeys = query({
  args: {
    accountId: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 100
    const caches = args.accountId
      ? await ctx.db
          .query('creativeMetricsCache')
          .withIndex('by_accountId', (q) => q.eq('accountId', args.accountId as string))
          .take(limit)
      : await ctx.db.query('creativeMetricsCache').take(limit)
    
    return caches.map(cache => ({
      cacheKey: cache.cacheKey,
      accountId: cache.accountId,
      startDate: cache.startDate,
      endDate: cache.endDate,
      createdAt: cache.createdAt,
      expiresAt: cache.expiresAt,
    }))
  },
})