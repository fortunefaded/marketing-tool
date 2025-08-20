import { describe, test, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useAdFatigueRealSafe } from '../useAdFatigueRealSafe'

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
    const { useQuery } = require('convex/react')
    
    // Mock all queries to return undefined
    useQuery.mockReturnValue(undefined)
    
    const { result } = renderHook(() => useAdFatigueRealSafe('test-account'))
    
    // Should return empty array for allAdsAnalysis instead of undefined
    expect(result.current.allAdsAnalysis).toEqual([])
    expect(result.current.error).toBeNull()
    expect(result.current.fatigueData).toBeNull()
  })

  test('should handle savedAnalysis with missing properties', () => {
    const { useQuery } = require('convex/react')
    
    // Mock different return values for different queries
    useQuery.mockImplementation((query: any) => {
      if (query === 'getSavedFatigueAnalysis') {
        // Return incomplete savedAnalysis
        return {
          adId: 'test-ad',
          // Missing other properties
        }
      }
      return undefined
    })
    
    const { result } = renderHook(() => useAdFatigueRealSafe('test-account', 'test-ad'))
    
    // Should not throw error
    expect(() => result.current).not.toThrow()
  })

  test('should handle null values in queries', () => {
    const { useQuery } = require('convex/react')
    
    // Mock all queries to return null
    useQuery.mockReturnValue(null)
    
    const { result } = renderHook(() => useAdFatigueRealSafe('test-account'))
    
    expect(result.current.allAdsAnalysis).toEqual([])
    expect(result.current.error).toBeNull()
    expect(result.current.fatigueData).toBeNull()
  })
})