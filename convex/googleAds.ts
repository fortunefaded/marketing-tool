import { v } from 'convex/values'
import { mutation, query, action, internalQuery, internalMutation } from './_generated/server'
import { api } from './_generated/api'

// Google Ads APIバージョンの定数
const GOOGLE_ADS_API_VERSION = 'v21'
const GOOGLE_ADS_API_BASE_URL = `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}`

// ========================================
// 設定管理 Mutations
// ========================================

// Google Ads設定を保存
export const saveConfig = mutation({
  args: {
    clientId: v.string(),
    clientSecret: v.string(),
    developerToken: v.string(),
    customerId: v.string(),
    managerAccountId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('googleAdsConfig')
      .withIndex('by_customer', (q) => q.eq('customerId', args.customerId))
      .first()

    const now = Date.now()

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...args,
        updatedAt: now,
      })
      return existing._id
    } else {
      return await ctx.db.insert('googleAdsConfig', {
        ...args,
        isConnected: false,
        createdAt: now,
        updatedAt: now,
      })
    }
  },
})

// OAuthトークンを保存・更新
export const saveTokens = mutation({
  args: {
    customerId: v.string(),
    accessToken: v.string(),
    refreshToken: v.string(),
    expiresIn: v.number(),
  },
  handler: async (ctx, args) => {
    const config = await ctx.db
      .query('googleAdsConfig')
      .withIndex('by_customer', (q) => q.eq('customerId', args.customerId))
      .first()

    if (!config) {
      throw new Error('設定が見つかりません')
    }

    const now = Date.now()
    const expiresAt = now + (args.expiresIn * 1000)

    await ctx.db.patch(config._id, {
      accessToken: args.accessToken,
      refreshToken: args.refreshToken,
      tokenExpiresAt: expiresAt,
      isConnected: true,
      updatedAt: now,
    })

    return { success: true }
  },
})

// 内部用: OAuthトークンを保存・更新
export const saveTokensInternal = internalMutation({
  args: {
    customerId: v.string(),
    accessToken: v.string(),
    refreshToken: v.string(),
    expiresIn: v.number(),
  },
  handler: async (ctx, args) => {
    const config = await ctx.db
      .query('googleAdsConfig')
      .withIndex('by_customer', (q) => q.eq('customerId', args.customerId))
      .first()

    if (!config) {
      throw new Error('設定が見つかりません')
    }

    const now = Date.now()
    const expiresAt = now + (args.expiresIn * 1000)

    await ctx.db.patch(config._id, {
      accessToken: args.accessToken,
      refreshToken: args.refreshToken,
      tokenExpiresAt: expiresAt,
      isConnected: true,
      updatedAt: now,
    })

    return { success: true }
  },
})

// キャンペーンデータを保存
export const saveCampaign = mutation({
  args: {
    campaignId: v.string(),
    customerId: v.string(),
    campaignName: v.string(),
    status: v.string(),
    budget: v.optional(v.number()),
    biddingStrategy: v.optional(v.string()),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('googleAdsCampaigns')
      .withIndex('by_campaign', (q) => q.eq('campaignId', args.campaignId))
      .first()

    const now = Date.now()

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...args,
        updatedAt: now,
      })
      return { action: 'updated', campaignId: args.campaignId }
    } else {
      await ctx.db.insert('googleAdsCampaigns', {
        ...args,
        createdAt: now,
        updatedAt: now,
      })
      return { action: 'created', campaignId: args.campaignId }
    }
  },
})

// 内部用: キャンペーンデータを保存
export const saveCampaignInternal = internalMutation({
  args: {
    campaignId: v.string(),
    customerId: v.string(),
    campaignName: v.string(),
    status: v.string(),
    budget: v.optional(v.number()),
    biddingStrategy: v.optional(v.string()),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('googleAdsCampaigns')
      .withIndex('by_campaign', (q) => q.eq('campaignId', args.campaignId))
      .first()

    const now = Date.now()

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...args,
        updatedAt: now,
      })
      return { action: 'updated', campaignId: args.campaignId }
    } else {
      await ctx.db.insert('googleAdsCampaigns', {
        ...args,
        createdAt: now,
        updatedAt: now,
      })
      return { action: 'created', campaignId: args.campaignId }
    }
  },
})

