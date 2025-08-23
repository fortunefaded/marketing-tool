import { EventEmitter } from './event-emitter'
import { ConvexReactClient } from 'convex/react'
import { api } from '../../../convex/_generated/api'

interface TokenConfig {
  appId: string
  appSecret: string
  shortLivedToken?: string
  longLivedToken?: string
  systemUserToken?: string
  expiresAt?: Date
  autoRefresh?: boolean
  refreshThreshold?: number // hours before expiry to refresh
}

interface TokenInfo {
  token: string
  type: 'short' | 'long' | 'system'
  expiresAt?: Date
  scopes?: string[]
  userId?: string
}

export class MetaTokenManagerConvex extends EventEmitter {
  private config: TokenConfig
  private currentToken: TokenInfo | null = null
  private refreshTimer?: NodeJS.Timeout
  private tokenStorage: Map<string, TokenInfo> = new Map()
  private convexClient: ConvexReactClient | null = null

  constructor(config: TokenConfig, convexClient?: ConvexReactClient) {
    super()
    this.config = {
      autoRefresh: true,
      refreshThreshold: 24, // refresh 24 hours before expiry
      ...config,
    }
    this.convexClient = convexClient || null

    this.initialize()
  }

  /**
   * Set Convex client
   */
  setConvexClient(client: ConvexReactClient) {
    this.convexClient = client
  }

  private async initialize() {
    // Load tokens from Convex if available
    if (this.convexClient) {
      await this.loadFromStorage()
    }

    // Load tokens from environment or config
    if (!this.currentToken) {
      if (this.config.systemUserToken) {
        await this.setToken({
          token: this.config.systemUserToken,
          type: 'system',
          // System user tokens don't expire
        })
      } else if (this.config.longLivedToken) {
        await this.setToken({
          token: this.config.longLivedToken,
          type: 'long',
          expiresAt: this.config.expiresAt,
        })
      } else if (this.config.shortLivedToken) {
        // Exchange short-lived token for long-lived token
        await this.exchangeToken(this.config.shortLivedToken)
      }
    }

    // Setup auto-refresh if enabled
    if (this.config.autoRefresh && this.currentToken?.expiresAt) {
      this.setupAutoRefresh()
    }
  }

  /**
   * Get the current valid access token
   */
  async getAccessToken(): Promise<string> {
    if (!this.currentToken) {
      throw new Error('No access token available')
    }

    // Check if token is expired
    if (this.currentToken.expiresAt && new Date() >= this.currentToken.expiresAt) {
      if (this.currentToken.type === 'long') {
        await this.refreshLongLivedToken()
      } else {
        throw new Error('Token expired and cannot be refreshed')
      }
    }

    return this.currentToken.token
  }

