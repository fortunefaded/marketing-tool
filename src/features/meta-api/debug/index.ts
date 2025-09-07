// Debug Module Exports

export { DebugSession } from './debug-session'
export type {
  DebugTrace,
  DebugStep,
  PerformanceMetrics,
  DebugInfo,
  ErrorDetails,
  DebugSessionInterface
} from './types/debug-session'

import { DebugSession as DebugSessionClass } from './debug-session'

// Singleton instance for global debugging
let globalDebugSession: DebugSessionClass | null = null

/**
 * Get or create a global debug session
 */
export function getGlobalDebugSession(): DebugSessionClass {
  if (!globalDebugSession) {
    globalDebugSession = new DebugSessionClass()
  }
  return globalDebugSession
}

/**
 * Reset the global debug session
 */
export function resetGlobalDebugSession(): void {
  if (globalDebugSession) {
    // Save current session before resetting
    globalDebugSession.saveToLocalStorage()
  }
  globalDebugSession = null
}

/**
 * Debug decorator for async functions
 */
export function debugTrace(stageName: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value

    descriptor.value = async function (...args: any[]) {
      const session = getGlobalDebugSession()
      const startTime = performance.now()
      
      try {
        const result = await originalMethod.apply(this, args)
        const duration = performance.now() - startTime
        
        session.traceDataProcessing(
          `${stageName}:${propertyKey}`,
          args[0], // First argument as input
          result,
          duration
        )
        
        return result
      } catch (error) {
        const duration = performance.now() - startTime
        session.traceError(error as Error, {
          stage: stageName,
          method: propertyKey,
          args
        })
        throw error
      }
    }

    return descriptor
  }
}

/**
 * Create a debug session for a specific operation
 */
export function createDebugContext<T>(
  operation: string,
  fn: (session: DebugSessionClass) => Promise<T>
): Promise<T> {
  const session = new DebugSessionClass()
  
  return fn(session).finally(() => {
    if (process.env.NODE_ENV === 'development') {
      session.logToConsole()
      session.saveToLocalStorage()
    }
  })
}