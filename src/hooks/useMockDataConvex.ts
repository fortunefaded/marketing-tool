import { useEffect } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'

// Mock data for development
const mockCampaigns = [
  {
    metaId: 'camp_001',
    accountId: 'act_123456789',
    name: 'ブランド認知キャンペーン',
    objective: 'BRAND_AWARENESS',
    status: 'ACTIVE' as const,
    dailyBudget: 50000,
    lifetimeBudget: 1500000,
    startTime: '2024-01-01T00:00:00Z',
    stopTime: '2024-12-31T23:59:59Z',
  },
  {
    metaId: 'camp_002',
    accountId: 'act_123456789',
    name: 'コンバージョン最適化キャンペーン',
    objective: 'CONVERSIONS',
    status: 'ACTIVE' as const,
    dailyBudget: 30000,
    startTime: '2024-02-01T00:00:00Z',
  },
  {
    metaId: 'camp_003',
    accountId: 'act_123456789',
    name: 'トラフィック誘導キャンペーン',
    objective: 'TRAFFIC',
    status: 'PAUSED' as const,
    dailyBudget: 20000,
    startTime: '2024-03-01T00:00:00Z',
  },
]

const mockCreatives = [
  {
    metaId: 'creative_001',
    name: 'ブランドイメージ広告 A',
    campaignId: 'camp_001',
    adsetId: 'adset_001',
    creativeType: 'IMAGE' as const,
    thumbnailUrl: 'https://via.placeholder.com/300x200',
    body: '新しいブランド体験をお届けします',
    title: 'ブランド名 - 新商品発売',
    callToActionType: 'LEARN_MORE',
  },
  {
    metaId: 'creative_002',
    name: '動画広告 - 商品紹介',
    campaignId: 'camp_002',
    adsetId: 'adset_002',
    creativeType: 'VIDEO' as const,
    thumbnailUrl: 'https://via.placeholder.com/400x300',
    body: '今なら特別価格でご提供中',
    title: '期間限定セール実施中',
    callToActionType: 'SHOP_NOW',
  },
  {
    metaId: 'creative_003',
    name: 'カルーセル広告 - 商品ラインナップ',
    campaignId: 'camp_003',
    adsetId: 'adset_003',
    creativeType: 'CAROUSEL' as const,
    thumbnailUrl: 'https://via.placeholder.com/350x250',
    body: '豊富な商品ラインナップをご覧ください',
    title: '新作コレクション',
    callToActionType: 'SEE_MORE',
  },
]

const mockInsights = [
  {
    creativeId: 'creative_001',
    impressions: 150000,
    clicks: 4500,
    spend: 30000,
    conversions: 135,
    revenue: 405000,
    dateStart: '2024-11-01',
    dateStop: '2024-11-01',
  },
  {
    creativeId: 'creative_002',
    impressions: 70000,
    clicks: 3500,
    spend: 20000,
    conversions: 175,
    revenue: 350000,
    dateStart: '2024-11-01',
    dateStop: '2024-11-01',
  },
  {
    creativeId: 'creative_003',
    impressions: 30000,
    clicks: 1200,
    spend: 10000,
    conversions: 48,
    revenue: 72000,
    dateStart: '2024-11-01',
    dateStop: '2024-11-01',
  },
]

export function useMockDataInitializer() {
  const syncCampaigns = useMutation(api.metaSync.syncMetaCampaigns)
  const syncCreatives = useMutation(api.functions.metaSync.syncMetaCreatives)
  const saveInsights = useMutation(api.metaSync.saveMetaInsights)
  
  // Convexのメモリーから初期化状態を確認
  const initStatus = useQuery(api.memories.get, { key: 'meta_mock_data_initialized' })
  const setMemory = useMutation(api.memories.set)

  useEffect(() => {
    const initializeMockData = async () => {
      try {
        // Check if data already exists
        if (initStatus?.value === 'true') {
          return
        }

        // Sync mock campaigns
        await syncCampaigns({ campaigns: mockCampaigns })

        // Sync mock creatives
        await syncCreatives({ creatives: mockCreatives })

        // Save mock insights
        await saveInsights({ insights: mockInsights })

        // Mark as initialized in Convex
        await setMemory({
          key: 'meta_mock_data_initialized',
          value: 'true',
        })
        
        logger.debug('Mock data initialized successfully')
      } catch (error) {
        logger.error('Failed to initialize mock data:', error)
      }
    }

    // initStatusがundefinedでない（クエリが完了している）場合のみ実行
    if (initStatus !== undefined) {
      initializeMockData()
    }
  }, [syncCampaigns, syncCreatives, saveInsights, setMemory, initStatus])
}