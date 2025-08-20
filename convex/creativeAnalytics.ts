import { v } from 'convex/values'
import { query, mutation } from './_generated/server'

// 拡張クリエイティブデータを取得
export const getEnhancedCreativeData = query({
  args: {
    accountId: v.string(),
    dateRange: v.optional(
      v.object({
        since: v.string(),
        until: v.string(),
      })
    ),
    includeVideoMetrics: v.optional(v.boolean()),
    includeDemographics: v.optional(v.boolean()),
    includePlacements: v.optional(v.boolean()),
    includeTargeting: v.optional(v.boolean()),
    creativeIds: v.optional(v.array(v.string())),
    campaignIds: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query('enhanced_creative_data')
      .withIndex('by_account', (q) => q.eq('accountId', args.accountId))
      .filter((q) => {
        if (!args.dateRange) return true
        return q.and(
          q.eq(q.field('dateRangeSince'), args.dateRange.since),
          q.eq(q.field('dateRangeUntil'), args.dateRange.until)
        )
      })

    let data = await query.collect()

    // フィルタリング
    if (args.creativeIds && args.creativeIds.length > 0) {
      data = data.filter((d) => args.creativeIds!.includes(d.creativeId))
    }

    if (args.campaignIds && args.campaignIds.length > 0) {
      data = data.filter((d) => args.campaignIds!.includes(d.campaignId))
    }

    // オプションフィールドの除外
    if (!args.includeVideoMetrics) {
      data = data.map((d) => ({
        ...d,
        metrics: {
          ...d.metrics,
          videoMetrics: undefined,
        },
      }))
    }

    if (!args.includeDemographics) {
      data = data.map((d) => ({
        ...d,
        demographics: undefined,
      }))
    }

    if (!args.includePlacements) {
      data = data.map((d) => ({
        ...d,
        placements: undefined,
      }))
    }

    if (!args.includeTargeting) {
      data = data.map((d) => ({
        ...d,
        targeting: undefined,
      }))
    }

    return data
  },
})

// 拡張クリエイティブデータを保存
export const saveEnhancedCreativeData = mutation({
  args: {
    accountId: v.string(),
    data: v.array(
      v.object({
        id: v.string(),
        name: v.string(),
        type: v.union(
          v.literal('IMAGE'),
          v.literal('VIDEO'),
          v.literal('CAROUSEL'),
          v.literal('COLLECTION'),
          v.literal('DYNAMIC')
        ),
        status: v.string(),
        campaignId: v.string(),
        campaignName: v.string(),
        adsetId: v.string(),
        adsetName: v.string(),
        adId: v.string(),
        adName: v.string(),
        creative: v.any(),
        metrics: v.any(),
        demographics: v.optional(v.any()),
        placements: v.optional(v.any()),
        targeting: v.optional(v.any()),
        createdTime: v.string(),
        updatedTime: v.string(),
        lastSyncedAt: v.string(),
      })
    ),
    dateRange: v.object({
      since: v.string(),
      until: v.string(),
    }),
    options: v.object({
      includeVideoMetrics: v.optional(v.boolean()),
      includeDemographics: v.optional(v.boolean()),
      includePlacements: v.optional(v.boolean()),
      includeTargeting: v.optional(v.boolean()),
    }),
  },
  handler: async (ctx, args) => {
    // 既存のデータを削除
    const existing = await ctx.db
      .query('enhanced_creative_data')
      .withIndex('by_account', (q) => q.eq('accountId', args.accountId))
      .filter((q) => {
        if (!args.dateRange) return true
        return q.and(
          q.eq(q.field('dateRangeSince'), args.dateRange.since),
          q.eq(q.field('dateRangeUntil'), args.dateRange.until)
        )
      })
      .collect()

    for (const item of existing) {
      await ctx.db.delete(item._id)
    }

    // 新しいデータを保存
    for (const item of args.data) {
      await ctx.db.insert('enhanced_creative_data', {
        accountId: args.accountId,
        creativeId: item.id,
        name: item.name,
        type: item.type,
        status: item.status,
        campaignId: item.campaignId,
        campaignName: item.campaignName,
        adsetId: item.adsetId,
        adsetName: item.adsetName,
        adId: item.adId,
        adName: item.adName,
        creative: item.creative,
        metrics: item.metrics,
        demographics: item.demographics,
        placements: item.placements,
        targeting: item.targeting,
        dateRangeSince: args.dateRange.since,
        dateRangeUntil: args.dateRange.until,
        createdTime: item.createdTime,
        updatedTime: item.updatedTime,
        lastSyncedAt: item.lastSyncedAt,
      })
    }
  },
})

