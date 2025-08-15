import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

// Meta広告データを同期する
export const syncMetaCampaigns = mutation({
  args: {
    campaigns: v.array(
      v.object({
        metaId: v.string(),
        accountId: v.string(),
        name: v.string(),
        objective: v.string(),
        status: v.union(v.literal('ACTIVE'), v.literal('PAUSED'), v.literal('DELETED')),
        dailyBudget: v.number(),
        lifetimeBudget: v.optional(v.number()),
        startTime: v.string(),
        stopTime: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString()

    for (const campaign of args.campaigns) {
      // 既存のキャンペーンを検索
      const existing = await ctx.db
        .query('metaCampaigns')
        .withIndex('by_metaId', (q) => q.eq('metaId', campaign.metaId))
        .first()

      if (existing) {
        // 更新
        await ctx.db.patch(existing._id, {
          ...campaign,
          lastSyncedAt: now,
          updatedAt: now,
        })
      } else {
        // 新規作成
        await ctx.db.insert('metaCampaigns', {
          ...campaign,
          lastSyncedAt: now,
          createdAt: now,
          updatedAt: now,
        })
      }
    }
  },
})

// キャンペーンデータを取得
export const getMetaCampaigns = query({
  args: {
    status: v.optional(v.union(v.literal('ACTIVE'), v.literal('PAUSED'), v.literal('DELETED'))),
  },
  handler: async (ctx, args) => {
    if (args.status !== undefined) {
      const status = args.status
      return await ctx.db
        .query('metaCampaigns')
        .withIndex('by_status', (q) => q.eq('status', status))
        .collect()
    }

    return await ctx.db.query('metaCampaigns').collect()
  },
})

// インサイトデータを保存
export const saveMetaInsights = mutation({
  args: {
    insights: v.array(
      v.object({
        campaignId: v.optional(v.string()),
        creativeId: v.optional(v.string()),
        impressions: v.number(),
        clicks: v.number(),
        spend: v.number(),
        conversions: v.number(),
        revenue: v.optional(v.number()),
        dateStart: v.string(),
        dateStop: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString()

    for (const insight of args.insights) {
      await ctx.db.insert('metaInsights', {
        ...insight,
        createdAt: now,
      })
    }
  },
})
