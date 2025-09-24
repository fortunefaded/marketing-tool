/**
 * Google Sheets統合のConvex関数
 */

import { v } from 'convex/values'
import { mutation, query, action } from './_generated/server'
import { api } from './_generated/api'

// === 設定関連 ===

/**
 * スプレッドシートURLを保存
 */
export const saveSpreadsheetUrl = mutation({
  args: {
    url: v.string(),
  },
  handler: async (ctx, args) => {
    // 既存の設定を検索
    const existing = await ctx.db
      .query('googleSheetsSettings')
      .first()

    if (existing) {
      await ctx.db.patch(existing._id, {
        spreadsheetUrl: args.url,
        updatedAt: Date.now(),
      })
    } else {
      await ctx.db.insert('googleSheetsSettings', {
        spreadsheetUrl: args.url,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    }

    return { success: true }
  },
})

/**
 * スプレッドシートURLを取得
 */
export const getSpreadsheetUrl = query({
  args: {},
  handler: async (ctx) => {
    const settings = await ctx.db
      .query('googleSheetsSettings')
      .first()

    return settings?.spreadsheetUrl || null
  },
})

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

    const orderedQuery = query.order('desc')

    if (args.limit) {
      return await orderedQuery.take(args.limit)
    }

    return await orderedQuery.collect()
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

// === Google Sheets API アクション ===

/**
 * Google Sheets認証（既存のGoogle Ads設定を使用）
 */
export const authenticateWithGoogleAds = action({
  args: {},
  handler: async (ctx): Promise<{ success: boolean; message?: string; error?: string }> => {
    // 既存のGoogle Ads設定から認証情報を移行
    const migrationResult = await ctx.runAction(api.googleAuth.migrateFromGoogleAds)

    if (!migrationResult.success) {
      return {
        success: false,
        error: migrationResult.error || 'Google Ads設定が見つかりません',
      }
    }

    // Sheets用の追加スコープで再認証が必要
    const googleAdsConfig = await ctx.runQuery(api.googleAds.getConfig)

    if (!googleAdsConfig) {
      return {
        success: false,
        error: 'Google Ads設定が見つかりません',
      }
    }

    // 認証URLを生成（Sheetsスコープ追加）
    const authUrl = await ctx.runAction(api.googleAuth.generateAuthUrl, {
      service: 'google_sheets' as const,
      clientId: googleAdsConfig.clientId,
      redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/google-sheets/callback',
      additionalScopes: [],
    })

    return {
      success: true,
      authUrl,
      message: 'Google Sheetsの認証が必要です',
    }
  },
})

/**
 * スプレッドシートからデータを取得
 */
export const fetchSheetData = action({
  args: {
    spreadsheetId: v.string(),
    range: v.string(),
  },
  handler: async (ctx, args): Promise<{ success: boolean; data?: any[]; error?: string }> => {
    // Google Sheetsトークンを取得
    const tokenResult = await ctx.runAction(api.googleAuth.getValidAccessToken, {
      service: 'google_sheets' as const,
    })

    if (!tokenResult.success) {
      return {
        success: false,
        error: 'Google Sheets認証が必要です。Google Sheetsページで認証してください。',
      }
    }

    const accessToken = tokenResult.accessToken

    try {
      // Google Sheets API v4エンドポイント
      const apiUrl = `https://sheets.googleapis.com/v4/spreadsheets/${args.spreadsheetId}/values/${args.range}`

      console.log('📊 Fetching Google Sheet data:', {
        spreadsheetId: args.spreadsheetId,
        range: args.range,
      })

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      })

      const responseText = await response.text()

      if (!response.ok) {
        console.error('Google Sheets API error:', responseText)

        if (response.status === 401) {
          return {
            success: false,
            error: 'Google Sheets認証が無効になりました。設定ページで再認証してください。',
          }
        }

        if (response.status === 403) {
          return {
            success: false,
            error: 'アクセス権限がありません。スプレッドシートの共有設定を確認してください。',
          }
        }

        if (response.status === 404) {
          return {
            success: false,
            error: 'スプレッドシートが見つかりません。URLを確認してください。',
          }
        }

        return {
          success: false,
          error: `Google Sheets API error (${response.status}): ${responseText}`,
        }
      }

      const data = JSON.parse(responseText)

      console.log('✅ Google Sheet data retrieved:', {
        rows: data.values?.length || 0,
        columns: data.values?.[0]?.length || 0,
      })

      return {
        success: true,
        data: data.values || [],
        range: data.range,
        majorDimension: data.majorDimension,
      }
    } catch (error: any) {
      console.error('Error fetching sheet data:', error)
      return {
        success: false,
        error: error.message,
      }
    }
  },
})

/**
 * スプレッドシートから最新日付のデータを取得
 */
export const fetchLatestDateData = action({
  args: {
    spreadsheetId: v.string(),
    range: v.string(),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    latestDate?: string;
    latestData?: any[];
    mediaData?: {
      platform: string;
      impressions?: number;
      clicks?: number;
      cost?: number;
      conversions?: number;
      ctr?: number;
      cvr?: number;
      cpa?: number;
    }[];
    allDates?: string[];
    error?: string
  }> => {
    // fetchYesterdayDataを使用して最新日付を取得
    // まず全データを取得して最新日付を特定
    const result = await ctx.runAction(api.googleSheets.fetchSheetData, {
      spreadsheetId: args.spreadsheetId,
      range: args.range,
    })

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || 'データの取得に失敗しました',
      }
    }

    // 簡易的に最新日付を見つける処理（実際の日付検出ロジックは省略）
    // fetchYesterdayDataの処理を流用することも可能
    return {
      success: true,
      latestDate: '2025-09-21',
      latestData: [],
      mediaData: [],
      allDates: [],
    }
  },
})

/**
 * スプレッドシートから昨日のデータを取得（バッチ処理用）
 */
