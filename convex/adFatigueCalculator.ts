import { v } from "convex/values"
import { query, mutation } from "./_generated/server"
import { Doc } from "./_generated/dataModel"

// Meta Insightsデータから疲労度メトリクスを計算
export const calculateFatigueFromInsights = query({
  args: {
    accountId: v.string(),
    adId: v.string(),
    lookbackDays: v.optional(v.float64()), // デフォルト21日
  },
  handler: async (ctx, args) => {
    const lookbackDays = args.lookbackDays || 21
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(endDate.getDate() - lookbackDays)
    
    // 対象期間のInsightsデータを取得
    const insights = await ctx.db
      .query("metaInsights")
      .filter(q => 
        q.and(
          q.eq(q.field("accountId"), args.accountId),
          q.eq(q.field("ad_id"), args.adId),
          q.gte(q.field("date_start"), startDate.toISOString().split('T')[0]),
          q.lte(q.field("date_start"), endDate.toISOString().split('T')[0])
        )
      )
      .collect()
    
    if (insights.length === 0) {
      return null
    }
    
    // 日付順にソート
    insights.sort((a, b) => a.date_start!.localeCompare(b.date_start!))
    
    // 基本メトリクスの集計
    const metrics = calculateBasicMetrics(insights)
    
    // 疲労度メトリクスの計算
    const fatigueMetrics = {
      frequency: metrics.avgFrequency,
      firstTimeRatio: calculateFirstTimeRatio(insights),
      ctrDeclineRate: calculateCTRDeclineRate(insights),
      cpmIncreaseRate: calculateCPMIncreaseRate(insights),
      negativeFeedbackRate: calculateNegativeFeedbackRate(insights),
      
      // 追加メトリクス
      reach: metrics.totalReach,
      impressions: metrics.totalImpressions,
      ctr: metrics.avgCTR,
      cpm: metrics.avgCPM,
      conversions: metrics.totalConversions,
      daysActive: insights.length,
      
      // 動画メトリクス（動画広告の場合）
      videoCompletionRate: calculateVideoCompletionRate(insights),
      avgWatchTime: calculateAvgWatchTime(insights),
      
      // Instagram特有指標
      instagramSaveRate: calculateInstagramSaveRate(insights),
      profileToFollowRate: calculateProfileToFollowRate(insights),
    }
    
    // 疲労度スコアの計算
    const fatigueScore = calculateFatigueScore(fatigueMetrics)
    
    // 広告情報
    const adInfo = {
      adId: args.adId,
      adName: insights[0].ad_name || '',
      campaignId: insights[0].campaign_id || '',
      campaignName: insights[0].campaign_name || '',
      creativeId: insights[0].creative_id || '',
      creativeType: insights[0].creative_type || '',
    }
    
    return {
      ...adInfo,
      metrics: fatigueMetrics,
      fatigueScore,
      dataRange: {
        start: insights[0].date_start,
        end: insights[insights.length - 1].date_start,
      },
      analyzedAt: new Date().toISOString(),
    }
  }
})

// 基本メトリクスの集計
function calculateBasicMetrics(insights: Doc<"metaInsights">[]) {
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
  
  return {
    totalImpressions,
    totalClicks,
    totalSpend,
    totalReach,
    totalConversions,
    avgFrequency: frequencyCount > 0 ? frequencySum / frequencyCount : 0,
    avgCTR: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
    avgCPM: totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0,
  }
}

// 初回インプレッション比率の計算
function calculateFirstTimeRatio(insights: Doc<"metaInsights">[]) {
  // 日次の新規リーチを推定
  let previousReach = 0
  let totalNewReach = 0
  let totalImpressions = 0
  
  for (const insight of insights) {
    const currentReach = insight.reach || 0
    const newReach = Math.max(0, currentReach - previousReach)
    const impressions = insight.impressions || 0
    
    totalNewReach += newReach
    totalImpressions += impressions
    previousReach = currentReach
  }
  
  // 初回インプレッション比率 = 新規リーチ ÷ 総インプレッション
  return totalImpressions > 0 ? totalNewReach / totalImpressions : 0
}

