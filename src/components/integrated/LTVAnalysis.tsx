import React, { useMemo } from 'react'
import { ECForceOrder } from '../../types/ecforce'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { TrendingUp, Users, DollarSign, Calendar } from 'lucide-react'

interface LTVAnalysisProps {
  orders: ECForceOrder[]
}

interface CustomerLTV {
  customerId: string
  email: string
  firstPurchaseDate: Date
  totalSpent: number
  orderCount: number
  averageOrderValue: number
  daysSinceFirstPurchase: number
  monthsSinceFirstPurchase: number
  isSubscriber: boolean
  predictedLTV: number
}

export const LTVAnalysis: React.FC<LTVAnalysisProps> = ({ orders }) => {
  const ltvData = useMemo(() => {
    const now = new Date()
    const customerData: Record<string, CustomerLTV> = {}

    // 顧客ごとにデータを集計
    const sortedOrders = [...orders].sort(
      (a, b) => new Date(a.受注日).getTime() - new Date(b.受注日).getTime()
    )

    sortedOrders.forEach((order) => {
      const customerId = order.顧客番号
      const purchaseDate = new Date(order.受注日)

      if (!customerData[customerId]) {
        customerData[customerId] = {
          customerId,
          email: order.メールアドレス,
          firstPurchaseDate: purchaseDate,
          totalSpent: 0,
          orderCount: 0,
          averageOrderValue: 0,
          daysSinceFirstPurchase: 0,
          monthsSinceFirstPurchase: 0,
          isSubscriber: false,
          predictedLTV: 0,
        }
      }

      customerData[customerId].totalSpent += order.小計
      customerData[customerId].orderCount += 1

      if (order.定期ステータス === '有効') {
        customerData[customerId].isSubscriber = true
      }
    })

    // LTV関連の指標を計算
    Object.values(customerData).forEach((customer) => {
      customer.averageOrderValue = customer.totalSpent / customer.orderCount
      customer.daysSinceFirstPurchase = Math.floor(
        (now.getTime() - customer.firstPurchaseDate.getTime()) / (1000 * 60 * 60 * 24)
      )
      customer.monthsSinceFirstPurchase = Math.floor(customer.daysSinceFirstPurchase / 30)

      // 簡易的なLTV予測（月間平均購入額 × 予測継続月数）
      const monthlySpend =
        customer.monthsSinceFirstPurchase > 0
          ? customer.totalSpent / customer.monthsSinceFirstPurchase
          : customer.totalSpent
      const predictedMonths = customer.isSubscriber ? 24 : 12 // 定期購入者は24ヶ月、通常は12ヶ月
      customer.predictedLTV = monthlySpend * predictedMonths
    })

    return Object.values(customerData)
  }, [orders])

  // コホート別LTV
  const cohortLTV = useMemo(() => {
    const cohortData: Record<
      string,
      {
        month: string
        customers: Set<string>
        totalLTV: number
        avgLTV: number
        subscribers: number
      }
    > = {}

    ltvData.forEach((customer) => {
      const cohortMonth = customer.firstPurchaseDate.toISOString().slice(0, 7)

      if (!cohortData[cohortMonth]) {
        cohortData[cohortMonth] = {
          month: cohortMonth,
          customers: new Set(),
          totalLTV: 0,
          avgLTV: 0,
          subscribers: 0,
        }
      }

      cohortData[cohortMonth].customers.add(customer.customerId)
      cohortData[cohortMonth].totalLTV += customer.totalSpent
      if (customer.isSubscriber) {
        cohortData[cohortMonth].subscribers += 1
      }
    })

    // 平均LTVを計算
    Object.values(cohortData).forEach((cohort) => {
      cohort.avgLTV = cohort.totalLTV / cohort.customers.size
    })

    return Object.values(cohortData).sort((a, b) => a.month.localeCompare(b.month))
  }, [ltvData])

  // LTVセグメント
  const ltvSegments = useMemo(() => {
    const segments = {
      high: { customers: 0, totalLTV: 0, threshold: 50000 },
      medium: { customers: 0, totalLTV: 0, threshold: 20000 },
      low: { customers: 0, totalLTV: 0, threshold: 0 },
    }

    ltvData.forEach((customer) => {
      if (customer.totalSpent >= segments.high.threshold) {
        segments.high.customers += 1
        segments.high.totalLTV += customer.totalSpent
      } else if (customer.totalSpent >= segments.medium.threshold) {
        segments.medium.customers += 1
        segments.medium.totalLTV += customer.totalSpent
      } else {
        segments.low.customers += 1
        segments.low.totalLTV += customer.totalSpent
      }
    })

    return segments
  }, [ltvData])

  // サマリー統計
  const summary = useMemo(() => {
    const totalCustomers = ltvData.length
    const totalRevenue = ltvData.reduce((sum, c) => sum + c.totalSpent, 0)
    const avgLTV = totalCustomers > 0 ? totalRevenue / totalCustomers : 0
    const subscriberCount = ltvData.filter((c) => c.isSubscriber).length
    const subscriberLTV =
      ltvData.filter((c) => c.isSubscriber).reduce((sum, c) => sum + c.totalSpent, 0) /
      (subscriberCount || 1)
    const nonSubscriberLTV =
      ltvData.filter((c) => !c.isSubscriber).reduce((sum, c) => sum + c.totalSpent, 0) /
      (totalCustomers - subscriberCount || 1)

    return {
      totalCustomers,
      totalRevenue,
      avgLTV,
      subscriberCount,
      subscriberRate: (subscriberCount / totalCustomers) * 100,
      subscriberLTV,
      nonSubscriberLTV,
      ltvMultiplier: nonSubscriberLTV > 0 ? subscriberLTV / nonSubscriberLTV : 0,
    }
  }, [ltvData])

  const topCustomers = useMemo(() => {
    return [...ltvData].sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 10)
  }, [ltvData])

  return (
    <div className="space-y-6">
      {/* サマリーカード */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">平均LTV</p>
              <p className="text-2xl font-semibold text-gray-900 mt-2">
                ¥{Math.round(summary.avgLTV).toLocaleString()}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">定期購入者LTV</p>
              <p className="text-2xl font-semibold text-gray-900 mt-2">
                ¥{Math.round(summary.subscriberLTV).toLocaleString()}
              </p>
              <p className="text-xs text-green-600 mt-1">{summary.ltvMultiplier.toFixed(1)}x</p>
            </div>
            <TrendingUp className="h-8 w-8 text-indigo-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">通常購入者LTV</p>
              <p className="text-2xl font-semibold text-gray-900 mt-2">
                ¥{Math.round(summary.nonSubscriberLTV).toLocaleString()}
              </p>
            </div>
            <Users className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">定期購入率</p>
              <p className="text-2xl font-semibold text-gray-900 mt-2">
                {summary.subscriberRate.toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {summary.subscriberCount}人/{summary.totalCustomers}人
              </p>
            </div>
            <Calendar className="h-8 w-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* コホート別LTV推移 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">コホート別平均LTV</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={cohortLTV} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="month"
                tickFormatter={(value) => {
                  const month = value.split('-')[1]
                  return `${month}月`
                }}
              />
              <YAxis tickFormatter={(value) => `¥${(value / 1000).toFixed(0)}K`} />
              <Tooltip
                formatter={(value: any) => `¥${value.toLocaleString()}`}
                labelFormatter={(label) => `コホート: ${label}`}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="avgLTV"
                stroke="#4F46E5"
                strokeWidth={2}
                name="平均LTV"
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* LTVセグメント分布 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <h4 className="text-sm font-medium text-gray-900 mb-2">高LTV顧客</h4>
          <p className="text-xs text-gray-500 mb-2">¥50,000以上</p>
          <p className="text-2xl font-semibold text-green-600">{ltvSegments.high.customers}人</p>
          <p className="text-sm text-gray-600 mt-2">
            売上貢献: ¥{Math.round(ltvSegments.high.totalLTV).toLocaleString()}
          </p>
          <p className="text-xs text-gray-500">
            ({((ltvSegments.high.totalLTV / summary.totalRevenue) * 100).toFixed(1)}%)
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h4 className="text-sm font-medium text-gray-900 mb-2">中LTV顧客</h4>
          <p className="text-xs text-gray-500 mb-2">¥20,000〜¥50,000</p>
          <p className="text-2xl font-semibold text-blue-600">{ltvSegments.medium.customers}人</p>
          <p className="text-sm text-gray-600 mt-2">
            売上貢献: ¥{Math.round(ltvSegments.medium.totalLTV).toLocaleString()}
          </p>
          <p className="text-xs text-gray-500">
            ({((ltvSegments.medium.totalLTV / summary.totalRevenue) * 100).toFixed(1)}%)
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h4 className="text-sm font-medium text-gray-900 mb-2">低LTV顧客</h4>
          <p className="text-xs text-gray-500 mb-2">¥20,000未満</p>
          <p className="text-2xl font-semibold text-gray-600">{ltvSegments.low.customers}人</p>
          <p className="text-sm text-gray-600 mt-2">
            売上貢献: ¥{Math.round(ltvSegments.low.totalLTV).toLocaleString()}
          </p>
          <p className="text-xs text-gray-500">
            ({((ltvSegments.low.totalLTV / summary.totalRevenue) * 100).toFixed(1)}%)
          </p>
        </div>
      </div>

      {/* 高LTV顧客リスト */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">LTV上位顧客</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  顧客
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  累計購入額
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  注文回数
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  平均単価
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  定期購入
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  初回購入からの日数
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {topCustomers.map((customer) => (
                <tr key={customer.customerId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {customer.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    ¥{customer.totalSpent.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {customer.orderCount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    ¥{Math.round(customer.averageOrderValue).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                    {customer.isSubscriber ? (
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        有効
                      </span>
                    ) : (
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                        なし
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {customer.daysSinceFirstPurchase}日
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
