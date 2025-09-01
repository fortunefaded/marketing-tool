/**
 * キャッシュエントリ CRUD Functions
 *
 * L2永続化キャッシュのメインテーブル操作
 */

import { v } from 'convex/values'
import { mutation, query } from '../_generated/server'
import { Doc, Id } from '../_generated/dataModel'
import crypto from 'crypto'

// ============================================================================
// CREATE
// ============================================================================

/**
 * 新しいキャッシュエントリを作成
 */
export const create = mutation({
  args: {
    accountId: v.string(),
    dateRange: v.string(),
    data: v.any(),
    expiresInHours: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    const cacheKey = generateCacheKey(args.accountId, args.dateRange)

    // 既存のエントリをチェック
    const existing = await ctx.db
      .query('cacheEntries')
      .withIndex('by_cache_key', (q) => q.eq('cacheKey', cacheKey))
      .first()

    if (existing) {
      // 既存エントリがある場合は更新
      return await updateEntry(ctx, existing._id, args.data, args.expiresInHours)
    }

    // データサイズを計算
    const dataStr = JSON.stringify(args.data)
    const dataSize = new Blob([dataStr]).size
    const checksum = generateChecksum(dataStr)

    // 有効期限を設定（デフォルト24時間）
    const expiresInHours = args.expiresInHours || 24
    const expiresAt = now + expiresInHours * 60 * 60 * 1000

    const entryId = await ctx.db.insert('cacheEntries', {
      cacheKey,
      accountId: args.accountId,
      dateRange: args.dateRange,
      data: args.data,
      dataSize,
      recordCount: Array.isArray(args.data) ? args.data.length : 1,
      createdAt: now,
      updatedAt: now,
      expiresAt,
      accessCount: 0,
      lastAccessedAt: now,
      checksum,
      isComplete: true,
      isCompressed: false,
      fetchTimeMs: 0,
      processTimeMs: 0,
    })

    return entryId
  },
})

// ============================================================================
// READ
// ============================================================================

/**
 * キャッシュキーでエントリを取得
 */
export const getByCacheKey = query({
  args: {
    cacheKey: v.string(),
  },
  handler: async (ctx, args) => {
    const entry = await ctx.db
      .query('cacheEntries')
      .withIndex('by_cache_key', (q) => q.eq('cacheKey', args.cacheKey))
      .first()

    if (entry && entry.expiresAt < Date.now()) {
      // 期限切れの場合はnullを返す
      return null
    }

    // アクセスカウントを更新（バッチ処理で後から実行）
    if (entry) {
      await incrementAccessCount(ctx, entry._id)
    }

    return entry
  },
})

/**
 * アカウントとデータ範囲でエントリを取得
 */
export const getByAccountAndRange = query({
  args: {
    accountId: v.string(),
    dateRange: v.string(),
  },
  handler: async (ctx, args) => {
    const entry = await ctx.db
      .query('cacheEntries')
      .withIndex('by_account_range', (q) =>
        q.eq('accountId', args.accountId).eq('dateRange', args.dateRange)
      )
      .first()

    if (entry && entry.expiresAt < Date.now()) {
      return null
    }

    if (entry) {
      await incrementAccessCount(ctx, entry._id)
    }

    return entry
  },
})

/**
 * アカウントの全キャッシュエントリを取得
 */
export const getByAccount = query({
  args: {
    accountId: v.string(),
    includeExpired: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const entries = await ctx.db
      .query('cacheEntries')
      .withIndex('by_account', (q) => q.eq('accountId', args.accountId))
      .collect()

    if (!args.includeExpired) {
      const now = Date.now()
      return entries.filter((entry) => entry.expiresAt > now)
    }

    return entries
  },
})

/**
 * キャッシュ統計を取得
 */
export const getStats = query({
  args: {
    accountId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query('cacheEntries')

    if (args.accountId) {
      query = query.withIndex('by_account', (q) => q.eq('accountId', args.accountId))
    }

    const entries = await query.collect()
    const now = Date.now()

    const validEntries = entries.filter((e) => e.expiresAt > now)
    const totalSize = validEntries.reduce((sum, e) => sum + e.dataSize, 0)
    const totalRecords = validEntries.reduce((sum, e) => sum + e.recordCount, 0)
    const avgAccessCount =
      validEntries.length > 0
        ? validEntries.reduce((sum, e) => sum + e.accessCount, 0) / validEntries.length
        : 0

    return {
      totalEntries: validEntries.length,
      totalSizeBytes: totalSize,
      totalSizeMB: totalSize / (1024 * 1024),
      totalRecords,
      avgAccessCount: Math.round(avgAccessCount),
      oldestEntry:
        validEntries.length > 0
          ? new Date(Math.min(...validEntries.map((e) => e.createdAt)))
          : null,
      newestEntry:
        validEntries.length > 0
          ? new Date(Math.max(...validEntries.map((e) => e.createdAt)))
          : null,
    }
  },
})

