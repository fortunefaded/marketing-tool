import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { Id } from './_generated/dataModel'
import {
  FATIGUE_THRESHOLDS,
  SCORE_WEIGHTS,
  FATIGUE_LEVEL_THRESHOLDS,
  RECOMMENDED_ACTIONS,
} from './config/fatigueThresholds'
// import { api } from "./_generated/api" // 未使用のため削除

// 疲労度タイプ
export type FatigueType = 'audience' | 'creative' | 'algorithm'

// 疲労度レベル
export type FatigueLevel = 'healthy' | 'caution' | 'warning' | 'critical'

// 疲労度スコア型
export interface FatigueScore {
  total: number
  breakdown: {
    audience: number // Frequency, First Time Ratio
    creative: number // CTR低下、エンゲージメント
    algorithm: number // CPM上昇、配信効率
  }
  primaryIssue: FatigueType
  status: FatigueLevel
}

// Phase 2: アルゴリズムペナルティメトリクス
export interface AlgorithmPenaltyMetrics {
  cpmIncreaseRate: number
  deliveryRate: number
  qualityRanking?: string
  relevanceScore?: number
  penaltyDetected: boolean
  severity: 'none' | 'low' | 'medium' | 'high'
}

// Phase 2: ネガティブフィードバックメトリクス
export interface NegativeFeedbackMetrics {
  hideClicks: number
  reportSpamClicks: number
  unlikePageClicks: number
  totalNegativeActions: number
  negativeRate: number
  userSentiment: 'positive' | 'neutral' | 'negative'
}

