import { v } from 'convex/values'
import { mutation, query, action } from './_generated/server'
import { api } from './_generated/api'

// Google Ads設定を保存
export const saveConfig = mutation({
  args: {
    clientId: v.string(),
    clientSecret: v.string(),
    refreshToken: v.optional(v.string()),
    accessToken: v.optional(v.string()),
    tokenExpiresAt: v.optional(v.number()),
    developerId: v.optional(v.string()),
    developerToken: v.optional(v.string()),
    customerId: v.string(),
    managerAccountId: v.optional(v.string()),
    isConnected: v.boolean(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('googleAdsConfig')
      .first()

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...args,
        updatedAt: Date.now(),
      })
      return existing._id
    } else {
      return await ctx.db.insert('googleAdsConfig', {
        ...args,
        developerId: args.developerId || args.developerToken, // 互換性のため両方をサポート
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    }
  },
})

// Google Ads設定を取得
export const getConfig = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query('googleAdsConfig')
      .first()
  },
})

// Google Ads設定を削除
export const deleteConfig = mutation({
  args: {},
  handler: async (ctx) => {
    const config = await ctx.db
      .query('googleAdsConfig')
      .first()

    if (config) {
      await ctx.db.delete(config._id)
    }
  },
})

// Google Adsデータを保存
export const savePerformanceData = mutation({
  args: {
    date: v.string(),
    campaignName: v.string(),
    campaignId: v.string(),
    impressions: v.number(),
    clicks: v.number(),
    cost: v.number(),
    conversions: v.number(),
    conversionValue: v.number(),
  },
  handler: async (ctx, args) => {
    // 既存データの確認（日付とキャンペーンIDで重複チェック）
    const existing = await ctx.db
      .query('googleAdsPerformance')
      .filter((q) =>
        q.and(
          q.eq(q.field('date'), args.date),
          q.eq(q.field('campaignId'), args.campaignId)
        )
      )
      .first()

    if (existing) {
      // 既存データを更新
      await ctx.db.patch(existing._id, {
        ...args,
        updatedAt: Date.now(),
      })
      return existing._id
    } else {
      // 新規データを挿入
      return await ctx.db.insert('googleAdsPerformance', {
        ...args,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    }
  },
})

// Google Adsパフォーマンスデータを取得
export const getPerformanceData = query({
  args: {
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query('googleAdsPerformance')

    // 日付フィルタリング
    if (args.startDate && args.endDate) {
      const data = await query.collect()
      return data.filter(item =>
        item.date >= args.startDate! &&
        item.date <= args.endDate!
      )
    }

    return await query.collect()
  },
})

// Google Adsキャンペーンサマリーを取得
export const getCampaignSummary = query({
  args: {
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    const data = await ctx.db
      .query('googleAdsPerformance')
      .collect()

    // 日付範囲でフィルタリング
    const filteredData = data.filter(item =>
      item.date >= args.startDate &&
      item.date <= args.endDate
    )

    // キャンペーンごとに集計
    const campaignMap = new Map()

    filteredData.forEach(item => {
      const existing = campaignMap.get(item.campaignId) || {
        campaignName: item.campaignName,
        campaignId: item.campaignId,
        impressions: 0,
        clicks: 0,
        cost: 0,
        conversions: 0,
        conversionValue: 0,
      }

      campaignMap.set(item.campaignId, {
        ...existing,
        impressions: existing.impressions + item.impressions,
        clicks: existing.clicks + item.clicks,
        cost: existing.cost + item.cost,
        conversions: existing.conversions + item.conversions,
        conversionValue: existing.conversionValue + item.conversionValue,
      })
    })

    return Array.from(campaignMap.values())
  },
})

// トークンのリフレッシュ
export const refreshAccessToken = action({
  args: {},
  handler: async (ctx): Promise<{
    success: boolean
    accessToken?: string
    expiresAt?: number
  }> => {
    const config = await ctx.runQuery(api.googleAds.getConfig) as any

    if (!config || !config.refreshToken) {
      return { success: false }
    }

    try {
      const tokenUrl = 'https://oauth2.googleapis.com/token'
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          refresh_token: config.refreshToken,
          client_id: config.clientId,
          client_secret: config.clientSecret,
          grant_type: 'refresh_token',
        }),
      })

      if (!response.ok) {
        throw new Error('Token refresh failed')
      }

      const tokens = await response.json()
      const expiresAt = Date.now() + (tokens.expires_in * 1000)

      // トークンを更新
      await ctx.runMutation(api.googleAds.saveConfig, {
        ...config,
        accessToken: tokens.access_token,
        tokenExpiresAt: expiresAt,
      })

      return {
        success: true,
        accessToken: tokens.access_token,
        expiresAt,
      }
    } catch (error) {
      console.error('Token refresh error:', error)
      return { success: false }
    }
  },
})

