import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CreativePerformanceGrid } from '../CreativePerformanceGrid'

describe('CreativePerformanceGrid', () => {
  const mockCreatives = [
    {
      id: '1',
      name: 'Summer Sale Banner',
      type: 'IMAGE' as const,
      thumbnailUrl: 'https://example.com/thumb1.jpg',
      campaignName: 'Summer Campaign 2024',
      metrics: {
        impressions: 100000,
        clicks: 5000,
        conversions: 100,
        spend: 10000,
        revenue: 50000,
        ctr: 5.0,
        cpc: 2.0,
        cpa: 100,
        roas: 5.0,
      },
      status: 'ACTIVE' as const,
    },
    {
      id: '2',
      name: 'Product Demo Video',
      type: 'VIDEO' as const,
      thumbnailUrl: 'https://example.com/thumb2.jpg',
      videoUrl: 'https://example.com/video.mp4',
      campaignName: 'Product Launch',
      metrics: {
        impressions: 200000,
        clicks: 8000,
        conversions: 200,
        spend: 20000,
        revenue: 100000,
        ctr: 4.0,
        cpc: 2.5,
        cpa: 100,
        roas: 5.0,
      },
      status: 'ACTIVE' as const,
    },
    {
      id: '3',
      name: 'Carousel Ad',
      type: 'CAROUSEL' as const,
      thumbnailUrl: 'https://example.com/thumb3.jpg',
      campaignName: 'Holiday Special',
      metrics: {
        impressions: 150000,
        clicks: 6000,
        conversions: 150,
        spend: 15000,
        revenue: 60000,
        ctr: 4.0,
        cpc: 2.5,
        cpa: 100,
        roas: 4.0,
      },
      status: 'PAUSED' as const,
    },
  ]

  it('renders creative performance grid', () => {
    render(<CreativePerformanceGrid creatives={mockCreatives} />)

    expect(screen.getByText('クリエイティブパフォーマンス')).toBeInTheDocument()
    expect(screen.getByText('Summer Sale Banner')).toBeInTheDocument()
    expect(screen.getByText('Product Demo Video')).toBeInTheDocument()
    expect(screen.getByText('Carousel Ad')).toBeInTheDocument()
  })

  it('displays creative type badges correctly', () => {
    render(<CreativePerformanceGrid creatives={mockCreatives} />)

    expect(screen.getByText('画像')).toBeInTheDocument()
    expect(screen.getByText('動画')).toBeInTheDocument()
    expect(screen.getByText('カルーセル')).toBeInTheDocument()
  })

  it('shows performance metrics for each creative', () => {
    render(<CreativePerformanceGrid creatives={mockCreatives} />)

    // Check first creative metrics
    expect(screen.getByText('100,000')).toBeInTheDocument() // impressions
    expect(screen.getByText('5.00%')).toBeInTheDocument() // CTR
    expect(screen.getByText('5.00x')).toBeInTheDocument() // ROAS
  })

  it('filters creatives by type', () => {
    render(<CreativePerformanceGrid creatives={mockCreatives} />)

    const typeFilter = screen.getByLabelText('タイプで絞り込み')
    fireEvent.change(typeFilter, { target: { value: 'VIDEO' } })

    expect(screen.getByText('Product Demo Video')).toBeInTheDocument()
    expect(screen.queryByText('Summer Sale Banner')).not.toBeInTheDocument()
    expect(screen.queryByText('Carousel Ad')).not.toBeInTheDocument()
  })

  it('sorts creatives by different metrics', () => {
    render(<CreativePerformanceGrid creatives={mockCreatives} />)

    const sortSelect = screen.getByLabelText('並び替え')
    fireEvent.change(sortSelect, { target: { value: 'revenue' } })

    const creativeNames = screen.getAllByTestId('creative-name')
    expect(creativeNames[0]).toHaveTextContent('Product Demo Video') // Highest revenue
  })

  it('handles creative click for detailed view', () => {
    const onCreativeClick = vi.fn()
    render(<CreativePerformanceGrid creatives={mockCreatives} onCreativeClick={onCreativeClick} />)

    const firstCreative = screen.getByTestId('creative-card-1')
    fireEvent.click(firstCreative)

    expect(onCreativeClick).toHaveBeenCalledWith(mockCreatives[0])
  })

  it('shows preview on hover for videos', async () => {
    render(<CreativePerformanceGrid creatives={mockCreatives} />)

    const videoCreative = screen.getByTestId('creative-card-2')
    fireEvent.mouseEnter(videoCreative)

    const videoPreview = await screen.findByTestId('video-preview')
    expect(videoPreview).toHaveAttribute('src', 'https://example.com/video.mp4')
  })

  it('displays grid or list view based on preference', () => {
    render(<CreativePerformanceGrid creatives={mockCreatives} viewMode="list" />)

    expect(screen.getByTestId('creative-list')).toBeInTheDocument()
    expect(screen.queryByTestId('creative-grid')).not.toBeInTheDocument()
  })

  it('shows empty state when no creatives', () => {
    render(<CreativePerformanceGrid creatives={[]} />)

    expect(screen.getByText('クリエイティブがありません')).toBeInTheDocument()
  })

  it('displays loading skeleton', () => {
    render(<CreativePerformanceGrid isLoading={true} />)

    expect(screen.getAllByTestId('creative-skeleton')).toHaveLength(6)
  })
})
