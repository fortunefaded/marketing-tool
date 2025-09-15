import type {
  DebugTrace,
  DebugStep,
  PerformanceMetrics,
  DebugInfo,
  ErrorDetails,
  DebugSessionInterface
} from './types/debug-session'

export class DebugSession implements DebugSessionInterface {
  private sessionId: string
  private traces: DebugTrace[] = []
  private startTime: Date
  private currentTraceIndex: number = -1

  constructor() {
    this.sessionId = this.generateUUID()
    this.startTime = new Date()
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0
      const v = c === 'x' ? r : (r & 0x3) | 0x8
      return v.toString(16)
    })
  }

  getSessionId(): string {
    return this.sessionId
  }

  getStartTime(): Date {
    return this.startTime
  }

  getTraces(): DebugTrace[] {
    return this.traces
  }

  traceApiRequest(url: string, params: any): void {
    const trace: DebugTrace = {
      traceId: this.generateUUID(),
      steps: [],
      status: 'success'
    }

    const step: DebugStep = {
      name: 'API_REQUEST',
      timestamp: new Date(),
      duration: 0,
      input: { url, params }
    }

    trace.steps.push(step)
    this.traces.push(trace)
    this.currentTraceIndex = this.traces.length - 1
  }

  traceApiResponse(response: any, duration: number): void {
    if (this.currentTraceIndex < 0 || !this.traces[this.currentTraceIndex]) {
      return
    }

    const trace = this.traces[this.currentTraceIndex]
    
    // Check if response is an error
    if (response?.error) {
      trace.status = 'error'
    }

    const step: DebugStep = {
      name: 'API_RESPONSE',
      timestamp: new Date(),
      duration,
      output: response
    }

    trace.steps.push(step)
  }

  traceDataProcessing(stage: string, input: any, output: any, duration: number): void {
    if (this.currentTraceIndex < 0 || !this.traces[this.currentTraceIndex]) {
      return
    }

    const trace = this.traces[this.currentTraceIndex]
    
    const step: DebugStep = {
      name: stage,
      timestamp: new Date(),
      duration,
      input,
      output,
      metadata: {}
    }

    // Add metadata if input/output are arrays
    if (Array.isArray(output)) {
      step.metadata!.recordCount = output.length
    } else if (Array.isArray(input)) {
      step.metadata!.recordCount = input.length
    }

    trace.steps.push(step)
  }

  traceError(error: Error, context?: any): void {
    if (this.currentTraceIndex < 0 || !this.traces[this.currentTraceIndex]) {
      return
    }

    const trace = this.traces[this.currentTraceIndex]
    trace.status = 'error'

    const errorDetail: ErrorDetails = {
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date()
    }

    if (!trace.errorDetails) {
      trace.errorDetails = []
    }
    trace.errorDetails.push(errorDetail)
  }

  getPerformanceMetrics(): PerformanceMetrics {
    let apiCallDuration = 0
    let processingDuration = 0

    for (const trace of this.traces) {
      for (const step of trace.steps) {
        if (step.name === 'API_RESPONSE') {
          apiCallDuration += step.duration
        } else if (step.name !== 'API_REQUEST') {
          processingDuration += step.duration
        }
      }
    }

    const totalDuration = Math.max(1, Date.now() - this.startTime.getTime())

    return {
      apiCallDuration,
      processingDuration,
      totalDuration
    }
  }

  exportDebugData(): DebugInfo {
    const apiRequests = this.traces
      .flatMap(t => t.steps.filter(s => s.name === 'API_REQUEST'))
      .map(s => s.input)

    const apiResponses = this.traces
      .flatMap(t => t.steps.filter(s => s.name === 'API_RESPONSE'))
      .map(s => s.output)

    const processedData = this.traces
      .flatMap(t => t.steps.filter(s => !['API_REQUEST', 'API_RESPONSE'].includes(s.name)))
      .map(s => s.output)
      .filter(Boolean)

    const errors = this.traces
      .filter(t => t.errorDetails)
      .flatMap(t => t.errorDetails!)

    return {
      sessionId: this.sessionId,
      apiRequest: apiRequests[0] || null,
      apiResponse: apiResponses[0] || null,
      processedData: processedData[0] || null,
      validationResults: null, // Will be set by caller if needed
      performance: this.getPerformanceMetrics(),
      timestamp: new Date(),
      errors
    }
  }

  logToConsole(): void {
    if (process.env.NODE_ENV !== 'development') {
      return
    }

    console.group(`🔍 Debug Session: ${this.sessionId}`)
    
    for (const trace of this.traces) {
      console.group(`Trace: ${trace.traceId} [${trace.status}]`)
      
      for (const step of trace.steps) {
        console.log(`[${step.name}]`, {
          duration: `${step.duration}ms`,
          input: step.input,
          output: step.output,
          metadata: step.metadata
        })
      }

      if (trace.errorDetails) {
        console.log('❌ Errors:', trace.errorDetails)
      }
      
      console.groupEnd()
    }
    
    console.log('📊 Performance:', this.getPerformanceMetrics())
    console.groupEnd()
  }

  saveToLocalStorage(): void {
    if (process.env.NODE_ENV !== 'development') {
      return
    }

    try {
      const debugData = this.exportDebugData()
      
      // Stringify with circular reference handling
      const jsonString = JSON.stringify(debugData, (_key, value) => {
        // Handle circular references
        const seen = new WeakSet()
        return (function stringify(obj: any): any {
          if (obj && typeof obj === 'object') {
            if (seen.has(obj)) {
              return '[Circular]'
            }
            seen.add(obj)
          }
          return obj
        })(value)
      })

      // Limit to 5MB
      const maxSize = 5 * 1024 * 1024
      let dataToSave = jsonString
      
      if (jsonString.length > maxSize) {
        // Truncate if too large
        const truncatedData = {
          ...debugData,
          truncated: true,
          originalSize: jsonString.length
        }
        dataToSave = JSON.stringify(truncatedData).substring(0, maxSize)
      }

      const key = `debug-session-${this.sessionId}`
      localStorage.setItem(key, dataToSave)

      // Clean up old sessions (keep last 10)
      this.cleanupOldSessions()
    } catch (error) {
      console.error('Failed to save debug session:', error)
    }
  }

  private cleanupOldSessions(): void {
    try {
      const keys = Object.keys(localStorage).filter(k => k.startsWith('debug-session-'))
      
      if (keys.length > 10) {
        // Sort by timestamp (assuming UUID v4 format)
        keys.sort()
        
        // Remove oldest sessions
        const toRemove = keys.slice(0, keys.length - 10)
        for (const key of toRemove) {
          localStorage.removeItem(key)
        }
      }
    } catch (error) {
      console.error('Failed to cleanup old sessions:', error)
    }
  }
}