// Google Ads APIからデータを取得（アクション）
export const fetchPerformanceData = action({
  args: {
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    // 設定を取得
    const config = await ctx.runQuery(api.googleAds.getConfig) as any

    if (!config || !config.isConnected) {
      throw new Error('Google Ads API is not configured')
    }

    // トークンの有効期限をチェック
    let accessToken = config.accessToken
    if (!accessToken || (config.tokenExpiresAt && config.tokenExpiresAt < Date.now())) {
      const refreshResult = await ctx.runAction(api.googleAds.refreshAccessToken)
      if (!refreshResult.success || !refreshResult.accessToken) {
        throw new Error('Failed to refresh access token')
      }
      accessToken = refreshResult.accessToken
    }

    // Developer Tokenを確認
    const developerToken = config.developerToken || config.developerId
    if (!developerToken) {
      throw new Error('Developer token is not configured')
    }

    try {
      // Google Ads API v21エンドポイント
      const apiUrl = `https://googleads.googleapis.com/v21/customers/${config.customerId.replace(/-/g, '')}/googleAds:searchStream`

      // Google Ads Query Language (GAQL) クエリ
      const query = `
        SELECT
          campaign.id,
          campaign.name,
          campaign.status,
          segments.date,
          metrics.impressions,
          metrics.clicks,
          metrics.cost_micros,
          metrics.conversions,
          metrics.conversions_value,
          metrics.average_cpm,
          metrics.average_cpc,
          metrics.ctr,
          metrics.conversions_from_interactions_rate
        FROM campaign
        WHERE segments.date BETWEEN '${args.startDate}' AND '${args.endDate}'
          AND campaign.status != 'REMOVED'
        ORDER BY segments.date DESC
      `

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'developer-token': developerToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      })

      if (!response.ok) {
        const error = await response.text()
        console.error('Google Ads API error:', error)
        throw new Error(`Google Ads API error: ${error}`)
      }

      const result = await response.json()
      const performanceData = []

      // APIレスポンスをパース
      if (result.results) {
        for (const row of result.results) {
          const data = {
            date: row.segments.date,
            campaignName: row.campaign.name,
            campaignId: row.campaign.id,
            impressions: parseInt(row.metrics.impressions || '0'),
            clicks: parseInt(row.metrics.clicks || '0'),
            cost: parseInt(row.metrics.costMicros || '0') / 1000000, // マイクロ単位から円に変換
            conversions: parseFloat(row.metrics.conversions || '0'),
            conversionValue: parseFloat(row.metrics.conversionsValue || '0'),
          }

          performanceData.push(data)
          // データの保存は行わない（許可なしで保存しない）
          // await ctx.runMutation(api.googleAds.savePerformanceData, data)
        }
      }

      return performanceData
    } catch (error) {
      console.error('Error fetching Google Ads data:', error)
      throw error
    }
  },
})


// コストサマリーを取得
export const getCostSummary = action({
  args: {
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      // 最新のデータを取得
      const freshData = await ctx.runAction(api.googleAds.fetchPerformanceData, {
        startDate: args.startDate,
        endDate: args.endDate,
      })

      // 日付ごとに集計
      const dailyMap = new Map()

      freshData.forEach((item: any) => {
        const existing = dailyMap.get(item.date) || {
          date: item.date,
          cost: 0,
          impressions: 0,
          clicks: 0,
          conversions: 0,
          campaignName: '',
        }

        dailyMap.set(item.date, {
          ...existing,
          cost: existing.cost + item.cost,
          impressions: existing.impressions + item.impressions,
          clicks: existing.clicks + item.clicks,
          conversions: existing.conversions + item.conversions,
          campaignName: item.campaignName || existing.campaignName,
        })
      })

      return Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date))
    } catch (error) {
      console.error('Error in getCostSummary:', error)
      // エラー時は空配列を返す
      return []
    }
  },
})

