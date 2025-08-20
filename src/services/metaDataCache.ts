import { MetaInsightsData } from './metaApiService'
import LZString from 'lz-string'

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
const DATA_HISTORY_PREFIX = 'meta_data_history_'

// データ変更履歴を記録する型
interface DataChangeHistory {
  timestamp: string
  operation: 'save' | 'clear' | 'merge'
  beforeCount: number
  afterCount: number
  source?: string
}

export class MetaDataCache {
  // データ変更履歴を記録
  private static recordDataChange(accountId: string, change: Omit<DataChangeHistory, 'timestamp'>): void {
    const key = `${DATA_HISTORY_PREFIX}${accountId}`
    const history: DataChangeHistory[] = []
    
    try {
      const existingHistory = localStorage.getItem(key)
      if (existingHistory) {
        history.push(...JSON.parse(existingHistory))
      }
    } catch (e) {
      console.error('履歴の読み込みエラー:', e)
    }
    
    // 最新の変更を追加
    history.push({
      ...change,
      timestamp: new Date().toISOString()
    })
    
    // 最新の50件のみ保持
    const recentHistory = history.slice(-50)
    
    try {
      localStorage.setItem(key, JSON.stringify(recentHistory))
    } catch (e) {
      console.error('履歴の保存エラー:', e)
    }
  }
  
