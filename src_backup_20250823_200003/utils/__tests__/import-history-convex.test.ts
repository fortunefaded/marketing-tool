import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ImportHistoryManagerConvex } from '../import-history-convex'
import { ConvexReactClient } from 'convex/react'

// モックのConvexクライアント
const mockConvexClient = {
  query: vi.fn(),
  mutation: vi.fn(),
} as unknown as ConvexReactClient

describe('ImportHistoryManagerConvex', () => {
  let manager: ImportHistoryManagerConvex

  beforeEach(() => {
    manager = new ImportHistoryManagerConvex(mockConvexClient)
    vi.clearAllMocks()
  })

  describe('getHistory', () => {
    it('履歴を取得して変換できる', async () => {
      const mockHistory = [
        {
          id: 'import-001',
          fileName: 'orders.csv',
          startedAt: '2024-01-01T00:00:00Z',
          totalRows: 100,
          importedRows: 90,
          failedRows: 10,
          fileSize: 1024,
          status: 'completed',
          errors: null,
          metadata: { uniqueCustomers: 50 },
        },
      ]

      mockConvexClient.query = vi.fn().mockResolvedValue(mockHistory)

      const result = await manager.getHistory()

      expect(mockConvexClient.query).toHaveBeenCalledWith(expect.anything(), { limit: 50 })
      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        id: 'import-001',
        filename: 'orders.csv',
        importDate: '2024-01-01T00:00:00Z',
        recordCount: 100,
        totalProcessed: 90,
        fileSize: 1024,
        status: 'success',
        metadata: { uniqueCustomers: 50 },
      })
    })

    it('エラー時は空配列を返す', async () => {
      mockConvexClient.query = vi.fn().mockRejectedValue(new Error('Query failed'))

      const result = await manager.getHistory()

      expect(result).toEqual([])
    })

    it('失敗ステータスを正しく変換する', async () => {
      const mockHistory = [
        {
          id: 'import-002',
          fileName: 'failed.csv',
          startedAt: '2024-01-01T00:00:00Z',
          totalRows: 100,
          importedRows: 0,
          failedRows: 100,
          fileSize: 1024,
          status: 'failed',
          errors: ['Invalid format', 'Missing columns'],
        },
      ]

      mockConvexClient.query = vi.fn().mockResolvedValue(mockHistory)

      const result = await manager.getHistory()

      expect(result[0]).toMatchObject({
        status: 'error',
        errorMessage: 'Invalid format, Missing columns',
      })
    })
  })

  describe('addHistory', () => {
    it('新しい履歴エントリを追加できる', async () => {
      const entry = {
        filename: 'new-orders.csv',
        recordCount: 200,
        duplicatesFound: 10,
        duplicatesSkipped: 10,
        totalProcessed: 190,
        fileSize: 2048,
        status: 'success' as const,
      }

      mockConvexClient.mutation = vi.fn().mockResolvedValue({ success: true })

      await manager.addHistory(entry)

      // addImportHistoryが呼ばれることを確認
      expect(mockConvexClient.mutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          fileName: 'new-orders.csv',
          fileSize: 2048,
          totalRows: 200,
          importedBy: 'user',
        })
      )

      // updateImportHistoryが呼ばれることを確認
      expect(mockConvexClient.mutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          importedRows: 190,
          failedRows: 10,
          status: 'completed',
        })
      )
    })

    it('エラーステータスを正しく処理する', async () => {
      const entry = {
        filename: 'error-orders.csv',
        recordCount: 100,
        duplicatesFound: 0,
        duplicatesSkipped: 0,
        totalProcessed: 0,
        fileSize: 1024,
        status: 'error' as const,
        errorMessage: 'Invalid CSV format',
      }

      mockConvexClient.mutation = vi.fn().mockResolvedValue({ success: true })

      await manager.addHistory(entry)

      expect(mockConvexClient.mutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          status: 'failed',
          errors: ['Invalid CSV format'],
        })
      )
    })
  })

  describe('deleteHistory', () => {
    it('履歴を削除できる', async () => {
      mockConvexClient.mutation = vi.fn().mockResolvedValue({ deleted: true })

      await manager.deleteHistory('import-001')

      expect(mockConvexClient.mutation).toHaveBeenCalledWith(
        expect.anything(),
        { id: 'import-001' }
      )
    })
  })

  describe('clearHistory', () => {
    it('すべての履歴をクリアできる', async () => {
      mockConvexClient.mutation = vi.fn().mockResolvedValue({ deleted: 10 })

      await manager.clearHistory()

      expect(mockConvexClient.mutation).toHaveBeenCalledWith(expect.anything(), {})
    })
  })

  describe('getHistoryById', () => {
    it('特定のIDの履歴を取得できる', async () => {
      const mockHistory = [
        { id: 'import-001', fileName: 'orders1.csv', status: 'completed' },
        { id: 'import-002', fileName: 'orders2.csv', status: 'completed' },
      ]

      mockConvexClient.query = vi.fn().mockResolvedValue(mockHistory)

      const result = await manager.getHistoryById('import-001')

      expect(result).toBeTruthy()
      expect(result?.id).toBe('import-001')
    })

    it('存在しないIDの場合はnullを返す', async () => {
      mockConvexClient.query = vi.fn().mockResolvedValue([])

      const result = await manager.getHistoryById('non-existent')

      expect(result).toBeNull()
    })
  })

  describe('getHistoryStats', () => {
    it('履歴の統計情報を計算できる', async () => {
      const mockHistory = [
        {
          id: 'import-001',
          fileName: 'orders1.csv',
          status: 'completed',
          totalRows: 100,
          importedRows: 100,
        },
        {
          id: 'import-002',
          fileName: 'orders2.csv',
          status: 'failed',
          totalRows: 50,
          importedRows: 0,
        },
        {
          id: 'import-003',
          fileName: 'orders3.csv',
          status: 'completed',
          totalRows: 200,
          importedRows: 190,
        },
      ]

      mockConvexClient.query = vi.fn().mockResolvedValue(mockHistory)

      const stats = await manager.getHistoryStats()

      expect(stats).toEqual({
        totalImports: 3,
        successfulImports: 2,
        failedImports: 1,
        totalRecords: 290, // 100 + 0 + 190
        totalDuplicates: 0, // duplicatesFoundフィールドがないため
        successRate: '66.7',
      })
    })

    it('履歴がない場合のデフォルト値を返す', async () => {
      mockConvexClient.query = vi.fn().mockResolvedValue([])

      const stats = await manager.getHistoryStats()

      expect(stats).toEqual({
        totalImports: 0,
        successfulImports: 0,
        failedImports: 0,
        totalRecords: 0,
        totalDuplicates: 0,
        successRate: '0',
      })
    })
  })
})