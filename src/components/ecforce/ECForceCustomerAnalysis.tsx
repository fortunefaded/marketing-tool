import React, { useMemo } from 'react'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip
} from 'recharts'
import { ECForceOrder } from '../../types/ecforce'

interface ECForceCustomerAnalysisProps {
  orders: ECForceOrder[]
}

export const ECForceCustomerAnalysis: React.FC<ECForceCustomerAnalysisProps> = ({ orders }) => {
  const customerData = useMemo(() => {
    // 顧客ごとの購入回数を集計
    const customerPurchases = orders.reduce((acc, order) => {
      const customerId = order.顧客番号
      if (!acc[customerId]) {
        acc[customerId] = {
          id: customerId,
          email: order.メールアドレス,
          purchases: 0,
          totalSpent: 0,
          isSubscriber: false
        }
      }
      
      acc[customerId].purchases += 1
      acc[customerId].totalSpent += order.小計
      if (order.定期ステータス === '有効') {
        acc[customerId].isSubscriber = true
      }
      
      return acc
    }, {} as Record<string, any>)

    // 購入回数別に分類
    const segmentation = {
      '初回購入': 0,
      '2-3回購入': 0,
      '4-9回購入': 0,
      '10回以上': 0
    }

    const subscriberStats = {
      '定期購入者': 0,
      '通常購入者': 0
    }

    Object.values(customerPurchases).forEach((customer: any) => {
      if (customer.purchases === 1) {
        segmentation['初回購入'] += 1
      } else if (customer.purchases <= 3) {
        segmentation['2-3回購入'] += 1
      } else if (customer.purchases <= 9) {
        segmentation['4-9回購入'] += 1
      } else {
        segmentation['10回以上'] += 1
      }

      if (customer.isSubscriber) {
        subscriberStats['定期購入者'] += 1
      } else {
        subscriberStats['通常購入者'] += 1
      }
    })

    return {
      segmentation: Object.entries(segmentation).map(([name, value]) => ({
        name,
        value
      })),
      subscriberStats: Object.entries(subscriberStats).map(([name, value]) => ({
        name,
        value
      })),
      topCustomers: Object.values(customerPurchases)
        .sort((a: any, b: any) => b.totalSpent - a.totalSpent)
        .slice(0, 5)
    }
  }, [orders])

  const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444']
  const SUBSCRIBER_COLORS = ['#10B981', '#6B7280']

  return (
    <div className="space-y-6">
      {/* 購入回数別顧客セグメント */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">購入回数別顧客分布</h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={customerData.segmentation}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={60}
                fill="#8884d8"
                dataKey="value"
              >
                {customerData.segmentation.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 定期購入者の割合 */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">定期購入者の割合</h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={customerData.subscriberStats}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={60}
                fill="#8884d8"
                dataKey="value"
              >
                {customerData.subscriberStats.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={SUBSCRIBER_COLORS[index]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 上位顧客 */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">購入額上位顧客</h3>
        <div className="space-y-2">
          {customerData.topCustomers.map((customer: any, index: number) => (
            <div key={customer.id} className="flex items-center justify-between text-sm">
              <span className="text-gray-600 truncate flex-1">
                {index + 1}. {customer.email}
              </span>
              <span className="font-medium text-gray-900 ml-2">
                ¥{customer.totalSpent.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}