// 日別サマリーデータを取得（DailySparklineCharts用）
export const getDailySummaries = query({
  args: {
    accountId: v.string(),
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    // Google Ads用の日別データを返す
    // 現時点では保存されたデータから取得
    const data = await ctx.db
      .query('googleAdsPerformance')
      .collect()

    const filteredData = data.filter(item =>
      item.date >= args.startDate &&
      item.date <= args.endDate
    )

    // 日付ごとに集計
    const dailyMap = new Map()

    filteredData.forEach(item => {
      const existing = dailyMap.get(item.date) || {
        date: item.date,
        spend: 0,
        impressions: 0,
        clicks: 0,
        conversions: 0,
        conversionValue: 0,
      }

      dailyMap.set(item.date, {
        ...existing,
        spend: existing.spend + item.cost,
        impressions: existing.impressions + item.impressions,
        clicks: existing.clicks + item.clicks,
        conversions: existing.conversions + item.conversions,
        conversionValue: existing.conversionValue + item.conversionValue,
        cpa: existing.conversions > 0 ? (existing.spend + item.cost) / (existing.conversions + item.conversions) : 0,
        ctr: existing.impressions > 0 ? ((existing.clicks + item.clicks) / (existing.impressions + item.impressions)) * 100 : 0,
        cpc: existing.clicks > 0 ? (existing.spend + item.cost) / (existing.clicks + item.clicks) : 0,
      })
    })

    return Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date))
  },
})

// OAuth認証URLを生成
export const generateAuthUrl = action({
  args: {
    clientId: v.string(),
    redirectUri: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<string> => {
    // Google OAuth2の認証URLを生成
    const baseUrl = 'https://accounts.google.com/o/oauth2/v2/auth'
    const scope = 'https://www.googleapis.com/auth/adwords'
    const redirectUri = args.redirectUri || `${process.env.VITE_APP_URL || 'http://localhost:3000'}/settings/google-ads/callback`

    const params = new URLSearchParams({
      client_id: args.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: scope,
      access_type: 'offline',
      prompt: 'consent', // リフレッシュトークンを確実に取得
    })

    return `${baseUrl}?${params.toString()}`
  },
})

// OAuthコールバック処理
export const handleOAuthCallback = action({
  args: {
    code: v.string(),
    clientId: v.string(),
    clientSecret: v.string(),
    customerId: v.optional(v.string()), // Customer IDも受け取る
    redirectUri: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{
    success: boolean
    message: string
    data?: any
  }> => {
    try {
      console.log('OAuth callback started with args:', {
        code: args.code?.substring(0, 10) + '...',
        clientId: args.clientId,
        customerId: args.customerId
      })

      // Google OAuth2トークンエンドポイント
      const tokenUrl = 'https://oauth2.googleapis.com/token'
      const redirectUri = args.redirectUri || `${process.env.VITE_APP_URL || 'http://localhost:3000'}/settings/google-ads/callback`

      // アクセストークンを取得
      const tokenResponse = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          code: args.code,
          client_id: args.clientId,
          client_secret: args.clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      })

      if (!tokenResponse.ok) {
        const error = await tokenResponse.text()
        throw new Error(`Token exchange failed: ${error}`)
      }

      const tokens = await tokenResponse.json()
      console.log('Tokens received:', {
        access_token: tokens.access_token ? 'present' : 'missing',
        refresh_token: tokens.refresh_token ? 'present' : 'missing',
        expires_in: tokens.expires_in
      })

      // 既存の設定を取得
      const existingConfig = await ctx.runQuery(api.googleAds.getConfig) as any
      console.log('Existing config found:', existingConfig ? 'yes' : 'no')

      if (existingConfig) {
        // 既存の設定を更新（_creationTimeと_idを除外）
        const { _creationTime, _id, createdAt, updatedAt, ...configData } = existingConfig
        const updateData = {
          ...configData,
          refreshToken: tokens.refresh_token || existingConfig.refreshToken,
          accessToken: tokens.access_token,
          tokenExpiresAt: Date.now() + (tokens.expires_in * 1000),
          isConnected: true,
        }
        console.log('Updating config with new tokens')
        await ctx.runMutation(api.googleAds.saveConfig, updateData)
      }

      return {
        success: true,
        message: 'Google Ads APIの認証に成功しました',
        data: {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiresIn: tokens.expires_in,
        }
      }
    } catch (error) {
      console.error('OAuth callback error:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : '認証に失敗しました',
      }
    }
  },
})

