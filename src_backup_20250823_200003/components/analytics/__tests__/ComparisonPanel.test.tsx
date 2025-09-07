import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ComparisonPanel } from '../ComparisonPanel'

describe('ComparisonPanel', () => {
  const mockData = {
    current: {
      period: '2024年1月',
      metrics: {
        spend: 100000,
        revenue: 500000,
        impressions: 1000000,
        clicks: 50000,
        conversions: 500,
        ctr: 5.0,
        cpc: 2.0,
        cpa: 200,
        roas: 5.0,
      },
    },
    previous: {
      period: '2023年12月',
      metrics: {
        spend: 90000,
        revenue: 400000,
        impressions: 900000,
        clicks: 40000,
        conversions: 400,
        ctr: 4.44,
        cpc: 2.25,
        cpa: 225,
        roas: 4.44,
      },
    },
  }

  it('renders comparison panel with metrics', () => {
    render(<ComparisonPanel data={mockData} />)

    expect(screen.getByText('パフォーマンス比較')).toBeInTheDocument()
    expect(screen.getByText('2024年1月')).toBeInTheDocument()
    expect(screen.getByText('2023年12月')).toBeInTheDocument()
  })

  it('displays percentage changes correctly', () => {
    render(<ComparisonPanel data={mockData} />)

    // Spend increased by 11.11%
    expect(screen.getByText('+11.1%')).toBeInTheDocument()

    // Revenue increased by 25%
    expect(screen.getByText('+25.0%')).toBeInTheDocument()

    // CTR increased from 4.44% to 5.0%
    expect(screen.getByText('+12.6%')).toBeInTheDocument()
  })

  it('shows improvement indicators correctly', () => {
    render(<ComparisonPanel data={mockData} />)

    // CPC decreased (improvement)
    expect(screen.getByTestId('cpc-improvement')).toHaveClass('text-green-600')

    // CPA decreased (improvement)
    expect(screen.getByTestId('cpa-improvement')).toHaveClass('text-green-600')

    // ROAS increased (improvement)
    expect(screen.getByTestId('roas-improvement')).toHaveClass('text-green-600')
  })

  it('handles period selection changes', () => {
    const onPeriodChange = vi.fn()
    render(<ComparisonPanel data={mockData} onPeriodChange={onPeriodChange} />)

    const periodSelector = screen.getByLabelText('比較期間')
    fireEvent.change(periodSelector, { target: { value: 'year-over-year' } })

    expect(onPeriodChange).toHaveBeenCalledWith('year-over-year')
  })

  it('supports custom metrics selection', () => {
    const onMetricsChange = vi.fn()
    render(
      <ComparisonPanel
        data={mockData}
        selectedMetrics={['spend', 'revenue', 'roas']}
        onMetricsChange={onMetricsChange}
      />
    )

    // Only selected metrics should be visible
    expect(screen.getByText('広告費用')).toBeInTheDocument()
    expect(screen.getByText('売上')).toBeInTheDocument()
    expect(screen.getByText('ROAS')).toBeInTheDocument()

    // Non-selected metrics should not be visible
    expect(screen.queryByText('インプレッション')).not.toBeInTheDocument()
  })

  it('exports comparison data', () => {
    const onExport = vi.fn()
    render(<ComparisonPanel data={mockData} onExport={onExport} />)

    const exportButton = screen.getByText('エクスポート')
    fireEvent.click(exportButton)

    expect(onExport).toHaveBeenCalledWith({
      data: mockData,
      format: 'csv',
    })
  })

  it('shows loading state', () => {
    render(<ComparisonPanel isLoading={true} />)
    expect(screen.getByTestId('comparison-skeleton')).toBeInTheDocument()
  })

  it('handles empty data gracefully', () => {
    render(<ComparisonPanel data={null} />)
    expect(screen.getByText('比較データがありません')).toBeInTheDocument()
  })
})
