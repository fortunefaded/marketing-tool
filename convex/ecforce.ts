import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { Doc, Id } from './_generated/dataModel'

// ハッシュ生成用ヘルパー
function generateHash(dataDate: string, advertiser: string): string {
  return `${dataDate}_${advertiser.toLowerCase().replace(/\s+/g, '')}`
}

// パフォーマンスデータ保存（バッチ処理対応）
export const savePerformanceData = mutation({
  args: {
    importId: v.string(),
    data: v.array(
      v.object({
        advertiser: v.string(),
        advertiserNormalized: v.string(),
        dataDate: v.string(),
        date: v.optional(v.string()),
        orderAmount: v.number(),
        salesAmount: v.number(),
        cost: v.number(),
        accessCount: v.number(),
        cvOrder: v.number(),
        cvrOrder: v.number(),
        cvPayment: v.number(),
        cvrPayment: v.number(),
        cvThanksUpsell: v.number(),
        offerRateThanksUpsell: v.number(),
        paymentRate: v.optional(v.number()),
        realCPA: v.optional(v.number()),
        roas: v.optional(v.number()),
      })
    ),
    skipDuplicates: v.boolean(),
  },
  handler: async (ctx, args) => {
    const results = {
      success: 0,
      duplicates: 0,
      errors: 0,
      errorDetails: [] as Array<{ advertiser: string; message: string }>,
    }

    for (const record of args.data) {
      const hash = generateHash(record.dataDate, record.advertiser)

      try {
        // 重複チェック
        const existing = await ctx.db
          .query('ecforcePerformance')
          .withIndex('by_hash', (q) => q.eq('hash', hash))
          .first()

        if (existing) {
          if (args.skipDuplicates) {
            results.duplicates++
            continue
          } else {
            // 既存レコードを更新
            await ctx.db.patch(existing._id, {
              ...record,
              importId: args.importId,
              updatedAt: Date.now(),
            })
            results.success++
          }
        } else {
          // 新規レコード作成
          await ctx.db.insert('ecforcePerformance', {
            ...record,
            importId: args.importId,
            hash,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          })
          results.success++
        }
      } catch (error) {
        results.errors++
        results.errorDetails.push({
          advertiser: record.advertiser,
          message: error instanceof Error ? error.message : '不明なエラー',
        })
      }
    }

    return results
  },
})

// データ取得（ページネーション対応）
export const getPerformanceData = query({
  args: {
    dataDate: v.optional(v.string()),
    advertiser: v.optional(v.string()),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // 日付フィルタリング
    if (args.dataDate) {
      const dataDate = args.dataDate
      const query = ctx.db
        .query('ecforcePerformance')
        .withIndex('by_date', (q) => q.eq('dataDate', dataDate))

      const allData = await query.collect()
      const offset = args.offset || 0
      const limit = args.limit || 50

      return {
        data: allData.slice(offset, offset + limit),
        total: allData.length,
        hasMore: offset + limit < allData.length,
      }
    } else if (args.startDate && args.endDate) {
      // 範囲検索の場合は全件取得してフィルタリング
      const query = ctx.db.query('ecforcePerformance')
      const allData = await query.collect()
      const filtered = allData.filter(
        (item) => item.dataDate >= args.startDate! && item.dataDate <= args.endDate!
      )

      const offset = args.offset || 0
      const limit = args.limit || 50

      return {
        data: filtered.slice(offset, offset + limit),
        total: filtered.length,
        hasMore: offset + limit < filtered.length,
      }
    } else if (args.advertiser) {
      // 広告主フィルタリング
      const normalizedAdvertiser = args.advertiser.toLowerCase().replace(/\s+/g, '')
      const query = ctx.db
        .query('ecforcePerformance')
        .withIndex('by_advertiser', (q) => q.eq('advertiserNormalized', normalizedAdvertiser))

      const allData = await query.collect()
      const offset = args.offset || 0
      const limit = args.limit || 50

      return {
        data: allData.slice(offset, offset + limit),
        total: allData.length,
        hasMore: offset + limit < allData.length,
      }
    }

    // フィルターなしの場合
    const query = ctx.db.query('ecforcePerformance')
    const allData = await query.collect()
    const offset = args.offset || 0
    const limit = args.limit || 50

    return {
      data: allData.slice(offset, offset + limit),
      total: allData.length,
      hasMore: offset + limit < allData.length,
    }
  },
})

