import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { 
  DebugSession,
  getGlobalDebugSession,
  resetGlobalDebugSession,
  createDebugContext
} from '../index'
import { DataValidator } from '../../validation/data-validator'
import type { AdInsight } from '../../validation/types/data-validation'

// Mock fetch
global.fetch = vi.fn()

describe('DebugSession Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetGlobalDebugSession()
    localStorage.clear()
  })

  describe('Integration with DataValidator', () => {
    it('should trace data validation process', async () => {
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

      const result = await createDebugContext('DataValidation', async (session) => {
        // Simulate API request
        session.traceApiRequest('/api/insights', { 
          date_preset: 'last_month' 
        })

        // Simulate API response
        const apiData: AdInsight[] = [
          {
            ad_id: '123',
            ad_name: 'Test Ad',
            impressions: '10000',
            clicks: '500',
            spend: '50000',
            ctr: '5.0',
            frequency: '2.5'
          }
        ]
        session.traceApiResponse({ data: apiData }, 200)

        // Validate data
        const startTime = performance.now()
        const validationResults = apiData.map(d => validator.validateMetrics(d))
        const duration = performance.now() - startTime
        
        session.traceDataProcessing(
          'VALIDATION',
          apiData,
          validationResults,
          duration
        )

        return validationResults
      })

      expect(result).toHaveLength(1)
      expect(result[0].isValid).toBe(true)
    })
  })

  describe('Global Session Management', () => {
    it('should maintain single global session', () => {
      const session1 = getGlobalDebugSession()
      const session2 = getGlobalDebugSession()
      
      expect(session1).toBe(session2)
      expect(session1.getSessionId()).toBe(session2.getSessionId())
    })

    it('should reset global session', () => {
      const session1 = getGlobalDebugSession()
      const sessionId1 = session1.getSessionId()
      
      resetGlobalDebugSession()
      
      const session2 = getGlobalDebugSession()
      const sessionId2 = session2.getSessionId()
      
      expect(sessionId1).not.toBe(sessionId2)
    })

    it('should save session on reset', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'
      
      const session = getGlobalDebugSession()
      session.traceApiRequest('/api/test', {})
      
      const setItemSpy = vi.spyOn(localStorage, 'setItem')
      resetGlobalDebugSession()
      
      expect(setItemSpy).toHaveBeenCalledWith(
        expect.stringContaining('debug-session-'),
        expect.any(String)
      )
      
      process.env.NODE_ENV = originalEnv
    })
  })

  describe('Debug Context Helper', () => {
    it('should automatically log and save on completion', async () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'
      
      const consoleSpy = vi.spyOn(console, 'group')
      const storageSpy = vi.spyOn(localStorage, 'setItem')
      
      await createDebugContext('TestOperation', async (session) => {
        session.traceApiRequest('/api/test', {})
        session.traceApiResponse({ success: true }, 100)
        return { result: 'success' }
      })
      
      expect(consoleSpy).toHaveBeenCalled()
      expect(storageSpy).toHaveBeenCalled()
      
      process.env.NODE_ENV = originalEnv
    })

    it('should handle errors in context', async () => {
      const testError = new Error('Test error')
      
      await expect(
        createDebugContext('ErrorOperation', async (session) => {
          session.traceApiRequest('/api/test', {})
          throw testError
        })
      ).rejects.toThrow('Test error')
    })
  })

  describe('Manual Trace Integration', () => {
    it('should trace methods manually', async () => {
      const session = getGlobalDebugSession()
      
      // Initialize a trace first
      session.traceApiRequest('/api/process', { value: 123 })
      
      // Manually trace instead of using decorators
      const processData = async (input: any) => {
        const startTime = performance.now()
        try {
          await new Promise(resolve => setTimeout(resolve, 10))
          const result = { ...input, processed: true }
          session.traceDataProcessing(
            'TEST_PROCESS:processData',
            input,
            result,
            performance.now() - startTime
          )
          return result
        } catch (error) {
          session.traceError(error as Error, { method: 'processData', input })
          throw error
        }
      }
      
      const result = await processData({ value: 123 })
      
      expect(result).toEqual({ value: 123, processed: true })
      
      const traces = session.getTraces()
      expect(traces.length).toBeGreaterThan(0)
      const lastTrace = traces[traces.length - 1]
      const lastStep = lastTrace.steps[lastTrace.steps.length - 1]
      
      expect(lastStep.name).toBe('TEST_PROCESS:processData')
      expect(lastStep.output).toEqual({ value: 123, processed: true })
    })

    it('should trace errors manually', async () => {
      const session = getGlobalDebugSession()
      
      const processWithError = async (input: any) => {
        session.traceApiRequest('/process', input)
        const error = new Error('Processing failed')
        session.traceError(error, { method: 'processWithError', input })
        throw error
      }
      
      await expect(
        processWithError({ value: 456 })
      ).rejects.toThrow('Processing failed')
      
      const traces = session.getTraces()
      const lastTrace = traces[traces.length - 1]
      
      expect(lastTrace.status).toBe('error')
      expect(lastTrace.errorDetails).toBeDefined()
      expect(lastTrace.errorDetails![0].message).toBe('Processing failed')
    })
  })

  describe('Real-world Scenario', () => {
    it('should handle complete Meta API flow', async () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'
      
      // Mock fetch response
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            {
              ad_id: '123',
              ad_name: 'Campaign A',
              impressions: '15000',
              clicks: '750',
              spend: '100000',
              date_start: '2024-08-01',
              date_stop: '2024-08-31'
            }
          ],
          paging: { next: null }
        })
      })

      const result = await createDebugContext('MetaAPIFlow', async (session) => {
        // 1. API Request
        const url = '/api/insights'
        const params = {
          fields: ['ad_id', 'ad_name', 'impressions', 'clicks', 'spend'],
          date_preset: 'last_month',
          time_increment: '1'
        }
        
        session.traceApiRequest(url, params)
        const startTime = performance.now()
        
        // 2. Fetch data
        const response = await fetch(url, {
          method: 'POST',
          body: JSON.stringify(params)
        })
        const data = await response.json()
        
        session.traceApiResponse(data, performance.now() - startTime)
        
        // 3. Validate data
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
        
        const validationStart = performance.now()
        const validated = data.data.map((item: AdInsight) => 
          validator.validateMetrics(item)
        )
        session.traceDataProcessing(
          'VALIDATION',
          data.data,
          validated,
          performance.now() - validationStart
        )
        
        // 4. Process data
        const processingStart = performance.now()
        const processed = validated.map((v: any) => ({
          ...v.normalizedData,
          ctr: v.normalizedData.clicks / v.normalizedData.impressions * 100
        }))
        session.traceDataProcessing(
          'CALCULATION',
          validated,
          processed,
          performance.now() - processingStart
        )
        
        return {
          raw: data.data,
          validated,
          processed
        }
      })
      
      // Verify results
      expect(result.raw).toHaveLength(1)
      expect(result.validated).toHaveLength(1)
      expect(result.validated[0].isValid).toBe(true)
      expect(result.processed).toHaveLength(1)
      expect(result.processed[0].ctr).toBeCloseTo(5, 1)
      
      // Check localStorage
      const keys = Object.keys(localStorage)
      const debugKeys = keys.filter(k => k.startsWith('debug-session-'))
      expect(debugKeys.length).toBeGreaterThan(0)
      
      // Parse and verify stored debug data
      const storedData = JSON.parse(localStorage.getItem(debugKeys[0])!)
      expect(storedData.sessionId).toBeDefined()
      expect(storedData.apiRequest).toBeDefined()
      expect(storedData.apiResponse).toBeDefined()
      expect(storedData.performance).toBeDefined()
      expect(storedData.errors).toEqual([])
      
      process.env.NODE_ENV = originalEnv
    })

    it('should handle error scenarios gracefully', async () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'
      
      // Mock fetch to fail
      ;(global.fetch as any).mockRejectedValueOnce(new Error('Network error'))
      
      const result = await createDebugContext('ErrorFlow', async (session) => {
        session.traceApiRequest('/api/insights', {})
        
        try {
          await fetch('/api/insights')
        } catch (error) {
          session.traceError(error as Error, { 
            context: 'API_CALL_FAILED' 
          })
          
          // Fallback to cached data
          session.traceDataProcessing(
            'FALLBACK',
            null,
            { cached: true, data: [] },
            0
          )
          
          return { cached: true, data: [] }
        }
      })
      
      expect(result).toEqual({ cached: true, data: [] })
      
      // Verify error was logged
      const keys = Object.keys(localStorage)
      const debugKeys = keys.filter(k => k.startsWith('debug-session-'))
      const storedData = JSON.parse(localStorage.getItem(debugKeys[0])!)
      
      expect(storedData.errors).toHaveLength(1)
      expect(storedData.errors[0].message).toBe('Network error')
      expect(storedData.errors[0].context).toEqual({ context: 'API_CALL_FAILED' })
      
      process.env.NODE_ENV = originalEnv
    })
  })

  describe('Performance in Production', () => {
    it('should be completely disabled in production', async () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'
      
      const consoleSpy = vi.spyOn(console, 'group')
      const storageSpy = vi.spyOn(localStorage, 'setItem')
      
      await createDebugContext('ProductionTest', async (session) => {
        session.traceApiRequest('/api/test', {})
        session.traceApiResponse({ data: [] }, 100)
        session.logToConsole()
        session.saveToLocalStorage()
        return 'done'
      })
      
      expect(consoleSpy).not.toHaveBeenCalled()
      expect(storageSpy).not.toHaveBeenCalled()
      
      process.env.NODE_ENV = originalEnv
    })
  })
})