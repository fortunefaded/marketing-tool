import { v } from "convex/values"
import { internalMutation } from "./_generated/server"
import { AlgorithmPenaltyMetrics, NegativeFeedbackMetrics } from "./adFatigue"

// 緊急アラートの種類
export type UrgentAlertType = 
  | 'NEGATIVE_FEEDBACK_CRITICAL'
  | 'ALGORITHM_PENALTY_HIGH'
  | 'FREQUENCY_EXCEEDED'
  | 'VIDEO_ENGAGEMENT_CRITICAL'
  | 'MULTIPLE_ISSUES'

// 緊急アラートのアクション
export type UrgentAlertAction = 
  | 'IMMEDIATE_PAUSE'
  | 'CAMPAIGN_REBUILD_REQUIRED'
  | 'CREATIVE_REFRESH_URGENT'
  | 'FREQUENCY_CAP_REQUIRED'
  | 'REVIEW_AND_OPTIMIZE'

interface UrgentAlert {
  type: UrgentAlertType
  adId: string
  action: UrgentAlertAction
  severity: 'high' | 'critical'
  metrics?: Record<string, any>
}

// 15分ごとの自動分析
export const analyzeAdFatigue = internalMutation({
  handler: async (ctx) => {
    console.log("Starting scheduled ad fatigue analysis...")
    
    // アクティブな広告を取得
    const activeAds = await ctx.db
      .query("metaInsights")
      .filter(q => q.neq(q.field("ad_id"), undefined))
      .collect()
    
    // 広告IDの重複を除去
    const uniqueAdIds = [...new Set(activeAds.map(ad => ad.ad_id).filter(Boolean))]
    console.log(`Found ${uniqueAdIds.length} unique ads to analyze`)
    
    const alerts: UrgentAlert[] = []
    let processedCount = 0
    let errorCount = 0
    
    // バッチ処理で効率化（10件ずつ処理）
    const batchSize = 10
    for (let i = 0; i < uniqueAdIds.length; i += batchSize) {
      const batch = uniqueAdIds.slice(i, i + batchSize)
      
      await Promise.all(
        batch.map(async (adId) => {
          try {
            // 最新のインサイトデータを取得
            const latestInsights = await ctx.db
              .query("metaInsights")
              .filter(q => q.eq(q.field("ad_id"), adId))
              .order("desc")
              .take(30) // 30日分
            
            if (latestInsights.length === 0) {
              return
            }
            
            const accountId = latestInsights[0].accountId
            const isVideo = latestInsights[0].video_views !== undefined
            const isInstagram = latestInsights[0].publisher_platform === 'instagram' ||
                               latestInsights[0].placement?.includes('instagram')
            
            // Phase 2の高度な分析を実行
            const analysis = await calculateAdvancedFatigueAnalysis(ctx, {
              accountId: accountId as string,
              adId: adId as string,
              insights: latestInsights,
              includeVideo: isVideo || false,
              includeInstagram: isInstagram || false
            })
            
            // 緊急アラートの判定
            const urgentAlerts = evaluateUrgentAlerts(analysis, adId as string)
            alerts.push(...urgentAlerts)
            
            // 分析結果の保存
            await saveAnalysisResults(ctx, analysis)
            
            processedCount++
          } catch (error) {
            console.error(`Error analyzing ad ${adId}:`, error)
            errorCount++
          }
        })
      )
      
      // レート制限対策
      if (i + batchSize < uniqueAdIds.length) {
        await new Promise(resolve => setTimeout(resolve, 1000)) // 1秒待機
      }
    }
    
    // 緊急アラートの処理
    if (alerts.length > 0) {
      await processUrgentAlerts(ctx, alerts)
    }
    
    // 実行結果をログに保存
    await ctx.db.insert("scheduledJobLogs", {
      jobId: `fatigue-${Date.now()}`,
      jobType: "analyzeAdFatigue",
      startedAt: new Date().toISOString(),
      status: "completed",
      metadata: {
        totalAds: uniqueAdIds.length,
        processed: processedCount,
        errors: errorCount,
        alerts: alerts.length
      }
    })
    
    console.log(`Analysis completed: ${processedCount} ads processed, ${alerts.length} alerts generated`)
    
    return {
      success: true,
      processed: processedCount,
      errors: errorCount,
      alerts: alerts.length
    }
  },
})