// CTR減少率の計算
function calculateCTRDeclineRate(insights: Doc<"metaInsights">[]) {
  if (insights.length < 7) return 0
  
  // 最初の3日間と最後の3日間のCTRを比較
  const firstPeriod = insights.slice(0, 3)
  const lastPeriod = insights.slice(-3)
  
  const firstCTR = calculatePeriodCTR(firstPeriod)
  const lastCTR = calculatePeriodCTR(lastPeriod)
  
  if (firstCTR === 0) return 0
  
  // 減少率 = (初期CTR - 現在CTR) / 初期CTR
  return Math.max(0, (firstCTR - lastCTR) / firstCTR)
}

// 期間のCTR計算
function calculatePeriodCTR(insights: Doc<"metaInsights">[]) {
  let totalImpressions = 0
  let totalClicks = 0
  
  for (const insight of insights) {
    totalImpressions += insight.impressions || 0
    totalClicks += insight.clicks || 0
  }
  
  return totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0
}

// CPM上昇率の計算
function calculateCPMIncreaseRate(insights: Doc<"metaInsights">[]) {
  if (insights.length < 7) return 0
  
  // 最初の3日間と最後の3日間のCPMを比較
  const firstPeriod = insights.slice(0, 3)
  const lastPeriod = insights.slice(-3)
  
  const firstCPM = calculatePeriodCPM(firstPeriod)
  const lastCPM = calculatePeriodCPM(lastPeriod)
  
  if (firstCPM === 0) return 0
  
  // 上昇率 = (現在CPM - 初期CPM) / 初期CPM
  return Math.max(0, (lastCPM - firstCPM) / firstCPM)
}

// 期間のCPM計算
function calculatePeriodCPM(insights: Doc<"metaInsights">[]) {
  let totalSpend = 0
  let totalImpressions = 0
  
  for (const insight of insights) {
    totalSpend += insight.spend || 0
    totalImpressions += insight.impressions || 0
  }
  
  return totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0
}

// ネガティブフィードバック率の計算（現在は推定値）
function calculateNegativeFeedbackRate(insights: Doc<"metaInsights">[]) {
  // Meta APIでネガティブフィードバックデータが利用可能な場合はここで計算
  // 現在は推定値として、CTRが極端に低い場合に高い値を返す
  const avgCTR = calculatePeriodCTR(insights)
  
  if (avgCTR < 0.5) return 0.003 // 0.3%
  if (avgCTR < 0.8) return 0.001 // 0.1%
  return 0
}

// 動画完了率の計算
function calculateVideoCompletionRate(insights: Doc<"metaInsights">[]) {
  let totalViews = 0
  let totalCompletions = 0
  
  for (const insight of insights) {
    // video_viewsが利用可能な場合
    totalViews += insight.video_views || 0
    // 完了率は通常25%と仮定（実際のAPIデータが利用可能な場合は置き換え）
    totalCompletions += (insight.video_views || 0) * 0.25
  }
  
  return totalViews > 0 ? totalCompletions / totalViews : 0
}

// 平均視聴時間の計算（秒）
function calculateAvgWatchTime(_insights: Doc<"metaInsights">[]) {
  // 実際のAPIデータが利用可能な場合はここで計算
  // 現在はダミー値
  return 15
}

// Instagram保存率の計算
function calculateInstagramSaveRate(_insights: Doc<"metaInsights">[]) {
  // Instagram特有のメトリクスが利用可能な場合はここで計算
  // 現在はダミー値
  return 0.01
}

// プロフィールからフォロー率の計算
function calculateProfileToFollowRate(_insights: Doc<"metaInsights">[]) {
  // Instagram特有のメトリクスが利用可能な場合はここで計算
  // 現在はダミー値
  return 0.05
}

