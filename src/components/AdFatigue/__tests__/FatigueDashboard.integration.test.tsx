import { describe, test, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FatigueDashboard } from '../FatigueDashboard'
// import React from 'react'

// より現実的なモックデータ
const mockUseFatigueAnalysis = {
  typeBreakdown: {
    audience: { count: 5, percentage: 45 },
    creative: { count: 3, percentage: 27 },
    algorithm: { count: 3, percentage: 27 }
  },
  levelBreakdown: {
    critical: { count: 2, percentage: 18 },
    warning: { count: 4, percentage: 36 },
    caution: { count: 3, percentage: 27 },
    healthy: { count: 2, percentage: 18 }
  },
  criticalAds: [
    { adId: '1', adName: 'Test Ad 1', totalScore: 85 },
    { adId: '2', adName: 'Test Ad 2', totalScore: 72 }
  ],
  recommendedActions: [
    {
      adId: '1',
      adName: 'Test Ad 1',
      totalScore: 85,
      fatigueLevel: 'critical',
      recommendedAction: 'オーディエンスの疲労が限界に達しています。',
      metrics: {
        frequency: 4.2,
        ctrDeclineRate: 0.45,
        firstTimeRatio: 0.20
      }
    }
  ]
}

// エッジケースのモックデータ
const mockEmptyData = {
  typeBreakdown: null,
  levelBreakdown: null,
  criticalAds: null,
  recommendedActions: null
}

const mockPartialData = {
  typeBreakdown: {
    audience: { count: undefined, percentage: undefined }
  },
  levelBreakdown: {},
  criticalAds: undefined,
  recommendedActions: [
    {
      // 不完全なアクションオブジェクト
      adName: null,
      metrics: null
    }
  ]
}

describe('FatigueDashboard Integration Tests', () => {
  test('should handle all data correctly', () => {
    vi.mock('../../../hooks/useAdFatigue', () => ({
      useFatigueAnalysis: () => mockUseFatigueAnalysis
    }))

    const { container } = render(<FatigueDashboard accountId="test-account" />)
    
    // エラーが発生しないことを確認
    expect(container.querySelector('.error-boundary')).not.toBeInTheDocument()
    
    // データが正しく表示されることを確認
    expect(screen.getByText('2')).toBeInTheDocument() // critical count
    expect(screen.getByText('Test Ad 1')).toBeInTheDocument()
  })

  test('should handle empty data without crashing', () => {
    vi.mock('../../../hooks/useAdFatigue', () => ({
      useFatigueAnalysis: () => mockEmptyData
    }))

    const { container } = render(<FatigueDashboard accountId="test-account" />)
    
    // クラッシュしないことを確認
    expect(container).toBeTruthy()
    
    // デフォルト値が表示されることを確認
    expect(screen.getByText('24')).toBeInTheDocument() // デフォルトの分析済み広告数
  })

  test('should handle partial/malformed data gracefully', () => {
    vi.mock('../../../hooks/useAdFatigue', () => ({
      useFatigueAnalysis: () => mockPartialData
    }))

    const { container } = render(<FatigueDashboard accountId="test-account" />)
    
    // クラッシュしないことを確認
    expect(container).toBeTruthy()
    
    // 推奨アクションセクションが存在することを確認
    expect(screen.getByText('推奨アクション一覧')).toBeInTheDocument()
    
    // 不完全なデータでも表示されることを確認
    expect(screen.getByText('広告名なし')).toBeInTheDocument()
    expect(screen.getByText('推奨アクションなし')).toBeInTheDocument()
  })

  test('should not throw length error on undefined arrays', () => {
    const mockDataWithUndefinedArrays = {
      ...mockUseFatigueAnalysis,
      criticalAds: undefined,
      recommendedActions: undefined
    }

    vi.mock('../../../hooks/useAdFatigue', () => ({
      useFatigueAnalysis: () => mockDataWithUndefinedArrays
    }))

    // エラーが投げられないことを確認
    expect(() => {
      render(<FatigueDashboard accountId="test-account" />)
    }).not.toThrow()
  })

  test('should handle missing nested properties safely', () => {
    const mockDataWithMissingProperties = {
      typeBreakdown: {
        audience: null,
        creative: undefined,
        algorithm: { count: null, percentage: null }
      },
      levelBreakdown: {
        critical: undefined,
        warning: { count: undefined },
        caution: { percentage: 27 },
        healthy: {}
      },
      criticalAds: [],
      recommendedActions: [
        {
          metrics: {
            frequency: undefined,
            ctrDeclineRate: null
          }
        }
      ]
    }

    vi.mock('../../../hooks/useAdFatigue', () => ({
      useFatigueAnalysis: () => mockDataWithMissingProperties
    }))

    const { container } = render(<FatigueDashboard accountId="test-account" />)
    
    // クラッシュしないことを確認
    expect(container).toBeTruthy()
    
    // N/Aが表示されることを確認
    expect(screen.getAllByText('N/A').length).toBeGreaterThan(0)
  })
})