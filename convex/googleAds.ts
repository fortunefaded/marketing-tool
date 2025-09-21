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
    error?: string
  }> => {
    const config = await ctx.runQuery(api.googleAds.getConfig) as any

    if (!config) {
      console.error('No Google Ads config found')
      return { success: false, error: 'Google Ads設定が見つかりません' }
    }

    if (!config.refreshToken) {
      console.error('No refresh token available')
      return { success: false, error: 'リフレッシュトークンがありません。再度認証を行ってください。' }
    }

    if (!config.clientId || !config.clientSecret) {
      console.error('Missing client credentials')
      return { success: false, error: 'Client IDまたはClient Secretが設定されていません' }
    }

    try {
      console.log('Attempting to refresh access token...')
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

      const responseText = await response.text()

      if (!response.ok) {
        console.error('Token refresh failed:', response.status, responseText)
        try {
          const errorData = JSON.parse(responseText)
          if (errorData.error === 'invalid_grant') {
            return { success: false, error: 'リフレッシュトークンが無効です。再度認証を行ってください。' }
          }
          return { success: false, error: `トークン更新エラー: ${errorData.error_description || errorData.error}` }
        } catch {
          return { success: false, error: `トークン更新に失敗しました: ${response.status}` }
        }
      }

      const tokens = JSON.parse(responseText)
      const expiresAt = Date.now() + ((tokens.expires_in || 3600) * 1000)

      console.log('Token refreshed successfully')

      // トークンを更新（Convexメタデータフィールドを除外）
      const { _creationTime, _id, createdAt, updatedAt, ...configData } = config
      await ctx.runMutation(api.googleAds.saveConfig, {
        ...configData,
        accessToken: tokens.access_token,
        tokenExpiresAt: expiresAt,
      })

      return {
        success: true,
        accessToken: tokens.access_token,
        expiresAt,
      }
    } catch (error: any) {
      console.error('Token refresh error:', error)
      return { success: false, error: error.message || 'トークン更新中に予期しないエラーが発生しました' }
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
      console.log('Access token expired or not found, refreshing...')
      const refreshResult = await ctx.runAction(api.googleAds.refreshAccessToken)
      if (!refreshResult.success || !refreshResult.accessToken) {
        const errorMessage = refreshResult.error || 'アクセストークンの更新に失敗しました'
        console.error('Token refresh failed:', errorMessage)
        throw new Error(errorMessage)
      }
      accessToken = refreshResult.accessToken
      console.log('Access token refreshed successfully')
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
      // キャンペーンが新しい場合や、指定期間にデータがない場合を考慮
      // まずはシンプルにメトリクスを取得
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
          metrics.conversions_value
        FROM campaign
        WHERE segments.date BETWEEN '${args.startDate}' AND '${args.endDate}'
        ORDER BY segments.date DESC
      `

      console.log('📤 Google Ads API Request:', {
        url: apiUrl,
        customerId: config.customerId,
        dateRange: `${args.startDate} ~ ${args.endDate}`,
        query: query.trim()
      })

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'developer-token': developerToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      })

      const responseText = await response.text()
      console.log('📥 Google Ads API Response Status:', response.status)
      console.log('📥 Google Ads API Response Headers:', response.headers)

      if (!response.ok) {
        console.error('❌ Google Ads API error:', responseText)
        throw new Error(`Google Ads API error (${response.status}): ${responseText}`)
      }

      let result
      try {
        result = JSON.parse(responseText)

        // レスポンスが配列の場合、最初の要素を取得
        if (Array.isArray(result) && result.length > 0 && result[0].results) {
          console.log('🔄 Response is wrapped in array, unwrapping...')
          result = result[0]
        }

        console.log('📥 Google Ads API Response Body:', {
          hasResults: !!result.results,
          resultsCount: result.results?.length || 0,
          firstResult: result.results?.[0] || null,
          responseKeys: Object.keys(result),
          fullResponse: JSON.stringify(result).substring(0, 500) // 最初の500文字だけログ
        })
      } catch (e) {
        console.error('Failed to parse response as JSON:', responseText)
        throw new Error('Invalid JSON response from Google Ads API')
      }

      const performanceData = []

      // APIレスポンスをパース
      if (result.results && result.results.length > 0) {
        console.log(`✅ Found ${result.results.length} rows of data`)
        for (const row of result.results) {
          const data = {
            date: row.segments?.date || '',
            campaignName: row.campaign?.name || '',
            campaignId: row.campaign?.id || '',
            impressions: parseInt(row.metrics?.impressions || '0'),
            clicks: parseInt(row.metrics?.clicks || '0'),
            cost: parseInt(row.metrics?.costMicros || '0') / 1000000, // マイクロ単位から円に変換
            conversions: parseFloat(row.metrics?.conversions || '0'),
            conversionValue: parseFloat(row.metrics?.conversionsValue || '0'),
          }

          performanceData.push(data)
        }
        console.log('📊 Processed data summary:', {
          totalRows: performanceData.length,
          totalCost: performanceData.reduce((sum, d) => sum + d.cost, 0),
          totalImpressions: performanceData.reduce((sum, d) => sum + d.impressions, 0),
          totalClicks: performanceData.reduce((sum, d) => sum + d.clicks, 0)
        })
      } else {
        console.log('⚠️ No results found in API response')
        console.log('Full response for debugging:', JSON.stringify(result))

        // エラーメッセージがある場合は表示
        if (result.error) {
          console.error('API Error in response:', result.error)
        }
      }

      // デバッグ用：パフォーマンスデータと生のレスポンスを含めて返す
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
      console.log('🎯 getCostSummary called with:', { startDate: args.startDate, endDate: args.endDate })

      // 最新のデータを取得
      const freshData = await ctx.runAction(api.googleAds.fetchPerformanceData, {
        startDate: args.startDate,
        endDate: args.endDate,
      })

      console.log('🎯 fetchPerformanceData returned:', {
        count: freshData.length,
        firstItem: freshData[0] || null,
        isEmpty: freshData.length === 0
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

      const result = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date))
      console.log('🎯 getCostSummary returning:', { count: result.length })
      return result
    } catch (error) {
      console.error('❌ Error in getCostSummary:', error)
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
  handler: async (_ctx, args): Promise<string> => {
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

// 全キャンペーンを取得（デバッグ用）
export const getAllCampaigns = action({
  args: {},
  handler: async (ctx) => {
    const config = await ctx.runQuery(api.googleAds.getConfig) as any

    if (!config || !config.isConnected) {
      throw new Error('Google Ads API is not configured')
    }

    // トークンの有効期限をチェック
    let accessToken = config.accessToken
    if (!accessToken || (config.tokenExpiresAt && config.tokenExpiresAt < Date.now())) {
      console.log('Access token expired or not found, refreshing...')
      const refreshResult = await ctx.runAction(api.googleAds.refreshAccessToken)
      if (!refreshResult.success || !refreshResult.accessToken) {
        throw new Error(refreshResult.error || 'Failed to refresh access token')
      }
      accessToken = refreshResult.accessToken
    }

    const developerToken = config.developerToken || config.developerId
    if (!developerToken) {
      throw new Error('Developer token is not configured')
    }

    try {
      const apiUrl = `https://googleads.googleapis.com/v21/customers/${config.customerId.replace(/-/g, '')}/googleAds:searchStream`

      // すべてのキャンペーンを取得するシンプルなクエリ
      const query = `
        SELECT
          campaign.id,
          campaign.name,
          campaign.status,
          campaign.start_date,
          campaign.end_date
        FROM campaign
      `

      console.log('📤 Getting all campaigns with query:', query.trim())

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'developer-token': developerToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      })

      const responseText = await response.text()
      console.log('📥 Response status:', response.status)

      if (!response.ok) {
        console.error('API Error:', responseText)
        throw new Error(`API Error (${response.status}): ${responseText}`)
      }

      const result = JSON.parse(responseText)
      console.log('📥 All campaigns result:', result)

      return {
        success: true,
        campaigns: result.results || [],
        totalCount: result.results?.length || 0
      }
    } catch (error) {
      console.error('Error getting all campaigns:', error)
      throw error
    }
  },
})

