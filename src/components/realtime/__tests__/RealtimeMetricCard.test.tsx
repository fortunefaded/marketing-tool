import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { describe, it, expect } from 'vitest'
import { RealtimeMetricCard } from '../RealtimeMetricCard'
import { CurrencyYenIcon } from '@heroicons/react/24/outline'

describe('RealtimeMetricCard', () => {
  const defaultProps = {
    title: '売上',
    value: 150000,
    format: 'currency' as const,
    icon: <CurrencyYenIcon className="h-6 w-6" />
  }

  it('通貨形式で値を表示する', () => {
    render(<RealtimeMetricCard {...defaultProps} />)
    
    expect(screen.getByText('売上')).toBeInTheDocument()
    expect(screen.getByText('¥150,000')).toBeInTheDocument()
  })

  it('数値形式で値を表示する', () => {
    render(
      <RealtimeMetricCard
        title="注文数"
        value={1234}
        format="number"
        icon={<CurrencyYenIcon className="h-6 w-6" />}
      />
    )
    
    expect(screen.getByText('注文数')).toBeInTheDocument()
    expect(screen.getByText('1,234')).toBeInTheDocument()
  })

  it('パーセンテージ形式で値を表示する', () => {
    render(
      <RealtimeMetricCard
        title="コンバージョン率"
        value={3.76}
        format="percentage"
        icon={<CurrencyYenIcon className="h-6 w-6" />}
      />
    )
    
    expect(screen.getByText('コンバージョン率')).toBeInTheDocument()
    expect(screen.getByText('3.76%')).toBeInTheDocument()
  })

  it('ポジティブなトレンドを表示する', () => {
    render(
      <RealtimeMetricCard
        {...defaultProps}
        trend={12.5}
      />
    )
    
    const trendElement = screen.getByText('+12.5%')
    expect(trendElement).toBeInTheDocument()
    const trendContainer = trendElement.closest('div')
    expect(trendContainer).toHaveClass('text-green-400')
  })

  it('ネガティブなトレンドを表示する', () => {
    render(
      <RealtimeMetricCard
        {...defaultProps}
        trend={-5.3}
      />
    )
    
    const trendElement = screen.getByText('-5.3%')
    expect(trendElement).toBeInTheDocument()
    const trendContainer = trendElement.closest('div')
    expect(trendContainer).toHaveClass('text-red-400')
  })

  it('トレンドがゼロの場合は表示しない', () => {
    render(
      <RealtimeMetricCard
        {...defaultProps}
        trend={0}
      />
    )
    
    expect(screen.queryByText('0%')).not.toBeInTheDocument()
  })

  it('トレンドが未定義の場合は表示しない', () => {
    render(
      <RealtimeMetricCard
        {...defaultProps}
        trend={undefined}
      />
    )
    
    expect(screen.queryByText('%')).not.toBeInTheDocument()
  })

  it('アイコンを表示する', () => {
    const { container } = render(<RealtimeMetricCard {...defaultProps} />)
    
    const icon = container.querySelector('svg')
    expect(icon).toBeInTheDocument()
  })

  it('読み込み中状態を表示する', () => {
    render(
      <RealtimeMetricCard
        {...defaultProps}
        isLoading={true}
      />
    )
    
    expect(screen.getByText('売上')).toBeInTheDocument()
    expect(screen.getByText('読み込み中...')).toBeInTheDocument()
    expect(screen.queryByText('¥150,000')).not.toBeInTheDocument()
  })

  it('前の値との比較を表示する', () => {
    render(
      <RealtimeMetricCard
        {...defaultProps}
        previousValue={120000}
      />
    )
    
    const percentage = ((150000 - 120000) / 120000) * 100
    expect(screen.getByText(`+${percentage.toFixed(1)}%`)).toBeInTheDocument()
  })

  it('カスタムスタイルを適用する', () => {
    render(
      <RealtimeMetricCard
        {...defaultProps}
        className="custom-class"
      />
    )
    
    const card = screen.getByText('売上').closest('div')
    expect(card).toHaveClass('custom-class')
  })

  it('値がゼロの場合も正しく表示する', () => {
    render(
      <RealtimeMetricCard
        {...defaultProps}
        value={0}
      />
    )
    
    expect(screen.getByText('¥0')).toBeInTheDocument()
  })

  it('大きな数値を適切にフォーマットする', () => {
    render(
      <RealtimeMetricCard
        {...defaultProps}
        value={1234567890}
      />
    )
    
    expect(screen.getByText('¥1,234,567,890')).toBeInTheDocument()
  })

  it('小数点以下の値を適切に表示する', () => {
    render(
      <RealtimeMetricCard
        {...defaultProps}
        value={150.5}
        format="currency"
      />
    )
    
    expect(screen.getByText('¥151')).toBeInTheDocument()
  })

  it('説明文を表示する', () => {
    render(
      <RealtimeMetricCard
        {...defaultProps}
        description="前日比"
      />
    )
    
    expect(screen.getByText('前日比')).toBeInTheDocument()
  })
})