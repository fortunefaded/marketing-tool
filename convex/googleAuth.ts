import { v } from 'convex/values'
import { mutation, query, action } from './_generated/server'
import { api } from './_generated/api'

// Google OAuth共通設定
const GOOGLE_OAUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'

// サービスごとのスコープ定義
export const SCOPES = {
  google_ads: [
    'https://www.googleapis.com/auth/adwords',
  ],
  google_sheets: [
    'https://www.googleapis.com/auth/spreadsheets.readonly',
    'https://www.googleapis.com/auth/drive.readonly',
  ],
}

// 暗号化ヘルパー関数（簡易版 - 本番環境では適切な暗号化を使用）
const encrypt = (text: string): string => {
  // Convex環境ではBufferが使えないため、btoa/atobを使用
  // 本番環境では適切な暗号化ライブラリを使用すべき
  try {
    // Base64エンコード（簡易的な難読化のみ）
    return btoa(encodeURIComponent(text))
  } catch (e) {
    // フォールバック: そのまま返す（開発環境用）
    console.warn('Encryption failed, storing as plain text (dev only)')
    return text
  }
}

const decrypt = (encryptedText: string): string => {
  if (!encryptedText || typeof encryptedText !== 'string') {
    return ''
  }

  try {
    // Base64デコード
    const decoded = atob(encryptedText)
    return decodeURIComponent(decoded)
  } catch (e) {
    console.warn('Decrypt failed, assuming plain text:', e)
    // フォールバック: そのまま返す（既に平文の場合）
    return encryptedText
  }
}

// OAuth設定を保存（Client ID/Secret）
export const saveOAuthConfig = mutation({
  args: {
    service: v.union(v.literal('google_ads'), v.literal('google_sheets')),
    clientId: v.string(),
    clientSecret: v.string(),
  },
  handler: async (ctx, args) => {
    // 既存の設定を検索
    const existing = await ctx.db
      .query('googleAuthTokens')
      .filter(q => q.eq(q.field('service'), args.service))
      .first()

    const configData = {
      clientId: args.clientId,
      clientSecret: encrypt(args.clientSecret),
      updatedAt: Date.now(),
    }

    if (existing) {
      // 既存のトークンレコードを更新（トークン情報は保持）
      await ctx.db.patch(existing._id, configData)
      return { success: true, message: '設定を更新しました' }
    } else {
      // 新規作成（設定のみ、トークンなし）
      await ctx.db.insert('googleAuthTokens', {
        service: args.service,
        accessToken: '', // 空文字（後で認証時に更新）
        tokenType: 'Bearer',
        expiresAt: 0,
        scope: '',
        ...configData,
        createdAt: Date.now(),
      })
      return { success: true, message: '設定を保存しました' }
    }
  },
})

// OAuth設定を取得
export const getOAuthConfig = query({
  args: {
    service: v.union(v.literal('google_ads'), v.literal('google_sheets')),
  },
  handler: async (ctx, args) => {
    try {
      const config = await ctx.db
        .query('googleAuthTokens')
        .filter(q => q.eq(q.field('service'), args.service))
        .first()

      if (!config) return null

      return {
        clientId: config.clientId || '',
        hasClientSecret: !!config.clientSecret,
        // Client Secretは返さない（セキュリティのため）
      }
    } catch (error: any) {
      console.error('Error in getOAuthConfig:', error)
      return null
    }
  },
})

// OAuth設定を内部用に取得（Client Secret含む）
export const getOAuthConfigInternal = query({
  args: {
    service: v.union(v.literal('google_ads'), v.literal('google_sheets')),
  },
  handler: async (ctx, args) => {
    try {
      const config = await ctx.db
        .query('googleAuthTokens')
        .filter(q => q.eq(q.field('service'), args.service))
        .first()

      if (!config) return null

      let decryptedClientSecret = null
      if (config.clientSecret) {
        try {
          decryptedClientSecret = decrypt(config.clientSecret)
        } catch (e) {
          console.error('Failed to decrypt client secret for config:', e)
          decryptedClientSecret = config.clientSecret
        }
      }

      return {
        clientId: config.clientId,
        clientSecret: decryptedClientSecret,
      }
    } catch (error: any) {
      console.error('Error in getOAuthConfigInternal:', error)
      return null
    }
  },
})

// 認証トークンを保存
export const saveAuthTokens = mutation({
  args: {
    service: v.union(v.literal('google_ads'), v.literal('google_sheets')),
    accessToken: v.string(),
    refreshToken: v.string(),
    scope: v.string(),
    expiresAt: v.number(),
    clientId: v.string(),
    clientSecret: v.string(),
    tokenType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // 既存のトークンを検索
    const existing = await ctx.db
      .query('googleAuthTokens')
      .filter(q => q.eq(q.field('service'), args.service))
      .first()

    const tokenData = {
      service: args.service,
      accessToken: encrypt(args.accessToken),
      refreshToken: encrypt(args.refreshToken),
      scope: args.scope,
      expiresAt: args.expiresAt,
      clientId: args.clientId,
      clientSecret: encrypt(args.clientSecret),
      tokenType: args.tokenType || 'Bearer',
      updatedAt: Date.now(),
    }

    if (existing) {
      await ctx.db.patch(existing._id, tokenData)
      return existing._id
    } else {
      return await ctx.db.insert('googleAuthTokens', {
        ...tokenData,
        createdAt: Date.now(),
      })
    }
  },
})

