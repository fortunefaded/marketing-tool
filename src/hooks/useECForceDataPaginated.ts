import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { ECForceOrder } from '../types/ecforce'
import { useMemo, useState, useCallback } from 'react'

interface UseECForceDataPaginatedOptions {
  startDate?: string | null
  endDate?: string | null
  pageSize?: number
}

interface UseECForceDataPaginatedResult {
  orders: ECForceOrder[]
  isLoading: boolean
  hasMore: boolean
  loadMore: () => void
  totalCount: number | null
  stats: {
    totalRevenue: number
    totalOrders: number
    uniqueCustomers: number
    avgOrderValue: number
  } | null
}

/**
 * ページネーション対応のECForceデータ取得フック
 */
export function useECForceDataPaginated(options: UseECForceDataPaginatedOptions = {}): UseECForceDataPaginatedResult {
  const { startDate, endDate, pageSize = 100 } = options
  const [pages, setPages] = useState<string[]>([undefined as any]) // 最初のページはカーソルなし
  const [allOrders, setAllOrders] = useState<ECForceOrder[]>([])

  // 最新のページを取得
  const latestCursor = pages[pages.length - 1]
  const latestPageData = useQuery(api.ecforce.getOrders, {
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    limit: pageSize,
    cursor: latestCursor,
  })

  // 統計情報を取得
  const statsData = useQuery(api.ecforce.getOrderStats, {
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  })

  // 全データ数を取得
  const totalCount = useQuery(api.ecforce.getTotalOrderCount, {})

  // 新しいページのデータが来たら追加
  useMemo(() => {
    if (latestPageData?.items) {
      const newOrders = latestPageData.items.map(order => ({
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
        // 互換性のための追加フィールド
        ID: order.orderId,
        customer: {
          id: order.customerId,
          number: order.customerNumber,
          email: order.email,
        },
        total_amount: order.total,
      } as ECForceOrder))

      const existingOrderIds = new Set(allOrders.map(o => o.受注ID))
      const uniqueNewOrders = newOrders.filter(o => !existingOrderIds.has(o.受注ID))
      
      if (uniqueNewOrders.length > 0) {
        setAllOrders(prev => [...prev, ...uniqueNewOrders])
      }
    }
  }, [latestPageData])

  // 次のページを読み込む
  const loadMore = useCallback(() => {
    if (latestPageData?.hasMore && latestPageData.nextCursor) {
      setPages(prev => [...prev, latestPageData.nextCursor])
    }
  }, [latestPageData])

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
    orders: allOrders,
    isLoading: latestPageData === undefined || statsData === undefined,
    hasMore: latestPageData?.hasMore || false,
    loadMore,
    totalCount: totalCount || null,
    stats,
  }
}