  /**
   * Exchange short-lived token for long-lived token
   */
  async exchangeToken(shortLivedToken: string): Promise<TokenInfo> {
    // 開発環境でApp Secretが利用可能な場合（警告付き）
    if (this.config.appSecret && import.meta.env.DEV) {
      logger.warn(
        '⚠️ 開発環境: App Secretを使用してトークンを交換しています。\n' +
          '本番環境では必ずサーバーサイドAPIを使用してください。'
      )

      const url = new URL('https://graph.facebook.com/v23.0/oauth/access_token')
      url.searchParams.append('grant_type', 'fb_exchange_token')
      url.searchParams.append('client_id', this.config.appId)
      url.searchParams.append('client_secret', this.config.appSecret)
      url.searchParams.append('fb_exchange_token', shortLivedToken)

      const response = await fetch(url.toString())
      const data = await response.json()

      if (data.error) {
        throw new Error(`Token exchange failed: ${data.error.message}`)
      }

      const tokenInfo: TokenInfo = {
        token: data.access_token,
        type: 'long',
        expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
      }

      await this.setToken(tokenInfo)
      this.emit('token:exchanged', tokenInfo)

      return tokenInfo
    }

    // 本番環境: サーバーサイドAPIを使用
    try {
      const response = await fetch('/api/meta/exchange-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ shortLivedToken }),
      })

      if (!response.ok) {
        throw new Error('Token exchange failed')
      }

      const data = await response.json()

      const tokenInfo: TokenInfo = {
        token: data.accessToken,
        type: 'long',
        expiresAt: data.expiresIn ? new Date(Date.now() + data.expiresIn * 1000) : undefined,
      }

      await this.setToken(tokenInfo)
      this.emit('token:exchanged', tokenInfo)

      return tokenInfo
    } catch (error) {
      throw new Error(
        `Token exchange failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Refresh long-lived token
   */
  private async refreshLongLivedToken(): Promise<TokenInfo> {
    if (!this.currentToken || this.currentToken.type !== 'long') {
      throw new Error('No long-lived token to refresh')
    }

    const url = new URL('https://graph.facebook.com/v23.0/oauth/access_token')
    url.searchParams.append('grant_type', 'fb_exchange_token')
    url.searchParams.append('client_id', this.config.appId)
    url.searchParams.append('client_secret', this.config.appSecret)
    url.searchParams.append('fb_exchange_token', this.currentToken.token)

    const response = await fetch(url.toString())
    const data = await response.json()

    if (data.error) {
      throw new Error(`Token refresh failed: ${data.error.message}`)
    }

    const tokenInfo: TokenInfo = {
      token: data.access_token,
      type: 'long',
      expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
    }

    await this.setToken(tokenInfo)
    this.emit('token:refreshed', tokenInfo)

    return tokenInfo
  }

  /**
   * Set the current token
   */
  async setToken(tokenInfo: TokenInfo) {
    this.currentToken = tokenInfo
    this.tokenStorage.set(tokenInfo.type, tokenInfo)

    // Save to Convex if available
    if (this.convexClient) {
      try {
        await this.convexClient.mutation(api.tokens.saveToken, {
          tokenType: tokenInfo.type,
          token: tokenInfo.token,
          expiresAt: tokenInfo.expiresAt?.toISOString(),
          scopes: tokenInfo.scopes,
          userId: tokenInfo.userId,
        })
      } catch (error) {
        logger.error('Failed to save token to Convex:', error)
      }
    }

    // Reset auto-refresh
    if (this.config.autoRefresh && tokenInfo.expiresAt) {
      this.setupAutoRefresh()
    }
  }

  /**
   * Setup automatic token refresh
   */
  private setupAutoRefresh() {
    // Clear existing timer
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer)
    }

    if (!this.currentToken?.expiresAt) {
      return
    }

    const expiresAt = this.currentToken.expiresAt.getTime()
    const refreshAt = expiresAt - this.config.refreshThreshold! * 60 * 60 * 1000
    const timeUntilRefresh = refreshAt - Date.now()

    if (timeUntilRefresh > 0) {
      // Prevent 32-bit overflow by capping at 24 days
      const maxTimeout = 24 * 24 * 60 * 60 * 1000 // 24 days in ms
      const actualTimeout = Math.min(timeUntilRefresh, maxTimeout)

      this.refreshTimer = setTimeout(async () => {
        try {
          await this.refreshLongLivedToken()
          this.emit('token:auto-refreshed')
        } catch (error) {
          this.emit('token:refresh-failed', error)
        }
      }, actualTimeout)
    }
  }

  /**
   * Validate token with Meta API
   */
  async validateToken(token?: string): Promise<boolean> {
    const accessToken = token || (await this.getAccessToken())

    const url = new URL('https://graph.facebook.com/v23.0/debug_token')
    url.searchParams.append('input_token', accessToken)
    url.searchParams.append('access_token', `${this.config.appId}|${this.config.appSecret}`)

    try {
      const response = await fetch(url.toString())
      const data = await response.json()

      if (data.data) {
        return data.data.is_valid === true
      }

      return false
    } catch {
      return false
    }
  }

  /**
   * Get token information
   */
  async getTokenInfo(): Promise<{
    isValid: boolean
    type?: string
    expiresAt?: Date
    scopes?: string[]
    userId?: string
  }> {
    if (!this.currentToken) {
      return { isValid: false }
    }

    const accessToken = await this.getAccessToken()
    const url = new URL('https://graph.facebook.com/v23.0/debug_token')
    url.searchParams.append('input_token', accessToken)
    url.searchParams.append('access_token', `${this.config.appId}|${this.config.appSecret}`)

    try {
      const response = await fetch(url.toString())
      const data = await response.json()

      if (data.data) {
        return {
          isValid: data.data.is_valid === true,
          type: this.currentToken.type,
          expiresAt: data.data.expires_at ? new Date(data.data.expires_at * 1000) : undefined,
          scopes: data.data.scopes,
          userId: data.data.user_id,
        }
      }

      return { isValid: false }
    } catch {
      return { isValid: false }
    }
  }

  /**
   * Clear all tokens
   */
  async clearTokens() {
    this.currentToken = null
    this.tokenStorage.clear()

    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer)
    }

    // Clear from Convex
    if (this.convexClient) {
      try {
        await this.convexClient.mutation(api.tokens.clearAllTokens, {})
      } catch (error) {
        logger.error('Failed to clear tokens from Convex:', error)
      }
    }

    this.emit('tokens:cleared')
  }

  /**
   * Load tokens from Convex storage
   */
  async loadFromStorage(): Promise<boolean> {
    if (!this.convexClient) {
      return false
    }

    try {
      // Try to load system user token first (most stable)
      const systemToken = await this.convexClient.query(api.tokens.getToken, {
        tokenType: 'system',
      })

      if (systemToken) {
        const tokenInfo: TokenInfo = {
          token: systemToken.token,
          type: 'system',
          expiresAt: systemToken.expiresAt ? new Date(systemToken.expiresAt) : undefined,
          scopes: systemToken.scopes || undefined,
          userId: systemToken.userId || undefined,
        }
        this.currentToken = tokenInfo
        this.tokenStorage.set('system', tokenInfo)
        return true
      }

      // Try long-lived token
      const longToken = await this.convexClient.query(api.tokens.getToken, {
        tokenType: 'long',
      })

      if (longToken) {
        const tokenInfo: TokenInfo = {
          token: longToken.token,
          type: 'long',
          expiresAt: longToken.expiresAt ? new Date(longToken.expiresAt) : undefined,
          scopes: longToken.scopes || undefined,
          userId: longToken.userId || undefined,
        }

        // Check if expired
        if (!tokenInfo.expiresAt || new Date() < tokenInfo.expiresAt) {
          this.currentToken = tokenInfo
          this.tokenStorage.set('long', tokenInfo)
          return true
        }
      }

      return false
    } catch (error) {
      logger.error('Failed to load tokens from Convex:', error)
      return false
    }
  }

  /**
   * Get remaining time until token expiry
   */
  getTimeUntilExpiry(): number | null {
    if (!this.currentToken?.expiresAt) {
      return null
    }

    const remaining = this.currentToken.expiresAt.getTime() - Date.now()
    return remaining > 0 ? remaining : 0
  }

  /**
   * Check if token will expire soon
   */
  isExpiringSoon(hours = 24): boolean {
    const remaining = this.getTimeUntilExpiry()
    if (remaining === null) {
      return false
    }

    return remaining < hours * 60 * 60 * 1000
  }
}