import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DashboardLayout } from '../DashboardLayout'

describe('DashboardLayout', () => {
  it('should render with children', () => {
    render(
      <DashboardLayout>
        <div data-testid="test-child">Test Content</div>
      </DashboardLayout>
    )

    expect(screen.getByTestId('test-child')).toBeInTheDocument()
    expect(screen.getByText('Test Content')).toBeInTheDocument()
  })

  it('should have proper responsive grid layout', () => {
    const { container } = render(
      <DashboardLayout>
        <div>Content</div>
      </DashboardLayout>
    )

    const layout = container.firstChild
    expect(layout).toHaveClass('dashboard-layout')
    expect(layout).toHaveClass('grid')
  })

  it('should render header section', () => {
    render(
      <DashboardLayout title="広告パフォーマンス">
        <div>Content</div>
      </DashboardLayout>
    )

    expect(screen.getByText('広告パフォーマンス')).toBeInTheDocument()
  })

  it('should render with date range selector', () => {
    render(
      <DashboardLayout title="広告パフォーマンス" showDateRange={true}>
        <div>Content</div>
      </DashboardLayout>
    )

    expect(screen.getByText('期間を選択')).toBeInTheDocument()
  })

  it('should render with filter section', () => {
    render(
      <DashboardLayout title="広告パフォーマンス" showFilters={true}>
        <div>Content</div>
      </DashboardLayout>
    )

    expect(screen.getByText('フィルター')).toBeInTheDocument()
  })

  it('should apply custom className', () => {
    const { container } = render(
      <DashboardLayout className="custom-class">
        <div>Content</div>
      </DashboardLayout>
    )

    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('should render loading state', () => {
    render(
      <DashboardLayout isLoading={true}>
        <div>Content</div>
      </DashboardLayout>
    )

    expect(screen.getByText('データを読み込んでいます...')).toBeInTheDocument()
  })

  it('should render error state', () => {
    render(
      <DashboardLayout error="データの取得に失敗しました">
        <div>Content</div>
      </DashboardLayout>
    )

    expect(screen.getByText('データの取得に失敗しました')).toBeInTheDocument()
  })
})
