import type { MetaApiConfig, MetaCampaign, MetaCreative, MetaApiError } from './types'
import { EventEmitter } from './event-emitter'

interface RateLimitInfo {
  callCount: number
  cpuTime: number
  totalTime: number
  estimatedTimeToRegainAccess?: number
  isNearLimit: boolean
  shouldThrottle: boolean
}

interface RequestMetrics {
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  averageResponseTime: number
  rateLimitHits: number
  lastRequestTime?: Date
}

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

interface TokenStore {
  get(key: string): Promise<string | null>
  set(key: string, value: string): Promise<void>
  delete(key: string): Promise<void>
}

interface CircuitBreakerState {
  isOpen: boolean
  failures: number
  lastFailureTime: number
  nextAttemptTime: number
}

export interface EnhancedMetaApiConfig extends Omit<MetaApiConfig, 'apiVersion'> {
  maxRetries?: number
  retryDelay?: number
  cacheEnabled?: boolean
  cacheTTL?: number
  rateLimitThreshold?: number
  circuitBreakerThreshold?: number
  circuitBreakerTimeout?: number
}

export class MetaAPIClientEnhanced extends EventEmitter {
  private config: Required<Omit<EnhancedMetaApiConfig, 'apiVersion'>>
  private readonly apiVersion = 'v23.0'
  private baseUrl = 'https://graph.facebook.com'
  private rateLimitInfo: RateLimitInfo = {
    callCount: 0,
    cpuTime: 0,
    totalTime: 0,
    isNearLimit: false,
    shouldThrottle: false,
  }
  private metrics: RequestMetrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    rateLimitHits: 0,
  }
  private cache = new Map<string, CacheEntry<any>>()
  private tokenStore: TokenStore
  private tokenRefreshHandler?: () => Promise<string>
  private circuitBreaker: CircuitBreakerState = {
    isOpen: false,
    failures: 0,
    lastFailureTime: 0,
    nextAttemptTime: 0,
  }
  private batchQueue = new Map<string, Promise<any>>()

  constructor(config: EnhancedMetaApiConfig) {
    super()
    this.config = {
      maxRetries: 3,
      retryDelay: 1000,
      cacheEnabled: true,
      cacheTTL: 5 * 60 * 1000, // 5 minutes
      rateLimitThreshold: 90, // Start throttling at 90% usage
      circuitBreakerThreshold: 5,
      circuitBreakerTimeout: 60000, // 1 minute
      ...config,
    }

    // Initialize in-memory token store
    this.tokenStore = this.createInMemoryTokenStore()
  }

  private createInMemoryTokenStore(): TokenStore {
    const store = new Map<string, string>()
    return {
      async get(key: string): Promise<string | null> {
        return store.get(key) || null
      },
      async set(key: string, value: string): Promise<void> {
        store.set(key, value)
      },
      async delete(key: string): Promise<void> {
        store.delete(key)
      },
    }
  }

  setTokenRefreshHandler(handler: () => Promise<string>): void {
    this.tokenRefreshHandler = handler
  }

  getTokenStore(): TokenStore {
    return this.tokenStore
  }

  getRateLimitStatus(): RateLimitInfo {
    return { ...this.rateLimitInfo }
  }

  getMetrics(): RequestMetrics {
    return { ...this.metrics }
  }

  async validateAccessToken(): Promise<boolean> {
    try {
      // アクセストークンの有効性を確認するために、meエンドポイントを呼び出す
      const response = await this.makeRequest<{ id: string }>('me', {
        fields: 'id',
      })
      return !!response.id
    } catch (error) {
      console.error('Access token validation failed:', error)
      return false
    }
  }

  private async checkCircuitBreaker(): Promise<void> {
    if (this.circuitBreaker.isOpen) {
      if (Date.now() < this.circuitBreaker.nextAttemptTime) {
        throw new Error('Circuit breaker is open')
      }
      // Try to close the circuit
      this.circuitBreaker.isOpen = false
      this.circuitBreaker.failures = 0
    }
  }

  private recordCircuitBreakerFailure(): void {
    this.circuitBreaker.failures++
    this.circuitBreaker.lastFailureTime = Date.now()

    if (this.circuitBreaker.failures >= this.config.circuitBreakerThreshold) {
      this.circuitBreaker.isOpen = true
      this.circuitBreaker.nextAttemptTime = Date.now() + this.config.circuitBreakerTimeout
      this.emit('circuit-breaker-open', {
        failures: this.circuitBreaker.failures,
        nextAttemptTime: new Date(this.circuitBreaker.nextAttemptTime),
      })
    }
  }

  private recordCircuitBreakerSuccess(): void {
    this.circuitBreaker.failures = 0
    if (this.circuitBreaker.isOpen) {
      this.circuitBreaker.isOpen = false
      this.emit('circuit-breaker-closed')
    }
  }

  private async makeRequest<T>(
    endpoint: string,
    params: Record<string, string> = {},
    options: { cache?: boolean; method?: string; body?: any } = {}
  ): Promise<T> {
    await this.checkCircuitBreaker()

    const startTime = Date.now()
    const cacheKey = `${endpoint}:${JSON.stringify(params)}`

    // Check cache
    if (
      options.cache &&
      this.config.cacheEnabled &&
      (options.method === 'GET' || !options.method)
    ) {
      const cached = this.cache.get(cacheKey)
      if (cached && Date.now() - cached.timestamp < cached.ttl) {
        this.emit('cache-hit', { endpoint, params })
        return cached.data
      }
    }

    // Rate limit check
    if (this.rateLimitInfo.shouldThrottle) {
      const delay = Math.max(1000, this.rateLimitInfo.estimatedTimeToRegainAccess || 0)
      console.log(`🔧 Rate limit throttling - waiting ${delay}ms`)
      await new Promise((resolve) => setTimeout(resolve, delay))
    }

    const url = new URL(`${this.baseUrl}/${this.apiVersion}/${endpoint}`)

    // Get current access token
    let accessToken = (await this.tokenStore.get('access_token')) || this.config.accessToken
    url.searchParams.append('access_token', accessToken)

    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value)
    })

    this.metrics.totalRequests++
    this.emit('request', { url: url.toString(), method: options.method || 'GET' })

    let lastError: Error | null = null
    for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => {
          console.log(`🔧 Request timeout for ${endpoint}`)
          controller.abort()
        }, 30000) // 30s timeout

        const response = await fetch(url.toString(), {
          method: options.method || 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          body: options.body ? JSON.stringify(options.body) : undefined,
          signal: controller.signal,
        })

        clearTimeout(timeout)

        // Parse rate limit headers
        this.parseRateLimitHeaders(response.headers)

        const data = await response.json()
        const duration = Date.now() - startTime

        if (!response.ok) {
          // Handle token expiration
          if (response.status === 401 && this.tokenRefreshHandler) {
            const newToken = await this.tokenRefreshHandler()
            await this.tokenStore.set('access_token', newToken)
            accessToken = newToken
            url.searchParams.set('access_token', newToken)
            continue // Retry with new token
          }

          // Handle rate limiting
          if (response.status === 429) {
            this.metrics.rateLimitHits++
            const retryAfter = parseInt(response.headers.get('Retry-After') || '60')
            await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000))
            continue
          }

          // Don't retry client errors
          if (response.status >= 400 && response.status < 500) {
            const error = this.createStructuredError(data.error)
            throw error
          }

          throw new Error(data.error?.message || 'API request failed')
        }

        // Success
        this.metrics.successfulRequests++
        this.updateAverageResponseTime(duration)
        this.recordCircuitBreakerSuccess()

        this.emit('response', {
          url: url.toString(),
          status: response.status,
          duration,
        })

        // Cache successful GET responses
        if (
          options.cache &&
          this.config.cacheEnabled &&
          (options.method === 'GET' || !options.method)
        ) {
          this.cache.set(cacheKey, {
            data,
            timestamp: Date.now(),
            ttl: this.config.cacheTTL,
          })
        }

        return data
      } catch (error) {
        lastError = error as Error
        this.emit('error', { error, attempt })

        // Don't retry certain errors
        if (error instanceof Error && error.message.includes('Circuit breaker')) {
          throw error
        }

        // Don't retry client errors (4xx)
        if (error instanceof Error && (error as any).code !== undefined) {
          throw error
        }

        // Exponential backoff
        if (attempt < this.config.maxRetries - 1) {
          const delay = this.config.retryDelay * Math.pow(2, attempt)
          await new Promise((resolve) => setTimeout(resolve, delay))
        }
      }
    }

    this.metrics.failedRequests++
    this.recordCircuitBreakerFailure()
    throw lastError || new Error('Request failed after retries')
  }

  private parseRateLimitHeaders(headers: Headers): void {
    if (!headers || !headers.get) {
      console.log('🔧 No headers or headers.get method available')
      return
    }

    const usageHeader = headers.get('x-business-use-case-usage')
    if (!usageHeader) return

    try {
      const usage = JSON.parse(usageHeader)
      const accountUsage = usage[this.config.accountId.replace('act_', '')]

      if (accountUsage && accountUsage.length > 0) {
        const adsUsage = accountUsage.find((u: any) => u.type === 'ads_management')
        if (adsUsage) {
          this.rateLimitInfo = {
            callCount: adsUsage.call_count,
            cpuTime: adsUsage.total_cputime,
            totalTime: adsUsage.total_time,
            estimatedTimeToRegainAccess: adsUsage.estimated_time_to_regain_access,
            isNearLimit: adsUsage.call_count >= this.config.rateLimitThreshold,
            shouldThrottle: adsUsage.call_count >= this.config.rateLimitThreshold,
          }
        }
      }
    } catch {
      // Ignore parsing errors
    }
  }

  private createStructuredError(error: MetaApiError): Error & {
    code?: number
    subcode?: number
    type?: string
    traceId?: string
  } {
    const err = new Error(error.message) as any
    err.code = error.code
    err.subcode = (error as any).error_subcode || (error as any).subcode
    err.type = error.type
    err.traceId = error.fbtrace_id
    return err
  }

  private updateAverageResponseTime(duration: number): void {
    const total =
      this.metrics.averageResponseTime * (this.metrics.successfulRequests - 1) + duration
    this.metrics.averageResponseTime = total / this.metrics.successfulRequests
    this.metrics.lastRequestTime = new Date()
  }

  // Invalidate cache on mutations
  private invalidateCache(pattern?: string): void {
    if (pattern) {
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key)
        }
      }
    } else {
      this.cache.clear()
    }
  }

  // Enhanced API methods with caching and options
  async getCampaigns(options: { cache?: boolean } = {}): Promise<MetaCampaign[]> {
    const response = await this.makeRequest<{ data: MetaCampaign[] }>(
      `${this.config.accountId}/campaigns`,
      {
        fields:
          'id,account_id,name,objective,status,daily_budget,lifetime_budget,start_time,stop_time',
      },
      { cache: options.cache !== false }
    )

    return (
      response.data?.map((campaign) => ({
        ...campaign,
        insights: { data: [] },
      })) || []
    )
  }

  async getCampaignInsights(campaignId: string): Promise<any> {
    console.log(`🔧 getCampaignInsights called for ${campaignId}`)

    // Check if there's already a batch request for insights
    const batchKey = `insights:${campaignId}`

    if (this.batchQueue.has(batchKey)) {
      console.log(`🔧 Returning existing batch promise for ${campaignId}`)
      return this.batchQueue.get(batchKey)
    }

    // Create batch promise
    const batchPromise = new Promise((resolve, reject) => {
      ;(async () => {
        try {
          console.log(`🔧 Creating new batch promise for ${campaignId}`)

          // Wait a bit to collect more requests
          await new Promise((r) => setTimeout(r, 50))

          // Collect all pending insight requests
          const pendingIds = Array.from(this.batchQueue.keys())
            .filter((k) => k.startsWith('insights:'))
            .map((k) => k.replace('insights:', ''))

          console.log(`🔧 Pending IDs for batch: ${pendingIds.join(', ')}`)

          if (pendingIds.length > 1) {
            console.log(`🔧 Making batch request for ${pendingIds.length} insights`)
            // Make batch request
            const batch = pendingIds.map((id) => ({
              method: 'GET',
              relative_url: `${id}/insights?fields=impressions,clicks,spend,conversions,revenue`,
            }))

            const response = await this.makeRequest<any>(
              '',
              { batch: JSON.stringify(batch) },
              { method: 'POST' }
            )

            console.log(`🔧 Batch response received:`, response)

            // Resolve individual promises - FIXED: resolve all promises, not just one
            response.forEach((res: any, index: number) => {
              const currentId = pendingIds[index]
              const currentKey = `insights:${currentId}`
              console.log(`🔧 Processing batch result for ${currentId}`)

              if (currentId === campaignId) {
                resolve(JSON.parse(res.body))
              }

              // Clean up this specific entry
              this.batchQueue.delete(currentKey)
            })
          } else {
            console.log(`🔧 Making single request for ${campaignId}`)
            // Single request
            const response = await this.makeRequest<any>(`${campaignId}/insights`, {
              fields: 'impressions,clicks,spend,conversions,revenue',
            })
            console.log(`🔧 Single request response:`, response)
            resolve(response)

            // Clean up
            this.batchQueue.delete(batchKey)
          }
        } catch (error) {
          console.error(`🔧 Error in batch promise for ${campaignId}:`, error)
          this.batchQueue.delete(batchKey)
          reject(error)
        }
      })()
    })

    this.batchQueue.set(batchKey, batchPromise)
    console.log(`🔧 Batch promise set for ${campaignId}`)
    return batchPromise
  }

  async updateCampaign(campaignId: string, updates: Partial<MetaCampaign>): Promise<void> {
    await this.makeRequest(
      campaignId,
      {},
      {
        method: 'POST',
        body: updates,
      }
    )

    // Invalidate campaign-related cache
    this.invalidateCache('campaigns')
    this.invalidateCache(campaignId)
  }

  // Original methods remain the same...
  async getCampaignWithInsights(campaignId: string): Promise<MetaCampaign> {
    const [campaign, insights] = await Promise.all([
      this.makeRequest<MetaCampaign>(campaignId, {
        fields:
          'id,account_id,name,objective,status,daily_budget,lifetime_budget,start_time,stop_time',
      }),
      this.makeRequest<{ data: MetaCampaign['insights']['data'] }>(`${campaignId}/insights`, {
        fields: 'impressions,clicks,spend,conversions,revenue,date_start,date_stop',
        time_range: JSON.stringify({ since: '2024-01-01', until: '2024-12-31' }),
      }),
    ])

    return {
      ...campaign,
      insights: insights,
    }
  }

  async getCreativesByCampaign(campaignId: string): Promise<MetaCreative[]> {
    const response = await this.makeRequest<{ data: MetaCreative[] }>(
      `${campaignId}/ads`,
      {
        fields:
          'id,name,campaign_id,adset_id,creative.fields(id,name,object_type,thumbnail_url,video_url,body,title,call_to_action_type)',
      },
      { cache: true }
    )

    return response.data.map((ad) => {
      const adData = ad as any
      return {
        id: adData.creative?.id || adData.id,
        name: adData.creative?.name || adData.name,
        campaign_id: adData.campaign_id,
        adset_id: adData.adset_id,
        creative_type: this.mapCreativeType(adData.creative?.object_type),
        thumbnail_url: adData.creative?.thumbnail_url,
        video_url: adData.creative?.video_url,
        body: adData.creative?.body,
        title: adData.creative?.title,
        call_to_action_type: adData.creative?.call_to_action_type,
        insights: { data: [] },
      }
    })
  }

  async getCreativeWithInsights(creativeId: string): Promise<MetaCreative> {
    const [creative, insights] = await Promise.all([
      this.makeRequest<MetaCreative>(creativeId, {
        fields:
          'id,name,campaign_id,adset_id,object_type,thumbnail_url,video_url,body,title,call_to_action_type',
      }),
      this.makeRequest<{ data: MetaCreative['insights']['data'] }>(`${creativeId}/insights`, {
        fields: 'creative_id,impressions,clicks,spend,conversions,revenue,date_start,date_stop',
        time_range: JSON.stringify({ since: '2024-01-01', until: '2024-12-31' }),
      }),
    ])

    return {
      ...creative,
      creative_type: this.mapCreativeType((creative as any).object_type),
      insights: insights,
    }
  }

  private mapCreativeType(objectType?: string): MetaCreative['creative_type'] {
    switch (objectType?.toUpperCase()) {
      case 'VIDEO':
        return 'VIDEO'
      case 'CAROUSEL':
        return 'CAROUSEL'
      default:
        return 'IMAGE'
    }
  }
}
