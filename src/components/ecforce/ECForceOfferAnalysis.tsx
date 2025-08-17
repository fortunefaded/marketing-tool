import React, { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts'
import { ECForceOrder } from '../../types/ecforce'
import { usePagination } from '../../hooks/usePagination'
import { Pagination } from '../common/Pagination'

interface ECForceOfferAnalysisProps {
  orders: ECForceOrder[]
}

export const ECForceOfferAnalysis: React.FC<ECForceOfferAnalysisProps> = ({ orders }) => {
  const offerData = useMemo(() => {
    // オファー別の集計
    const offerStats = orders.reduce((acc, order) => {
      const offer = order.購入オファー || '不明'
      
      if (!acc[offer]) {
        acc[offer] = {
          name: offer,
          売上: 0,
          注文数: 0,
          平均単価: 0,
          定期化率: 0,
          定期注文数: 0
        }
      }
      
      acc[offer].売上 += order.小計
      acc[offer].注文数 += 1
      if (order.定期ステータス === '有効') {
        acc[offer].定期注文数 += 1
      }
      
      return acc
    }, {} as Record<string, any>)

    // 平均単価と定期化率を計算
    Object.values(offerStats).forEach((stats: any) => {
      stats.平均単価 = Math.round(stats.売上 / stats.注文数)
      stats.定期化率 = Math.round((stats.定期注文数 / stats.注文数) * 100)
    })

    // 売上順にソート
    return Object.values(offerStats)
      .sort((a: any, b: any) => b.売上 - a.売上)
  }, [orders])

  // ページネーション設定
  const {
    currentPage,
    goToPage,
    paginatedData: paginatedOfferData,
    pageInfo,
    setItemsPerPage,
    totalPages
  } = usePagination({ 
    data: offerData, 
    itemsPerPage: 10 
  })

  // グラフ用データ（上位10件のみ）
  const chartData = offerData.slice(0, 10)

  const advertiserData = useMemo(() => {
    // 広告主別の集計
    const adStats = orders.reduce((acc, order) => {
      const advertiser = order.広告主名 || '不明'
      
      if (!acc[advertiser]) {
        acc[advertiser] = {
          name: advertiser,
          売上: 0,
          注文数: 0
        }
      }
      
      acc[advertiser].売上 += order.小計
      acc[advertiser].注文数 += 1
      
      return acc
    }, {} as Record<string, any>)

    return Object.values(adStats)
      .sort((a: any, b: any) => b.売上 - a.売上)
      .slice(0, 5)
  }, [orders])

  const formatYAxis = (value: number) => {
    if (value >= 1000000) {
      return `¥${(value / 1000000).toFixed(1)}M`
    } else if (value >= 1000) {
      return `¥${(value / 1000).toFixed(0)}K`
    }
    return `¥${value}`
  }

  return (
    <div className="space-y-8">
      {/* オファー別売上 */}
      <div>
        <h3 className="text-base font-medium text-gray-700 mb-4">オファー別パフォーマンス</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                angle={-45}
                textAnchor="end"
                height={100}
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                yAxisId="left"
                orientation="left"
                tick={{ fontSize: 12 }}
                tickFormatter={formatYAxis}
              />
              <YAxis 
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip 
                formatter={(value: any, name: string) => {
                  if (name === '売上') return `¥${value.toLocaleString()}`
                  if (name === '定期化率') return `${value}%`
                  return value
                }}
              />
              <Legend />
              <Bar yAxisId="left" dataKey="売上" fill="#4F46E5" />
              <Bar yAxisId="right" dataKey="定期化率" fill="#10B981" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* オファー別詳細テーブル */}
      <div>
        <h3 className="text-base font-medium text-gray-700 mb-4">オファー別詳細</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  オファー名
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  売上
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  注文数
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  平均単価
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  定期化率
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedOfferData.map((offer) => (
                <tr key={offer.name} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {offer.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    ¥{offer.売上.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {offer.注文数}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    ¥{offer.平均単価.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      offer.定期化率 >= 50 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {offer.定期化率}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* ページネーション */}
        <div className="mt-4">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={goToPage}
            pageInfo={pageInfo}
            onItemsPerPageChange={setItemsPerPage}
          />
        </div>
      </div>

      {/* 広告主別売上 */}
      <div>
        <h3 className="text-base font-medium text-gray-700 mb-4">広告主別売上</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={advertiserData} layout="horizontal" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                type="number"
                tick={{ fontSize: 12 }}
                tickFormatter={formatYAxis}
              />
              <YAxis 
                dataKey="name" 
                type="category"
                tick={{ fontSize: 12 }}
                width={70}
              />
              <Tooltip 
                formatter={(value: any) => `¥${value.toLocaleString()}`}
              />
              <Bar dataKey="売上" fill="#F59E0B" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}