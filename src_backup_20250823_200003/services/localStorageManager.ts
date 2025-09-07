import { logger } from '../utils/logger'

interface CacheData<T> {
  data: T
  timestamp: number
  ttl: number
}

interface StorageSettings {
  maxCacheAge?: number
  enableCompression?: boolean
  autoCleanup?: boolean
}

class LocalStorageManager {
  private prefix = 'marketing_tool_'
  private settings: StorageSettings = {
    maxCacheAge: 86400000, // 24時間
    enableCompression: true,
    autoCleanup: true,
  }

  constructor() {
    // 起動時に古いデータをクリーンアップ
    if (this.settings.autoCleanup) {
      this.cleanupOldData()
    }
  }

  // 設定情報の保存
  saveSettings(key: string, value: any): void {
    try {
      const serialized = JSON.stringify(value)
      localStorage.setItem(this.prefix + 'settings_' + key, serialized)
    } catch (error) {
      logger.error('設定の保存に失敗しました:', error)
      // 容量不足の場合は古いデータを削除
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        this.cleanupOldData()
        // リトライ
        try {
          localStorage.setItem(this.prefix + 'settings_' + key, JSON.stringify(value))
        } catch (retryError) {
          logger.error('リトライも失敗しました:', retryError)
        }
      }
    }
  }

  // 設定情報の取得
  getSettings<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(this.prefix + 'settings_' + key)
      return item ? JSON.parse(item) : null
    } catch (error) {
      logger.error('設定の取得に失敗しました:', error)
      return null
    }
  }

  // APIレスポンスの一時キャッシュ（SessionStorage使用）
  cacheApiResponse<T>(endpoint: string, data: T, ttl: number = 300000): void {
    try {
      const cacheData: CacheData<T> = {
        data,
        timestamp: Date.now(),
        ttl,
      }

      const key = this.prefix + 'cache_' + this.hashEndpoint(endpoint)
      const serialized = JSON.stringify(cacheData)

      // SessionStorageは5MBまでなので、大きなデータはlocalStorageに
      if (serialized.length < 1024 * 1024) {
        // 1MB未満
        sessionStorage.setItem(key, serialized)
      } else {
        localStorage.setItem(key, serialized)
      }
    } catch (error) {
      logger.error('APIレスポンスのキャッシュに失敗しました:', error)
    }
  }

  // キャッシュの取得
  getCachedResponse<T>(endpoint: string): T | null {
    try {
      const key = this.prefix + 'cache_' + this.hashEndpoint(endpoint)

      // まずSessionStorageを確認
      let item = sessionStorage.getItem(key)

      // なければlocalStorageを確認
      if (!item) {
        item = localStorage.getItem(key)
      }

      if (!item) return null

      const cached: CacheData<T> = JSON.parse(item)

      // TTLチェック
      if (Date.now() - cached.timestamp > cached.ttl) {
        sessionStorage.removeItem(key)
        localStorage.removeItem(key)
        return null
      }

      logger.debug('キャッシュヒット:', endpoint)
      return cached.data
    } catch (error) {
      logger.error('キャッシュの取得に失敗しました:', error)
      return null
    }
  }

  // アカウント別の設定を保存
  saveAccountSettings(accountId: string, settings: any): void {
    this.saveSettings(`account_${accountId}`, settings)
  }

  // アカウント別の設定を取得
  getAccountSettings(accountId: string): any {
    return this.getSettings(`account_${accountId}`)
  }

  // 最後の同期時刻を保存
  saveLastSyncTime(accountId: string, syncType: string): void {
    const key = `lastSync_${accountId}_${syncType}`
    this.saveSettings(key, Date.now())
  }

  // 最後の同期時刻を取得
  getLastSyncTime(accountId: string, syncType: string): number | null {
    const key = `lastSync_${accountId}_${syncType}`
    return this.getSettings<number>(key)
  }

  // 古いデータのクリーンアップ
  private cleanupOldData(): void {
    const now = Date.now()
    const keysToRemove: string[] = []

    // LocalStorageをチェック
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key || !key.startsWith(this.prefix)) continue

      if (key.includes('cache_')) {
        try {
          const item = localStorage.getItem(key)
          if (item) {
            const cached: CacheData<any> = JSON.parse(item)
            if (now - cached.timestamp > this.settings.maxCacheAge!) {
              keysToRemove.push(key)
            }
          }
        } catch {
          // パースエラーの場合は削除
          keysToRemove.push(key)
        }
      }
    }

    // SessionStorageもチェック
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i)
      if (!key || !key.startsWith(this.prefix)) continue

      // SessionStorageは全て削除（一時的なものなので）
      if (key.includes('cache_')) {
        sessionStorage.removeItem(key)
      }
    }

    // LocalStorageから古いデータを削除
    keysToRemove.forEach((key) => localStorage.removeItem(key))

    if (keysToRemove.length > 0) {
      logger.debug(`${keysToRemove.length}件の古いキャッシュを削除しました`)
    }
  }

  // エンドポイントのハッシュ化（キーの短縮）
  private hashEndpoint(endpoint: string): string {
    let hash = 0
    for (let i = 0; i < endpoint.length; i++) {
      const char = endpoint.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36)
  }

  // ストレージ使用量の取得
  getStorageUsage(): { local: number; session: number; total: number } {
    let localSize = 0
    let sessionSize = 0

    // LocalStorageのサイズ計算
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(this.prefix)) {
        const value = localStorage.getItem(key)
        if (value) {
          localSize += key.length + value.length
        }
      }
    }

    // SessionStorageのサイズ計算
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i)
      if (key && key.startsWith(this.prefix)) {
        const value = sessionStorage.getItem(key)
        if (value) {
          sessionSize += key.length + value.length
        }
      }
    }

    return {
      local: localSize,
      session: sessionSize,
      total: localSize + sessionSize,
    }
  }

  // 全データのクリア
  clearAll(): void {
    const keysToRemove: string[] = []

    // LocalStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(this.prefix)) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key))

    // SessionStorage
    const sessionKeysToRemove: string[] = []
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i)
      if (key && key.startsWith(this.prefix)) {
        sessionKeysToRemove.push(key)
      }
    }
    sessionKeysToRemove.forEach((key) => sessionStorage.removeItem(key))

    logger.debug('全てのローカルストレージデータをクリアしました')
  }
}

// シングルトンインスタンス
export const storageManager = new LocalStorageManager()
