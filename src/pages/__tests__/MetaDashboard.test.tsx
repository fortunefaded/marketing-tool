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

vi.mock('../../components/dashboard/DashboardLayoutWithFilters', () => ({
  DashboardLayoutWithFilters: ({ children, title }: { children: React.ReactNode; title?: string }) => (
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

vi.mock('../../components/analytics/ComparisonPanel', () => ({
  ComparisonPanel: () => <div data-testid="comparison-panel">Comparison Panel</div>,
}))

vi.mock('../../components/creatives/CreativePerformanceGrid', () => ({
  CreativePerformanceGrid: () => <div data-testid="creative-grid">Creative Grid</div>,
}))

vi.mock('../../components/creatives/CreativeDetailModal', () => ({
  CreativeDetailModal: () => null,
}))

vi.mock('../../hooks/useComparisonAnalytics', () => ({
  useComparisonAnalytics: () => ({
    overallComparison: {
      current: {
        period: '2024年1月',
        metrics: {
          spend: 50000,
          revenue: 200000,
          impressions: 100000,
          clicks: 1000,
          conversions: 50,
          ctr: 1.0,
          cpc: 50,
          cpa: 1000,
          roas: 4.0,
        },
      },
      previous: {
        period: '2023年12月',
        metrics: {
          spend: 45000,
          revenue: 180000,
          impressions: 90000,
          clicks: 900,
          conversions: 45,
          ctr: 1.0,
          cpc: 50,
          cpa: 1000,
          roas: 4.0,
        },
      },
    },
    selectedComparison: 'month-over-month',
    setComparisonType: vi.fn(),
    exportData: vi.fn(),
    isLoading: false,
  }),
}))

vi.mock('../../hooks/useRealtimeUpdates', () => ({
  useRealtimeUpdates: () => ({
    realtimeMetrics: {
      impressions: 100,
      clicks: 10,
      conversions: 1,
      spend: 500,
      lastUpdated: new Date(),
    },
    alerts: [],
    status: 'connected',
  }),
}))

vi.mock('../../hooks/useMockData', () => ({
  useMockDataInitializer: () => {},
}))

vi.mock('../../components/realtime/RealtimeStatus', () => ({
  RealtimeStatus: () => <div data-testid="realtime-status">Realtime Status</div>,
}))

vi.mock('../../components/realtime/RealtimeMetricCard', () => ({
  RealtimeMetricCard: ({ title }: { title: string }) => (
    <div data-testid={`realtime-metric-${title}`}>{title}</div>
  ),
}))

vi.mock('../../components/realtime/AlertsPanel', () => ({
  AlertsPanel: () => <div data-testid="alerts-panel">Alerts Panel</div>,
  FloatingAlerts: () => <div data-testid="floating-alerts">Floating Alerts</div>,
}))

// Mock convex hooks
vi.mock('convex/react', () => ({
  useQuery: vi.fn((api: any) => {
    // Return different data based on the API endpoint
    if (api?.toString().includes('listMetaCampaigns')) {
      return [
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
      ]
    } else if (api?.toString().includes('getCreativePerformance')) {
      return {
        creatives: [
          {
            id: '1',
            name: 'Test Creative',
            imageUrl: 'https://example.com/image.jpg',
            campaignName: 'Test Campaign',
            impressions: 10000,
            clicks: 100,
            conversions: 10,
            ctr: 1.0,
            cvr: 10.0,
            cpc: 50,
            spend: 5000,
            revenue: 50000,
            roas: 10.0,
          },
        ],
        totalPages: 1,
      }
    } else if (api?.toString().includes('getAlerts')) {
      return []
    }
    return null
  }),
  useMutation: vi.fn(() => vi.fn()),
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
