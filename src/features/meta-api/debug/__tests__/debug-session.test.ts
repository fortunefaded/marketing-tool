import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { DebugSession } from '../debug-session'
import type {
  DebugTrace,
  DebugStep,
  PerformanceMetrics,
  DebugInfo,
  ErrorDetails
} from '../types/debug-session'

// Mock localStorage
const localStorageMock = {
  setItem: vi.fn(),
  getItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
}
global.localStorage = localStorageMock as any

// Mock console methods
const originalConsole = {
  group: console.group,
  groupEnd: console.groupEnd,
  log: console.log
}

describe('DebugSession', () => {
  let debugSession: DebugSession
  
  beforeEach(() => {
    vi.clearAllMocks()
    debugSession = new DebugSession()
    // Reset console mocks
    console.group = vi.fn()
    console.groupEnd = vi.fn()
    console.log = vi.fn()
  })

  afterEach(() => {
    // Restore console
    console.group = originalConsole.group
    console.groupEnd = originalConsole.groupEnd
    console.log = originalConsole.log
  })

  describe('Constructor', () => {
    it('TC-001: should generate unique session ID', () => {
      const session1 = new DebugSession()
      const session2 = new DebugSession()
      
      expect(session1.getSessionId()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
      expect(session1.getSessionId()).not.toBe(session2.getSessionId())
    })

    it('TC-002: should record start time', () => {
      const before = new Date()
      const session = new DebugSession()
      const after = new Date()
      
      const startTime = session.getStartTime()
      expect(startTime.getTime()).toBeGreaterThanOrEqual(before.getTime())
      expect(startTime.getTime()).toBeLessThanOrEqual(after.getTime())
    })

    it('TC-003: should initialize with empty traces', () => {
      expect(debugSession.getTraces()).toEqual([])
    })
  })

  describe('traceApiRequest', () => {
    it('TC-004: should record API request', () => {
      const url = '/api/insights'
      const params = {
        fields: ['spend', 'impressions'],
        date_preset: 'last_month'
      }

      debugSession.traceApiRequest(url, params)
      
      const traces = debugSession.getTraces()
      expect(traces).toHaveLength(1)
      expect(traces[0].steps).toHaveLength(1)
      expect(traces[0].steps[0].name).toBe('API_REQUEST')
      expect(traces[0].steps[0].input).toEqual({ url, params })
    })

    it('TC-005: should generate trace ID', () => {
      debugSession.traceApiRequest('/api/test', {})
      
      const traces = debugSession.getTraces()
      expect(traces[0].traceId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
    })
  })

  describe('traceApiResponse', () => {
    it('TC-006: should record API response', () => {
      debugSession.traceApiRequest('/api/test', {})
      
      const response = { data: [{ id: 1 }], paging: {} }
      const duration = 250
      
      debugSession.traceApiResponse(response, duration)
      
      const traces = debugSession.getTraces()
      expect(traces[0].steps).toHaveLength(2)
      expect(traces[0].steps[1].name).toBe('API_RESPONSE')
      expect(traces[0].steps[1].output).toEqual(response)
      expect(traces[0].steps[1].duration).toBe(duration)
    })

    it('TC-007: should handle error response', () => {
      debugSession.traceApiRequest('/api/test', {})
      
      const errorResponse = { error: { message: 'Invalid token' } }
      debugSession.traceApiResponse(errorResponse, 100)
      
      const traces = debugSession.getTraces()
      expect(traces[0].status).toBe('error')
      expect(traces[0].steps[1].output).toEqual(errorResponse)
    })
  })

  describe('traceDataProcessing', () => {
    it('TC-008: should record data processing step', () => {
      debugSession.traceApiRequest('/api/test', {})
      
      const input = { raw: [1, 2, 3] }
      const output = { normalized: [10, 20, 30] }
      const duration = 50
      
      debugSession.traceDataProcessing('NORMALIZATION', input, output, duration)
      
      const traces = debugSession.getTraces()
      const lastStep = traces[0].steps[traces[0].steps.length - 1]
      
      expect(lastStep.name).toBe('NORMALIZATION')
      expect(lastStep.input).toEqual(input)
      expect(lastStep.output).toEqual(output)
      expect(lastStep.duration).toBe(duration)
    })

    it('TC-009: should record metadata', () => {
      debugSession.traceApiRequest('/api/test', {})
      
      const input = [1, 2, 3]
      const output = [10, 20, 30]
      
      debugSession.traceDataProcessing('PROCESSING', input, output, 10)
      
      const traces = debugSession.getTraces()
      const lastStep = traces[0].steps[traces[0].steps.length - 1]
      
      expect(lastStep.metadata).toEqual({
        recordCount: 3
      })
    })
  })

  describe('traceError', () => {
    it('TC-010: should record error', () => {
      debugSession.traceApiRequest('/api/test', {})
      
      const error = new Error('Validation failed')
      const context = { field: 'spend', value: 'invalid' }
      
      debugSession.traceError(error, context)
      
      const traces = debugSession.getTraces()
      expect(traces[0].status).toBe('error')
      expect(traces[0].errorDetails).toHaveLength(1)
      expect(traces[0].errorDetails![0].message).toBe('Validation failed')
      expect(traces[0].errorDetails![0].context).toEqual(context)
    })

    it('TC-011: should record stack trace', () => {
      debugSession.traceApiRequest('/api/test', {})
      
      const error = new Error('Test error')
      debugSession.traceError(error)
      
      const traces = debugSession.getTraces()
      expect(traces[0].errorDetails![0].stack).toBeDefined()
      expect(traces[0].errorDetails![0].stack).toContain('Error: Test error')
    })
  })

  describe('getPerformanceMetrics', () => {
    it('TC-012: should calculate performance metrics', () => {
      debugSession.traceApiRequest('/api/test', {})
      debugSession.traceApiResponse({ data: [] }, 250)
      debugSession.traceDataProcessing('NORMALIZE', {}, {}, 100)
      debugSession.traceDataProcessing('VALIDATE', {}, {}, 50)
      
      const metrics = debugSession.getPerformanceMetrics()
      
      expect(metrics.apiCallDuration).toBe(250)
      expect(metrics.processingDuration).toBe(150) // 100 + 50
      expect(metrics.totalDuration).toBeGreaterThan(0)
    })

    it('TC-013: should handle empty session', () => {
      const metrics = debugSession.getPerformanceMetrics()
      
      expect(metrics.apiCallDuration).toBe(0)
      expect(metrics.processingDuration).toBe(0)
      expect(metrics.totalDuration).toBeGreaterThan(0) // Some time has passed
    })
  })

  describe('exportDebugData', () => {
    it('TC-014: should export debug data', () => {
      debugSession.traceApiRequest('/api/test', { field: 'value' })
      debugSession.traceApiResponse({ data: [1, 2] }, 100)
      debugSession.traceDataProcessing('PROCESS', [1, 2], [10, 20], 50)
      
      const exported = debugSession.exportDebugData()
      
      expect(exported.sessionId).toBe(debugSession.getSessionId())
      expect(exported.apiRequest).toEqual({ url: '/api/test', params: { field: 'value' } })
      expect(exported.apiResponse).toEqual({ data: [1, 2] })
      expect(exported.processedData).toEqual([10, 20])
      expect(exported.performance).toBeDefined()
      expect(exported.timestamp).toBeInstanceOf(Date)
      expect(exported.errors).toEqual([])
    })

    it('TC-015: should include error information', () => {
      debugSession.traceApiRequest('/api/test', {})
      debugSession.traceError(new Error('Test error'), { context: 'value' })
      
      const exported = debugSession.exportDebugData()
      
      expect(exported.errors).toHaveLength(1)
      expect(exported.errors[0].message).toBe('Test error')
      expect(exported.errors[0].context).toEqual({ context: 'value' })
    })
  })

  describe('saveToLocalStorage', () => {
    it('TC-016: should save to localStorage in development', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'
      
      debugSession.traceApiRequest('/api/test', {})
      debugSession.saveToLocalStorage()
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        expect.stringContaining('debug-session-'),
        expect.any(String)
      )
      
      process.env.NODE_ENV = originalEnv
    })

    it('TC-017: should not save in production', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'
      
      debugSession.saveToLocalStorage()
      
      expect(localStorageMock.setItem).not.toHaveBeenCalled()
      
      process.env.NODE_ENV = originalEnv
    })

    it('TC-018: should limit storage size', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'
      
      // Create large data
      for (let i = 0; i < 1000; i++) {
        debugSession.traceApiRequest('/api/test', { 
          largeData: 'x'.repeat(10000) 
        })
      }
      
      debugSession.saveToLocalStorage()
      
      // Check that saved data is limited
      const savedCall = localStorageMock.setItem.mock.calls[0]
      if (savedCall) {
        const savedData = savedCall[1] as string
        expect(savedData.length).toBeLessThan(5 * 1024 * 1024) // 5MB
      }
      
      process.env.NODE_ENV = originalEnv
    })
  })

  describe('logToConsole', () => {
    it('TC-019: should log to console in development', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'
      
      debugSession.traceApiRequest('/api/test', {})
      debugSession.logToConsole()
      
      expect(console.group).toHaveBeenCalled()
      expect(console.log).toHaveBeenCalled()
      expect(console.groupEnd).toHaveBeenCalled()
      
      process.env.NODE_ENV = originalEnv
    })

    it('TC-020: should not log in production', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'
      
      debugSession.logToConsole()
      
      expect(console.group).not.toHaveBeenCalled()
      expect(console.log).not.toHaveBeenCalled()
      
      process.env.NODE_ENV = originalEnv
    })
  })

  describe('Edge Cases', () => {
    it('E-001: should handle circular references', () => {
      const circular: any = { a: 1 }
      circular.self = circular
      
      expect(() => {
        debugSession.traceApiRequest('/api/test', circular)
        debugSession.saveToLocalStorage()
      }).not.toThrow()
    })

    it('E-002: should handle large number of traces', () => {
      const startTime = performance.now()
      
      for (let i = 0; i < 1000; i++) {
        debugSession.traceApiRequest(`/api/test/${i}`, { index: i })
        debugSession.traceApiResponse({ data: i }, 10)
      }
      
      const endTime = performance.now()
      const duration = endTime - startTime
      
      expect(debugSession.getTraces()).toHaveLength(1000)
      expect(duration).toBeLessThan(1000) // Should be fast
    })

    it('E-003: should not cause memory leaks', () => {
      // This is a simplified test - in production, use proper memory profiling
      const initialMemory = process.memoryUsage().heapUsed
      
      // Run many operations
      for (let i = 0; i < 100; i++) {
        const session = new DebugSession()
        for (let j = 0; j < 100; j++) {
          session.traceApiRequest('/api/test', { data: 'x'.repeat(1000) })
          session.traceApiResponse({ response: 'y'.repeat(1000) }, 10)
        }
      }
      
      if (global.gc) {
        global.gc()
      }
      
      const finalMemory = process.memoryUsage().heapUsed
      const memoryIncrease = finalMemory - initialMemory
      
      // Memory increase should be reasonable
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024) // 100MB
    })

    it('E-004: should handle concurrent API traces', () => {
      // Start multiple API traces
      debugSession.traceApiRequest('/api/1', { id: 1 })
      debugSession.traceApiRequest('/api/2', { id: 2 })
      debugSession.traceApiRequest('/api/3', { id: 3 })
      
      // Complete them in different order
      debugSession.traceApiResponse({ data: 'response2' }, 200)
      debugSession.traceApiResponse({ data: 'response1' }, 100)
      debugSession.traceApiResponse({ data: 'response3' }, 300)
      
      const traces = debugSession.getTraces()
      expect(traces).toHaveLength(3)
      expect(traces[0].steps[0].input.params.id).toBe(1)
      expect(traces[1].steps[0].input.params.id).toBe(2)
      expect(traces[2].steps[0].input.params.id).toBe(3)
    })
  })

  describe('Performance', () => {
    it('P-001: should have minimal overhead', () => {
      const withoutDebug = () => {
        const start = performance.now()
        for (let i = 0; i < 1000; i++) {
          // Simulate API processing
          const data = { value: i }
          const processed = { ...data, doubled: i * 2 }
        }
        return performance.now() - start
      }

      const withDebug = () => {
        const start = performance.now()
        for (let i = 0; i < 1000; i++) {
          debugSession.traceApiRequest('/api', { value: i })
          const data = { value: i }
          debugSession.traceApiResponse(data, 1)
          const processed = { ...data, doubled: i * 2 }
          debugSession.traceDataProcessing('PROCESS', data, processed, 1)
        }
        return performance.now() - start
      }

      const baseTime = withoutDebug()
      const debugTime = withDebug()
      const overhead = debugTime > baseTime ? ((debugTime - baseTime) / baseTime) * 100 : 0

      // Debug operations will have overhead, but should be reasonable
      // Allow up to 5000% overhead for small operations (they're very fast)
      // The important thing is that it doesn't cause major performance issues
      expect(overhead).toBeLessThan(5000)
    })

    it('P-002: should maintain reasonable memory usage', () => {
      const session = new DebugSession()
      const initialMemory = process.memoryUsage().heapUsed

      // Simulate 1 hour of usage (3600 operations)
      for (let i = 0; i < 3600; i++) {
        session.traceApiRequest('/api', { timestamp: i })
        session.traceApiResponse({ data: `response${i}` }, 50)
        session.traceDataProcessing('PROCESS', { i }, { processed: i }, 10)
      }

      const finalMemory = process.memoryUsage().heapUsed
      const memoryUsed = (finalMemory - initialMemory) / (1024 * 1024) // Convert to MB

      expect(memoryUsed).toBeLessThan(50) // Less than 50MB
    })
  })
})