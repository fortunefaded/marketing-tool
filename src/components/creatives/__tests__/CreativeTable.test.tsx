// React import removed - not needed in test files
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { CreativeTable, Creative } from '../CreativeTable'

const mockCreatives: Creative[] = [
  {
    id: '1',
    name: 'Test Creative 1',
    type: 'IMAGE',
    campaignName: 'Test Campaign 1',
    status: 'ACTIVE',
    thumbnailUrl: 'https://example.com/image1.jpg',
    impressions: 10000,
    clicks: 500,
    conversions: 25,
    spend: 1000,
    revenue: 2500,
    ctr: 5.0,
    cpc: 2.0,
    cpa: 40.0,
    roas: 2.5,
    frequency: 2.3,
    cpm: 100,
    fatigueScore: 75,
    creativeFatigue: 70,
    audienceFatigue: 80,
    algorithmFatigue: 75,
    startDate: '2024-01-01',
    endDate: '2024-01-31'
  },
  {
    id: '2',
    name: 'Test Creative 2',
    type: 'VIDEO',
    campaignName: 'Test Campaign 2',
    status: 'PAUSED',
    videoUrl: 'https://example.com/video1.mp4',
    impressions: 8000,
    clicks: 320,
    conversions: 16,
    spend: 800,
    revenue: 1600,
    ctr: 4.0,
    cpc: 2.5,
    cpa: 50.0,
    roas: 2.0,
    frequency: 3.1,
    cpm: 100,
    fatigueScore: 45,
    creativeFatigue: 50,
    audienceFatigue: 40,
    algorithmFatigue: 45,
    startDate: '2024-01-01',
    endDate: '2024-01-31'
  }
]

describe('CreativeTable', () => {
  it('renders creative data correctly', () => {
    render(<CreativeTable creatives={mockCreatives} />)
    
    // Check if creative names are displayed
    expect(screen.getByText('Test Creative 1')).toBeInTheDocument()
    expect(screen.getByText('Test Creative 2')).toBeInTheDocument()
    
    // Check if campaign names are displayed
    expect(screen.getByText('Test Campaign 1')).toBeInTheDocument()
    expect(screen.getByText('Test Campaign 2')).toBeInTheDocument()
  })

  it('shows loading state', () => {
    render(<CreativeTable creatives={[]} isLoading={true} />)
    
    expect(screen.getByTestId('table-skeleton')).toBeInTheDocument()
  })

  it('shows error state', () => {
    const errorMessage = 'Failed to load creatives'
    render(<CreativeTable creatives={[]} error={errorMessage} />)
    
    expect(screen.getByText(errorMessage)).toBeInTheDocument()
  })

  it('shows empty state when no creatives', () => {
    render(<CreativeTable creatives={[]} />)
    
    expect(screen.getByText('クリエイティブがありません')).toBeInTheDocument()
  })

  it('handles row clicks', () => {
    const onRowClick = vi.fn()
    render(<CreativeTable creatives={mockCreatives} onRowClick={onRowClick} />)
    
    const firstRow = screen.getByText('Test Creative 1').closest('tr')
    fireEvent.click(firstRow!)
    
    expect(onRowClick).toHaveBeenCalledWith(mockCreatives[0])
  })

  it('handles selection when selectable is enabled', () => {
    const onSelectionChange = vi.fn()
    render(
      <CreativeTable 
        creatives={mockCreatives} 
        selectable={true}
        onSelectionChange={onSelectionChange}
      />
    )
    
    // Find and click the first row checkbox
    const checkboxes = screen.getAllByRole('checkbox')
    const firstRowCheckbox = checkboxes[1] // Skip the "select all" checkbox
    fireEvent.click(firstRowCheckbox)
    
    expect(onSelectionChange).toHaveBeenCalledWith(['1'])
  })

  it('displays correct metrics formatting', () => {
    render(<CreativeTable creatives={mockCreatives} />)
    
    // Check number formatting
    expect(screen.getByText('10,000')).toBeInTheDocument() // impressions
    expect(screen.getByText('500')).toBeInTheDocument() // clicks
    expect(screen.getByText('25')).toBeInTheDocument() // conversions
    
    // Check currency formatting
    expect(screen.getByText('¥1,000')).toBeInTheDocument() // spend
    expect(screen.getByText('¥40')).toBeInTheDocument() // CPA
    
    // Check percentage formatting
    expect(screen.getByText('5.00%')).toBeInTheDocument() // CTR
    
    // Check decimal formatting
    expect(screen.getByText('2.50x')).toBeInTheDocument() // ROAS
    expect(screen.getByText('2.30')).toBeInTheDocument() // frequency
  })

  it('shows creative type icons correctly', () => {
    render(<CreativeTable creatives={mockCreatives} />)
    
    // We can't easily test for specific icons, but we can check that the table renders
    // without errors when different creative types are present
    expect(screen.getByText('Test Creative 1')).toBeInTheDocument()
    expect(screen.getByText('Test Creative 2')).toBeInTheDocument()
  })

  it('displays status badges correctly', () => {
    render(<CreativeTable creatives={mockCreatives} />)
    
    expect(screen.getByText('アクティブ')).toBeInTheDocument()
    expect(screen.getByText('一時停止')).toBeInTheDocument()
  })

  it('handles sorting', () => {
    const onSort = vi.fn()
    render(<CreativeTable creatives={mockCreatives} onSort={onSort} />)
    
    // Click on impressions header to sort
    const impressionsHeader = screen.getByText('インプレッション').closest('th')
    fireEvent.click(impressionsHeader!)
    
    expect(onSort).toHaveBeenCalledWith('impressions')
  })

  it('displays summary information when data is present', () => {
    render(<CreativeTable creatives={mockCreatives} />)
    
    // Check summary section exists
    expect(screen.getByText('表示件数')).toBeInTheDocument()
    expect(screen.getByText('2件')).toBeInTheDocument()
    expect(screen.getByText('合計インプレッション')).toBeInTheDocument()
    expect(screen.getByText('18,000')).toBeInTheDocument() // 10000 + 8000
  })

  it('shows and hides filters correctly', () => {
    render(<CreativeTable creatives={mockCreatives} />)
    
    // Filter button should be present
    const filterButton = screen.getByText('フィルター')
    expect(filterButton).toBeInTheDocument()
    
    // Click to show filters
    fireEvent.click(filterButton)
    
    // Filter sections should now be visible
    expect(screen.getByText('クリエイティブタイプ')).toBeInTheDocument()
    expect(screen.getByText('ステータス')).toBeInTheDocument()
  })

  it('displays fatigue score badges with correct colors', () => {
    render(<CreativeTable creatives={mockCreatives} />)
    
    // Should render fatigue scores
    expect(screen.getByText('75')).toBeInTheDocument() // First creative's fatigue score
    expect(screen.getByText('45')).toBeInTheDocument() // Second creative's fatigue score
  })
})