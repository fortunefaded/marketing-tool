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
  })
    .index('by_account', ['accountId']),

  // === Cache System ===
  cacheEntries: defineTable({
    accountId: v.string(),
    cacheKey: v.string(),
    dateRange: v.string(),
    data: v.any(),
    metadata: v.optional(v.any()),
    expiresAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_account_and_range', ['accountId', 'dateRange'])
    .index('by_cache_key', ['cacheKey'])
    .index('by_expiry', ['expiresAt']),

  dataFreshness: defineTable({
    accountId: v.string(),
    dateRange: v.string(),
    lastUpdated: v.number(),
    freshnessScore: v.number(),
    status: v.string(),
    apiCallCount: v.optional(v.number()),
  })
    .index('by_account_and_range', ['accountId', 'dateRange'])
    .index('by_status', ['status']),

  differentialUpdates: defineTable({
    accountId: v.string(),
    dateRange: v.string(),
    updateId: v.string(),
    status: v.string(),
    triggeredBy: v.string(),
    targetDates: v.array(v.string()),
    updatedDates: v.array(v.string()),
    apiCallsSaved: v.number(),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    error: v.optional(v.string()),
  })
    .index('by_account_and_range', ['accountId', 'dateRange'])
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
  })
    .index('by_key', ['key']),
})