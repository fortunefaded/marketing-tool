import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ECForceStorageConvex } from '../ecforceStorageConvex'
import { ConvexReactClient } from 'convex/react'

// モックのConvexクライアント
const mockConvexClient = {
  query: vi.fn(),
  mutation: vi.fn(),
} as unknown as ConvexReactClient

describe('ECForceStorageConvex', () => {
  let storage: ECForceStorageConvex

  beforeEach(() => {
    storage = new ECForceStorageConvex(mockConvexClient)
    vi.clearAllMocks()
  })

  describe('saveOrders', () => {
    it('注文データを保存できる', async () => {
      const orders = [
        {
          orderId: '12345',
          orderDate: '2024-01-01',
          purchaseDate: '2024-01-01',
          customerId: 'customer1',
          customerNumber: 'CN001',
          email: 'test@example.com',
          subtotal: 1000,
          total: 1080,
        },
      ]

      mockConvexClient.mutation = vi.fn().mockResolvedValue({ created: 1, updated: 0, total: 1 })

      await storage.saveOrders(orders)

      expect(mockConvexClient.mutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          orders: expect.arrayContaining([
            expect.objectContaining({
              orderId: '12345',
              email: 'test@example.com',
            }),
          ]),
        })
      )
    })

    it('必須フィールドのデフォルト値を設定する', async () => {
      const orders = [
        {
          orderId: '12345',
        } as any,
      ]

      mockConvexClient.mutation = vi.fn().mockResolvedValue({ created: 1, updated: 0, total: 1 })

      await storage.saveOrders(orders)

      expect(mockConvexClient.mutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          orders: expect.arrayContaining([
            expect.objectContaining({
              orderId: '12345',
              subtotal: 0,
              total: 0,
              customerId: '',
              customerNumber: '',
              orderDate: '',
              purchaseDate: '',
              email: '',
            }),
          ]),
        })
      )
    })
  })

  describe('getOrders', () => {
    it('注文データを取得できる', async () => {
      const mockResult = {
        orders: [
          {
            orderId: '12345',
            email: 'test@example.com',
            total: 1080,
          },
        ],
        nextCursor: null,
        total: 1,
      }

      mockConvexClient.query = vi.fn().mockResolvedValue(mockResult)

      const result = await storage.getOrders({ limit: 10 })

      expect(mockConvexClient.query).toHaveBeenCalledWith(expect.anything(), { limit: 10 })
      expect(result).toEqual(mockResult)
    })

    it('エラー時は空の結果を返す', async () => {
      mockConvexClient.query = vi.fn().mockRejectedValue(new Error('Query failed'))

      const result = await storage.getOrders()

      expect(result).toEqual({ orders: [], nextCursor: null, total: 0 })
    })
  })

  describe('getOrder', () => {
    it('単一の注文を取得できる', async () => {
      const mockOrder = {
        orderId: '12345',
        email: 'test@example.com',
        total: 1080,
      }

      mockConvexClient.query = vi.fn().mockResolvedValue(mockOrder)

      const result = await storage.getOrder('12345')

      expect(mockConvexClient.query).toHaveBeenCalledWith(expect.anything(), { orderId: '12345' })
      expect(result).toEqual(mockOrder)
    })

    it('エラー時はnullを返す', async () => {
      mockConvexClient.query = vi.fn().mockRejectedValue(new Error('Query failed'))

      const result = await storage.getOrder('12345')

      expect(result).toBeNull()
    })
  })

  describe('clearOrders', () => {
    it('すべての注文データをクリアできる', async () => {
      mockConvexClient.mutation = vi.fn().mockResolvedValue({ deleted: 100 })

      await storage.clearOrders()

      expect(mockConvexClient.mutation).toHaveBeenCalledWith(expect.anything(), {})
    })
  })

  describe('getOrderStats', () => {
    it('注文統計を取得できる', async () => {
      const mockStats = {
        totalOrders: 100,
        totalRevenue: 108000,
        averageOrderValue: 1080,
        uniqueCustomers: 50,
        dateRange: { start: '2024-01-01', end: '2024-01-31' },
      }

      mockConvexClient.query = vi.fn().mockResolvedValue(mockStats)

      const result = await storage.getOrderStats('2024-01-01', '2024-01-31')

      expect(mockConvexClient.query).toHaveBeenCalledWith(expect.anything(), {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      })
      expect(result).toEqual(mockStats)
    })

    it('エラー時はデフォルト値を返す', async () => {
      mockConvexClient.query = vi.fn().mockRejectedValue(new Error('Query failed'))

      const result = await storage.getOrderStats()

      expect(result).toEqual({
        totalOrders: 0,
        totalRevenue: 0,
        averageOrderValue: 0,
        uniqueCustomers: 0,
        dateRange: { start: '', end: '' },
      })
    })
  })

  describe('インポート履歴関連', () => {
    it('インポート履歴を追加できる', async () => {
      const history = {
        id: 'import-001',
        fileName: 'orders.csv',
        fileSize: 1024,
        totalRows: 100,
        importedBy: 'user1',
        startedAt: '2024-01-01T10:00:00Z',
      }

      mockConvexClient.mutation = vi.fn().mockResolvedValue({ id: 'import-001' })

      await storage.addImportHistory(history)

      expect(mockConvexClient.mutation).toHaveBeenCalledWith(expect.anything(), history)
    })

    it('インポート履歴を更新できる', async () => {
      const updates = {
        importedRows: 90,
        failedRows: 10,
        status: 'completed' as const,
        completedAt: '2024-01-01T12:00:00Z',
      }

      mockConvexClient.mutation = vi.fn().mockResolvedValue({ success: true })

      await storage.updateImportHistory('import-001', updates)

      expect(mockConvexClient.mutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          id: 'import-001',
          ...updates,
        })
      )
    })

    it('インポート履歴を取得できる', async () => {
      const mockHistory = [
        {
          id: 'import-001',
          fileName: 'orders.csv',
          status: 'completed',
        },
      ]

      mockConvexClient.query = vi.fn().mockResolvedValue(mockHistory)

      const result = await storage.getImportHistory(10, 'completed')

      expect(mockConvexClient.query).toHaveBeenCalledWith(expect.anything(), {
        limit: 10,
        status: 'completed',
      })
      expect(result).toEqual(mockHistory)
    })

    it('インポート履歴をクリアできる', async () => {
      mockConvexClient.mutation = vi.fn().mockResolvedValue({ deleted: 5 })

      await storage.clearImportHistory()

      expect(mockConvexClient.mutation).toHaveBeenCalledWith(expect.anything(), {})
    })
  })

  describe('hasData', () => {
    it('データが存在する場合はtrueを返す', async () => {
      mockConvexClient.query = vi.fn().mockResolvedValue({ orders: [{}], nextCursor: null, total: 1 })

      const result = await storage.hasData()

      expect(mockConvexClient.query).toHaveBeenCalledWith(expect.anything(), { limit: 1 })
      expect(result).toBe(true)
    })

    it('データが存在しない場合はfalseを返す', async () => {
      mockConvexClient.query = vi.fn().mockResolvedValue({ orders: [], nextCursor: null, total: 0 })

      const result = await storage.hasData()

      expect(result).toBe(false)
    })

    it('エラー時はfalseを返す', async () => {
      mockConvexClient.query = vi.fn().mockRejectedValue(new Error('Query failed'))

      const result = await storage.hasData()

      expect(result).toBe(false)
    })
  })
})