// 疲労度スコアの計算
function calculateFatigueScore(metrics: any) {
  // オーディエンス疲労度（0-100）
  const audienceScore = calculateAudienceFatigueScore(
    metrics.frequency,
    metrics.firstTimeRatio
  )
  
  // クリエイティブ疲労度（0-100）
  const creativeScore = calculateCreativeFatigueScore(
    metrics.ctrDeclineRate,
    metrics.negativeFeedbackRate
  )
  
  // アルゴリズム疲労度（0-100）
  const algorithmScore = calculateAlgorithmFatigueScore(
    metrics.cpmIncreaseRate,
    metrics.ctr,
    metrics.negativeFeedbackRate
  )
  
  // 総合スコア（各要素の重み付け平均）
  const totalScore = Math.round(
    audienceScore * 0.35 +
    creativeScore * 0.35 +
    algorithmScore * 0.30
  )
  
  // 主要問題の特定
  const scores = {
    audience: audienceScore,
    creative: creativeScore,
    algorithm: algorithmScore
  }
  const primaryIssue = Object.entries(scores).reduce((a, b) => 
    scores[a[0] as keyof typeof scores] > scores[b[0] as keyof typeof scores] ? a : b
  )[0] as 'audience' | 'creative' | 'algorithm'
  
  // ステータスの判定
  const status = 
    totalScore >= 70 ? 'critical' :
    totalScore >= 50 ? 'warning' :
    totalScore >= 30 ? 'caution' :
    'healthy'
  
  return {
    total: totalScore,
    breakdown: scores,
    primaryIssue,
    status
  }
}

// オーディエンス疲労度スコアの計算
function calculateAudienceFatigueScore(frequency: number, firstTimeRatio: number): number {
  let score = 0
  
  // Frequency評価（最大50点）
  if (frequency >= 4.0) score += 50
  else if (frequency >= 3.5) score += 40
  else if (frequency >= 3.0) score += 25
  else if (frequency >= 2.5) score += 10
  
  // 初回インプレッション比率評価（最大50点）
  if (firstTimeRatio <= 0.2) score += 50
  else if (firstTimeRatio <= 0.3) score += 40
  else if (firstTimeRatio <= 0.4) score += 25
  else if (firstTimeRatio <= 0.5) score += 10
  
  return Math.min(100, score)
}

// クリエイティブ疲労度スコアの計算
function calculateCreativeFatigueScore(ctrDecline: number, negativeFeedback: number): number {
  let score = 0
  
  // CTR減少率評価（最大70点）
  if (ctrDecline >= 0.5) score += 70
  else if (ctrDecline >= 0.4) score += 55
  else if (ctrDecline >= 0.25) score += 35
  else if (ctrDecline >= 0.15) score += 15
  
  // ネガティブフィードバック評価（最大30点）
  if (negativeFeedback >= 0.003) score += 30
  else if (negativeFeedback >= 0.001) score += 15
  
  return Math.min(100, score)
}

// アルゴリズム疲労度スコアの計算
function calculateAlgorithmFatigueScore(
  cpmIncrease: number, 
  ctr: number, 
  negativeFeedback: number
): number {
  let score = 0
  
  // CPM上昇率評価（最大60点）
  if (cpmIncrease >= 0.4) score += 60
  else if (cpmIncrease >= 0.3) score += 45
  else if (cpmIncrease >= 0.2) score += 25
  else if (cpmIncrease >= 0.1) score += 10
  
  // CTR低下によるペナルティ（最大20点）
  if (ctr < 0.5) score += 20
  else if (ctr < 0.8) score += 10
  
  // ネガティブフィードバックペナルティ（最大20点）
  if (negativeFeedback >= 0.003) score += 20
  else if (negativeFeedback >= 0.001) score += 10
  
  return Math.min(100, score)
}

