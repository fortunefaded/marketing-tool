/**
 * データ鮮度管理 CRUD Functions
 *
 * データの鮮度状態を管理し、差分更新のタイミングを制御
 */

import { v } from 'convex/values'
import { mutation, query } from '../_generated/server'

// ============================================================================
// CREATE
// ============================================================================

/**
 * 新しいデータ鮮度エントリを作成
 */
export const create = mutation({
  args: {
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
  },
  handler: async (ctx, args) => {
    const now = Date.now()

    // 既存のエントリをチェック
    const existing = await ctx.db
      .query('dataFreshness')
      .withIndex('by_account_range', (q) =>
        q.eq('accountId', args.accountId).eq('dateRange', args.dateRange)
      )
      .first()

    if (existing) {
      throw new Error(`Data freshness entry already exists for ${args.accountId}/${args.dateRange}`)
    }

    // 次の更新時刻を計算
    const nextUpdateAt = calculateNextUpdateTime(args.freshnessStatus, now)

    const entryId = await ctx.db.insert('dataFreshness', {
      ...args,
      lastUpdated: now,
      nextUpdateAt,
      updatePriority: calculatePriority(args.freshnessStatus),
      updateCount: 0,
      apiCallsToday: 0,
      apiCallsTotal: 0,
      dataCompleteness: 0,
      lastVerifiedAt: now,
      createdAt: now,
      updatedAt: now,
    })

    return entryId
  },
})

// ============================================================================
// READ
// ============================================================================

/**
 * アカウントとデータ範囲でデータ鮮度を取得
 */
export const getByAccountAndRange = query({
  args: {
    accountId: v.string(),
    dateRange: v.string(),
  },
  handler: async (ctx, args) => {
    const entry = await ctx.db
      .query('dataFreshness')
      .withIndex('by_account_range', (q) =>
        q.eq('accountId', args.accountId).eq('dateRange', args.dateRange)
      )
      .first()

    return entry
  },
})

/**
 * アカウントの全データ鮮度エントリを取得
 */
export const getByAccount = query({
  args: {
    accountId: v.string(),
  },
  handler: async (ctx, args) => {
    const entries = await ctx.db
      .query('dataFreshness')
      .withIndex('by_account', (q) => q.eq('accountId', args.accountId))
      .collect()

    return entries
  },
})

/**
 * 更新が必要なエントリを優先度順で取得
 */
export const getEntriesNeedingUpdate = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    const limit = args.limit || 10

    // nextUpdateAtが現在時刻を過ぎているエントリを取得
    const entries = await ctx.db
      .query('dataFreshness')
      .withIndex('by_next_update')
      .filter((q) => q.lte(q.field('nextUpdateAt'), now))
      .take(limit)

    // 優先度でソート
    return entries.sort((a, b) => b.updatePriority - a.updatePriority)
  },
})

// ============================================================================
// UPDATE
// ============================================================================

/**
 * データ鮮度状態を更新
 */
export const updateFreshnessStatus = mutation({
  args: {
    id: v.id('dataFreshness'),
    freshnessStatus: v.union(
      v.literal('realtime'),
      v.literal('neartime'),
      v.literal('stabilizing'),
      v.literal('finalized')
    ),
    dataCompleteness: v.optional(v.number()),
    missingDates: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    const { id, freshnessStatus, ...updates } = args

    // 既存のエントリを取得
    const existing = await ctx.db.get(id)
    if (!existing) {
      throw new Error(`Data freshness entry ${id} not found`)
    }

    // 次の更新時刻を再計算
    const nextUpdateAt = calculateNextUpdateTime(freshnessStatus, now)

    await ctx.db.patch(id, {
      freshnessStatus,
      nextUpdateAt,
      updatePriority: calculatePriority(freshnessStatus),
      lastUpdated: now,
      updatedAt: now,
      updateCount: existing.updateCount + 1,
      ...updates,
    })

    return id
  },
})

/**
 * API呼び出し回数を更新
 */
export const incrementApiCalls = mutation({
  args: {
    accountId: v.string(),
    dateRange: v.string(),
    count: v.number(),
  },
  handler: async (ctx, args) => {
    const entry = await ctx.db
      .query('dataFreshness')
      .withIndex('by_account_range', (q) =>
        q.eq('accountId', args.accountId).eq('dateRange', args.dateRange)
      )
      .first()

    if (!entry) {
      throw new Error(`Data freshness entry not found for ${args.accountId}/${args.dateRange}`)
    }

    const now = Date.now()
    const isToday = isSameDay(entry.lastApiCallAt || 0, now)

    await ctx.db.patch(entry._id, {
      apiCallsToday: isToday ? entry.apiCallsToday + args.count : args.count,
      apiCallsTotal: entry.apiCallsTotal + args.count,
      lastApiCallAt: now,
      updatedAt: now,
    })

    return entry._id
  },
})

// ============================================================================
// DELETE
// ============================================================================

/**
 * データ鮮度エントリを削除
 */
export const remove = mutation({
  args: {
    id: v.id('dataFreshness'),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id)
    return args.id
  },
})

/**
 * アカウントの全データ鮮度エントリを削除
 */
export const removeByAccount = mutation({
  args: {
    accountId: v.string(),
  },
  handler: async (ctx, args) => {
    const entries = await ctx.db
      .query('dataFreshness')
      .withIndex('by_account', (q) => q.eq('accountId', args.accountId))
      .collect()

    const deletedIds = []
    for (const entry of entries) {
      await ctx.db.delete(entry._id)
      deletedIds.push(entry._id)
    }

    return deletedIds
  },
})

// ============================================================================
// ヘルパー関数
// ============================================================================

/**
 * 鮮度状態に基づいて次の更新時刻を計算
 */
function calculateNextUpdateTime(status: string, currentTime: number): number {
  const intervals = {
    realtime: 3 * 60 * 60 * 1000, // 3時間
    neartime: 6 * 60 * 60 * 1000, // 6時間
    stabilizing: 24 * 60 * 60 * 1000, // 24時間
    finalized: 7 * 24 * 60 * 60 * 1000, // 7日（念のため）
  }

  return currentTime + (intervals[status as keyof typeof intervals] || intervals.finalized)
}

/**
 * 鮮度状態に基づいて優先度を計算
 */
function calculatePriority(status: string): number {
  const priorities = {
    realtime: 100,
    neartime: 75,
    stabilizing: 50,
    finalized: 10,
  }

  return priorities[status as keyof typeof priorities] || 0
}

/**
 * 2つのタイムスタンプが同じ日かチェック
 */
function isSameDay(timestamp1: number, timestamp2: number): boolean {
  const date1 = new Date(timestamp1)
  const date2 = new Date(timestamp2)

  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  )
}
