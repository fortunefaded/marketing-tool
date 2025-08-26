import { logger } from './logger'

export interface ImportHistory {
  id: string
  filename: string
  importDate: string
  recordCount: number
  duplicatesFound: number
  duplicatesSkipped: number
  totalProcessed: number
  fileSize: number
  status: 'success' | 'error' | 'partial'
  errorMessage?: string
  metadata?: {
    dateRange?: {
      start: string
      end: string
    }
    uniqueCustomers?: number
    uniqueProducts?: number
    totalRevenue?: number
  }
}

const HISTORY_KEY = 'ecforce_import_history'
const MAX_HISTORY_ITEMS = 50

export const ImportHistoryManager = {
  // 履歴を取得
  getHistory(): ImportHistory[] {
    try {
      const stored = localStorage.getItem(HISTORY_KEY)
      if (!stored) return []

      const history = JSON.parse(stored)
      return Array.isArray(history) ? history : []
    } catch (error) {
      logger.error('履歴の読み込みエラー:', error)
      return []
    }
  },

  // 履歴を追加
  addHistory(entry: Omit<ImportHistory, 'id' | 'importDate'>): void {
    try {
      const history = this.getHistory()
      const newEntry: ImportHistory = {
        ...entry,
        id: `import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        importDate: new Date().toISOString(),
      }

      // 最新の履歴を先頭に追加
      history.unshift(newEntry)

      // 最大件数を超えた場合は古いものを削除
      if (history.length > MAX_HISTORY_ITEMS) {
        history.splice(MAX_HISTORY_ITEMS)
      }

      localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
    } catch (error) {
      logger.error('履歴の保存エラー:', error)
    }
  },

  // 履歴を削除
  deleteHistory(id: string): void {
    try {
      const history = this.getHistory()
      const filtered = history.filter((item) => item.id !== id)
      localStorage.setItem(HISTORY_KEY, JSON.stringify(filtered))
    } catch (error) {
      logger.error('履歴の削除エラー:', error)
    }
  },

  // 全履歴をクリア
  clearHistory(): void {
    try {
      localStorage.removeItem(HISTORY_KEY)
    } catch (error) {
      logger.error('履歴のクリアエラー:', error)
    }
  },

  // 特定の履歴を取得
  getHistoryById(id: string): ImportHistory | null {
    const history = this.getHistory()
    return history.find((item) => item.id === id) || null
  },

  // 履歴の統計情報を取得
  getHistoryStats() {
    const history = this.getHistory()

    const totalImports = history.length
    const successfulImports = history.filter((h) => h.status === 'success').length
    const failedImports = history.filter((h) => h.status === 'error').length
    const totalRecords = history.reduce((sum, h) => sum + h.totalProcessed, 0)
    const totalDuplicates = history.reduce((sum, h) => sum + h.duplicatesFound, 0)

    return {
      totalImports,
      successfulImports,
      failedImports,
      totalRecords,
      totalDuplicates,
      successRate: totalImports > 0 ? ((successfulImports / totalImports) * 100).toFixed(1) : '0',
    }
  },
}