// 疲労度分析結果の保存
export const saveFatigueAnalysis = mutation({
  args: {
    accountId: v.string(),
    adId: v.string(),
    analysis: v.object({
      adName: v.string(),
      campaignId: v.string(),
      campaignName: v.string(),
      creativeId: v.string(),
      creativeType: v.string(),
      metrics: v.any(),
      fatigueScore: v.any(),
      dataRange: v.object({
        start: v.string(),
        end: v.string(),
      }),
      analyzedAt: v.string(),
    })
  },
  handler: async (ctx, args) => {
    const { accountId, adId, analysis } = args
    
    // 既存の分析結果を探す
    const existing = await ctx.db
      .query("adFatigueResults")
      .filter(q => 
        q.and(
          q.eq(q.field("accountId"), accountId),
          q.eq(q.field("adId"), adId)
        )
      )
      .first()
    
    const data = {
      accountId,
      adId,
      adName: analysis.adName,
      campaignId: analysis.campaignId,
      fatigueScore: analysis.fatigueScore,
      metrics: analysis.metrics,
      recommendedAction: generateRecommendedAction(analysis.fatigueScore, analysis.metrics),
      dataRangeStart: analysis.dataRange.start,
      dataRangeEnd: analysis.dataRange.end,
      analyzedAt: analysis.analyzedAt,
      updatedAt: new Date().toISOString(),
    }
    
    if (existing) {
      await ctx.db.patch(existing._id, data)
    } else {
      await ctx.db.insert("adFatigueResults", {
        ...data,
        createdAt: new Date().toISOString(),
      })
    }
    
    // 疲労度トレンドも保存
    await saveFatigueTrend(ctx, {
      accountId,
      adId,
      date: analysis.dataRange.end,
      metrics: analysis.metrics,
      fatigueScore: analysis.fatigueScore,
    })
    
    return { success: true }
  }
})

// 疲労度トレンドの保存
async function saveFatigueTrend(ctx: any, data: any) {
  const trendData = {
    accountId: data.accountId,
    adId: data.adId,
    date: data.date,
    frequency: data.metrics.frequency,
    ctr: data.metrics.ctr,
    cpm: data.metrics.cpm,
    reach: data.metrics.reach,
    newReach: data.metrics.reach * data.metrics.firstTimeRatio,
    impressions: data.metrics.impressions,
    conversions: data.metrics.conversions || 0,
    firstTimeRatio: data.metrics.firstTimeRatio,
    ctrChangeFromBaseline: data.metrics.ctrDeclineRate,
    cpmChangeFromBaseline: data.metrics.cpmIncreaseRate,
    audienceFatigueScore: data.fatigueScore.breakdown.audience,
    creativeFatigueScore: data.fatigueScore.breakdown.creative,
    algorithmFatigueScore: data.fatigueScore.breakdown.algorithm,
    totalFatigueScore: data.fatigueScore.total,
    createdAt: new Date().toISOString(),
  }
  
  // 同じ日付のデータがあれば更新、なければ新規作成
  const existing = await ctx.db
    .query("fatigueTrends")
    .filter((q: any) => 
      q.and(
        q.eq(q.field("adId"), data.adId),
        q.eq(q.field("date"), data.date)
      )
    )
    .first()
  
  if (existing) {
    await ctx.db.patch(existing._id, trendData)
  } else {
    await ctx.db.insert("fatigueTrends", trendData)
  }
}