// インポート履歴取得
export const getImportHistory = query({
  args: {
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query('ecforceImports').withIndex('by_date').order('desc')

    if (args.status) {
      const allImports = await query.collect()
      const filtered = allImports.filter((imp) => imp.status === args.status)

      const offset = args.offset || 0
      const limit = args.limit || 20

      return {
        imports: filtered.slice(offset, offset + limit),
        total: filtered.length,
        hasMore: offset + limit < filtered.length,
      }
    }

    const allImports = await query.collect()
    const offset = args.offset || 0
    const limit = args.limit || 20

    return {
      imports: allImports.slice(offset, offset + limit),
      total: allImports.length,
      hasMore: offset + limit < allImports.length,
    }
  },
})

// インポートセッション開始
export const createImport = mutation({
  args: {
    fileName: v.optional(v.string()),
    fileSize: v.optional(v.number()),
    dataDate: v.string(),
    source: v.string(),
    totalRows: v.number(),
    filteredRows: v.number(),
  },
  handler: async (ctx, args) => {
    const importId = `import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    await ctx.db.insert('ecforceImports', {
      importId,
      fileName: args.fileName,
      fileSize: args.fileSize,
      dataDate: args.dataDate,
      source: args.source,
      status: 'processing',
      totalRows: args.totalRows,
      filteredRows: args.filteredRows,
      processedRows: 0,
      successRows: 0,
      errorRows: 0,
      duplicateRows: 0,
      startedAt: Date.now(),
    })

    return { importId }
  },
})

// インポート状態更新
export const updateImportStatus = mutation({
  args: {
    importId: v.string(),
    status: v.optional(v.string()),
    processedRows: v.optional(v.number()),
    successRows: v.optional(v.number()),
    errorRows: v.optional(v.number()),
    duplicateRows: v.optional(v.number()),
    errors: v.optional(
      v.array(
        v.object({
          row: v.number(),
          advertiser: v.optional(v.string()),
          message: v.string(),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    const importRecord = await ctx.db
      .query('ecforceImports')
      .filter((q) => q.eq(q.field('importId'), args.importId))
      .first()

    if (!importRecord) {
      throw new Error(`Import not found: ${args.importId}`)
    }

    const updates: any = {}

    if (args.status) updates.status = args.status
    if (args.processedRows !== undefined) updates.processedRows = args.processedRows
    if (args.successRows !== undefined) updates.successRows = args.successRows
    if (args.errorRows !== undefined) updates.errorRows = args.errorRows
    if (args.duplicateRows !== undefined) updates.duplicateRows = args.duplicateRows
    if (args.errors) updates.errors = args.errors

    // 完了時はcompletedAtを設定
    if (args.status === 'success' || args.status === 'failed' || args.status === 'partial') {
      updates.completedAt = Date.now()
    }

    await ctx.db.patch(importRecord._id, updates)

    return { success: true }
  },
})

// 重複チェック
export const checkDuplicates = query({
  args: {
    dateRange: v.object({
      startDate: v.string(),
      endDate: v.string(),
      uniqueDates: v.array(v.string()),
    }),
    advertisers: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const duplicates: string[] = []

    // 各広告主について、複数日付での重複をチェック
    for (const advertiser of args.advertisers) {
      let hasAnyDuplicate = false

      // 各日付での重複をチェック
      for (const date of args.dateRange.uniqueDates) {
        const hash = generateHash(date, advertiser)
        const existing = await ctx.db
          .query('ecforcePerformance')
          .withIndex('by_hash', (q) => q.eq('hash', hash))
          .first()
        if (existing) {
          hasAnyDuplicate = true
          break // 1つでも重複があれば十分
        }
      }

      if (hasAnyDuplicate) {
        duplicates.push(advertiser)
      }
    }

    return { duplicates, count: duplicates.length }
  },
})

// 統計情報取得
export const getStatistics = query({
  args: {},
  handler: async (ctx) => {
    const [totalRecords, lastImport, uniqueAdvertisers] = await Promise.all([
      // 総レコード数
      ctx.db
        .query('ecforcePerformance')
        .collect()
        .then((r) => r.length),

      // 最終インポート
      ctx.db.query('ecforceImports').withIndex('by_date').order('desc').first(),

      // ユニーク広告主数
      ctx.db
        .query('ecforcePerformance')
        .collect()
        .then((records) => {
          const advertisers = new Set(records.map((r) => r.advertiser))
          return advertisers.size
        }),
    ])

    // 日付範囲取得
    const allDates = await ctx.db
      .query('ecforcePerformance')
      .collect()
      .then((records) => records.map((r) => r.dataDate).sort())

    const earliestDate = allDates[0]
    const latestDate = allDates[allDates.length - 1]

    return {
      totalRecords,
      uniqueAdvertisers,
      earliestDate,
      latestDate,
      lastImportDate: lastImport?.dataDate,
      lastImportAt: lastImport?.completedAt || lastImport?.startedAt,
      lastImportStatus: lastImport?.status,
    }
  },
})

// 同期設定取得
export const getSyncConfig = query({
  args: {},
  handler: async (ctx) => {
    const config = await ctx.db.query('ecforceSyncConfig').first()

    if (!config) {
      // デフォルト設定を返す
      return {
        enabled: false,
        schedule: {
          frequency: 'daily',
          time: '06:00',
          timezone: 'Asia/Tokyo',
          lastRun: undefined,
          nextRun: undefined,
        },
      }
    }

    return config
  },
})

// 同期設定更新
export const updateSyncConfig = mutation({
  args: {
    enabled: v.boolean(),
    schedule: v.object({
      frequency: v.string(),
      time: v.string(),
      timezone: v.string(),
    }),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query('ecforceSyncConfig').first()

    if (existing) {
      await ctx.db.patch(existing._id, {
        enabled: args.enabled,
        schedule: {
          ...args.schedule,
          lastRun: existing.schedule.lastRun,
          nextRun: args.enabled ? calculateNextRun(args.schedule) : undefined,
        },
        updatedAt: Date.now(),
      })
    } else {
      await ctx.db.insert('ecforceSyncConfig', {
        enabled: args.enabled,
        schedule: {
          ...args.schedule,
          lastRun: undefined,
          nextRun: args.enabled ? calculateNextRun(args.schedule) : undefined,
        },
        updatedAt: Date.now(),
      })
    }

    return { success: true }
  },
})

// 次回実行時刻を計算
function calculateNextRun(schedule: { frequency: string; time: string; timezone: string }): number {
  const now = new Date()
  const [hours, minutes] = schedule.time.split(':').map(Number)

  const next = new Date()
  next.setHours(hours, minutes, 0, 0)

  // 今日の実行時刻を過ぎている場合
  if (next.getTime() <= now.getTime()) {
    switch (schedule.frequency) {
      case 'daily':
        next.setDate(next.getDate() + 1)
        break
      case 'weekly':
        next.setDate(next.getDate() + 7)
        break
      case 'monthly':
        next.setMonth(next.getMonth() + 1)
        break
    }
  }

  return next.getTime()
}

// パフォーマンスデータを日付ごとに取得
export const getPerformanceDataByDate = query({
  args: {
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    advertiser: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // 全データを取得してフィルタリング
    const allData = await ctx.db.query('ecforcePerformance').collect()

    let filteredData = allData

    // 日付範囲でフィルタ
    if (args.startDate || args.endDate) {
      filteredData = allData.filter((record) => {
        const recordDate = record.dataDate
        if (args.startDate && recordDate < args.startDate) return false
        if (args.endDate && recordDate > args.endDate) return false
        return true
      })
    }

    // 広告主でフィルタ
    if (args.advertiser) {
      filteredData = filteredData.filter((record) => record.advertiser === args.advertiser)
    }

    // 日付ごとにグループ化
    const groupedByDate = filteredData.reduce(
      (acc, record) => {
        const date = record.dataDate
        if (!acc[date]) {
          acc[date] = []
        }
        acc[date].push(record)
        return acc
      },
      {} as Record<string, typeof filteredData>
    )

    // 日付の降順でソート
    const uniqueDates = Object.keys(groupedByDate).sort().reverse()

    return {
      data: filteredData,
      groupedByDate,
      totalRecords: filteredData.length,
      uniqueDates,
    }
  },
})

// 広告主一覧を取得
export const getAdvertisers = query({
  handler: async (ctx) => {
    const data = await ctx.db.query('ecforcePerformance').collect()
    const advertisers = [...new Set(data.map((record) => record.advertiser))]
    return advertisers.sort()
  },
})

// データ修正用: CVRの異常値を修正
export const fixCvrValues = mutation({
  handler: async (ctx) => {
    const allRecords = await ctx.db.query('ecforcePerformance').collect()
    let fixedCount = 0

    for (const record of allRecords) {
      let needsUpdate = false
      const updates: any = {}

      // CVR（受注）が1以上の場合は100で割る
      if (record.cvrOrder > 1) {
        updates.cvrOrder = record.cvrOrder / 100
        needsUpdate = true
      }

      // CVR（決済）が1以上の場合は100で割る
      if (record.cvrPayment > 1) {
        updates.cvrPayment = record.cvrPayment / 100
        needsUpdate = true
      }

      // オファー成功率が1以上の場合は100で割る
      if (record.offerRateThanksUpsell > 1) {
        updates.offerRateThanksUpsell = record.offerRateThanksUpsell / 100
        needsUpdate = true
      }

      if (needsUpdate) {
        await ctx.db.patch(record._id, updates)
        fixedCount++
      }
    }

    return {
      message: `${fixedCount}件のレコードを修正しました`,
      totalRecords: allRecords.length,
      fixedRecords: fixedCount,
    }
  },
})
