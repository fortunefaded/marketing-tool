import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MetaAPIClientEnhanced } from '../client-enhanced'

// Mock fetch
global.fetch = vi.fn()

// Mock Headers
global.Headers = class Headers {
  private headers: Map<string, string> = new Map()

  constructor(init?: Record<string, string>) {
    if (init) {
      Object.entries(init).forEach(([key, value]) => {
        this.headers.set(key.toLowerCase(), value)
      })
    }
  }

  get(name: string): string | null {
    return this.headers.get(name.toLowerCase()) || null
  }

  set(name: string, value: string): void {
    this.headers.set(name.toLowerCase(), value)
  }
} as any

describe('MetaAPIClient - Enhanced Features', () => {
  let client: MetaAPIClientEnhanced
  const mockFetch = global.fetch as ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    client = new MetaAPIClientEnhanced({
      accessToken: 'test-token',
      accountId: 'act_123456789',
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('Token Management', () => {
    it('should handle token refresh when expired', async () => {
      // First call returns 401 (token expired)
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          error: {
            code: 190,
            message: 'Invalid OAuth access token.',
            type: 'OAuthException',
          },
        }),
      })

      // Second call after refresh succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: [] }),
      })

      const onTokenRefresh = vi.fn().mockResolvedValue('new-token')
      ;(client as any).setTokenRefreshHandler(onTokenRefresh)

      const promise = client.getCampaigns()

      // Advance timers to allow any delays
      await vi.runAllTimersAsync()

      await promise

      expect(onTokenRefresh).toHaveBeenCalled()
      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(mockFetch).toHaveBeenLastCalledWith(
        expect.stringContaining('access_token=new-token'),
        expect.any(Object)
      )
    })

    it('should store and retrieve tokens securely', async () => {
      const tokenStore = (client as any).getTokenStore()

      await tokenStore.set('access_token', 'test-token')
      await tokenStore.set('refresh_token', 'refresh-token')

      expect(await tokenStore.get('access_token')).toBe('test-token')
      expect(await tokenStore.get('refresh_token')).toBe('refresh-token')
    })
  })

  describe('Rate Limiting', () => {
    it('should respect rate limits from headers', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({
          'x-business-use-case-usage': JSON.stringify({
            '123456789': [
              {
                type: 'ads_management',
                call_count: 95,
                total_cputime: 20,
                total_time: 25,
                estimated_time_to_regain_access: 300,
              },
            ],
          }),
        }),
        json: async () => ({ data: [] }),
      })

      const promise1 = client.getCampaigns()
      await vi.runAllTimersAsync()
      await promise1

      // Try to make another call immediately
      // Removed unused startTime
      const promise2 = client.getCampaigns()
      await vi.runAllTimersAsync()
      await promise2
      // Removed unused endTime

      // Should have waited due to rate limit
      expect((client as any).getRateLimitStatus()).toMatchObject({
        callCount: 95,
        isNearLimit: true,
        shouldThrottle: true,
      })
    })

    it('should implement exponential backoff for rate limit errors', async () => {
      // Mock rate limit error
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          json: async () => ({
            error: {
              code: 32,
              message: 'Page request limit reached',
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          json: async () => ({
            error: {
              code: 32,
              message: 'Page request limit reached',
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ data: [] }),
        })

      const promise = client.getCampaigns()

      // Advance timers for retries with exponential backoff
      await vi.advanceTimersByTimeAsync(60000) // 60 seconds for retry-after
      await vi.advanceTimersByTimeAsync(60000) // Another 60 seconds

      const result = await promise

      expect(mockFetch).toHaveBeenCalledTimes(3)
      expect(result).toEqual([])
    })
  })

  describe('Retry Logic', () => {
    it('should retry on network errors', async () => {
      console.log('🔧 Starting retry logic test')

      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers(),
          json: vi.fn().mockResolvedValue({ data: [] }),
        })

      // Start the request
      const requestPromise = client.getCampaigns()

      // Advance timers to handle retry delays
      console.log('🔧 Advancing timers for retry delays')
      await vi.advanceTimersByTimeAsync(5000) // 1000ms + 2000ms + buffer

      const result = await requestPromise

      expect(mockFetch).toHaveBeenCalledTimes(3)
      expect(result).toEqual([])
    })

    it('should not retry on client errors (4xx)', async () => {
      console.log('🔧 Starting 4xx error test')

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        headers: new Headers(),
        json: vi.fn().mockResolvedValue({
          error: {
            message: 'Invalid parameter',
            type: 'OAuthException',
            code: 100,
          },
        }),
      })

      await expect(client.getCampaigns()).rejects.toThrow('Invalid parameter')
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('should implement circuit breaker pattern', async () => {
      console.log('🔧 Starting circuit breaker test')

      // Create client with lower thresholds for faster testing
      client = new MetaAPIClientEnhanced({
        accessToken: 'test-token',
        accountId: 'act_123456789',
        maxRetries: 1, // Reduce retries
        retryDelay: 10, // Reduce delay
        circuitBreakerThreshold: 3, // Lower threshold
      })

      // Simulate multiple failures
      mockFetch.mockRejectedValue(new Error('Service unavailable'))

      // Make several failed requests
      for (let i = 0; i < 3; i++) {
        try {
          await client.getCampaigns()
        } catch {
          // Expected to fail
        }
      }

      // Circuit should be open now - next call should fail fast
      console.log('🔧 Circuit should be open now')
      await expect(client.getCampaigns()).rejects.toThrow('Circuit breaker is open')

      // Verify the expected number of calls (1 retry per request, 3 requests)
      expect(mockFetch).toHaveBeenCalledTimes(3)
    })
  })

  describe('Batch Operations', () => {
    it('should batch multiple requests efficiently', async () => {
      console.log('🔧 Starting batch operations test')

      // Mock batch response
      const batchResponse = [
        { code: 200, body: JSON.stringify({ data: { impressions: 1000, clicks: 50 } }) },
        { code: 200, body: JSON.stringify({ data: { impressions: 2000, clicks: 100 } }) },
        { code: 200, body: JSON.stringify({ data: { impressions: 1500, clicks: 75 } }) },
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: vi.fn().mockResolvedValue(batchResponse),
      })

      console.log('🔧 Making batch request')
      const requests = [
        { relative_url: 'campaign1/insights', method: 'GET' },
        { relative_url: 'campaign2/insights', method: 'GET' },
        { relative_url: 'campaign3/insights', method: 'GET' },
      ]

      const results = await (client as any).batch(requests)
      console.log('🔧 Batch results:', results)

      // Should make single batch request
      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(results).toHaveLength(3)
    }, 10000)
  })

  describe('Caching', () => {
    it('should cache responses with TTL', async () => {
      console.log('🔧 Starting caching test')

      const mockData = { data: [{ id: '1', name: 'Campaign 1' }] }

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: vi.fn().mockResolvedValue(mockData),
      })

      // First call hits the API
      console.log('🔧 Making first cached request')
      const result1 = await client.getCampaigns({ cache: true })
      expect(mockFetch).toHaveBeenCalledTimes(1)

      // Second call uses cache
      console.log('🔧 Making second cached request (should use cache)')
      const result2 = await client.getCampaigns({ cache: true })
      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(result2).toEqual(result1)

      // Advance time past TTL
      console.log('🔧 Advancing time past TTL')
      vi.advanceTimersByTime(6 * 60 * 1000) // 6 minutes

      // Third call hits API again
      console.log('🔧 Making third request (should hit API again)')
      await client.getCampaigns({ cache: true })
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('should invalidate cache on mutations', async () => {
      console.log('🔧 Starting cache invalidation test')

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: vi.fn().mockResolvedValue({ data: [] }),
      })

      // Cache a response
      console.log('🔧 Making initial cached request')
      await client.getCampaigns({ cache: true })
      expect(mockFetch).toHaveBeenCalledTimes(1)

      // Perform a mutation
      console.log('🔧 Performing mutation')
      await (client as any).updateCampaign('1', { name: 'Updated' })

      // Next get should hit API
      console.log('🔧 Making request after mutation (should hit API)')
      await client.getCampaigns({ cache: true })
      expect(mockFetch).toHaveBeenCalledTimes(3)
    })
  })

  describe('Error Handling', () => {
    it('should parse and throw structured errors', async () => {
      console.log('🔧 Starting structured error test')

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        headers: new Headers(),
        json: vi.fn().mockResolvedValue({
          error: {
            message: 'Invalid parameter',
            type: 'OAuthException',
            code: 100,
            error_subcode: 33,
            fbtrace_id: 'trace123',
          },
        }),
      })

      try {
        await client.getCampaigns()
        expect.fail('Should have thrown')
      } catch (error: any) {
        console.log('🔧 Caught structured error:', error)
        expect(error).toBeInstanceOf(Error)
        expect(error.code).toBe(100)
        expect(error.subcode).toBe(33)
        expect(error.type).toBe('OAuthException')
        expect(error.traceId).toBe('trace123')
      }
    })
  })

  describe('Request Monitoring', () => {
    it('should track request metrics', async () => {
      console.log('🔧 Starting metrics tracking test')

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: vi.fn().mockResolvedValue({ data: [] }),
      })

      await client.getCampaigns()

      const metrics = (client as any).getMetrics()
      console.log('🔧 Request metrics:', metrics)

      expect(metrics).toMatchObject({
        totalRequests: 1,
        successfulRequests: 1,
        failedRequests: 0,
        averageResponseTime: expect.any(Number),
        rateLimitHits: 0,
      })
    })

    it('should emit events for monitoring', async () => {
      console.log('🔧 Starting event monitoring test')

      const onRequest = vi.fn()
      const onResponse = vi.fn()
      const onError = vi.fn()

      ;(client as any).on('request', onRequest)
      ;(client as any).on('response', onResponse)
      ;(client as any).on('error', onError)

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: vi.fn().mockResolvedValue({ data: [] }),
      })

      await client.getCampaigns()

      console.log('🔧 Request event calls:', onRequest.mock.calls)
      console.log('🔧 Response event calls:', onResponse.mock.calls)

      expect(onRequest).toHaveBeenCalledWith({
        url: expect.stringContaining('/campaigns'),
        method: 'GET',
      })

      expect(onResponse).toHaveBeenCalledWith({
        url: expect.stringContaining('/campaigns'),
        status: 200,
        duration: expect.any(Number),
      })
    })
  })
})