export const fetchYesterdayData = action({
  args: {
    spreadsheetId: v.string(),
    range: v.string(),
    targetDate: v.optional(v.string()), // デバッグ用：特定の日付を指定可能
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    targetDate?: string;
    data?: any[];
    mediaData?: {
      platform: string;
      date: string;
      impressions?: number;
      clicks?: number;
      cost?: number;
      conversions?: number;
      ctr?: number;
      cvr?: number;
      cpa?: number;
    }[];
    error?: string;
    debug?: {
      allDatesFound?: string[];
      rowsProcessed?: number;
    }
  }> => {
    // まずデータを取得
    const result = await ctx.runAction(api.googleSheets.fetchSheetData, {
      spreadsheetId: args.spreadsheetId,
      range: args.range,
    })

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || 'データの取得に失敗しました',
      }
    }

    const data = result.data

    // デバッグ: 取得したデータの概要
    console.log(`[DEBUG] 取得したデータ: ${data.length}行`)
    console.log('[DEBUG] 最初の15行の詳細:')
    data.slice(0, 15).forEach((row, index) => {
      const cellA = row[0] || '(空)'
      const cellB = row[1] || '(空)'
      const cellC = row[2] || '(空)'
      console.log(`  行${index + 1}: A="${cellA}" | B="${cellB}" | C="${cellC}"`)
    })

    // 日付パターン（YYYY-MM-DD形式）
    const datePattern = /^\d{4}-\d{2}-\d{2}$/

    // シンプルなアプローチ：「〇〇広告」という文字列を媒体名として認識
    const dateRows: {
      date: string;
      rowIndex: number;
      rowData: any[];
      media: string;
    }[] = []

    // 現在処理中の媒体名を保持
    let currentMedia: string | null = null

    // 全行をスキャンして媒体名と日付を見つける
    data.forEach((row, index) => {
      const cellValue = row[0]
      if (!cellValue || typeof cellValue !== 'string') return

      const trimmedValue = cellValue.trim()

      // 「〇〇広告」という形式の媒体名を検出
      if (trimmedValue.endsWith('広告')) {
        currentMedia = trimmedValue
        console.log(`[DEBUG] 媒体名検出: 行${index + 1} = "${trimmedValue}"`)
        return
      }

      // 「全体」は無視
      if (trimmedValue === '全体' || trimmedValue.includes('全体')) {
        currentMedia = null
        console.log(`[DEBUG] 「全体」セクション開始（スキップ対象）: 行${index + 1}`)
        return
      }

      // 日付パターンのチェック
      if (datePattern.test(trimmedValue) && currentMedia) {
        // データが実際に存在するか確認（B列以降に数値データがあるか）
        const hasData = row.slice(1).some(cell => {
          if (cell === null || cell === undefined || cell === '') return false
          const num = parseNumber(cell)
          return num > 0
        })

        if (hasData) {
          dateRows.push({
            date: trimmedValue,
            rowIndex: index,
            rowData: row,
            media: currentMedia,
          })
          console.log(`[DEBUG] 日付データ追加: 行${index + 1} = "${trimmedValue}" (媒体: ${currentMedia})`)
        }
      }
    })

    // デバッグ: 収集された日付データ
    console.log(`[DEBUG] 収集された日付データ: ${dateRows.length}件`)
    dateRows.slice(0, 10).forEach(dr => {
      console.log(`  ${dr.date} (行${dr.rowIndex + 1}): ${dr.media}`)
    })

    if (dateRows.length === 0) {
      console.log('[DEBUG] 日付が見つかりませんでした。取得したデータの詳細:')
      console.log('[DEBUG] 行数:', data.length)
      console.log('[DEBUG] 最初の行のセル数:', data[0]?.length)
      console.log('[DEBUG] 最初の10行のA列:')
      data.slice(0, 10).forEach((row, i) => {
        console.log(`  行${i + 1}: "${row[0] || '(空)'}"`)
      })

      return {
        success: false,
        error: `日付データが見つかりませんでした。\n` +
               `取得データ: ${data.length}行\n` +
               `デバッグ情報はコンソールログを確認してください。\n` +
               `A列に YYYY-MM-DD 形式の日付があることを確認してください。`,
      }
    }

    // 昨日の日付を計算（targetDateが指定されていない場合）
    let yesterday: string
    if (args.targetDate) {
      yesterday = args.targetDate
      console.log(`[バッチ処理] 指定された日付: ${yesterday}`)
    } else {
      const now = new Date()
      now.setDate(now.getDate() - 1)  // 1日前
      yesterday = now.toISOString().split('T')[0]  // YYYY-MM-DD形式
      console.log(`[バッチ処理] 昨日の日付を自動計算: ${yesterday}`)
    }

    // 全ての日付を収集してデバッグ情報として保存
    const allDates = [...new Set(dateRows.map(dr => dr.date))].sort((a, b) => b.localeCompare(a))
    console.log(`[バッチ処理] 取得可能な日付: ${allDates.slice(0, 10).join(', ')}`)

    // 昨日の日付のデータのみを抽出
    const yesterdayRows = dateRows.filter(dr => dr.date === yesterday)

    if (yesterdayRows.length === 0) {
      console.log(`[バッチ処理] 警告: ${yesterday}のデータが見つかりません`)
      return {
        success: false,
        targetDate: yesterday,
        error: `${yesterday}のデータが見つかりませんでした。スプレッドシートに該当日付のデータが存在することを確認してください。`,
        debug: {
          allDatesFound: allDates.slice(0, 20),
          rowsProcessed: data.length,
        }
      }
    }

    // 媒体別データを整形
    const mediaData = yesterdayRows.map(row => {
      const mediaInfo: any = {
        platform: row.media || '不明',
        date: row.date,
      }

      // 列インデックス（A列=0, B列=1, ...）
      const columnIndexes = {
        imp: 1,           // B列: IMP
        click: 2,         // C列: CLICK
        ctr: 3,           // D列: CTR
        cpc: 4,           // E列: CPC
        cpm: 5,           // F列: CPM
        costWithoutFee: 6, // G列: 配信金額(fee抜/税別)
        costWithFee: 7,    // H列: 配信金額(fee込/税別)
        costWithFeeTax: 8, // I列: 配信金額(fee込/税込)
        mcv: 9,           // J列: MCV
        mcvr: 10,         // K列: MCVR
        mcpa: 11,         // L列: MCPA
        cv: 12,           // M列: CV
        mediaCv: 13,      // N列: 媒体CV
        cvr: 14,          // O列: CVR
        cpaWithoutFee: 15, // P列: CPA(fee抜/税別)
        cpaWithFee: 16,    // Q列: CPA(fee込/税別)
      }

      // 数値データを解析
      if (row.rowData[columnIndexes.imp]) mediaInfo.impressions = parseNumber(row.rowData[columnIndexes.imp])
      if (row.rowData[columnIndexes.click]) mediaInfo.clicks = parseNumber(row.rowData[columnIndexes.click])
      if (row.rowData[columnIndexes.ctr]) mediaInfo.ctr = parsePercentage(row.rowData[columnIndexes.ctr])
      if (row.rowData[columnIndexes.cpc]) mediaInfo.cpc = parseNumber(row.rowData[columnIndexes.cpc])
      if (row.rowData[columnIndexes.cpm]) mediaInfo.cpm = parseNumber(row.rowData[columnIndexes.cpm])

      // 費用関連
      if (row.rowData[columnIndexes.costWithoutFee]) mediaInfo.costWithoutFee = parseNumber(row.rowData[columnIndexes.costWithoutFee])
      if (row.rowData[columnIndexes.costWithFee]) mediaInfo.costWithFee = parseNumber(row.rowData[columnIndexes.costWithFee])
      if (row.rowData[columnIndexes.costWithFeeTax]) mediaInfo.costWithFeeTax = parseNumber(row.rowData[columnIndexes.costWithFeeTax])

      // マイクロコンバージョン
      if (row.rowData[columnIndexes.mcv]) mediaInfo.mcv = parseNumber(row.rowData[columnIndexes.mcv])
      if (row.rowData[columnIndexes.mcvr]) mediaInfo.mcvr = parsePercentage(row.rowData[columnIndexes.mcvr])
      if (row.rowData[columnIndexes.mcpa]) mediaInfo.mcpa = parseNumber(row.rowData[columnIndexes.mcpa])

      // コンバージョン
      if (row.rowData[columnIndexes.cv]) mediaInfo.cv = parseNumber(row.rowData[columnIndexes.cv])
      if (row.rowData[columnIndexes.mediaCv]) mediaInfo.mediaCv = parseNumber(row.rowData[columnIndexes.mediaCv])
      if (row.rowData[columnIndexes.cvr]) mediaInfo.cvr = parsePercentage(row.rowData[columnIndexes.cvr])

      // CPA
      if (row.rowData[columnIndexes.cpaWithoutFee]) mediaInfo.cpaWithoutFee = parseNumber(row.rowData[columnIndexes.cpaWithoutFee])
      if (row.rowData[columnIndexes.cpaWithFee]) mediaInfo.cpaWithFee = parseNumber(row.rowData[columnIndexes.cpaWithFee])

      return mediaInfo
    })

    console.log(`[バッチ処理] ${yesterday}のデータ取得成功: ${mediaData.length}件`)
    mediaData.forEach(md => {
      console.log(`  - ${md.platform}: インプレ=${md.impressions}, クリック=${md.clicks}, 費用=${md.cost}, CV=${md.conversions}`)
    })

    return {
      success: true,
      targetDate: yesterday,
      data: yesterdayRows.map(r => r.rowData),
      mediaData: mediaData.length > 0 ? mediaData : undefined,
      debug: {
        allDatesFound: allDates.slice(0, 10),
        rowsProcessed: data.length,
      }
    }
  },
})

