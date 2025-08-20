import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { ECForceOrder } from '../types/ecforce'
import { useMemo } from 'react'

interface UseECForceDataOptions {
  startDate?: string | null
  endDate?: string | null
  limit?: number
}

interface UseECForceDataResult {
  orders: ECForceOrder[]
  isLoading: boolean
  stats: {
    totalRevenue: number
    totalOrders: number
    uniqueCustomers: number
    avgOrderValue: number
  } | null
}

/**
 * ECForceデータをConvexから取得するカスタムフック
 * 注意: このフックは互換性のために残していますが、大量データの場合は
 * useECForceDataPaginatedを使用してください
 */
export function useECForceData(options: UseECForceDataOptions = {}): UseECForceDataResult {
  const { startDate, endDate, limit } = options

  // Convexからデータを取得（制限付き）
  const ordersResponse = useQuery(api.ecforce.getOrders, {
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    limit: limit || 100, // デフォルトを100に制限
    cursor: undefined,
  })

  // 統計情報を取得
  const statsData = useQuery(api.ecforce.getOrderStats, {
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  })

  // Convexの型からECForceOrderの型に変換（英語フィールドから日本語フィールドに変換）
  const orders = useMemo(() => {
    if (!ordersResponse?.items) return []
    
    return ordersResponse.items.map(order => ({
      受注ID: order.orderId,
      受注日: order.orderDate,
      注文日: order.purchaseDate,
      顧客ID: order.customerId,
      顧客番号: order.customerNumber,
      メールアドレス: order.email,
      郵便番号: order.postalCode,
      住所: order.address,
      小計: order.subtotal,
      値引額: order.discount,
      消費税: order.tax,
      送料: order.shipping,
      手数料: order.fee,
      ポイント利用額: order.pointsUsed,
      合計: order.total,
      購入商品: order.products,
      購入オファー: order.offer,
      定期ステータス: order.subscriptionStatus,
      配送ステータス: order.deliveryStatus,
      広告コード: order.adCode,
      広告主名: order.advertiserName,
      広告媒体: order.adMedia,
      // 必須フィールドの追加
      受注番号: order.orderNumber || order.orderId,
      購入URL: order.purchaseUrl || '',
      定期受注番号: order.subscriptionOrderNumber || '',
      広告URLグループ名: order.adUrlGroupName || '',
      広告種別: order.adType || '',
      広告計測URL: order.adTrackingUrl || '',
      // 互換性のための追加フィールド
      ID: order.orderId,
      customer: {
        id: order.customerId,
        number: order.customerNumber,
        email: order.email,
      },
      total_amount: order.total,
    } as unknown as ECForceOrder))
  }, [ordersResponse])

  // 統計情報を整形
  const stats = useMemo(() => {
    if (!statsData) return null
    
    return {
      totalRevenue: statsData.totalRevenue,
      totalOrders: statsData.totalOrders,
      uniqueCustomers: statsData.uniqueCustomers,
      avgOrderValue: statsData.avgOrderValue,
    }
  }, [statsData])

  return {
    orders,
    isLoading: ordersResponse === undefined || statsData === undefined,
    stats,
  }
}

/**
 * 顧客別のECForceデータを取得するカスタムフック
 */
export function useECForceOrdersByCustomer(customerId: string) {
  const orders = useQuery(api.ecforce.getOrdersByCustomer, {
    customerId,
  })

  return {
    orders: orders || [],
    isLoading: orders === undefined,
  }
}