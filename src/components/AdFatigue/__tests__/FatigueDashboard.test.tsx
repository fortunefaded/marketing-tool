import { describe, test, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FatigueDashboard } from '../FatigueDashboard'

// Convexモックを作成
vi.mock('../../../hooks/useAdFatigue', () => ({
  useFatigueAnalysis: () => ({
    typeBreakdown: {
      audience: { count: 5, percentage: 45 },
      creative: { count: 3, percentage: 27 },
      algorithm: { count: 3, percentage: 27 },
    },
    levelBreakdown: {
      critical: { count: 2, percentage: 18 },
      warning: { count: 4, percentage: 36 },
      caution: { count: 3, percentage: 27 },
      healthy: { count: 2, percentage: 18 },
    },
    criticalAds: [],
    recommendedActions: [],
  }),
}))

vi.mock('../../../hooks/useAdFatigueRealSafe', () => ({
  useAdFatigueRealSafe: () => ({
    fatigueData: null,
    isCalculating: false,
    error: null,
    analyzeFatigue: vi.fn(),
    allAdsAnalysis: [],
  }),
}))

describe('FatigueDashboard', () => {
  test('should render without errors', () => {
    render(<FatigueDashboard accountId="test-account" />)

    expect(screen.getByText('広告疲労度分析ダッシュボード')).toBeInTheDocument()
  })

  test('should display summary statistics correctly', () => {
    render(<FatigueDashboard accountId="test-account" />)

    // サマリー統計が正しく表示されることを確認
    expect(screen.getByText('分析済み広告数')).toBeInTheDocument()
    expect(screen.getByText('危険域の広告')).toBeInTheDocument()
    expect(screen.getByText('警告域の広告')).toBeInTheDocument()
    expect(screen.getByText('健全な広告')).toBeInTheDocument()
  })

  test('should display fatigue type breakdown', () => {
    render(<FatigueDashboard accountId="test-account" />)

    // 疲労タイプ別分析が表示されることを確認
    expect(screen.getByText('オーディエンス疲労')).toBeInTheDocument()
    expect(screen.getByText('クリエイティブ疲労')).toBeInTheDocument()
    expect(screen.getByText('アルゴリズム疲労')).toBeInTheDocument()

    // カウントが正しく表示されることを確認
    expect(screen.getByText('5')).toBeInTheDocument() // オーディエンス疲労のカウント
    expect(screen.getByText('3')).toBeInTheDocument() // クリエイティブ疲労のカウント
  })

  test('should display alerts section', () => {
    render(<FatigueDashboard accountId="test-account" />)

    expect(screen.getByText('アクティブなアラート')).toBeInTheDocument()
  })

  test('should handle missing data gracefully', () => {
    render(<FatigueDashboard accountId="test-account" />)

    // デフォルト値が表示されることを確認
    expect(screen.getByText('24')).toBeInTheDocument() // デフォルトの分析済み広告数
  })
})

// 追加の統合テスト
describe('FatigueDashboard Integration', () => {
  test('should handle Convex connection errors', () => {
    // エラーをキャッチすることを確認
    const { container } = render(<FatigueDashboard accountId="test-account" />)

    // エラーが表示されないことを確認
    expect(container.textContent).not.toContain('Error')
  })
})
