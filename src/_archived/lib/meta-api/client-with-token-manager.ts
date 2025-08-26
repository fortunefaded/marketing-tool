import { MetaTokenManager } from './token-manager'
import type {
  MetaApiConfig,
  MetaCampaign,
  MetaCreative,
  MetaInsight,
  MetaAdSet,
  MetaAd,
} from './types'

export interface TokenManagedApiConfig extends Omit<MetaApiConfig, 'accessToken' | 'apiVersion'> {
  appId: string
  appSecret: string
  shortLivedToken?: string
  longLivedToken?: string
  systemUserToken?: string
  autoRefreshToken?: boolean
  tokenRefreshThreshold?: number
}

export class MetaApiClientWithTokenManager {
  private tokenManager: MetaTokenManager
  private config: TokenManagedApiConfig
  private baseUrl = 'https://graph.facebook.com'
  private readonly apiVersion = 'v23.0'

  constructor(config: TokenManagedApiConfig) {
    this.config = config

    // Initialize token manager
    this.tokenManager = new MetaTokenManager({
      appId: config.appId,
      appSecret: config.appSecret,
      shortLivedToken: config.shortLivedToken,
      longLivedToken: config.longLivedToken,
      systemUserToken: config.systemUserToken,
      autoRefresh: config.autoRefreshToken ?? true,
      refreshThreshold: config.tokenRefreshThreshold ?? 24,
    })

    // Set up event listeners
    this.tokenManager.on('token:refreshed', (tokenInfo) => {
      logger.debug('Token refreshed successfully', {
        type: tokenInfo.type,
        expiresAt: tokenInfo.expiresAt,
      })
    })

    this.tokenManager.on('token:refresh-failed', (error) => {
      logger.error('Token refresh failed:', error)
    })

    this.tokenManager.on('token:auto-refreshed', () => {
      logger.debug('Token auto-refreshed successfully')
    })
  }

  /**
   * Initialize the client and load tokens from storage
   */
  async initialize(): Promise<void> {
    const loaded = await this.tokenManager.loadFromStorage()
    if (!loaded && !this.config.systemUserToken && !this.config.longLivedToken) {
      throw new Error('No valid token found. Please provide a token in the configuration.')
    }
  }

  /**
   * Get token information
   */
  async getTokenInfo() {
    return this.tokenManager.getTokenInfo()
  }

  /**
   * Check if token is expiring soon
   */
  isTokenExpiringSoon(hours = 24): boolean {
    return this.tokenManager.isExpiringSoon(hours)
  }

  /**
   * Manually refresh the token
   */
  async refreshToken(): Promise<void> {
    const currentToken = await this.tokenManager.getAccessToken()
    await this.tokenManager.exchangeToken(currentToken)
  }

  /**
   * Make an authenticated API request
   */
  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const accessToken = await this.tokenManager.getAccessToken()

    const url = new URL(endpoint, this.baseUrl)
    url.searchParams.append('access_token', accessToken)

    const response = await fetch(url.toString(), {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error?.message || 'API request failed')
    }

    return response.json()
  }

  /**
   * Get campaigns
   */
  async getCampaigns(accountId: string): Promise<MetaCampaign[]> {
    const response = await this.request<{ data: MetaCampaign[] }>(
      `/${this.apiVersion}/act_${accountId}/campaigns`,
      {
        method: 'GET',
      }
    )
    return response.data
  }

  /**
   * Get campaign insights
   */
  async getCampaignInsights(
    campaignId: string,
    params?: {
      datePreset?: string
      timeRange?: { since: string; until: string }
      fields?: string[]
    }
  ): Promise<MetaInsight[]> {
    const url = `/${this.apiVersion}/${campaignId}/insights`
    const queryParams = new URLSearchParams()

    if (params?.datePreset) {
      queryParams.append('date_preset', params.datePreset)
    }

    if (params?.timeRange) {
      queryParams.append('time_range', JSON.stringify(params.timeRange))
    }

    if (params?.fields) {
      queryParams.append('fields', params.fields.join(','))
    }

    const response = await this.request<{ data: MetaInsight[] }>(
      `${url}?${queryParams.toString()}`,
      {
        method: 'GET',
      }
    )

    return response.data
  }

  /**
   * Get creatives
   */
  async getCreatives(accountId: string): Promise<MetaCreative[]> {
    const response = await this.request<{ data: MetaCreative[] }>(
      `/${this.apiVersion}/act_${accountId}/adcreatives`,
      {
        method: 'GET',
      }
    )
    return response.data
  }

  /**
   * Get ad sets
   */
  async getAdSets(accountId: string): Promise<MetaAdSet[]> {
    const response = await this.request<{ data: MetaAdSet[] }>(
      `/${this.apiVersion}/act_${accountId}/adsets`,
      {
        method: 'GET',
      }
    )
    return response.data
  }

  /**
   * Get ads
   */
  async getAds(accountId: string): Promise<MetaAd[]> {
    const response = await this.request<{ data: MetaAd[] }>(
      `/${this.apiVersion}/act_${accountId}/ads`,
      {
        method: 'GET',
      }
    )
    return response.data
  }

  /**
   * Batch request with token management
   */
  async batch(requests: Array<{ method: string; relative_url: string }>): Promise<any[]> {
    const accessToken = await this.tokenManager.getAccessToken()

    const response = await fetch(`${this.baseUrl}/${this.apiVersion}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        access_token: accessToken,
        batch: JSON.stringify(requests),
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error?.message || 'Batch request failed')
    }

    const results = await response.json()
    return results.map((result: any) => {
      if (result.code !== 200) {
        throw new Error(`Batch request failed: ${result.body}`)
      }
      return JSON.parse(result.body)
    })
  }

  /**
   * Clear all tokens
   */
  clearTokens(): void {
    this.tokenManager.clearTokens()
  }

  /**
   * Set a new token
   */
  setToken(token: string, type: 'short' | 'long' | 'system', expiresAt?: Date): void {
    this.tokenManager.setToken({
      token,
      type,
      expiresAt,
    })
  }
}
