import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CustomFilterPanel } from '../CustomFilterPanel'

describe('CustomFilterPanel', () => {
  const mockFilters = {
    dateRange: {
      start: '2024-01-01',
      end: '2024-01-31',
    },
    campaigns: ['campaign_1', 'campaign_2'],
    status: ['ACTIVE'],
    objectives: ['CONVERSIONS'],
    metrics: {
      minSpend: 1000,
      maxSpend: 10000,
      minRoas: 1.0,
      maxRoas: 10.0,
    },
  }

  const mockCampaignOptions = [
    { id: 'campaign_1', name: 'Campaign 1' },
    { id: 'campaign_2', name: 'Campaign 2' },
    { id: 'campaign_3', name: 'Campaign 3' },
  ]

  it('renders filter panel with all sections', () => {
    render(<CustomFilterPanel />)

    expect(screen.getByText('フィルター')).toBeInTheDocument()
    expect(screen.getByText('期間')).toBeInTheDocument()
    expect(screen.getByText('ステータス')).toBeInTheDocument()
    expect(screen.getByText('目的')).toBeInTheDocument()
    expect(screen.getByText('パフォーマンス')).toBeInTheDocument()
  })

  it('displays selected filters correctly', () => {
    render(<CustomFilterPanel filters={mockFilters} campaignOptions={mockCampaignOptions} />)

    expect(screen.getByDisplayValue('2024-01-01')).toBeInTheDocument()
    expect(screen.getByDisplayValue('2024-01-31')).toBeInTheDocument()
    expect(screen.getByText('2件選択中')).toBeInTheDocument() // Campaigns
  })

  it('handles date range changes', () => {
    const onChange = vi.fn()
    render(<CustomFilterPanel onChange={onChange} />)

    const startDateInput = screen.getByLabelText('開始日')
    const endDateInput = screen.getByLabelText('終了日')

    fireEvent.change(startDateInput, { target: { value: '2024-02-01' } })
    fireEvent.change(endDateInput, { target: { value: '2024-02-29' } })

    expect(onChange).toHaveBeenCalledWith({
      dateRange: {
        start: '2024-02-01',
        end: '2024-02-29',
      },
    })
  })

  it('handles campaign selection', () => {
    const onChange = vi.fn()
    render(<CustomFilterPanel onChange={onChange} campaignOptions={mockCampaignOptions} />)

    const campaignCheckbox = screen.getByRole('checkbox', { name: 'Campaign 1' })
    fireEvent.click(campaignCheckbox)

    expect(onChange).toHaveBeenCalledWith({
      campaigns: ['campaign_1'],
    })
  })

  it('handles status filter changes', () => {
    const onChange = vi.fn()
    render(<CustomFilterPanel onChange={onChange} />)

    const activeCheckbox = screen.getByRole('checkbox', { name: 'アクティブ' })
    fireEvent.click(activeCheckbox)

    expect(onChange).toHaveBeenCalledWith({
      status: ['ACTIVE'],
    })
  })

  it('handles performance metric filters', () => {
    const onChange = vi.fn()
    render(<CustomFilterPanel onChange={onChange} />)

    const minSpendInput = screen.getByLabelText('最小広告費')
    fireEvent.change(minSpendInput, { target: { value: '5000' } })

    expect(onChange).toHaveBeenCalledWith({
      metrics: {
        minSpend: 5000,
      },
    })
  })

  it('shows preset filters', () => {
    render(<CustomFilterPanel showPresets={true} />)

    expect(screen.getByText('プリセット')).toBeInTheDocument()
    expect(screen.getByText('高パフォーマンス')).toBeInTheDocument()
    expect(screen.getByText('低パフォーマンス')).toBeInTheDocument()
    expect(screen.getByText('今月')).toBeInTheDocument()
  })

  it('applies preset filter when clicked', () => {
    const onChange = vi.fn()
    render(<CustomFilterPanel onChange={onChange} showPresets={true} />)

    const highPerformancePreset = screen.getByText('高パフォーマンス')
    fireEvent.click(highPerformancePreset)

    expect(onChange).toHaveBeenCalledWith({
      metrics: {
        minRoas: 3.0,
      },
      status: ['ACTIVE'],
    })
  })

  it('clears all filters', () => {
    const onChange = vi.fn()
    render(<CustomFilterPanel filters={mockFilters} onChange={onChange} />)

    const clearButton = screen.getByText('フィルターをクリア')
    fireEvent.click(clearButton)

    expect(onChange).toHaveBeenCalledWith({})
  })

  it('collapses and expands sections', () => {
    render(<CustomFilterPanel />)

    const performanceSection = screen.getByText('パフォーマンス')
    expect(screen.getByLabelText('最小広告費')).toBeVisible()

    fireEvent.click(performanceSection)
    expect(screen.queryByLabelText('最小広告費')).not.toBeVisible()

    fireEvent.click(performanceSection)
    expect(screen.getByLabelText('最小広告費')).toBeVisible()
  })

  it('shows active filter count', () => {
    render(<CustomFilterPanel filters={mockFilters} />)

    const filterCount = screen.getByTestId('active-filter-count')
    expect(filterCount).toHaveTextContent('4') // dateRange, campaigns, status, objectives
  })
})