// パフォーマンスデータを保存
export const savePerformanceData = mutation({
  args: {
    customerId: v.string(),
    campaignId: v.optional(v.string()),
    adGroupId: v.optional(v.string()),
    date: v.string(),
    impressions: v.number(),
    clicks: v.number(),
    cost: v.number(),
    conversions: v.number(),
    conversionValue: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now()

    // 計算メトリクス（ゼロ除算対策済み）
    const ctr = args.impressions > 0 ? (args.clicks / args.impressions) : 0
    const cpc = args.clicks > 0 ? (args.cost / args.clicks) : 0
    const cpm = args.impressions > 0 ? (args.cost / args.impressions * 1000) : 0
    const conversionRate = args.clicks > 0 ? (args.conversions / args.clicks) : 0
    const costPerConversion = args.conversions > 0 ? (args.cost / args.conversions) : 0

    // 既存レコードを確認
    let query = ctx.db
      .query('googleAdsPerformance')
      .withIndex('by_customer_date', (q) =>
        q.eq('customerId', args.customerId).eq('date', args.date)
      )

    const results = await query.collect()

    const existing = results.find(p => {
      if (args.campaignId && p.campaignId !== args.campaignId) return false
      if (args.adGroupId && p.adGroupId !== args.adGroupId) return false
      return true
    })

    const performanceData = {
      ...args,
      ctr,
      cpc,
      cpm,
      conversionRate,
      costPerConversion,
      fetchedAt: now,
    }

    if (existing) {
      await ctx.db.patch(existing._id, performanceData)
      return { action: 'updated', date: args.date }
    } else {
      await ctx.db.insert('googleAdsPerformance', performanceData)
      return { action: 'created', date: args.date }
    }
  },
})

// 内部用: パフォーマンスデータを保存
export const savePerformanceDataInternal = internalMutation({
  args: {
    customerId: v.string(),
    campaignId: v.optional(v.string()),
    adGroupId: v.optional(v.string()),
    date: v.string(),
    impressions: v.number(),
    clicks: v.number(),
    cost: v.number(),
    conversions: v.number(),
    conversionValue: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now()

    // 計算メトリクス（ゼロ除算対策済み）
    const ctr = args.impressions > 0 ? (args.clicks / args.impressions) : 0
    const cpc = args.clicks > 0 ? (args.cost / args.clicks) : 0
    const cpm = args.impressions > 0 ? (args.cost / args.impressions * 1000) : 0
    const conversionRate = args.clicks > 0 ? (args.conversions / args.clicks) : 0
    const costPerConversion = args.conversions > 0 ? (args.cost / args.conversions) : 0

    // 既存レコードを確認
    let query = ctx.db
      .query('googleAdsPerformance')
      .withIndex('by_customer_date', (q) =>
        q.eq('customerId', args.customerId).eq('date', args.date)
      )

    const results = await query.collect()

    const existing = results.find(p => {
      if (args.campaignId && p.campaignId !== args.campaignId) return false
      if (args.adGroupId && p.adGroupId !== args.adGroupId) return false
      return true
    })

    const performanceData = {
      ...args,
      ctr,
      cpc,
      cpm,
      conversionRate,
      costPerConversion,
      fetchedAt: now,
    }

    if (existing) {
      await ctx.db.patch(existing._id, performanceData)
      return { action: 'updated', date: args.date }
    } else {
      await ctx.db.insert('googleAdsPerformance', performanceData)
      return { action: 'created', date: args.date }
    }
  },
})

// ========================================
// データ取得 Queries
// ========================================

// 接続済み設定を取得
export const getConfig = query({
  args: {},
  handler: async (ctx) => {
    const config = await ctx.db
      .query('googleAdsConfig')
      .withIndex('by_connected', (q) => q.eq('isConnected', true))
      .first()

    return config
  },
})

// 内部用: 接続済み設定を取得
export const getConfigInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    const config = await ctx.db
      .query('googleAdsConfig')
      .withIndex('by_connected', (q) => q.eq('isConnected', true))
      .first()

    return config
  },
})

// Customer IDで設定を取得
export const getConfigByCustomerId = query({
  args: {
    customerId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('googleAdsConfig')
      .withIndex('by_customer', (q) => q.eq('customerId', args.customerId))
      .first()
  },
})

