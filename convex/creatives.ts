import { v } from 'convex/values'
import { query } from './_generated/server'

// クリエイティブのパフォーマンスデータを取得
export const getCreativePerformance = query({
  args: {
    campaignId: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // キャンペーンIDでフィルタリング
    const creatives = args.campaignId
      ? await ctx.db
          .query('metaCreatives')
          .withIndex('by_campaignId', (q) => q.eq('campaignId', args.campaignId!))
          .collect()
      : await ctx.db.query('metaCreatives').collect()

    // 各クリエイティブのパフォーマンスデータを集計
    const creativesWithPerformance = await Promise.all(
      creatives.map(async (creative) => {
        // クリエイティブのインサイトを取得
        const insights = await ctx.db
          .query('metaInsights')
          .filter((q) => q.eq(q.field('creative_id'), creative.metaId))
          .collect()

        // メトリクスを集計
        const aggregatedMetrics = insights.reduce(
          (acc, insight) => ({
            impressions: acc.impressions + (insight.impressions || 0),
            clicks: acc.clicks + (insight.clicks || 0),
            spend: acc.spend + (insight.spend || 0),
            conversions: acc.conversions + (insight.conversions || 0),
            revenue: acc.revenue + (insight.revenue || 0),
          }),
          { impressions: 0, clicks: 0, spend: 0, conversions: 0, revenue: 0 }
        )

        // KPIを計算
        const ctr =
          aggregatedMetrics.impressions > 0
            ? (aggregatedMetrics.clicks / aggregatedMetrics.impressions) * 100
            : 0
        const cpc =
          aggregatedMetrics.clicks > 0 ? aggregatedMetrics.spend / aggregatedMetrics.clicks : 0
        const cpa =
          aggregatedMetrics.conversions > 0
            ? aggregatedMetrics.spend / aggregatedMetrics.conversions
            : 0
        const roas =
          aggregatedMetrics.spend > 0 ? aggregatedMetrics.revenue / aggregatedMetrics.spend : 0

        // キャンペーン名を取得
        const campaign = await ctx.db
          .query('metaCampaigns')
          .withIndex('by_metaId', (q) => q.eq('metaId', creative.campaignId))
          .first()

        return {
          id: creative.metaId,
          name: creative.name,
          type: creative.creativeType,
          thumbnailUrl: creative.thumbnailUrl,
          videoUrl: creative.videoUrl,
          campaignName: campaign?.name || 'Unknown Campaign',
          metrics: {
            ...aggregatedMetrics,
            ctr,
            cpc,
            cpa,
            roas,
          },
          status: campaign?.status || 'ACTIVE',
        }
      })
    )

    // ROASで降順ソート
    creativesWithPerformance.sort((a, b) => b.metrics.roas - a.metrics.roas)

    // limitが指定されている場合は制限
    if (args.limit) {
      return creativesWithPerformance.slice(0, args.limit)
    }

    return creativesWithPerformance
  },
})

// キャンペーン別のクリエイティブサマリーを取得
export const getCreativeSummaryByCampaign = query({
  args: {},
  handler: async (ctx) => {
    const campaigns = await ctx.db.query('metaCampaigns').collect()

    const summaries = await Promise.all(
      campaigns.map(async (campaign) => {
        const creatives = await ctx.db
          .query('metaCreatives')
          .withIndex('by_campaignId', (q) => q.eq('campaignId', campaign.metaId))
          .collect()

        const creativeCounts = {
          total: creatives.length,
          image: creatives.filter((c) => c.creativeType === 'IMAGE').length,
          video: creatives.filter((c) => c.creativeType === 'VIDEO').length,
          carousel: creatives.filter((c) => c.creativeType === 'CAROUSEL').length,
        }

        // 全クリエイティブのインサイトを集計
        const allInsights = await Promise.all(
          creatives.map(async (creative) => {
            const insights = await ctx.db
              .query('metaInsights')
              .filter((q) => q.eq(q.field('creative_id'), creative.metaId))
              .collect()
            return insights
          })
        )

        const flatInsights = allInsights.flat()
        const totalMetrics = flatInsights.reduce(
          (acc, insight) => ({
            impressions: acc.impressions + (insight.impressions || 0),
            clicks: acc.clicks + (insight.clicks || 0),
            spend: acc.spend + (insight.spend || 0),
            conversions: acc.conversions + (insight.conversions || 0),
            revenue: acc.revenue + (insight.revenue || 0),
          }),
          { impressions: 0, clicks: 0, spend: 0, conversions: 0, revenue: 0 }
        )

        return {
          campaignId: campaign.metaId,
          campaignName: campaign.name,
          creativeCounts,
          totalMetrics,
          averageRoas: totalMetrics.spend > 0 ? totalMetrics.revenue / totalMetrics.spend : 0,
        }
      })
    )

    return summaries
  },
})

