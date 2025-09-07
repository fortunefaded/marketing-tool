import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

// API設定の取得
export const getConfig = query({
  args: {
    key: v.string(), // 設定のキー
  },
  handler: async (ctx, args) => {
    const config = await ctx.db
      .query('apiConfig')
      .withIndex('by_key', (q) => q.eq('key', args.key))
      .first()
    
    return config ? config.value : null
  },
})

// 複数のAPI設定を取得
export const getConfigs = query({
  args: {
    keys: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    let configs = ctx.db.query('apiConfig')
    
    const results = await configs.collect()
    
    if (args.keys) {
      return results.filter(config => args.keys?.includes(config.key))
    }
    
    return results
  },
})

// API設定の保存
export const saveConfig = mutation({
  args: {
    key: v.string(),
    value: v.any(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('apiConfig')
      .withIndex('by_key', (q) => q.eq('key', args.key))
      .first()

    const data = {
      key: args.key,
      value: args.value,
      updatedAt: Date.now(),
    }

    if (existing) {
      await ctx.db.patch(existing._id, data)
      return { action: 'updated', key: args.key }
    } else {
      await ctx.db.insert('apiConfig', data)
      return { action: 'created', key: args.key }
    }
  },
})

// API設定の削除
export const deleteConfig = mutation({
  args: {
    key: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('apiConfig')
      .withIndex('by_key', (q) => q.eq('key', args.key))
      .first()

    if (existing) {
      await ctx.db.delete(existing._id)
      return { action: 'deleted', key: args.key }
    }

    return { action: 'not_found', key: args.key }
  },
})

// すべてのAPI設定をクリア
export const clearAllConfigs = mutation({
  handler: async (ctx) => {
    const configs = await ctx.db.query('apiConfig').collect()
    
    for (const config of configs) {
      await ctx.db.delete(config._id)
    }
    
    return { action: 'cleared', count: configs.length }
  },
})

// API設定の存在確認
export const hasConfig = query({
  args: {
    key: v.string(),
  },
  handler: async (ctx, args) => {
    const config = await ctx.db
      .query('apiConfig')
      .withIndex('by_key', (q) => q.eq('key', args.key))
      .first()
    
    return config !== null
  },
})

// バッチ保存
export const batchSaveConfigs = mutation({
  args: {
    configs: v.array(v.object({
      key: v.string(),
      value: v.any(),
    })),
  },
  handler: async (ctx, args) => {
    const results = []
    
    for (const config of args.configs) {
      const existing = await ctx.db
        .query('apiConfig')
        .withIndex('by_key', (q) => q.eq('key', config.key))
        .first()

      const data = {
        key: config.key,
        value: config.value,
        updatedAt: Date.now(),
      }

      if (existing) {
        await ctx.db.patch(existing._id, data)
        results.push({ action: 'updated', key: config.key })
      } else {
        await ctx.db.insert('apiConfig', data)
        results.push({ action: 'created', key: config.key })
      }
    }
    
    return results
  },
})