// 動画パフォーマンスサマリーを取得
export const getVideoPerformanceSummary = query({
  args: {
    accountId: v.string(),
    dateRange: v.object({
      since: v.string(),
      until: v.string(),
    }),
  },
  handler: async (ctx, args) => {
    const data = await ctx.db
      .query('enhanced_creative_data')
      .withIndex('by_account', (q) => q.eq('accountId', args.accountId))
      .filter((q) =>
        q.and(
          q.eq(q.field('dateRangeSince'), args.dateRange.since),
          q.eq(q.field('dateRangeUntil'), args.dateRange.until),
          q.eq(q.field('type'), 'VIDEO')
        )
      )
      .collect()

    const summary = {
      totalVideos: data.length,
      totalPlays: 0,
      totalThruPlays: 0,
      avgCompletionRate: 0,
      avgWatchTime: 0,
      totalSpend: 0,
      totalRevenue: 0,
      videoROAS: 0,
    }

    let completionRates: number[] = []

    data.forEach((item) => {
      const videoMetrics = item.metrics.videoMetrics
      if (videoMetrics) {
        summary.totalPlays += videoMetrics.plays
        summary.totalThruPlays += videoMetrics.thruPlays
        summary.avgWatchTime += videoMetrics.avgWatchTime
        completionRates.push(videoMetrics.completionRate)
      }
      summary.totalSpend += item.metrics.spend
      summary.totalRevenue += item.metrics.conversionValue
    })

    if (completionRates.length > 0) {
      summary.avgCompletionRate =
        completionRates.reduce((a, b) => a + b, 0) / completionRates.length
    }

    if (data.length > 0) {
      summary.avgWatchTime = summary.avgWatchTime / data.length
    }

    summary.videoROAS = summary.totalSpend > 0 ? summary.totalRevenue / summary.totalSpend : 0

    return summary
  },
})

// クリエイティブトレンドデータを取得
export const getCreativeTrends = query({
  args: {
    accountId: v.string(),
    creativeId: v.string(),
    metric: v.union(
      v.literal('impressions'),
      v.literal('clicks'),
      v.literal('ctr'),
      v.literal('conversions'),
      v.literal('roas'),
      v.literal('spend')
    ),
  },
  handler: async (ctx, args) => {
    const allData = await ctx.db
      .query('enhanced_creative_data')
      .withIndex('by_creative', (q) => q.eq('creativeId', args.creativeId))
      .filter((q) => q.eq(q.field('accountId'), args.accountId))
      .collect()

    // 日付順にソート
    allData.sort((a, b) => a.dateRangeSince.localeCompare(b.dateRangeSince))

    // トレンドデータを生成
    const trends = allData.map((item) => ({
      date: item.dateRangeSince,
      value: item.metrics[args.metric] || 0,
      dateRange: {
        since: item.dateRangeSince,
        until: item.dateRangeUntil,
      },
    }))

    return trends
  },
})

// クリエイティブ比較データを取得
export const getCreativeComparison = query({
  args: {
    accountId: v.string(),
    creativeIds: v.array(v.string()),
    dateRange: v.object({
      since: v.string(),
      until: v.string(),
    }),
    metrics: v.array(
      v.union(
        v.literal('impressions'),
        v.literal('clicks'),
        v.literal('ctr'),
        v.literal('conversions'),
        v.literal('roas'),
        v.literal('spend'),
        v.literal('cpc'),
        v.literal('cpm')
      )
    ),
  },
  handler: async (ctx, args) => {
    const data = await ctx.db
      .query('enhanced_creative_data')
      .withIndex('by_account', (q) => q.eq('accountId', args.accountId))
      .filter((q) => {
        if (!args.dateRange) return true
        return q.and(
          q.eq(q.field('dateRangeSince'), args.dateRange.since),
          q.eq(q.field('dateRangeUntil'), args.dateRange.until)
        )
      })
      .collect()

    const filteredData = data.filter((d) => args.creativeIds.includes(d.creativeId))

    const comparison = filteredData.map((item) => {
      const metricValues: Record<string, number> = {}
      args.metrics.forEach((metric) => {
        metricValues[metric] = item.metrics[metric] || 0
      })

      return {
        creativeId: item.creativeId,
        creativeName: item.name,
        creativeType: item.type,
        thumbnailUrl: item.creative.thumbnailUrl,
        metrics: metricValues,
      }
    })

    return comparison
  },
})