  // データ変更履歴を取得
  static getDataHistory(accountId: string): DataChangeHistory[] {
    const key = `${DATA_HISTORY_PREFIX}${accountId}`
    try {
      const history = localStorage.getItem(key)
      if (history) {
        return JSON.parse(history)
      }
    } catch (e) {
      console.error('履歴の読み込みエラー:', e)
    }
    return []
  }
  // データをキャッシュに保存（既存データは保持）
  static saveInsights(accountId: string, data: MetaInsightsData[] | CachedInsightsData[]): void {
    const now = new Date().toISOString()
    const key = `${CACHE_PREFIX}${accountId}`
    
    // 保存前の既存データ数を記録
    const existingData = this.getInsights(accountId)
    const existingCount = existingData.length
    
    // データがCachedInsightsData型かどうかチェック
    const isCachedData = data.length > 0 && 'syncedAt' in data[0]
    
    const cachedData: CachedInsightsData[] = isCachedData 
      ? data as CachedInsightsData[]
      : data.map(item => ({
          ...item,
          syncedAt: now
        }))
    
    // データ数の変化を警告
    if (existingCount > 100 && cachedData.length < existingCount * 0.5) {
      console.warn(`⚠️ データ数が大幅に減少しています: ${existingCount}件 → ${cachedData.length}件`)
      console.trace('データ減少の呼び出し元:')
    }
    
    // データ変更履歴を記録
    this.recordDataChange(accountId, {
      operation: 'save',
      beforeCount: existingCount,
      afterCount: cachedData.length,
      source: new Error().stack?.split('\n')[3]?.trim()
    })
    
    try {
      // データを圧縮して保存
      const jsonStr = JSON.stringify(cachedData)
      const compressed = LZString.compressToUTF16(jsonStr)
      const originalSize = new Blob([jsonStr]).size
      const compressedSize = new Blob([compressed]).size
      console.log(`データ圧縮: ${(originalSize / 1024).toFixed(1)}KB → ${(compressedSize / 1024).toFixed(1)}KB (${Math.round((1 - compressedSize / originalSize) * 100)}%削減)`)
      
      // 重要: 既存のデータを完全に置き換える（マージはmergeInsightsで行う）
      localStorage.setItem(key, compressed)
      console.log(`キャッシュに保存: ${cachedData.length}件 (アカウント: ${accountId})`)
      
      // 正常保存完了の履歴も記録
      if (existingCount !== cachedData.length) {
        console.log(`データ数変更: ${existingCount} → ${cachedData.length}`)
      }
    } catch (error) {
      console.error('キャッシュ保存エラー:', error)
      
      // ストレージの状態を確認
      const storageInfo = this.getStorageInfo()
      console.warn(`ストレージ使用状況: ${storageInfo.usedKB}KB / ${storageInfo.estimatedMaxKB}KB (${storageInfo.percentUsed}%)`)
      
      // ストレージ容量不足の場合の処理
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        // 他のアカウントのキャッシュをクリア
        this.clearOldCache(accountId)
        
        // 古いデータの一部を削除（最も古い30%を削除）
        if (cachedData.length > 100) {
          // 日付でソートしてから削除
          const sortedData = [...cachedData].sort((a, b) => {
            const dateA = String(a.date_start || a.dateStart || '')
            const dateB = String(b.date_start || b.dateStart || '')
            return dateA.localeCompare(dateB)
          })
          const retainCount = Math.floor(sortedData.length * 0.7) // 70%を保持
          const reducedData = sortedData.slice(-retainCount) // 新しいデータを保持
          console.log(`容量不足のため、古いデータを削減: ${cachedData.length}件 → ${reducedData.length}件`)
          
          try {
            const jsonStr = JSON.stringify(reducedData)
            const compressed = LZString.compressToUTF16(jsonStr)
            localStorage.setItem(key, compressed)
            console.log('削減後のキャッシュ保存成功')
            
            // ユーザーに通知
            console.warn('⚠️ ストレージ容量不足のため、古いデータの一部を削除しました。')
          } catch (retryError) {
            console.error('キャッシュ再保存失敗:', retryError)
            // それでも失敗したら、最新の90日分のみ保存
            const ninetyDaysAgo = new Date()
            ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
            const recentData = cachedData.filter(item => {
              const dateStr = String(item.date_start || item.dateStart || '')
              if (!dateStr) return false
              return new Date(dateStr) > ninetyDaysAgo
            })
            
            if (recentData.length > 0) {
              try {
                const jsonStr = JSON.stringify(recentData)
                const compressed = LZString.compressToUTF16(jsonStr)
                localStorage.setItem(key, compressed)
                console.log(`最新90日分のみ保存: ${recentData.length}件`)
                console.warn('⚠️ ストレージ容量が極めて不足しているため、最新90日分のデータのみ保持しています。')
              } catch (finalError) {
                console.error('最終的な保存も失敗:', finalError)
                throw new Error('ストレージ容量が不足しています。ブラウザのキャッシュをクリアしてください。')
              }
            }
          }
        } else {
          // データが少ない場合は圧縮なしで保存を試みる
          try {
            localStorage.setItem(key, JSON.stringify(cachedData))
            console.log('圧縮なしでキャッシュ保存成功')
          } catch (retryError) {
            console.error('圧縮なしでも保存失敗:', retryError)
            throw new Error('ストレージ容量が不足しています。ブラウザのキャッシュをクリアしてください。')
          }
        }
      } else {
        // その他のエラーの場合はそのままスロー
        throw error
      }
    }
  }

  // キャッシュからデータを取得
  static getInsights(accountId: string): CachedInsightsData[] {
    const key = `${CACHE_PREFIX}${accountId}`
    try {
      const data = localStorage.getItem(key)
      if (data) {
        // 圧縮されたデータを解凍
        let jsonStr: string
        try {
          // まず圧縮データとして解凍を試みる
          jsonStr = LZString.decompressFromUTF16(data) || data
        } catch {
          // 解凍に失敗したら、非圧縮データとして扱う
          jsonStr = data
        }
        
        const parsed = JSON.parse(jsonStr) as CachedInsightsData[]
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
    
    // 既存データをマップに格納（より詳細なキーを使用）
    existing.forEach(item => {
      const key = `${item.date_start || item.dateStart}_${item.campaign_id || item.campaignId || 'account'}_${item.ad_id || ''}`
      existingMap.set(key, item)
    })
    
    // 新しいデータを追加/更新
    newData.forEach(item => {
      const key = `${item.date_start || item.dateStart}_${item.campaign_id || item.campaignId || 'account'}_${item.ad_id || ''}`
      const existingItem = existingMap.get(key)
      
      // 既存のクリエイティブ情報を保持
      const mergedItem = {
        ...item,
        syncedAt: now
      }
      
      // 新しいデータにクリエイティブ情報がない場合、既存のものを保持
      if (existingItem && !item.creative_type && existingItem.creative_type) {
        mergedItem.creative_type = existingItem.creative_type
        mergedItem.creative_id = existingItem.creative_id
        mergedItem.creative_name = existingItem.creative_name
        mergedItem.thumbnail_url = existingItem.thumbnail_url
        mergedItem.video_url = existingItem.video_url
        mergedItem.carousel_cards = existingItem.carousel_cards
      }
      
      existingMap.set(key, mergedItem)
    })
    
    const merged = Array.from(existingMap.values())
    console.log(`データマージ完了: ${existing.length} + ${newData.length} = ${merged.length}件`)
    
    // 広告レベルのデータ数を確認
    const adLevelData = merged.filter(item => item.ad_id)
    console.log(`広告レベルデータ: ${adLevelData.length}件`)
    
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
    
    const dates = data.map(item => String(item.date_start || item.dateStart || '')).filter(Boolean).sort()
    const earliest = dates[0] || null
    const latest = dates[dates.length - 1] || null
    
    this.saveSyncStatus(accountId, {
      totalRecords: data.length,
      dateRange: { 
        earliest: earliest ? String(earliest) : null, 
        latest: latest ? String(latest) : null 
      }
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
    
    // クリア前のデータ数を記録
    const existingData = this.getInsights(accountId)
    console.log(`キャッシュクリア前のデータ数: ${existingData.length}件`)
    
    localStorage.removeItem(dataKey)
    localStorage.removeItem(statusKey)
    console.log(`アカウントキャッシュをクリア: ${accountId}`)
    
    // データ変更履歴を記録
    this.recordDataChange(accountId, {
      operation: 'clear',
      beforeCount: existingData.length,
      afterCount: 0,
      source: new Error().stack?.split('\n')[3]?.trim()
    })
  }
  
  // キャッシュ使用量を取得
  static getCacheUsage(accountId: string): { sizeKB: number, records: number } {
    const dataKey = `${CACHE_PREFIX}${accountId}`
    const data = localStorage.getItem(dataKey)
    
    if (!data) {
      return { sizeKB: 0, records: 0 }
    }
    
    const sizeBytes = new Blob([data]).size
    const sizeKB = Math.round(sizeBytes / 1024)
    
    try {
      // 圧縮されたデータを解凍してレコード数を取得
      let jsonStr: string
      try {
        jsonStr = LZString.decompressFromUTF16(data) || data
      } catch {
        jsonStr = data
      }
      const parsed = JSON.parse(jsonStr)
      return { sizeKB, records: parsed.length }
    } catch {
      return { sizeKB, records: 0 }
    }
  }
  
  // 全キャッシュ使用量を取得
  static getTotalCacheUsage(): { totalSizeKB: number, accounts: number } {
    let totalSizeKB = 0
    let accounts = 0
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(CACHE_PREFIX)) {
        const data = localStorage.getItem(key)
        if (data) {
          totalSizeKB += Math.round(new Blob([data]).size / 1024)
          accounts++
        }
      }
    }
    
    return { totalSizeKB, accounts }
  }
  
  // ローカルストレージの容量情報を取得
  static getStorageInfo(): { usedKB: number, estimatedMaxKB: number, percentUsed: number } {
    let totalSize = 0
    
    // すべてのローカルストレージデータのサイズを計算
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key) {
        const value = localStorage.getItem(key)
        if (value) {
          totalSize += key.length + value.length
        }
      }
    }
    
    // 文字列は UTF-16 なので、バイト数は文字数の2倍
    const usedKB = Math.round((totalSize * 2) / 1024)
    // ブラウザのローカルストレージは通常5-10MB
    // しかし、実際の制限はブラウザによって異なる：
    // - Chrome/Edge: 10MB
    // - Firefox: 10MB
    // - Safari: 5MB
    // 安全のため5MBを基準とする
    const estimatedMaxKB = 5 * 1024 // 5MB = 5120KB
    const percentUsed = Math.round((usedKB / estimatedMaxKB) * 100)
    
    return { usedKB, estimatedMaxKB, percentUsed }
  }

  // 欠損期間を検出（月単位で効率化）
  static findMissingDateRanges(accountId: string, requestedStart: string, requestedEnd: string): Array<{start: string, end: string}> {
    const cached = this.getInsights(accountId)
    if (cached.length === 0) {
      // キャッシュがない場合は月単位で分割
      return this.splitIntoMonthlyRanges(requestedStart, requestedEnd)
    }
    
    const cachedDates = new Set(cached.map(item => item.date_start || item.dateStart).filter(Boolean) as string[])
    
    // 月単位で欠損をチェック
    const monthlyRanges = this.splitIntoMonthlyRanges(requestedStart, requestedEnd)
    const missing: Array<{start: string, end: string}> = []
    
    for (const range of monthlyRanges) {
      const hasDataInRange = this.hasDataInDateRange(cachedDates, range.start, range.end)
      if (!hasDataInRange) {
        missing.push(range)
      }
    }
    
    console.log(`欠損期間検出: ${missing.length}個の月範囲`, missing)
    return missing
  }
  
  // 日付範囲を月単位に分割
  private static splitIntoMonthlyRanges(startDate: string, endDate: string): Array<{start: string, end: string}> {
    const ranges: Array<{start: string, end: string}> = []
    const start = new Date(startDate)
    const end = new Date(endDate)
    
    let currentStart = new Date(start)
    
    while (currentStart < end) {
      const currentEnd = new Date(currentStart.getFullYear(), currentStart.getMonth() + 1, 0) // 月末
      
      if (currentEnd > end) {
        currentEnd.setTime(end.getTime())
      }
      
      ranges.push({
        start: currentStart.toISOString().split('T')[0],
        end: currentEnd.toISOString().split('T')[0]
      })
      
      currentStart.setMonth(currentStart.getMonth() + 1)
      currentStart.setDate(1) // 月初にリセット
    }
    
    return ranges
  }
  
  // 指定期間にデータがあるかチェック
  private static hasDataInDateRange(cachedDates: Set<string>, startDate: string, endDate: string): boolean {
    const start = new Date(startDate)
    const end = new Date(endDate)
    
    // 期間内のいくつかの日付をサンプルチェック
    const sampleDates = [
      start, 
      new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000), // 1週間後
      new Date(start.getTime() + 15 * 24 * 60 * 60 * 1000), // 2週間後
      end
    ]
    
    return sampleDates.some(date => {
      if (date > end) return false
      return cachedDates.has(date.toISOString().split('T')[0])
    })
  }
}