// First Time Impression Ratioの計算
function calculateFirstTimeRatio(insights: any[]): number {
  if (insights.length < 2) return 1.0

  const sortedInsights = [...insights].sort(
    (a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime()
  )

  const todayData = sortedInsights[sortedInsights.length - 1]
  const yesterdayData = sortedInsights[sortedInsights.length - 2]

  const todayReach = todayData.reach || 0
  const yesterdayReach = yesterdayData?.reach || 0
  const todayImpressions = todayData.impressions || 1

  const dailyNewReach = Math.max(0, todayReach - yesterdayReach)
  const firstTimeRatio = dailyNewReach / todayImpressions

  return Math.max(0, Math.min(1, firstTimeRatio))
}

// CTR低下率の計算
function calculateCTRDeclineRate(insights: any[]): number {
  if (insights.length < 4) return 0

  const sortedInsights = [...insights].sort(
    (a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime()
  )

  // 最初の3日間の平均CTRをベースラインとする
  const baselineInsights = sortedInsights.slice(0, 3)
  const recentInsights = sortedInsights.slice(-3)

  const baselineCTR =
    baselineInsights.reduce((sum, i) => sum + (i.ctr || 0), 0) / baselineInsights.length
  const recentCTR = recentInsights.reduce((sum, i) => sum + (i.ctr || 0), 0) / recentInsights.length

  if (baselineCTR === 0) return 0

  const declineRate = (baselineCTR - recentCTR) / baselineCTR
  return Math.max(0, declineRate)
}

// CPM上昇率の計算
function calculateCPMIncreaseRate(insights: any[]): number {
  if (insights.length < 4) return 0

  const sortedInsights = [...insights].sort(
    (a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime()
  )

  // 最初の3日間の平均CPMをベースラインとする
  const baselineInsights = sortedInsights.slice(0, 3)
  const recentInsights = sortedInsights.slice(-3)

  const baselineCPM =
    baselineInsights.reduce((sum, i) => sum + (i.cpm || 0), 0) / baselineInsights.length
  const recentCPM = recentInsights.reduce((sum, i) => sum + (i.cpm || 0), 0) / recentInsights.length

  if (baselineCPM === 0) return 0

  const increaseRate = (recentCPM - baselineCPM) / baselineCPM
  return Math.max(0, increaseRate)
}

// Phase 2: アルゴリズムペナルティの検出
function detectAlgorithmPenalty(
  insights: any[],
  cpmIncreaseRate: number,
  ctrDeclineRate: number
): AlgorithmPenaltyMetrics {
  const latestInsight = insights[insights.length - 1]
  const deliveryRate = latestInsight.reach ? latestInsight.impressions / latestInsight.reach : 0

  // CPMが20%以上上昇 + CTR低下 = アルゴリズムペナルティ
  const penaltyDetected = cpmIncreaseRate > 0.2 && ctrDeclineRate > 0.1

  let severity: 'none' | 'low' | 'medium' | 'high' = 'none'
  if (penaltyDetected) {
    if (cpmIncreaseRate > 0.5) severity = 'high'
    else if (cpmIncreaseRate > 0.35) severity = 'medium'
    else severity = 'low'
  }

  return {
    cpmIncreaseRate,
    deliveryRate,
    qualityRanking: latestInsight.quality_ranking,
    relevanceScore: latestInsight.relevance_score,
    penaltyDetected,
    severity,
  }
}

// Phase 2: ネガティブフィードバックの計算
function calculateNegativeFeedback(insight: any): NegativeFeedbackMetrics {
  const hideClicks = Number(insight.hide_clicks || 0)
  const reportSpamClicks = Number(insight.report_spam_clicks || 0)
  const unlikePageClicks = Number(insight.unlike_page_clicks || 0)

  const totalNegativeActions = hideClicks + reportSpamClicks + unlikePageClicks
  const impressions = Number(insight.impressions || 1)
  const negativeRate = totalNegativeActions / impressions

  // 0.1%超で警告、0.3%超で危険
  let userSentiment: 'positive' | 'neutral' | 'negative' = 'positive'
  if (negativeRate > 0.003) userSentiment = 'negative'
  else if (negativeRate > 0.001) userSentiment = 'neutral'

  return {
    hideClicks,
    reportSpamClicks,
    unlikePageClicks,
    totalNegativeActions,
    negativeRate,
    userSentiment,
  }
}

// オーディエンス疲労度スコアの計算
function calculateAudienceFatigueScore(frequency: number, firstTimeRatio: number): number {
  let score = 0

  // Frequency による採点 (50点満点)
  if (frequency >= FATIGUE_THRESHOLDS.frequency.critical) {
    score += 50
  } else if (frequency >= FATIGUE_THRESHOLDS.frequency.warning) {
    score += 35
  } else if (frequency >= FATIGUE_THRESHOLDS.frequency.safe) {
    score += 20
  }

  // First Time Ratio による採点 (50点満点)
  if (firstTimeRatio <= FATIGUE_THRESHOLDS.firstTimeRatio.critical) {
    score += 50
  } else if (firstTimeRatio <= FATIGUE_THRESHOLDS.firstTimeRatio.warning) {
    score += 35
  } else if (firstTimeRatio <= FATIGUE_THRESHOLDS.firstTimeRatio.safe) {
    score += 20
  }

  return Math.min(100, score)
}

// クリエイティブ疲労度スコアの計算
function calculateCreativeFatigueScore(ctrDeclineRate: number): number {
  if (ctrDeclineRate >= FATIGUE_THRESHOLDS.ctrDecline.critical) {
    return 100
  } else if (ctrDeclineRate >= FATIGUE_THRESHOLDS.ctrDecline.warning) {
    return 70
  } else if (ctrDeclineRate >= FATIGUE_THRESHOLDS.ctrDecline.safe) {
    return 40
  }
  return 0
}

// アルゴリズム疲労度スコアの計算
function calculateAlgorithmFatigueScore(cpmIncreaseRate: number): number {
  if (cpmIncreaseRate >= FATIGUE_THRESHOLDS.cpmIncrease.critical) {
    return 100
  } else if (cpmIncreaseRate >= FATIGUE_THRESHOLDS.cpmIncrease.warning) {
    return 70
  } else if (cpmIncreaseRate >= FATIGUE_THRESHOLDS.cpmIncrease.safe) {
    return 40
  }
  return 0
}

// 疲労度レベルの判定
function getFatigueLevel(score: number): FatigueLevel {
  if (score >= FATIGUE_LEVEL_THRESHOLDS.warning) return 'critical'
  if (score >= FATIGUE_LEVEL_THRESHOLDS.caution) return 'warning'
  if (score >= FATIGUE_LEVEL_THRESHOLDS.healthy) return 'caution'
  return 'healthy'
}

// 推奨アクションの生成
function getRecommendedAction(score: FatigueScore): string {
  const { primaryIssue, status } = score

  if (status === 'critical') {
    return RECOMMENDED_ACTIONS[primaryIssue].critical
  } else if (status === 'warning') {
    return RECOMMENDED_ACTIONS[primaryIssue].warning
  } else if (status === 'caution') {
    return RECOMMENDED_ACTIONS[primaryIssue].caution
  }

  return RECOMMENDED_ACTIONS.healthy
}

// Phase 2: 拡張版疲労度計算
export const calculateAdvancedFatigueScore = query({
  args: {
    accountId: v.string(),
    adId: v.string(),
    includeVideo: v.optional(v.boolean()),
    includeInstagram: v.optional(v.boolean()),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { analyzeVideoFunnel, calculateVideoFatigueScore } = await import('./videoAdMetrics')
    const { calculateInstagramValue } = await import('./instagramValueMetrics')

    // Phase 1の基本計算を直接実行
    const insights = await ctx.db
      .query('metaInsights')
      .filter((q) => {
        if (args.accountId) {
          return q.and(
            q.eq(q.field('accountId'), args.accountId),
            q.eq(q.field('ad_id'), args.adId)
          )
        } else {
          return q.eq(q.field('ad_id'), args.adId)
        }
      })
      .order('desc')
      .take(30)

    if (insights.length === 0) {
      return {
        error: 'NO_DATA',
        message: '指定された期間のデータが見つかりません',
        dataPoints: 0,
      }
    }

    // 基本的な疲労度計算
    const basicMetrics = {
      frequency: insights[0]?.frequency || 0,
      firstTimeRatio: calculateFirstTimeRatio(insights),
      ctrDeclineRate: calculateCTRDeclineRate(insights),
      cpmIncreaseRate: calculateCPMIncreaseRate(insights),
      reach: insights[0]?.reach || 0,
      impressions: insights[0]?.impressions || 0,
      ctr: insights[0]?.ctr || 0,
      cpm: insights[0]?.cpm || 0,
    }

    // 各疲労度スコアを直接計算
    const basicAudienceScore = calculateAudienceFatigueScore(
      basicMetrics.frequency,
      basicMetrics.firstTimeRatio
    )
    const basicCreativeScore = calculateCreativeFatigueScore(basicMetrics.ctrDeclineRate)
    const basicAlgorithmScore = calculateAlgorithmFatigueScore(basicMetrics.cpmIncreaseRate)

    const basicScore = {
      breakdown: {
        audience: basicAudienceScore,
        creative: basicCreativeScore,
        algorithm: basicAlgorithmScore,
      },
    }

    // 最新のインサイトデータを取得（ネガティブフィードバック用）
    const latestInsight = await ctx.db
      .query('metaInsights')
      .filter((q) => {
        if (args.accountId) {
          return q.and(
            q.eq(q.field('accountId'), args.accountId),
            q.eq(q.field('ad_id'), args.adId)
          )
        } else {
          return q.eq(q.field('ad_id'), args.adId)
        }
      })
      .order('desc')
      .first()

    // アルゴリズムペナルティの検出
    const algorithmMetrics = detectAlgorithmPenalty(
      [latestInsight], // 簡易的に最新データのみ使用
      basicMetrics.cpmIncreaseRate,
      basicMetrics.ctrDeclineRate
    )

    // ネガティブフィードバックの計算
    const negativeFeedback = latestInsight
      ? calculateNegativeFeedback(latestInsight)
      : {
          hideClicks: 0,
          reportSpamClicks: 0,
          unlikePageClicks: 0,
          totalNegativeActions: 0,
          negativeRate: 0,
          userSentiment: 'positive' as const,
        }

    // Instagram価値指標（オプション）
    let instagramValue = null
    if (args.includeInstagram) {
      // Instagram メトリクスを直接計算
      // 注: 現在のスキーマではInstagram固有のフィールドが不足しているため、簡易版を使用
      const igInsights = insights.filter(
        (i) =>
          i.creative_type?.toLowerCase().includes('instagram') ||
          i.ad_name?.toLowerCase().includes('instagram')
      )

      const igMetrics =
        igInsights.length > 0
          ? {
              saves: 0, // TODO: savesフィールドをスキーマに追加
              profileVisits: 0, // TODO: profile_visitsフィールドをスキーマに追加
              follows: 0, // TODO: followsフィールドをスキーマに追加
              shares: 0, // calculateInstagramValueに必要
              comments: 0, // calculateInstagramValueに必要
              likes: 0, // calculateInstagramValueに必要
              impressions: igInsights.reduce((sum, i) => sum + (i.impressions || 0), 0),
              reach: igInsights.reduce((sum, i) => sum + (i.reach || 0), 0),
              engagement: igInsights.reduce(
                (sum, i) =>
                  sum + ((i.clicks || 0) + ((i.engagement_rate || 0) * (i.impressions || 0)) / 100),
                0
              ),
            }
          : null

      if (igMetrics) {
        instagramValue = calculateInstagramValue(igMetrics)
      }
    }

    // 動画メトリクス（オプション）
    let videoMetrics = null
    let videoFatigueScore = 0
    if (args.includeVideo) {
      // 動画メトリクスを直接計算
      const videoInsights = insights.filter((i) => i.video_views !== undefined)

      const metrics = videoInsights.map((i) => ({
        date: i.date_start || '',
        videoPlays: i.video_views || 0,
        videoViews: i.video_views || 0,
        videoAvgWatchTime: 0, // TODO: video_avg_time_watched_actionsフィールドをスキーマに追加
        videoP25Watched: 0, // TODO: video_p25_watched_actionsフィールドをスキーマに追加
        videoP50Watched: 0, // TODO: video_p50_watched_actionsフィールドをスキーマに追加
        videoP75Watched: 0, // TODO: video_p75_watched_actionsフィールドをスキーマに追加
        videoP95Watched: 0, // TODO: video_p95_watched_actionsフィールドをスキーマに追加
        videoP100Watched: 0, // TODO: video_p100_watched_actionsフィールドをスキーマに追加
        video15sViews: 0, // TODO: video_15s_viewsフィールドをスキーマに追加
        impressions: i.impressions || 0,
      }))

      if (metrics && metrics.length > 0) {
        videoMetrics = analyzeVideoFunnel(metrics)
        videoFatigueScore = calculateVideoFatigueScore(videoMetrics)
      }
    }

    // スコアの再計算（Phase 2要素を含む）
    let audienceScore = basicScore.breakdown.audience
    let creativeScore = basicScore.breakdown.creative
    let algorithmScore = basicScore.breakdown.algorithm

    // ネガティブフィードバックによる加点
    if (negativeFeedback.negativeRate > 0.003) {
      audienceScore = Math.min(100, audienceScore + 30)
    } else if (negativeFeedback.negativeRate > 0.001) {
      audienceScore = Math.min(100, audienceScore + 15)
    }

    // アルゴリズムペナルティによる加点
    if (algorithmMetrics.penaltyDetected) {
      algorithmScore = Math.min(
        100,
        algorithmScore +
          (algorithmMetrics.severity === 'high'
            ? 40
            : algorithmMetrics.severity === 'medium'
              ? 25
              : 10)
      )
    }

    // 動画疲労度の反映
    if (videoFatigueScore > 0) {
      creativeScore = Math.max(creativeScore, videoFatigueScore)
    }

    // Instagram価値による減点（高価値の場合）
    if (instagramValue && instagramValue.totalValueScore > 20) {
      creativeScore = Math.max(0, creativeScore - instagramValue.totalValueScore)
      audienceScore = Math.max(0, audienceScore - instagramValue.totalValueScore * 0.5)
    }

    // 総合スコアの再計算
    const totalScore = Math.round(
      audienceScore * SCORE_WEIGHTS.audience +
        creativeScore * SCORE_WEIGHTS.creative +
        algorithmScore * SCORE_WEIGHTS.algorithm
    )

    // 主要問題の再判定
    const scores = { audience: audienceScore, creative: creativeScore, algorithm: algorithmScore }
    const primaryIssue = Object.entries(scores).sort(([, a], [, b]) => b - a)[0][0] as FatigueType

    const advancedFatigueScore: FatigueScore = {
      total: totalScore,
      breakdown: scores,
      primaryIssue,
      status: getFatigueLevel(totalScore),
    }

    // 推奨アクションの生成（拡張版）
    let recommendedAction = getRecommendedAction(advancedFatigueScore)

    // 緊急対応が必要な場合の追加アクション
    if (negativeFeedback.negativeRate > 0.003) {
      recommendedAction =
        '緊急: ネガティブフィードバック率が危険水準（0.3%超）です。広告を即座に停止し、コンテンツを見直してください。' +
        recommendedAction
    }

    if (algorithmMetrics.penaltyDetected && algorithmMetrics.severity === 'high') {
      recommendedAction =
        '警告: Metaアルゴリズムによる重大なペナルティが検出されました。キャンペーンの再構築を強く推奨します。' +
        recommendedAction
    }

    return {
      adId: args.adId,
      adName: insights[0]?.ad_name || 'Unknown',
      campaignId: insights[0]?.campaign_id || '',
      fatigueScore: advancedFatigueScore,
      metrics: {
        ...basicMetrics,
        algorithm: algorithmMetrics,
        negative: negativeFeedback,
        instagram: instagramValue,
        video: videoMetrics,
        videoFatigueScore,
      },
      recommendedAction,
      dataRangeStart: args.startDate || insights[insights.length - 1]?.date_start || '',
      dataRangeEnd: args.endDate || insights[0]?.date_start || '',
      analyzedAt: new Date().toISOString(),
      phase2Analysis: {
        algorithmPenalty: algorithmMetrics.penaltyDetected,
        negativeSentiment: negativeFeedback.userSentiment === 'negative',
        highInstagramValue: instagramValue?.totalValueScore
          ? instagramValue.totalValueScore > 20
          : false,
        videoFatigue: videoFatigueScore > 50,
      },
    }
  },
})

// 疲労度スコアの計算
export const calculateFatigueScore = query({
  args: {
    accountId: v.string(),
    adId: v.string(),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // 過去30日間のインサイトデータを取得
    const endDate = args.endDate || new Date().toISOString().split('T')[0]
    const startDate =
      args.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const insights = await ctx.db
      .query('metaInsights')
      .filter((q) =>
        q.and(
          q.eq(q.field('accountId'), args.accountId),
          q.eq(q.field('ad_id'), args.adId),
          q.gte(q.field('date_start'), startDate),
          q.lte(q.field('date_start'), endDate)
        )
      )
      .collect()

    if (insights.length < 3) {
      return {
        error: 'insufficient_data',
        message: '疲労度分析には最低3日分のデータが必要です。',
        dataPoints: insights.length,
      }
    }

    // 最新のデータから各指標を取得
    const latestData = insights[insights.length - 1]
    const frequency = latestData.frequency || 0
    const firstTimeRatio = calculateFirstTimeRatio(insights)
    const ctrDeclineRate = calculateCTRDeclineRate(insights)
    const cpmIncreaseRate = calculateCPMIncreaseRate(insights)

    // 各疲労度スコアを計算
    const audienceScore = calculateAudienceFatigueScore(frequency, firstTimeRatio)
    const creativeScore = calculateCreativeFatigueScore(ctrDeclineRate)
    const algorithmScore = calculateAlgorithmFatigueScore(cpmIncreaseRate)

    // 重み付け総合スコアを計算
    const totalScore = Math.round(
      audienceScore * SCORE_WEIGHTS.audience +
        creativeScore * SCORE_WEIGHTS.creative +
        algorithmScore * SCORE_WEIGHTS.algorithm
    )

    // 主要な問題を特定
    const scores = {
      audience: audienceScore,
      creative: creativeScore,
      algorithm: algorithmScore,
    }
    const primaryIssue = Object.entries(scores).sort(([, a], [, b]) => b - a)[0][0] as FatigueType

    const fatigueScore: FatigueScore = {
      total: totalScore,
      breakdown: scores,
      primaryIssue,
      status: getFatigueLevel(totalScore),
    }

    return {
      adId: args.adId,
      adName: latestData.ad_name || 'Unknown',
      campaignId: latestData.campaign_id || '',
      fatigueScore,
      metrics: {
        frequency,
        firstTimeRatio,
        ctrDeclineRate,
        cpmIncreaseRate,
        reach: latestData.reach || 0,
        impressions: latestData.impressions || 0,
        ctr: latestData.ctr || 0,
        cpm: latestData.cpm || 0,
      },
      recommendedAction: getRecommendedAction(fatigueScore),
      analyzedAt: new Date().toISOString(),
      dataRangeStart: startDate,
      dataRangeEnd: endDate,
    }
  },
})

// 疲労度分析結果の保存
export const saveFatigueAnalysis = mutation({
  args: {
    accountId: v.string(),
    adId: v.string(),
    adName: v.string(),
    creativeId: v.string(),
    campaignId: v.string(),
    fatigueScore: v.object({
      total: v.number(),
      breakdown: v.object({
        audience: v.number(),
        creative: v.number(),
        algorithm: v.number(),
      }),
      primaryIssue: v.union(v.literal('audience'), v.literal('creative'), v.literal('algorithm')),
      status: v.union(
        v.literal('healthy'),
        v.literal('caution'),
        v.literal('warning'),
        v.literal('critical')
      ),
    }),
    metrics: v.object({
      frequency: v.number(),
      firstTimeRatio: v.number(),
      ctrDeclineRate: v.number(),
      cpmIncreaseRate: v.number(),
      reach: v.number(),
      impressions: v.number(),
      ctr: v.number(),
      cpm: v.number(),
    }),
    recommendedAction: v.string(),
    dataRangeStart: v.string(),
    dataRangeEnd: v.string(),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString()

    // 既存の分析結果を確認
    const existing = await ctx.db
      .query('adFatigueScores')
      .filter((q) =>
        q.and(q.eq(q.field('accountId'), args.accountId), q.eq(q.field('adId'), args.adId))
      )
      .first()

    const data = {
      accountId: args.accountId,
      adId: args.adId,
      adName: args.adName,
      creativeId: args.creativeId,
      campaignId: args.campaignId,

      // スコア
      audienceFatigueScore: args.fatigueScore.breakdown.audience,
      creativeFatigueScore: args.fatigueScore.breakdown.creative,
      algorithmFatigueScore: args.fatigueScore.breakdown.algorithm,
      totalFatigueScore: args.fatigueScore.total,

      // メトリクス
      frequency: args.metrics.frequency,
      firstTimeImpressionRatio: args.metrics.firstTimeRatio,
      ctrDeclineRate: args.metrics.ctrDeclineRate,
      cpmIncreaseRate: args.metrics.cpmIncreaseRate,
      reach: args.metrics.reach,
      impressions: args.metrics.impressions,
      ctr: args.metrics.ctr,
      cpm: args.metrics.cpm,
      daysActive: 0, // TODO: 計算する

      // 状態
      fatigueLevel: args.fatigueScore.status,
      recommendedAction: args.recommendedAction,
      alertTriggered:
        args.fatigueScore.status === 'critical' || args.fatigueScore.status === 'warning',

      // メタデータ
      calculatedAt: now,
      baselineDate: args.dataRangeStart,
      dataRangeStart: args.dataRangeStart,
      dataRangeEnd: args.dataRangeEnd,
    }

    let recordId: Id<'adFatigueScores'>

    if (existing) {
      await ctx.db.patch(existing._id, data)
      recordId = existing._id
    } else {
      recordId = await ctx.db.insert('adFatigueScores', data)
    }

    // アラートのトリガー
    if (data.alertTriggered) {
      await ctx.db.insert('fatigueAlerts', {
        accountId: args.accountId,
        adId: args.adId,
        adName: args.adName,
        campaignId: args.campaignId,
        alertLevel: args.fatigueScore.status as 'caution' | 'warning' | 'critical',
        alertType:
          args.fatigueScore.primaryIssue === 'audience'
            ? 'frequency_exceeded'
            : args.fatigueScore.primaryIssue === 'creative'
              ? 'ctr_decline'
              : 'cpm_increase',
        triggerMetrics: {
          frequency: args.metrics.frequency,
          ctrDecline: args.metrics.ctrDeclineRate,
          cpmIncrease: args.metrics.cpmIncreaseRate,
          firstTimeRatio: args.metrics.firstTimeRatio,
        },
        notificationSent: false,
        createdAt: now,
      })
    }

    // トレンドデータの保存
    await ctx.db.insert('fatigueTrends', {
      accountId: args.accountId,
      adId: args.adId,
      date: args.dataRangeEnd,
      frequency: args.metrics.frequency,
      ctr: args.metrics.ctr,
      cpm: args.metrics.cpm,
      reach: args.metrics.reach,
      newReach: Math.round(args.metrics.reach * args.metrics.firstTimeRatio),
      impressions: args.metrics.impressions,
      firstTimeRatio: args.metrics.firstTimeRatio,
      ctrChangeFromBaseline: args.metrics.ctrDeclineRate,
      cpmChangeFromBaseline: args.metrics.cpmIncreaseRate,
      audienceFatigueScore: args.fatigueScore.breakdown.audience,
      creativeFatigueScore: args.fatigueScore.breakdown.creative,
      algorithmFatigueScore: args.fatigueScore.breakdown.algorithm,
      totalFatigueScore: args.fatigueScore.total,
      createdAt: now,
    })

    return { success: true, recordId }
  },
})

// 疲労度ステータスの取得
export const getFatigueStatus = query({
  args: {
    accountId: v.string(),
    adId: v.optional(v.string()),
    campaignId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query('adFatigueScores')
      .filter((q) => q.eq(q.field('accountId'), args.accountId))

    if (args.adId) {
      query = query.filter((q) => q.eq(q.field('adId'), args.adId))
    }

    if (args.campaignId) {
      query = query.filter((q) => q.eq(q.field('campaignId'), args.campaignId))
    }

    return await query.collect()
  },
})

// 疲労度タイプの分析
export const analyzeFatigueType = query({
  args: {
    accountId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 100

    const scores = await ctx.db
      .query('adFatigueScores')
      .filter((q) => q.eq(q.field('accountId'), args.accountId))
      .order('desc')
      .take(limit)

    // タイプ別集計
    const typeBreakdown = {
      audience: 0,
      creative: 0,
      algorithm: 0,
    }

    const levelBreakdown = {
      healthy: 0,
      caution: 0,
      warning: 0,
      critical: 0,
    }

    scores.forEach((score) => {
      // 主要問題の集計
      const breakdown = {
        audience: score.audienceFatigueScore,
        creative: score.creativeFatigueScore,
        algorithm: score.algorithmFatigueScore,
      }

      const primaryIssue = Object.entries(breakdown).sort(
        ([, a], [, b]) => b - a
      )[0][0] as FatigueType

      typeBreakdown[primaryIssue]++

      // レベル別集計
      levelBreakdown[score.fatigueLevel]++
    })

    return {
      total: scores.length,
      typeBreakdown,
      levelBreakdown,
      criticalAds: scores
        .filter((s) => s.fatigueLevel === 'critical')
        .map((s) => ({
          adId: s.adId,
          adName: s.adName,
          totalScore: s.totalFatigueScore,
          recommendedAction: s.recommendedAction,
        })),
    }
  },
})

// 推奨アクションの生成
export const getRecommendedActions = query({
  args: {
    accountId: v.string(),
    minScore: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const minScore = args.minScore || 50

    const problematicAds = await ctx.db
      .query('adFatigueScores')
      .filter((q) =>
        q.and(
          q.eq(q.field('accountId'), args.accountId),
          q.gte(q.field('totalFatigueScore'), minScore)
        )
      )
      .collect()

    return problematicAds.map((ad) => ({
      adId: ad.adId,
      adName: ad.adName,
      campaignId: ad.campaignId,
      fatigueLevel: ad.fatigueLevel,
      totalScore: ad.totalFatigueScore,
      primaryIssue: {
        audience: ad.audienceFatigueScore,
        creative: ad.creativeFatigueScore,
        algorithm: ad.algorithmFatigueScore,
      },
      recommendedAction: ad.recommendedAction,
      metrics: {
        frequency: ad.frequency,
        firstTimeRatio: ad.firstTimeImpressionRatio,
        ctrDeclineRate: ad.ctrDeclineRate,
        cpmIncreaseRate: ad.cpmIncreaseRate,
      },
    }))
  },
})
