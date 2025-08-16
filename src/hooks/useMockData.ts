import { useEffect } from 'react'
import { useMutation } from 'convex/react'
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
    name: 'プロモーション動画広告',
    campaignId: 'camp_002',
    adsetId: 'adset_002',
    creativeType: 'VIDEO' as const,
    thumbnailUrl: 'https://via.placeholder.com/300x200',
    videoUrl: 'https://example.com/video.mp4',
    body: '期間限定キャンペーン実施中',
    title: '今なら最大50%OFF',
    callToActionType: 'SHOP_NOW',
  },
  {
    metaId: 'creative_003',
    name: 'カルーセル広告',
    campaignId: 'camp_003',
    adsetId: 'adset_003',
    creativeType: 'CAROUSEL' as const,
    thumbnailUrl: 'https://via.placeholder.com/300x200',
    body: '人気商品をチェック',
    title: 'おすすめ商品特集',
    callToActionType: 'SEE_MORE',
  },
]

const mockInsights = [
  // Campaign insights
  {
    campaignId: 'camp_001',
    impressions: 150000,
    clicks: 3000,
    spend: 45000,
    conversions: 150,
    revenue: 225000,
    dateStart: '2024-11-01',
    dateStop: '2024-11-01',
  },
  {
    campaignId: 'camp_002',
    impressions: 100000,
    clicks: 5000,
    spend: 30000,
    conversions: 250,
    revenue: 500000,
    dateStart: '2024-11-01',
    dateStop: '2024-11-01',
  },
  {
    campaignId: 'camp_003',
    impressions: 50000,
    clicks: 2000,
    spend: 15000,
    conversions: 80,
    revenue: 120000,
    dateStart: '2024-11-01',
    dateStop: '2024-11-01',
  },
  // Creative insights
  {
    creativeId: 'creative_001',
    impressions: 50000,
    clicks: 1000,
    spend: 15000,
    conversions: 50,
    revenue: 75000,
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

  useEffect(() => {
    const initializeMockData = async () => {
      try {
        // Check if data already exists
        const checkDataKey = 'meta_mock_data_initialized'
        if (localStorage.getItem(checkDataKey)) {
          return
        }

        // Sync mock campaigns
        await syncCampaigns({ campaigns: mockCampaigns })
        
        // Sync mock creatives
        await syncCreatives({ creatives: mockCreatives })
        
        // Save mock insights
        await saveInsights({ insights: mockInsights })

        // Mark as initialized
        localStorage.setItem(checkDataKey, 'true')
        console.log('Mock data initialized successfully')
      } catch (error) {
        console.error('Failed to initialize mock data:', error)
      }
    }

    initializeMockData()
  }, [syncCampaigns, syncCreatives, saveInsights])
}