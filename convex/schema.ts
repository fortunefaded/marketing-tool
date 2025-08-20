import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  // ユーザーテーブル
  users: defineTable({
    name: v.string(),
    email: v.string(),
    createdAt: v.number(),
  }).index('by_email', ['email']),

  // キャンペーンテーブル
  campaigns: defineTable({
    title: v.string(),
    description: v.string(),
    status: v.union(v.literal('draft'), v.literal('active'), v.literal('completed')),
    userId: v.id('users'),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_status', ['status']),

  // タスクテーブル
  tasks: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    status: v.union(v.literal('pending'), v.literal('in_progress'), v.literal('completed')),
    campaignId: v.id('campaigns'),
    assignedTo: v.id('users'),
    dueDate: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index('by_campaign', ['campaignId'])
    .index('by_assignee', ['assignedTo'])
    .index('by_status', ['status']),

  // Meta広告データスキーマ
  metaCampaigns: defineTable({
    metaId: v.string(), // Meta APIのID
    accountId: v.string(),
    name: v.string(),
    objective: v.string(),
    status: v.union(v.literal('ACTIVE'), v.literal('PAUSED'), v.literal('DELETED')),
    dailyBudget: v.number(),
    lifetimeBudget: v.optional(v.number()),
    startTime: v.string(),
    stopTime: v.optional(v.string()),
    lastSyncedAt: v.string(),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index('by_metaId', ['metaId'])
    .index('by_accountId', ['accountId'])
    .index('by_status', ['status']),

  metaCreatives: defineTable({
    metaId: v.string(), // Meta APIのID
    name: v.string(),
    campaignId: v.string(), // Meta Campaign ID
    adsetId: v.string(),
    creativeType: v.union(v.literal('IMAGE'), v.literal('VIDEO'), v.literal('CAROUSEL')),
    thumbnailUrl: v.optional(v.string()),
    videoUrl: v.optional(v.string()),
    body: v.optional(v.string()),
    title: v.optional(v.string()),
    callToActionType: v.optional(v.string()),
    lastSyncedAt: v.string(),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index('by_metaId', ['metaId'])
    .index('by_campaignId', ['campaignId'])
    .index('by_adsetId', ['adsetId']),

  metaInsights: defineTable({
    accountId: v.optional(v.string()),
    date_start: v.optional(v.string()),
    date_stop: v.optional(v.string()),
    createdAt: v.optional(v.string()),
    campaign_id: v.optional(v.string()),
    campaign_name: v.optional(v.string()),
    ad_id: v.optional(v.string()),
    ad_name: v.optional(v.string()),
    creative_id: v.optional(v.string()),
    creative_name: v.optional(v.string()),
    creative_type: v.optional(v.string()),
    thumbnail_url: v.optional(v.string()),
    video_url: v.optional(v.string()),
    carousel_cards: v.optional(v.any()),
    impressions: v.optional(v.number()),
    clicks: v.optional(v.number()),
    spend: v.optional(v.number()),
    reach: v.optional(v.number()),
    frequency: v.optional(v.number()),
    cpc: v.optional(v.number()),
    cpm: v.optional(v.number()),
    ctr: v.optional(v.number()),
    conversions: v.optional(v.number()),
    conversion_rate: v.optional(v.number()),
    cost_per_conversion: v.optional(v.number()),
    engagement_rate: v.optional(v.number()),
    video_views: v.optional(v.number()),
    video_view_rate: v.optional(v.number()),
    // Instagram関連フィールド
    saves: v.optional(v.number()),
    shares: v.optional(v.number()),
    comments: v.optional(v.number()),
    likes: v.optional(v.number()),
    publisher_platform: v.optional(v.string()),
    placement: v.optional(v.string()),
    profile_visits: v.optional(v.number()),
    follows: v.optional(v.number()),
    website_clicks: v.optional(v.number()),
    story_replies: v.optional(v.number()),
    story_exits: v.optional(v.number()),
    // 動画関連フィールド
    video_plays: v.optional(v.number()),
    video_avg_time_watched: v.optional(v.number()),
    video_p25_watched: v.optional(v.number()),
    video_p50_watched: v.optional(v.number()),
    video_p75_watched: v.optional(v.number()),
    video_p95_watched: v.optional(v.number()),
    video_p100_watched: v.optional(v.number()),
    video_15s_views: v.optional(v.number()),
    video_thruplay: v.optional(v.number()),
    video_sound_on: v.optional(v.number()),
    // 収益関連（ECForceとの統合用）
    revenue: v.optional(v.number()),
    // 互換性フィールド
    campaignId: v.optional(v.string()),
    creativeId: v.optional(v.string()),
    dateStart: v.optional(v.string()),
    dateStop: v.optional(v.string()),
    campaignName: v.optional(v.string()),
    adId: v.optional(v.string()),
    adName: v.optional(v.string()),
    importedAt: v.optional(v.string()),
    updatedAt: v.optional(v.string()),
  })
    .index('by_account_date', ['accountId', 'date_start'])
    .index('by_campaign', ['accountId', 'campaign_id'])
    .index('by_ad', ['accountId', 'ad_id']),

  // Meta同期ステータステーブル
  metaSyncStatus: defineTable({
    accountId: v.string(),
    lastFullSync: v.optional(v.string()),
    lastIncrementalSync: v.optional(v.string()),
    totalRecords: v.optional(v.number()),
    earliestDate: v.optional(v.string()),
    latestDate: v.optional(v.string()),
    updatedAt: v.optional(v.string()),
  }).index('by_account', ['accountId']),

  // 同期履歴テーブル
  syncHistory: defineTable({
    syncId: v.string(),
    source: v.union(v.literal('meta'), v.literal('google'), v.literal('twitter')),
    type: v.union(v.literal('campaigns'), v.literal('creatives'), v.literal('insights')),
    status: v.union(v.literal('started'), v.literal('completed'), v.literal('failed')),
    stats: v.object({
      total: v.number(),
      created: v.number(),
      updated: v.number(),
      failed: v.number(),
    }),
    errors: v.optional(
      v.array(
        v.object({
          metaId: v.string(),
          error: v.string(),
        })
      )
    ),
    startedAt: v.string(),
    completedAt: v.optional(v.string()),
    duration: v.optional(v.number()),
  })
    .index('by_source', ['source'])
    .index('by_status', ['status'])
    .index('by_startedAt', ['startedAt']),

  // 同期スケジュールテーブル
  syncSchedules: defineTable({
    name: v.string(),
    type: v.union(v.literal('campaigns'), v.literal('creatives'), v.literal('insights')),
    source: v.union(v.literal('meta'), v.literal('google'), v.literal('twitter')),
    interval: v.union(v.literal('hourly'), v.literal('daily'), v.literal('weekly')),
    config: v.object({
      accountId: v.optional(v.string()),
      lookbackDays: v.optional(v.number()),
      filters: v.optional(v.any()),
    }),
    enabled: v.boolean(),
    lastRun: v.optional(v.string()),
    nextRun: v.string(),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index('by_enabled', ['enabled'])
    .index('by_nextRun', ['nextRun']),

  // クリエイティブメトリクステーブル
  creative_metrics: defineTable({
    accountId: v.string(),
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
    updatedAt: v.number(),
  })
    .index('by_account', ['accountId'])
    .index('by_creative_period', ['creative_id', 'period_start', 'period_end'])
    .index('by_campaign', ['campaign_id'])
    .index('by_creativeId', ['creative_id']),

  // 拡張クリエイティブ分析テーブル
  enhanced_creative_data: defineTable({
    accountId: v.string(),
    creativeId: v.string(),
    name: v.string(),
    type: v.union(
      v.literal('IMAGE'),
      v.literal('VIDEO'),
      v.literal('CAROUSEL'),
      v.literal('COLLECTION'),
      v.literal('DYNAMIC')
    ),
    status: v.string(),
    // キャンペーン・広告セット情報
    campaignId: v.string(),
    campaignName: v.string(),
    adsetId: v.string(),
    adsetName: v.string(),
    adId: v.string(),
    adName: v.string(),
    // クリエイティブ詳細
    creative: v.object({
      id: v.string(),
      name: v.string(),
      title: v.optional(v.string()),
      body: v.optional(v.string()),
      imageUrl: v.optional(v.string()),
      thumbnailUrl: v.optional(v.string()),
      videoUrl: v.optional(v.string()),
      callToActionType: v.optional(v.string()),
      linkUrl: v.optional(v.string()),
      carouselCards: v.optional(
        v.array(
          v.object({
            name: v.string(),
            description: v.string(),
            imageUrl: v.string(),
            link: v.string(),
          })
        )
      ),
      videoData: v.optional(
        v.object({
          videoId: v.string(),
          title: v.optional(v.string()),
          duration: v.optional(v.number()),
          thumbnailUrl: v.optional(v.string()),
        })
      ),
    }),
    // パフォーマンスメトリクス
    metrics: v.object({
      impressions: v.number(),
      clicks: v.number(),
      spend: v.number(),
      reach: v.number(),
      frequency: v.number(),
      cpm: v.number(),
      cpc: v.number(),
      ctr: v.number(),
      conversions: v.number(),
      conversionValue: v.number(),
      costPerConversion: v.number(),
      roas: v.number(),
      videoMetrics: v.optional(
        v.object({
          plays: v.number(),
          thruPlays: v.number(),
          avgWatchTime: v.number(),
          p25Watched: v.number(),
          p50Watched: v.number(),
          p75Watched: v.number(),
          p100Watched: v.number(),
          completionRate: v.number(),
        })
      ),
      qualityRanking: v.optional(v.string()),
      engagementRateRanking: v.optional(v.string()),
      conversionRateRanking: v.optional(v.string()),
    }),
    // デモグラフィック別パフォーマンス
    demographics: v.optional(
      v.object({
        age: v.optional(
          v.array(
            v.object({
              range: v.string(),
              metrics: v.any(),
            })
          )
        ),
        gender: v.optional(
          v.array(
            v.object({
              value: v.string(),
              metrics: v.any(),
            })
          )
        ),
      })
    ),
    // 配置面別パフォーマンス
    placements: v.optional(
      v.array(
        v.object({
          platform: v.string(),
          position: v.string(),
          metrics: v.any(),
        })
      )
    ),
    // ターゲティング情報
    targeting: v.optional(
      v.object({
        ageMin: v.optional(v.number()),
        ageMax: v.optional(v.number()),
        genders: v.optional(v.array(v.string())),
        locations: v.optional(v.any()),
        interests: v.optional(v.any()),
        behaviors: v.optional(v.any()),
        customAudiences: v.optional(v.any()),
      })
    ),
    // メタデータ
    dateRangeSince: v.string(),
    dateRangeUntil: v.string(),
    createdTime: v.string(),
    updatedTime: v.string(),
    lastSyncedAt: v.string(),
  })
    .index('by_account', ['accountId'])
    .index('by_creative', ['creativeId'])
    .index('by_campaign', ['campaignId'])
    .index('by_date_range', ['dateRangeSince', 'dateRangeUntil']),

  // ECForce注文データ
  // 広告疲労度測定テーブル
  adFatigueScores: defineTable({
    accountId: v.string(),
    adId: v.string(),
    adName: v.string(),
    creativeId: v.string(),
    campaignId: v.string(),

    // 疲労タイプ別スコア（0-100）
    audienceFatigueScore: v.number(),
    creativeFatigueScore: v.number(),
    algorithmFatigueScore: v.number(),
    totalFatigueScore: v.number(),

    // 主要メトリクス
    frequency: v.number(),
    firstTimeImpressionRatio: v.number(),
    ctrDeclineRate: v.number(),
    cpmIncreaseRate: v.number(),
    negativeFeeedbackRate: v.optional(v.number()),

    // 補足メトリクス
    reach: v.number(),
    impressions: v.number(),
    ctr: v.number(),
    cpm: v.number(),
    conversions: v.optional(v.number()),
    daysActive: v.number(),

    // Instagram特有指標
    instagramSaveRate: v.optional(v.number()),
    profileToFollowRate: v.optional(v.number()),

    // 動画指標（動画広告の場合）
    videoCompletionRate: v.optional(v.number()),
    avgWatchTime: v.optional(v.number()),

    // 状態とアクション
    fatigueLevel: v.union(
      v.literal('healthy'),
      v.literal('caution'),
      v.literal('warning'),
      v.literal('critical')
    ),
    recommendedAction: v.string(),
    alertTriggered: v.boolean(),

    // メタデータ
    calculatedAt: v.string(),
    baselineDate: v.string(),
    dataRangeStart: v.string(),
    dataRangeEnd: v.string(),
  })
    .index('by_account_ad', ['accountId', 'adId'])
    .index('by_fatigue_level', ['fatigueLevel'])
    .index('by_calculated_date', ['calculatedAt']),

  // 疲労度ベースライン（比較基準値）
  adFatigueBaselines: defineTable({
    accountId: v.string(),
    adId: v.string(),
    creativeId: v.string(),

    // ベースライン値（最初の3日間の平均）
    baselineCtr: v.number(),
    baselineCpm: v.number(),
    baselineEngagementRate: v.optional(v.number()),
    baselineConversionRate: v.optional(v.number()),

    // ベースライン期間
    baselineStartDate: v.string(),
    baselineEndDate: v.string(),
    recordsCount: v.number(),

    createdAt: v.string(),
    updatedAt: v.string(),
  }).index('by_account_ad', ['accountId', 'adId']),

  // 疲労度アラート履歴
  fatigueAlerts: defineTable({
    accountId: v.string(),
    adId: v.string(),
    adName: v.string(),
    campaignId: v.string(),

    alertLevel: v.union(
      v.literal('info'),
      v.literal('caution'),
      v.literal('warning'),
      v.literal('critical')
    ),
    alertType: v.union(
      v.literal('frequency_exceeded'),
      v.literal('ctr_decline'),
      v.literal('cpm_increase'),
      v.literal('negative_feedback'),
      v.literal('first_time_ratio_low'),
      v.literal('multiple_factors')
    ),

    // トリガー条件
    triggerMetrics: v.object({
      frequency: v.optional(v.number()),
      ctrDecline: v.optional(v.number()),
      cpmIncrease: v.optional(v.number()),
      negativeFeeedback: v.optional(v.number()),
      firstTimeRatio: v.optional(v.number()),
    }),

    // アクション
    actionTaken: v.optional(v.string()),
    actionResult: v.optional(v.string()),

    // 通知
    notificationSent: v.boolean(),
    acknowledgedBy: v.optional(v.string()),
    acknowledgedAt: v.optional(v.string()),

    createdAt: v.string(),
    resolvedAt: v.optional(v.string()),
  })
    .index('by_account_date', ['accountId', 'createdAt'])
    .index('by_alert_level', ['alertLevel'])
    .index('by_unresolved', ['accountId', 'resolvedAt']),

  // 疲労度分析結果
  adFatigueResults: defineTable({
    accountId: v.string(),
    adId: v.string(),
    adName: v.string(),
    campaignId: v.string(),

    // 疲労度スコア
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

    // メトリクス
    metrics: v.object({
      frequency: v.number(),
      firstTimeRatio: v.number(),
      ctrDeclineRate: v.number(),
      cpmIncreaseRate: v.number(),
      negativeFeedbackRate: v.optional(v.number()),
      reach: v.number(),
      impressions: v.number(),
      ctr: v.number(),
      cpm: v.number(),
      conversions: v.optional(v.number()),
      daysActive: v.number(),
      videoCompletionRate: v.optional(v.number()),
      avgWatchTime: v.optional(v.number()),
      instagramSaveRate: v.optional(v.number()),
      profileToFollowRate: v.optional(v.number()),
      algorithm: v.optional(
        v.object({
          cpmIncreaseRate: v.number(),
          deliveryRate: v.number(),
          penaltyDetected: v.boolean(),
          severity: v.union(
            v.literal('low'),
            v.literal('medium'),
            v.literal('high'),
            v.literal('none')
          ),
        })
      ),
      negative: v.optional(
        v.object({
          hideClicks: v.number(),
          reportSpamClicks: v.number(),
          unlikePageClicks: v.number(),
          totalNegativeActions: v.number(),
          negativeRate: v.number(),
          userSentiment: v.union(
            v.literal('positive'),
            v.literal('neutral'),
            v.literal('negative')
          ),
        })
      ),
    }),

    // 推奨アクション
    recommendedAction: v.string(),

    // データ範囲
    dataRangeStart: v.string(),
    dataRangeEnd: v.string(),

    // タイムスタンプ
    analyzedAt: v.string(),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index('by_account_ad', ['accountId', 'adId'])
    .index('by_analyzed_date', ['analyzedAt']),

  // 疲労度トレンド履歴（時系列分析用）
  fatigueTrends: defineTable({
    accountId: v.string(),
    adId: v.string(),

    // 日次記録
    date: v.string(),
    frequency: v.number(),
    ctr: v.number(),
    cpm: v.number(),
    reach: v.number(),
    newReach: v.number(),
    impressions: v.number(),
    conversions: v.optional(v.number()),

    // 計算値
    firstTimeRatio: v.number(),
    ctrChangeFromBaseline: v.number(),
    cpmChangeFromBaseline: v.number(),

    // スコア履歴
    audienceFatigueScore: v.number(),
    creativeFatigueScore: v.number(),
    algorithmFatigueScore: v.number(),
    totalFatigueScore: v.number(),

    createdAt: v.string(),
  })
    .index('by_ad_date', ['adId', 'date'])
    .index('by_account_date', ['accountId', 'date']),

  ecforceOrders: defineTable({
    orderId: v.string(), // 受注ID
    orderNumber: v.optional(v.string()), // 受注番号
    orderDate: v.string(), // 受注日
    purchaseDate: v.string(), // 注文日
    purchaseUrl: v.optional(v.string()), // 購入URL
    customerId: v.string(), // 顧客ID
    customerNumber: v.string(), // 顧客番号
    email: v.string(), // メールアドレス
    postalCode: v.optional(v.string()), // 郵便番号
    address: v.optional(v.string()), // 住所
    // 金額関連
    subtotal: v.number(), // 小計
    discount: v.optional(v.number()), // 値引額
    tax: v.optional(v.number()), // 消費税
    shipping: v.optional(v.number()), // 送料
    fee: v.optional(v.number()), // 手数料
    pointsUsed: v.optional(v.number()), // ポイント利用額
    total: v.number(), // 合計
    // 商品情報
    products: v.optional(v.array(v.string())), // 購入商品
    offer: v.optional(v.string()), // 購入オファー
    // 状態
    subscriptionStatus: v.optional(v.string()), // 定期ステータス
    subscriptionOrderNumber: v.optional(v.string()), // 定期受注番号
    deliveryStatus: v.optional(v.string()), // 配送ステータス
    // 広告関連
    adCode: v.optional(v.string()), // 広告コード
    advertiserName: v.optional(v.string()), // 広告主名
    adMedia: v.optional(v.string()), // 広告媒体
    adUrlGroupName: v.optional(v.string()), // 広告URLグループ名
    adType: v.optional(v.string()), // 広告種別
    adTrackingUrl: v.optional(v.string()), // 広告計測URL
    // メタデータ
    importedAt: v.string(),
    updatedAt: v.string(),
  })
    .index('by_orderId', ['orderId'])
    .index('by_customerId', ['customerId'])
    .index('by_orderDate', ['orderDate'])
    .index('by_email', ['email']),

  // 疲労度分析スケジュール
  fatigueAnalysisSchedules: defineTable({
    accountId: v.string(),
    interval: v.union(
      v.literal('15min'),
      v.literal('30min'),
      v.literal('hourly'),
      v.literal('daily')
    ),
    enabled: v.boolean(),
    lastRun: v.optional(v.string()),
    nextRun: v.string(),
    lastRunStatus: v.optional(v.union(v.literal('success'), v.literal('error'))),
    lastRunAdsAnalyzed: v.optional(v.number()),
    lastRunError: v.optional(v.string()),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index('by_account', ['accountId'])
    .index('by_enabled', ['enabled', 'nextRun']),

  // 疲労度分析レポート
  fatigueReports: defineTable({
    id: v.string(),
    accountId: v.string(),
    adId: v.string(),
    adName: v.string(),
    campaignId: v.string(),
    dateRange: v.object({
      start: v.string(),
      end: v.string(),
    }),
    generatedAt: v.string(),
    executiveSummary: v.string(),
    overallScore: v.object({
      score: v.number(),
      status: v.union(
        v.literal('healthy'),
        v.literal('caution'),
        v.literal('warning'),
        v.literal('critical')
      ),
      trend: v.string(),
      primaryIssue: v.union(v.literal('audience'), v.literal('creative'), v.literal('algorithm')),
    }),
    detailedAnalysis: v.any(),
    recommendations: v.any(),
    predictions: v.any(),
    benchmarks: v.any(),
    appendix: v.optional(v.any()),
    createdAt: v.number(),
  })
    .index('by_account', ['accountId'])
    .index('by_ad', ['adId'])
    .index('by_created', ['createdAt']),

  // Instagram価値分析テーブル
  instagramValue: defineTable({
    accountId: v.string(),
    creativeId: v.string(),
    adId: v.string(),
    date: v.string(),
    saves: v.number(),
    shares: v.number(),
    comments: v.number(),
    likes: v.number(),
    reach: v.number(),
    impressions: v.number(),
    valueScore: v.number(),
    engagement: v.number(),
    engagementRate: v.number(),
    saveRate: v.optional(v.number()),
    profileToFollowRate: v.optional(v.number()),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index('by_account', ['accountId'])
    .index('by_creative', ['creativeId'])
    .index('by_date', ['date'])
    .index('by_ad_date', ['adId', 'date']),

  // スケジュールジョブログテーブル
  scheduledJobLogs: defineTable({
    jobId: v.string(),
    jobType: v.string(),
    status: v.union(v.literal('running'), v.literal('completed'), v.literal('failed')),
    startedAt: v.string(),
    completedAt: v.optional(v.string()),
    error: v.optional(v.string()),
    metadata: v.optional(v.any()),
  })
    .index('by_jobId', ['jobId'])
    .index('by_status', ['status'])
    .index('by_startedAt', ['startedAt']),

  // 動画パフォーマンステーブル
  videoPerformance: defineTable({
    accountId: v.string(),
    adId: v.string(),
    date: v.string(),
    avgWatchTime: v.number(),
    p25Reached: v.number(),
    p50Reached: v.number(),
    p75Reached: v.number(),
    p95Reached: v.number(),
    p100Reached: v.number(),
    thruplayRate: v.number(),
    dropoffPoint: v.number(),
    engagementDecay: v.number(),
    retentionScore: v.number(),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index('by_account', ['accountId'])
    .index('by_ad', ['adId'])
    .index('by_date', ['date']),
})
