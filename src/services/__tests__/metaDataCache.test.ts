import { MetaDataCache } from '../metaDataCache'
import { MetaInsightsData } from '../metaApiService'

describe('MetaDataCache', () => {
  const mockAccountId = 'test-account-123'
  const mockInsightsData: MetaInsightsData[] = [
    {
      dateStart: '2025-07-18',
      dateStop: '2025-07-18',
      spend: '100',
      impressions: '1000',
      clicks: '50',
      reach: '500',
      cpm: '100',
      cpc: '2',
      ctr: '5'
    },
    {
      dateStart: '2025-08-11',
      dateStop: '2025-08-11',
      spend: '200',
      impressions: '2000',
      clicks: '100',
      reach: '1000',
      cpm: '100',
      cpc: '2',
      ctr: '5'
    }
  ]

  beforeEach(() => {
    // localStorageをクリア
    localStorage.clear()
  })

  afterEach(() => {
    // テスト後もクリア
    localStorage.clear()
  })

  describe('clearAccountCache', () => {
    it('アカウントのキャッシュデータを完全に削除する', () => {
      // Given: キャッシュにデータを保存
      MetaDataCache.saveInsights(mockAccountId, mockInsightsData)
      MetaDataCache.saveSyncStatus(mockAccountId, {
        lastFullSync: '2025-08-11T10:00:00Z',
        lastIncrementalSync: '2025-08-11T10:00:00Z',
        totalRecords: 2,
        dateRange: {
          start: '2025-07-18',
          end: '2025-08-11'
        }
      })

      // キャッシュが存在することを確認
      expect(MetaDataCache.getInsights(mockAccountId).length).toBe(2)
      expect(MetaDataCache.getSyncStatus(mockAccountId).totalRecords).toBe(2)

      // When: キャッシュをクリア
      MetaDataCache.clearAccountCache(mockAccountId)

      // Then: キャッシュが完全に削除されていること
      expect(MetaDataCache.getInsights(mockAccountId).length).toBe(0)
      const status = MetaDataCache.getSyncStatus(mockAccountId)
      expect(status.totalRecords).toBe(0)
      expect(status.lastFullSync).toBeNull()
      expect(status.dateRange.earliest).toBeNull()
      expect(status.dateRange.latest).toBeNull()
    })

    it('localStorageから実際にキーが削除される', () => {
      // Given: データを保存
      MetaDataCache.saveInsights(mockAccountId, mockInsightsData)
      MetaDataCache.saveSyncStatus(mockAccountId, {
        lastFullSync: '2025-08-11T10:00:00Z',
        totalRecords: 2
      })
      
      const dataKey = `meta_insights_cache_${mockAccountId}`
      const statusKey = `meta_sync_status_${mockAccountId}`
      
      // キーが存在することを確認
      expect(localStorage.getItem(dataKey)).not.toBeNull()
      expect(localStorage.getItem(statusKey)).not.toBeNull()

      // When: キャッシュをクリア
      MetaDataCache.clearAccountCache(mockAccountId)

      // Then: localStorageからキーが削除されていること
      expect(localStorage.getItem(dataKey)).toBeNull()
      expect(localStorage.getItem(statusKey)).toBeNull()
    })
  })

  describe('getInsights', () => {
    it('キャッシュが存在しない場合は空配列を返す', () => {
      // Given: キャッシュなし
      // When: データを取得
      const insights = MetaDataCache.getInsights(mockAccountId)
      
      // Then: 空配列が返される
      expect(insights).toEqual([])
      expect(insights.length).toBe(0)
    })

    it('保存されたデータを正しく取得できる', () => {
      // Given: データを保存
      MetaDataCache.saveInsights(mockAccountId, mockInsightsData)

      // When: データを取得
      const insights = MetaDataCache.getInsights(mockAccountId)

      // Then: 保存したデータが取得できる
      expect(insights.length).toBe(2)
      expect(insights[0].dateStart).toBe('2025-07-18')
      expect(insights[1].dateStart).toBe('2025-08-11')
    })
  })

  describe('getSyncStatus', () => {
    it('ステータスが存在しない場合はデフォルト値を返す', () => {
      // Given: ステータスなし
      // When: ステータスを取得
      const status = MetaDataCache.getSyncStatus(mockAccountId)

      // Then: デフォルト値が返される
      expect(status).toEqual({
        accountId: mockAccountId,
        lastFullSync: null,
        lastIncrementalSync: null,
        totalRecords: 0,
        dateRange: {
          earliest: null,
          latest: null
        }
      })
    })
  })
})