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
    campaignId: v.optional(v.string()), // Meta Campaign ID
    creativeId: v.optional(v.string()), // Meta Creative ID
    impressions: v.number(),
    clicks: v.number(),
    spend: v.number(),
    conversions: v.number(),
    revenue: v.optional(v.number()),
    dateStart: v.string(),
    dateStop: v.string(),
    createdAt: v.string(),
  })
    .index('by_campaignId', ['campaignId'])
    .index('by_creativeId', ['creativeId'])
    .index('by_dateRange', ['dateStart', 'dateStop']),

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
    errors: v.optional(v.array(v.object({
      metaId: v.string(),
      error: v.string(),
    }))),
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
})
