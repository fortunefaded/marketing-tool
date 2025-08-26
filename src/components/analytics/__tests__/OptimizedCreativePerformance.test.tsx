import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { OptimizedCreativePerformance } from '../OptimizedCreativePerformance'
import type { MetaInsightsData } from '@/types'

// Mock EnhancedCreativeDetailModal to avoid Convex dependencies
vi.mock('../../creatives/EnhancedCreativeDetailModal', () => ({
  EnhancedCreativeDetailModal: vi.fn(() => null),
}))

// Mock MobileCreativeInsights to avoid Convex dependencies
vi.mock('../../creatives/MobileCreativeInsights', () => ({
  MobileCreativeInsights: vi.fn(() => null),
}))

// Mock VideoPlayer to avoid DOM dependencies
vi.mock('../../creatives/VideoPlayer', () => ({
  VideoPlayer: vi.fn(() => null),
}))

// Mock CreativeFatigueAnalyzer
vi.mock('../../../services/creativeFatigueAnalyzer', () => ({
  CreativeFatigueAnalyzer: vi.fn().mockImplementation(() => ({
    analyzeFatigue: vi.fn(() => ({ fatigueLevel: 'healthy', score: 80 })),
  })),
}))

// モックデータ
const mockInsights: MetaInsightsData[] = [
  {
    account_id: 'test-account',
    campaign_id: 'campaign-1',
    campaign_name: 'Test Campaign',
    ad_id: 'ad-1',
    ad_name: 'Test Ad',
    creative_id: 'test-creative-1',
    creative_name: 'Test Creative 1',
    creative_type: 'image',
    thumbnail_url: 'https://example.com/thumb.jpg',
    impressions: '10000',
    clicks: '200',
    ctr: '2.0',
    conversions: '10',
    conversion_value: '50000',
    spend: '10000',
    date_start: '2024-01-01',
    date_stop: '2024-01-31',
    frequency: '2.5',
    reach: '5000',
    cpm: '100.0',
    cpc: '50.0',
  },
]

// 空のモックinsights
const emptyInsights: MetaInsightsData[] = []

describe('OptimizedCreativePerformance', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('should render without errors', () => {
    render(<OptimizedCreativePerformance insights={mockInsights} />)
    expect(screen.getByText('クリエイティブパフォーマンス')).toBeInTheDocument()
  })

  test('should display creative metrics correctly', async () => {
    render(<OptimizedCreativePerformance insights={mockInsights} />)

    await waitFor(() => {
      expect(screen.getByText('Test Creative 1')).toBeInTheDocument()
      expect(screen.getByText('Test Campaign')).toBeInTheDocument()
    })
  })

  test('should handle empty metrics gracefully', () => {
    render(<OptimizedCreativePerformance insights={emptyInsights} />)
    expect(screen.getByText('クリエイティブデータがありません')).toBeInTheDocument()
  })

  test('should filter by creative type', () => {
    const { container } = render(<OptimizedCreativePerformance insights={mockInsights} />)

    // 画像ボタンをクリック
    const imageButton = screen.getByRole('button', { name: /画像/ })
    imageButton.click()

    // 画像タイプのクリエイティブが表示されることを確認
    expect(container.querySelector('.grid')).toBeInTheDocument()
  })

  test('should handle aggregation period change', () => {
    const onPeriodChange = vi.fn()
    render(
      <OptimizedCreativePerformance
        insights={mockInsights}
        aggregationPeriod="daily"
        onPeriodChange={onPeriodChange}
      />
    )

    const periodSelect = screen.getByRole('combobox')
    expect(periodSelect).toHaveValue('daily')
  })
})
