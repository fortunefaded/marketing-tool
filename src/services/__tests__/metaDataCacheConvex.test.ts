import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MetaDataCacheConvex } from '../metaDataCacheConvex'
import { ConvexClient } from 'convex/browser'

// Convexクライアントのモック
const mockConvexClient = {
  mutation: vi.fn(),
  query: vi.fn(),
} as unknown as ConvexClient

// localStorageのモック
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

describe('MetaDataCacheConvex', () => {
  let cache: MetaDataCacheConvex

  beforeEach(() => {
    vi.clearAllMocks()
    cache = new MetaDataCacheConvex(mockConvexClient)
  })

  describe('saveData', () => {
    it('should save data to Convex in batches', async () => {
      const mockData = Array.from({ length: 150 }, (_, i) => ({
        date_start: `2024-01-${String(i + 1).padStart(2, '0')}`,
        impressions: `${1000 + i}`,
        clicks: `${50 + i}`,
        spend: `${100 + i}`,
        campaign_id: `campaign_${i}`,
        campaign_name: `Campaign ${i}`,
      }))

      await cache.saveData('test-account', mockData)

      // バッチサイズ100で2回呼ばれる
      expect(mockConvexClient.mutation).toHaveBeenCalledTimes(3) // 2 for data + 1 for sync status
      
      // データ保存の確認
      const firstBatch = (mockConvexClient.mutation as any).mock.calls[0]
      expect(firstBatch[1].insights).toHaveLength(100)
      expect(firstBatch[1].strategy).toBe('merge')
      
      const secondBatch = (mockConvexClient.mutation as any).mock.calls[1]
      expect(secondBatch[1].insights).toHaveLength(50)
    })

    it('should update sync status after saving data', async () => {
      const mockData = [{
        date_start: '2024-01-01',
        impressions: '1000',
        clicks: '50',
        spend: '100',
      }]

      await cache.saveData('test-account', mockData)

      // sync status更新の確認
      const syncStatusCall = (mockConvexClient.mutation as any).mock.calls[1]
      expect(syncStatusCall[1]).toMatchObject({
        accountId: 'test-account',
        lastIncrementalSync: expect.any(String),
        totalRecords: 1,
        earliestDate: '2024-01-01',
        latestDate: '2024-01-01',
      })
    })

    it('should handle empty data array', async () => {
      await cache.saveData('test-account', [])
      expect(mockConvexClient.mutation).not.toHaveBeenCalled()
    })

    it('should transform data correctly', async () => {
      const mockData = [{
        date_start: '2024-01-01',
        date_stop: '2024-01-02',
        impressions: '1000',
        clicks: '50',
        spend: '100.50',
        conversions: '5',
        cvr: '10.0',
        cpa: '20.10',
        campaign_id: 'campaign_123',
        campaign_name: 'Test Campaign',
      }]

      await cache.saveData('test-account', mockData)

      const savedData = (mockConvexClient.mutation as any).mock.calls[0][1].insights[0]
      
      expect(savedData).toMatchObject({
        accountId: 'test-account',
        date_start: '2024-01-01',
        date_stop: '2024-01-02',
        impressions: 1000,
        clicks: 50,
        spend: 100.5,
        conversions: 5,
        conversion_rate: 10.0,
        cost_per_conversion: 20.1,
      })
    })
  })

  describe('getData', () => {
    it('should fetch data from Convex', async () => {
      const mockResponse = {
        items: [
          { 
            date_start: '2024-01-01',
            impressions: 1000,
            updatedAt: '2024-01-01T10:00:00Z'
          },
          {
            date_start: '2024-01-02',
            impressions: 2000,
            importedAt: '2024-01-02T10:00:00Z'
          }
        ],
        nextCursor: null,
        hasMore: false,
      }

      ;(mockConvexClient.query as any).mockResolvedValueOnce(mockResponse)

      const result = await cache.getData('test-account', {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      })

      expect(mockConvexClient.query).toHaveBeenCalledWith(
        expect.any(Object),
        {
          accountId: 'test-account',
          startDate: '2024-01-01',
          endDate: '2024-01-31',
          limit: 1000,
          cursor: undefined,
        }
      )

      expect(result).toHaveLength(2)
      expect(result[0].syncedAt).toBe('2024-01-01T10:00:00Z')
      expect(result[1].syncedAt).toBe('2024-01-02T10:00:00Z')
    })

    it('should handle pagination', async () => {
      const mockResponse1 = {
        items: Array(1000).fill({ date_start: '2024-01-01', impressions: 1000 }),
        nextCursor: 'cursor-1',
        hasMore: true,
      }

      const mockResponse2 = {
        items: Array(500).fill({ date_start: '2024-01-02', impressions: 2000 }),
        nextCursor: null,
        hasMore: false,
      }

      ;(mockConvexClient.query as any)
        .mockResolvedValueOnce(mockResponse1)
        .mockResolvedValueOnce(mockResponse2)

      const result = await cache.getData('test-account')

      expect(mockConvexClient.query).toHaveBeenCalledTimes(2)
      expect(result).toHaveLength(1500)
    })

    it('should respect limit option', async () => {
      const mockResponse = {
        items: Array(2000).fill({ date_start: '2024-01-01', impressions: 1000 }),
        nextCursor: 'cursor-1',
        hasMore: true,
      }

      ;(mockConvexClient.query as any).mockResolvedValueOnce(mockResponse)

      const result = await cache.getData('test-account', { limit: 500 })

      expect(result).toHaveLength(500)
      expect(mockConvexClient.query).toHaveBeenCalledTimes(1)
    })
  })

  describe('getSyncStatus', () => {
    it('should fetch sync status from Convex', async () => {
      const mockStatus = {
        accountId: 'test-account',
        lastFullSync: '2024-01-01T00:00:00Z',
        lastIncrementalSync: '2024-01-02T00:00:00Z',
        totalRecords: 1000,
        earliestDate: '2023-01-01',
        latestDate: '2024-01-01',
      }

      ;(mockConvexClient.query as any).mockResolvedValueOnce(mockStatus)

      const result = await cache.getSyncStatus('test-account')

      expect(result).toEqual({
        accountId: 'test-account',
        lastFullSync: '2024-01-01T00:00:00Z',
        lastIncrementalSync: '2024-01-02T00:00:00Z',
        totalRecords: 1000,
        dateRange: {
          earliest: '2023-01-01',
          latest: '2024-01-01',
        },
      })
    })

    it('should handle null status', async () => {
      ;(mockConvexClient.query as any).mockResolvedValueOnce(null)

      const result = await cache.getSyncStatus('test-account')

      expect(result).toBeNull()
    })
  })

  describe('clearData', () => {
    it('should clear account data', async () => {
      await cache.clearData('test-account')

      expect(mockConvexClient.mutation).toHaveBeenCalledWith(
        expect.any(Object),
        { accountId: 'test-account' }
      )
    })
  })

  describe('getDataSize', () => {
    it('should estimate data size', async () => {
      const mockStats = {
        totalRecords: 5000,
        totalSpend: 10000,
      }

      ;(mockConvexClient.query as any).mockResolvedValueOnce(mockStats)

      const result = await cache.getDataSize('test-account')

      expect(result).toEqual({
        sizeKB: 5000, // 1KB per record estimate
        records: 5000,
      })
    })
  })

  describe('findMissingDateRanges', () => {
    it('should find missing date ranges', async () => {
      const mockMissing = [
        { start: '2024-02-01', end: '2024-02-29' },
        { start: '2024-04-01', end: '2024-04-30' },
      ]

      ;(mockConvexClient.query as any).mockResolvedValueOnce(mockMissing)

      const result = await cache.findMissingDateRanges(
        'test-account',
        '2024-01-01',
        '2024-12-31'
      )

      expect(result).toEqual(mockMissing)
    })
  })

  describe('migrateFromLocalStorage', () => {
    it('should migrate data from localStorage to Convex', async () => {
      // LZStringのモック
      vi.doMock('lz-string', () => ({
        decompressFromUTF16: vi.fn().mockReturnValue(JSON.stringify([
          {
            date_start: '2024-01-01',
            impressions: '1000',
            clicks: '50',
            spend: '100',
          },
          {
            date_start: '2024-01-02',
            impressions: '2000',
            clicks: '100',
            spend: '200',
          }
        ]))
      }))

      localStorageMock.getItem.mockReturnValueOnce('compressed-data')

      await MetaDataCacheConvex.migrateFromLocalStorage('test-account', mockConvexClient)

      expect(localStorageMock.getItem).toHaveBeenCalledWith('meta_insights_cache_test-account')
      expect(mockConvexClient.mutation).toHaveBeenCalled()
      
      // データが正しく変換されて保存されたか確認
      const saveCall = (mockConvexClient.mutation as any).mock.calls[0]
      expect(saveCall[1].insights).toHaveLength(2)
    })

    it('should handle missing localStorage data', async () => {
      localStorageMock.getItem.mockReturnValueOnce(null)
      
      const consoleSpy = vi.spyOn(console, 'log')
      
      await MetaDataCacheConvex.migrateFromLocalStorage('test-account', mockConvexClient)

      expect(consoleSpy).toHaveBeenCalledWith('No data found in localStorage')
      expect(mockConvexClient.mutation).not.toHaveBeenCalled()
    })

    it('should handle decompression errors', async () => {
      vi.doMock('lz-string', () => ({
        decompressFromUTF16: vi.fn().mockReturnValue(null)
      }))

      localStorageMock.getItem.mockReturnValueOnce('invalid-compressed-data')

      await MetaDataCacheConvex.migrateFromLocalStorage('test-account', mockConvexClient)

      expect(mockConvexClient.mutation).not.toHaveBeenCalled()
    })
  })
})