// 実際のGoogle Ads APIデータを直接取得（CORS回避のためバックエンド経由）
export const fetchDirectApiData = action({
  args: {
    startDate: v.string(),
    endDate: v.string(),
    withDailyData: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<{
    success: boolean
    error: string | null
    data: any | null
  }> => {
    console.log('📊 fetchDirectApiData called:', args)

    // 設定を取得
    let config = await ctx.runQuery(api.googleAds.getConfig) as any

    if (!config || !config.isConnected) {
      console.error('Google Ads not configured')
      return {
        success: false,
        error: 'Google Ads APIが設定されていません',
        data: null
      }
    }

    // Customer IDの検証
    const expectedCustomerId = '9659708798'
    if (config.customerId !== expectedCustomerId) {
      console.warn(`⚠️ Customer ID mismatch: Expected ${expectedCustomerId}, got ${config.customerId}`)
      config.customerId = expectedCustomerId
    }

    // Manager Account IDの検証
    const expectedManagerId = '3712162647'
    if (!config.managerAccountId || config.managerAccountId !== expectedManagerId) {
      console.warn(`⚠️ Manager ID missing or mismatch: Setting to ${expectedManagerId}`)
      config.managerAccountId = expectedManagerId
    }

    // トークンの有効期限をチェック
    let accessToken = config.accessToken
    if (!accessToken || (config.tokenExpiresAt && config.tokenExpiresAt < Date.now())) {
      console.log('Access token expired, refreshing...')
      const refreshResult = await ctx.runAction(api.googleAds.refreshAccessToken) as any
      if (!refreshResult.success || !refreshResult.accessToken) {
        return {
          success: false,
          error: refreshResult.error || 'トークンの更新に失敗しました',
          data: null
        }
      }
      accessToken = refreshResult.accessToken
    }

    const developerToken = config.developerToken || config.developerId
    if (!developerToken) {
      return {
        success: false,
        error: 'Developer tokenが設定されていません',
        data: null
      }
    }

    const customerId = config.customerId.replace(/-/g, '')
    const apiUrl = `https://googleads.googleapis.com/v21/customers/${customerId}/googleAds:searchStream`

    // APIリクエスト前のログ
    console.log('🔍 Google Ads API Request Details:', {
      customerId: config.customerId,
      managerAccountId: config.managerAccountId || '3712162647',
      hasAccessToken: !!accessToken,
      developerToken: developerToken?.substring(0, 10) + '...',
      apiUrl: apiUrl,
      dateRange: `${args.startDate} to ${args.endDate}`,
      withDailyData: args.withDailyData
    })

    try {
      // まずキャンペーン一覧を取得（デバッグ用）
      const campaignQuery = `
        SELECT
          campaign.id,
          campaign.name,
          campaign.status
        FROM campaign
        WHERE campaign.status = 'ENABLED'
      `

      console.log('🔍 Fetching campaigns first...')
      const campaignResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'developer-token': developerToken,
          'login-customer-id': config.managerAccountId || '3712162647',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: campaignQuery }),
      })

      if (campaignResponse.ok) {
        let campaignData = await campaignResponse.json()
        // 配列の場合はアンラップ
        if (Array.isArray(campaignData) && campaignData.length > 0 && campaignData[0].results) {
          campaignData = campaignData[0]
        }
        console.log('✅ Active campaigns:', campaignData.results?.length || 0, campaignData.results)
      }

      // メインクエリ（集計データ - キャンペーンレベル）
      // すべてのキャンペーンタイプを含む: P-Max, 一般, 指名KW, デマンド広告
      const aggregateQuery = `
        SELECT
          campaign.id,
          campaign.name,
          campaign.advertising_channel_type,
          campaign.advertising_channel_sub_type,
          metrics.impressions,
          metrics.clicks,
          metrics.cost_micros,
          metrics.conversions,
          metrics.conversions_value,
          metrics.average_cpc,
          metrics.average_cpm,
          metrics.ctr
        FROM campaign
        WHERE segments.date BETWEEN '${args.startDate}' AND '${args.endDate}'
      `

      console.log('🔍 Executing Google Ads Query:', {
        queryType: 'aggregated',
        resource: 'campaign',
        dateRange: `${args.startDate} to ${args.endDate}`,
        query: aggregateQuery.trim().substring(0, 200) + '...'
      })

      const aggregateResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'developer-token': developerToken,
          'login-customer-id': config.managerAccountId || '3712162647',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: aggregateQuery }),
      })

      const aggregateText = await aggregateResponse.text()
      console.log('📥 Aggregate response status:', aggregateResponse.status)

      if (!aggregateResponse.ok) {
        console.error('❌ Google Ads API Error:', {
          status: aggregateResponse.status,
          statusText: aggregateResponse.statusText,
          responseBody: aggregateText,
          headers: Object.fromEntries(aggregateResponse.headers.entries())
        })
        return {
          success: false,
          error: `API error (${aggregateResponse.status}): ${aggregateText}`,
          data: null
        }
      }

      let aggregateData = JSON.parse(aggregateText)
      // 配列の場合はアンラップ
      if (Array.isArray(aggregateData) && aggregateData.length > 0 && aggregateData[0].results) {
        console.log('🔄 Unwrapping array response for aggregate data')
        aggregateData = aggregateData[0]
      }
      console.log('✅ Google Ads API Success:', {
        hasResults: !!aggregateData.results,
        resultsCount: aggregateData.results?.length || 0,
        firstResult: aggregateData.results?.[0] || null,
        fieldMask: aggregateData.fieldMask || null,
        requestId: aggregateData.requestId || null
      })

      // 集計データを処理
      let totalSpend = 0
      let totalImpressions = 0
      let totalClicks = 0
      let totalConversions = 0
      let totalConversionValue = 0

      if (aggregateData.results && aggregateData.results.length > 0) {
        console.log('✅ Query successful:', {
          resultsCount: aggregateData.results.length,
          firstResult: aggregateData.results[0],
          campaigns: aggregateData.results.map((r: any) => ({
            name: r.campaign?.name,
            type: r.campaign?.advertisingChannelType,
            subType: r.campaign?.advertisingChannelSubType
          })).filter(c => c.name)
        })

        aggregateData.results.forEach((row: any) => {
          totalSpend += parseInt(row.metrics?.costMicros || '0') / 1000000
          totalImpressions += parseInt(row.metrics?.impressions || '0')
          totalClicks += parseInt(row.metrics?.clicks || '0')
          totalConversions += parseFloat(row.metrics?.conversions || '0')
          totalConversionValue += parseFloat(row.metrics?.conversionsValue || '0')
        })

        console.log('📊 Totals calculated:', {
          totalSpend: `¥${totalSpend.toLocaleString()}`,
          totalImpressions,
          totalClicks,
          totalConversions
        })
      } else {
        console.warn('⚠️ No results returned for aggregate query')
      }

      // 日別データとキャンペーンタイプ別データを取得
      let dailyData: any[] = []
      let campaignTypeBreakdown: any = {}
      // キャンペーンタイプ別データは常に取得（CPO計算表示のため）
      if (true) {
        const dailyQuery = `
          SELECT
            campaign.id,
            campaign.name,
            campaign.advertising_channel_type,
            campaign.advertising_channel_sub_type,
            segments.date,
            metrics.impressions,
            metrics.clicks,
            metrics.cost_micros,
            metrics.conversions,
            metrics.conversions_value
          FROM campaign
          WHERE segments.date BETWEEN '${args.startDate}' AND '${args.endDate}'
          ORDER BY segments.date DESC
        `

        console.log('🔍 Executing Google Ads Query:', {
          queryType: 'daily',
          resource: 'campaign',
          dateRange: `${args.startDate} to ${args.endDate}`
        })
        const dailyResponse = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'developer-token': developerToken,
            'login-customer-id': config.managerAccountId || '3712162647',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query: dailyQuery }),
        })

        if (dailyResponse.ok) {
          let dailyResponseData = await dailyResponse.json()
          // 配列の場合はアンラップ
          if (Array.isArray(dailyResponseData) && dailyResponseData.length > 0 && dailyResponseData[0].results) {
            console.log('🔄 Unwrapping array response for daily data')
            dailyResponseData = dailyResponseData[0]
          }
          console.log('📊 Daily data rows:', dailyResponseData.results?.length || 0)

          if (dailyResponseData.results && dailyResponseData.results.length > 0) {
            console.log('✅ Daily query successful:', {
              daysWithData: dailyResponseData.results.length,
              firstDay: dailyResponseData.results[0]?.segments?.date,
              lastDay: dailyResponseData.results[dailyResponseData.results.length - 1]?.segments?.date
            })
            // 日付ごとおよびキャンペーンタイプごとに集計
            const dateMap = new Map()
            const typeBreakdownMap = new Map()

            dailyResponseData.results.forEach((row: any) => {
              const date = row.segments?.date
              if (!date) return

              // キャンペーンタイプを判定
              const channelType = row.campaign?.advertisingChannelType
              const channelSubType = row.campaign?.advertisingChannelSubType
              let campaignType = '一般'

              if (channelType === 'PERFORMANCE_MAX') {
                campaignType = 'P-Max'
              } else if (channelType === 'DEMAND_GEN' || channelSubType === 'DEMAND_GEN') {
                campaignType = 'Demand Gen'
              }

              // 全体の日別集計
              const existing = dateMap.get(date) || {
                date,
                spend: 0,
                impressions: 0,
                clicks: 0,
                conversions: 0,
                conversionValue: 0,
              }

              dateMap.set(date, {
                ...existing,
                spend: existing.spend + (parseInt(row.metrics?.costMicros || '0') / 1000000),
                impressions: existing.impressions + parseInt(row.metrics?.impressions || '0'),
                clicks: existing.clicks + parseInt(row.metrics?.clicks || '0'),
                conversions: existing.conversions + parseFloat(row.metrics?.conversions || '0'),
                conversionValue: existing.conversionValue + parseFloat(row.metrics?.conversionsValue || '0'),
              })

              // キャンペーンタイプ別の日別集計
              const typeKey = `${campaignType}:${date}`
              const typeExisting = typeBreakdownMap.get(typeKey) || {
                type: campaignType,
                date,
                spend: 0,
                impressions: 0,
                clicks: 0,
                conversions: 0,
                conversionValue: 0,
              }

              typeBreakdownMap.set(typeKey, {
                ...typeExisting,
                spend: typeExisting.spend + (parseInt(row.metrics?.costMicros || '0') / 1000000),
                impressions: typeExisting.impressions + parseInt(row.metrics?.impressions || '0'),
                clicks: typeExisting.clicks + parseInt(row.metrics?.clicks || '0'),
                conversions: typeExisting.conversions + parseFloat(row.metrics?.conversions || '0'),
                conversionValue: typeExisting.conversionValue + parseFloat(row.metrics?.conversionsValue || '0'),
              })
            })

            // withDailyDataがtrueの場合のみ日別データを返す
            if (args.withDailyData) {
              dailyData = Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date))
            }

            // キャンペーンタイプ別の集計結果を整理
            const typeBreakdownArray = Array.from(typeBreakdownMap.values())
            campaignTypeBreakdown = {
              pmax: typeBreakdownArray.filter(d => d.type === 'P-Max').sort((a, b) => a.date.localeCompare(b.date)),
              demandgen: typeBreakdownArray.filter(d => d.type === 'Demand Gen').sort((a, b) => a.date.localeCompare(b.date)),
              general: typeBreakdownArray.filter(d => d.type === '一般').sort((a, b) => a.date.localeCompare(b.date)),
            }
          } else {
            console.warn('⚠️ No daily data returned')
          }
        }
      }

      return {
        success: true,
        error: null,
        data: {
          totalSpend,
          totalImpressions,
          totalClicks,
          totalConversions,
          totalConversionValue,
          ctr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
          cpc: totalClicks > 0 ? totalSpend / totalClicks : 0,
          cpa: totalConversions > 0 ? totalSpend / totalConversions : 0,
          dailyData,
          campaignTypeBreakdown,
        }
      }
    } catch (error: any) {
      console.error('🔥 Google Ads API Exception:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        config: {
          customerId: config.customerId,
          managerAccountId: config.managerAccountId,
          hasToken: !!accessToken
        }
      })

      // エラーメッセージから問題を特定
      if (error.message.includes('PERMISSION_DENIED')) {
        return {
          success: false,
          error: '権限エラー: Manager Account IDまたはCustomer IDを確認してください',
          data: null
        }
      } else if (error.message.includes('INVALID_CUSTOMER_ID')) {
        return {
          success: false,
          error: `Customer ID (${config.customerId}) が無効です`,
          data: null
        }
      } else if (error.message.includes('AUTHENTICATION')) {
        return {
          success: false,
          error: '認証エラー: アクセストークンの有効性を確認してください',
          data: null
        }
      }

      return {
        success: false,
        error: error.message || 'APIエラーが発生しました',
        data: null
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
      campaigns?: any
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