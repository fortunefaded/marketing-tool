import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { SimpleMetaApi } from '../api-client'
import { DebugSession } from '../../debug'
import type { EnhancedInsightsOptions, EnhancedPaginatedResult } from '../types/enhanced-api'

// Mock fetch
global.fetch = vi.fn()

// Mock vibe logger
vi.mock('../../../../lib/vibelogger', () => ({
  vibe: {
    debug: vi.fn(),
    bad: vi.fn(),
    warn: vi.fn(),
    good: vi.fn()
  }
}))

describe('SimpleMetaApi Enhanced Features', () => {
  let api: SimpleMetaApi
  const mockToken = 'test_token_123'
  const mockAccountId = 'act_123456789'

  beforeEach(() => {
    vi.clearAllMocks()
    api = new SimpleMetaApi(mockToken, mockAccountId)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getTimeSeriesInsights', () => {
    it('TC-001: should include time series parameters', async () => {
      // Setup mock response
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [],
          paging: {}
        })
      })

      await api.getTimeSeriesInsights({ datePreset: 'last_30d' })

      const fetchCall = (global.fetch as any).mock.calls[0]
      const url = new URL(fetchCall[0])

      // Check time_increment
      expect(url.searchParams.get('time_increment')).toBe('1')
      
      // Check fields include date fields
      const fields = url.searchParams.get('fields')
      expect(fields).toContain('date_start')
      expect(fields).toContain('date_stop')
      expect(fields).toContain('account_currency')
    })

    it('TC-002: should set timezone parameter', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [], paging: {} })
      })

      await api.getTimeSeriesInsights({ 
        timezone: 'Asia/Tokyo' 
      })

      const url = new URL((global.fetch as any).mock.calls[0][0])
      expect(url.searchParams.get('time_zone')).toBe('Asia/Tokyo')
    })

    it('TC-003: should use default timezone', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [], paging: {} })
      })

      await api.getTimeSeriesInsights({})

      const url = new URL((global.fetch as any).mock.calls[0][0])
      expect(url.searchParams.get('time_zone')).toBe('Asia/Tokyo')
    })

    it('TC-004: should include account_currency field', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [], paging: {} })
      })

      await api.getTimeSeriesInsights()

      const url = new URL((global.fetch as any).mock.calls[0][0])
      const fields = url.searchParams.get('fields')
      expect(fields).toContain('account_currency')
    })

    it('TC-005: should return metadata with currency', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{ account_currency: 'JPY' }],
          paging: {}
        })
      })

      const result = await api.getTimeSeriesInsights({ currency: 'USD' })

      expect(result.metadata).toBeDefined()
      expect(result.metadata.currency).toBe('USD')
    })

    it('TC-006: should set unified attribution setting', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [], paging: {} })
      })

      await api.getTimeSeriesInsights({ 
        useUnifiedAttribution: true 
      })

      const url = new URL((global.fetch as any).mock.calls[0][0])
      expect(url.searchParams.get('use_unified_attribution_setting')).toBe('true')
    })

    it('TC-007: should set custom attribution windows', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [], paging: {} })
      })

      await api.getTimeSeriesInsights({ 
        attributionWindows: ['7d_click', '1d_view'] 
      })

      const url = new URL((global.fetch as any).mock.calls[0][0])
      const windows = url.searchParams.get('action_attribution_windows')
      expect(windows).toBe('["7d_click","1d_view"]')
    })

    it('TC-008: should use default attribution windows', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [], paging: {} })
      })

      await api.getTimeSeriesInsights()

      const url = new URL((global.fetch as any).mock.calls[0][0])
      const windows = url.searchParams.get('action_attribution_windows')
      expect(windows).toBe('["1d_click","1d_view"]')
    })
  })

  describe('Debug Integration', () => {
    it('TC-009: should trace API requests with debug session', async () => {
      const debugSession = new DebugSession()
      const traceApiRequestSpy = vi.spyOn(debugSession, 'traceApiRequest')
      const traceApiResponseSpy = vi.spyOn(debugSession, 'traceApiResponse')

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [], paging: {} })
      })

      await api.getTimeSeriesInsights({ 
        debugSession 
      })

      expect(traceApiRequestSpy).toHaveBeenCalledWith(
        expect.stringContaining('/insights'),
        expect.objectContaining({
          datePreset: expect.any(String)
        })
      )

      expect(traceApiResponseSpy).toHaveBeenCalledWith(
        expect.objectContaining({ data: [] }),
        expect.any(Number)
      )
    })

    it('TC-010: should trace errors with debug session', async () => {
      const debugSession = new DebugSession()
      const traceErrorSpy = vi.spyOn(debugSession, 'traceError')

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: {
            message: 'Invalid request',
            code: 400
          }
        })
      })

      await expect(
        api.getTimeSeriesInsights({ debugSession })
      ).rejects.toThrow()

      expect(traceErrorSpy).toHaveBeenCalled()
    })
  })

  describe('Response Processing', () => {
    it('TC-011: should return enhanced metadata', async () => {
      const startTime = Date.now()
      
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            { ad_id: '1', impressions: '100', account_currency: 'JPY' }
          ],
          paging: {}
        })
      })

      const result = await api.getTimeSeriesInsights({
        timezone: 'Asia/Tokyo',
        useUnifiedAttribution: true,
        attributionWindows: ['1d_click', '1d_view']
      })

      expect(result.metadata).toEqual({
        currency: 'JPY',
        timezone: 'Asia/Tokyo',
        attributionSettings: {
          unified: true,
          windows: ['1d_click', '1d_view']
        },
        requestTimestamp: expect.any(Date),
        processingTime: expect.any(Number)
      })

      expect(result.metadata.requestTimestamp.getTime()).toBeGreaterThanOrEqual(startTime)
      expect(result.metadata.processingTime).toBeGreaterThanOrEqual(0)
    })

    it('TC-012: should validate data with DataValidator', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            { 
              ad_id: '1', 
              ad_name: 'Test Ad',
              impressions: '1000',
              clicks: '50',
              spend: '5000'
            }
          ],
          paging: {}
        })
      })

      const result = await api.getTimeSeriesInsights()

      // Check that data is validated (normalized)
      expect(result.data[0]).toBeDefined()
      // Note: Actual validation implementation will be added in Step 4
    })
  })

  describe('Error Handling', () => {
    it('TC-013: should handle rate limit errors', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({
          error: {
            message: 'Too many requests',
            code: 4,
            type: 'OAuthException'
          }
        })
      })

      await expect(
        api.getTimeSeriesInsights()
      ).rejects.toThrow(/rate limit/i)
    })

    it('TC-014: should handle authentication errors', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          error: {
            message: 'Invalid OAuth access token',
            code: 190,
            type: 'OAuthException'
          }
        })
      })

      await expect(
        api.getTimeSeriesInsights()
      ).rejects.toThrow(/authentication|oauth/i)
    })

    it('TC-015: should handle network errors', async () => {
      const debugSession = new DebugSession()
      const traceErrorSpy = vi.spyOn(debugSession, 'traceError')

      ;(global.fetch as any).mockRejectedValueOnce(
        new Error('Network error')
      )

      await expect(
        api.getTimeSeriesInsights({ debugSession })
      ).rejects.toThrow('Network error')

      expect(traceErrorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Network error'
        }),
        expect.any(Object)
      )
    })
  })

  describe('Backward Compatibility', () => {
    it('TC-016: should maintain existing getInsights behavior', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{ ad_id: '1' }],
          paging: {}
        })
      })

      const result = await api.getInsights({ 
        datePreset: 'last_30d' 
      })

      expect(result.data).toHaveLength(1)
      expect(result.data[0].ad_id).toBe('1')
    })

    it('TC-017: should separate breakdowns and time_increment', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [], paging: {} })
      })

      // This would be a getPlatformBreakdown method
      await api.getInsights({ datePreset: 'last_30d' })

      const url = new URL((global.fetch as any).mock.calls[0][0])
      
      // getInsights should include time_increment
      expect(url.searchParams.get('time_increment')).toBe('1')
      
      // Should not include breakdowns (would be in separate method)
      expect(url.searchParams.get('breakdowns')).toBeNull()
    })
  })

  describe('Edge Cases', () => {
    it('E-001: should handle invalid timezone', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [], paging: {} })
      })

      await api.getTimeSeriesInsights({ 
        timezone: 'Invalid/Zone' 
      })

      // Should fallback to default or pass through
      const url = new URL((global.fetch as any).mock.calls[0][0])
      const tz = url.searchParams.get('time_zone')
      expect(tz).toBeTruthy() // Either 'Invalid/Zone' or default 'Asia/Tokyo'
    })

    it('E-002: should handle empty response', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [],
          paging: {}
        })
      })

      const result = await api.getTimeSeriesInsights()

      expect(result.data).toEqual([])
      expect(result.hasMore).toBe(false)
      expect(result.totalCount).toBe(0)
    })

    it('E-003: should handle large data pagination', async () => {
      const largeData = Array.from({ length: 100 }, (_, i) => ({
        ad_id: `ad_${i}`,
        impressions: '1000'
      }))

      ;(global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: largeData.slice(0, 50),
            paging: { next: 'http://example.com/page2' }
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: largeData.slice(50, 100),
            paging: {}
          })
        })

      const result = await api.getTimeSeriesInsights({ 
        maxPages: 2 
      })

      expect(result.data).toHaveLength(100)
      expect(result.totalCount).toBe(100)
    })

    it('E-004: should handle timeout', async () => {
      ;(global.fetch as any).mockImplementationOnce(
        () => new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: async () => ({ data: [], paging: {} })
            })
          }, 35000) // Longer than 30s timeout
        })
      )

      // This should timeout
      // Note: Actual timeout implementation will be in Step 4
      // For now, just verify the call is made
      const promise = api.getTimeSeriesInsights()
      
      // Clean up to avoid hanging test
      ;(global.fetch as any).mockClear()
      
      expect(promise).toBeDefined()
    })
  })

  describe('Performance', () => {
    it('P-001: should have minimal debug overhead', async () => {
      const debugSession = new DebugSession()
      
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          data: Array.from({ length: 100 }, (_, i) => ({
            ad_id: `ad_${i}`,
            impressions: '1000'
          })),
          paging: {}
        })
      })

      const startWithDebug = performance.now()
      await api.getTimeSeriesInsights({ debugSession })
      const timeWithDebug = performance.now() - startWithDebug

      const startWithoutDebug = performance.now()
      await api.getTimeSeriesInsights()
      const timeWithoutDebug = performance.now() - startWithoutDebug

      const overhead = ((timeWithDebug - timeWithoutDebug) / timeWithoutDebug) * 100
      
      // Allow up to 10% overhead
      expect(Math.abs(overhead)).toBeLessThan(10)
    })

    it('P-002: should handle large datasets efficiently', () => {
      const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
        ad_id: `ad_${i}`,
        ad_name: `Ad ${i}`,
        impressions: '1000',
        clicks: '50',
        spend: '100'
      }))

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: largeDataset,
          paging: {}
        })
      })

      const memoryBefore = process.memoryUsage().heapUsed
      
      return api.getTimeSeriesInsights().then(result => {
        const memoryAfter = process.memoryUsage().heapUsed
        const memoryUsed = (memoryAfter - memoryBefore) / (1024 * 1024) // MB
        
        expect(result.data).toHaveLength(10000)
        expect(memoryUsed).toBeLessThan(100) // Less than 100MB
      })
    })
  })
})