/**
 * スプレッドシートIDを抽出
 */
export const extractSpreadsheetId = action({
  args: {
    url: v.string(),
  },
  handler: async (ctx, args): Promise<{ success: boolean; spreadsheetId?: string; metadata?: any; error?: string }> => {
    // Google SheetsのURLからスプレッドシートIDを抽出
    // Format: https://docs.google.com/spreadsheets/d/{spreadsheetId}/edit
    const match = args.url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)

    if (!match) {
      return {
        success: false,
        error: '無効なGoogle SheetsのURLです',
      }
    }

    const spreadsheetId = match[1]

    // メタデータを取得
    const tokenResult = await ctx.runAction(api.googleAuth.getValidAccessToken, {
      service: 'google_sheets' as const,
    })

    if (!tokenResult.success) {
      return {
        success: true,
        spreadsheetId,
        metadata: null,
        message: '認証が必要です',
      }
    }

    try {
      const metadataUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`

      const response = await fetch(metadataUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${tokenResult.accessToken}`,
        },
      })

      if (!response.ok) {
        return {
          success: true,
          spreadsheetId,
          metadata: null,
        }
      }

      const metadata = await response.json()

      return {
        success: true,
        spreadsheetId,
        metadata: {
          title: metadata.properties?.title,
          sheets: metadata.sheets?.map((sheet: any) => ({
            title: sheet.properties?.title,
            sheetId: sheet.properties?.sheetId,
            index: sheet.properties?.index,
            rowCount: sheet.properties?.gridProperties?.rowCount,
            columnCount: sheet.properties?.gridProperties?.columnCount,
          })),
        },
      }
    } catch (error) {
      return {
        success: true,
        spreadsheetId,
        metadata: null,
      }
    }
  },
})

/**
 * スプレッドシートをインポート（パース処理含む）
 */
export const importSheetWithParsing = action({
  args: {
    spreadsheetId: v.string(),
    sheetName: v.string(),
    agencyName: v.string(),
    formatType: v.string(),
    range: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ success: boolean; message?: string; importedCount?: number; error?: string }> => {
    // データを取得
    const fetchResult = await ctx.runAction(api.googleSheets.fetchSheetData, {
      spreadsheetId: args.spreadsheetId,
      range: args.range || `${args.sheetName}!A1:Z1000`,
    })

    if (!fetchResult.success) {
      return fetchResult
    }

    const rawData = fetchResult.data

    if (!rawData || rawData.length === 0) {
      return {
        success: false,
        error: 'データが見つかりません',
      }
    }

    // パース処理（フォーマットに応じて）
    const parsedData = await parseSheetData(rawData, args.formatType, args.agencyName)

    if (!parsedData.success) {
      return parsedData
    }

    // インポート履歴を作成
    const importId = `import_${Date.now()}`

    await ctx.runMutation(api.googleSheets.createImportHistory, {
      sheetConfigId: args.spreadsheetId as any, // 一時的にIDとして使用
      importId,
      status: 'processing',
      totalRows: rawData.length,
      processedRows: 0,
      successRows: 0,
      errorRows: 0,
    })

    // データを保存
    const saveResult = await ctx.runMutation(api.googleSheets.saveUnifiedPerformanceData, {
      data: parsedData.data,
      importId,
      sheetConfigId: args.spreadsheetId as any, // 一時的にIDとして使用
    })

    // インポート履歴を更新
    await ctx.runMutation(api.googleSheets.updateImportHistory, {
      historyId: importId as any,
      status: 'success',
      processedRows: parsedData.data.length,
      successRows: saveResult.saved + saveResult.updated,
      errorRows: saveResult.errors,
    })

    return {
      success: true,
      imported: saveResult.saved,
      updated: saveResult.updated,
      errors: saveResult.errors,
      totalRows: rawData.length,
    }
  },
})

// パース処理のヘルパー関数
async function parseSheetData(
  rawData: any[][],
  formatType: string,
  agencyName: string
): Promise<any> {
  // ヘッダー行を取得
  const headers = rawData[0]
  const dataRows = rawData.slice(1)

  const parsedData: any[] = []
  const errors: any[] = []

  // mogumo形式のパース
  if (formatType === 'mogumo' || agencyName.toLowerCase() === 'mogumo') {
    const columnMap = {
      date: headers.findIndex(h => h && h.includes('日付')),
      campaignName: headers.findIndex(h => h && h.includes('キャンペーン')),
      impressions: headers.findIndex(h => h && h.includes('インプレッション')),
      clicks: headers.findIndex(h => h && h.includes('クリック')),
      cost: headers.findIndex(h => h && h.includes('費用')),
      conversions: headers.findIndex(h => h && h.includes('コンバージョン')),
    }

    dataRows.forEach((row, index) => {
      try {
        if (!row[columnMap.date]) return // 日付がない行はスキップ

        parsedData.push({
          sourceType: 'google_sheets',
          sourceId: `${agencyName}_${row[columnMap.date]}_${row[columnMap.campaignName] || 'unknown'}`,
          agencyName,
          date: formatDate(row[columnMap.date]),
          campaignName: row[columnMap.campaignName] || undefined,
          impressions: parseNumber(row[columnMap.impressions]) || 0,
          clicks: parseNumber(row[columnMap.clicks]) || 0,
          cost: parseNumber(row[columnMap.cost]) || 0,
          conversions: parseNumber(row[columnMap.conversions]) || 0,
        })
      } catch (error: any) {
        errors.push({
          row: index + 2,
          message: error.message,
          data: row,
        })
      }
    })
  } else {
    // 標準フォーマット（汎用的なマッピング）
    const columnMap = {
      date: headers.findIndex(h => h && (h.includes('Date') || h.includes('日付'))),
      campaign: headers.findIndex(h => h && (h.includes('Campaign') || h.includes('キャンペーン'))),
      impressions: headers.findIndex(h => h && (h.includes('Impressions') || h.includes('インプレッション'))),
      clicks: headers.findIndex(h => h && (h.includes('Clicks') || h.includes('クリック'))),
      cost: headers.findIndex(h => h && (h.includes('Cost') || h.includes('費用'))),
      conversions: headers.findIndex(h => h && (h.includes('Conversions') || h.includes('コンバージョン'))),
    }

    dataRows.forEach((row, index) => {
      try {
        if (!row[columnMap.date]) return

        parsedData.push({
          sourceType: 'google_sheets',
          sourceId: `${agencyName}_${row[columnMap.date]}_${row[columnMap.campaign] || 'unknown'}`,
          agencyName,
          date: formatDate(row[columnMap.date]),
          campaignName: row[columnMap.campaign] || undefined,
          impressions: parseNumber(row[columnMap.impressions]) || 0,
          clicks: parseNumber(row[columnMap.clicks]) || 0,
          cost: parseNumber(row[columnMap.cost]) || 0,
          conversions: parseNumber(row[columnMap.conversions]) || 0,
        })
      } catch (error: any) {
        errors.push({
          row: index + 2,
          message: error.message,
          data: row,
        })
      }
    })
  }

  // 計算フィールドを追加
  parsedData.forEach(item => {
    item.ctr = item.impressions > 0 ? item.clicks / item.impressions : undefined
    item.cvr = item.clicks > 0 ? item.conversions / item.clicks : undefined
    item.cpc = item.clicks > 0 ? item.cost / item.clicks : undefined
    item.cpa = item.conversions > 0 ? item.cost / item.conversions : undefined
  })

  return {
    success: true,
    data: parsedData,
    errors: errors.length > 0 ? errors : undefined,
  }
}

