import React, { useMemo } from 'react'
import {
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ComposedChart
} from 'recharts'
import { ECForceOrder } from '../../types/ecforce'

interface ROASAnalysisProps {
  ecforceOrders: ECForceOrder[]
  metaAdData: any
}

export const ROASAnalysis: React.FC<ROASAnalysisProps> = ({
  ecforceOrders,
  metaAdData
}) => {
  const roasData = useMemo(() => {
    // 日付別に広告費と売上を集計
    const dailyData: Record<string, {
      date: string
      adSpend: number
      revenue: number
      roas: number
      orders: number
    }> = {}

    // 広告費を日割り計算（簡易的に10日間で均等配分）
    const dailyAdSpend = metaAdData.totalSpend / 10

    // EC Forceの売上データを日付別に集計
    ecforceOrders.forEach(order => {
      const date = order.受注日.split(' ')[0]
      if (!dailyData[date]) {
        dailyData[date] = {
          date,
          adSpend: dailyAdSpend,
          revenue: 0,
          roas: 0,
          orders: 0
        }
      }
      
      // 広告経由の売上のみカウント（広告URLグループ名がある場合）
      if (order.広告URLグループ名) {
        dailyData[date].revenue += order.小計
        dailyData[date].orders += 1
      }
    })

    // ROAS計算
    Object.values(dailyData).forEach(data => {
      data.roas = data.adSpend > 0 ? data.revenue / data.adSpend : 0
    })

    return Object.values(dailyData).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )
  }, [ecforceOrders, metaAdData])

  // 広告主別ROAS
  const advertiserROAS = useMemo(() => {
    const adData: Record<string, {
      advertiser: string
      revenue: number
      orders: number
      spend: number
      roas: number
    }> = {}

    ecforceOrders.forEach(order => {
      if (order.広告主名) {
        if (!adData[order.広告主名]) {
          adData[order.広告主名] = {
            advertiser: order.広告主名,
            revenue: 0,
            orders: 0,
            spend: 0,
            roas: 0
          }
        }
        adData[order.広告主名].revenue += order.小計
        adData[order.広告主名].orders += 1
      }
    })

    // 広告費を広告主ごとに配分（注文数比率で配分）
    const totalOrders = Object.values(adData).reduce((sum, d) => sum + d.orders, 0)
    Object.values(adData).forEach(data => {
      data.spend = (data.orders / totalOrders) * metaAdData.totalSpend
      data.roas = data.spend > 0 ? data.revenue / data.spend : 0
    })

    return Object.values(adData).sort((a, b) => b.roas - a.roas)
  }, [ecforceOrders, metaAdData])

  const formatYAxis = (value: number) => {
    if (value >= 1000000) {
      return `¥${(value / 1000000).toFixed(1)}M`
    } else if (value >= 1000) {
      return `¥${(value / 1000).toFixed(0)}K`
    }
    return `¥${value}`
  }

  return (
    <div className="space-y-6">
      {/* ROAS推移 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          ROAS推移（日別）
        </h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={roasData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(value) => {
                  const date = new Date(value)
                  return `${date.getMonth() + 1}/${date.getDate()}`
                }}
              />
              <YAxis yAxisId="left" tickFormatter={formatYAxis} />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip 
                formatter={(value: any, name: string) => {
                  if (name === '売上' || name === '広告費') {
                    return `¥${value.toLocaleString()}`
                  }
                  return value.toFixed(2)
                }}
              />
              <Legend />
              <Bar yAxisId="left" dataKey="revenue" fill="#10B981" name="売上" />
              <Bar yAxisId="left" dataKey="adSpend" fill="#EF4444" name="広告費" />
              <Line 
                yAxisId="right" 
                type="monotone" 
                dataKey="roas" 
                stroke="#4F46E5" 
                strokeWidth={2}
                name="ROAS"
                dot={{ r: 4 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 広告主別ROAS */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          広告主別ROAS
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={advertiserROAS} 
              layout="horizontal"
              margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="advertiser" type="category" width={70} />
              <Tooltip formatter={(value: any) => value.toFixed(2)} />
              <Bar dataKey="roas" fill="#4F46E5" name="ROAS" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 詳細テーブル */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          広告パフォーマンス詳細
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  広告主
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  売上
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  推定広告費
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ROAS
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  注文数
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  平均単価
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {advertiserROAS.map((data) => (
                <tr key={data.advertiser} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {data.advertiser}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    ¥{data.revenue.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    ¥{Math.round(data.spend).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      data.roas >= 3 ? 'bg-green-100 text-green-800' : 
                      data.roas >= 1 ? 'bg-yellow-100 text-yellow-800' : 
                      'bg-red-100 text-red-800'
                    }`}>
                      {data.roas.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {data.orders}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    ¥{Math.round(data.revenue / data.orders).toLocaleString()}
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