// 内部用: Customer IDで設定を取得
export const getConfigByCustomerIdInternal = internalQuery({
  args: {
    customerId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('googleAdsConfig')
      .withIndex('by_customer', (q) => q.eq('customerId', args.customerId))
      .first()
  },
})

// キャンペーン一覧を取得
export const getCampaigns = query({
  args: {
    customerId: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let results

    if (args.customerId) {
      results = await ctx.db
        .query('googleAdsCampaigns')
        .withIndex('by_customer', (q) => q.eq('customerId', args.customerId!))
        .collect()
    } else {
      results = await ctx.db.query('googleAdsCampaigns').collect()
    }

    if (args.status) {
      return results.filter(c => c.status === args.status)
    }

    return results
  },
})

// パフォーマンスデータを取得
export const getPerformanceData = query({
  args: {
    customerId: v.optional(v.string()),
    startDate: v.string(),
    endDate: v.string(),
    campaignId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let results

    if (args.customerId) {
      results = await ctx.db
        .query('googleAdsPerformance')
        .withIndex('by_customer_date', (q) => q.eq('customerId', args.customerId!))
        .filter((q) =>
          q.and(
            q.gte(q.field('date'), args.startDate),
            q.lte(q.field('date'), args.endDate)
          )
        )
        .collect()
    } else {
      results = await ctx.db
        .query('googleAdsPerformance')
        .filter((q) =>
          q.and(
            q.gte(q.field('date'), args.startDate),
            q.lte(q.field('date'), args.endDate)
          )
        )
        .collect()
    }

    if (args.campaignId) {
      return results.filter(r => r.campaignId === args.campaignId)
    }

    return results
  },
})

// ========================================
// OAuth認証 Actions
// ========================================

// OAuth認証URLを生成
export const generateAuthUrl = action({
  args: {
    clientId: v.string(),
    redirectUri: v.string(),
  },
  handler: async (ctx, args) => {
    const scope = 'https://www.googleapis.com/auth/adwords'
    const baseUrl = 'https://accounts.google.com/o/oauth2/v2/auth'

    const params = new URLSearchParams({
      client_id: args.clientId,
      redirect_uri: args.redirectUri,
      response_type: 'code',
      scope: scope,
      access_type: 'offline',
      prompt: 'consent',
    })

    return `${baseUrl}?${params.toString()}`
  },
})

// OAuth認証コールバック処理
export const handleOAuthCallback = action({
  args: {
    code: v.string(),
    customerId: v.string(),
  },
  handler: async (ctx, args) => {
    // 直接クエリを実行
    const config = await ctx.runQuery(api.googleAds.getConfigByCustomerId, {
      customerId: args.customerId,
    })

    if (!config) {
      throw new Error('設定が見つかりません')
    }

    // トークン交換
    const tokenResponse = await exchangeCodeForTokens(
      args.code,
      config.clientId,
      config.clientSecret,
      'http://localhost:3000/settings/google-ads/callback'
    )

    // トークンを保存
    await ctx.runMutation(api.googleAds.saveTokens, {
      customerId: args.customerId,
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      expiresIn: tokenResponse.expires_in,
    })

    return { success: true }
  },
})

// ========================================
// Google Ads API連携 Actions
// ========================================

// キャンペーンデータを取得
export const fetchCampaigns = action({
  args: {
    customerId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const config = await ctx.runQuery(api.googleAds.getConfig, {})

    if (!config || !config.isConnected) {
      throw new Error('Google Ads未接続')
    }

    const targetCustomerId = args.customerId || config.customerId

    // アクセストークンの確認・更新
    const accessToken = await ensureValidAccessToken(ctx, config)

    // Google Ads APIを呼び出し
    const campaigns = await fetchCampaignsFromAPI(
      accessToken,
      config.developerToken,
      targetCustomerId
    )

    // データベースに保存
    for (const campaign of campaigns) {
      await ctx.runMutation(api.googleAds.saveCampaign, {
        campaignId: campaign.id,
        customerId: targetCustomerId,
        campaignName: campaign.name,
        status: campaign.status,
        budget: campaign.budget_amount_micros ? campaign.budget_amount_micros / 1000000 : undefined,
        biddingStrategy: campaign.bidding_strategy_type,
        startDate: campaign.start_date,
        endDate: campaign.end_date,
      })
    }

    return campaigns
  },
})