// クリエイティブのパフォーマンスデータを期間別に集計
export const getCreativePerformanceByPeriod = query({
  args: {
    accountId: v.optional(v.string()),
    startDate: v.string(),
    endDate: v.string(),
    period: v.union(v.literal('daily'), v.literal('weekly'), v.literal('monthly')),
    creativeTypes: v.optional(
      v.array(v.union(v.literal('IMAGE'), v.literal('VIDEO'), v.literal('CAROUSEL')))
    ),
  },
  handler: async (ctx, args) => {
    // creative_metricsテーブルから期間・集計期間でフィルタリング
    let metricsQuery = ctx.db.query('creative_metrics').withIndex('by_account')

    if (args.accountId) {
      metricsQuery = metricsQuery.filter((q) => q.eq(q.field('accountId'), args.accountId))
    }

    const metrics = await metricsQuery
      .filter((q) =>
        q.and(
          q.gte(q.field('period_start'), args.startDate),
          q.lte(q.field('period_end'), args.endDate),
          q.eq(q.field('aggregation_period'), args.period)
        )
      )
      .collect()

    // クリエイティブタイプでフィルタリング
    let filteredMetrics = metrics
    if (args.creativeTypes && args.creativeTypes.length > 0) {
      const typeMap = {
        IMAGE: 'image',
        VIDEO: 'video',
        CAROUSEL: 'carousel',
      } as const

      const mappedTypes = args.creativeTypes.map((t) => typeMap[t])
      filteredMetrics = metrics.filter((m) => mappedTypes.includes(m.creative_type as any))
    }

    // クリエイティブごとに最新のメトリクスを集計
    const creativeMap = new Map<string, any>()

    filteredMetrics.forEach((metric) => {
      const existing = creativeMap.get(metric.creative_id)

      if (!existing || new Date(metric.updatedAt) > new Date(existing.updatedAt)) {
        // metaCreativesから追加情報を取得
        creativeMap.set(metric.creative_id, {
          id: metric.creative_id,
          name: metric.creative_name,
          type:
            metric.creative_type === 'image'
              ? 'IMAGE'
              : metric.creative_type === 'video'
                ? 'VIDEO'
                : metric.creative_type === 'carousel'
                  ? 'CAROUSEL'
                  : 'IMAGE',
          thumbnailUrl: metric.thumbnail_url,
          videoUrl: metric.video_url,
          campaignName: metric.campaign_name || 'Unknown Campaign',
          metrics: {
            impressions: metric.impressions,
            clicks: metric.clicks,
            conversions: metric.conversions,
            spend: metric.spend,
            revenue: metric.conversion_value,
            ctr: metric.ctr,
            cpc: metric.cpc,
            cpa: metric.cpa,
            roas: metric.roas,
          },
          status: 'ACTIVE', // creative_metricsテーブルにはステータス情報がないため
        })
      }
    })

    return Array.from(creativeMap.values())
  },
})

// クリエイティブタイプ別のサマリーを取得
export const getCreativeTypeSummary = query({
  args: {
    accountId: v.optional(v.string()),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let metricsQuery = ctx.db.query('creative_metrics').withIndex('by_account')

    if (args.accountId) {
      metricsQuery = metricsQuery.filter((q) => q.eq(q.field('accountId'), args.accountId))
    }

    let metrics = await metricsQuery.collect()

    // 日付でフィルタリング
    if (args.startDate) {
      metrics = metrics.filter((m) => m.period_start >= args.startDate!)
    }
    if (args.endDate) {
      metrics = metrics.filter((m) => m.period_end <= args.endDate!)
    }

    // タイプ別に集計
    const summary = {
      image: { count: 0, spend: 0, revenue: 0, conversions: 0, impressions: 0 },
      video: { count: 0, spend: 0, revenue: 0, conversions: 0, impressions: 0 },
      carousel: { count: 0, spend: 0, revenue: 0, conversions: 0, impressions: 0 },
    }

    const countedCreatives = new Set<string>()

    metrics.forEach((metric) => {
      const type = metric.creative_type as 'image' | 'video' | 'carousel'

      if (!countedCreatives.has(metric.creative_id)) {
        summary[type].count++
        countedCreatives.add(metric.creative_id)
      }

      summary[type].spend += metric.spend
      summary[type].revenue += metric.conversion_value
      summary[type].conversions += metric.conversions
      summary[type].impressions += metric.impressions
    })

    return summary
  },
})
