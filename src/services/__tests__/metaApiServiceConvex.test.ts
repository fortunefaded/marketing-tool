import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MetaApiService } from '../metaApiService'
import { ConvexClient } from 'convex/browser'

// Convexクライアントのモック
const mockConvexClient = {
  mutation: vi.fn(),
  query: vi.fn(),
} as unknown as ConvexClient

// fetchのモック
global.fetch = vi.fn()

describe('MetaApiService with Convex', () => {
  let service: MetaApiService
  
  beforeEach(() => {
    vi.clearAllMocks()
    service = new MetaApiService(
      {
        accessToken: 'test-token',
        accountId: 'test-account-id',
      },
      mockConvexClient
    )
  })

  describe('saveInsightsToConvex', () => {
    it('should save insights to Convex in batches', async () => {
      const mockInsights = Array.from({ length: 250 }, (_, i) => ({
        date_start: '2024-01-01',
        date_stop: '2024-01-01',
        impressions: `${1000 + i}`,
        clicks: `${50 + i}`,
        spend: `${100 + i}`,
        reach: `${500 + i}`,
        frequency: '2.0',
        conversions: `${5 + i}`,
        campaign_id: `campaign_${i}`,
        campaign_name: `Campaign ${i}`,
        cpc: '2.0',
        cpm: '10.0',
        ctr: '5.0',
        cvr: '10.0',
        cpa: '20.0',
      }))

      await service.saveInsightsToConvex(mockInsights)

      // バッチサイズ100で3回呼ばれるはず
      expect(mockConvexClient.mutation).toHaveBeenCalledTimes(3)
      
      // 最初のバッチの確認
      const firstCall = (mockConvexClient.mutation as any).mock.calls[0]
      expect(firstCall[1].insights).toHaveLength(100)
      expect(firstCall[1].strategy).toBe('merge')
      
      // 最後のバッチの確認（50件）
      const lastCall = (mockConvexClient.mutation as any).mock.calls[2]
      expect(lastCall[1].insights).toHaveLength(50)
    })

    it('should transform data correctly before saving', async () => {
      const mockInsights = [{
        date_start: '2024-01-01',
        date_stop: '2024-01-02',
        impressions: '1000',
        clicks: '50',
        spend: '100.50',
        reach: '500',
        frequency: '2.0',
        conversions: '5',
        campaign_id: 'campaign_123',
        campaign_name: 'Test Campaign',
        ad_id: 'ad_456',
        ad_name: 'Test Ad',
        creative_id: 'creative_789',
        creative_name: 'Test Creative',
        creative_type: 'image',
        thumbnail_url: 'https://example.com/thumb.jpg',
        cpc: '2.01',
        cpm: '100.50',
        ctr: '5.0',
        cvr: '10.0',
        cpa: '20.10',
      }]

      await service.saveInsightsToConvex(mockInsights)

      const savedData = (mockConvexClient.mutation as any).mock.calls[0][1].insights[0]
      
      expect(savedData).toMatchObject({
        accountId: 'test-account-id',
        date_start: '2024-01-01',
        date_stop: '2024-01-02',
        impressions: 1000,
        clicks: 50,
        spend: 100.5,
        conversions: 5,
        cpc: 2.01,
        cpm: 100.5,
        ctr: 5.0,
        conversion_rate: 10.0,
        cost_per_conversion: 20.1,
      })
    })

    it('should handle empty insights array', async () => {
      await service.saveInsightsToConvex([])
      expect(mockConvexClient.mutation).not.toHaveBeenCalled()
    })

    it('should handle Convex errors gracefully', async () => {
      const mockInsights = [{
        date_start: '2024-01-01',
        date_stop: '2024-01-01',
        impressions: '1000',
        clicks: '50',
        spend: '100',
        reach: '500',
        frequency: '2.0',
        cpm: '200',
        cpc: '2.0',
        ctr: '5.0',
      }]

      ;(mockConvexClient.mutation as any).mockRejectedValueOnce(
        new Error('Convex error')
      )

      await expect(service.saveInsightsToConvex(mockInsights))
        .rejects.toThrow('Convex error')
    })

    it('should skip save when Convex client is not initialized', async () => {
      const serviceWithoutConvex = new MetaApiService({
        accessToken: 'test-token',
        accountId: 'test-account-id',
      })

      const consoleSpy = vi.spyOn(console, 'warn')
      
      await serviceWithoutConvex.saveInsightsToConvex([{
        date_start: '2024-01-01',
        date_stop: '2024-01-01',
        impressions: '1000',
        clicks: '50',
        spend: '100',
        reach: '500',
        frequency: '2.0',
        cpm: '200',
        cpc: '2.0',
        ctr: '5.0',
      }])

      expect(consoleSpy).toHaveBeenCalledWith(
        'Convex client not initialized, skipping save to Convex'
      )
      expect(mockConvexClient.mutation).not.toHaveBeenCalled()
    })
  })

  describe('saveSyncStatusToConvex', () => {
    it('should save sync status to Convex', async () => {
      const status = {
        lastFullSync: '2024-01-01T00:00:00Z',
        lastIncrementalSync: '2024-01-02T00:00:00Z',
        totalRecords: 1000,
        earliestDate: '2023-01-01',
        latestDate: '2024-01-01',
      }

      await service.saveSyncStatusToConvex(status)

      expect(mockConvexClient.mutation).toHaveBeenCalledWith(
        expect.any(Object), // api.metaInsights.saveSyncStatus
        {
          accountId: 'test-account-id',
          ...status,
        }
      )
    })

    it('should handle partial status updates', async () => {
      await service.saveSyncStatusToConvex({
        lastIncrementalSync: '2024-01-02T00:00:00Z',
        totalRecords: 500,
      })

      expect(mockConvexClient.mutation).toHaveBeenCalledWith(
        expect.any(Object),
        {
          accountId: 'test-account-id',
          lastIncrementalSync: '2024-01-02T00:00:00Z',
          totalRecords: 500,
        }
      )
    })
  })

  describe('getInsightsWithConvexSave', () => {
    beforeEach(() => {
      // getInsights APIレスポンスのモック
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [
            {
              date_start: '2024-01-01',
              date_stop: '2024-01-01',
              impressions: '1000',
              clicks: '50',
              spend: '100',
              actions: [
                { action_type: 'purchase', value: '5' }
              ],
              action_values: [
                { action_type: 'purchase', value: '500' }
              ],
              purchase_roas: [
                { value: '5.0', action_type: 'purchase' }
              ],
              cost_per_action_type: [
                { action_type: 'purchase', value: '20' }
              ],
            }
          ],
          paging: {}
        })
      })
    })

    it('should fetch insights and save to Convex', async () => {
      const insights = await service.getInsightsWithConvexSave(
        '2024-01-01',
        '2024-01-31'
      )

      // データが取得されたか確認
      expect(insights).toHaveLength(1)
      expect(insights[0]).toMatchObject({
        date_start: '2024-01-01',
        impressions: '1000',
        conversions: 5, // MetaDataParserで抽出
        roas: 5.0,
        cpa: 20,
      })

      // Convexに保存されたか確認
      expect(mockConvexClient.mutation).toHaveBeenCalledTimes(2)
      
      // insights保存の確認
      const insightsSaveCall = (mockConvexClient.mutation as any).mock.calls[0]
      expect(insightsSaveCall[1].insights).toHaveLength(1)
      
      // sync status更新の確認
      const statusSaveCall = (mockConvexClient.mutation as any).mock.calls[1]
      expect(statusSaveCall[1]).toMatchObject({
        accountId: 'test-account-id',
        lastIncrementalSync: expect.any(String),
        totalRecords: 1,
        earliestDate: '2024-01-01',
        latestDate: '2024-01-01',
      })
    })

    it('should handle API errors', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: { message: 'Invalid request' }
        })
      })

      await expect(
        service.getInsightsWithConvexSave('2024-01-01', '2024-01-31')
      ).rejects.toThrow('Invalid request')

      // エラー時はConvexに保存されない
      expect(mockConvexClient.mutation).not.toHaveBeenCalled()
    })

    it('should work without Convex client', async () => {
      const serviceWithoutConvex = new MetaApiService({
        accessToken: 'test-token',
        accountId: 'test-account-id',
      })

      const insights = await serviceWithoutConvex.getInsightsWithConvexSave(
        '2024-01-01',
        '2024-01-31'
      )

      expect(insights).toHaveLength(1)
      expect(mockConvexClient.mutation).not.toHaveBeenCalled()
    })
  })
})