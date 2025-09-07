import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import CategoryAnalysis from './CategoryAnalysis'
import '../test/setup'

// Mock the useVibeLogger hook
vi.mock('../hooks/useVibeLogger', () => ({
  useVibeLogger: () => ({
    action: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  }),
}))

describe('CategoryAnalysis', () => {
  const renderWithRouter = (component: React.ReactElement) => {
    return render(<BrowserRouter>{component}</BrowserRouter>)
  }

  it('should render the component', () => {
    renderWithRouter(<CategoryAnalysis />)

    // Check if the page title is rendered
    expect(screen.getByText('カテゴリ分析')).toBeInTheDocument()
  })

  it('should display the correct total row', () => {
    renderWithRouter(<CategoryAnalysis />)

    // Check if the total row exists
    const totalCells = screen.getAllByText('合計')
    expect(totalCells.length).toBeGreaterThan(0)

    // Check if calculated totals are displayed
    expect(screen.getByText('4,033,391')).toBeInTheDocument() // Total details
    expect(screen.getByText('474,888')).toBeInTheDocument() // Total clicks
    expect(screen.getByText('13,377')).toBeInTheDocument() // Total CV
    expect(screen.getByText('¥7,288,299')).toBeInTheDocument() // Total cost
    expect(screen.getByText('2.82%')).toBeInTheDocument() // Total CVR
  })

  it('should display individual data rows', () => {
    renderWithRouter(<CategoryAnalysis />)

    // Check if individual rows are displayed - use getAllByText since GoogleAds appears multiple times
    const googleAdsElements = screen.getAllByText('GoogleAds')
    expect(googleAdsElements.length).toBeGreaterThan(0)

    const lineAdsElements = screen.getAllByText('LINE広告')
    expect(lineAdsElements.length).toBeGreaterThan(0)

    expect(screen.getByText('Yahoo!スポンサードサーチ')).toBeInTheDocument()
  })

  it('should display the bubble chart section', () => {
    renderWithRouter(<CategoryAnalysis />)

    // Check if the chart section is rendered
    expect(screen.getByText('設置を4分類した時の施策評価は？')).toBeInTheDocument()
    expect(screen.getByText('グラフを非表示')).toBeInTheDocument()
  })

  it('should display export button', () => {
    renderWithRouter(<CategoryAnalysis />)

    // Check if export button is rendered
    expect(screen.getByText('CSVをエクスポート')).toBeInTheDocument()
  })
})