// パフォーマンスデータを取得
export const fetchPerformanceData = action({
  args: {
    customerId: v.optional(v.string()),
    startDate: v.string(),
    endDate: v.string(),
    level: v.optional(v.union(
      v.literal('ACCOUNT'),
      v.literal('CAMPAIGN'),
      v.literal('AD_GROUP')
    )),
  },
  handler: async (ctx, args) => {
    const config = await ctx.runQuery(api.googleAds.getConfig, {})

    if (!config || !config.isConnected) {
      throw new Error('Google Ads未接続')
    }

    const targetCustomerId = args.customerId || config.customerId
    const level = args.level || 'CAMPAIGN'

    // アクセストークンの確認・更新
    const accessToken = await ensureValidAccessToken(ctx, config)

    // Google Ads APIを呼び出し
    const performanceData = await fetchPerformanceFromAPI(
      accessToken,
      config.developerToken,
      targetCustomerId,
      args.startDate,
      args.endDate,
      level
    )

    // データベースに保存
    for (const data of performanceData) {
      await ctx.runMutation(api.googleAds.savePerformanceData, {
        customerId: targetCustomerId,
        campaignId: data.campaign_id,
        adGroupId: data.ad_group_id,
        date: data.date,
        impressions: data.impressions || 0,
        clicks: data.clicks || 0,
        cost: data.cost_micros ? data.cost_micros / 1000000 : 0,
        conversions: data.conversions || 0,
        conversionValue: data.conversions_value || 0,
      })
    }

    return performanceData
  },
})

// 接続テスト
export const testConnection = action({
  args: {},
  handler: async (ctx): Promise<{ success: boolean; message: string; customerCount?: number; error?: string }> => {
    const config = await ctx.runQuery(api.googleAds.getConfig, {})

    if (!config) {
      return { success: false, message: 'Google Ads設定が見つかりません' }
    }

    if (!config.isConnected) {
      return { success: false, message: 'Google Adsが接続されていません - OAuth認証を完了してください' }
    }

    if (!config.developerToken) {
      return { success: false, message: 'Developer Tokenが設定されていません' }
    }

    try {
      // アクセストークンの確認・更新
      const accessToken = await ensureValidAccessToken(ctx, config)

      if (!accessToken) {
        return { success: false, message: 'アクセストークンが無効です' }
      }

      console.log('API Call:', {
        url: `${GOOGLE_ADS_API_BASE_URL}/customers:listAccessibleCustomers`,
        method: 'GET',
        hasToken: !!accessToken,
        hasDeveloperToken: !!config.developerToken
      })

      // 正しいエンドポイントを使用
      const response = await fetch(
        `${GOOGLE_ADS_API_BASE_URL}/customers:listAccessibleCustomers`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'developer-token': config.developerToken,
          },
        }
      )

      if (response.ok) {
        const data = await response.json()
        console.log('API Response:', { customerCount: data.resourceNames?.length || 0 })
        return {
          success: true,
          message: '接続成功',
          customerCount: data.resourceNames?.length || 0
        }
      } else {
        const error = await response.text()
        console.error('Google Ads API error:', error)
        return {
          success: false,
          message: `接続失敗: ${response.status} - ${response.statusText}`,
          error: error
        }
      }
    } catch (error: any) {
      console.error('Connection test error:', error)
      return { success: false, message: error.message || '接続エラー' }
    }
  },
})

// ========================================
// ヘルパー関数（非エクスポート）
// ========================================

// アクセストークンの有効性確認と自動更新
async function ensureValidAccessToken(ctx: any, config: any): Promise<string> {
  const now = Date.now()

  // アクセストークンが存在しない場合
  if (!config.accessToken && !config.refreshToken) {
    throw new Error('認証情報がありません。OAuth認証を完了してください。')
  }

  // トークンの有効期限が60秒以上残っている場合はそのまま返す
  if (config.accessToken && config.tokenExpiresAt && config.tokenExpiresAt > now + 60000) {
    return config.accessToken
  }

  // リフレッシュトークンを使用して新しいアクセストークンを取得
  if (!config.refreshToken) {
    throw new Error('リフレッシュトークンがありません。再認証が必要です。')
  }

  console.log('Refreshing access token...')

  try {
    const tokenResponse = await refreshAccessToken(
      config.refreshToken,
      config.clientId,
      config.clientSecret
    )

    // 新しいトークンを保存
    await ctx.runMutation(api.googleAds.saveTokens, {
      customerId: config.customerId,
      accessToken: tokenResponse.access_token,
      refreshToken: config.refreshToken, // リフレッシュトークンは変わらない
      expiresIn: tokenResponse.expires_in,
    })

    console.log('Access token refreshed successfully')
    return tokenResponse.access_token
  } catch (error) {
    console.error('Token refresh failed:', error)
    throw new Error('アクセストークンの更新に失敗しました')
  }
}

