/**
 * Simple logger utility that delegates to Vibelogger
 */
import { vibe } from '@/lib/vibelogger'

export const logger = {
  debug: (...args: any[]) => {
    // Convert args to string message and context
    const [message, ...contextArgs] = args
    const context = contextArgs.length > 0 ? { data: contextArgs } : undefined
    vibe.debug(String(message), context)
  },
  info: (...args: any[]) => {
    const [message, ...contextArgs] = args
    const context = contextArgs.length > 0 ? { data: contextArgs } : undefined
    vibe.info(String(message), context)
  },
  warn: (...args: any[]) => {
    const [message, ...contextArgs] = args
    const context = contextArgs.length > 0 ? { data: contextArgs } : undefined
    vibe.warn(String(message), context)
  },
  error: (...args: any[]) => {
    const [message, ...contextArgs] = args
    const context = contextArgs.length > 0 ? { data: contextArgs } : undefined
    vibe.bad(String(message), context)
  }
}