// 認証トークンを取得
export const getAuthTokens = query({
  args: {
    service: v.union(v.literal('google_ads'), v.literal('google_sheets')),
  },
  handler: async (ctx, args) => {
    try {
      const tokens = await ctx.db
        .query('googleAuthTokens')
        .filter(q => q.eq(q.field('service'), args.service))
        .first()

      if (!tokens) return null

      // 安全にdecryptを実行
      let decryptedAccessToken = ''
      let decryptedRefreshToken = ''
      let decryptedClientSecret = ''

      try {
        decryptedAccessToken = tokens.accessToken ? decrypt(tokens.accessToken) : ''
      } catch (e) {
        console.error('Failed to decrypt access token:', e)
        decryptedAccessToken = tokens.accessToken || ''
      }

      try {
        decryptedRefreshToken = tokens.refreshToken ? decrypt(tokens.refreshToken) : ''
      } catch (e) {
        console.error('Failed to decrypt refresh token:', e)
        decryptedRefreshToken = tokens.refreshToken || ''
      }

      try {
        decryptedClientSecret = tokens.clientSecret ? decrypt(tokens.clientSecret) : ''
      } catch (e) {
        console.error('Failed to decrypt client secret:', e)
        decryptedClientSecret = tokens.clientSecret || ''
      }

      return {
        ...tokens,
        accessToken: decryptedAccessToken,
        refreshToken: decryptedRefreshToken,
        clientSecret: decryptedClientSecret,
      }
    } catch (error: any) {
      console.error('Error in getAuthTokens:', error)
      // 本番環境では詳細なエラー情報を隠す
      throw new Error('認証情報の取得に失敗しました')
    }
  },
})

// OAuth認証URLを生成
export const generateAuthUrl = action({
  args: {
    service: v.union(v.literal('google_ads'), v.literal('google_sheets')),
    clientId: v.optional(v.string()), // オプショナルに変更（Convexから取得可能）
    redirectUri: v.string(),
    additionalScopes: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args): Promise<string> => {
    // ClientIDを取得（引数優先、なければConvexから）
    let clientId = args.clientId
    if (!clientId) {
      const config = await ctx.runQuery(api.googleAuth.getOAuthConfig, {
        service: args.service,
      })
      if (!config?.clientId) {
        throw new Error('Client IDが設定されていません')
      }
      clientId = config.clientId
    }
    // サービスに応じたスコープを取得
    const baseScopes = SCOPES[args.service] || []
    const allScopes = [...baseScopes, ...(args.additionalScopes || [])]

    // スコープを結合
    const scope = allScopes.join(' ')

    // OAuth URLパラメータ
    const params = new URLSearchParams({
      client_id: clientId!,
      redirect_uri: args.redirectUri,
      response_type: 'code',
      scope,
      access_type: 'offline',
      prompt: 'consent', // 常にリフレッシュトークンを取得
      include_granted_scopes: 'true', // 既存のスコープを保持
    })

    return `${GOOGLE_OAUTH_URL}?${params.toString()}`
  },
})

// 認証コードをトークンに交換
export const exchangeCodeForTokens = action({
  args: {
    code: v.string(),
    clientId: v.optional(v.string()), // オプショナルに変更
    clientSecret: v.optional(v.string()), // オプショナルに変更
    redirectUri: v.string(),
    service: v.union(v.literal('google_ads'), v.literal('google_sheets')),
  },
  handler: async (ctx, args) => {
    // Client IDとSecretを取得（引数優先、なければConvexから）
    let clientId = args.clientId
    let clientSecret = args.clientSecret

    if (!clientId || !clientSecret) {
      const config = await ctx.runQuery(api.googleAuth.getOAuthConfigInternal, {
        service: args.service,
      })
      if (!config || !config.clientId || !config.clientSecret) {
        throw new Error('OAuth設定が見つかりません。先に設定を保存してください。')
      }
      clientId = clientId || config.clientId
      clientSecret = clientSecret || config.clientSecret

      console.log('OAuth Config loaded:', {
        service: args.service,
        hasClientId: !!clientId,
        clientIdLength: clientId?.length,
        hasClientSecret: !!clientSecret,
        clientSecretLength: clientSecret?.length,
      })
    }
    try {
      const response = await fetch(GOOGLE_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          code: args.code,
          client_id: clientId!,
          client_secret: clientSecret!,
          redirect_uri: args.redirectUri,
          grant_type: 'authorization_code',
        }),
      })

      const responseText = await response.text()

      if (!response.ok) {
        console.error('Token exchange failed:', responseText)
        throw new Error(`Token exchange failed: ${response.status}`)
      }

      const tokens = JSON.parse(responseText)
      const expiresAt = Date.now() + ((tokens.expires_in || 3600) * 1000)

      // トークンを保存
      await ctx.runMutation(api.googleAuth.saveAuthTokens, {
        service: args.service,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        scope: tokens.scope || '',
        expiresAt,
        clientId: clientId,
        clientSecret: clientSecret,
      })

      return {
        success: true,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt,
      }
    } catch (error: any) {
      console.error('Error exchanging code for tokens:', error)
      return {
        success: false,
        error: error.message,
      }
    }
  },
})

