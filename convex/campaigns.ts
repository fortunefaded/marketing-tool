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

// Meta キャンペーンデータを取得（ダッシュボード用）
export const listMetaCampaigns = query({
  args: {},
  handler: async (ctx) => {
    const metaCampaigns = await ctx.db.query('metaCampaigns').collect()

    // 各キャンペーンのインサイトデータを集計
    const campaignsWithMetrics = await Promise.all(
      metaCampaigns.map(async (campaign) => {
        // キャンペーンのインサイトを取得
        const insights = await ctx.db
          .query('metaInsights')
          .withIndex('by_campaign')
          .filter((q) => q.eq(q.field('campaign_id'), campaign.metaId))
          .collect()

        // メトリクスを集計
        const aggregatedMetrics = insights.reduce(
          (acc, insight) => ({
            impressions: acc.impressions + (insight.impressions || 0),
            clicks: acc.clicks + (insight.clicks || 0),
            spent: acc.spent + (insight.spend || 0),
            conversions: acc.conversions + (insight.conversions || 0),
            revenue: acc.revenue + (insight.revenue || 0),
          }),
          { impressions: 0, clicks: 0, spent: 0, conversions: 0, revenue: 0 }
        )

        // 日別メトリクスを準備
        const dailyMetrics = insights.map((insight) => ({
          date: insight.dateStart,
          impressions: insight.impressions,
          clicks: insight.clicks,
          conversions: insight.conversions,
          cost: insight.spend,
          revenue: insight.revenue || 0,
        }))

        return {
          _id: campaign._id,
          name: campaign.name,
          status: campaign.status.toLowerCase() as 'active' | 'paused' | 'completed',
          budget: campaign.dailyBudget * 30, // 月間予算として計算
          spent: aggregatedMetrics.spent,
          impressions: aggregatedMetrics.impressions,
          clicks: aggregatedMetrics.clicks,
          conversions: aggregatedMetrics.conversions,
          revenue: aggregatedMetrics.revenue,
          startDate: campaign.startTime,
          endDate: campaign.stopTime || '',
          dailyMetrics,
        }
      })
    )

    return campaignsWithMetrics
  },
})