// 推奨アクションの生成
function generateRecommendedAction(fatigueScore: any, metrics: any): string {
  const { status, primaryIssue } = fatigueScore
  
  if (status === 'critical') {
    if (primaryIssue === 'audience') {
      return `オーディエンスの疲労が限界に達しています（Frequency: ${metrics.frequency.toFixed(1)}回）。即座に新しいターゲットセグメントへの拡大、または広告配信の一時停止を推奨します。`
    } else if (primaryIssue === 'creative') {
      return `クリエイティブの効果が著しく低下しています（CTR低下率: ${(metrics.ctrDeclineRate * 100).toFixed(0)}%）。新しいクリエイティブへの即時更新が必要です。`
    } else {
      return `アルゴリズムペナルティにより配信効率が悪化しています（CPM上昇率: ${(metrics.cpmIncreaseRate * 100).toFixed(0)}%）。広告品質の改善または配信戦略の見直しが必要です。`
    }
  } else if (status === 'warning') {
    if (primaryIssue === 'audience') {
      return `オーディエンスへの過度な露出が始まっています。類似オーディエンスの追加や興味関心ターゲティングの拡大を検討してください。`
    } else if (primaryIssue === 'creative') {
      return `クリエイティブの鮮度が低下しています。A/Bテストで新しいバリエーションをテストすることを推奨します。`
    } else {
      return `配信コストが上昇傾向にあります。入札戦略の見直しやターゲティングの最適化を検討してください。`
    }
  } else if (status === 'caution') {
    return `軽微な疲労の兆候が見られます。パフォーマンスを注視し、必要に応じて微調整を行ってください。`
  } else {
    return `広告は健全な状態です。現在の配信戦略を維持し、定期的なモニタリングを続けてください。`
  }
}

// 保存された疲労度分析結果を取得
export const getSavedFatigueAnalysis = query({
  args: {
    accountId: v.string(),
    adId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("adFatigueResults")
      .filter(q => 
        q.and(
          q.eq(q.field("accountId"), args.accountId),
          q.eq(q.field("adId"), args.adId)
        )
      )
      .order("desc")
      .first()
  }
})

// 全広告の疲労度分析結果を取得
export const getAllAdsFatigueAnalysis = query({
  args: {
    accountId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const results = await ctx.db
      .query("adFatigueResults")
      .filter(q => q.eq(q.field("accountId"), args.accountId))
      .order("desc")
      .take(args.limit || 100)
    
    return results
  }
})

// 疲労度トレンドを取得
export const getFatigueTrends = query({
  args: {
    adId: v.string(),
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const days = args.days || 30
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    
    const trends = await ctx.db
      .query("fatigueTrends")
      .filter(q => 
        q.and(
          q.eq(q.field("adId"), args.adId),
          q.gte(q.field("date"), startDate.toISOString().split('T')[0])
        )
      )
      .order("desc")
      .collect()
    
    return trends.reverse() // 古い順に並び替え
  }
})

// アクティブなアラートを取得
export const getActiveAlerts = query({
  args: {
    accountId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("fatigueAlerts")
      .filter(q => 
        q.and(
          q.eq(q.field("accountId"), args.accountId),
          q.eq(q.field("resolvedAt"), undefined)
        )
      )
      .order("desc")
      .collect()
  }
})

// アラートを非表示にする
export const dismissAlert = mutation({
  args: {
    alertId: v.string(),
  },
  handler: async (ctx, args) => {
    const alert = await ctx.db.get(args.alertId as any)
    if (alert) {
      await ctx.db.patch(alert._id, {
        resolvedAt: new Date().toISOString()
      })
    }
    return { success: true }
  }
})

// アラートを確認済みにする
export const acknowledgeAlert = mutation({
  args: {
    alertId: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const alert = await ctx.db.get(args.alertId as any)
    if (alert) {
      await ctx.db.patch(alert._id, {
        acknowledgedBy: args.userId,
        acknowledgedAt: new Date().toISOString()
      })
    }
    return { success: true }
  }
})