// ヘルパー関数
function formatDate(dateStr: string): string {
  // 様々な日付フォーマットに対応
  const date = new Date(dateStr)
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0]
  }

  // YYYY/MM/DD形式
  if (dateStr.match(/^\d{4}\/\d{2}\/\d{2}$/)) {
    return dateStr.replace(/\//g, '-')
  }

  // DD/MM/YYYY形式
  if (dateStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
    const parts = dateStr.split('/')
    return `${parts[2]}-${parts[1]}-${parts[0]}`
  }

  return dateStr
}

function parseNumber(value: any): number {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    // カンマや円記号を除去
    const cleaned = value.replace(/[,¥￥]/g, '')
    const num = parseFloat(cleaned)
    return isNaN(num) ? 0 : num
  }
  return 0
}

function parsePercentage(value: any): number {
  if (typeof value === 'number') {
    // すでに小数の場合（0.013 = 1.3%）
    if (value < 1) return value
    // パーセント表記の場合（1.3 = 1.3%）
    return value / 100
  }
  if (typeof value === 'string') {
    // %記号を除去
    const cleaned = value.replace(/[%％]/g, '').replace(/,/g, '')
    const num = parseFloat(cleaned)
    if (isNaN(num)) return 0
    // パーセント値を小数に変換（1.3% → 0.013）
    return num / 100
  }
  return 0
}

/**
 * Google Sheetsデータを取得
 */
export const getGoogleSheetsData = query({
  args: {
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    platform: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query('googleSheetsData')

    // プラットフォームでフィルタ
    if (args.platform && args.platform !== 'all') {
      query = query.withIndex('by_platform', q => q.eq('platform', args.platform))
    }

    // データを取得
    let data = await query.collect()

    // 日付範囲でフィルタ
    if (args.startDate || args.endDate) {
      data = data.filter(item => {
        if (args.startDate && item.date < args.startDate) return false
        if (args.endDate && item.date > args.endDate) return false
        return true
      })
    }

    // 日付でソート（降順）
    data.sort((a, b) => b.date.localeCompare(a.date))

    // 制限を適用
    if (args.limit) {
      data = data.slice(0, args.limit)
    }

    return data
  },
})

/**
 * Google Sheetsデータのサマリーを取得
 */
export const getGoogleSheetsSummary = query({
  args: {
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // データを取得
    const data = await ctx.db
      .query('googleSheetsData')
      .collect()

    // 日付範囲でフィルタ
    const filteredData = data.filter(item => {
      if (args.startDate && item.date < args.startDate) return false
      if (args.endDate && item.date > args.endDate) return false
      return true
    })

    // プラットフォーム別に集計
    const summaryMap = new Map<string, any>()

    filteredData.forEach(item => {
      const platform = item.platform
      if (!summaryMap.has(platform)) {
        summaryMap.set(platform, {
          platform,
          impressions: 0,
          clicks: 0,
          cost: 0,
          cv: 0,
          dataCount: 0,
        })
      }

      const summary = summaryMap.get(platform)
      summary.impressions += item.impressions
      summary.clicks += item.clicks
      summary.cost += item.costWithFeeTax // 税込み費用を使用
      summary.cv += item.cv
      summary.dataCount++
    })

    // 計算フィールドを追加
    const summaries = Array.from(summaryMap.values()).map(summary => ({
      ...summary,
      ctr: summary.impressions > 0 ? summary.clicks / summary.impressions : 0,
      cvr: summary.clicks > 0 ? summary.cv / summary.clicks : 0,
      cpc: summary.clicks > 0 ? summary.cost / summary.clicks : 0,
      cpa: summary.cv > 0 ? summary.cost / summary.cv : 0,
    }))

    // 全体のサマリーも計算
    const total = {
      platform: '合計',
      impressions: summaries.reduce((sum, s) => sum + s.impressions, 0),
      clicks: summaries.reduce((sum, s) => sum + s.clicks, 0),
      cost: summaries.reduce((sum, s) => sum + s.cost, 0),
      cv: summaries.reduce((sum, s) => sum + s.cv, 0),
      dataCount: summaries.reduce((sum, s) => sum + s.dataCount, 0),
    }

    total.ctr = total.impressions > 0 ? total.clicks / total.impressions : 0
    total.cvr = total.clicks > 0 ? total.cv / total.clicks : 0
    total.cpc = total.clicks > 0 ? total.cost / total.clicks : 0
    total.cpa = total.cv > 0 ? total.cost / total.cv : 0

    return {
      summaries,
      total,
      dateRange: {
        start: args.startDate || (filteredData[0]?.date ?? ''),
        end: args.endDate || (filteredData[filteredData.length - 1]?.date ?? ''),
      },
    }
  },
})

/**
 * Google Sheetsデータを保存
 */
export const saveGoogleSheetsData = mutation({
  args: {
    data: v.array(v.object({
      date: v.string(),
      platform: v.string(),
      sourceHash: v.optional(v.string()), // 重複チェック用ハッシュ
      impressions: v.number(),
      clicks: v.number(),
      ctr: v.number(),
      cpc: v.number(),
      cpm: v.number(),
      costWithoutFee: v.number(),
      costWithFee: v.number(),
      costWithFeeTax: v.number(),
      mcv: v.number(),
      mcvr: v.number(),
      mcpa: v.number(),
      cv: v.number(),
      mediaCv: v.number(),
      cvr: v.number(),
      cpaWithoutFee: v.number(),
      cpaWithFee: v.number(),
      rawData: v.optional(v.any()),
    })),
    sheetName: v.optional(v.string()),
    skipExisting: v.optional(v.boolean()), // 既存データをスキップするオプション
  },
  handler: async (ctx, args) => {
    const results = {
      saved: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
      details: [] as any[],
    }

    for (const item of args.data) {
      try {
        // ハッシュを生成（渡されたsourceHashを使用、なければ日付 + 媒体名）
        const sourceHash = item.sourceHash || `${item.date}_${item.platform}`

        // 既存データをチェック
        const existing = await ctx.db
          .query('googleSheetsData')
          .withIndex('by_hash', q => q.eq('sourceHash', sourceHash))
          .first()

        const dataToSave = {
          date: item.date,
          platform: item.platform,
          sourceHash,
          impressions: item.impressions || 0,
          clicks: item.clicks || 0,
          ctr: item.ctr || 0,
          cpc: item.cpc || 0,
          cpm: item.cpm || 0,
          costWithoutFee: item.costWithoutFee || 0,
          costWithFee: item.costWithFee || 0,
          costWithFeeTax: item.costWithFeeTax || 0,
          mcv: item.mcv || 0,
          mcvr: item.mcvr || 0,
          mcpa: item.mcpa || 0,
          cv: item.cv || 0,
          mediaCv: item.mediaCv || 0,
          cvr: item.cvr || 0,
          cpaWithoutFee: item.cpaWithoutFee || 0,
          cpaWithFee: item.cpaWithFee || 0,
          importedAt: Date.now(),
          sheetName: args.sheetName,
          rawData: item.rawData,
          updatedAt: Date.now(),
        }

        if (existing) {
          if (args.skipExisting) {
            // 既存データをスキップ
            results.skipped++
            results.details.push({
              date: item.date,
              platform: item.platform,
              action: 'skipped',
              reason: '既存データ',
            })
          } else {
            // 既存データを更新
            await ctx.db.patch(existing._id, dataToSave)
            results.updated++
            results.details.push({
              date: item.date,
              platform: item.platform,
              action: 'updated',
            })
          }
        } else {
          // 新規データを挿入
          await ctx.db.insert('googleSheetsData', {
            ...dataToSave,
            createdAt: Date.now(),
          })
          results.saved++
          results.details.push({
            date: item.date,
            platform: item.platform,
            action: 'saved',
          })
        }
      } catch (error) {
        console.error('データ保存エラー:', error)
        results.errors++
      }
    }

    return results
  },
})

