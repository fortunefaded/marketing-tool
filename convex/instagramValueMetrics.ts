import { v } from 'convex/values'
import { query, mutation } from './_generated/server'

// Instagram価値スコアインターフェース
export interface InstagramValueScore {
  saves: number // 保存数
  saveRate: number // 保存率（最重要）
  profileVisits: number // プロフィール訪問
  follows: number // フォロー数
  profileToFollowRate: number // プロフィール→フォロー転換率
  comments: number // コメント数
  shares: number // シェア数
  commentSentiment?: number // コメントセンチメント（-1〜1）
  totalValueScore: number // 総合価値スコア（疲労度への補正値）
}

// Instagram特有のメトリクス
export interface InstagramMetrics {
  impressions: number
  reach: number
  saves: number
  shares: number
  comments: number
  likes: number
  profileVisits: number
  follows: number
  websiteClicks?: number
  storyReplies?: number
  storyExits?: number
}

// Instagram価値スコアの計算
export function calculateInstagramValue(metrics: InstagramMetrics): InstagramValueScore {
  const impressions = metrics.impressions || 1 // ゼロ除算を防ぐ
  const profileVisits = metrics.profileVisits || 1

  // 各率の計算
  const saveRate = metrics.saves / impressions
  const profileToFollowRate = metrics.follows / profileVisits
  const shareRate = metrics.shares / impressions
  const engagementRate =
    (metrics.saves + metrics.shares + metrics.comments + metrics.likes) / impressions

  let valueScore = 0

  // 保存率による加点（最大25点）
  if (saveRate > 0.02)
    valueScore += 25 // 2%超で満点
  else if (saveRate > 0.015)
    valueScore += 20 // 1.5%超
  else if (saveRate > 0.01)
    valueScore += 15 // 1%超
  else if (saveRate > 0.005)
    valueScore += 10 // 0.5%超
  else if (saveRate > 0.003) valueScore += 5 // 0.3%超

  // フォロー転換による加点（最大20点）
  if (profileToFollowRate > 0.1)
    valueScore += 20 // 10%超で満点
  else if (profileToFollowRate > 0.07)
    valueScore += 15 // 7%超
  else if (profileToFollowRate > 0.05)
    valueScore += 12 // 5%超
  else if (profileToFollowRate > 0.03)
    valueScore += 8 // 3%超
  else if (profileToFollowRate > 0.01) valueScore += 4 // 1%超

  // シェア率による加点（最大10点）
  if (shareRate > 0.005)
    valueScore += 10 // 0.5%超
  else if (shareRate > 0.003)
    valueScore += 7 // 0.3%超
  else if (shareRate > 0.001) valueScore += 4 // 0.1%超

  // エンゲージメント率による加点（最大10点）
  if (engagementRate > 0.05)
    valueScore += 10 // 5%超
  else if (engagementRate > 0.03)
    valueScore += 7 // 3%超
  else if (engagementRate > 0.02)
    valueScore += 5 // 2%超
  else if (engagementRate > 0.01) valueScore += 3 // 1%超

  // コメントの質による加点（将来実装用）
  // if (commentSentiment > 0.5) valueScore += 10

  return {
    saves: metrics.saves,
    saveRate,
    profileVisits: metrics.profileVisits,
    follows: metrics.follows,
    profileToFollowRate,
    comments: metrics.comments,
    shares: metrics.shares,
    totalValueScore: Math.min(65, valueScore), // 最大65点（疲労度への過剰な補正を防ぐ）
  }
}

// Instagramメトリクスの取得
export const getInstagramMetrics = query({
  args: {
    adId: v.string(),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Instagram関連のインサイトデータを取得
    const insights = await ctx.db
      .query('metaInsights')
      .filter((q) =>
        q.and(
          q.eq(q.field('ad_id'), args.adId),
          // Instagram配置を含むデータのみ
          q.or(
            q.eq(q.field('publisher_platform'), 'instagram'),
            q.eq(q.field('placement'), 'instagram_feed'),
            q.eq(q.field('placement'), 'instagram_stories')
          )
        )
      )
      .collect()

    if (insights.length === 0) {
      return null
    }

    // メトリクスの集計
    const aggregated: InstagramMetrics = {
      impressions: 0,
      reach: 0,
      saves: 0,
      shares: 0,
      comments: 0,
      likes: 0,
      profileVisits: 0,
      follows: 0,
      websiteClicks: 0,
      storyReplies: 0,
      storyExits: 0,
    }

    insights.forEach((insight) => {
      aggregated.impressions += insight.impressions || 0
      aggregated.reach += insight.reach || 0
      aggregated.saves += insight.saves || 0
      aggregated.shares += insight.shares || 0
      aggregated.comments += insight.comments || 0
      aggregated.likes += insight.likes || 0
      aggregated.profileVisits += insight.profile_visits || 0
      aggregated.follows += insight.follows || 0
      aggregated.websiteClicks = (aggregated.websiteClicks || 0) + (insight.website_clicks || 0)
      aggregated.storyReplies = (aggregated.storyReplies || 0) + (insight.story_replies || 0)
      aggregated.storyExits = (aggregated.storyExits || 0) + (insight.story_exits || 0)
    })

    return aggregated
  },
})

// Instagram価値スコアの保存
export const saveInstagramValueScore = mutation({
  args: {
    accountId: v.string(),
    creativeId: v.string(),
    adId: v.string(),
    date: v.string(),
    metrics: v.object({
      saves: v.number(),
      saveRate: v.number(),
      profileVisits: v.number(),
      follows: v.number(),
      profileToFollowRate: v.number(),
      comments: v.number(),
      shares: v.number(),
      totalValueScore: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('instagramValue')
      .withIndex('by_ad_date', (q) => q.eq('adId', args.adId).eq('date', args.date))
      .first()

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...args.metrics,
        valueScore: args.metrics.totalValueScore,
        updatedAt: new Date().toISOString(),
      })
    } else {
      await ctx.db.insert('instagramValue', {
        accountId: args.accountId,
        creativeId: args.creativeId,
        adId: args.adId,
        date: args.date,
        saves: args.metrics.saves,
        shares: 0, // 必須フィールドなので0で初期化
        comments: 0,
        likes: 0,
        reach: 0,
        impressions: 0,
        valueScore: args.metrics.totalValueScore,
        engagement: 0,
        engagementRate: 0,
        saveRate: args.metrics.saveRate,
        profileToFollowRate: args.metrics.profileToFollowRate,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    }

    return { success: true }
  },
})

// 高価値Instagram広告の識別
export const getHighValueInstagramAds = query({
  args: {
    accountId: v.string(),
    minValueScore: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const minScore = args.minValueScore || 20
    const limit = args.limit || 10

    // 最新の価値スコアを取得
    const valueScores = await ctx.db
      .query('instagramValue')
      .filter((q) => q.gte(q.field('valueScore'), minScore))
      .order('desc')
      .take(limit)

    // 広告情報を結合
    const highValueAds = await Promise.all(
      valueScores.map(async (score) => {
        const adInfo = await ctx.db
          .query('metaInsights')
          .filter((q) => q.eq(q.field('ad_id'), score.adId))
          .first()

        return {
          adId: score.adId,
          adName: adInfo?.ad_name || 'Unknown',
          campaignName: adInfo?.campaign_name || 'Unknown',
          valueScore: score.valueScore,
          saveRate: score.saveRate,
          profileToFollowRate: score.profileToFollowRate,
          date: score.date,
        }
      })
    )

    return highValueAds
  },
})