// 認証コードをトークンに交換
async function exchangeCodeForTokens(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string
): Promise<any> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`トークン交換失敗: ${response.status} - ${error}`)
  }

  return await response.json()
}

// リフレッシュトークンで新しいアクセストークンを取得
async function refreshAccessToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string
): Promise<any> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`トークン更新失敗: ${response.status} - ${error}`)
  }

  return await response.json()
}

// Google Ads APIからキャンペーンデータを取得
async function fetchCampaignsFromAPI(
  accessToken: string,
  developerToken: string,
  customerId: string
): Promise<any[]> {
  const query = `
    SELECT
      campaign.id,
      campaign.name,
      campaign.status,
      campaign.campaign_budget,
      campaign.bidding_strategy_type,
      campaign.start_date,
      campaign.end_date
    FROM campaign
    WHERE campaign.status != 'REMOVED'
  `

  console.log('Fetching campaigns:', {
    url: `${GOOGLE_ADS_API_BASE_URL}/customers/${customerId}/googleAds:searchStream`,
    customerId,
    hasToken: !!accessToken,
    hasDeveloperToken: !!developerToken
  })

  const response = await fetch(
    `${GOOGLE_ADS_API_BASE_URL}/customers/${customerId}/googleAds:searchStream`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'developer-token': developerToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    }
  )

  if (!response.ok) {
    const error = await response.text()
    console.error('Campaign fetch error:', { status: response.status, error })
    throw new Error(`Failed to fetch campaigns: ${response.statusText} - ${error}`)
  }

  const data = await response.json()
  console.log('Campaigns fetched:', { count: data.results?.length || 0 })
  return data.results?.map((result: any) => result.campaign) || []
}

// Google Ads APIからパフォーマンスデータを取得
async function fetchPerformanceFromAPI(
  accessToken: string,
  developerToken: string,
  customerId: string,
  startDate: string,
  endDate: string,
  level: string
): Promise<any[]> {
  let query = ''

  if (level === 'ACCOUNT') {
    query = `
      SELECT
        segments.date,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.conversions,
        metrics.conversions_value
      FROM customer
      WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
    `
  } else if (level === 'CAMPAIGN') {
    query = `
      SELECT
        campaign.id,
        segments.date,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.conversions,
        metrics.conversions_value
      FROM campaign
      WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
        AND campaign.status != 'REMOVED'
    `
  } else if (level === 'AD_GROUP') {
    query = `
      SELECT
        campaign.id,
        ad_group.id,
        segments.date,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.conversions,
        metrics.conversions_value
      FROM ad_group
      WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
        AND ad_group.status != 'REMOVED'
    `
  }

  console.log('Fetching performance data:', {
    url: `${GOOGLE_ADS_API_BASE_URL}/customers/${customerId}/googleAds:searchStream`,
    level,
    dateRange: `${startDate} to ${endDate}`,
    hasToken: !!accessToken,
    hasDeveloperToken: !!developerToken
  })

  const response = await fetch(
    `${GOOGLE_ADS_API_BASE_URL}/customers/${customerId}/googleAds:searchStream`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'developer-token': developerToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    }
  )

  if (!response.ok) {
    const error = await response.text()
    console.error('Performance data fetch error:', { status: response.status, error })
    throw new Error(`Failed to fetch performance data: ${response.statusText} - ${error}`)
  }

  const data = await response.json()
  console.log('Performance data fetched:', { count: data.results?.length || 0 })
  return data.results?.map((result: any) => ({
    ...result.metrics,
    ...result.segments,
    campaign_id: result.campaign?.id,
    ad_group_id: result.adGroup?.id,
  })) || []
}