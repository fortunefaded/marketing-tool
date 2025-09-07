import { CacheInterface } from '../interfaces/CacheInterface'
import { ConvexReactClient } from 'convex/react'

// TODO: Implement cache adapters and factory
export function createCache(
  type: 'localStorage' | 'convex',
  convexClient?: ConvexReactClient
): CacheInterface {
  throw new Error('Cache factory not yet implemented')
}