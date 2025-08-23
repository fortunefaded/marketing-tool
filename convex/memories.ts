import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

// メモリーの取得
export const get = query({
  args: {
    key: v.string(),
  },
  handler: async (ctx, args) => {
    const memory = await ctx.db
      .query('memories')
      .withIndex('by_key', (q) => q.eq('key', args.key))
      .first()
    
    if (!memory) {
      return null
    }
    
    // 有効期限のチェック
    if (memory.expiresAt) {
      const now = new Date()
      const expiresAt = new Date(memory.expiresAt)
      
      if (now > expiresAt) {
        // 期限切れの場合はnullを返す（削除は別途mutation関数で実行）
        return null
      }
    }
    
    return memory.value
  },
})

// メモリーの保存
export const set = mutation({
  args: {
    key: v.string(),
    value: v.any(),
    type: v.optional(v.string()),
    ttlSeconds: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = new Date()
    let expiresAt = undefined
    
    if (args.ttlSeconds) {
      const expiry = new Date(now.getTime() + args.ttlSeconds * 1000)
      expiresAt = expiry.toISOString()
    }
    
    // 既存のメモリーを検索
    const existing = await ctx.db
      .query('memories')
      .withIndex('by_key', (q) => q.eq('key', args.key))
      .first()
    
    const data = {
      key: args.key,
      value: args.value,
      type: args.type,
      expiresAt,
      updatedAt: now.toISOString(),
    }
    
    if (existing) {
      await ctx.db.patch(existing._id, data)
      return { action: 'updated', key: args.key }
    } else {
      await ctx.db.insert('memories', {
        ...data,
        createdAt: now.toISOString(),
      })
      return { action: 'created', key: args.key }
    }
  },
})

// メモリーの削除
export const remove = mutation({
  args: {
    key: v.string(),
  },
  handler: async (ctx, args) => {
    const memory = await ctx.db
      .query('memories')
      .withIndex('by_key', (q) => q.eq('key', args.key))
      .first()
    
    if (memory) {
      await ctx.db.delete(memory._id)
      return { deleted: true }
    }
    
    return { deleted: false }
  },
})

// 複数のメモリーを一括取得
export const getMany = query({
  args: {
    keys: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const results: Record<string, any> = {}
    const now = new Date()
    
    for (const key of args.keys) {
      const memory = await ctx.db
        .query('memories')
        .withIndex('by_key', (q) => q.eq('key', key))
        .first()
      
      if (memory) {
        // 有効期限のチェック
        if (memory.expiresAt) {
          const expiresAt = new Date(memory.expiresAt)
          if (now <= expiresAt) {
            results[key] = memory.value
          }
        } else {
          results[key] = memory.value
        }
      }
    }
    
    return results
  },
})

// タイプ別のメモリー一覧取得
export const getByType = query({
  args: {
    type: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 100
    const memories = await ctx.db
      .query('memories')
      .withIndex('by_type', (q) => q.eq('type', args.type))
      .take(limit)
    
    // 有効期限をチェックしてフィルタリング
    const now = new Date()
    return memories.filter(memory => {
      if (!memory.expiresAt) return true
      return new Date(memory.expiresAt) > now
    })
  },
})

// 期限切れメモリーのクリーンアップ
export const cleanupExpired = mutation({
  args: {},
  handler: async (ctx) => {
    const now = new Date().toISOString()
    
    // 期限切れのメモリーを取得
    const expiredMemories = await ctx.db
      .query('memories')
      .withIndex('by_expiresAt')
      .filter((q) => q.lt(q.field('expiresAt'), now))
      .collect()
    
    let deleted = 0
    for (const memory of expiredMemories) {
      await ctx.db.delete(memory._id)
      deleted++
    }
    
    return { deleted }
  },
})

// すべてのメモリーをクリア
export const clearAll = mutation({
  args: {
    type: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let memories
    
    if (args.type) {
      memories = await ctx.db
        .query('memories')
        .withIndex('by_type', (q) => q.eq('type', args.type))
        .collect()
    } else {
      memories = await ctx.db
        .query('memories')
        .collect()
    }
    let deleted = 0
    
    for (const memory of memories) {
      await ctx.db.delete(memory._id)
      deleted++
    }
    
    return { deleted }
  },
})

// メモリー統計の取得
export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const memories = await ctx.db.query('memories').collect()
    
    const stats: Record<string, number> = {
      total: memories.length,
      expired: 0,
      active: 0,
    }
    
    const now = new Date()
    const typeCount: Record<string, number> = {}
    
    for (const memory of memories) {
      // タイプ別カウント
      const type = memory.type || 'unknown'
      typeCount[type] = (typeCount[type] || 0) + 1
      
      // 有効期限チェック
      if (memory.expiresAt) {
        const expiresAt = new Date(memory.expiresAt)
        if (now > expiresAt) {
          stats.expired++
        } else {
          stats.active++
        }
      } else {
        stats.active++
      }
    }
    
    return {
      ...stats,
      byType: typeCount,
    }
  },
})