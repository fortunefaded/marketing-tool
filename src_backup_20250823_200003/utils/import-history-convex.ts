import { ConvexReactClient } from 'convex/react'
import { api } from '../../convex/_generated/api'
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

const MAX_HISTORY_ITEMS = 50

export class ImportHistoryManagerConvex {
  private convexClient: ConvexReactClient

  constructor(convexClient: ConvexReactClient) {
    this.convexClient = convexClient
  }

  // 履歴を取得
  async getHistory(): Promise<ImportHistory[]> {
    try {
      const history = await this.convexClient.query(api.ecforceConfig.getImportHistory, {
        limit: MAX_HISTORY_ITEMS,
      })

      return history.map((item: any) => ({
        id: item.id,
        filename: item.fileName,
        importDate: item.startedAt,
        recordCount: item.totalRows,
        duplicatesFound: 0, // これらの値は別途計算する必要がある
        duplicatesSkipped: 0,
        totalProcessed: item.importedRows,
        fileSize: item.fileSize,
        status: item.status === 'completed' ? 'success' : item.status === 'failed' ? 'error' : 'partial',
        errorMessage: item.errors?.join(', '),
        metadata: item.metadata,
      }))
    } catch (error) {
      logger.error('履歴の読み込みエラー:', error)
      return []
    }
  }

  // 履歴を追加
  async addHistory(entry: Omit<ImportHistory, 'id' | 'importDate'>): Promise<void> {
    try {
      const id = `import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      await this.convexClient.mutation(api.ecforceConfig.addImportHistory, {
        id,
        fileName: entry.filename,
        fileSize: entry.fileSize,
        totalRows: entry.recordCount,
        importedBy: 'user', // 実際のユーザー情報を使用する場合は変更
      })

      // メタデータと結果を更新
      await this.convexClient.mutation(api.ecforceConfig.updateImportHistory, {
        id,
        importedRows: entry.totalProcessed,
        failedRows: entry.recordCount - entry.totalProcessed,
        status: entry.status === 'success' ? 'completed' : entry.status === 'error' ? 'failed' : 'processing',
        completedAt: new Date().toISOString(),
        errors: entry.errorMessage ? [entry.errorMessage] : undefined,
      })
    } catch (error) {
      logger.error('履歴の保存エラー:', error)
    }
  }

  // 履歴を削除
  async deleteHistory(id: string): Promise<void> {
    try {
      await this.convexClient.mutation(api.ecforceConfig.deleteImportHistory, { id })
    } catch (error) {
      logger.error('履歴の削除エラー:', error)
    }
  }

  // 全履歴をクリア
  async clearHistory(): Promise<void> {
    try {
      await this.convexClient.mutation(api.ecforceConfig.clearImportHistory, {})
    } catch (error) {
      logger.error('履歴のクリアエラー:', error)
    }
  }

  // 特定の履歴を取得
  async getHistoryById(id: string): Promise<ImportHistory | null> {
    const history = await this.getHistory()
    return history.find((item) => item.id === id) || null
  }

  // 履歴の統計情報を取得
  async getHistoryStats() {
    const history = await this.getHistory()

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
  }
}

// シングルトンインスタンスを作成するためのファクトリー関数
let instance: ImportHistoryManagerConvex | null = null

export function getImportHistoryManager(convexClient: ConvexReactClient): ImportHistoryManagerConvex {
  if (!instance) {
    instance = new ImportHistoryManagerConvex(convexClient)
  }
  return instance
}