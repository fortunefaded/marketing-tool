import { v } from 'convex/values'
import { mutation, internalMutation } from './_generated/server'

// スケジュールされた疲労度分析の設定
export const scheduleFatigueAnalysis = mutation({
  args: {
    accountId: v.string(),
    interval: v.union(
      v.literal('15min'),
      v.literal('30min'),
      v.literal('hourly'),
      v.literal('daily')
    ),
    enabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('fatigueAnalysisSchedules')
      .filter((q) => q.eq(q.field('accountId'), args.accountId))
      .first()

    const data = {
      accountId: args.accountId,
      interval: args.interval,
      enabled: args.enabled,
      lastRun: existing?.lastRun || undefined,
      nextRun: calculateNextRun(args.interval),
      updatedAt: new Date().toISOString(),
    }

    if (existing) {
      const { accountId: _accountId, ...updateData } = data
      void _accountId // accountIdは除外して更新（重複を避けるため）
      await ctx.db.patch(existing._id, updateData)
    } else {
      await ctx.db.insert('fatigueAnalysisSchedules', {
        ...data,
        createdAt: new Date().toISOString(),
      })
    }

    return { success: true }
  },
})

// 次回実行時刻を計算
function calculateNextRun(interval: string): string {
  const now = new Date()
  switch (interval) {
    case '15min':
      now.setMinutes(now.getMinutes() + 15)
      break
    case '30min':
      now.setMinutes(now.getMinutes() + 30)
      break
    case 'hourly':
      now.setHours(now.getHours() + 1)
      break
    case 'daily':
      now.setDate(now.getDate() + 1)
      break
  }
  return now.toISOString()
}