// 高度な疲労度分析（内部関数）
async function calculateAdvancedFatigueAnalysis(
  _ctx: any,
  args: {
    accountId: string
    adId: string
    insights: any[]
    includeVideo: boolean
    includeInstagram: boolean
  }
) {
  const latestInsight = args.insights[0]
  
  // ネガティブフィードバックの計算
  const negativeFeedback: NegativeFeedbackMetrics = {
    hideClicks: Number(latestInsight.hide_clicks || 0),
    reportSpamClicks: Number(latestInsight.report_spam_clicks || 0),
    unlikePageClicks: Number(latestInsight.unlike_page_clicks || 0),
    totalNegativeActions: 0,
    negativeRate: 0,
    userSentiment: 'positive'
  }
  
  negativeFeedback.totalNegativeActions = 
    negativeFeedback.hideClicks + 
    negativeFeedback.reportSpamClicks + 
    negativeFeedback.unlikePageClicks
  
  negativeFeedback.negativeRate = 
    negativeFeedback.totalNegativeActions / (latestInsight.impressions || 1)
  
  if (negativeFeedback.negativeRate > 0.003) {
    negativeFeedback.userSentiment = 'negative'
  } else if (negativeFeedback.negativeRate > 0.001) {
    negativeFeedback.userSentiment = 'neutral'
  }
  
  // CPM上昇率の計算
  const cpmIncreaseRate = calculateCPMTrend(args.insights)
  const ctrDeclineRate = calculateCTRTrend(args.insights)
  const frequency = latestInsight.frequency || 0
  
  // アルゴリズムペナルティの検出
  const algorithmPenalty: AlgorithmPenaltyMetrics = {
    cpmIncreaseRate,
    deliveryRate: latestInsight.reach ? (latestInsight.impressions / latestInsight.reach) : 0,
    penaltyDetected: cpmIncreaseRate > 0.2 && ctrDeclineRate > 0.1,
    severity: 'none'
  }
  
  if (algorithmPenalty.penaltyDetected) {
    if (cpmIncreaseRate > 0.5) algorithmPenalty.severity = 'high'
    else if (cpmIncreaseRate > 0.35) algorithmPenalty.severity = 'medium'
    else algorithmPenalty.severity = 'low'
  }
  
  return {
    adId: args.adId,
    adName: latestInsight.ad_name || 'Unknown',
    accountId: args.accountId,
    campaignId: latestInsight.campaign_id,
    timestamp: new Date().toISOString(),
    metrics: {
      frequency,
      ctrDeclineRate,
      cpmIncreaseRate,
      negativeFeedback,
      algorithmPenalty
    }
  }
}

// CPMトレンドの計算
function calculateCPMTrend(insights: any[]): number {
  if (insights.length < 4) return 0
  
  const recent = insights.slice(0, 3)
  const baseline = insights.slice(-3)
  
  const recentAvg = recent.reduce((sum, i) => sum + (i.cpm || 0), 0) / recent.length
  const baselineAvg = baseline.reduce((sum, i) => sum + (i.cpm || 0), 0) / baseline.length
  
  if (baselineAvg === 0) return 0
  
  return (recentAvg - baselineAvg) / baselineAvg
}

// CTRトレンドの計算
function calculateCTRTrend(insights: any[]): number {
  if (insights.length < 4) return 0
  
  const recent = insights.slice(0, 3)
  const baseline = insights.slice(-3)
  
  const recentAvg = recent.reduce((sum, i) => sum + (i.ctr || 0), 0) / recent.length
  const baselineAvg = baseline.reduce((sum, i) => sum + (i.ctr || 0), 0) / baseline.length
  
  if (baselineAvg === 0) return 0
  
  return (baselineAvg - recentAvg) / baselineAvg
}

// 緊急アラートの評価
function evaluateUrgentAlerts(analysis: any, adId: string): UrgentAlert[] {
  const alerts: UrgentAlert[] = []
  const metrics = analysis.metrics
  
  // ネガティブフィードバックの緊急チェック
  if (metrics.negativeFeedback.negativeRate > 0.003) {
    alerts.push({
      type: 'NEGATIVE_FEEDBACK_CRITICAL',
      adId,
      action: 'IMMEDIATE_PAUSE',
      severity: 'critical',
      metrics: {
        negativeRate: metrics.negativeFeedback.negativeRate,
        hideClicks: metrics.negativeFeedback.hideClicks,
        reportSpamClicks: metrics.negativeFeedback.reportSpamClicks
      }
    })
  }
  
  // アルゴリズムペナルティの緊急チェック
  if (metrics.algorithmPenalty.penaltyDetected && metrics.algorithmPenalty.severity === 'high') {
    alerts.push({
      type: 'ALGORITHM_PENALTY_HIGH',
      adId,
      action: 'CAMPAIGN_REBUILD_REQUIRED',
      severity: 'critical',
      metrics: {
        cpmIncreaseRate: metrics.cpmIncreaseRate,
        severity: metrics.algorithmPenalty.severity
      }
    })
  }
  
  // フリークエンシー過多のチェック
  if (metrics.frequency > 4.0) {
    alerts.push({
      type: 'FREQUENCY_EXCEEDED',
      adId,
      action: 'FREQUENCY_CAP_REQUIRED',
      severity: 'high',
      metrics: {
        frequency: metrics.frequency
      }
    })
  }
  
  // 複数の問題が同時発生している場合
  if (alerts.length >= 2) {
    alerts.push({
      type: 'MULTIPLE_ISSUES',
      adId,
      action: 'REVIEW_AND_OPTIMIZE',
      severity: 'critical',
      metrics: {
        issueCount: alerts.length
      }
    })
  }
  
  return alerts
}

