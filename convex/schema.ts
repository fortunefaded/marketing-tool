import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  // === Meta API Core ===
  metaAccounts: defineTable({
    accountId: v.string(),
    accountName: v.optional(v.string()),
    name: v.optional(v.string()),
    accessToken: v.optional(v.string()),
    isActive: v.boolean(),
    createdAt: v.union(v.number(), v.string()),
    updatedAt: v.union(v.number(), v.string()),
    lastSyncAt: v.optional(v.number()),
    lastUsedAt: v.optional(v.string()),
    permissions: v.optional(v.array(v.string())),
    currency: v.optional(v.string()),
    timezone: v.optional(v.string()),
    fullAccountId: v.optional(v.string()),
  })
    .index('by_account_id', ['accountId'])
    .index('by_active', ['isActive']),

  metaAccountSettings: defineTable({
    activeAccountId: v.optional(v.string()),
    updatedAt: v.union(v.number(), v.string()),
  }),

  metaInsights: defineTable({
    accountId: v.string(),
    insightId: v.string(),
    adId: v.string(),
    adName: v.optional(v.string()),
    campaignId: v.optional(v.string()),
    campaignName: v.optional(v.string()),
    dateStart: v.string(),
    dateStop: v.string(),
    impressions: v.number(),
    reach: v.optional(v.number()),
    frequency: v.optional(v.number()),
    spend: v.optional(v.number()),
    clicks: v.optional(v.number()),
    ctr: v.optional(v.number()),
    cpm: v.optional(v.number()),
    cpc: v.optional(v.number()),
    conversions: v.optional(v.number()),
    // Creative related properties
    creative_type: v.optional(v.string()),
    creative_id: v.optional(v.string()),
    creative_name: v.optional(v.string()),
    thumbnail_url: v.optional(v.string()),
    video_url: v.optional(v.string()),
    carousel_cards: v.optional(v.array(v.any())),
    createdAt: v.number(),
    updatedAt: v.number(),
    rawData: v.optional(v.any()),
  })
    .index('by_account', ['accountId'])
    .index('by_account_and_date', ['accountId', 'dateStart']),

  // === Sync Settings ===
  syncSettings: defineTable({
    accountId: v.string(),
    enabled: v.optional(v.boolean()),
    autoSync: v.optional(v.boolean()),
    frequency: v.optional(v.string()),
    syncInterval: v.optional(v.string()),
    lastSync: v.optional(v.number()),
    nextSync: v.optional(v.number()),
    settings: v.optional(v.any()),
    debugMode: v.optional(v.boolean()),
    excludeTestCampaigns: v.optional(v.boolean()),
    limitPerRequest: v.optional(v.number()),
    maxMonths: v.optional(v.number()),
    retentionDays: v.optional(v.number()),
    skipCreatives: v.optional(v.boolean()),
    updatedAt: v.optional(v.string()),
  }).index('by_account', ['accountId']),

  metaSyncStatus: defineTable({
    accountId: v.string(),
    lastFullSync: v.optional(v.string()),
    lastIncrementalSync: v.optional(v.string()),
    totalRecords: v.number(),
    earliestDate: v.optional(v.string()),
    latestDate: v.optional(v.string()),
    updatedAt: v.string(),
  }).index('by_account', ['accountId']),

  // === Cache System ===
  cacheEntries: defineTable({
    accountId: v.string(),
    cacheKey: v.string(),
    dateRange: v.string(),
    data: v.any(),
    dataSize: v.number(),
    recordCount: v.number(),
    accessCount: v.number(),
    lastAccessedAt: v.number(),
    checksum: v.string(),
    isComplete: v.boolean(),
    isCompressed: v.boolean(),
    fetchTimeMs: v.number(),
    processTimeMs: v.number(),
    metadata: v.optional(v.any()),
    expiresAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_account', ['accountId'])
    .index('by_account_range', ['accountId', 'dateRange'])
    .index('by_cache_key', ['cacheKey'])
    .index('by_expiry', ['expiresAt']),

  dataFreshness: defineTable({
    accountId: v.string(),
    dateRange: v.string(),
    startDate: v.string(),
    endDate: v.string(),
    freshnessStatus: v.union(
      v.literal('realtime'),
      v.literal('neartime'),
      v.literal('stabilizing'),
      v.literal('finalized')
    ),
    lastUpdated: v.number(),
    nextUpdateAt: v.number(),
    updatePriority: v.number(),
    updateCount: v.number(),
    apiCallsToday: v.number(),
    apiCallsTotal: v.number(),
    dataCompleteness: v.number(),
    lastVerifiedAt: v.number(),
    lastApiCallAt: v.optional(v.number()),
    missingDates: v.optional(v.array(v.string())),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_account', ['accountId'])
    .index('by_account_range', ['accountId', 'dateRange'])
    .index('by_next_update', ['nextUpdateAt'])
    .index('by_status', ['freshnessStatus']),

  differentialUpdates: defineTable({
    accountId: v.string(),
    dateRange: v.string(),
    updateId: v.string(),
    status: v.string(),
    triggeredBy: v.string(),
    targetDates: v.array(v.string()),
    updatedDates: v.optional(v.array(v.string())),
    actualUpdatedDates: v.optional(v.array(v.string())),
    apiCallsSaved: v.number(),
    apiCallsUsed: v.optional(v.number()),
    recordsAdded: v.optional(v.number()),
    recordsUpdated: v.optional(v.number()),
    recordsDeleted: v.optional(v.number()),
    totalRecordsAfter: v.optional(v.number()),
    durationMs: v.optional(v.number()),
    reductionRate: v.optional(v.number()),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    error: v.optional(v.string()),
  })
    .index('by_account', ['accountId'])
    .index('by_account_range', ['accountId', 'dateRange'])
    .index('by_status', ['status'])
    .index('by_update_id', ['updateId']),

  // === Security ===
  tokens: defineTable({
    tokenId: v.string(),
    accountId: v.string(),
    tokenType: v.string(),
    encryptedToken: v.string(),
    expiresAt: v.optional(v.number()),
    createdAt: v.number(),
    lastUsedAt: v.optional(v.number()),
  })
    .index('by_account', ['accountId'])
    .index('by_token_id', ['tokenId']),

  // === Configuration ===
  apiConfig: defineTable({
    key: v.string(),
    value: v.any(),
    updatedAt: v.number(),
  }).index('by_key', ['key']),

  // === ECForce Integration ===
  // ECForce広告パフォーマンスデータ
  ecforcePerformance: defineTable({
    // 識別子
    importId: v.string(),
    hash: v.string(), // 重複チェック用（dataDate+advertiser）

    // 基本データ
    advertiser: v.string(), // 広告主別
    advertiserNormalized: v.string(), // 正規化された広告主名（スペース除去、小文字化）
    dataDate: v.string(), // データ対象日（YYYY-MM-DD）
    date: v.optional(v.string()), // 日付フィールド（YYYY-MM-DD）

    // 金額データ（整数：円単位）
    orderAmount: v.number(), // 受注金額
    salesAmount: v.number(), // 売上金額
    cost: v.number(), // コスト

    // トラフィック・CV
    accessCount: v.number(), // アクセス数
    cvOrder: v.number(), // CV（受注）
    cvrOrder: v.number(), // CVR（受注）- 小数で保存（10.5% → 0.105）
    cvPayment: v.number(), // CV（決済）
    cvrPayment: v.number(), // CVR（決済）- 小数で保存

    // アップセル・クロスセル
    cvThanksUpsell: v.number(), // CV（サンクスアップセル）
    offerRateThanksUpsell: v.number(), // オファー成功率（サンクスアップセル）- 小数で保存

    // 計算フィールド
    paymentRate: v.optional(v.number()), // 決済率（CV決済/CV受注）
    realCPA: v.optional(v.number()), // 実質CPA（コスト/CV決済）
    roas: v.optional(v.number()), // ROAS（売上金額/コスト）

    // メタデータ
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_date', ['dataDate'])
    .index('by_advertiser', ['advertiserNormalized'])
    .index('by_date_advertiser', ['dataDate', 'advertiserNormalized'])
    .index('by_hash', ['hash'])
    .index('by_import', ['importId']),

  // インポート履歴
  ecforceImports: defineTable({
    importId: v.string(),
    fileName: v.optional(v.string()),
    fileSize: v.optional(v.number()),
    dataDate: v.string(), // データ対象日
    source: v.string(), // 'manual' | 'scheduled'
    status: v.string(), // 'processing' | 'success' | 'partial' | 'failed'

    totalRows: v.number(), // CSVの全行数
    filteredRows: v.number(), // デバイス=合計の行数
    processedRows: v.number(), // 処理済み行数
    successRows: v.number(), // 成功行数
    errorRows: v.number(), // エラー行数
    duplicateRows: v.number(), // 重複行数

    errors: v.optional(
      v.array(
        v.object({
          row: v.number(),
          advertiser: v.optional(v.string()),
          message: v.string(),
        })
      )
    ),

    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    createdBy: v.optional(v.string()),
  })
    .index('by_date', ['startedAt'])
    .index('by_status', ['status']),

  // 同期設定
  ecforceSyncConfig: defineTable({
    enabled: v.boolean(),
    schedule: v.object({
      frequency: v.string(), // 'daily' | 'weekly' | 'monthly'
      time: v.string(), // 'HH:MM'
      timezone: v.string(), // 'Asia/Tokyo'
      lastRun: v.optional(v.number()),
      nextRun: v.optional(v.number()),
    }),
    updatedAt: v.number(),
  }),

  // ECForce広告主とMetaアカウントのマッピング
  advertiserMappings: defineTable({
    metaAccountId: v.string(), // Meta広告アカウントID (act_xxxxx)
    ecforceAdvertiser: v.string(), // ECForce側の広告主名（インハウス等）
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_meta_account', ['metaAccountId'])
    .index('by_advertiser', ['ecforceAdvertiser']),
})
