/**
 * Google Sheets統合のConvex関数
 */

import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

// === 認証関連 ===

/**
 * Google OAuth2トークンを保存
 */
export const saveAuthToken = mutation({
  args: {
    accessToken: v.string(),
    refreshToken: v.optional(v.string()),
    tokenType: v.string(),
    expiresIn: v.number(),
    scope: v.string(),
  },
  handler: async (ctx, args) => {
    const expiresAt = Date.now() + args.expiresIn * 1000

    // 既存のトークンを削除
    const existing = await ctx.db
      .query('googleAuthTokens')
      .first()

    if (existing) {
      await ctx.db.delete(existing._id)
    }

    // 新しいトークンを保存
    const tokenId = await ctx.db.insert('googleAuthTokens', {
      userId: undefined, // 将来的にユーザー管理を追加
      accessToken: args.accessToken,
      refreshToken: args.refreshToken,
      tokenType: args.tokenType,
      expiresAt,
      scope: args.scope,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })

    return { success: true, tokenId }
  },
})

/**
 * 有効なトークンを取得
 */
export const getValidToken = query({
  handler: async (ctx) => {
    const token = await ctx.db
      .query('googleAuthTokens')
      .first()

    if (!token) return null

    // トークンの有効期限をチェック
    const isExpired = token.expiresAt < Date.now()

    return {
      ...token,
      isExpired,
      expiresIn: Math.max(0, token.expiresAt - Date.now()),
    }
  },
})

/**
 * トークンを削除（ログアウト）
 */
export const deleteAuthToken = mutation({
  handler: async (ctx) => {
    const token = await ctx.db
      .query('googleAuthTokens')
      .first()

    if (token) {
      await ctx.db.delete(token._id)
    }

    return { success: true }
  },
})

// === スプレッドシート設定 ===

/**
 * スプレッドシート設定を作成
 */
export const createSheetConfig = mutation({
  args: {
    sheetId: v.string(),
    sheetName: v.string(),
    sheetUrl: v.string(),
    agencyName: v.string(),
    formatType: v.string(),
    dataRange: v.optional(v.string()),
    headerRow: v.number(),
    dataStartRow: v.number(),
    columnMappings: v.any(),
    syncFrequency: v.string(),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const configId = await ctx.db.insert('googleSheetConfigs', {
      ...args,
      lastSyncAt: undefined,
      nextSyncAt: args.syncFrequency === 'daily'
        ? Date.now() + 24 * 60 * 60 * 1000
        : undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })

    return { success: true, configId }
  },
})

/**
 * スプレッドシート設定を更新
 */
export const updateSheetConfig = mutation({
  args: {
    configId: v.id('googleSheetConfigs'),
    updates: v.object({
      sheetName: v.optional(v.string()),
      agencyName: v.optional(v.string()),
      dataRange: v.optional(v.string()),
      headerRow: v.optional(v.number()),
      dataStartRow: v.optional(v.number()),
      columnMappings: v.optional(v.any()),
      syncFrequency: v.optional(v.string()),
      isActive: v.optional(v.boolean()),
    }),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.configId, {
      ...args.updates,
      updatedAt: Date.now(),
    })

    return { success: true }
  },
})

/**
 * スプレッドシート設定一覧を取得
 */
export const listSheetConfigs = query({
  handler: async (ctx) => {
    const configs = await ctx.db
      .query('googleSheetConfigs')
      .order('desc')
      .collect()

    return configs
  },
})

/**
 * アクティブなスプレッドシート設定を取得
 */
export const getActiveSheetConfigs = query({
  handler: async (ctx) => {
    const configs = await ctx.db
      .query('googleSheetConfigs')
      .filter(q => q.eq(q.field('isActive'), true))
      .collect()

    return configs
  },
})

/**
 * スプレッドシート設定を削除
 */
export const deleteSheetConfig = mutation({
  args: {
    configId: v.id('googleSheetConfigs'),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.configId)
    return { success: true }
  },
})

// === データインポート ===

/**
 * 統合広告パフォーマンスデータを保存
 */
export const saveUnifiedPerformanceData = mutation({
  args: {
    data: v.array(v.object({
      sourceType: v.string(),
      sourceId: v.string(),
      agencyName: v.string(),
      date: v.string(),
      campaignName: v.optional(v.string()),
      adsetName: v.optional(v.string()),
      adName: v.optional(v.string()),
      impressions: v.number(),
      clicks: v.number(),
      cost: v.number(),
      conversions: v.number(),
      conversionValue: v.optional(v.number()),
      ctr: v.optional(v.number()),
      cvr: v.optional(v.number()),
      cpc: v.optional(v.number()),
      cpa: v.optional(v.number()),
      rawData: v.optional(v.any()),
    })),
    importId: v.string(),
    sheetConfigId: v.id('googleSheetConfigs'),
  },
  handler: async (ctx, args) => {
    const results = {
      saved: 0,
      updated: 0,
      errors: 0,
    }

    for (const item of args.data) {
      try {
        // 既存データをチェック（同じ日付・代理店・キャンペーンのデータ）
        const existing = await ctx.db
          .query('unifiedAdPerformance')
          .filter(q =>
            q.and(
              q.eq(q.field('date'), item.date),
              q.eq(q.field('agencyName'), item.agencyName),
              q.eq(q.field('sourceId'), item.sourceId)
            )
          )
          .first()

        if (existing) {
          // 既存データを更新
          await ctx.db.patch(existing._id, {
            ...item,
            updatedAt: Date.now(),
          })
          results.updated++
        } else {
          // 新規データを挿入
          await ctx.db.insert('unifiedAdPerformance', {
            ...item,
            importedAt: Date.now(),
            createdAt: Date.now(),
            updatedAt: Date.now(),
          })
          results.saved++
        }
      } catch (error) {
        console.error('データ保存エラー:', error)
        results.errors++
      }
    }

    // スプレッドシート設定の最終同期時刻を更新
    await ctx.db.patch(args.sheetConfigId, {
      lastSyncAt: Date.now(),
      nextSyncAt: Date.now() + 24 * 60 * 60 * 1000, // 次回は24時間後
      updatedAt: Date.now(),
    })

    return results
  },
})