// ============================================================================
// UPDATE
// ============================================================================

/**
 * キャッシュエントリのデータを更新
 */
export const update = mutation({
  args: {
    cacheKey: v.string(),
    data: v.any(),
    expiresInHours: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const entry = await ctx.db
      .query('cacheEntries')
      .withIndex('by_cache_key', (q) => q.eq('cacheKey', args.cacheKey))
      .first()

    if (!entry) {
      throw new Error(`Cache entry ${args.cacheKey} not found`)
    }

    return await updateEntry(ctx, entry._id, args.data, args.expiresInHours)
  },
})

/**
 * キャッシュエントリの有効期限を延長
 */
export const extendExpiry = mutation({
  args: {
    cacheKey: v.string(),
    additionalHours: v.number(),
  },
  handler: async (ctx, args) => {
    const entry = await ctx.db
      .query('cacheEntries')
      .withIndex('by_cache_key', (q) => q.eq('cacheKey', args.cacheKey))
      .first()

    if (!entry) {
      throw new Error(`Cache entry ${args.cacheKey} not found`)
    }

    const now = Date.now()
    const newExpiresAt = Math.max(entry.expiresAt, now) + args.additionalHours * 60 * 60 * 1000

    await ctx.db.patch(entry._id, {
      expiresAt: newExpiresAt,
      updatedAt: now,
    })

    return entry._id
  },
})

// ============================================================================
// DELETE
// ============================================================================

/**
 * キャッシュエントリを削除
 */
export const remove = mutation({
  args: {
    cacheKey: v.string(),
  },
  handler: async (ctx, args) => {
    const entry = await ctx.db
      .query('cacheEntries')
      .withIndex('by_cache_key', (q) => q.eq('cacheKey', args.cacheKey))
      .first()

    if (!entry) {
      return null
    }

    await ctx.db.delete(entry._id)
    return entry._id
  },
})

/**
 * 期限切れのエントリを削除
 */
export const removeExpired = mutation({
  args: {
    accountId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    let query = ctx.db.query('cacheEntries')

    if (args.accountId) {
      query = query.withIndex('by_account', (q) => q.eq('accountId', args.accountId))
    }

    const entries = await query.collect()
    const expiredEntries = entries.filter((e) => e.expiresAt < now)

    const deletedIds = []
    for (const entry of expiredEntries) {
      await ctx.db.delete(entry._id)
      deletedIds.push(entry._id)
    }

    return {
      deletedCount: deletedIds.length,
      deletedIds,
    }
  },
})

/**
 * アカウントの全キャッシュエントリを削除
 */
export const removeByAccount = mutation({
  args: {
    accountId: v.string(),
  },
  handler: async (ctx, args) => {
    const entries = await ctx.db
      .query('cacheEntries')
      .withIndex('by_account', (q) => q.eq('accountId', args.accountId))
      .collect()

    const deletedIds = []
    for (const entry of entries) {
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
 * キャッシュキーを生成
 */
function generateCacheKey(accountId: string, dateRange: string): string {
  const hash = crypto
    .createHash('md5')
    .update(`${accountId}_${dateRange}`)
    .digest('hex')
    .substring(0, 8)

  return `${accountId}_${dateRange}_${hash}`
}

/**
 * チェックサムを生成
 */
function generateChecksum(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16)
}

/**
 * エントリを更新
 */
async function updateEntry(
  ctx: any,
  entryId: Id<'cacheEntries'>,
  data: any,
  expiresInHours?: number
) {
  const now = Date.now()
  const dataStr = JSON.stringify(data)
  const dataSize = new Blob([dataStr]).size
  const checksum = generateChecksum(dataStr)

  const existing = await ctx.db.get(entryId)
  if (!existing) {
    throw new Error(`Cache entry ${entryId} not found`)
  }

  const expiresAt = expiresInHours ? now + expiresInHours * 60 * 60 * 1000 : existing.expiresAt

  await ctx.db.patch(entryId, {
    data,
    dataSize,
    recordCount: Array.isArray(data) ? data.length : 1,
    updatedAt: now,
    expiresAt,
    checksum,
  })

  return entryId
}

/**
 * アクセスカウントをインクリメント
 */
async function incrementAccessCount(ctx: any, entryId: Id<'cacheEntries'>) {
  const now = Date.now()
  const entry = await ctx.db.get(entryId)

  if (entry) {
    // バッチ処理のため、即座には更新しない
    // 実際の実装では、別のスケジューラーでまとめて更新
    await ctx.db.patch(entryId, {
      accessCount: entry.accessCount + 1,
      lastAccessedAt: now,
    })
  }
}