// 接続テスト
export const testConnection = action({
  args: {},
  handler: async (ctx): Promise<{
    success: boolean
    message: string
    data?: {
      customerId: string
      developerId: string
      hasAuth?: boolean
      authStatus?: string
    }
  }> => {
    const config = await ctx.runQuery(api.googleAds.getConfig) as any

    if (!config) {
      return {
        success: false,
        message: 'Google Ads設定が見つかりません',
      }
    }

    // 設定の詳細チェック
    const hasBasicConfig = config.clientId && config.clientSecret && config.customerId
    const hasDeveloperToken = config.developerToken || config.developerId
    const hasOAuthTokens = config.refreshToken && config.accessToken

    // 基本設定がない場合
    if (!hasBasicConfig || !hasDeveloperToken) {
      return {
        success: false,
        message: '基本設定が不完全です。Client ID、Client Secret、Customer ID、Developer Tokenを確認してください。',
        data: {
          customerId: config.customerId || '',
          developerId: config.developerId || config.developerToken || '',
        }
      }
    }

    // OAuth認証が未完了の場合
    if (!hasOAuthTokens || !config.isConnected) {
      return {
        success: false,
        message: 'OAuth認証が完了していません。「Googleアカウントと連携」ボタンから認証を行ってください。',
        data: {
          customerId: config.customerId,
          developerId: config.developerId || config.developerToken || '',
          hasAuth: false,
          authStatus: 'OAuth認証が必要です'
        }
      }
    }

    // トークンの有効期限をチェック
    if (config.tokenExpiresAt && config.tokenExpiresAt < Date.now()) {
      // トークンリフレッシュを試行
      try {
        const refreshResult = await ctx.runAction(api.googleAds.refreshAccessToken)
        if (!refreshResult.success) {
          return {
            success: false,
            message: 'アクセストークンの更新に失敗しました。再度認証が必要です。',
            data: {
              customerId: config.customerId,
              developerId: config.developerId || config.developerToken || '',
              hasAuth: true,
              authStatus: 'トークン更新失敗'
            }
          }
        }
      } catch (error) {
        return {
          success: false,
          message: 'トークンの更新中にエラーが発生しました。',
          data: {
            customerId: config.customerId,
            developerId: config.developerId || config.developerToken || '',
            hasAuth: true,
            authStatus: 'トークン更新エラー'
          }
        }
      }
    }

    // 実際のAPI接続テスト
    try {
      // 簡単なテストクエリを実行
      const testQuery = {
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
      }

      // パフォーマンスデータ取得を試行（1日分のみ）
      await ctx.runAction(api.googleAds.fetchPerformanceData, testQuery)

      return {
        success: true,
        message: 'Google Ads APIに正常に接続されています',
        data: {
          customerId: config.customerId,
          developerId: config.developerId || config.developerToken || '',
          hasAuth: true,
          authStatus: '認証済み・接続確認済み'
        }
      }
    } catch (error: any) {
      // API呼び出しが失敗した場合は、認証も失敗とする
      const errorMessage = error.message || 'Unknown error'

      // 401エラーの場合
      if (errorMessage.includes('401') || errorMessage.includes('UNAUTHENTICATED')) {
        return {
          success: false,
          message: '認証エラー: アクセストークンが無効です。再度OAuth認証を行ってください。',
          data: {
            customerId: config.customerId,
            developerId: config.developerId || config.developerToken || '',
            hasAuth: false,
            authStatus: '認証失敗 - 401エラー'
          }
        }
      }

      // その他のエラー
      return {
        success: false,
        message: `API接続エラー: ${errorMessage}`,
        data: {
          customerId: config.customerId,
          developerId: config.developerId || config.developerToken || '',
          hasAuth: true,
          authStatus: 'API呼び出しエラー'
        }
      }
    }
  },
})