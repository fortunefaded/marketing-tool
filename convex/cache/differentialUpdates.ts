/**
 * 差分更新履歴 CRUD Functions
 *
 * API使用量削減のための差分更新の記録と分析
 */

import { v } from 'convex/values'
import { mutation, query } from '../_generated/server'
import { Doc, Id } from '../_generated/dataModel'

// ============================================================================
// CREATE
// ============================================================================

/**
 * 新しい差分更新ジョブを開始
 */
export const startUpdate = mutation({
  args: {
    accountId: v.string(),
    dateRange: v.string(),
    targetDates: v.array(v.string()),
    triggeredBy: v.union(
      v.literal('manual'),
      v.literal('scheduled'),
      v.literal('freshness'),
      v.literal('api')
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    const updateId = generateUpdateId()

    const entryId = await ctx.db.insert('differentialUpdates', {
      updateId,
      accountId: args.accountId,
      dateRange: args.dateRange,
      targetDates: args.targetDates,
      actualUpdatedDates: [],
      apiCallsUsed: 0,
      apiCallsSaved: 0,
      reductionRate: 0,
      recordsAdded: 0,
      recordsUpdated: 0,
      recordsDeleted: 0,
      totalRecordsAfter: 0,
      startedAt: now,
      completedAt: now, // 初期値として設定
      durationMs: 0,
      status: 'running',
      triggeredBy: args.triggeredBy,
    })

    return { id: entryId, updateId }
  },
})

// ============================================================================
// READ
// ============================================================================

/**
 * 更新IDで差分更新を取得
 */
export const getByUpdateId = query({
  args: {
    updateId: v.string(),
  },
  handler: async (ctx, args) => {
    const entries = await ctx.db.query('differentialUpdates').collect()

    return entries.find((e) => e.updateId === args.updateId)
  },
})

/**
 * アカウントの差分更新履歴を取得
 */
export const getByAccount = query({
  args: {
    accountId: v.string(),
    limit: v.optional(v.number()),
    status: v.optional(
      v.union(
        v.literal('pending'),
        v.literal('running'),
        v.literal('completed'),
        v.literal('failed'),
        v.literal('partial')
      )
    ),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query('differentialUpdates')
      .withIndex('by_account', (q) => q.eq('accountId', args.accountId))

    const entries = await query.collect()

    // ステータスでフィルタ
    let filtered = entries
    if (args.status) {
      filtered = entries.filter((e) => e.status === args.status)
    }

    // 日付でソート（新しい順）
    filtered.sort((a, b) => b.startedAt - a.startedAt)

    // 制限を適用
    if (args.limit) {
      filtered = filtered.slice(0, args.limit)
    }

    return filtered
  },
})

/**
 * 実行中の更新を取得
 */
export const getRunningUpdates = query({
  args: {
    accountId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query('differentialUpdates')
      .withIndex('by_status', (q) => q.eq('status', 'running'))

    const entries = await query.collect()

    if (args.accountId) {
      return entries.filter((e) => e.accountId === args.accountId)
    }

    return entries
  },
})

/**
 * API削減統計を取得
 */
export const getApiReductionStats = query({
  args: {
    accountId: v.string(),
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const days = args.days || 30
    const cutoffTime = Date.now() - days * 24 * 60 * 60 * 1000

    const entries = await ctx.db
      .query('differentialUpdates')
      .withIndex('by_account', (q) => q.eq('accountId', args.accountId))
      .collect()

    const recentEntries = entries.filter(
      (e) => e.startedAt > cutoffTime && e.status === 'completed'
    )

    if (recentEntries.length === 0) {
      return {
        totalUpdates: 0,
        totalApiCalls: 0,
        totalApiCallsSaved: 0,
        avgReductionRate: 0,
        totalDurationMs: 0,
        avgDurationMs: 0,
      }
    }

    const totalApiCalls = recentEntries.reduce((sum, e) => sum + e.apiCallsUsed, 0)
    const totalApiCallsSaved = recentEntries.reduce((sum, e) => sum + e.apiCallsSaved, 0)
    const totalDurationMs = recentEntries.reduce((sum, e) => sum + e.durationMs, 0)
    const avgReductionRate =
      recentEntries.reduce((sum, e) => sum + e.reductionRate, 0) / recentEntries.length

    return {
      totalUpdates: recentEntries.length,
      totalApiCalls,
      totalApiCallsSaved,
      avgReductionRate: Math.round(avgReductionRate),
      totalDurationMs,
      avgDurationMs: Math.round(totalDurationMs / recentEntries.length),
      estimatedCostSaved: calculateEstimatedCostSaved(totalApiCallsSaved),
    }
  },
})

// ============================================================================
// UPDATE
// ============================================================================

/**
 * 差分更新の進捗を更新
 */
export const updateProgress = mutation({
  args: {
    updateId: v.string(),
    actualUpdatedDates: v.optional(v.array(v.string())),
    apiCallsUsed: v.optional(v.number()),
    recordsAdded: v.optional(v.number()),
    recordsUpdated: v.optional(v.number()),
    recordsDeleted: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const entries = await ctx.db.query('differentialUpdates').collect()

    const entry = entries.find((e) => e.updateId === args.updateId)

    if (!entry) {
      throw new Error(`Differential update ${args.updateId} not found`)
    }

    const updates: any = {}

    if (args.actualUpdatedDates) {
      updates.actualUpdatedDates = args.actualUpdatedDates
    }
    if (args.apiCallsUsed !== undefined) {
      updates.apiCallsUsed = entry.apiCallsUsed + args.apiCallsUsed
    }
    if (args.recordsAdded !== undefined) {
      updates.recordsAdded = entry.recordsAdded + args.recordsAdded
    }
    if (args.recordsUpdated !== undefined) {
      updates.recordsUpdated = entry.recordsUpdated + args.recordsUpdated
    }
    if (args.recordsDeleted !== undefined) {
      updates.recordsDeleted = entry.recordsDeleted + args.recordsDeleted
    }

    await ctx.db.patch(entry._id, updates)

    return entry._id
  },
})

/**
 * 差分更新を完了
 */
export const completeUpdate = mutation({
  args: {
    updateId: v.string(),
    totalRecordsAfter: v.number(),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    const entries = await ctx.db.query('differentialUpdates').collect()

    const entry = entries.find((e) => e.updateId === args.updateId)

    if (!entry) {
      throw new Error(`Differential update ${args.updateId} not found`)
    }

    // API削減率を計算
    const expectedApiCalls = entry.targetDates.length * 10 // 仮定: 1日あたり10API呼び出し
    const apiCallsSaved = Math.max(0, expectedApiCalls - entry.apiCallsUsed)
    const reductionRate = expectedApiCalls > 0 ? (apiCallsSaved / expectedApiCalls) * 100 : 0

    const status = args.error
      ? 'failed'
      : entry.actualUpdatedDates.length === entry.targetDates.length
        ? 'completed'
        : 'partial'

    await ctx.db.patch(entry._id, {
      completedAt: now,
      durationMs: now - entry.startedAt,
      totalRecordsAfter: args.totalRecordsAfter,
      apiCallsSaved,
      reductionRate: Math.round(reductionRate),
      status,
      error: args.error,
    })

    return entry._id
  },
})

// ============================================================================
// DELETE
// ============================================================================

/**
 * 古い差分更新履歴を削除
 */
export const removeOldUpdates = mutation({
  args: {
    daysToKeep: v.number(),
  },
  handler: async (ctx, args) => {
    const cutoffTime = Date.now() - args.daysToKeep * 24 * 60 * 60 * 1000

    const entries = await ctx.db.query('differentialUpdates').collect()

    const oldEntries = entries.filter((e) => e.completedAt < cutoffTime)

    const deletedIds = []
    for (const entry of oldEntries) {
      await ctx.db.delete(entry._id)
      deletedIds.push(entry._id)
    }

    return {
      deletedCount: deletedIds.length,
      deletedIds,
    }
  },
})

// ============================================================================
// ヘルパー関数
// ============================================================================

/**
 * 更新IDを生成
 */
function generateUpdateId(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 9)
  return `upd_${timestamp}_${random}`
}

/**
 * 推定節約額を計算（USD）
 */
function calculateEstimatedCostSaved(apiCallsSaved: number): number {
  // Meta API の推定コスト: $0.01 per 1000 API calls
  const costPer1000Calls = 0.01
  return (apiCallsSaved / 1000) * costPer1000Calls
}