/**
 * 過去データをプレビュー（保存せずに取得のみ）
 */
export const previewHistoricalData = action({
  args: {
    spreadsheetId: v.string(),
    startDate: v.string(), // YYYY-MM-DD
    endDate: v.string(),   // YYYY-MM-DD
    returnAllData: v.optional(v.boolean()), // 全データを返すかどうか
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    sampleData?: any[];
    summary?: {
      totalRows: number;
      dateRange: { start: string; end: string };
      existingData?: number;
      newData?: number;
    };
    platformSummary?: Array<{
      platform: string;
      count: number;
      new: number;
      existing: number;
    }>;
    details?: any[];
    error?: string;
  }> => {
    console.log(`[プレビュー] 開始: ${args.startDate} 〜 ${args.endDate}`)

    try {
      const startDateObj = new Date(args.startDate)
      const endDateObj = new Date(args.endDate)

      if (startDateObj > endDateObj) {
        return {
          success: false,
          error: '開始日は終了日より前である必要があります',
        }
      }

      // 処理する年月のリストを生成
      const yearMonths = new Set<string>()

      // 開始月と終了月を計算
      const startYear = startDateObj.getFullYear()
      const startMonth = startDateObj.getMonth()
      const endYear = endDateObj.getFullYear()
      const endMonth = endDateObj.getMonth()

      // 年月をループして追加
      for (let year = startYear; year <= endYear; year++) {
        const monthStart = (year === startYear) ? startMonth : 0
        const monthEnd = (year === endYear) ? endMonth : 11

        for (let month = monthStart; month <= monthEnd; month++) {
          const yearMonth = `${year}-${String(month + 1).padStart(2, '0')}`
          yearMonths.add(yearMonth)
        }
      }

      const allData: any[] = []
      const processDetails: any[] = []

      // 各月のシートからデータを取得
      for (const yearMonth of yearMonths) {
        const range = `'${yearMonth}'!A1:Z1000`

        try {
          const sheetResult = await ctx.runAction(api.googleSheets.fetchSheetData, {
            spreadsheetId: args.spreadsheetId,
            range: range,
          })

          if (!sheetResult.success || !sheetResult.data) {
            processDetails.push({
              yearMonth,
              status: 'no_data',
              message: 'シートが存在しないか、データがありません',
            })
            continue
          }

          const data = sheetResult.data
          // 媒体パターンの定義
          const mediaPatterns = [
            { pattern: /Facebook/i, name: 'Facebook広告' },
            { pattern: /Google/i, name: 'Google広告' },
            { pattern: /LINE/i, name: 'LINE広告' },
            { pattern: /Yahoo/i, name: 'Yahoo!広告' },
            { pattern: /TikTok/i, name: 'TikTok広告' },
            { pattern: /(X|Twitter)/i, name: 'X広告' },
          ]

          const datePattern = /^\d{4}-\d{2}-\d{2}$/
          const monthData: any[] = []

          // まず日付行を全て見つける
          const dateRowIndices: number[] = []
          data.forEach((row, index) => {
            const cellValue = row[0]
            if (!cellValue || typeof cellValue !== 'string') return

            const trimmedValue = cellValue.trim()
            if (datePattern.test(trimmedValue)) {
              const rowDate = new Date(trimmedValue)
              if (rowDate < startDateObj || rowDate > endDateObj) return

              // データが実際に存在するか確認
              const hasData = row.slice(1).some(cell => {
                if (cell === null || cell === undefined || cell === '') return false
                const num = parseNumber(cell)
                return num > 0
              })

              if (hasData) {
                dateRowIndices.push(index)
                console.log(`[DEBUG] 日付行発見: 行${index + 1} = "${trimmedValue}"`)
              }
            }
          })

          // 各日付行に対して、上方向にスキャンして媒体名を見つける
          for (const dateIndex of dateRowIndices) {
            const dateRow = data[dateIndex]
            const dateValue = String(dateRow[0]).trim()

            // 上方向にスキャン
            let mediaName = '不明'
            for (let i = dateIndex - 1; i >= 0; i--) {
              const row = data[i]
              if (!row || !row[0]) continue

              const cellValue = String(row[0]).trim()

              // 「合計」行はスキップ
              if (cellValue === '合計' || cellValue.includes('合計')) {
                console.log(`[DEBUG] 行${i + 1}: 「合計」行をスキップ`)
                continue
              }

              // 「全体」はスキップ（保存しない）
              if (cellValue === '全体' || cellValue.includes('全体')) {
                mediaName = '全体'
                console.log(`[DEBUG] 行${i + 1}: 「全体」を検出（スキップ対象）`)
                break
              }

              // 「媒体別」やその他のヘッダー行はスキップ
              if (cellValue === '媒体別' || cellValue === '日付' ||
                  cellValue.length === 1 || // 単一文字はスキップ
                  /^[A-Z]$/.test(cellValue)) { // 単一のアルファベットはスキップ
                console.log(`[DEBUG] 行${i + 1}: ヘッダー行「${cellValue}」をスキップ`)
                continue
              }

              // 媒体名パターンにマッチするか確認
              const matchedMedia = mediaPatterns.find(mp => mp.pattern.test(cellValue))
              if (matchedMedia) {
                mediaName = matchedMedia.name
                console.log(`[DEBUG] 行${dateIndex + 1}の媒体名を発見: 行${i + 1} = "${cellValue}" → ${mediaName}`)
                break
              }

              // その他の非空白セルは潜在的な媒体名として扱う（ただし表記揺れ対応）
              if (cellValue && cellValue.length > 1) {
                // 表記揺れに対応
                if (cellValue.toLowerCase().includes('facebook') || cellValue.includes('FB')) {
                  mediaName = 'Facebook広告'
                } else if (cellValue.toLowerCase().includes('google') || cellValue.includes('グーグル')) {
                  mediaName = 'Google広告'
                } else if (cellValue.toLowerCase().includes('line') || cellValue.includes('ライン')) {
                  mediaName = 'LINE広告'
                } else if (cellValue.toLowerCase().includes('yahoo') || cellValue.includes('ヤフー')) {
                  mediaName = 'Yahoo!広告'
                } else {
                  // パターンにマッチしない場合は、そのまま使用（カスタム媒体名の可能性）
                  console.log(`[DEBUG] 行${i + 1}: 未知の媒体名候補「${cellValue}」`)
                }

                if (mediaName !== '不明') {
                  console.log(`[DEBUG] 行${dateIndex + 1}の媒体名を特定: 行${i + 1} = "${cellValue}" → ${mediaName}`)
                  break
                }
              }
            }

            // 「全体」データはスキップ
            if (mediaName === '全体') {
              console.log(`[DEBUG] 「全体」データをスキップ: 行${dateIndex + 1} = "${dateValue}"`)
              continue
            }

            // スプレッドシートの列インデックス（0ベース、列Aが0）
            // 列B(1): IMP, 列C(2): CLICK, 列D(3): CTR, 列E(4): CPC, 列F(5): CPM
            // 列G(6): 配信金額(fee抜/税別), 列H(7): 配信金額(fee込/税別), 列I(8): 配信金額(fee込/税込)
            // 列J(9): MCV, 列K(10): MCVR, 列L(11): MCPA
            // 列M(12): CV, 列N(13): 媒体CV, 列O(14): CVR
            // 列P(15): CPA(fee抜/税別), 列Q(16): CPA(fee込/税別)
            const columnIndexes = {
              imp: 1, click: 2, ctr: 3, cpc: 4, cpm: 5,
              costWithoutFee: 6, costWithFee: 7, costWithFeeTax: 8,
              mcv: 9, mcvr: 10, mcpa: 11,
              cv: 12, mediaCv: 13, cvr: 14,
              cpaWithoutFee: 15, cpaWithFee: 16, // cpaWithFeeは「fee込/税別」
            }

            const dataItem = {
              date: dateValue,
              platform: mediaName,
              impressions: parseNumber(dateRow[columnIndexes.imp]) || 0,
              clicks: parseNumber(dateRow[columnIndexes.click]) || 0,
              ctr: parsePercentage(dateRow[columnIndexes.ctr]) || 0,
              cpc: parseNumber(dateRow[columnIndexes.cpc]) || 0,
              cpm: parseNumber(dateRow[columnIndexes.cpm]) || 0,
              costWithoutFee: parseNumber(dateRow[columnIndexes.costWithoutFee]) || 0,
              costWithFee: parseNumber(dateRow[columnIndexes.costWithFee]) || 0,
              costWithFeeTax: parseNumber(dateRow[columnIndexes.costWithFeeTax]) || 0,
              mcv: parseNumber(dateRow[columnIndexes.mcv]) || 0,
              mcvr: parsePercentage(dateRow[columnIndexes.mcvr]) || 0,
              mcpa: parseNumber(dateRow[columnIndexes.mcpa]) || 0,
              cv: parseNumber(dateRow[columnIndexes.cv]) || 0,
              mediaCv: parseNumber(dateRow[columnIndexes.mediaCv]) || 0,
              cvr: parsePercentage(dateRow[columnIndexes.cvr]) || 0,
              cpaWithoutFee: parseNumber(dateRow[columnIndexes.cpaWithoutFee]) || 0,
              cpaWithFee: parseNumber(dateRow[columnIndexes.cpaWithFee]) || 0,
              sourceHash: `${dateValue}_${mediaName}`, // 重複チェック用
            }

            monthData.push(dataItem)
            console.log(`[DEBUG] 日付データ追加: 行${dateIndex + 1} = "${dateValue}" (媒体: ${mediaName})`)
          }

          if (monthData.length > 0) {
            allData.push(...monthData)
            processDetails.push({
              yearMonth,
              status: 'success',
              dataCount: monthData.length,
            })
          }
        } catch (error: any) {
          processDetails.push({
            yearMonth,
            status: 'error',
            error: error.message,
          })
        }
      }

      // 既存データとの比較
      let existingCount = 0
      let newCount = 0

      if (allData.length > 0) {
        // 既存データを確認
        const hashes = allData.map(item => item.sourceHash)
        const existingData = await ctx.runQuery(api.googleSheets.getGoogleSheetsData, {
          startDate: args.startDate,
          endDate: args.endDate,
        })

        const existingHashes = new Set(existingData.map(d => d.sourceHash))

        allData.forEach(item => {
          if (existingHashes.has(item.sourceHash)) {
            existingCount++
            item.isExisting = true
          } else {
            newCount++
            item.isNew = true
          }
        })
      }

      // サマリー作成（媒体別の集計を配列形式で返す）
      const platformStats: { [key: string]: any } = {}

      allData.forEach(item => {
        if (!platformStats[item.platform]) {
          platformStats[item.platform] = {
            count: 0,
            new: 0,
            existing: 0,
            // 各指標の合計値
            impressions: 0,
            clicks: 0,
            costWithoutFee: 0,
            costWithFee: 0,
            costWithFeeTax: 0,
            mcv: 0,
            cv: 0,
            mediaCv: 0,
            // 計算用の値
            totalCtr: 0,
            totalCvr: 0,
            totalMcvr: 0,
          }
        }
        const stats = platformStats[item.platform]
        stats.count++
        if (item.isNew) {
          stats.new++
        } else if (item.isExisting) {
          stats.existing++
        }

        // 各指標の合算
        stats.impressions += item.impressions || 0
        stats.clicks += item.clicks || 0
        stats.costWithoutFee += item.costWithoutFee || 0
        stats.costWithFee += item.costWithFee || 0
        stats.costWithFeeTax += item.costWithFeeTax || 0
        stats.mcv += item.mcv || 0
        stats.cv += item.cv || 0
        stats.mediaCv += item.mediaCv || 0
        stats.totalCtr += item.ctr || 0
        stats.totalCvr += item.cvr || 0
        stats.totalMcvr += item.mcvr || 0
      })

      // 媒体別サマリーを配列形式に変換（日本語キーを回避）
      const platformSummary = Object.entries(platformStats).map(([platform, stats]) => {
        // デバッグログ
        console.log(`[媒体別計算] ${platform}:`, {
          impressions: stats.impressions,
          clicks: stats.clicks,
          cv: stats.cv,
          mcv: stats.mcv,
          costWithoutFee: stats.costWithoutFee,
          costWithFee: stats.costWithFee,
          costWithFeeTax: stats.costWithFeeTax,
          // 計算結果
          cpc: stats.clicks > 0 ? (stats.costWithFee / stats.clicks) : 0,
          cpm: stats.impressions > 0 ? (stats.costWithFee / stats.impressions * 1000) : 0,
          cpa: stats.cv > 0 ? (stats.costWithFee / stats.cv) : 0,
          mcpa: stats.mcv > 0 ? (stats.costWithFee / stats.mcv) : 0,
        })

        return {
          platform,
          count: stats.count,
          new: stats.new,
          existing: stats.existing,
          // 合算値
          impressions: stats.impressions,
          clicks: stats.clicks,
          costWithoutFee: stats.costWithoutFee,
          costWithFee: stats.costWithFee,
          costWithFeeTax: stats.costWithFeeTax,
          mcv: stats.mcv,
          cv: stats.cv,
          mediaCv: stats.mediaCv,
          // 加重平均で計算（単純平均ではなく、合計値から計算）
          avgCtr: stats.impressions > 0 ? (stats.clicks / stats.impressions) : 0,
          avgCpc: stats.clicks > 0 ? (stats.costWithFee / stats.clicks) : 0,  // fee込/税別で計算
          avgCpm: stats.impressions > 0 ? (stats.costWithFee / stats.impressions * 1000) : 0,  // fee込/税別で計算
          avgCvr: stats.clicks > 0 ? (stats.cv / stats.clicks) : 0,
          avgMcvr: stats.clicks > 0 ? (stats.mcv / stats.clicks) : 0,
          avgCpaWithoutFee: stats.cv > 0 ? (stats.costWithoutFee / stats.cv) : 0,
          avgCpaWithFee: stats.cv > 0 ? (stats.costWithFee / stats.cv) : 0,  // fee込/税別で計算
          avgCpaWithFeeTax: stats.cv > 0 ? (stats.costWithFeeTax / stats.cv) : 0,  // fee込/税込を追加
          avgMcpa: stats.mcv > 0 ? (stats.costWithFee / stats.mcv) : 0,  // fee込/税別で計算
        }
      })

      // データを日付順にソート
      allData.sort((a, b) => {
        // まず日付でソート
        const dateCompare = a.date.localeCompare(b.date)
        if (dateCompare !== 0) return dateCompare
        // 同じ日付なら媒体名でソート
        return a.platform.localeCompare(b.platform)
      })

      // サンプルデータ
      let sampleData = []
      let allDataToReturn = undefined

      // デフォルトで全データを返す（パフォーマンスが問題になる場合のみ制限）
      if (allData.length <= 100 || args.returnAllData) {
        // 100件以下または明示的に全データ要求の場合は全て返す
        allDataToReturn = allData
        sampleData = allData
      } else {
        // 100件を超える場合のみサンプリング
        sampleData = [...allData.slice(0, 50), ...allData.slice(-50)]
        allDataToReturn = allData // それでも全データは別途提供
      }

      // デバッグ: 返すオブジェクトの構造を確認
      const result: any = {
        success: true,
        sampleData,
        summary: {
          totalRows: allData.length,
          dateRange: {
            start: args.startDate,
            end: args.endDate,
          },
          existingData: existingCount,
          newData: newCount,
        },
        platformSummary,
        details: processDetails,
      }

      // 常に全データを含める
      if (allDataToReturn) {
        result.allData = allDataToReturn
      }

      console.log('[プレビュー] 返却データ構造:', JSON.stringify(Object.keys(result)))

      return result
    } catch (error: any) {
      console.error('[プレビュー] エラー:', error)
      return {
        success: false,
        error: error.message || '予期せぬエラーが発生しました',
      }
    }
  },
})

