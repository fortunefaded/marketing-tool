import { ConvexReactClient } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { logger } from '../utils/logger'

export interface ECForceOrder {
  orderId: string
  orderNumber?: string
  orderDate: string
  purchaseDate: string
  purchaseUrl?: string
  customerId: string
  customerNumber: string
  email: string
  postalCode?: string
  address?: string
  subtotal: number
  discount?: number
  tax?: number
  shipping?: number
  fee?: number
  pointsUsed?: number
  total: number
  products?: string[]
  offer?: string
  subscriptionStatus?: string
  subscriptionOrderNumber?: string
  deliveryStatus?: string
  adCode?: string
  advertiserName?: string
  adMedia?: string
  adUrlGroupName?: string
  adType?: string
  adTrackingUrl?: string
  importedAt?: string
  updatedAt?: string
}

export interface ImportHistory {
  id: string
  fileName: string
  fileSize: number
  totalRows: number
  importedRows: number
  failedRows: number
  errors?: string[]
  startedAt: string
  completedAt?: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  importedBy?: string
}

export class ECForceStorageConvex {
  private convexClient: ConvexReactClient

  constructor(convexClient: ConvexReactClient) {
    this.convexClient = convexClient
  }

  // 注文データの保存
  async saveOrders(orders: ECForceOrder[]): Promise<void> {
    try {
      await this.convexClient.mutation(api.ecforceOrders.bulkImportOrders, {
        orders: orders.map(order => ({
          ...order,
          subtotal: order.subtotal || 0,
          total: order.total || 0,
          customerId: order.customerId || '',
          customerNumber: order.customerNumber || '',
          orderDate: order.orderDate || '',
          purchaseDate: order.purchaseDate || '',
          email: order.email || '',
        })),
      })
    } catch (error) {
      logger.error('Failed to save orders to Convex:', error)
      throw error
    }
  }

  // 注文データの取得
  async getOrders(options?: {
    limit?: number
    cursor?: string
    startDate?: string
    endDate?: string
    customerId?: string
    email?: string
  }): Promise<{ orders: ECForceOrder[]; nextCursor: string | null; total: number }> {
    try {
      const result = await this.convexClient.query(api.ecforceOrders.getOrders, options || {})
      return result
    } catch (error) {
      logger.error('Failed to get orders from Convex:', error)
      return { orders: [], nextCursor: null, total: 0 }
    }
  }

  // 単一の注文を取得
  async getOrder(orderId: string): Promise<ECForceOrder | null> {
    try {
      return await this.convexClient.query(api.ecforceOrders.getOrder, { orderId })
    } catch (error) {
      logger.error('Failed to get order from Convex:', error)
      return null
    }
  }

  // 注文データのクリア
  async clearOrders(): Promise<void> {
    try {
      await this.convexClient.mutation(api.ecforceOrders.clearAllOrders, {})
    } catch (error) {
      logger.error('Failed to clear orders from Convex:', error)
      throw error
    }
  }

  // 注文統計の取得
  async getOrderStats(startDate?: string, endDate?: string): Promise<{
    totalOrders: number
    totalRevenue: number
    averageOrderValue: number
    uniqueCustomers: number
    dateRange: { start: string; end: string }
  }> {
    try {
      return await this.convexClient.query(api.ecforceOrders.getOrderStats, {
        startDate,
        endDate,
      })
    } catch (error) {
      logger.error('Failed to get order stats from Convex:', error)
      return {
        totalOrders: 0,
        totalRevenue: 0,
        averageOrderValue: 0,
        uniqueCustomers: 0,
        dateRange: { start: '', end: '' },
      }
    }
  }

  // インポート履歴の保存
  async addImportHistory(history: Omit<ImportHistory, 'importedRows' | 'failedRows' | 'errors' | 'status' | 'completedAt'>): Promise<void> {
    try {
      await this.convexClient.mutation(api.ecforceConfig.addImportHistory, history)
    } catch (error) {
      logger.error('Failed to add import history to Convex:', error)
      throw error
    }
  }

  // インポート履歴の更新
  async updateImportHistory(
    id: string,
    updates: Partial<Pick<ImportHistory, 'importedRows' | 'failedRows' | 'errors' | 'status' | 'completedAt'>>
  ): Promise<void> {
    try {
      await this.convexClient.mutation(api.ecforceConfig.updateImportHistory, {
        id,
        ...updates,
      })
    } catch (error) {
      logger.error('Failed to update import history in Convex:', error)
      throw error
    }
  }

  // インポート履歴の取得
  async getImportHistory(limit = 50, status?: ImportHistory['status']): Promise<ImportHistory[]> {
    try {
      const history = await this.convexClient.query(api.ecforceConfig.getImportHistory, {
        limit,
        status,
      })
      return history as ImportHistory[]
    } catch (error) {
      logger.error('Failed to get import history from Convex:', error)
      return []
    }
  }

  // インポート履歴のクリア
  async clearImportHistory(): Promise<void> {
    try {
      await this.convexClient.mutation(api.ecforceConfig.clearImportHistory, {})
    } catch (error) {
      logger.error('Failed to clear import history from Convex:', error)
      throw error
    }
  }

  // データの存在確認
  async hasData(): Promise<boolean> {
    try {
      const result = await this.convexClient.query(api.ecforceOrders.getOrders, { limit: 1 })
      return result.total > 0
    } catch (error) {
      logger.error('Failed to check data existence in Convex:', error)
      return false
    }
  }
}