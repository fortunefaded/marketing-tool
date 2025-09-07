// Debug Session Types

export interface DebugTrace {
  traceId: string
  steps: DebugStep[]
  status: 'success' | 'error' | 'warning'
  errorDetails?: ErrorDetails[]
}

export interface DebugStep {
  name: string
  timestamp: Date
  duration: number
  input?: any
  output?: any
  metadata?: Record<string, any>
}

export interface PerformanceMetrics {
  apiCallDuration: number
  processingDuration: number
  totalDuration: number
  memoryUsed?: number
}

export interface DebugInfo {
  sessionId: string
  apiRequest: any
  apiResponse: any
  processedData: any
  validationResults: any
  performance: PerformanceMetrics
  timestamp: Date
  errors: ErrorDetails[]
}

export interface ErrorDetails {
  message: string
  stack?: string
  context?: any
  timestamp: Date
}

export interface DebugSessionInterface {
  traceApiRequest(url: string, params: any): void
  traceApiResponse(response: any, duration: number): void
  traceDataProcessing(stage: string, input: any, output: any, duration: number): void
  traceError(error: Error, context?: any): void
  getPerformanceMetrics(): PerformanceMetrics
  exportDebugData(): DebugInfo
  logToConsole(): void
  saveToLocalStorage(): void
}