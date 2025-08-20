import { describe, test, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useAdFatigueRealSafe } from '../useAdFatigueRealSafe'
import { useQuery } from 'convex/react'

// Mock convex/react
vi.mock('convex/react', () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
}))

// Mock the api
vi.mock('../../../convex/_generated/api', () => ({
  api: {
    adFatigueCalculator: {
      calculateFatigueFromInsights: 'calculateFatigueFromInsights',
      getSavedFatigueAnalysis: 'getSavedFatigueAnalysis',
      saveFatigueAnalysis: 'saveFatigueAnalysis',
      getAllAdsFatigueAnalysis: 'getAllAdsFatigueAnalysis',
    }
  }
}))

describe('useAdFatigueRealSafe', () => {
  test('should handle undefined allAdsAnalysis gracefully', () => {
    const mockedUseQuery = vi.mocked(useQuery)
    
    // Mock all queries to return undefined
    mockedUseQuery.mockReturnValue(undefined)
    
    const { result } = renderHook(() => useAdFatigueRealSafe('test-account'))
    
    // Should return empty array for allAdsAnalysis instead of undefined
    expect(result.current.allAdsAnalysis).toEqual([])
    expect(result.current.error).toBeNull()
    expect(result.current.fatigueData).toBeNull()
  })

  test('should handle savedAnalysis with missing properties', () => {
    const mockedUseQuery = vi.mocked(useQuery)
    
    // Mock different return values for different queries
    mockedUseQuery.mockImplementation((() => {
      // Return incomplete savedAnalysis
      return {
        adId: 'test-ad',
        // Missing other properties
      }
    }) as any)
    
    const { result } = renderHook(() => useAdFatigueRealSafe('test-account', 'test-ad'))
    
    // Should not throw error
    expect(() => result.current).not.toThrow()
  })

  test('should handle null values in queries', () => {
    const mockedUseQuery = vi.mocked(useQuery)
    
    // Mock all queries to return null
    mockedUseQuery.mockReturnValue(null)
    
    const { result } = renderHook(() => useAdFatigueRealSafe('test-account'))
    
    expect(result.current.allAdsAnalysis).toEqual([])
    expect(result.current.error).toBeNull()
    expect(result.current.fatigueData).toBeNull()
  })
})