// 分析結果の保存
async function saveAnalysisResults(ctx: any, analysis: any) {
  // トレンドデータの保存
  await ctx.db.insert("fatigueTrends", {
    accountId: analysis.accountId,
    adId: analysis.adId,
    date: new Date().toISOString().split('T')[0],
    frequency: analysis.metrics.frequency,
    ctr: analysis.metrics.ctrDeclineRate,
    cpm: analysis.metrics.cpmIncreaseRate,
    reach: 0, // TODO: 実際の値を取得
    newReach: 0, // TODO: 実際の値を取得
    impressions: 0, // TODO: 実際の値を取得
    firstTimeRatio: 0, // TODO: 実際の値を取得
    ctrChangeFromBaseline: analysis.metrics.ctrDeclineRate,
    cpmChangeFromBaseline: analysis.metrics.cpmIncreaseRate,
    audienceFatigueScore: 0, // TODO: 計算
    creativeFatigueScore: 0, // TODO: 計算
    algorithmFatigueScore: 0, // TODO: 計算
    totalFatigueScore: 0, // TODO: 計算
    createdAt: new Date().toISOString()
  })
}

// 緊急アラートの処理
async function processUrgentAlerts(ctx: any, alerts: UrgentAlert[]) {
  for (const alert of alerts) {
    // アラートをデータベースに保存
    await ctx.db.insert("fatigueAlerts", {
      accountId: "", // TODO: アカウントIDを取得
      adId: alert.adId,
      adName: "", // TODO: 広告名を取得
      campaignId: "", // TODO: キャンペーンIDを取得
      alertLevel: alert.severity === 'critical' ? 'critical' : 'warning',
      alertType: mapAlertTypeToDbType(alert.type),
      triggerMetrics: alert.metrics || {},
      notificationSent: false,
      createdAt: new Date().toISOString()
    })
    
    // TODO: 実際の通知処理（Slack、メール等）
    console.log(`Urgent alert created: ${alert.type} for ad ${alert.adId}`)
  }
}

// アラートタイプのマッピング
function mapAlertTypeToDbType(type: UrgentAlertType): any {
  const mapping = {
    'NEGATIVE_FEEDBACK_CRITICAL': 'negative_feedback',
    'ALGORITHM_PENALTY_HIGH': 'cpm_increase',
    'FREQUENCY_EXCEEDED': 'frequency_exceeded',
    'VIDEO_ENGAGEMENT_CRITICAL': 'ctr_decline',
    'MULTIPLE_ISSUES': 'multiple_factors'
  }
  return mapping[type] || 'multiple_factors'
}

// バッチ分析（複数広告の一括処理）
export const batchAnalyzeFatigue = internalMutation({
  args: {
    adIds: v.array(v.string()),
    options: v.object({
      includeVideo: v.boolean(),
      includeInstagram: v.boolean(),
      includeHistorical: v.boolean()
    })
  },
  handler: async (ctx, args) => {
    const results = []
    const batchSize = 5
    
    for (let i = 0; i < args.adIds.length; i += batchSize) {
      const batch = args.adIds.slice(i, i + batchSize)
      
      const batchResults = await Promise.all(
        batch.map(async (adId) => {
          try {
            const insights = await ctx.db
              .query("metaInsights")
              .filter(q => q.eq(q.field("ad_id"), adId))
              .order("desc")
              .take(30)
            
            if (insights.length === 0) {
              return { adId, error: "No data available" }
            }
            
            const analysis = await calculateAdvancedFatigueAnalysis(ctx, {
              accountId: insights[0].accountId || '',
              adId,
              insights,
              includeVideo: args.options.includeVideo,
              includeInstagram: args.options.includeInstagram
            })
            
            return { adId, success: true, analysis }
          } catch (error) {
            return { adId, error: error instanceof Error ? error.message : 'Unknown error' }
          }
        })
      )
      
      results.push(...batchResults)
    }
    
    // 集計レポート生成
    const summary = {
      total: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => r.error).length,
      criticalCount: results.filter(r => 
        (r.analysis?.metrics?.negativeFeedback?.negativeRate ?? 0) > 0.003 ||
        r.analysis?.metrics?.algorithmPenalty?.severity === 'high'
      ).length
    }
    
    return {
      results,
      summary,
      timestamp: new Date().toISOString()
    }
  }
})