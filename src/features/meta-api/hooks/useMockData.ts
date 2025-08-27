import { AdInsight } from '@/types'

export function generateMockInsights(count: number = 50): AdInsight[] {
  const campaigns = [
    { id: '1001', name: '【8食2,980円】ASC複製2' },
    { id: '1002', name: '新規顧客獲得キャンペーン' },
    { id: '1003', name: '既存顧客リテンション' }
  ]
  
  const adsets = [
    { id: '2001', name: '既存顧客類似1-3%' },
    { id: '2002', name: '興味関心ターゲティング' },
    { id: '2003', name: 'リマーケティング' }
  ]
  
  const mockData: AdInsight[] = []
  
  for (let i = 0; i < count; i++) {
    const campaign = campaigns[i % campaigns.length]
    const adset = adsets[i % adsets.length]
    
    mockData.push({
      ad_id: `ad_${i + 1}`,
      ad_name: `広告 ${i + 1}`,
      campaign_id: campaign.id,
      campaign_name: campaign.name,
      adset_id: adset.id,
      adset_name: adset.name,
      impressions: Math.floor(Math.random() * 100000) + 10000,
      clicks: Math.floor(Math.random() * 1000) + 100,
      spend: Math.random() * 10000 + 1000,
      reach: Math.floor(Math.random() * 50000) + 5000,
      frequency: Math.random() * 3 + 1,
      cpc: Math.random() * 100 + 20,
      cpm: Math.random() * 50 + 10,
      ctr: Math.random() * 5 + 0.5,
      conversions: Math.floor(Math.random() * 100) + 10,
      date_start: '2025-01-01',
      date_stop: '2025-01-31'
    })
  }
  
  console.log('🎭 モックデータ生成:', { count: mockData.length })
  return mockData
}

export function useMockData(enabled: boolean = false): AdInsight[] | null {
  if (!enabled) return null
  return generateMockInsights()
}