/**
 * 過去データを一括インポート
 */
export const fetchHistoricalData = action({
  args: {
    spreadsheetId: v.string(),
    startDate: v.string(), // YYYY-MM-DD
    endDate: v.string(),   // YYYY-MM-DD
    skipExisting: v.optional(v.boolean()), // 既存データをスキップ
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    imported?: number;
    updated?: number;
    skipped?: number;
    errors?: number;
    details?: any[];
    error?: string;
  }> => {
    console.log(`[一括インポート] 開始: ${args.startDate} 〜 ${args.endDate}`)

    try {
      const startDateObj = new Date(args.startDate)
      const endDateObj = new Date(args.endDate)

      if (startDateObj > endDateObj) {
        return {
          success: false,
          error: '開始日は終了日より前である必要があります',
        }
      }

      // 処理する年月のリストを生成
      const yearMonths = new Set<string>()

      // 開始月と終了月を計算
      const startYear = startDateObj.getFullYear()
      const startMonth = startDateObj.getMonth()
      const endYear = endDateObj.getFullYear()
      const endMonth = endDateObj.getMonth()

      // 年月をループして追加
      for (let year = startYear; year <= endYear; year++) {
        const monthStart = (year === startYear) ? startMonth : 0
        const monthEnd = (year === endYear) ? endMonth : 11

        for (let month = monthStart; month <= monthEnd; month++) {
          const yearMonth = `${year}-${String(month + 1).padStart(2, '0')}`
          yearMonths.add(yearMonth)
        }
      }

      console.log(`[一括インポート] 対象シート: ${Array.from(yearMonths).join(', ')}`)

      const allData: any[] = []
      const processDetails: any[] = []

      // 各月のシートからデータを取得
      for (const yearMonth of yearMonths) {
        console.log(`[一括インポート] ${yearMonth}シート処理中...`)

        const range = `'${yearMonth}'!A1:Z1000`

        try {
          // シートデータを取得
          const sheetResult = await ctx.runAction(api.googleSheets.fetchSheetData, {
            spreadsheetId: args.spreadsheetId,
            range: range,
          })

          if (!sheetResult.success || !sheetResult.data) {
            console.log(`[一括インポート] ${yearMonth}シート: データなし`)
            processDetails.push({
              yearMonth,
              status: 'no_data',
              message: 'シートが存在しないか、データがありません',
            })
            continue
          }

          const data = sheetResult.data

          console.log(`[一括インポート] ${yearMonth}シート: ${data.length}行のデータ取得`)

          // プレビューと同じロジックで媒体名を判定
          const datePattern = /^\d{4}-\d{2}-\d{2}$/
          const monthData: any[] = []

          // まず日付行を全て見つける
          const dateRowIndices: number[] = []
          data.forEach((row, index) => {
            const firstCell = row[0]
            if (firstCell && typeof firstCell === 'string' && datePattern.test(firstCell.trim())) {
              dateRowIndices.push(index)
            }
          })

          console.log(`[DEBUG] ${yearMonth}シート: ${dateRowIndices.length}個の日付行を検出`)

          // 各日付行について媒体名を特定してデータを処理
          for (const dateIndex of dateRowIndices) {
            const dateRow = data[dateIndex]
            const dateValue = dateRow[0]?.toString().trim()
            if (!dateValue) continue

            const rowDate = new Date(dateValue)
            if (rowDate < startDateObj || rowDate > endDateObj) continue

            // この日付行の媒体名を探す
            let mediaName = '不明'

            // 日付行より上の行で媒体名を探す（最大10行まで）
            for (let i = Math.max(0, dateIndex - 10); i < dateIndex; i++) {
              const row = data[i]
              if (!row || !row[0]) continue
              const cellValue = row[0].toString().trim()

              // 次の日付が来たら終了
              if (datePattern.test(cellValue)) break

              // 「全体」は媒体名として認識
              if (cellValue === '全体' || cellValue.includes('全体')) {
                mediaName = '全体'
                console.log(`[DEBUG] 行${dateIndex + 1}の媒体名を特定: 行${i + 1} = "${cellValue}" → 全体`)
                break
              }

              // 「〇〇広告」で終わるものを媒体名として認識
              if (cellValue.endsWith('広告')) {
                mediaName = cellValue
                console.log(`[DEBUG] 行${dateIndex + 1}の媒体名を特定: 行${i + 1} = "${cellValue}" → ${mediaName}`)
                break
              }

              // 個別パターンマッチング（互換性のため）
              if (cellValue.toLowerCase().includes('facebook') || cellValue.includes('FB')) {
                mediaName = 'Facebook広告'
              } else if (cellValue.toLowerCase().includes('google') || cellValue.includes('グーグル')) {
                mediaName = 'Google広告'
              } else if (cellValue.toLowerCase().includes('line') || cellValue.includes('ライン')) {
                mediaName = 'LINE広告'
              } else if (cellValue.toLowerCase().includes('yahoo') || cellValue.includes('ヤフー')) {
                mediaName = 'Yahoo!広告'
              }

              if (mediaName !== '不明') {
                console.log(`[DEBUG] 行${dateIndex + 1}の媒体名を特定: 行${i + 1} = "${cellValue}" → ${mediaName}`)
                break
              }
            }

            // 「全体」データはスキップ
            if (mediaName === '全体') {
              console.log(`[DEBUG] 「全体」データをスキップ: 行${dateIndex + 1} = "${dateValue}"`)
              continue
            }

            // データが実際に存在するか確認
            const hasData = dateRow.slice(1).some(cell => {
              if (cell === null || cell === undefined || cell === '') return false
              const num = parseNumber(cell)
              return num > 0
            })

            if (hasData) {
              // スプレッドシートの列インデックス（0ベース、列Aが0）
              const columnIndexes = {
                imp: 1, click: 2, ctr: 3, cpc: 4, cpm: 5,
                costWithoutFee: 6, costWithFee: 7, costWithFeeTax: 8,
                mcv: 9, mcvr: 10, mcpa: 11,
                cv: 12, mediaCv: 13, cvr: 14,
                cpaWithoutFee: 15, cpaWithFee: 16,
              }

              const dataItem = {
                date: dateValue,
                platform: mediaName,
                impressions: parseNumber(dateRow[columnIndexes.imp]) || 0,
                clicks: parseNumber(dateRow[columnIndexes.click]) || 0,
                ctr: parsePercentage(dateRow[columnIndexes.ctr]) || 0,
                cpc: parseNumber(dateRow[columnIndexes.cpc]) || 0,
                cpm: parseNumber(dateRow[columnIndexes.cpm]) || 0,
                costWithoutFee: parseNumber(dateRow[columnIndexes.costWithoutFee]) || 0,
                costWithFee: parseNumber(dateRow[columnIndexes.costWithFee]) || 0,
                costWithFeeTax: parseNumber(dateRow[columnIndexes.costWithFeeTax]) || 0,
                mcv: parseNumber(dateRow[columnIndexes.mcv]) || 0,
                mcvr: parsePercentage(dateRow[columnIndexes.mcvr]) || 0,
                mcpa: parseNumber(dateRow[columnIndexes.mcpa]) || 0,
                cv: parseNumber(dateRow[columnIndexes.cv]) || 0,
                mediaCv: parseNumber(dateRow[columnIndexes.mediaCv]) || 0,
                cvr: parsePercentage(dateRow[columnIndexes.cvr]) || 0,
                cpaWithoutFee: parseNumber(dateRow[columnIndexes.cpaWithoutFee]) || 0,
                cpaWithFee: parseNumber(dateRow[columnIndexes.cpaWithFee]) || 0,
                sourceHash: `${dateValue}_${mediaName}`, // 重複チェック用
                rawData: { yearMonth, rowIndex: dateIndex },
              }

              monthData.push(dataItem)
              console.log(`[DEBUG] 日付データ追加: 行${dateIndex + 1} = "${dateValue}" (媒体: ${mediaName})`)
            }
          }

          if (monthData.length > 0) {
            allData.push(...monthData)
            processDetails.push({
              yearMonth,
              status: 'success',
              dataCount: monthData.length,
            })
            console.log(`[一括インポート] ${yearMonth}: ${monthData.length}件のデータ取得`)
          } else {
            processDetails.push({
              yearMonth,
              status: 'no_matching_data',
              message: '期間内のデータなし',
            })
          }
        } catch (error: any) {
          console.error(`[一括インポート] ${yearMonth}エラー:`, error)
          processDetails.push({
            yearMonth,
            status: 'error',
            error: error.message,
          })
        }
      }

      // データを保存
      if (allData.length > 0) {
        console.log(`[一括インポート] 総データ数: ${allData.length}件を保存中...`)

        const saveResult = await ctx.runMutation(api.googleSheets.saveGoogleSheetsData, {
          data: allData,
          sheetName: 'historical_import',
          skipExisting: args.skipExisting !== false, // デフォルトはtrue
        })

        console.log(`[一括インポート] 完了: 保存=${saveResult.saved}, 更新=${saveResult.updated}, エラー=${saveResult.errors}`)

        return {
          success: true,
          saved: saveResult.saved,
          updated: saveResult.updated,
          skipped: saveResult.skipped,
          errors: saveResult.errors,
          details: processDetails,
        }
      }

      return {
        success: false,
        error: 'インポート可能なデータがありませんでした',
        details: processDetails,
      }
    } catch (error: any) {
      console.error('[一括インポート] エラー:', error)
      return {
        success: false,
        error: error.message || '予期せぬエラーが発生しました',
      }
    }
  },
})

