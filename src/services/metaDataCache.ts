import { MetaInsightsData } from './metaApiService'

export interface CachedInsightsData extends MetaInsightsData {
  syncedAt: string // データが同期された日時
}

export interface DataSyncStatus {
  accountId: string
  lastFullSync: string | null // 最後の全同期日時
  lastIncrementalSync: string | null // 最後の増分同期日時
  totalRecords: number
  dateRange: {
    earliest: string | null
    latest: string | null
  }
}

const CACHE_PREFIX = 'meta_insights_cache_'
const SYNC_STATUS_PREFIX = 'meta_sync_status_'

export class MetaDataCache {
  // データをキャッシュに保存
  static saveInsights(accountId: string, data: MetaInsightsData[]): void {
    const now = new Date().toISOString()
    const cachedData: CachedInsightsData[] = data.map(item => ({
      ...item,
      syncedAt: now
    }))
    
    const key = `${CACHE_PREFIX}${accountId}`
    try {
      localStorage.setItem(key, JSON.stringify(cachedData))
      console.log(`キャッシュに保存: ${cachedData.length}件 (アカウント: ${accountId})`)
    } catch (error) {
      console.error('キャッシュ保存エラー:', error)
      // ストレージ容量不足の場合は古いデータを削除
      this.clearOldCache(accountId)
      try {
        localStorage.setItem(key, JSON.stringify(cachedData))
      } catch (retryError) {
        console.error('キャッシュ再保存失敗:', retryError)
      }
    }
  }

  // キャッシュからデータを取得
  static getInsights(accountId: string): CachedInsightsData[] {
    const key = `${CACHE_PREFIX}${accountId}`
    try {
      const data = localStorage.getItem(key)
      if (data) {
        const parsed = JSON.parse(data) as CachedInsightsData[]
        console.log(`キャッシュから読み込み: ${parsed.length}件 (アカウント: ${accountId})`)
        return parsed
      }
    } catch (error) {
      console.error('キャッシュ読み込みエラー:', error)
    }
    return []
  }

  // データをマージ（重複を除去）
  static mergeInsights(existing: CachedInsightsData[], newData: MetaInsightsData[]): CachedInsightsData[] {
    const now = new Date().toISOString()
    const existingMap = new Map<string, CachedInsightsData>()
    
    // 既存データをマップに格納（dateStart + campaignId をキーとする）
    existing.forEach(item => {
      const key = `${item.dateStart}_${item.campaignId || 'account'}`
      existingMap.set(key, item)
    })
    
    // 新しいデータを追加/更新
    newData.forEach(item => {
      const key = `${item.dateStart}_${item.campaignId || 'account'}`
      existingMap.set(key, {
        ...item,
        syncedAt: now
      })
    })
    
    const merged = Array.from(existingMap.values())
    console.log(`データマージ完了: ${existing.length} + ${newData.length} = ${merged.length}件`)
    return merged
  }

  // 同期ステータスを保存
  static saveSyncStatus(accountId: string, status: Partial<DataSyncStatus>): void {
    const key = `${SYNC_STATUS_PREFIX}${accountId}`
    const existing = this.getSyncStatus(accountId)
    const updated: DataSyncStatus = {
      ...existing,
      ...status,
      accountId
    }
    
    try {
      localStorage.setItem(key, JSON.stringify(updated))
      console.log('同期ステータス保存:', updated)
    } catch (error) {
      console.error('同期ステータス保存エラー:', error)
    }
  }

  // 同期ステータスを取得
  static getSyncStatus(accountId: string): DataSyncStatus {
    const key = `${SYNC_STATUS_PREFIX}${accountId}`
    try {
      const data = localStorage.getItem(key)
      if (data) {
        return JSON.parse(data) as DataSyncStatus
      }
    } catch (error) {
      console.error('同期ステータス読み込みエラー:', error)
    }
    
    return {
      accountId,
      lastFullSync: null,
      lastIncrementalSync: null,
      totalRecords: 0,
      dateRange: {
        earliest: null,
        latest: null
      }
    }
  }

  // 日付範囲を更新
  static updateDateRange(accountId: string, data: CachedInsightsData[]): void {
    if (data.length === 0) return
    
    const dates = data.map(item => item.dateStart).filter(Boolean).sort()
    const earliest = dates[0]
    const latest = dates[dates.length - 1]
    
    this.saveSyncStatus(accountId, {
      totalRecords: data.length,
      dateRange: { earliest, latest }
    })
  }

  // 古いキャッシュをクリア（容量不足対策）
  static clearOldCache(currentAccountId: string): void {
    const keysToRemove: string[] = []
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(CACHE_PREFIX) && !key.includes(currentAccountId)) {
        keysToRemove.push(key)
      }
    }
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key)
      console.log(`古いキャッシュを削除: ${key}`)
    })
  }

  // 特定アカウントのキャッシュをクリア
  static clearAccountCache(accountId: string): void {
    const dataKey = `${CACHE_PREFIX}${accountId}`
    const statusKey = `${SYNC_STATUS_PREFIX}${accountId}`
    
    localStorage.removeItem(dataKey)
    localStorage.removeItem(statusKey)
    console.log(`アカウントキャッシュをクリア: ${accountId}`)
  }

  // 欠損期間を検出
  static findMissingDateRanges(accountId: string, requestedStart: string, requestedEnd: string): Array<{start: string, end: string}> {
    const cached = this.getInsights(accountId)
    if (cached.length === 0) {
      return [{ start: requestedStart, end: requestedEnd }]
    }
    
    const cachedDates = new Set(cached.map(item => item.dateStart).filter(Boolean))
    const missing: Array<{start: string, end: string}> = []
    
    let start = new Date(requestedStart)
    const end = new Date(requestedEnd)
    let rangeStart: string | null = null
    
    while (start <= end) {
      const dateStr = start.toISOString().split('T')[0]
      
      if (!cachedDates.has(dateStr)) {
        if (!rangeStart) {
          rangeStart = dateStr
        }
      } else {
        if (rangeStart) {
          const prevDate = new Date(start)
          prevDate.setDate(prevDate.getDate() - 1)
          missing.push({ 
            start: rangeStart, 
            end: prevDate.toISOString().split('T')[0] 
          })
          rangeStart = null
        }
      }
      
      start.setDate(start.getDate() + 1)
    }
    
    // 最後の範囲が未完了の場合
    if (rangeStart) {
      missing.push({ start: rangeStart, end: requestedEnd })
    }
    
    console.log(`欠損期間検出: ${missing.length}個の範囲`, missing)
    return missing
  }
}