// スケジュールされた分析を実行（内部関数）
export const runScheduledAnalysis = internalMutation({
  args: {},
  handler: async (ctx) => {
    // 実行予定のスケジュールを取得
    const schedules = await ctx.db
      .query('fatigueAnalysisSchedules')
      .filter((q) =>
        q.and(q.eq(q.field('enabled'), true), q.lte(q.field('nextRun'), new Date().toISOString()))
      )
      .collect()

    for (const schedule of schedules) {
      try {
        // アカウントの全広告を取得
        const ads = await ctx.db
          .query('metaInsights')
          .filter((q) => q.eq(q.field('accountId'), schedule.accountId))
          .collect()

        // ユニークな広告IDを抽出
        const uniqueAdIds = [...new Set(ads.filter((ad) => ad.ad_id).map((ad) => ad.ad_id!))]

        // 各広告の疲労度を分析
        for (const adId of uniqueAdIds.slice(0, 50)) {
          // 一度に最大50件
          await analyzeAdFatigue(ctx, schedule.accountId, adId)
        }

        // スケジュールを更新
        await ctx.db.patch(schedule._id, {
          lastRun: new Date().toISOString(),
          nextRun: calculateNextRun(schedule.interval),
          lastRunStatus: 'success',
          lastRunAdsAnalyzed: uniqueAdIds.length,
        })
      } catch (error) {
        // エラーを記録
        await ctx.db.patch(schedule._id, {
          lastRun: new Date().toISOString(),
          nextRun: calculateNextRun(schedule.interval),
          lastRunStatus: 'error',
          lastRunError: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }
  },
})

// 単一広告の疲労度分析
async function analyzeAdFatigue(ctx: any, accountId: string, adId: string) {
  const lookbackDays = 21
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(endDate.getDate() - lookbackDays)

  // Insightsデータを取得
  const insights = await ctx.db
    .query('metaInsights')
    .filter((q: any) =>
      q.and(
        q.eq(q.field('accountId'), accountId),
        q.eq(q.field('ad_id'), adId),
        q.gte(q.field('date_start'), startDate.toISOString().split('T')[0]),
        q.lte(q.field('date_start'), endDate.toISOString().split('T')[0])
      )
    )
    .collect()

  if (insights.length === 0) return

  // メトリクスを計算（adFatigueCalculator.tsから移植）
  insights.sort((a: any, b: any) => a.date_start!.localeCompare(b.date_start!))

  // 基本メトリクスの集計
  let totalImpressions = 0
  let totalClicks = 0
  let totalSpend = 0
  let totalReach = 0
  let totalConversions = 0
  let frequencySum = 0
  let frequencyCount = 0

  for (const insight of insights) {
    totalImpressions += insight.impressions || 0
    totalClicks += insight.clicks || 0
    totalSpend += insight.spend || 0
    totalReach += insight.reach || 0
    totalConversions += insight.conversions || 0

    if (insight.frequency) {
      frequencySum += insight.frequency
      frequencyCount++
    }
  }

  const avgFrequency = frequencyCount > 0 ? frequencySum / frequencyCount : 0
  const avgCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0
  const avgCPM = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0

  // 疲労度メトリクスを計算
  const firstTimeRatio = calculateFirstTimeRatio(insights)
  const ctrDeclineRate = calculateCTRDeclineRate(insights)
  const cpmIncreaseRate = calculateCPMIncreaseRate(insights)

  // 疲労度スコアを計算
  const audienceScore = calculateAudienceScore(avgFrequency, firstTimeRatio)
  const creativeScore = calculateCreativeScore(ctrDeclineRate)
  const algorithmScore = calculateAlgorithmScore(cpmIncreaseRate, avgCTR)

  const totalScore = Math.round(audienceScore * 0.35 + creativeScore * 0.35 + algorithmScore * 0.3)

  const status =
    totalScore >= 70
      ? 'critical'
      : totalScore >= 50
        ? 'warning'
        : totalScore >= 30
          ? 'caution'
          : 'healthy'

  // 結果を保存
  const fatigueData = {
    accountId,
    adId,
    adName: insights[0].ad_name || '',
    campaignId: insights[0].campaign_id || '',
    fatigueScore: {
      total: totalScore,
      breakdown: {
        audience: audienceScore,
        creative: creativeScore,
        algorithm: algorithmScore,
      },
      primaryIssue:
        audienceScore > creativeScore && audienceScore > algorithmScore
          ? 'audience'
          : creativeScore > algorithmScore
            ? 'creative'
            : 'algorithm',
      status,
    },
    metrics: {
      frequency: avgFrequency,
      firstTimeRatio,
      ctrDeclineRate,
      cpmIncreaseRate,
      reach: totalReach,
      impressions: totalImpressions,
      ctr: avgCTR,
      cpm: avgCPM,
      conversions: totalConversions,
      daysActive: insights.length,
    },
    recommendedAction: generateRecommendation(status, avgFrequency, ctrDeclineRate),
    dataRangeStart: insights[0].date_start!,
    dataRangeEnd: insights[insights.length - 1].date_start!,
    analyzedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  // 既存のレコードを更新または新規作成
  const existing = await ctx.db
    .query('adFatigueResults')
    .filter((q: any) => q.and(q.eq(q.field('accountId'), accountId), q.eq(q.field('adId'), adId)))
    .first()

  if (existing) {
    await ctx.db.patch(existing._id, fatigueData)
  } else {
    await ctx.db.insert('adFatigueResults', {
      ...fatigueData,
      createdAt: new Date().toISOString(),
    })
  }

  // アラートをチェック
  if (status === 'critical' || status === 'warning') {
    await createFatigueAlert(ctx, accountId, adId, fatigueData)
  }
}

// ヘルパー関数（簡略版）
function calculateFirstTimeRatio(insights: any[]) {
  let previousReach = 0
  let totalNewReach = 0
  let totalImpressions = 0

  for (const insight of insights) {
    const currentReach = insight.reach || 0
    const newReach = Math.max(0, currentReach - previousReach)
    totalNewReach += newReach
    totalImpressions += insight.impressions || 0
    previousReach = currentReach
  }

  return totalImpressions > 0 ? totalNewReach / totalImpressions : 0
}

function calculateCTRDeclineRate(insights: any[]) {
  if (insights.length < 7) return 0

  const firstPeriod = insights.slice(0, 3)
  const lastPeriod = insights.slice(-3)

  const firstCTR = calculatePeriodCTR(firstPeriod)
  const lastCTR = calculatePeriodCTR(lastPeriod)

  return firstCTR > 0 ? Math.max(0, (firstCTR - lastCTR) / firstCTR) : 0
}

function calculateCPMIncreaseRate(insights: any[]) {
  if (insights.length < 7) return 0

  const firstPeriod = insights.slice(0, 3)
  const lastPeriod = insights.slice(-3)

  const firstCPM = calculatePeriodCPM(firstPeriod)
  const lastCPM = calculatePeriodCPM(lastPeriod)

  return firstCPM > 0 ? Math.max(0, (lastCPM - firstCPM) / firstCPM) : 0
}

function calculatePeriodCTR(insights: any[]) {
  let totalImpressions = 0
  let totalClicks = 0

  for (const insight of insights) {
    totalImpressions += insight.impressions || 0
    totalClicks += insight.clicks || 0
  }

  return totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0
}

function calculatePeriodCPM(insights: any[]) {
  let totalSpend = 0
  let totalImpressions = 0

  for (const insight of insights) {
    totalSpend += insight.spend || 0
    totalImpressions += insight.impressions || 0
  }

  return totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0
}

function calculateAudienceScore(frequency: number, firstTimeRatio: number): number {
  let score = 0
  if (frequency >= 4.0) score += 50
  else if (frequency >= 3.5) score += 40
  else if (frequency >= 3.0) score += 25
  else if (frequency >= 2.5) score += 10

  if (firstTimeRatio <= 0.2) score += 50
  else if (firstTimeRatio <= 0.3) score += 40
  else if (firstTimeRatio <= 0.4) score += 25
  else if (firstTimeRatio <= 0.5) score += 10

  return Math.min(100, score)
}

function calculateCreativeScore(ctrDecline: number): number {
  let score = 0
  if (ctrDecline >= 0.5) score += 70
  else if (ctrDecline >= 0.4) score += 55
  else if (ctrDecline >= 0.25) score += 35
  else if (ctrDecline >= 0.15) score += 15

  return Math.min(100, score)
}

function calculateAlgorithmScore(cpmIncrease: number, ctr: number): number {
  let score = 0
  if (cpmIncrease >= 0.4) score += 60
  else if (cpmIncrease >= 0.3) score += 45
  else if (cpmIncrease >= 0.2) score += 25
  else if (cpmIncrease >= 0.1) score += 10

  if (ctr < 0.5) score += 20
  else if (ctr < 0.8) score += 10

  return Math.min(100, score)
}

function generateRecommendation(status: string, frequency: number, ctrDecline: number): string {
  if (status === 'critical') {
    return `緊急対応が必要です。Frequency ${frequency.toFixed(1)}回、CTR低下率${(ctrDecline * 100).toFixed(0)}%。即座にクリエイティブを変更するか配信を停止してください。`
  } else if (status === 'warning') {
    return `注意が必要です。疲労の兆候が見られます。新しいクリエイティブのテストを開始することを推奨します。`
  }
  return `広告は健全な状態です。現在の配信戦略を維持してください。`
}

// 疲労度アラートの作成
async function createFatigueAlert(ctx: any, accountId: string, adId: string, fatigueData: any) {
  // 未解決の同じアラートがあるかチェック
  const existingAlert = await ctx.db
    .query('fatigueAlerts')
    .filter((q: any) =>
      q.and(
        q.eq(q.field('accountId'), accountId),
        q.eq(q.field('adId'), adId),
        q.eq(q.field('resolvedAt'), undefined)
      )
    )
    .first()

  if (existingAlert) return // 既にアラートがある場合はスキップ

  const alertType =
    fatigueData.metrics.frequency >= 3.5
      ? 'frequency_exceeded'
      : fatigueData.metrics.ctrDeclineRate >= 0.25
        ? 'ctr_decline'
        : fatigueData.metrics.cpmIncreaseRate >= 0.2
          ? 'cpm_increase'
          : 'multiple_factors'

  await ctx.db.insert('fatigueAlerts', {
    accountId,
    adId,
    adName: fatigueData.adName,
    campaignId: fatigueData.campaignId,
    alertLevel: fatigueData.fatigueScore.status,
    alertType,
    triggerMetrics: {
      frequency: fatigueData.metrics.frequency,
      ctrDecline: fatigueData.metrics.ctrDeclineRate,
      cpmIncrease: fatigueData.metrics.cpmIncreaseRate,
      firstTimeRatio: fatigueData.metrics.firstTimeRatio,
    },
    notificationSent: false,
    createdAt: new Date().toISOString(),
  })
}
