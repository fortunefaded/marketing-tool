import { StorageInterface, StorageType } from '../interfaces/StorageInterface'
import { LocalStorageAdapter } from '../adapters/LocalStorageAdapter'
import { ConvexStorageAdapter } from '../adapters/ConvexStorageAdapter'
import { ConvexReactClient } from 'convex/react'

export function createStorage(
  type: StorageType,
  convexClient?: ConvexReactClient
): StorageInterface {
  switch (type) {
    case 'convex':
      if (!convexClient) {
        throw new Error('ConvexClient is required for Convex storage')
      }
      return new ConvexStorageAdapter(convexClient)
    
    case 'localStorage':
    default:
      return new LocalStorageAdapter()
  }
}