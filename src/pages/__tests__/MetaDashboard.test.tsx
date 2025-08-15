import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MetaDashboard } from '../MetaDashboard'

// Mock the components
vi.mock('../../components/dashboard/DashboardLayout', () => ({
  DashboardLayout: ({ children, title }: { children: React.ReactNode; title?: string }) => (
    <div data-testid="dashboard-layout">
      <h1>{title}</h1>
      {children}
    </div>
  ),
}))

vi.mock('../../components/metrics/MetricCard', () => ({
  MetricCard: ({ title }: { title: string }) => (
    <div data-testid={`metric-card-${title}`}>{title}</div>
  ),
}))

vi.mock('../../components/campaigns/CampaignTable', () => ({
  CampaignTable: () => <div data-testid="campaign-table">Campaign Table</div>,
}))

vi.mock('../../components/charts/PerformanceChart', () => ({
  PerformanceChart: () => <div data-testid="performance-chart">Performance Chart</div>,
}))

// Mock convex hooks
vi.mock('convex/react', () => ({
  useQuery: vi.fn(() => [
    {
      _id: '1',
      name: 'Test Campaign',
      status: 'active',
      budget: 100000,
      spent: 50000,
      impressions: 100000,
      clicks: 1000,
      conversions: 50,
      revenue: 200000,
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      dailyMetrics: [
        {
          date: '2024-01-01',
          impressions: 100000,
          clicks: 1000,
          conversions: 50,
          cost: 50000,
          revenue: 200000,
        },
      ],
    },
  ]),
}))

describe('MetaDashboard', () => {
  it('should render dashboard layout with title', () => {
    render(<MetaDashboard />)

    expect(screen.getByTestId('dashboard-layout')).toBeInTheDocument()
    expect(screen.getByText('広告パフォーマンスダッシュボード')).toBeInTheDocument()
  })

  it('should render metric cards', () => {
    render(<MetaDashboard />)

    expect(screen.getByTestId('metric-card-広告費用')).toBeInTheDocument()
    expect(screen.getByTestId('metric-card-売上')).toBeInTheDocument()
    expect(screen.getByTestId('metric-card-ROAS')).toBeInTheDocument()
    expect(screen.getByTestId('metric-card-コンバージョン')).toBeInTheDocument()
  })

  it('should render campaign table', () => {
    render(<MetaDashboard />)

    expect(screen.getByTestId('campaign-table')).toBeInTheDocument()
  })

  it('should render performance chart', () => {
    render(<MetaDashboard />)

    expect(screen.getByTestId('performance-chart')).toBeInTheDocument()
  })

  it('should have responsive grid layout for metrics', () => {
    const { container } = render(<MetaDashboard />)

    const metricsGrid = container.querySelector(
      '.grid.grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-4'
    )
    expect(metricsGrid).toBeInTheDocument()
  })

  it('should have proper sections', () => {
    render(<MetaDashboard />)

    expect(screen.getByText('主要指標')).toBeInTheDocument()
    expect(screen.getByText('パフォーマンス推移')).toBeInTheDocument()
    expect(screen.getByText('キャンペーン一覧')).toBeInTheDocument()
  })
})
