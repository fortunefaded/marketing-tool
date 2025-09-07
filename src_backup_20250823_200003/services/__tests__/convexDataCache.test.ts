import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ConvexDataCache } from '../convexDataCache'
import { api } from '../../../convex/_generated/api'

// Mock ConvexReactClient
vi.mock('convex/react')

describe('ConvexDataCache', () => {
  let mockConvexClient: any
  let cache: ConvexDataCache

  beforeEach(() => {
    mockConvexClient = {
      query: vi.fn(),
      mutation: vi.fn(),
    }
    cache = new ConvexDataCache(mockConvexClient)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('saveInsights', () => {
    it('should save insights data to Convex', async () => {
      const accountId = 'test-account-123'
      const insightsData = [
        {
          date_start: '2024-01-01',
          date_stop: '2024-01-01',
          campaign_id: 'campaign-1',
          campaign_name: 'Test Campaign',
          impressions: '1000',
          clicks: '50',
          spend: '100',
          reach: '800',
          frequency: '1.25',
          cpm: '10',
          cpc: '2',
          ctr: '5',
        },
      ]

      mockConvexClient.mutation.mockResolvedValue(undefined)

      await cache.saveInsights(accountId, insightsData)

      expect(mockConvexClient.mutation).toHaveBeenCalledWith(
        api.metaInsights.saveInsights,
        {
          accountId,
          insights: expect.arrayContaining([
            expect.objectContaining({
              accountId,
              date_start: '2024-01-01',
              campaign_id: 'campaign-1',
              impressions: 1000,
              clicks: 50,
              spend: 100,
            }),
          ]),
        }
      )
    })

    it('should handle empty data array', async () => {
      const accountId = 'test-account-123'
      const insightsData: any[] = []

      await cache.saveInsights(accountId, insightsData)

      expect(mockConvexClient.mutation).not.toHaveBeenCalled()
    })
  })

  describe('getInsights', () => {
    it('should retrieve insights data from Convex', async () => {
      const accountId = 'test-account-123'
      const mockData = {
        items: [
          {
            date_start: '2024-01-01',
            campaign_id: 'campaign-1',
            impressions: 1000,
            clicks: 50,
            spend: 100,
          },
        ],
        total: 1,
      }

      mockConvexClient.query.mockResolvedValue(mockData)

      const result = await cache.getInsights(accountId)

      expect(mockConvexClient.query).toHaveBeenCalledWith(
        api.metaInsights.getInsights,
        {
          accountId,
          limit: 10000,
        }
      )
      expect(result).toEqual(mockData.items)
    })

    it('should return empty array when no data exists', async () => {
      const accountId = 'test-account-123'
      mockConvexClient.query.mockResolvedValue(null)

      const result = await cache.getInsights(accountId)

      expect(result).toEqual([])
    })
  })

  describe('clearInsights', () => {
    it('should clear insights data for an account', async () => {
      const accountId = 'test-account-123'

      mockConvexClient.mutation.mockResolvedValue(undefined)

      await cache.clearInsights(accountId)

      expect(mockConvexClient.mutation).toHaveBeenCalledWith(
        api.metaInsights.clearInsights,
        { accountId }
      )
    })
  })

  describe('getSyncStatus', () => {
    it('should retrieve sync status from Convex', async () => {
      const accountId = 'test-account-123'
      const mockStatus = {
        accountId,
        lastFullSync: '2024-01-01T00:00:00Z',
        lastIncrementalSync: '2024-01-02T00:00:00Z',
        totalRecords: 100,
        earliestDate: '2023-12-01',
        latestDate: '2024-01-02',
      }

      mockConvexClient.query.mockResolvedValue(mockStatus)

      const result = await cache.getSyncStatus(accountId)

      expect(mockConvexClient.query).toHaveBeenCalledWith(
        api.metaSyncStatus.getSyncStatus,
        { accountId }
      )
      expect(result).toEqual({
        accountId,
        lastFullSync: '2024-01-01T00:00:00Z',
        lastIncrementalSync: '2024-01-02T00:00:00Z',
        totalRecords: 100,
        dateRange: {
          earliest: '2023-12-01',
          latest: '2024-01-02',
        },
      })
    })

    it('should return null when no sync status exists', async () => {
      const accountId = 'test-account-123'
      mockConvexClient.query.mockResolvedValue(null)

      const result = await cache.getSyncStatus(accountId)

      expect(result).toBeNull()
    })
  })

  describe('updateSyncStatus', () => {
    it('should update sync status in Convex', async () => {
      const accountId = 'test-account-123'
      const status = {
        accountId,
        lastFullSync: '2024-01-01T00:00:00Z',
        lastIncrementalSync: null,
        totalRecords: 50,
        dateRange: {
          earliest: '2023-12-01',
          latest: '2024-01-01',
        },
      }

      mockConvexClient.mutation.mockResolvedValue(undefined)

      await cache.updateSyncStatus(status)

      expect(mockConvexClient.mutation).toHaveBeenCalledWith(
        api.metaSyncStatus.updateSyncStatus,
        {
          accountId,
          lastFullSync: '2024-01-01T00:00:00Z',
          lastIncrementalSync: null,
          totalRecords: 50,
          earliestDate: '2023-12-01',
          latestDate: '2024-01-01',
        }
      )
    })
  })

  describe('getCacheUsage', () => {
    it('should calculate cache usage from Convex data', async () => {
      const accountId = 'test-account-123'
      const mockData = {
        items: [
          { date_start: '2024-01-01', impressions: 1000 },
          { date_start: '2024-01-02', impressions: 2000 },
        ],
        total: 2,
      }

      mockConvexClient.query.mockResolvedValue(mockData)

      const result = await cache.getCacheUsage(accountId)

      expect(result).toEqual({
        sizeKB: expect.any(Number),
        records: 2,
      })
      expect(result.sizeKB).toBeGreaterThan(0)
    })
  })
})