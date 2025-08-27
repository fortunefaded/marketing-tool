// React import removed - not needed in test files
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { CreativeTableTab } from '../CreativeTableTab'
import { FatigueData } from '@/types'

const mockFatigueData: FatigueData[] = [
  {
    adId: 'ad_1',
    adName: 'Test Ad 1',
    score: 75,
    status: 'warning',
    metrics: {
      frequency: 2.5,
      ctr: 3.2,
      cpm: 150,
      impressions: 10000,
      clicks: 320,
      spend: 1500,
      reach: 8500,
      unique_ctr: 2.8,
      unique_inline_link_click_ctr: 2.5,
      cpc: 4.69,
      conversions: 15
    }
  },
  {
    adId: 'ad_2',
    adName: 'Test Ad 2',
    score: 45,
    status: 'healthy',
    metrics: {
      frequency: 1.8,
      ctr: 4.1,
      cpm: 120,
      impressions: 8000,
      clicks: 328,
      spend: 960,
      reach: 7200,
      unique_ctr: 3.5,
      unique_inline_link_click_ctr: 3.2,
      cpc: 2.93,
      conversions: 20
    }
  }
]

const mockInsights = [
  {
    ad_id: 'ad_1',
    ad_name: 'Test Ad 1',
    campaign_id: 'camp_1',
    campaign_name: 'Test Campaign 1',
    impressions: 10000,
    clicks: 320,
    spend: 1500,
    ctr: 3.2,
    cpc: 4.69,
    conversion_value: 3000,
    date_start: '2024-01-01',
    date_stop: '2024-01-31',
    image_url: 'https://example.com/image1.jpg'
  },
  {
    ad_id: 'ad_2',
    ad_name: 'Test Ad 2',
    campaign_id: 'camp_2',
    campaign_name: 'Test Campaign 2',
    impressions: 8000,
    clicks: 328,
    spend: 960,
    ctr: 4.1,
    cpc: 2.93,
    conversion_value: 2400,
    date_start: '2024-01-01',
    date_stop: '2024-01-31',
    video_url: 'https://example.com/video1.mp4'
  }
]

describe('CreativeTableTab', () => {
  it('renders creative data with fatigue information', () => {
    render(
      <CreativeTableTab
        data={mockFatigueData}
        insights={mockInsights}
        selectedAccountId="test_account"
        isLoading={false}
      />
    )
    
    // Check if creative names are displayed
    expect(screen.getByText('Test Ad 1')).toBeInTheDocument()
    expect(screen.getByText('Test Ad 2')).toBeInTheDocument()
    
    // Check if campaign names are displayed
    expect(screen.getByText('Test Campaign 1')).toBeInTheDocument()
    expect(screen.getByText('Test Campaign 2')).toBeInTheDocument()
  })

  it('shows loading state', () => {
    render(
      <CreativeTableTab
        data={[]}
        insights={[]}
        selectedAccountId="test_account"
        isLoading={true}
      />
    )
    
    // Should show loading skeleton
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  it('shows empty state when no account selected', () => {
    render(
      <CreativeTableTab
        data={mockFatigueData}
        insights={mockInsights}
        selectedAccountId={null}
        isLoading={false}
      />
    )
    
    expect(screen.getByText('アカウントを選択してクリエイティブデータを表示してください')).toBeInTheDocument()
  })

  it('shows empty state when no data', () => {
    render(
      <CreativeTableTab
        data={[]}
        insights={[]}
        selectedAccountId="test_account"
        isLoading={false}
      />
    )
    
    expect(screen.getByText('このアカウントにはクリエイティブデータがありません')).toBeInTheDocument()
  })

  it('displays fatigue statistics correctly', () => {
    render(
      <CreativeTableTab
        data={mockFatigueData}
        insights={mockInsights}
        selectedAccountId="test_account"
        isLoading={false}
      />
    )
    
    // Check total creatives in simplified format
    expect(screen.getByText('合計 2 クリエイティブ')).toBeInTheDocument()
    
    // Check fatigue categories in simplified format
    expect(screen.getByText('高疲労: 0')).toBeInTheDocument()
    expect(screen.getByText('中疲労: 1')).toBeInTheDocument()
    expect(screen.getByText('低疲労: 1')).toBeInTheDocument()
  })


  it('renders fatigue scores in the table', () => {
    render(
      <CreativeTableTab
        data={mockFatigueData}
        insights={mockInsights}
        selectedAccountId="test_account"
        isLoading={false}
      />
    )
    
    // Check if fatigue scores are displayed
    expect(screen.getByText('75')).toBeInTheDocument() // First ad's fatigue score
    expect(screen.getByText('45')).toBeInTheDocument() // Second ad's fatigue score
  })

  it('displays metrics in correct format', () => {
    render(
      <CreativeTableTab
        data={mockFatigueData}
        insights={mockInsights}
        selectedAccountId="test_account"
        isLoading={false}
      />
    )
    
    // Check number formatting
    expect(screen.getByText('10,000')).toBeInTheDocument() // impressions
    expect(screen.getByText('8,000')).toBeInTheDocument() // impressions
    
    // Check currency formatting
    expect(screen.getByText('¥1,500')).toBeInTheDocument() // spend
    expect(screen.getByText('¥960')).toBeInTheDocument() // spend
  })
})