/**
 * インポート履歴を作成
 */
export const createImportHistory = mutation({
  args: {
    sheetConfigId: v.id('googleSheetConfigs'),
    importId: v.string(),
    status: v.string(),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    totalRows: v.number(),
    processedRows: v.number(),
    successRows: v.number(),
    errorRows: v.number(),
    errors: v.optional(v.array(v.object({
      row: v.number(),
      message: v.string(),
      data: v.optional(v.any()),
    }))),
  },
  handler: async (ctx, args) => {
    const historyId = await ctx.db.insert('googleSheetImports', {
      ...args,
      startedAt: Date.now(),
      completedAt: args.status === 'success' || args.status === 'failed'
        ? Date.now()
        : undefined,
      createdAt: Date.now(),
    })

    return { success: true, historyId }
  },
})

/**
 * インポート履歴を更新
 */
export const updateImportHistory = mutation({
  args: {
    historyId: v.id('googleSheetImports'),
    status: v.optional(v.string()),
    processedRows: v.optional(v.number()),
    successRows: v.optional(v.number()),
    errorRows: v.optional(v.number()),
    errors: v.optional(v.array(v.object({
      row: v.number(),
      message: v.string(),
      data: v.optional(v.any()),
    }))),
  },
  handler: async (ctx, args) => {
    const updates: any = { ...args }
    delete updates.historyId

    if (args.status === 'success' || args.status === 'failed') {
      updates.completedAt = Date.now()
    }

    await ctx.db.patch(args.historyId, updates)
    return { success: true }
  },
})

/**
 * インポート履歴一覧を取得
 */
export const listImportHistory = query({
  args: {
    sheetConfigId: v.optional(v.id('googleSheetConfigs')),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query('googleSheetImports')

    if (args.sheetConfigId) {
      query = query.filter(q => q.eq(q.field('sheetConfigId'), args.sheetConfigId))
    }

    query = query.order('desc')

    if (args.limit) {
      return await query.take(args.limit)
    }

    return await query.collect()
  },
})

// === データ取得 ===

/**
 * 統合パフォーマンスデータを取得
 */
export const getUnifiedPerformanceData = query({
  args: {
    agencyName: v.optional(v.string()),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query('unifiedAdPerformance')

    if (args.agencyName) {
      query = query.filter(q => q.eq(q.field('agencyName'), args.agencyName))
    }

    // 日付範囲フィルタ（インデックスを使用できないため、取得後にフィルタ）
    let data = await query.collect()

    if (args.startDate || args.endDate) {
      data = data.filter(item => {
        if (args.startDate && item.date < args.startDate) return false
        if (args.endDate && item.date > args.endDate) return false
        return true
      })
    }

    // 日付でソート
    data.sort((a, b) => a.date.localeCompare(b.date))

    // 制限を適用
    if (args.limit) {
      data = data.slice(0, args.limit)
    }

    return data
  },
})

/**
 * 代理店別サマリーを取得
 */
export const getAgencySummary = query({
  args: {
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const data = await ctx.db
      .query('unifiedAdPerformance')
      .collect()

    // 日付範囲でフィルタ
    const filteredData = data.filter(item => {
      if (args.startDate && item.date < args.startDate) return false
      if (args.endDate && item.date > args.endDate) return false
      return true
    })

    // 代理店ごとに集計
    const summaryMap = new Map<string, any>()

    filteredData.forEach(item => {
      const agency = item.agencyName
      if (!summaryMap.has(agency)) {
        summaryMap.set(agency, {
          agencyName: agency,
          impressions: 0,
          clicks: 0,
          cost: 0,
          conversions: 0,
          conversionValue: 0,
          dataCount: 0,
        })
      }

      const summary = summaryMap.get(agency)
      summary.impressions += item.impressions
      summary.clicks += item.clicks
      summary.cost += item.cost
      summary.conversions += item.conversions
      summary.conversionValue += item.conversionValue || 0
      summary.dataCount++
    })

    // 計算フィールドを追加
    const summaries = Array.from(summaryMap.values()).map(summary => ({
      ...summary,
      ctr: summary.impressions > 0 ? summary.clicks / summary.impressions : 0,
      cvr: summary.clicks > 0 ? summary.conversions / summary.clicks : 0,
      cpc: summary.clicks > 0 ? summary.cost / summary.clicks : 0,
      cpa: summary.conversions > 0 ? summary.cost / summary.conversions : 0,
      roas: summary.cost > 0 ? summary.conversionValue / summary.cost : 0,
    }))

    return summaries
  },
})