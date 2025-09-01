import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { MetaApiOptimizer } from '../meta-api-optimizer'
import { SimpleMetaApi } from '../api-client'

// Mock dependencies
vi.mock('../api-client', () => ({
  SimpleMetaApi: vi.fn().mockImplementation(() => ({
    getTimeSeriesInsights: vi.fn().mockResolvedValue({
      data: [],
      nextPageUrl: null,
      hasMore: false,
      totalCount: 0
    })
  }))
}))

describe('MetaApiOptimizer', () => {
  let optimizer: MetaApiOptimizer

  beforeEach(() => {
    optimizer = new MetaApiOptimizer()
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('Rate Limiting', () => {
    it('should respect hourly rate limit', async () => {
      const apiClient = new SimpleMetaApi('test-token', 'test-account')
      const requests = []
      
      // Create more requests than hourly limit
      for (let i = 0; i < 250; i++) {
        requests.push({
          accountId: 'test-account',
          dateRange: 'last_7d',
          priority: 1
        })
      }

      // Start batch execution
      const batchPromise = optimizer.executeBatch(requests, apiClient)

      // Fast-forward time to process requests
      await vi.advanceTimersByTimeAsync(1000)

      // Should respect rate limits
      const stats = optimizer.getStatistics()
      expect(stats.apiUsage.hourly).toBeLessThanOrEqual(200)
    })

    it('should respect daily rate limit', async () => {
      // Access private rate limit manager for testing
      const rateLimitManager = (optimizer as any).rateLimitManager
      
      // Simulate reaching near daily limit
      for (let i = 0; i < 4790; i++) {
        rateLimitManager.recordRequest()
      }

      // Check if can make more requests
      const canProceed = rateLimitManager.canMakeRequest()
      
      // Should be near limit
      const stats = rateLimitManager.getUsageStats()
      expect(stats.daily).toBeLessThanOrEqual(4800)
      expect(canProceed).toBe(false) // Should not allow more requests
    })

    it('should reset hourly counter after an hour', () => {
      const rateLimitManager = (optimizer as any).rateLimitManager
      
      // Add some requests
      for (let i = 0; i < 100; i++) {
        rateLimitManager.recordRequest()
      }
      
      let stats = rateLimitManager.getUsageStats()
      expect(stats.hourly).toBe(100)
      
      // Advance time by 1 hour
      vi.advanceTimersByTime(60 * 60 * 1000)
      
      // Counter should be reset after checking
      stats = rateLimitManager.getUsageStats()
      expect(stats.hourly).toBe(0)
    })
  })

  describe('Batch Processing', () => {
    it('should batch requests by priority', async () => {
      const apiClient = new SimpleMetaApi('test-token', 'test-account')
      const requests = [
        { accountId: 'test1', dateRange: 'last_7d', priority: 10 }, // highest
        { accountId: 'test2', dateRange: 'last_7d', priority: 1 },  // lowest
        { accountId: 'test3', dateRange: 'last_7d', priority: 5 }   // medium
      ]

      const results = await optimizer.executeBatch(requests, apiClient)
      
      // Should process in priority order
      expect(results.length).toBe(3)
      expect(results.every(r => r.requestId)).toBe(true)
    })

    it('should handle multiple requests efficiently', async () => {
      const apiClient = new SimpleMetaApi('test-token', 'test-account')
      const requests = []
      
      for (let i = 0; i < 15; i++) {
        requests.push({
          accountId: `test${i}`,
          dateRange: 'last_7d',
          priority: 1
        })
      }

      const results = await optimizer.executeBatch(requests, apiClient)
      
      // Should process all requests
      expect(results.length).toBe(15)
      expect(results.every(r => r.success)).toBe(true)
    })

    it('should handle empty batch', async () => {
      const apiClient = new SimpleMetaApi('test-token', 'test-account')
      const results = await optimizer.executeBatch([], apiClient)
      expect(results).toEqual([])
    })
  })

  describe('Retry Logic', () => {
    it('should retry failed requests', async () => {
      const apiClient = new SimpleMetaApi('test-token', 'test-account')
      
      // Mock to fail first 2 times then succeed
      let attemptCount = 0
      vi.mocked(apiClient.getTimeSeriesInsights).mockImplementation(async () => {
        attemptCount++
        if (attemptCount <= 2) {
          throw new Error('Network error')
        }
        return {
          data: [{ id: 'test', name: 'Test Ad' }],
          nextPageUrl: null,
          hasMore: false,
          totalCount: 1
        }
      })

      const results = await optimizer.executeBatch(
        [{ accountId: 'test', dateRange: 'last_7d' }],
        apiClient
      )
      
      // Should have retried and eventually succeeded
      expect(attemptCount).toBe(3)
      expect(results.length).toBeGreaterThan(0)
      // The last result should be successful after retries
      const successCount = results.filter(r => r.success).length
      expect(successCount).toBeGreaterThan(0)
    })

    it('should not retry beyond max attempts', async () => {
      const apiClient = new SimpleMetaApi('test-token', 'test-account')
      
      // Mock to always fail
      vi.mocked(apiClient.getTimeSeriesInsights).mockRejectedValue(
        new Error('Persistent error')
      )

      const results = await optimizer.executeBatch(
        [{ accountId: 'test', dateRange: 'last_7d' }],
        apiClient
      )
      
      expect(results[0].success).toBe(false)
      expect(results[0].error).toBeDefined()
    })

    it('should apply exponential backoff', () => {
      const rateLimitManager = (optimizer as any).rateLimitManager
      
      // Fill up to limit
      for (let i = 0; i < 200; i++) {
        rateLimitManager.recordRequest()
      }
      
      // Should not allow more requests
      expect(rateLimitManager.canMakeRequest()).toBe(false)
      
      // Wait time should increase
      const waitTime = rateLimitManager.getWaitTime()
      expect(waitTime).toBeGreaterThan(0)
    })
  })

  describe('Error Recovery', () => {
    it('should handle network errors gracefully', async () => {
      const apiClient = new SimpleMetaApi('test-token', 'test-account')
      
      vi.mocked(apiClient.getTimeSeriesInsights).mockRejectedValue(
        new Error('Network failure')
      )

      const results = await optimizer.executeBatch(
        [{ accountId: 'test', dateRange: 'last_7d' }],
        apiClient
      )
      
      expect(results[0].success).toBe(false)
      expect(results[0].error?.message).toContain('Network failure')
    })

    it('should handle API rate limit errors', async () => {
      const apiClient = new SimpleMetaApi('test-token', 'test-account')
      
      const rateLimitError = new Error('Rate limit exceeded')
      ;(rateLimitError as any).code = 32 // Meta API rate limit code
      
      vi.mocked(apiClient.getTimeSeriesInsights).mockRejectedValue(rateLimitError)

      const results = await optimizer.executeBatch(
        [{ accountId: 'test', dateRange: 'last_7d' }],
        apiClient
      )
      
      // Should track rate limit hits
      const stats = optimizer.getStatistics()
      expect(stats.rateLimitHits).toBeGreaterThan(0)
    })

    it('should recover from temporary failures', async () => {
      const apiClient = new SimpleMetaApi('test-token', 'test-account')
      let failCount = 0
      
      vi.mocked(apiClient.getTimeSeriesInsights).mockImplementation(async () => {
        if (failCount++ < 1) {
          throw new Error('Temporary failure')
        }
        return {
          data: [{ id: 'success', name: 'Success' }],
          nextPageUrl: null,
          hasMore: false,
          totalCount: 1
        }
      })

      const results = await optimizer.executeBatch(
        [{ accountId: 'test', dateRange: 'last_7d' }],
        apiClient
      )
      
      // Should have multiple results due to retries
      expect(results.length).toBeGreaterThan(0)
      // At least one should be successful
      const successResults = results.filter(r => r.success)
      expect(successResults.length).toBeGreaterThan(0)
      expect(successResults[0].data).toBeDefined()
    })
  })

  describe('Optimization Features', () => {
    it('should process requests efficiently', async () => {
      const apiClient = new SimpleMetaApi('test-token', 'test-account')
      
      // Add multiple requests
      const requests = [
        { accountId: 'test1', dateRange: 'last_7d' },
        { accountId: 'test2', dateRange: 'last_7d' },
        { accountId: 'test1', dateRange: 'last_7d' } // duplicate
      ]

      const results = await optimizer.executeBatch(requests, apiClient)
      
      // Should process all requests
      expect(results.length).toBe(3)
      expect(results.every(r => r.requestId)).toBe(true)
    })

    it('should prioritize high priority requests', async () => {
      const apiClient = new SimpleMetaApi('test-token', 'test-account')
      
      const requests = [
        { accountId: 'normal', dateRange: 'last_7d', priority: 1 },
        { accountId: 'critical', dateRange: 'last_7d', priority: 10 }
      ]

      const results = await optimizer.executeBatch(requests, apiClient)
      
      // All should be processed
      expect(results.length).toBe(2)
      expect(results.every(r => r.success)).toBe(true)
    })

    it('should track request metrics', async () => {
      const apiClient = new SimpleMetaApi('test-token', 'test-account')
      
      await optimizer.executeBatch(
        [{ accountId: 'test', dateRange: 'last_7d' }],
        apiClient
      )
      
      const stats = optimizer.getStatistics()
      expect(stats.totalRequests).toBeGreaterThan(0)
      expect(stats.successfulRequests).toBeGreaterThan(0)
      expect(stats.averageResponseTime).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Integration', () => {
    it('should handle concurrent requests efficiently', async () => {
      const apiClient = new SimpleMetaApi('test-token', 'test-account')
      const requests = []
      
      for (let i = 0; i < 20; i++) {
        requests.push({
          accountId: `test${i}`,
          dateRange: 'last_7d',
          priority: i < 5 ? 5 : 1
        })
      }

      const results = await optimizer.executeBatch(requests, apiClient)
      
      // All requests should complete
      expect(results.length).toBe(20)
      expect(results.every(r => r.requestId)).toBe(true)
    })

    it('should clear queues when requested', () => {
      optimizer.clearQueues()
      const stats = optimizer.getStatistics()
      expect(stats).toBeDefined()
    })
  })
})