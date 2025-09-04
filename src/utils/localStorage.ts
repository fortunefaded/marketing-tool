/**
 * ローカルストレージユーティリティ
 * ブラウザのlocalStorageを使用した永続化とキャッシュ管理
 */

// ストレージキーの定義
const STORAGE_KEYS = {
  SELECTED_ACCOUNT: 'mogumo_selected_account',
  CACHED_DATA_PREFIX: 'mogumo_cached_data_',
  CACHE_TIMESTAMP_PREFIX: 'mogumo_cache_timestamp_',
  DATE_RANGE: 'mogumo_date_range'
} as const

// キャッシュの有効期限（ミリ秒）
const CACHE_DURATION = {
  DATA: 30 * 60 * 1000,        // 30分（データキャッシュ）
  ACCOUNT: 7 * 24 * 60 * 60 * 1000  // 7日（アカウント選択）
} as const

/**
 * localStorage対応チェック
 */
const isLocalStorageAvailable = (): boolean => {
  try {
    const test = '__localStorage_test__'
    localStorage.setItem(test, test)
    localStorage.removeItem(test)
    return true
  } catch {
    return false
  }
}

/**
 * 選択中のアカウントIDを保存
 */
export const saveSelectedAccount = (accountId: string | null): void => {
  if (!isLocalStorageAvailable()) return
  
  try {
    if (accountId) {
      localStorage.setItem(STORAGE_KEYS.SELECTED_ACCOUNT, accountId)
      localStorage.setItem(
        `${STORAGE_KEYS.SELECTED_ACCOUNT}_timestamp`,
        Date.now().toString()
      )
    } else {
      localStorage.removeItem(STORAGE_KEYS.SELECTED_ACCOUNT)
      localStorage.removeItem(`${STORAGE_KEYS.SELECTED_ACCOUNT}_timestamp`)
    }
  } catch (error) {
    console.error('Failed to save selected account:', error)
  }
}

/**
 * 選択中のアカウントIDを取得
 */
export const getSelectedAccount = (): string | null => {
  if (!isLocalStorageAvailable()) return null
  
  try {
    const accountId = localStorage.getItem(STORAGE_KEYS.SELECTED_ACCOUNT)
    const timestamp = localStorage.getItem(`${STORAGE_KEYS.SELECTED_ACCOUNT}_timestamp`)
    
    if (!accountId || !timestamp) return null
    
    // 有効期限チェック
    const age = Date.now() - parseInt(timestamp)
    if (age > CACHE_DURATION.ACCOUNT) {
      localStorage.removeItem(STORAGE_KEYS.SELECTED_ACCOUNT)
      localStorage.removeItem(`${STORAGE_KEYS.SELECTED_ACCOUNT}_timestamp`)
      return null
    }
    
    return accountId
  } catch (error) {
    console.error('Failed to get selected account:', error)
    return null
  }
}

/**
 * 広告データをキャッシュに保存
 */
export const saveCachedData = (accountId: string, data: any[]): void => {
  if (!isLocalStorageAvailable() || !accountId) return
  
  try {
    const key = `${STORAGE_KEYS.CACHED_DATA_PREFIX}${accountId}`
    const timestampKey = `${STORAGE_KEYS.CACHE_TIMESTAMP_PREFIX}${accountId}`
    
    // データサイズチェック（localStorage制限対策）
    const jsonData = JSON.stringify(data)
    if (jsonData.length > 4 * 1024 * 1024) { // 4MB制限
      console.warn('Data too large for localStorage, skipping cache')
      return
    }
    
    localStorage.setItem(key, jsonData)
    localStorage.setItem(timestampKey, Date.now().toString())
  } catch (error) {
    console.error('Failed to cache data:', error)
    // ストレージが満杯の場合は古いキャッシュを削除
    clearOldCaches()
  }
}

/**
 * キャッシュされたデータを取得
 */