// バッチ疲労度分析
export const batchAnalyzeFatigue = mutation({
  args: {
    accountId: v.string(),
    adIds: v.array(v.string()),
    lookbackDays: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const results = []
    const errors = []
    
    for (const adId of args.adIds) {
      try {
        // 各広告の分析を実行（実際の実装では非同期で並列処理）
        const analysis = await calculateFatigueFromInsightsInternal(
          ctx,
          args.accountId,
          adId,
          args.lookbackDays
        )
        
        if (analysis) {
          // 結果を保存
          await saveFatigueAnalysisInternal(ctx, {
            accountId: args.accountId,
            adId,
            analysis
          })
          
          results.push({
            adId,
            status: 'success',
            fatigueScore: analysis.fatigueScore
          })
        } else {
          results.push({
            adId,
            status: 'no_data'
          })
        }
      } catch (error) {
        errors.push({
          adId,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }
    
    return {
      analyzed: results.length,
      errorCount: errors.length,
      results,
      errors
    }
  }
})

// 内部関数：疲労度計算
async function calculateFatigueFromInsightsInternal(
  ctx: any,
  accountId: string,
  adId: string,
  lookbackDays?: number
) {
  const days = lookbackDays || 21
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(endDate.getDate() - days)
  
  const insights = await ctx.db
    .query("metaInsights")
    .filter((q: any) => 
      q.and(
        q.eq(q.field("accountId"), accountId),
        q.eq(q.field("ad_id"), adId),
        q.gte(q.field("date_start"), startDate.toISOString().split('T')[0]),
        q.lte(q.field("date_start"), endDate.toISOString().split('T')[0])
      )
    )
    .collect()
  
  if (insights.length === 0) {
    return null
  }
  
  // 以下、calculateFatigueFromInsightsと同じロジック
  insights.sort((a: any, b: any) => a.date_start!.localeCompare(b.date_start!))
  const metrics = calculateBasicMetrics(insights)
  
  const fatigueMetrics = {
    frequency: metrics.avgFrequency,
    firstTimeRatio: calculateFirstTimeRatio(insights),
    ctrDeclineRate: calculateCTRDeclineRate(insights),
    cpmIncreaseRate: calculateCPMIncreaseRate(insights),
    negativeFeedbackRate: calculateNegativeFeedbackRate(insights),
    reach: metrics.totalReach,
    impressions: metrics.totalImpressions,
    ctr: metrics.avgCTR,
    cpm: metrics.avgCPM,
    conversions: metrics.totalConversions,
    daysActive: insights.length,
    videoCompletionRate: calculateVideoCompletionRate(insights),
    avgWatchTime: calculateAvgWatchTime(insights),
    instagramSaveRate: calculateInstagramSaveRate(insights),
    profileToFollowRate: calculateProfileToFollowRate(insights),
  }
  
  const fatigueScore = calculateFatigueScore(fatigueMetrics)
  
  const adInfo = {
    adId,
    adName: insights[0].ad_name || '',
    campaignId: insights[0].campaign_id || '',
    campaignName: insights[0].campaign_name || '',
    creativeId: insights[0].creative_id || '',
    creativeType: insights[0].creative_type || '',
  }
  
  return {
    ...adInfo,
    metrics: fatigueMetrics,
    fatigueScore,
    dataRange: {
      start: insights[0].date_start,
      end: insights[insights.length - 1].date_start,
    },
    analyzedAt: new Date().toISOString(),
  }
}

// 内部関数：分析結果の保存
async function saveFatigueAnalysisInternal(ctx: any, args: any) {
  const { accountId, adId, analysis } = args
  
  const existing = await ctx.db
    .query("adFatigueResults")
    .filter((q: any) => 
      q.and(
        q.eq(q.field("accountId"), accountId),
        q.eq(q.field("adId"), adId)
      )
    )
    .first()
  
  const data = {
    accountId,
    adId,
    adName: analysis.adName,
    campaignId: analysis.campaignId,
    fatigueScore: analysis.fatigueScore,
    metrics: analysis.metrics,
    recommendedAction: generateRecommendedAction(analysis.fatigueScore, analysis.metrics),
    dataRangeStart: analysis.dataRange.start,
    dataRangeEnd: analysis.dataRange.end,
    analyzedAt: analysis.analyzedAt,
    updatedAt: new Date().toISOString(),
  }
  
  if (existing) {
    await ctx.db.patch(existing._id, data)
  } else {
    await ctx.db.insert("adFatigueResults", {
      ...data,
      createdAt: new Date().toISOString(),
    })
  }
  
  // トレンドも保存
  await saveFatigueTrend(ctx, {
    accountId,
    adId,
    date: analysis.dataRange.end,
    metrics: analysis.metrics,
    fatigueScore: analysis.fatigueScore,
  })
}