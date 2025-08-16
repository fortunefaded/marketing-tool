import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MetaAPIClientEnhanced } from '../client-enhanced'

// Mock fetch
global.fetch = vi.fn()

describe('MetaAPIClientEnhanced - Simple Tests', () => {
  let client: MetaAPIClientEnhanced
  const mockFetch = global.fetch as ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    client = new MetaAPIClientEnhanced({
      accessToken: 'test-token',
      accountId: 'act_123456789',
    })
  })

  it('should initialize correctly', () => {
    expect(client).toBeDefined()
    expect((client as any).config.accessToken).toBe('test-token')
    expect((client as any).config.accountId).toBe('act_123456789')
    expect((client as any).apiVersion).toBe('v23.0')
  })

  it('should make a simple API request', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Map(),
      json: async () => ({ data: [{ id: '1', name: 'Campaign 1' }] }),
    })

    const campaigns = await client.getCampaigns()

    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('https://graph.facebook.com/v23.0/act_123456789/campaigns'),
      expect.any(Object)
    )
    expect(campaigns).toHaveLength(1)
    expect(campaigns[0].name).toBe('Campaign 1')
  })

  it('should handle API errors correctly', async () => {
    // Mock the same error response for all retry attempts
    mockFetch.mockResolvedValue({
      ok: false,
      status: 400,
      headers: new Map(),
      json: async () => ({
        error: {
          message: 'Invalid parameter',
          code: 100,
          type: 'OAuthException',
        },
      }),
    })

    await expect(client.getCampaigns()).rejects.toThrow('Invalid parameter')
    expect(mockFetch).toHaveBeenCalledTimes(1) // Should not retry on 4xx errors
  })

  it('should cache successful GET requests', async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      headers: new Map(),
      json: async () => ({ data: [{ id: '1', name: 'Campaign 1' }] }),
    }

    mockFetch.mockResolvedValueOnce(mockResponse)

    // First call - should hit API
    const result1 = await client.getCampaigns({ cache: true })
    expect(mockFetch).toHaveBeenCalledTimes(1)

    // Second call - should use cache
    const result2 = await client.getCampaigns({ cache: true })
    expect(mockFetch).toHaveBeenCalledTimes(1) // Still 1, not 2

    expect(result1).toEqual(result2)
  })

  it('should store and retrieve tokens', async () => {
    const tokenStore = (client as any).getTokenStore()
    
    await tokenStore.set('access_token', 'new-token')
    const token = await tokenStore.get('access_token')
    
    expect(token).toBe('new-token')
  })

  it('should track request metrics', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Map(),
      json: async () => ({ data: [] }),
    })

    await client.getCampaigns()
    
    const metrics = (client as any).getMetrics()
    expect(metrics.totalRequests).toBe(1)
    expect(metrics.successfulRequests).toBe(1)
    expect(metrics.failedRequests).toBe(0)
  })

  it('should emit events', async () => {
    const onRequest = vi.fn()
    const onResponse = vi.fn()
    
    ;(client as any).on('request', onRequest)
    ;(client as any).on('response', onResponse)

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Map(),
      json: async () => ({ data: [] }),
    })

    await client.getCampaigns()

    expect(onRequest).toHaveBeenCalled()
    expect(onResponse).toHaveBeenCalled()
  })
})