import React from 'react'
import { ECForceOrder } from '../../types/ecforce'
import { ShoppingCart, Users, TrendingUp, DollarSign } from 'lucide-react'

interface ECForceDataSummaryProps {
  data: ECForceOrder[]
}

export const ECForceDataSummary: React.FC<ECForceDataSummaryProps> = ({ data }) => {
  // 統計情報を計算
  const stats = React.useMemo(() => {
    const totalRevenue = data.reduce((sum, order) => sum + order.小計, 0)
    const uniqueCustomers = new Set(data.map((order) => order.顧客番号)).size
    const activeSubscriptions = data.filter((order) => order.定期ステータス === '有効').length
    const averageOrderValue = data.length > 0 ? totalRevenue / data.length : 0

    // 広告主別の売上
    const revenueByAdvertiser = data.reduce(
      (acc, order) => {
        const advertiser = order.広告主名 || '不明'
        acc[advertiser] = (acc[advertiser] || 0) + order.小計
        return acc
      },
      {} as Record<string, number>
    )

    // 購入オファー別の件数
    const ordersByOffer = data.reduce(
      (acc, order) => {
        const offer = order.購入オファー || '不明'
        acc[offer] = (acc[offer] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    // 日別の注文数
    const ordersByDate = data.reduce(
      (acc, order) => {
        const date = order.受注日.split(' ')[0] // 日付部分のみ取得
        acc[date] = (acc[date] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    return {
      totalOrders: data.length,
      totalRevenue,
      uniqueCustomers,
      activeSubscriptions,
      averageOrderValue,
      revenueByAdvertiser,
      ordersByOffer,
      ordersByDate,
    }
  }, [data])

  if (data.length === 0) {
    return null
  }

  // 上位広告主を取得
  const topAdvertisers = Object.entries(stats.revenueByAdvertiser)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)

  // 上位オファーを取得
  const topOffers = Object.entries(stats.ordersByOffer)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)

  return (
    <div className="space-y-6">
      {/* 主要指標 */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ShoppingCart className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">総注文数</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.totalOrders.toLocaleString()}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DollarSign className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">総売上</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    ¥{stats.totalRevenue.toLocaleString()}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">ユニーク顧客数</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.uniqueCustomers.toLocaleString()}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">平均注文額</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    ¥{Math.round(stats.averageOrderValue).toLocaleString()}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 詳細情報 */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* 広告主別売上 */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">広告主別売上 TOP5</h3>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {topAdvertisers.map(([advertiser, revenue], index) => (
                <div key={advertiser} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="text-sm font-medium text-gray-600 w-6">{index + 1}.</span>
                    <span className="text-sm text-gray-900 ml-2">{advertiser}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    ¥{revenue.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* オファー別注文数 */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">購入オファー別注文数 TOP5</h3>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {topOffers.map(([offer, count], index) => (
                <div key={offer} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="text-sm font-medium text-gray-600 w-6">{index + 1}.</span>
                    <span className="text-sm text-gray-900 ml-2">{offer}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">{count}件</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 定期購入情報 */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">定期購入情報</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-indigo-600">{stats.activeSubscriptions}</div>
              <div className="text-sm text-gray-500 mt-1">有効な定期購入</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {((stats.activeSubscriptions / stats.totalOrders) * 100).toFixed(1)}%
              </div>
              <div className="text-sm text-gray-500 mt-1">定期購入率</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {data.filter((o) => typeof o.定期回数 === 'number' && o.定期回数 > 1).length}
              </div>
              <div className="text-sm text-gray-500 mt-1">継続購入者数</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
