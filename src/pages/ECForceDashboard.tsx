import React, { useState, useMemo } from 'react'
import { ShoppingCart, Filter } from 'lucide-react'
import { ECForceOrder } from '../types/ecforce'
import { AddToFavoriteButton } from '../components/favorites/AddToFavoriteButton'
import { useMemoryOptimization } from '../hooks/useMemoryOptimization'
import { ECForceSalesChart } from '../components/ecforce/ECForceSalesChart'
import { ECForceCustomerAnalysis } from '../components/ecforce/ECForceCustomerAnalysis'
import { ECForceOfferAnalysis } from '../components/ecforce/ECForceOfferAnalysis'
import { ECForceKPICards } from '../components/ecforce/ECForceKPICards'
import { ECForceDateFilter } from '../components/ecforce/ECForceDateFilter'
import { AdvancedFilter } from '../components/filters/AdvancedFilter'
import { DataExporter } from '../components/export/DataExporter'
import { KPICardSkeleton, ChartSkeleton } from '../components/common/SkeletonLoader'

interface ECForceDashboardProps {
  orders: ECForceOrder[]
}

export const ECForceDashboard: React.FC<ECForceDashboardProps> = ({ orders }) => {
  const { 
    optimizeAggregatedData, 
    optimizeChartData,
    getCachedData,
    setCachedData
  } = useMemoryOptimization({
    maxDataPoints: 5000,
    enableSampling: true,
    enableCaching: true
  })
  const [dateRange, setDateRange] = useState<{
    start: Date | null
    end: Date | null
  }>({
    start: null,
    end: null
  })
  const [isProcessing, setIsProcessing] = useState(false)
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false)
  const [filteredOrders, setFilteredOrders] = useState<ECForceOrder[]>(orders)

  // 日付範囲でフィルタリング（メモリ最適化付き）
  const dateFilteredOrders = useMemo(() => {
    setIsProcessing(true)
    
    // キャッシュキーの生成
    const cacheKey = `filtered_${dateRange.start?.toISOString()}_${dateRange.end?.toISOString()}`
    
    // キャッシュチェック
    const cached = getCachedData<ECForceOrder[]>(cacheKey)
    if (cached) {
      setTimeout(() => setIsProcessing(false), 0)
      return cached
    }
    
    // 処理開始を遅延させてUIを更新
    setTimeout(() => {
      setIsProcessing(false)
    }, 100)
    
    let filtered = orders
    
    if (dateRange.start || dateRange.end) {
      filtered = orders.filter(order => {
        const orderDate = new Date(order.受注日)
        if (dateRange.start && orderDate < dateRange.start) return false
        if (dateRange.end && orderDate > dateRange.end) return false
        return true
      })
    }
    
    // 大量データの場合は最適化
    if (filtered.length > 5000) {
      filtered = optimizeAggregatedData(filtered)
    }
    
    // キャッシュに保存
    setCachedData(cacheKey, filtered)
    
    return filtered
  }, [orders, dateRange, getCachedData, setCachedData, optimizeAggregatedData])

  // 高度なフィルターを適用
  const handleAdvancedFilterChange = (filtered: ECForceOrder[]) => {
    setFilteredOrders(filtered)
  }

  // KPIの計算
  const kpis = useMemo(() => {
    const totalRevenue = filteredOrders.reduce((sum, order) => sum + order.小計, 0)
    const uniqueCustomers = new Set(filteredOrders.map(order => order.顧客番号)).size
    const averageOrderValue = filteredOrders.length > 0 ? totalRevenue / filteredOrders.length : 0
    const subscriptionRate = filteredOrders.filter(order => order.定期ステータス === '有効').length / filteredOrders.length * 100

    return {
      totalRevenue,
      uniqueCustomers,
      averageOrderValue,
      subscriptionRate,
      totalOrders: filteredOrders.length
    }
  }, [filteredOrders])

  if (orders.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <ShoppingCart className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">データがありません</h3>
          <p className="mt-1 text-sm text-gray-500">
            EC Forceからデータをインポートしてください
          </p>
          <div className="mt-6">
            <a
              href="/ecforce-import"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              インポートページへ
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">EC Force ダッシュボード</h1>
            <p className="mt-2 text-sm text-gray-600">
              売上データと顧客分析の概要
            </p>
          </div>
          <AddToFavoriteButton
            analysisName="EC Force ダッシュボード"
            analysisType="custom"
            route="/ecforce-dashboard"
            description="EC Forceの売上データと顧客分析の統合ビュー"
            filters={{ dateRange, showAdvancedFilter }}
          />
        </div>
      </div>

      {/* フィルターセクション */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <ECForceDateFilter
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
          />
          <button
            onClick={() => setShowAdvancedFilter(!showAdvancedFilter)}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 flex items-center"
          >
            <Filter className="h-4 w-4 mr-2" />
            高度なフィルター
          </button>
        </div>
        
        {/* 高度なフィルター */}
        {showAdvancedFilter && (
          <div className="mt-4">
            <AdvancedFilter
              orders={dateFilteredOrders}
              onFilterChange={handleAdvancedFilterChange}
              onClose={() => setShowAdvancedFilter(false)}
            />
          </div>
        )}
      </div>

      {/* KPIカード */}
      <div className="mb-8">
        {isProcessing ? (
          <KPICardSkeleton />
        ) : (
          <ECForceKPICards kpis={kpis} />
        )}
      </div>

      {/* グラフセクション */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* 売上推移グラフ */}
        {isProcessing ? (
          <ChartSkeleton />
        ) : (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              売上推移
            </h2>
            <ECForceSalesChart orders={optimizeChartData(filteredOrders, 50)} />
          </div>
        )}

        {/* 顧客分析 */}
        {isProcessing ? (
          <ChartSkeleton />
        ) : (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              顧客分析
            </h2>
            <ECForceCustomerAnalysis orders={filteredOrders.slice(0, 1000)} />
          </div>
        )}
      </div>

      {/* オファー別分析 */}
      {isProcessing ? (
        <ChartSkeleton />
      ) : (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            オファー別分析
          </h2>
          <ECForceOfferAnalysis orders={filteredOrders} />
        </div>
      )}

      {/* エクスポート機能 */}
      <div className="mt-8">
        <DataExporter 
          orders={dateFilteredOrders} 
          filteredOrders={filteredOrders}
          reportType="full"
        />
      </div>
    </div>
  )
}