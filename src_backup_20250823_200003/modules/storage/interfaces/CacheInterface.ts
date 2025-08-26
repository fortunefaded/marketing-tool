// キャッシュインターフェース
export interface CacheInterface {
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T, ttl?: number): Promise<void>
  delete(key: string): Promise<void>
  clear(prefix?: string): Promise<void>
  has(key: string): Promise<boolean>
  keys(prefix?: string): Promise<string[]>
}

// キャッシュメタデータ
export interface CacheMetadata {
  key: string
  timestamp: number
  ttl?: number
  size?: number
}