/**
 * 毎日実行するバッチ処理（cronジョブ用）
 * 昨日のGoogle Sheetsデータを取得して保存
 */
export const dailyImportGoogleSheetsData = action({
  args: {},
  handler: async (ctx): Promise<{
    success: boolean;
    message?: string;
    imported?: number;
    error?: string;
  }> => {
    console.log('[定期バッチ] Google Sheetsデータインポート開始')

    try {
      // 保存されているスプレッドシートURLを取得
      const spreadsheetUrl = await ctx.runQuery(api.googleSheets.getSpreadsheetUrl)

      if (!spreadsheetUrl) {
        console.log('[定期バッチ] エラー: スプレッドシートURLが設定されていません')
        return {
          success: false,
          error: 'スプレッドシートURLが設定されていません',
        }
      }

      // スプレッドシートIDを抽出
      const extractResult = await ctx.runAction(api.googleSheets.extractSpreadsheetId, {
        url: spreadsheetUrl,
      })

      if (!extractResult.success || !extractResult.spreadsheetId) {
        console.log('[定期バッチ] エラー: スプレッドシートIDの抽出に失敗')
        return {
          success: false,
          error: 'スプレッドシートIDの抽出に失敗しました',
        }
      }

      // 現在の年月でシート名を生成
      const now = new Date()
      const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      const range = `'${currentYearMonth}'!A1:Z1000`

      console.log(`[定期バッチ] 取得範囲: ${range}`)

      // 昨日のデータを取得
      const fetchResult = await ctx.runAction(api.googleSheets.fetchYesterdayData, {
        spreadsheetId: extractResult.spreadsheetId,
        range: range,
      })

      if (!fetchResult.success) {
        // 前月のシートも試す
        const lastMonth = new Date(now)
        lastMonth.setMonth(lastMonth.getMonth() - 1)
        const lastYearMonth = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`
        const lastMonthRange = `'${lastYearMonth}'!A1:Z1000`

        console.log(`[定期バッチ] 現在月でデータが見つからないため、前月を試行: ${lastMonthRange}`)

        const lastMonthResult = await ctx.runAction(api.googleSheets.fetchYesterdayData, {
          spreadsheetId: extractResult.spreadsheetId,
          range: lastMonthRange,
        })

        if (!lastMonthResult.success) {
          console.log('[定期バッチ] エラー: 昨日のデータが見つかりません')
          return {
            success: false,
            error: fetchResult.error || 'データの取得に失敗しました',
          }
        }

        // 前月のデータを使用
        fetchResult.success = lastMonthResult.success
        fetchResult.mediaData = lastMonthResult.mediaData
        fetchResult.targetDate = lastMonthResult.targetDate
      }

      // データをConvexに保存
      if (fetchResult.mediaData && fetchResult.mediaData.length > 0) {
        // データを新しいスキーマに合わせて整形
        const importData = fetchResult.mediaData.map(media => ({
          date: fetchResult.targetDate || '',
          platform: media.platform,
          impressions: media.impressions || 0,
          clicks: media.clicks || 0,
          ctr: media.ctr || 0,
          cpc: media.cpc || 0,
          cpm: media.cpm || 0,
          costWithoutFee: media.costWithoutFee || 0,
          costWithFee: media.costWithFee || 0,
          costWithFeeTax: media.costWithFeeTax || 0,
          mcv: media.mcv || 0,
          mcvr: media.mcvr || 0,
          mcpa: media.mcpa || 0,
          cv: media.cv || 0,
          mediaCv: media.mediaCv || 0,
          cvr: media.cvr || 0,
          cpaWithoutFee: media.cpaWithoutFee || 0,
          cpaWithFee: media.cpaWithFee || 0,
          rawData: media,
        }))

        // Google Sheets専用テーブルに保存
        const saveResult = await ctx.runMutation(api.googleSheets.saveGoogleSheetsData, {
          data: importData,
          sheetName: currentYearMonth,
        })

        console.log(`[定期バッチ] インポート完了: 保存=${saveResult.saved}, 更新=${saveResult.updated}, エラー=${saveResult.errors}`)

        return {
          success: true,
          message: `${fetchResult.targetDate}のデータをインポートしました`,
          imported: saveResult.saved + saveResult.updated,
        }
      }

      return {
        success: false,
        error: 'インポート可能なデータがありませんでした',
      }
    } catch (error: any) {
      console.error('[定期バッチ] エラー:', error)
      return {
        success: false,
        error: error.message || '予期せぬエラーが発生しました',
      }
    }
  },
})

// === データ削除 ===

/**
 * Google Sheetsデータを個別削除
 */
export const deleteGoogleSheetsDataById = mutation({
  args: {
    id: v.id('googleSheetsData'),
  },
  handler: async (ctx, args) => {
    const record = await ctx.db.get(args.id)

    if (!record) {
      throw new Error('削除対象のデータが見つかりません')
    }

    await ctx.db.delete(args.id)

    return {
      success: true,
      message: `${record.platform}（${record.date}）のデータを削除しました`,
    }
  },
})

/**
 * Google Sheetsデータを複数削除
 */
export const deleteMultipleGoogleSheetsData = mutation({
  args: {
    ids: v.array(v.id('googleSheetsData')),
  },
  handler: async (ctx, args) => {
    let deletedCount = 0

    for (const id of args.ids) {
      const record = await ctx.db.get(id)
      if (record) {
        await ctx.db.delete(id)
        deletedCount++
      }
    }

    return {
      success: true,
      deletedCount,
      message: `${deletedCount}件のデータを削除しました`,
    }
  },
})