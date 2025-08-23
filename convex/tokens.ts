import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

// トークン情報の取得
export const getToken = query({
  args: {
    tokenType: v.string(), // 'short', 'long', 'system'
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('tokens')
      .withIndex('by_type', (q) => q.eq('tokenType', args.tokenType))
      .first()
  },
})

// トークン情報の保存
export const saveToken = mutation({
  args: {
    tokenType: v.string(),
    token: v.string(),
    expiresAt: v.optional(v.string()),
    scopes: v.optional(v.array(v.string())),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // 既存のトークンを検索
    const existing = await ctx.db
      .query('tokens')
      .withIndex('by_type', (q) => q.eq('tokenType', args.tokenType))
      .first()

    const data = {
      tokenType: args.tokenType,
      token: args.token,
      expiresAt: args.expiresAt,
      scopes: args.scopes,
      userId: args.userId,
      updatedAt: new Date().toISOString(),
    }

    if (existing) {
      await ctx.db.patch(existing._id, data)
    } else {
      await ctx.db.insert('tokens', data)
    }

    return { success: true }
  },
})

// トークンの削除
export const deleteToken = mutation({
  args: {
    tokenType: v.string(),
  },
  handler: async (ctx, args) => {
    const token = await ctx.db
      .query('tokens')
      .withIndex('by_type', (q) => q.eq('tokenType', args.tokenType))
      .first()

    if (token) {
      await ctx.db.delete(token._id)
      return { deleted: true }
    }

    return { deleted: false }
  },
})

// すべてのトークンをクリア
export const clearAllTokens = mutation({
  args: {},
  handler: async (ctx) => {
    const tokens = await ctx.db.query('tokens').collect()

    for (const token of tokens) {
      await ctx.db.delete(token._id)
    }

    return { cleared: tokens.length }
  },
})

// トークンタイプ別に一覧取得
export const getAllTokens = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('tokens').collect()
  },
})