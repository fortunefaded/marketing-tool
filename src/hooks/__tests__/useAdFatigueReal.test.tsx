import { describe, test, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { ConvexProvider, ConvexReactClient } from 'convex/react'
// Test file for archived hook - skipping import
// import { useAdFatigueReal } from '../useAdFatigueReal'
import React from 'react'

// Convexモックを作成
const mockQuery = vi.fn()
const mockMutation = vi.fn()

vi.mock('convex/react', async () => {
  const actual = await vi.importActual<typeof import('convex/react')>('convex/react')
  return {
    ...actual,
    useQuery: () => mockQuery(),
    useMutation: () => mockMutation,
  }
})

describe.skip('useAdFatigueReal - archived hook', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => {
    const client = new ConvexReactClient(
      import.meta.env.VITE_CONVEX_URL || 'https://test.convex.cloud'
    )
    return <ConvexProvider client={client}>{children}</ConvexProvider>
  }

  beforeEach(() => {
    mockQuery.mockClear()
    mockMutation.mockClear()
  })

  test('should handle missing Convex functions gracefully', () => {
    // Convex関数が見つからない場合のエラーをシミュレート
    mockQuery.mockReturnValue(undefined)

    const { result } = renderHook(() => useAdFatigueReal('test-account', 'test-ad'), { wrapper })

    expect(result.current.fatigueData).toBeNull()
    expect(result.current.error).toBeNull()
    expect(result.current.isCalculating).toBe(false)
  })

  test('should return fatigue data when calculation succeeds', async () => {
    const mockFatigueData = {
      adId: 'test-ad',
      adName: 'Test Ad',
      campaignId: 'test-campaign',
      campaignName: 'Test Campaign',
      creativeId: 'test-creative',
      creativeType: 'VIDEO',
      fatigueScore: {
        total: 65,
        breakdown: {
          audience: 70,
          creative: 60,
          algorithm: 65,
        },
        primaryIssue: 'audience' as const,
        status: 'warning' as const,
      },
      metrics: {
        frequency: 3.2,
        firstTimeRatio: 0.35,
        ctrDeclineRate: 0.28,
        cpmIncreaseRate: 0.22,
        reach: 50000,
        impressions: 160000,
        ctr: 1.2,
        cpm: 1200,
        conversions: 100,
        daysActive: 5,
      },
      recommendedAction: 'オーディエンスへの露出頻度が高くなっています。',
      dataRange: {
        start: '2024-01-01',
        end: '2024-01-05',
      },
      analyzedAt: new Date().toISOString(),
    }

    mockQuery.mockReturnValue(mockFatigueData)

    const { result } = renderHook(() => useAdFatigueReal('test-account', 'test-ad'), { wrapper })

    await waitFor(() => {
      expect(result.current.fatigueData).toEqual(mockFatigueData)
    })

    expect(result.current.error).toBeNull()
    expect(result.current.isCalculating).toBe(false)
  })

  test('should handle errors during analysis', async () => {
    mockQuery.mockReturnValue(null)
    mockMutation.mockRejectedValue(new Error('Analysis failed'))

    const { result } = renderHook(() => useAdFatigueReal('test-account'), { wrapper })

    try {
      await result.current.analyzeFatigue('test-ad')
    } catch (error) {
      expect(error).toBeInstanceOf(Error)
      expect((error as Error).message).toBe('分析するデータが見つかりません')
    }

    await waitFor(() => {
      expect(result.current.error).toBe('分析するデータが見つかりません')
    })
  })
})
