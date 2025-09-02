import { v } from 'convex/values'
import { query, mutation } from './_generated/server'

export const get = query({
  args: {
    cacheKey: v.string(),
  },
  handler: async (ctx, args) => {
    const entry = await ctx.db
      .query('cacheEntries')
      .withIndex('by_cache_key', (q) => q.eq('cacheKey', args.cacheKey))
      .first()

    return entry
  },
})

export const upsert = mutation({
  args: {
    cacheKey: v.string(),
    accountId: v.string(),
    dateRange: v.string(),
    data: v.any(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('cacheEntries')
      .withIndex('by_cache_key', (q) => q.eq('cacheKey', args.cacheKey))
      .first()

    const now = Date.now()

    if (existing) {
      await ctx.db.patch(existing._id, {
        data: args.data,
        dateRange: args.dateRange,
        updatedAt: now,
        lastAccessedAt: now,
        accessCount: (existing.accessCount || 0) + 1,
        dataSize: JSON.stringify(args.data).length,
      })
      return existing._id
    } else {
      return await ctx.db.insert('cacheEntries', {
        cacheKey: args.cacheKey,
        accountId: args.accountId,
        dateRange: args.dateRange,
        data: args.data,
        createdAt: now,
        updatedAt: now,
        lastAccessedAt: now,
        accessCount: 1,
        dataSize: JSON.stringify(args.data).length,
        expiresAt: now + 24 * 60 * 60 * 1000, // 24時間後
        recordCount: 1,
        processTimeMs: 0,
        checksum: Math.random().toString(36).substring(2, 18),
        isComplete: true,
        isCompressed: false,
        fetchTimeMs: 0,
      })
    }
  },
})
