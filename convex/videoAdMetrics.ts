import { v } from 'convex/values'
import { query, mutation } from './_generated/server'

// 動画疲労度メトリクス
export interface VideoFatigueMetrics {
  avgWatchTime: number // 平均視聴時間（秒）
  completionFunnel: {
    p25: number // 25%到達率
    p50: number // 50%到達率
    p75: number // 75%到達率
    p95: number // 95%到達率
  }
  thruplayRate: number // 15秒/全体視聴率
  dropoffPoint: number // 主要離脱ポイント（秒）
  engagementDecay: number // エンゲージメント減衰率
  retentionScore: number // 視聴維持スコア（0-100）
}

// 動画メトリクスデータ
export interface VideoMetrics {
  date: string
  videoPlays: number // 動画再生数
  videoViews: number // 3秒以上視聴数
  videoAvgWatchTime: number // 平均視聴時間
  videoP25Watched: number // 25%到達数
  videoP50Watched: number // 50%到達数
  videoP75Watched: number // 75%到達数
  videoP95Watched: number // 95%到達数
  videoP100Watched: number // 完全視聴数
  video15sViews: number // 15秒視聴数（ThruPlay）
  videoSoundOnViews?: number // 音声オン視聴数
  impressions: number
}

// 視聴ファネルの分析
export function analyzeVideoFunnel(metrics: VideoMetrics[]): VideoFatigueMetrics {
  if (metrics.length === 0) {
    return {
      avgWatchTime: 0,
      completionFunnel: { p25: 0, p50: 0, p75: 0, p95: 0 },
      thruplayRate: 0,
      dropoffPoint: 0,
      engagementDecay: 0,
      retentionScore: 0,
    }
  }

  // 時系列でソート
  const sortedMetrics = [...metrics].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  // 最近のメトリクスと初期のメトリクスを比較
  const recentMetrics = sortedMetrics.slice(-7) // 直近7日
  const baselineMetrics = sortedMetrics.slice(0, Math.min(3, sortedMetrics.length)) // 最初の3日

  // 平均値を計算
  const calculateAverage = (arr: VideoMetrics[], field: keyof VideoMetrics): number => {
    const sum = arr.reduce((acc, m) => acc + Number(m[field] || 0), 0)
    return arr.length > 0 ? sum / arr.length : 0
  }

  // 現在の完了率を計算
  const currentMetrics = recentMetrics[recentMetrics.length - 1] || metrics[0]
  const plays = currentMetrics.videoPlays || 1

  const completionFunnel = {
    p25: (currentMetrics.videoP25Watched / plays) * 100,
    p50: (currentMetrics.videoP50Watched / plays) * 100,
    p75: (currentMetrics.videoP75Watched / plays) * 100,
    p95: (currentMetrics.videoP95Watched / plays) * 100,
  }

  // 主要離脱ポイントの特定（パーセンテージで表現）
  let dropoffPoint = 0
  const dropoffs = [
    { point: 25, rate: 100 - completionFunnel.p25 },
    { point: 50, rate: completionFunnel.p25 - completionFunnel.p50 },
    { point: 75, rate: completionFunnel.p50 - completionFunnel.p75 },
    { point: 95, rate: completionFunnel.p75 - completionFunnel.p95 },
  ]

  const maxDropoff = dropoffs.reduce((max, current) => (current.rate > max.rate ? current : max))
  dropoffPoint = maxDropoff.point

  // エンゲージメント減衰率の計算
  const baselineP95 =
    calculateAverage(baselineMetrics, 'videoP95Watched') /
    calculateAverage(baselineMetrics, 'videoPlays')
  const recentP95 =
    calculateAverage(recentMetrics, 'videoP95Watched') /
    calculateAverage(recentMetrics, 'videoPlays')

  const engagementDecay = baselineP95 > 0 ? Math.max(0, (baselineP95 - recentP95) / baselineP95) : 0

  // ThruPlay率の計算
  const thruplayRate = (currentMetrics.video15sViews / currentMetrics.impressions) * 100

  // 視聴維持スコアの計算（0-100）
  let retentionScore = 100
  retentionScore -= engagementDecay * 50 // 減衰率による減点（最大50点）
  retentionScore -= Math.max(0, 30 - completionFunnel.p95) // 95%完了率による減点
  retentionScore = Math.max(0, Math.min(100, retentionScore))

  return {
    avgWatchTime: currentMetrics.videoAvgWatchTime,
    completionFunnel,
    thruplayRate,
    dropoffPoint,
    engagementDecay,
    retentionScore,
  }
}

