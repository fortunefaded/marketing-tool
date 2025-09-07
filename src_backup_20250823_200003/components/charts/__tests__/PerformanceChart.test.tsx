import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PerformanceChart } from '../PerformanceChart'

const mockData = [
  {
    date: '2024-01-01',
    impressions: 150000,
    clicks: 3000,
    conversions: 90,
    cost: 45000,
    revenue: 270000,
  },
  {
    date: '2024-01-02',
    impressions: 180000,
    clicks: 3600,
    conversions: 108,
    cost: 54000,
    revenue: 324000,
  },
  {
    date: '2024-01-03',
    impressions: 165000,
    clicks: 3300,
    conversions: 99,
    cost: 49500,
    revenue: 297000,
  },
  {
    date: '2024-01-04',
    impressions: 195000,
    clicks: 3900,
    conversions: 117,
    cost: 58500,
    revenue: 351000,
  },
  {
    date: '2024-01-05',
    impressions: 210000,
    clicks: 4200,
    conversions: 126,
    cost: 63000,
    revenue: 378000,
  },
]

// Mock recharts to avoid rendering issues in tests
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  LineChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="line-chart">{children}</div>
  ),
  Line: ({ dataKey }: { dataKey: string }) => <div data-testid={`line-${dataKey}`} />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: ({ yAxisId }: { yAxisId?: string }) => (
    <div data-testid={`y-axis-${yAxisId || 'default'}`} />
  ),
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
}))

describe('PerformanceChart', () => {
  it('should render chart with data', () => {
    render(<PerformanceChart data={mockData} />)

    expect(screen.getByTestId('responsive-container')).toBeInTheDocument()
    expect(screen.getByTestId('line-chart')).toBeInTheDocument()
  })

  it('should render selected metrics', () => {
    render(<PerformanceChart data={mockData} metrics={['impressions', 'clicks', 'conversions']} />)

    expect(screen.getByTestId('line-impressions')).toBeInTheDocument()
    expect(screen.getByTestId('line-clicks')).toBeInTheDocument()
    expect(screen.getByTestId('line-conversions')).toBeInTheDocument()
  })

  it('should render with title', () => {
    render(<PerformanceChart data={mockData} title="パフォーマンス推移" />)

    expect(screen.getByText('パフォーマンス推移')).toBeInTheDocument()
  })

  it('should render empty state when no data', () => {
    render(<PerformanceChart data={[]} />)

    expect(screen.getByText('データがありません')).toBeInTheDocument()
  })

  it('should render loading state', () => {
    render(<PerformanceChart data={[]} isLoading={true} />)

    expect(screen.getByTestId('chart-skeleton')).toBeInTheDocument()
  })

  it('should render error state', () => {
    render(<PerformanceChart data={[]} error="データの取得に失敗しました" />)

    expect(screen.getByText('データの取得に失敗しました')).toBeInTheDocument()
  })

  it('should show metric selector', () => {
    render(<PerformanceChart data={mockData} showMetricSelector={true} />)

    expect(screen.getByText('表示する指標')).toBeInTheDocument()
  })

  it('should handle metric selection', () => {
    const onMetricsChange = vi.fn()
    render(
      <PerformanceChart
        data={mockData}
        showMetricSelector={true}
        onMetricsChange={onMetricsChange}
      />
    )

    const checkbox = screen.getByLabelText('インプレッション')
    fireEvent.click(checkbox)

    expect(onMetricsChange).toHaveBeenCalled()
  })

  it('should render with custom height', () => {
    const { container } = render(<PerformanceChart data={mockData} height={500} />)

    const chartContainer = container.querySelector('[data-testid="responsive-container"]')
    expect(chartContainer).toBeInTheDocument()
  })

  it('should format axis labels', () => {
    render(<PerformanceChart data={mockData} />)

    // Since we're mocking recharts, we can't test the actual formatting
    // but we can ensure the axes are rendered
    expect(screen.getByTestId('x-axis')).toBeInTheDocument()
    expect(screen.getByTestId('y-axis-left')).toBeInTheDocument()
  })

  it('should apply custom className', () => {
    const { container } = render(<PerformanceChart data={mockData} className="custom-chart" />)

    expect(container.firstChild).toHaveClass('custom-chart')
  })

  it('should render comparison data', () => {
    const dataWithComparison = mockData.map((d) => ({
      ...d,
      previousImpressions: d.impressions * 0.9,
      previousClicks: d.clicks * 0.9,
    }))

    render(<PerformanceChart data={dataWithComparison} showComparison={true} />)

    expect(screen.getByTestId('line-previousImpressions')).toBeInTheDocument()
    expect(screen.getByTestId('line-previousClicks')).toBeInTheDocument()
  })
})
