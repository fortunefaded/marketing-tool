// Meta API Pagination - TDD Red Phase Tests
// These tests will initially fail until we implement the functionality

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchPaginatedData } from '../pagination'
import { RateLimitManager } from '../rate-limit-manager'
import { analyzeDeliveryPattern } from '../delivery-analyzer'
import type { 
  FetchAdInsightsParams, 
  PaginationOptions, 
  PaginationResult,
  MetaAdInsight 
} from '../../types'

// Mock environment variables
vi.mock('../config/environment', () => ({
  metaApiEnvironment: {
    metaApiBaseUrl: 'https://graph.facebook.com',
    metaApiVersion: 'v23.0',
    metaAccessToken: 'test-access-token',
    pagination: {
      maxPages: 100,
      retryAttempts: 3,
      retryDelayMs: 1000,
    },
    rateLimiting: {
      maxCallsPerHour: 200,
      trackingWindowMs: 3600000,
      backoffMultiplier: 2,
      maxBackoffMs: 30000,
    }
  }
}))

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('Meta API Pagination - Core Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockClear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('fetchPaginatedData - Basic Functionality', () => {
    const mockParams: FetchAdInsightsParams = {
      accountId: '123456789',
      fields: ['ad_id', 'ad_name', 'impressions', 'clicks', 'spend'],
      time_range: { since: '2024-01-01', until: '2024-01-30' },
      level: 'ad',
      limit: 25
    }

    test('should fetch single page data correctly', async () => {
      // Arrange
      const mockResponse = {
        data: [
          {
            ad_id: '12345',
            ad_name: 'Test Ad',
            impressions: '1000',
            clicks: '50',
            spend: '100.00',
            date_start: '2024-01-01',
            date_stop: '2024-01-01'
          }
        ] as MetaAdInsight[],
        paging: undefined // no next page
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      // Act
      const result = await fetchPaginatedData(mockParams)

      // Assert
      expect(result.data).toHaveLength(1)
      expect(result.metadata.totalPages).toBe(1)
      expect(result.metadata.totalItems).toBe(1)
      expect(result.metadata.isComplete).toBe(true)
      expect(result.data[0].ad_id).toBe('12345')
    })

    test('should fetch multiple pages when next exists', async () => {
      // Arrange
      const mockResponses = [
        {
          data: [
            { ad_id: '001', impressions: '1000' },
            { ad_id: '002', impressions: '800' }
          ] as MetaAdInsight[],
          paging: { 
            next: 'https://graph.facebook.com/v23.0/act_123/insights?after=cursor1' 
          }
        },
        {
          data: [
            { ad_id: '003', impressions: '600' },
            { ad_id: '004', impressions: '400' }
          ] as MetaAdInsight[],
          paging: { 
            next: 'https://graph.facebook.com/v23.0/act_123/insights?after=cursor2' 
          }
        },
        {
          data: [
            { ad_id: '005', impressions: '200' }
          ] as MetaAdInsight[],
          paging: undefined // last page
        }
      ]

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponses[0])
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponses[1])
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponses[2])
        })

      // Act
      const result = await fetchPaginatedData(mockParams)

      // Assert
      expect(result.data).toHaveLength(5)
      expect(result.metadata.totalPages).toBe(3)
      expect(result.metadata.totalItems).toBe(5)
      expect(result.metadata.isComplete).toBe(true)
      expect(mockFetch).toHaveBeenCalledTimes(3)
    })

    test('should handle empty dataset gracefully', async () => {
      // Arrange
      const mockResponse = {
        data: [],
        paging: undefined
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      // Act
      const result = await fetchPaginatedData(mockParams)

      // Assert
      expect(result.data).toHaveLength(0)
      expect(result.metadata.totalPages).toBe(1)
      expect(result.metadata.totalItems).toBe(0)
      expect(result.deliveryAnalysis.deliveryPattern).toBe('none')
    })

    test('should respect maxPages limit', async () => {
      // Arrange
      const mockResponse = {
        data: [{ ad_id: '001' }] as MetaAdInsight[],
        paging: { next: 'next-page-url' }
      }

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const options: PaginationOptions = { maxPages: 2 }

      // Act
      const result = await fetchPaginatedData(mockParams, options)

      // Assert
      expect(result.metadata.totalPages).toBeLessThanOrEqual(2)
      expect(result.metadata.isComplete).toBe(false)
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })
  })

  describe('Progress Tracking', () => {
    test('should call onProgress callback for each page', async () => {
      // Arrange
      const progressMock = vi.fn()
      const mockResponse = {
        data: [{ ad_id: '001' }] as MetaAdInsight[],
        paging: { next: 'next-page' }
      }
      const lastResponse = {
        data: [{ ad_id: '002' }] as MetaAdInsight[],
        paging: undefined
      }

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(lastResponse)
        })

      const options: PaginationOptions = { onProgress: progressMock }

      // Act
      await fetchPaginatedData(mockParams, options)

      // Assert
      expect(progressMock).toHaveBeenCalledTimes(2)
      expect(progressMock).toHaveBeenNthCalledWith(1, expect.objectContaining({
        currentPage: 1,
        itemsRetrieved: 1,
        estimatedCompletion: expect.any(Number)
      }))
    })

    test('should calculate estimated completion time', async () => {
      // Arrange
      const progressCallback = vi.fn()
      const mockResponse = {
        data: [{ ad_id: '001' }] as MetaAdInsight[],
        paging: undefined
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      // Act
      await fetchPaginatedData(mockParams, { onProgress: progressCallback })

      // Assert
      const lastCall = progressCallback.mock.calls.slice(-1)[0][0]
      expect(lastCall.estimatedCompletion).toBeGreaterThan(0)
      expect(lastCall.estimatedCompletion).toBeLessThan(Date.now() + 60000) // within 1 minute
    })
  })

  describe('Error Handling', () => {
    test('should retry on network error up to maxRetries', async () => {
      // Arrange
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            data: [{ ad_id: '001' }] as MetaAdInsight[],
            paging: undefined
          })
        })

      const options: PaginationOptions = { retryAttempts: 3 }

      // Act
      const result = await fetchPaginatedData(mockParams, options)

      // Assert
      expect(mockFetch).toHaveBeenCalledTimes(3)
      expect(result.data).toBeDefined()
      expect(result.data).toHaveLength(1)
    })

    test('should fail after exceeding max retries', async () => {
      // Arrange
      mockFetch.mockRejectedValue(new Error('Persistent network error'))

      const options: PaginationOptions = { retryAttempts: 2 }

      // Act & Assert
      await expect(
        fetchPaginatedData(mockParams, options)
      ).rejects.toThrow('Persistent network error')
      expect(mockFetch).toHaveBeenCalledTimes(3) // initial + 2 retries
    })

    test('should wait and retry on 429 error', async () => {
      // Arrange
      const rateLimitError = new Error('Rate limited')
      ;(rateLimitError as any).status = 429

      mockFetch
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            data: [{ ad_id: '001' }] as MetaAdInsight[],
            paging: undefined
          })
        })

      // Act
      const startTime = Date.now()
      const result = await fetchPaginatedData(mockParams)
      const elapsed = Date.now() - startTime

      // Assert
      expect(elapsed).toBeGreaterThan(1000) // waited at least 1 second
      expect(result.data).toBeDefined()
    })

    test('should handle API error responses', async () => {
      // Arrange
      const apiErrorResponse = {
        error: {
          code: 190,
          message: 'Invalid OAuth access token'
        }
      }

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve(apiErrorResponse)
      })

      // Act & Assert
      await expect(
        fetchPaginatedData(mockParams)
      ).rejects.toThrow(/Invalid OAuth access token/)
    })
  })

  describe('Rate Limiting', () => {
    test('should track API calls within time window', () => {
      // Arrange
      const rateLimiter = new RateLimitManager(5, 60000) // 5 calls per minute

      // Act
      for (let i = 0; i < 3; i++) {
        rateLimiter.recordCall()
      }

      // Assert
      expect(rateLimiter.getRemainingCalls()).toBe(2)
      expect(rateLimiter.canMakeCall()).toBe(true)
    })

    test('should prevent calls when limit reached', () => {
      // Arrange
      const rateLimiter = new RateLimitManager(2, 60000)

      // Act
      rateLimiter.recordCall()
      rateLimiter.recordCall()

      // Assert
      expect(rateLimiter.canMakeCall()).toBe(false)
      expect(rateLimiter.getWaitTime()).toBeGreaterThan(0)
    })

    test('should reset calls after time window', () => {
      // Arrange
      const rateLimiter = new RateLimitManager(2, 1000) // 2 calls per second
      
      // Act
      rateLimiter.recordCall()
      rateLimiter.recordCall()
      
      // Fast-forward time
      vi.advanceTimersByTime(1100)
      
      // Assert
      expect(rateLimiter.canMakeCall()).toBe(true)
      expect(rateLimiter.getRemainingCalls()).toBe(2)
    })
  })

  describe('Delivery Analysis', () => {
    test('should analyze continuous delivery pattern', () => {
      // Arrange
      const testData: MetaAdInsight[] = [
        { ad_id: '001', date_start: '2024-01-01', impressions: '1000' } as MetaAdInsight,
        { ad_id: '001', date_start: '2024-01-02', impressions: '800' } as MetaAdInsight,
        { ad_id: '001', date_start: '2024-01-03', impressions: '600' } as MetaAdInsight
      ]

      // Act
      const analysis = analyzeDeliveryPattern(testData, {
        start: '2024-01-01',
        end: '2024-01-03'
      })

      // Assert
      expect(analysis.totalRequestedDays).toBe(3)
      expect(analysis.actualDeliveryDays).toBe(3)
      expect(analysis.deliveryRatio).toBeCloseTo(1.0)
      expect(analysis.deliveryPattern).toBe('continuous')
    })

    test('should analyze intermittent delivery pattern', () => {
      // Arrange
      const testData: MetaAdInsight[] = [
        { ad_id: '001', date_start: '2024-01-01', impressions: '1000' } as MetaAdInsight,
        { ad_id: '001', date_start: '2024-01-03', impressions: '800' } as MetaAdInsight,
        { ad_id: '001', date_start: '2024-01-05', impressions: '600' } as MetaAdInsight
      ]

      // Act
      const analysis = analyzeDeliveryPattern(testData, {
        start: '2024-01-01',
        end: '2024-01-30'
      })

      // Assert
      expect(analysis.totalRequestedDays).toBe(30)
      expect(analysis.actualDeliveryDays).toBe(3)
      expect(analysis.deliveryRatio).toBeCloseTo(0.1)
      expect(analysis.deliveryPattern).toBe('intermittent')
      expect(analysis.firstDeliveryDate).toBe('2024-01-01')
      expect(analysis.lastDeliveryDate).toBe('2024-01-05')
    })

    test('should analyze no delivery pattern', () => {
      // Arrange
      const testData: MetaAdInsight[] = []

      // Act
      const analysis = analyzeDeliveryPattern(testData, {
        start: '2024-01-01',
        end: '2024-01-30'
      })

      // Assert
      expect(analysis.totalRequestedDays).toBe(30)
      expect(analysis.actualDeliveryDays).toBe(0)
      expect(analysis.deliveryRatio).toBe(0)
      expect(analysis.deliveryPattern).toBe('none')
    })
  })

  describe('Data Integrity', () => {
    test('should handle duplicate data across pages', async () => {
      // Arrange
      const mockResponses = [
        {
          data: [
            { ad_id: '001', date_start: '2024-01-01', impressions: '1000' }
          ] as MetaAdInsight[],
          paging: { next: 'page2' }
        },
        {
          data: [
            { ad_id: '001', date_start: '2024-01-01', impressions: '1000' } // duplicate
          ] as MetaAdInsight[],
          paging: undefined
        }
      ]

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponses[0])
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponses[1])
        })

      // Act
      const result = await fetchPaginatedData(mockParams)

      // Assert
      expect(result.data).toHaveLength(1) // deduplicated
      expect(result.metadata.duplicatesRemoved).toBe(1)
    })

    test('should validate data structure consistency', async () => {
      // Arrange
      const mockResponse = {
        data: [
          {
            ad_id: '001',
            impressions: '1000', // valid
            clicks: 'invalid-number', // invalid
            spend: '100.50' // valid
          }
        ] as MetaAdInsight[],
        paging: undefined
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      // Act
      const result = await fetchPaginatedData(mockParams)

      // Assert
      expect(result.data).toHaveLength(1)
      expect(result.metadata.validationErrors).toBeDefined()
      expect(result.metadata.validationErrors.length).toBeGreaterThan(0)
    })
  })

  describe('Performance', () => {
    test('should handle large dataset efficiently', async () => {
      // Arrange
      const largeDataResponse = {
        data: new Array(100).fill(0).map((_, i) => ({
          ad_id: `ad-${i}`,
          impressions: '1000'
        })) as MetaAdInsight[],
        paging: undefined
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(largeDataResponse)
      })

      // Act
      const startTime = Date.now()
      const result = await fetchPaginatedData(mockParams)
      const elapsed = Date.now() - startTime

      // Assert
      expect(result.data).toHaveLength(100)
      expect(elapsed).toBeLessThan(5000) // should complete within 5 seconds
    })

    test('should support request cancellation', async () => {
      // Arrange
      const abortController = new AbortController()
      const mockResponse = {
        data: [{ ad_id: '001' }] as MetaAdInsight[],
        paging: { next: 'next-page' }
      }

      mockFetch.mockImplementation(() => 
        new Promise((resolve) => {
          setTimeout(() => resolve({
            ok: true,
            json: () => Promise.resolve(mockResponse)
          }), 2000)
        })
      )

      const options: PaginationOptions = { 
        signal: abortController.signal 
      }

      // Act
      setTimeout(() => abortController.abort(), 1000)
      
      // Assert
      await expect(
        fetchPaginatedData(mockParams, options)
      ).rejects.toThrow(/abort/)
    })
  })
})

describe('Edge Cases and Boundary Values', () => {
  const mockParams: FetchAdInsightsParams = {
    accountId: '123456789',
    fields: ['ad_id'],
    time_range: { since: '2024-01-01', until: '2024-01-30' },
    level: 'ad'
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('should handle invalid pagination URL', async () => {
    // Arrange
    const mockResponse = {
      data: [{ ad_id: '001' }] as MetaAdInsight[],
      paging: { next: 'invalid-url-format' }
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse)
    })

    // Act & Assert
    await expect(
      fetchPaginatedData(mockParams)
    ).rejects.toThrow(/Invalid pagination URL/)
  })

  test('should handle malformed API response', async () => {
    // Arrange
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ invalid: 'structure' })
    })

    // Act & Assert
    await expect(
      fetchPaginatedData(mockParams)
    ).rejects.toThrow(/Invalid API response format/)
  })

  test('should handle network timeout', async () => {
    // Arrange
    mockFetch.mockImplementation(() => 
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 1000)
      })
    )

    const options: PaginationOptions = { retryAttempts: 1 }

    // Act & Assert
    await expect(
      fetchPaginatedData(mockParams, options)
    ).rejects.toThrow(/Request timeout/)
  })
})