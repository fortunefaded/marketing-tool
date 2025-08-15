import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CampaignTable } from '../CampaignTable'

const mockCampaigns = [
  {
    id: '1',
    name: 'Summer Sale 2024',
    status: 'active' as const,
    budget: 500000,
    spent: 320000,
    impressions: 1250000,
    clicks: 15000,
    conversions: 450,
    ctr: 1.2,
    cpc: 21.33,
    cpa: 711.11,
    roas: 4.5,
    startDate: '2024-06-01',
    endDate: '2024-08-31',
  },
  {
    id: '2',
    name: 'Product Launch Campaign',
    status: 'paused' as const,
    budget: 300000,
    spent: 150000,
    impressions: 800000,
    clicks: 8000,
    conversions: 200,
    ctr: 1.0,
    cpc: 18.75,
    cpa: 750.0,
    roas: 3.2,
    startDate: '2024-07-15',
    endDate: '2024-09-15',
  },
  {
    id: '3',
    name: 'Year End Clearance',
    status: 'completed' as const,
    budget: 1000000,
    spent: 980000,
    impressions: 3500000,
    clicks: 45000,
    conversions: 1200,
    ctr: 1.29,
    cpc: 21.78,
    cpa: 816.67,
    roas: 5.1,
    startDate: '2023-12-01',
    endDate: '2023-12-31',
  },
]

describe('CampaignTable', () => {
  it('should render table headers', () => {
    render(<CampaignTable campaigns={[mockCampaigns[0]]} />)

    expect(screen.getByText('キャンペーン名')).toBeInTheDocument()
    expect(screen.getByText('ステータス')).toBeInTheDocument()
    expect(screen.getByText('予算')).toBeInTheDocument()
    expect(screen.getByText('消化額')).toBeInTheDocument()
    expect(screen.getByText('インプレッション')).toBeInTheDocument()
    expect(screen.getByText('クリック')).toBeInTheDocument()
    expect(screen.getByText('コンバージョン')).toBeInTheDocument()
    expect(screen.getByText('CTR')).toBeInTheDocument()
    expect(screen.getByText('CPC')).toBeInTheDocument()
    expect(screen.getByText('CPA')).toBeInTheDocument()
    expect(screen.getByText('ROAS')).toBeInTheDocument()
  })

  it('should render campaign data', () => {
    render(<CampaignTable campaigns={[mockCampaigns[0]]} />)

    expect(screen.getByText('Summer Sale 2024')).toBeInTheDocument()
    expect(screen.getByText('¥500,000')).toBeInTheDocument()
    expect(screen.getByText('¥320,000')).toBeInTheDocument()
    expect(screen.getByText('1,250,000')).toBeInTheDocument()
    expect(screen.getByText('15,000')).toBeInTheDocument()
    expect(screen.getByText('450')).toBeInTheDocument()
    expect(screen.getByText('1.2%')).toBeInTheDocument()
    expect(screen.getByText('¥21')).toBeInTheDocument()
    expect(screen.getByText('¥711')).toBeInTheDocument()
    expect(screen.getByText('4.5')).toBeInTheDocument()
  })

  it('should render status badges correctly', () => {
    render(<CampaignTable campaigns={mockCampaigns} />)

    expect(screen.getByText('アクティブ')).toBeInTheDocument()
    expect(screen.getByText('一時停止')).toBeInTheDocument()
    expect(screen.getByText('完了')).toBeInTheDocument()
  })

  it('should render empty state when no campaigns', () => {
    render(<CampaignTable campaigns={[]} />)

    expect(screen.getByText('キャンペーンがありません')).toBeInTheDocument()
  })

  it('should handle row click', () => {
    const onRowClick = vi.fn()
    render(<CampaignTable campaigns={[mockCampaigns[0]]} onRowClick={onRowClick} />)

    const row = screen.getByText('Summer Sale 2024').closest('tr')
    fireEvent.click(row!)

    expect(onRowClick).toHaveBeenCalledWith(mockCampaigns[0])
  })

  it('should render loading state', () => {
    render(<CampaignTable campaigns={[]} isLoading={true} />)

    expect(screen.getByTestId('table-skeleton')).toBeInTheDocument()
  })

  it('should render error state', () => {
    render(<CampaignTable campaigns={[]} error="データの取得に失敗しました" />)

    expect(screen.getByText('データの取得に失敗しました')).toBeInTheDocument()
  })

  it('should be sortable by columns', () => {
    const onSort = vi.fn()
    render(<CampaignTable campaigns={mockCampaigns} onSort={onSort} />)

    const budgetHeader = screen.getByText('予算')
    fireEvent.click(budgetHeader)

    expect(onSort).toHaveBeenCalledWith('budget')
  })

  it('should show budget utilization percentage', () => {
    render(<CampaignTable campaigns={[mockCampaigns[0]]} />)

    // 320000 / 500000 = 64%
    expect(screen.getByText('64%')).toBeInTheDocument()
  })

  it('should apply custom className', () => {
    const { container } = render(<CampaignTable campaigns={[]} className="custom-table" />)

    expect(container.firstChild).toHaveClass('custom-table')
  })

  it('should render selectable rows with checkboxes', () => {
    const onSelectionChange = vi.fn()
    render(
      <CampaignTable
        campaigns={mockCampaigns}
        selectable={true}
        onSelectionChange={onSelectionChange}
      />
    )

    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes).toHaveLength(4) // 1 header + 3 rows

    // Select first campaign
    fireEvent.click(checkboxes[1])
    expect(onSelectionChange).toHaveBeenCalledWith(['1'])
  })
})
