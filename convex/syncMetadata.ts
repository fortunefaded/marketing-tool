import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

// 同期メタデータの取得
export const getSyncMetadata = query({
  args: {
    accountId: v.string(),
    syncType: v.string(), // 'creative_metrics', 'campaigns', etc.
  },
  handler: async (ctx, args) => {
    const key = `sync_${args.syncType}_${args.accountId}`
    
    return await ctx.db
      .query('memories')
      .withIndex('by_key', (q) => q.eq('key', key))
      .first()
  },
})

// 同期メタデータの保存
export const saveSyncMetadata = mutation({
  args: {
    accountId: v.string(),
    syncType: v.string(),
    metadata: v.any(), // { timestamp, options, etc. }
  },
  handler: async (ctx, args) => {
    const key = `sync_${args.syncType}_${args.accountId}`
    const now = new Date().toISOString()
    
    // 既存のエントリを検索
    const existing = await ctx.db
      .query('memories')
      .withIndex('by_key', (q) => q.eq('key', key))
      .first()
    
    const data = {
      key,
      value: args.metadata,
      type: 'sync_metadata',
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    }
    
    if (existing) {
      await ctx.db.patch(existing._id, data)
    } else {
      await ctx.db.insert('memories', data)
    }
    
    return { success: true }
  },
})

// 特定アカウントの全同期メタデータを取得
export const getAllSyncMetadata = query({
  args: {
    accountId: v.string(),
  },
  handler: async (ctx, args) => {
    const prefix = `sync_`
    const suffix = `_${args.accountId}`
    
    const memories = await ctx.db
      .query('memories')
      .withIndex('by_type', (q) => q.eq('type', 'sync_metadata'))
      .collect()
    
    // アカウントIDでフィルタリング
    return memories.filter(m => 
      m.key.startsWith(prefix) && m.key.endsWith(suffix)
    )
  },
})

// 同期メタデータのクリア
export const clearSyncMetadata = mutation({
  args: {
    accountId: v.string(),
    syncType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let keysToDelete: string[]
    
    if (args.syncType) {
      // 特定のsyncTypeのみクリア
      keysToDelete = [`sync_${args.syncType}_${args.accountId}`]
    } else {
      // アカウントの全同期メタデータをクリア
      const memories = await ctx.db
        .query('memories')
        .withIndex('by_type', (q) => q.eq('type', 'sync_metadata'))
        .collect()
      
      keysToDelete = memories
        .filter(m => m.key.endsWith(`_${args.accountId}`))
        .map(m => m.key)
    }
    
    let deleted = 0
    for (const key of keysToDelete) {
      const memory = await ctx.db
        .query('memories')
        .withIndex('by_key', (q) => q.eq('key', key))
        .first()
      
      if (memory) {
        await ctx.db.delete(memory._id)
        deleted++
      }
    }
    
    return { deleted }
  },
})