import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { EnhancedMetaApi } from '../enhanced-api-client'
import { DebugSession } from '../../debug'
import { DataValidator } from '../../validation/data-validator'

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

describe('Enhanced Meta API Integration Tests', () => {
  let enhancedApi: EnhancedMetaApi
  const mockToken = 'test_token_integration'
  const mockAccountId = 'act_987654321'

  beforeEach(() => {
    vi.clearAllMocks()
    enhancedApi = new EnhancedMetaApi(mockToken, mockAccountId)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Enhanced Workflow Integration', () => {
    it('should integrate with DebugSession and DataValidator', async () => {
      const debugSession = new DebugSession()
      const validator = new DataValidator(
        {
          currency: {
            accountCurrency: 'JPY',
            displayCurrency: 'JPY',
            decimalPlaces: 0
          },
          percentageHandling: {
            apiFormat: 'decimal',
            displayFormat: 'percentage'
          },
          rounding: {
            method: 'round',
            precision: 2
          }
        },
        {
          timezone: 'Asia/Tokyo',
          accountTimezone: 'Asia/Tokyo',
          timezoneOffset: 540,
          adjustForDST: false,
          inclusionMode: 'inclusive'
        },
        {
          clickWindow: '1d_click',
          viewWindow: '1d_view',
          useUnifiedAttribution: true
        }
      )

      // Mock API response with realistic data
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            {
              ad_id: '12345',
              ad_name: 'Summer Campaign - Video 1',
              campaign_id: '67890',
              campaign_name: 'Summer Campaign 2024',
              date_start: '2024-08-01',
              date_stop: '2024-08-01',
              impressions: '15000',
              clicks: '750',
              spend: '50000',
              ctr: '5.0',
              cpc: '66.67',
              cpm: '3333.33',
              frequency: '2.5',
              reach: '6000',
              account_currency: 'JPY'
            },
            {
              ad_id: '12346',
              ad_name: 'Summer Campaign - Image 1',
              campaign_id: '67890',
              campaign_name: 'Summer Campaign 2024',
              date_start: '2024-08-01',
              date_stop: '2024-08-01',
              impressions: '12000',
              clicks: '480',
              spend: '30000',
              ctr: '4.0',
              cpc: '62.5',
              cpm: '2500',
              frequency: '2.0',
              reach: '6000',
              account_currency: 'JPY'
            }
          ],
          paging: {}
        })
      })

      // Perform integrated workflow
      const result = await enhancedApi.getTimeSeriesInsights({
        datePreset: 'last_30d',
        debugSession
      })

      // Validate the complete workflow
      expect(result.data).toHaveLength(2)
      expect(result.metadata).toBeDefined()
      expect(result.metadata.currency).toBe('JPY')
      expect(result.metadata.timezone).toBe('Asia/Tokyo')
      expect(result.metadata.attributionSettings.unified).toBe(true)

      // Check debug session recorded the workflow
      const traces = debugSession.getTraces()
      expect(traces.length).toBeGreaterThan(0)
      
      const apiTrace = traces[0]
      expect(apiTrace.steps.some(step => step.name === 'API_REQUEST')).toBe(true)
      expect(apiTrace.steps.some(step => step.name === 'API_RESPONSE')).toBe(true)

      // Validate data with DataValidator
      result.data.forEach(insight => {
        const validationResult = validator.validateMetrics(insight)
        expect(validationResult.isValid).toBe(true)
        expect(validationResult.normalizedData).toBeDefined()
      })
    })
  })

  describe('Helper Methods Integration', () => {
    it('should work with getLastMonthInsights helper', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            { ad_id: '1', impressions: '1000', account_currency: 'JPY' }
          ],
          paging: {}
        })
      })

      const result = await enhancedApi.getLastMonthInsights()

      const url = new URL((global.fetch as any).mock.calls[0][0])
      expect(url.searchParams.get('date_preset')).toBe('last_month')
      expect(url.searchParams.get('time_zone')).toBe('Asia/Tokyo')
      expect(url.searchParams.get('use_unified_attribution_setting')).toBe('true')

      expect(result.metadata.timezone).toBe('Asia/Tokyo')
      expect(result.metadata.attributionSettings.unified).toBe(true)
    })

    it('should work with getCurrentMonthInsights helper', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [],
          paging: {}
        })
      })

      await enhancedApi.getCurrentMonthInsights()

      const url = new URL((global.fetch as any).mock.calls[0][0])
      expect(url.searchParams.get('date_preset')).toBe('this_month')
    })

    it('should work with getCustomRangeInsights helper', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [],
          paging: {}
        })
      })

      await enhancedApi.getCustomRangeInsights('2024-08-01', '2024-08-31')

      const url = new URL((global.fetch as any).mock.calls[0][0])
      const timeRange = JSON.parse(url.searchParams.get('time_range') || '{}')
      expect(timeRange.since).toBe('2024-08-01')
      expect(timeRange.until).toBe('2024-08-31')
    })
  })

  describe('Real-world Data Processing', () => {
    it('should handle 30 days of ad fatigue analysis data', async () => {
      // Generate 30 days of data for fatigue analysis
      const thirtyDaysData = Array.from({ length: 30 }, (_, dayIndex) => {
        return Array.from({ length: 5 }, (_, adIndex) => ({
          ad_id: `ad_${adIndex + 1}`,
          ad_name: `Campaign Ad ${adIndex + 1}`,
          campaign_id: 'campaign_123',
          campaign_name: 'Fatigue Test Campaign',
          date_start: `2024-08-${String(dayIndex + 1).padStart(2, '0')}`,
          date_stop: `2024-08-${String(dayIndex + 1).padStart(2, '0')}`,
          impressions: String(10000 - (dayIndex * 100)), // Declining impressions
          clicks: String(500 - (dayIndex * 10)), // Declining clicks
          spend: String(5000), // Constant spend
          ctr: String(((500 - (dayIndex * 10)) / (10000 - (dayIndex * 100)) * 100).toFixed(2)),
          frequency: String((2.0 + (dayIndex * 0.1)).toFixed(1)), // Increasing frequency
          reach: String(Math.max(5000 - (dayIndex * 50), 2000)),
          account_currency: 'JPY'
        }))
      }).flat()

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: thirtyDaysData,
          paging: {}
        })
      })

      const debugSession = new DebugSession()
      const result = await enhancedApi.getTimeSeriesInsights({
        datePreset: 'last_30d',
        debugSession,
        maxPages: 1
      })

      // Verify data structure
      expect(result.data).toHaveLength(150) // 30 days × 5 ads
      expect(result.metadata.processingTime).toBeGreaterThan(0)

      // Analyze trends for ad fatigue
      const ad1Data = result.data.filter(d => d.ad_id === 'ad_1')
      expect(ad1Data).toHaveLength(30)

      // Check if CTR is declining (ad fatigue indicator)
      const firstWeekCTR = parseFloat(ad1Data[0].ctr || '0')
      const lastWeekCTR = parseFloat(ad1Data[29].ctr || '0')
      expect(lastWeekCTR).toBeLessThan(firstWeekCTR)

      // Check if frequency is increasing (ad fatigue indicator)
      const firstWeekFreq = parseFloat(ad1Data[0].frequency || '0')
      const lastWeekFreq = parseFloat(ad1Data[29].frequency || '0')
      expect(lastWeekFreq).toBeGreaterThan(firstWeekFreq)

      // Verify debug information
      const debugData = debugSession.exportDebugData()
      expect(debugData.performance.processingTime).toBeGreaterThanOrEqual(0)
      expect(debugData.performance.apiCallDuration).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Error Handling Integration', () => {
    it('should handle rate limit with debug session', async () => {
      const debugSession = new DebugSession()
      const traceErrorSpy = vi.spyOn(debugSession, 'traceError')

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({
          error: {
            message: 'Application request limit reached',
            code: 4,
            type: 'OAuthException'
          }
        })
      })

      await expect(
        enhancedApi.getTimeSeriesInsights({ debugSession })
      ).rejects.toThrow(/rate limit/i)

      expect(traceErrorSpy).toHaveBeenCalled()

      const debugData = debugSession.exportDebugData()
      expect(debugData.errors).toHaveLength(1)
      expect(debugData.errors[0].message).toContain('Rate limit')
    })

    it('should handle authentication error with proper context', async () => {
      const debugSession = new DebugSession()

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          error: {
            message: 'Invalid OAuth access token - Cannot parse access token',
            code: 190,
            type: 'OAuthException'
          }
        })
      })

      await expect(
        enhancedApi.getTimeSeriesInsights({ debugSession })
      ).rejects.toThrow(/authentication/i)

      const traces = debugSession.getTraces()
      expect(traces[0].status).toBe('error')
      expect(traces[0].errorDetails).toBeDefined()
    })
  })

  describe('Performance Integration', () => {
    it('should maintain performance with debug enabled', async () => {
      const debugSession = new DebugSession()
      
      // Small dataset for performance test
      const testData = Array.from({ length: 50 }, (_, i) => ({
        ad_id: `perf_ad_${i}`,
        ad_name: `Performance Test Ad ${i}`,
        impressions: '1000',
        clicks: '50',
        spend: '100',
        account_currency: 'JPY'
      }))

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          data: testData,
          paging: {}
        })
      })

      const startTime = performance.now()
      const result = await enhancedApi.getTimeSeriesInsights({
        debugSession,
        maxPages: 1
      })
      const totalTime = performance.now() - startTime

      expect(result.data).toHaveLength(50)
      expect(result.metadata.processingTime).toBeLessThan(totalTime)
      expect(result.metadata.processingTime).toBeLessThan(1000) // Under 1 second

      // Debug overhead should be minimal
      const debugData = debugSession.exportDebugData()
      expect(debugData.performance.totalDuration).toBeLessThan(totalTime + 100)
    })
  })

  describe('Data Integrity Integration', () => {
    it('should maintain data integrity throughout the pipeline', async () => {
      const originalData = [
        {
          ad_id: '123456',
          ad_name: 'Integrity Test Ad',
          impressions: '15000',
          clicks: '750',
          spend: '50000.50',
          ctr: '5.0',
          account_currency: 'JPY',
          date_start: '2024-08-01',
          date_stop: '2024-08-01'
        }
      ]

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: originalData,
          paging: {}
        })
      })

      const result = await enhancedApi.getTimeSeriesInsights({
        timezone: 'Asia/Tokyo',
        currency: 'JPY'
      })

      // Verify data integrity
      const returnedAd = result.data[0]
      expect(returnedAd.ad_id).toBe('123456')
      expect(String(returnedAd.impressions)).toBe('15000')
      expect(String(returnedAd.spend)).toBe('50000.50')
      expect(returnedAd.account_currency).toBe('JPY')

      // Verify metadata integrity
      expect(result.metadata.currency).toBe('JPY')
      expect(result.metadata.timezone).toBe('Asia/Tokyo')
      expect(result.metadata.requestTimestamp).toBeInstanceOf(Date)
    })
  })
})