// 動画疲労度スコアの計算
export function calculateVideoFatigueScore(metrics: VideoFatigueMetrics): number {
  let score = 0

  // 視聴完了率による採点（40点満点）
  if (metrics.completionFunnel.p95 < 10) score += 40
  else if (metrics.completionFunnel.p95 < 20) score += 30
  else if (metrics.completionFunnel.p95 < 30) score += 20
  else if (metrics.completionFunnel.p95 < 40) score += 10

  // エンゲージメント減衰による採点（30点満点）
  if (metrics.engagementDecay > 0.5) score += 30
  else if (metrics.engagementDecay > 0.3) score += 20
  else if (metrics.engagementDecay > 0.15) score += 10

  // ThruPlay率による採点（30点満点）
  if (metrics.thruplayRate < 5) score += 30
  else if (metrics.thruplayRate < 10) score += 20
  else if (metrics.thruplayRate < 15) score += 10

  return Math.min(100, score)
}

// 動画メトリクスの取得
export const getVideoMetrics = query({
  args: {
    adId: v.string(),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const endDate = args.endDate || new Date().toISOString().split('T')[0]
    const startDate =
      args.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const insights = await ctx.db
      .query('metaInsights')
      .filter((q) =>
        q.and(
          q.eq(q.field('ad_id'), args.adId),
          q.gte(q.field('date_start'), startDate),
          q.lte(q.field('date_start'), endDate)
        )
      )
      .collect()

    // 動画メトリクスのみを抽出
    const videoMetrics: VideoMetrics[] = insights
      .filter((i) => i.video_plays || i.video_views) // 動画関連データがあるもののみ
      .map((i) => ({
        date: i.date_start || '',
        videoPlays: i.video_plays || 0,
        videoViews: i.video_views || 0,
        videoAvgWatchTime: i.video_avg_time_watched || 0,
        videoP25Watched: i.video_p25_watched || 0,
        videoP50Watched: i.video_p50_watched || 0,
        videoP75Watched: i.video_p75_watched || 0,
        videoP95Watched: i.video_p95_watched || 0,
        videoP100Watched: i.video_p100_watched || 0,
        video15sViews: i.video_15s_views || i.video_thruplay || 0,
        videoSoundOnViews: i.video_sound_on || 0,
        impressions: i.impressions || 0,
      }))

    return videoMetrics
  },
})

// 動画パフォーマンスの保存
export const saveVideoPerformance = mutation({
  args: {
    accountId: v.string(),
    adId: v.string(),
    date: v.string(),
    metrics: v.object({
      avgWatchTime: v.number(),
      p25Reached: v.number(),
      p50Reached: v.number(),
      p75Reached: v.number(),
      p95Reached: v.number(),
      thruplayRate: v.number(),
      dropoffPoint: v.number(),
      engagementDecay: v.number(),
      retentionScore: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('videoPerformance')
      .filter((q) => q.and(q.eq(q.field('adId'), args.adId), q.eq(q.field('date'), args.date)))
      .first()

    const data = {
      adId: args.adId,
      date: args.date,
      avgWatchTime: args.metrics.avgWatchTime,
      p25Reached: args.metrics.p25Reached,
      p50Reached: args.metrics.p50Reached,
      p75Reached: args.metrics.p75Reached,
      p95Reached: args.metrics.p95Reached,
      thruplayRate: args.metrics.thruplayRate,
      dropoffPoint: args.metrics.dropoffPoint,
      engagementDecay: args.metrics.engagementDecay,
      retentionScore: args.metrics.retentionScore,
    }

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...data,
        updatedAt: new Date().toISOString(),
      })
    } else {
      await ctx.db.insert('videoPerformance', {
        ...data,
        accountId: args.accountId,
        p100Reached: 0, // TODO: 実際の値を計算
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    }

    return { success: true }
  },
})

// 動画疲労広告の特定
export const getVideoFatigueAds = query({
  args: {
    accountId: v.string(),
    minFatigueScore: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const minScore = args.minFatigueScore || 50
    const limit = args.limit || 10

    // 最新の動画パフォーマンスデータを取得
    const performances = await ctx.db.query('videoPerformance').order('desc').take(100)

    // 疲労度スコアを計算してフィルタリング
    const fatigueAds = performances
      .map((perf) => {
        const fatigueMetrics: VideoFatigueMetrics = {
          avgWatchTime: perf.avgWatchTime,
          completionFunnel: {
            p25: perf.p25Reached,
            p50: perf.p50Reached,
            p75: perf.p75Reached,
            p95: perf.p95Reached,
          },
          thruplayRate: perf.thruplayRate,
          dropoffPoint: perf.dropoffPoint,
          engagementDecay: perf.engagementDecay,
          retentionScore: perf.retentionScore,
        }

        const fatigueScore = calculateVideoFatigueScore(fatigueMetrics)

        return {
          adId: perf.adId,
          date: perf.date,
          fatigueScore,
          metrics: fatigueMetrics,
        }
      })
      .filter((ad) => ad.fatigueScore >= minScore)
      .slice(0, limit)

    return fatigueAds
  },
})
