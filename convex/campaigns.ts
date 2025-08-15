import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

// キャンペーン一覧を取得
export const list = query({
  args: {
    userId: v.optional(v.id('users')),
  },
  handler: async (ctx, args) => {
    if (args.userId !== undefined) {
      return await ctx.db
        .query('campaigns')
        .withIndex('by_user', (q) => q.eq('userId', args.userId!))
        .collect()
    }

    return await ctx.db.query('campaigns').collect()
  },
})

// キャンペーンを作成
export const create = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    const campaign = await ctx.db.insert('campaigns', {
      title: args.title,
      description: args.description,
      status: 'draft',
      userId: args.userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })

    return campaign
  },
})

// キャンペーンを更新
export const update = mutation({
  args: {
    id: v.id('campaigns'),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(v.union(v.literal('draft'), v.literal('active'), v.literal('completed'))),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args

    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    })

    return { success: true }
  },
})

// キャンペーンを削除
export const remove = mutation({
  args: {
    id: v.id('campaigns'),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id)
    return { success: true }
  },
})
