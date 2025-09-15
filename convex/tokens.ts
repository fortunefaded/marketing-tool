import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

// アカウント別のトークン取得
export const getTokenByAccount = query({
  args: {
    accountId: v.string(),
    tokenType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query('tokens')
      .withIndex('by_account', (q) => q.eq('accountId', args.accountId))

    if (args.tokenType) {
      query = query.filter((q) => q.eq(q.field('tokenType'), args.tokenType))
    }

    return await query.first()
  },
})

// トークンIDによる取得
export const getTokenById = query({
  args: {
    tokenId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('tokens')
      .withIndex('by_token_id', (q) => q.eq('tokenId', args.tokenId))
      .first()
  },
})

// トークン情報の保存
export const saveToken = mutation({
  args: {
    tokenId: v.string(),
    accountId: v.string(),
    tokenType: v.string(),
    encryptedToken: v.string(),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now()

    // 既存のトークンを検索
    const existing = await ctx.db
      .query('tokens')
      .withIndex('by_token_id', (q) => q.eq('tokenId', args.tokenId))
      .first()

    if (existing) {
      await ctx.db.patch(existing._id, {
        encryptedToken: args.encryptedToken,
        expiresAt: args.expiresAt,
        lastUsedAt: now,
      })
    } else {
      await ctx.db.insert('tokens', {
        tokenId: args.tokenId,
        accountId: args.accountId,
        tokenType: args.tokenType,
        encryptedToken: args.encryptedToken,
        expiresAt: args.expiresAt,
        createdAt: now,
        lastUsedAt: now,
      })
    }

    return { success: true }
  },
})

// トークンの削除
export const deleteToken = mutation({
  args: {
    tokenId: v.string(),
  },
  handler: async (ctx, args) => {
    const token = await ctx.db
      .query('tokens')
      .withIndex('by_token_id', (q) => q.eq('tokenId', args.tokenId))
      .first()

    if (token) {
      await ctx.db.delete(token._id)
      return { deleted: true }
    }

    return { deleted: false }
  },
})

// アカウントの全トークンを削除
export const deleteTokensByAccount = mutation({
  args: {
    accountId: v.string(),
  },
  handler: async (ctx, args) => {
    const tokens = await ctx.db
      .query('tokens')
      .withIndex('by_account', (q) => q.eq('accountId', args.accountId))
      .collect()

    for (const token of tokens) {
      await ctx.db.delete(token._id)
    }

    return { deleted: tokens.length }
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

// 全トークン取得
export const getAllTokens = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('tokens').collect()
  },
})
