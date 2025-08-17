import React, { useMemo, useState } from 'react'
import { ECForceOrder } from '../../types/ecforce'
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts'
import { VirtualizedTable } from '../common/VirtualizedTable'

interface RFMAnalysisProps {
  orders: ECForceOrder[]
}

interface CustomerRFM {
  customerId: string
  email: string
  recency: number // 最終購入からの日数
  frequency: number // 購入回数
  monetary: number // 総購入金額
  segment: string
  score: string
}

export const RFMAnalysis: React.FC<RFMAnalysisProps> = ({ orders }) => {
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null)
  const rfmData = useMemo(() => {
    const now = new Date()
    const customerData: Record<string, {
      email: string
      lastPurchase: Date
      purchases: number
      totalSpent: number
    }> = {}

    // 顧客ごとにデータを集計
    orders.forEach(order => {
      const customerId = order.顧客番号
      const purchaseDate = new Date(order.受注日)
      
      if (!customerData[customerId]) {
        customerData[customerId] = {
          email: order.メールアドレス,
          lastPurchase: purchaseDate,
          purchases: 0,
          totalSpent: 0
        }
      }
      
      customerData[customerId].purchases += 1
      customerData[customerId].totalSpent += order.小計
      
      if (purchaseDate > customerData[customerId].lastPurchase) {
        customerData[customerId].lastPurchase = purchaseDate
      }
    })

    // RFMスコアを計算
    const customers: CustomerRFM[] = Object.entries(customerData).map(([customerId, data]) => {
      const recency = Math.floor((now.getTime() - data.lastPurchase.getTime()) / (1000 * 60 * 60 * 24))
      
      return {
        customerId,
        email: data.email,
        recency,
        frequency: data.purchases,
        monetary: data.totalSpent,
        segment: '',
        score: ''
      }
    })

    // 各指標でスコアリング（5段階）
    const recencyValues = customers.map(c => c.recency).sort((a, b) => a - b)
    const frequencyValues = customers.map(c => c.frequency).sort((a, b) => b - a)
    const monetaryValues = customers.map(c => c.monetary).sort((a, b) => b - a)
    
    const getScore = (value: number, sortedValues: number[], isRecency = false) => {
      const index = sortedValues.indexOf(value)
      const percentile = index / sortedValues.length
      
      if (isRecency) {
        // Recencyは小さいほど良い
        if (percentile <= 0.2) return 5
        if (percentile <= 0.4) return 4
        if (percentile <= 0.6) return 3
        if (percentile <= 0.8) return 2
        return 1
      } else {
        // FrequencyとMonetaryは大きいほど良い
        if (percentile <= 0.2) return 1
        if (percentile <= 0.4) return 2
        if (percentile <= 0.6) return 3
        if (percentile <= 0.8) return 4
        return 5
      }
    }

    // スコアとセグメントを割り当て
    customers.forEach(customer => {
      const rScore = getScore(customer.recency, recencyValues, true)
      const fScore = getScore(customer.frequency, frequencyValues)
      const mScore = getScore(customer.monetary, monetaryValues)
      
      customer.score = `${rScore}${fScore}${mScore}`
      
      // セグメント分類
      if (rScore >= 4 && fScore >= 4 && mScore >= 4) {
        customer.segment = 'チャンピオン'
      } else if (rScore >= 4 && fScore >= 2 && mScore >= 3) {
        customer.segment = '優良顧客'
      } else if (rScore >= 3 && fScore >= 3 && mScore >= 3) {
        customer.segment = '潜在的優良顧客'
      } else if (rScore >= 3 && fScore === 1) {
        customer.segment = '新規顧客'
      } else if (rScore <= 2 && fScore >= 3) {
        customer.segment = '離反リスク'
      } else if (rScore <= 2 && fScore <= 2) {
        customer.segment = '休眠顧客'
      } else {
        customer.segment = 'その他'
      }
    })

    return customers
  }, [orders])

  // セグメント別の統計
  const segmentStats = useMemo(() => {
    const stats: Record<string, {
      count: number
      avgMonetary: number
      totalMonetary: number
      color: string
    }> = {
      'チャンピオン': { count: 0, avgMonetary: 0, totalMonetary: 0, color: '#10B981' },
      '優良顧客': { count: 0, avgMonetary: 0, totalMonetary: 0, color: '#3B82F6' },
      '潜在的優良顧客': { count: 0, avgMonetary: 0, totalMonetary: 0, color: '#6366F1' },
      '新規顧客': { count: 0, avgMonetary: 0, totalMonetary: 0, color: '#8B5CF6' },
      '離反リスク': { count: 0, avgMonetary: 0, totalMonetary: 0, color: '#F59E0B' },
      '休眠顧客': { count: 0, avgMonetary: 0, totalMonetary: 0, color: '#EF4444' },
      'その他': { count: 0, avgMonetary: 0, totalMonetary: 0, color: '#6B7280' }
    }

    rfmData.forEach(customer => {
      if (stats[customer.segment]) {
        stats[customer.segment].count += 1
        stats[customer.segment].totalMonetary += customer.monetary
      }
    })

    Object.values(stats).forEach(stat => {
      stat.avgMonetary = stat.count > 0 ? stat.totalMonetary / stat.count : 0
    })

    return stats
  }, [rfmData])

  // 散布図用データ（Recency vs Frequency）
  const scatterData = rfmData.map(customer => ({
    x: customer.recency,
    y: customer.frequency,
    z: customer.monetary,
    segment: customer.segment,
    email: customer.email
  }))

  return (
    <div className="space-y-6">
      {/* セグメント概要 */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Object.entries(segmentStats).map(([segment, stats]) => (
          <div key={segment} className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-900">{segment}</h4>
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: stats.color }}
              />
            </div>
            <p className="text-2xl font-semibold text-gray-900">{stats.count}</p>
            <p className="text-xs text-gray-500 mt-1">
              平均購入額: ¥{Math.round(stats.avgMonetary).toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      {/* RFM散布図 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          RFM分布図（最終購入日数 × 購入回数）
        </h3>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, bottom: 60, left: 60 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                type="number" 
                dataKey="x" 
                name="最終購入からの日数"
                label={{ value: '最終購入からの日数', position: 'insideBottom', offset: -10 }}
              />
              <YAxis 
                type="number" 
                dataKey="y" 
                name="購入回数"
                label={{ value: '購入回数', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                cursor={{ strokeDasharray: '3 3' }}
                content={({ active, payload }) => {
                  if (active && payload && payload[0]) {
                    const data = payload[0].payload
                    return (
                      <div className="bg-white p-3 border rounded shadow-lg">
                        <p className="text-sm font-medium">{data.segment}</p>
                        <p className="text-xs text-gray-600">{data.email}</p>
                        <p className="text-xs">最終購入: {data.x}日前</p>
                        <p className="text-xs">購入回数: {data.y}回</p>
                        <p className="text-xs">総購入額: ¥{data.z.toLocaleString()}</p>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Scatter name="顧客" data={scatterData} fill="#8884d8">
                {scatterData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={segmentStats[entry.segment]?.color || '#6B7280'} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* セグメント別アクション提案 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          セグメント別マーケティング施策
        </h3>
        <div className="space-y-4">
          <div className="border-l-4 border-green-500 pl-4">
            <h4 className="font-medium text-gray-900">チャンピオン（{segmentStats['チャンピオン'].count}人）</h4>
            <p className="text-sm text-gray-600 mt-1">
              VIP特典の提供、新商品の先行案内、アンバサダープログラムへの招待
            </p>
          </div>
          <div className="border-l-4 border-blue-500 pl-4">
            <h4 className="font-medium text-gray-900">優良顧客（{segmentStats['優良顧客'].count}人）</h4>
            <p className="text-sm text-gray-600 mt-1">
              限定クーポンの配布、アップセル・クロスセルの提案
            </p>
          </div>
          <div className="border-l-4 border-indigo-500 pl-4">
            <h4 className="font-medium text-gray-900">潜在的優良顧客（{segmentStats['潜在的優良顧客'].count}人）</h4>
            <p className="text-sm text-gray-600 mt-1">
              購入頻度向上キャンペーン、ポイント2倍キャンペーン
            </p>
          </div>
          <div className="border-l-4 border-purple-500 pl-4">
            <h4 className="font-medium text-gray-900">新規顧客（{segmentStats['新規顧客'].count}人）</h4>
            <p className="text-sm text-gray-600 mt-1">
              ウェルカムシリーズの配信、初回購入特典の提供
            </p>
          </div>
          <div className="border-l-4 border-yellow-500 pl-4">
            <h4 className="font-medium text-gray-900">離反リスク（{segmentStats['離反リスク'].count}人）</h4>
            <p className="text-sm text-gray-600 mt-1">
              カムバックキャンペーン、特別割引の提供、アンケート実施
            </p>
          </div>
          <div className="border-l-4 border-red-500 pl-4">
            <h4 className="font-medium text-gray-900">休眠顧客（{segmentStats['休眠顧客'].count}人）</h4>
            <p className="text-sm text-gray-600 mt-1">
              リアクティベーションキャンペーン、大幅割引の提供
            </p>
          </div>
        </div>
      </div>

      {/* 顧客詳細テーブル */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          顧客詳細
        </h3>
        
        {/* セグメントフィルター */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            セグメントでフィルター
          </label>
          <select
            value={selectedSegment || ''}
            onChange={(e) => setSelectedSegment(e.target.value || null)}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
          >
            <option value="">すべてのセグメント</option>
            {Object.keys(segmentStats).map(segment => (
              <option key={segment} value={segment}>
                {segment} ({segmentStats[segment].count}人)
              </option>
            ))}
          </select>
        </div>

        {/* 仮想スクロールテーブル */}
        <VirtualizedTable
          data={selectedSegment ? rfmData.filter(c => c.segment === selectedSegment) : rfmData}
          columns={[
            {
              key: 'email',
              header: 'メールアドレス',
              width: 250
            },
            {
              key: 'segment',
              header: 'セグメント',
              width: 150,
              render: (customer) => (
                <span
                  className="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                  style={{
                    backgroundColor: `${segmentStats[customer.segment]?.color}20`,
                    color: segmentStats[customer.segment]?.color
                  }}
                >
                  {customer.segment}
                </span>
              )
            },
            {
              key: 'recency',
              header: '最終購入(日前)',
              width: 120,
              render: (customer) => `${customer.recency}日`
            },
            {
              key: 'frequency',
              header: '購入回数',
              width: 100,
              render: (customer) => `${customer.frequency}回`
            },
            {
              key: 'monetary',
              header: '総購入額',
              width: 150,
              render: (customer) => `¥${customer.monetary.toLocaleString()}`
            },
            {
              key: 'score',
              header: 'RFMスコア',
              width: 100,
              render: (customer) => (
                <span className="font-mono text-sm">{customer.score}</span>
              )
            }
          ]}
          rowHeight={48}
          height={400}
          getRowKey={(item, _index) => item.customerId}
        />
      </div>
    </div>
  )
}