// アクセストークンをリフレッシュ
export const refreshAccessToken = action({
  args: {
    service: v.union(v.literal('google_ads'), v.literal('google_sheets')),
  },
  handler: async (ctx, args): Promise<{ success: boolean; accessToken?: string; expiresAt?: number; error?: string }> => {
    // 既存のトークンを取得
    const tokens = await ctx.runQuery(api.googleAuth.getAuthTokens, {
      service: args.service,
    })

    if (!tokens) {
      return {
        success: false,
        error: 'No tokens found for service',
      }
    }

    try {
      const response = await fetch(GOOGLE_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          refresh_token: tokens.refreshToken,
          client_id: tokens.clientId,
          client_secret: tokens.clientSecret,
          grant_type: 'refresh_token',
        }),
      })

      const responseText = await response.text()

      if (!response.ok) {
        console.error('Token refresh failed:', responseText)
        return {
          success: false,
          error: `Token refresh failed: ${response.status}`,
        }
      }

      const newTokens = JSON.parse(responseText)
      const expiresAt = Date.now() + ((newTokens.expires_in || 3600) * 1000)

      // 新しいトークンを保存
      await ctx.runMutation(api.googleAuth.saveAuthTokens, {
        service: args.service,
        accessToken: newTokens.access_token,
        refreshToken: tokens.refreshToken, // リフレッシュトークンは変わらない
        scope: tokens.scope,
        expiresAt,
        clientId: tokens.clientId,
        clientSecret: tokens.clientSecret,
      })

      return {
        success: true,
        accessToken: newTokens.access_token,
        expiresAt,
      }
    } catch (error: any) {
      console.error('Error refreshing token:', error)
      return {
        success: false,
        error: error.message,
      }
    }
  },
})

// 有効なアクセストークンを取得（必要に応じてリフレッシュ）
export const getValidAccessToken = action({
  args: {
    service: v.union(v.literal('google_ads'), v.literal('google_sheets')),
  },
  handler: async (ctx, args): Promise<{ success: boolean; accessToken?: string; expiresAt?: number; error?: string }> => {
    // トークンを取得
    const tokens = await ctx.runQuery(api.googleAuth.getAuthTokens, {
      service: args.service,
    })

    if (!tokens) {
      return {
        success: false,
        error: 'No tokens found for service',
      }
    }

    // トークンの有効期限をチェック
    const now = Date.now()
    const bufferTime = 5 * 60 * 1000 // 5分のバッファ

    if (tokens.expiresAt && tokens.expiresAt > now + bufferTime) {
      // トークンはまだ有効
      return {
        success: true,
        accessToken: tokens.accessToken,
        expiresAt: tokens.expiresAt,
      }
    }

    // トークンをリフレッシュ
    console.log(`Refreshing token for ${args.service}...`)
    const refreshResult = await ctx.runAction(api.googleAuth.refreshAccessToken, {
      service: args.service,
    })

    if (refreshResult.success) {
      return {
        success: true,
        accessToken: refreshResult.accessToken!,
        expiresAt: refreshResult.expiresAt!,
      }
    }

    return {
      success: false,
      error: refreshResult.error,
    }
  },
})

// 既存のGoogle Ads設定から認証情報を移行
export const migrateFromGoogleAds = action({
  args: {},
  handler: async (ctx): Promise<{ success: boolean; message?: string; error?: string }> => {
    // Google Ads設定を取得
    const googleAdsConfig = await ctx.runQuery(api.googleAds.getConfig)

    if (!googleAdsConfig || !googleAdsConfig.refreshToken) {
      return {
        success: false,
        error: 'No Google Ads configuration found',
      }
    }

    try {
      // Google Ads認証情報をgoogleAuthTokensに保存
      await ctx.runMutation(api.googleAuth.saveAuthTokens, {
        service: 'google_ads' as const,
        accessToken: googleAdsConfig.accessToken || '',
        refreshToken: googleAdsConfig.refreshToken,
        scope: 'https://www.googleapis.com/auth/adwords',
        expiresAt: googleAdsConfig.tokenExpiresAt || Date.now(),
        clientId: googleAdsConfig.clientId,
        clientSecret: googleAdsConfig.clientSecret,
        tokenType: 'Bearer',
      })

      return {
        success: true,
        message: 'Google Ads credentials migrated successfully',
      }
    } catch (error: any) {
      console.error('Migration error:', error)
      return {
        success: false,
        error: error.message,
      }
    }
  },
})