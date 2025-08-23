// Storage module exports

// Interfaces
export type { StorageInterface, StorageType } from './interfaces/StorageInterface'
export type { CacheInterface, CacheMetadata } from './interfaces/CacheInterface'

// Adapters
export { LocalStorageAdapter } from './adapters/LocalStorageAdapter'
export { ConvexStorageAdapter } from './adapters/ConvexStorageAdapter'

// Factory functions
export { createStorage } from './services/StorageFactory'
export { createCache } from './services/CacheFactory'