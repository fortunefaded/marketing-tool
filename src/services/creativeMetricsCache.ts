import { CreativeMetrics } from './creativeAggregator'
import LZString from 'lz-string'

interface CachedCreativeMetrics {
  data: CreativeMetrics[]
  cachedAt: string
  accountId: string
  params: {
    startDate: string
    endDate: string
    period: string
    creativeTypes?: string[]
    campaignIds?: string[]
  }
}

// interface CreativeCache {
//   [key: string]: CachedCreativeMetrics
// }

export class CreativeMetricsCache {
  private static CACHE_KEY_PREFIX = 'creative_metrics_cache_'
  private static CACHE_DURATION = 5 * 60 * 1000 // 5分
  private static MAX_CACHE_SIZE = 50 // 最大50エントリ
  
  // キャッシュキーを生成
  private static generateCacheKey(
    accountId: string,
    params: CachedCreativeMetrics['params']
  ): string {
    const sortedParams = {
      accountId,
      startDate: params.startDate,
      endDate: params.endDate,
      period: params.period,
      creativeTypes: params.creativeTypes?.sort().join(',') || '',
      campaignIds: params.campaignIds?.sort().join(',') || ''
    }
    
    return `${this.CACHE_KEY_PREFIX}${btoa(JSON.stringify(sortedParams))}`
  }
  
  // キャッシュから取得
  static get(
    accountId: string,
    params: CachedCreativeMetrics['params']
  ): CreativeMetrics[] | null {
    try {
      const cacheKey = this.generateCacheKey(accountId, params)
      const cached = localStorage.getItem(cacheKey)
      
      if (!cached) return null
      
      // 圧縮データを解凍
      const decompressed = LZString.decompressFromUTF16(cached)
      if (!decompressed) return null
      
      const data: CachedCreativeMetrics = JSON.parse(decompressed)
      
      // キャッシュの有効期限をチェック
      const cachedTime = new Date(data.cachedAt).getTime()
      const now = new Date().getTime()
      
      if (now - cachedTime > this.CACHE_DURATION) {
        localStorage.removeItem(cacheKey)
        return null
      }
      
      console.log(`キャッシュヒット: ${data.data.length}件のクリエイティブメトリクス`)
      return data.data
    } catch (error) {
      console.error('キャッシュ読み込みエラー:', error)
      return null
    }
  }
  
  // キャッシュに保存
  static set(
    accountId: string,
    params: CachedCreativeMetrics['params'],
    data: CreativeMetrics[]
  ): void {
    try {
      const cacheKey = this.generateCacheKey(accountId, params)
      
      const cacheData: CachedCreativeMetrics = {
        data,
        cachedAt: new Date().toISOString(),
        accountId,
        params
      }
      
      // データを圧縮
      const compressed = LZString.compressToUTF16(JSON.stringify(cacheData))
      
      // キャッシュサイズを管理
      this.manageCacheSize()
      
      localStorage.setItem(cacheKey, compressed)
      console.log(`キャッシュに保存: ${data.length}件のクリエイティブメトリクス`)
    } catch (error) {
      console.error('キャッシュ保存エラー:', error)
      // キャッシュの保存に失敗してもアプリケーションは続行
    }
  }
  
  // キャッシュを無効化
  static invalidate(accountId: string): void {
    try {
      const keys: string[] = []
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith(this.CACHE_KEY_PREFIX)) {
          try {
            const cached = localStorage.getItem(key)
            if (cached) {
              const decompressed = LZString.decompressFromUTF16(cached)
              if (decompressed) {
                const data: CachedCreativeMetrics = JSON.parse(decompressed)
                if (data.accountId === accountId) {
                  keys.push(key)
                }
              }
            }
          } catch {
            // 個別のエントリの処理エラーは無視
          }
        }
      }
      
      keys.forEach(key => localStorage.removeItem(key))
      console.log(`${keys.length}件のキャッシュエントリを削除`)
    } catch (error) {
      console.error('キャッシュ無効化エラー:', error)
    }
  }
  
  // キャッシュサイズを管理（古いエントリを削除）
  private static manageCacheSize(): void {
    try {
      const cacheEntries: Array<{
        key: string
        cachedAt: string
      }> = []
      
      // すべてのキャッシュエントリを取得
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith(this.CACHE_KEY_PREFIX)) {
          try {
            const cached = localStorage.getItem(key)
            if (cached) {
              const decompressed = LZString.decompressFromUTF16(cached)
              if (decompressed) {
                const data: CachedCreativeMetrics = JSON.parse(decompressed)
                cacheEntries.push({
                  key,
                  cachedAt: data.cachedAt
                })
              }
            }
          } catch {
            // 個別のエントリの処理エラーは無視
          }
        }
      }
      
      // キャッシュサイズが上限を超えている場合、古いものから削除
      if (cacheEntries.length > this.MAX_CACHE_SIZE) {
        cacheEntries.sort((a, b) => 
          new Date(a.cachedAt).getTime() - new Date(b.cachedAt).getTime()
        )
        
        const toRemove = cacheEntries.slice(0, cacheEntries.length - this.MAX_CACHE_SIZE)
        toRemove.forEach(entry => localStorage.removeItem(entry.key))
        
        console.log(`キャッシュサイズ管理: ${toRemove.length}件の古いエントリを削除`)
      }
    } catch (error) {
      console.error('キャッシュサイズ管理エラー:', error)
    }
  }
  
  // デバッグ情報を取得
  static getDebugInfo(): {
    totalEntries: number
    totalSizeKB: number
    oldestEntry: string | null
    newestEntry: string | null
  } {
    let totalEntries = 0
    let totalSize = 0
    let oldestEntry: string | null = null
    let newestEntry: string | null = null
    
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith(this.CACHE_KEY_PREFIX)) {
          totalEntries++
          const value = localStorage.getItem(key)
          if (value) {
            totalSize += value.length * 2 // UTF-16なので2バイト/文字
            
            try {
              const decompressed = LZString.decompressFromUTF16(value)
              if (decompressed) {
                const data: CachedCreativeMetrics = JSON.parse(decompressed)
                if (!oldestEntry || data.cachedAt < oldestEntry) {
                  oldestEntry = data.cachedAt
                }
                if (!newestEntry || data.cachedAt > newestEntry) {
                  newestEntry = data.cachedAt
                }
              }
            } catch {
              // 個別のエントリの処理エラーは無視
            }
          }
        }
      }
    } catch (error) {
      console.error('デバッグ情報取得エラー:', error)
    }
    
    return {
      totalEntries,
      totalSizeKB: Math.round(totalSize / 1024),
      oldestEntry,
      newestEntry
    }
  }
}