import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MetricCard } from '../MetricCard'

describe('MetricCard', () => {
  it('should render basic metric information', () => {
    render(<MetricCard title="広告費用" value={150000} format="currency" />)

    expect(screen.getByText('広告費用')).toBeInTheDocument()
    expect(screen.getByText('¥150,000')).toBeInTheDocument()
  })

  it('should render with percentage format', () => {
    render(<MetricCard title="CTR" value={2.5} format="percentage" />)

    expect(screen.getByText('CTR')).toBeInTheDocument()
    expect(screen.getByText('2.5%')).toBeInTheDocument()
  })

  it('should render with number format', () => {
    render(<MetricCard title="クリック数" value={12500} format="number" />)

    expect(screen.getByText('クリック数')).toBeInTheDocument()
    expect(screen.getByText('12,500')).toBeInTheDocument()
  })

  it('should render with comparison data', () => {
    render(
      <MetricCard
        title="ROAS"
        value={3.2}
        format="decimal"
        comparison={{
          value: 2.8,
          period: '前月',
        }}
      />
    )

    expect(screen.getByText('ROAS')).toBeInTheDocument()
    expect(screen.getByText('3.2')).toBeInTheDocument()
    expect(screen.getByText('+14.3%')).toBeInTheDocument()
    expect(screen.getByText('前月比')).toBeInTheDocument()
  })

  it('should show negative comparison', () => {
    render(
      <MetricCard
        title="CPA"
        value={2500}
        format="currency"
        comparison={{
          value: 2000,
          period: '前週',
        }}
      />
    )

    expect(screen.getByText('+25.0%')).toBeInTheDocument()
    expect(screen.getByText('前週比')).toBeInTheDocument()
  })

  it('should render with custom icon', () => {
    const CustomIcon = () => <svg data-testid="custom-icon" />

    render(
      <MetricCard title="インプレッション" value={1000000} format="number" icon={<CustomIcon />} />
    )

    expect(screen.getByTestId('custom-icon')).toBeInTheDocument()
  })

  it('should render with trend indicator', () => {
    render(<MetricCard title="コンバージョン" value={150} format="number" trend="up" />)

    expect(screen.getByTestId('trend-up')).toBeInTheDocument()
  })

  it('should render loading state', () => {
    render(<MetricCard title="広告費用" isLoading={true} />)

    expect(screen.getByText('広告費用')).toBeInTheDocument()
    expect(screen.getByTestId('metric-skeleton')).toBeInTheDocument()
  })

  it('should render error state', () => {
    render(<MetricCard title="広告費用" error="データを取得できませんでした" />)

    expect(screen.getByText('広告費用')).toBeInTheDocument()
    expect(screen.getByText('データを取得できませんでした')).toBeInTheDocument()
  })

  it('should apply custom className', () => {
    const { container } = render(
      <MetricCard
        title="広告費用"
        value={100000}
        format="currency"
        className="custom-metric-card"
      />
    )

    expect(container.firstChild).toHaveClass('custom-metric-card')
  })
})
