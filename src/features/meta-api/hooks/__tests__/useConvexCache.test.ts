import { describe, it, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useConvexCache } from '../useConvexCache'

// Mock useSafeConvexQuery
vi.mock('../useSafeConvexQuery', () => ({
  useSafeConvexQuery: vi.fn()
}))

import { useSafeConvexQuery } from '../useSafeConvexQuery'

describe('useConvexCache', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })
  
  it('returns cache data when available', () => {
    const mockData = {
      items: [
        { id: '1', name: 'Ad 1' },
        { id: '2', name: 'Ad 2' }
      ]
    }
    
    vi.mocked(useSafeConvexQuery).mockReturnValue({
      data: mockData,
      isLoading: false,
      error: null,
      status: 'success'
    })
    
    const { result } = renderHook(() => useConvexCache('account-123'))
    
    expect(result.current.data).toEqual(mockData.items)
    expect(result.current.hasCache).toBe(true)
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
  })
  
  it('returns empty data when no items', () => {
    vi.mocked(useSafeConvexQuery).mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
      status: 'success'
    })
    
    const { result } = renderHook(() => useConvexCache('account-123'))
    
    expect(result.current.data).toBeNull()
    expect(result.current.hasCache).toBe(false)
  })
  
  it('passes error through', () => {
    const mockError = new Error('Query failed')
    
    vi.mocked(useSafeConvexQuery).mockReturnValue({
      data: null,
      isLoading: false,
      error: mockError,
      status: 'error'
    })
    
    const { result } = renderHook(() => useConvexCache('account-123'))
    
    expect(result.current.error).toBe(mockError)
    expect(result.current.data).toBeNull()
  })
  
  it('shows loading when Convex is initializing', () => {
    vi.mocked(useSafeConvexQuery).mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
      status: 'loading'
    })
    
    const { result } = renderHook(() => useConvexCache('account-123'))
    
    expect(result.current.isLoading).toBe(true)
    expect(result.current.data).toBeNull()
  })
})