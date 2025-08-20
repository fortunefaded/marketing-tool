import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

// クリエイティブメトリクスの保存
export const saveCreativeMetrics = mutation({
  args: {
    accountId: v.string(),
    metrics: v.array(
      v.object({
        creative_id: v.string(),
        creative_name: v.string(),
        creative_type: v.union(
          v.literal('image'),
          v.literal('video'),
          v.literal('carousel'),
          v.literal('text'),
          v.literal('unknown')
        ),
        thumbnail_url: v.optional(v.string()),
        video_url: v.optional(v.string()),
        carousel_cards: v.optional(
          v.array(
            v.object({
              name: v.string(),
              description: v.string(),
              image_url: v.string(),
              link: v.string(),
            })
          )
        ),
        campaign_id: v.optional(v.string()),
        campaign_name: v.optional(v.string()),
        ad_id: v.optional(v.string()),
        ad_name: v.optional(v.string()),
        impressions: v.number(),
        clicks: v.number(),
        ctr: v.number(),
        conversions: v.number(),
        conversion_value: v.number(),
        cpa: v.number(),
        roas: v.number(),
        spend: v.number(),
        cpc: v.number(),
        cpm: v.number(),
        cvr: v.number(),
        period_start: v.string(),
        period_end: v.string(),
        aggregation_period: v.union(v.literal('daily'), v.literal('weekly'), v.literal('monthly')),
      })
    ),
  },
  handler: async (ctx, args) => {
    const { accountId, metrics } = args

    // 既存のメトリクスを削除（同じ期間・クリエイティブIDのもの）
    for (const metric of metrics) {
      const existing = await ctx.db
        .query('creative_metrics')
        .withIndex('by_creative_period', (q) =>
          q
            .eq('creative_id', metric.creative_id)
            .eq('period_start', metric.period_start)
            .eq('period_end', metric.period_end)
        )
        .first()

      if (existing) {
        await ctx.db.delete(existing._id)
      }
    }

    // 新しいメトリクスを保存
    const savedMetrics = []
    for (const metric of metrics) {
      const id = await ctx.db.insert('creative_metrics', {
        accountId,
        ...metric,
        updatedAt: Date.now(),
      })
      savedMetrics.push(id)
    }

    return savedMetrics
  },
})

// クリエイティブメトリクスの取得
export const getCreativeMetrics = query({
  args: {
    accountId: v.string(),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    creativeTypes: v.optional(
      v.array(
        v.union(
          v.literal('image'),
          v.literal('video'),
          v.literal('carousel'),
          v.literal('text'),
          v.literal('unknown')
        )
      )
    ),
    campaignIds: v.optional(v.array(v.string())),
    aggregationPeriod: v.optional(
      v.union(v.literal('daily'), v.literal('weekly'), v.literal('monthly'))
    ),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query('creative_metrics')
      .withIndex('by_account', (q) => q.eq('accountId', args.accountId))

    const results = await query.collect()

    // フィルタリング
    let filtered = results

    if (args.startDate) {
      filtered = filtered.filter((m) => m.period_end >= args.startDate!)
    }

    if (args.endDate) {
      filtered = filtered.filter((m) => m.period_start <= args.endDate!)
    }

    if (args.creativeTypes && args.creativeTypes.length > 0) {
      filtered = filtered.filter((m) => args.creativeTypes!.includes(m.creative_type))
    }

    if (args.campaignIds && args.campaignIds.length > 0) {
      filtered = filtered.filter((m) => m.campaign_id && args.campaignIds!.includes(m.campaign_id))
    }

    if (args.aggregationPeriod) {
      filtered = filtered.filter((m) => m.aggregation_period === args.aggregationPeriod)
    }

    // 最新のデータを優先してソート
    return filtered.sort((a, b) => b.updatedAt - a.updatedAt)
  },
})

// キャンペーン一覧の取得
export const getCampaigns = query({
  args: {
    accountId: v.string(),
  },
  handler: async (ctx, args) => {
    const metrics = await ctx.db
      .query('creative_metrics')
      .withIndex('by_account', (q) => q.eq('accountId', args.accountId))
      .collect()

    const campaignsMap = new Map<string, { id: string; name: string }>()

    metrics.forEach((metric) => {
      if (metric.campaign_id && metric.campaign_name) {
        campaignsMap.set(metric.campaign_id, {
          id: metric.campaign_id,
          name: metric.campaign_name,
        })
      }
    })

    return Array.from(campaignsMap.values()).sort((a, b) => a.name.localeCompare(b.name))
  },
})

// メトリクスの集計サマリー
export const getMetricsSummary = query({
  args: {
    accountId: v.string(),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query('creative_metrics')
      .withIndex('by_account', (q) => q.eq('accountId', args.accountId))

    const results = await query.collect()

    // 期間フィルタリング
    let filtered = results
    if (args.startDate) {
      filtered = filtered.filter((m) => m.period_end >= args.startDate!)
    }
    if (args.endDate) {
      filtered = filtered.filter((m) => m.period_start <= args.endDate!)
    }

    // サマリー計算
    const summary = {
      totalCreatives: new Set(filtered.map((m) => m.creative_id)).size,
      totalImpressions: filtered.reduce((sum, m) => sum + m.impressions, 0),
      totalClicks: filtered.reduce((sum, m) => sum + m.clicks, 0),
      totalConversions: filtered.reduce((sum, m) => sum + m.conversions, 0),
      totalSpend: filtered.reduce((sum, m) => sum + m.spend, 0),
      totalRevenue: filtered.reduce((sum, m) => sum + m.conversion_value, 0),
      avgCtr:
        filtered.length > 0 ? filtered.reduce((sum, m) => sum + m.ctr, 0) / filtered.length : 0,
      avgRoas:
        filtered.length > 0 ? filtered.reduce((sum, m) => sum + m.roas, 0) / filtered.length : 0,
    }

    return summary
  },
})
