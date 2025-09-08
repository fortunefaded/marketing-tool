import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  // === Meta API Core ===
  metaAccounts: defineTable({
    accountId: v.string(),
    accountName: v.string(),
    accessToken: v.optional(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
    lastSyncAt: v.optional(v.number()),
    permissions: v.optional(v.array(v.string())),
  })
    .index('by_account_id', ['accountId'])
    .index('by_active', ['isActive']),

  metaAccountSettings: defineTable({
    activeAccountId: v.optional(v.string()),
    updatedAt: v.number(),
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
    enabled: v.boolean(),
    frequency: v.string(),
    lastSync: v.optional(v.number()),
    nextSync: v.optional(v.number()),
    settings: v.optional(v.any()),
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
    updatedDates: v.array(v.string()),
    actualUpdatedDates: v.optional(v.array(v.string())),
    apiCallsSaved: v.number(),
    apiCallsUsed: v.optional(v.number()),
    recordsAdded: v.optional(v.number()),
    recordsUpdated: v.optional(v.number()),
    recordsDeleted: v.optional(v.number()),
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
})