export const getCachedData = (accountId: string): { data: any[] | null; age: number } => {
  if (!isLocalStorageAvailable() || !accountId) {
    return { data: null, age: Infinity }
  }
  
  try {
    const key = `${STORAGE_KEYS.CACHED_DATA_PREFIX}${accountId}`
    const timestampKey = `${STORAGE_KEYS.CACHE_TIMESTAMP_PREFIX}${accountId}`
    
    const jsonData = localStorage.getItem(key)
    const timestamp = localStorage.getItem(timestampKey)
    
    if (!jsonData || !timestamp) {
      return { data: null, age: Infinity }
    }
    
    const age = Date.now() - parseInt(timestamp)
    
    // 有効期限チェック
    if (age > CACHE_DURATION.DATA) {
      // 期限切れでも一旦返す（UIで古いデータであることを表示）
      const data = JSON.parse(jsonData)
      return { data, age }
    }
    
    const data = JSON.parse(jsonData)
    return { data, age }
  } catch (error) {
    console.error('Failed to get cached data:', error)
    return { data: null, age: Infinity }
  }
}

/**
 * 特定アカウントのキャッシュをクリア
 */
export const clearCachedData = (accountId: string): void => {
  if (!isLocalStorageAvailable() || !accountId) return
  
  try {
    const key = `${STORAGE_KEYS.CACHED_DATA_PREFIX}${accountId}`
    const timestampKey = `${STORAGE_KEYS.CACHE_TIMESTAMP_PREFIX}${accountId}`
    
    localStorage.removeItem(key)
    localStorage.removeItem(timestampKey)
  } catch (error) {
    console.error('Failed to clear cached data:', error)
  }
}

/**
 * 古いキャッシュを削除（容量確保）
 */
const clearOldCaches = (): void => {
  if (!isLocalStorageAvailable()) return
  
  try {
    const now = Date.now()
    const keysToRemove: string[] = []
    
    // 全キーをチェック
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key) continue
      
      // タイムスタンプキーをチェック
      if (key.startsWith(STORAGE_KEYS.CACHE_TIMESTAMP_PREFIX)) {
        const timestamp = localStorage.getItem(key)
        if (timestamp) {
          const age = now - parseInt(timestamp)
          // 1日以上古いデータは削除
          if (age > 24 * 60 * 60 * 1000) {
            keysToRemove.push(key)
            const dataKey = key.replace(
              STORAGE_KEYS.CACHE_TIMESTAMP_PREFIX,
              STORAGE_KEYS.CACHED_DATA_PREFIX
            )
            keysToRemove.push(dataKey)
          }
        }
      }
    }
    
    // 削除実行
    keysToRemove.forEach(key => localStorage.removeItem(key))
    
    console.log(`Cleared ${keysToRemove.length / 2} old cache entries`)
  } catch (error) {
    console.error('Failed to clear old caches:', error)
  }
}

/**
 * 日付範囲を保存
 */
export const saveDateRange = (dateRange: { start: string; end: string }): void => {
  if (!isLocalStorageAvailable()) return
  
  try {
    localStorage.setItem(STORAGE_KEYS.DATE_RANGE, JSON.stringify(dateRange))
  } catch (error) {
    console.error('Failed to save date range:', error)
  }
}

/**
 * 日付範囲を取得
 */
export const getDateRange = (): { start: string; end: string } | null => {
  if (!isLocalStorageAvailable()) return null
  
  try {
    const json = localStorage.getItem(STORAGE_KEYS.DATE_RANGE)
    return json ? JSON.parse(json) : null
  } catch (error) {
    console.error('Failed to get date range:', error)
    return null
  }
}

/**
 * すべてのキャッシュをクリア
 */
export const clearAllCaches = (): void => {
  if (!isLocalStorageAvailable()) return
  
  try {
    const keysToRemove: string[] = []
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith('mogumo_')) {
        keysToRemove.push(key)
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key))
    console.log(`Cleared all ${keysToRemove.length} cache entries`)
  } catch (error) {
    console.error('Failed to clear all caches:', error)
  }
}