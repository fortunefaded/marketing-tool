import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

// API設定の取得
export const getConfig = query({
  args: {
    provider: v.string(), // 'meta', 'google', etc.
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('apiConfig')
      .withIndex('by_provider', (q) => q.eq('provider', args.provider))
      .first()
  },
})

// API設定の保存
export const saveConfig = mutation({
  args: {
    provider: v.string(),
    config: v.any(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('apiConfig')
      .withIndex('by_provider', (q) => q.eq('provider', args.provider))
      .first()

    const data = {
      provider: args.provider,
      config: args.config,
      updatedAt: new Date().toISOString(),
    }

    if (existing) {
      await ctx.db.patch(existing._id, data)
      return { action: 'updated' }
    } else {
      await ctx.db.insert('apiConfig', data)
      return { action: 'created' }
    }
  },
})

// API設定の削除
export const deleteConfig = mutation({
  args: {
    provider: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('apiConfig')
      .withIndex('by_provider', (q) => q.eq('provider', args.provider))
      .first()

    if (existing) {
      await ctx.db.delete(existing._id)
      return { deleted: true }
    }

    return { deleted: false }
  },
})

// すべてのAPI設定を取得
export const getAllConfigs = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('apiConfig').collect()
  },
})

// Meta API設定の取得（便利メソッド）
export const getMetaConfig = query({
  args: {},
  handler: async (ctx) => {
    const config = await ctx.db
      .query('apiConfig')
      .withIndex('by_provider', (q) => q.eq('provider', 'meta'))
      .first()
    
    return config?.config || null
  },
})

// Meta API設定の保存（便利メソッド）
export const saveMetaConfig = mutation({
  args: {
    appId: v.optional(v.string()),
    appSecret: v.optional(v.string()),
    adAccountId: v.optional(v.string()),
    accessToken: v.optional(v.string()),
    apiVersion: v.optional(v.string()),
    debugMode: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('apiConfig')
      .withIndex('by_provider', (q) => q.eq('provider', 'meta'))
      .first()

    const currentConfig = existing?.config || {}
    const updatedConfig = {
      ...currentConfig,
      ...args,
    }

    const data = {
      provider: 'meta',
      config: updatedConfig,
      updatedAt: new Date().toISOString(),
    }

    if (existing) {
      await ctx.db.patch(existing._id, data)
      return { action: 'updated' }
    } else {
      await ctx.db.insert('apiConfig', data)
      return { action: 'created' }
    }
  },
})