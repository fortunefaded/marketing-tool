import React, { useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts'
import { TrendingUp, AlertCircle, Info } from 'lucide-react'
import { ECForceOrder } from '@/types'

interface SalesPredictionProps {
  orders: ECForceOrder[]
  predictionDays?: number
}

interface PredictionData {
  date: string
  actual?: number
  predicted?: number
  upperBound?: number
  lowerBound?: number
  isHistorical: boolean
}

export const SalesPrediction: React.FC<SalesPredictionProps> = ({
  orders,
  predictionDays = 30,
}) => {
  const predictionData = useMemo(() => {
    // 日付別の売上を集計
    const salesByDate = new Map<string, number>()

    orders.forEach((order) => {
      const date = order.受注日.split(' ')[0]
      const current = salesByDate.get(date) || 0
      salesByDate.set(date, current + order.小計)
    })

    // 日付をソート
    const sortedDates = Array.from(salesByDate.keys()).sort()

    if (sortedDates.length < 7) {
      return { data: [], metrics: null, hasEnoughData: false }
    }

    // 過去のデータを配列に変換
    const historicalData: PredictionData[] = sortedDates.map((date) => ({
      date,
      actual: salesByDate.get(date) || 0,
      isHistorical: true,
    }))

    // トレンド分析（単純な線形回帰）
    const n = historicalData.length
    const xValues = Array.from({ length: n }, (_, i) => i)
    const yValues = historicalData.map((d) => d.actual || 0)

    const sumX = xValues.reduce((a, b) => a + b, 0)
    const sumY = yValues.reduce((a, b) => a + b, 0)
    const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0)
    const sumX2 = xValues.reduce((sum, x) => sum + x * x, 0)

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
    const intercept = (sumY - slope * sumX) / n

    // 予測値を生成
    const lastDate = new Date(sortedDates[sortedDates.length - 1])
    const predictions: PredictionData[] = []

    for (let i = 1; i <= predictionDays; i++) {
      const futureDate = new Date(lastDate)
      futureDate.setDate(futureDate.getDate() + i)

      const x = n + i - 1
      const predicted = slope * x + intercept

      // 信頼区間を計算（簡易版）
      const standardError = Math.sqrt(
        yValues.reduce((sum, y, idx) => {
          const predictedY = slope * idx + intercept
          return sum + Math.pow(y - predictedY, 2)
        }, 0) /
          (n - 2)
      )

      const confidenceInterval = standardError * 1.96 // 95%信頼区間

      predictions.push({
        date: futureDate.toISOString().split('T')[0],
        predicted: Math.max(0, predicted),
        upperBound: Math.max(0, predicted + confidenceInterval),
        lowerBound: Math.max(0, predicted - confidenceInterval),
        isHistorical: false,
      })
    }

    // 週次/月次の成長率を計算
    const weeklyGrowth = calculateGrowthRate(historicalData, 7)
    const monthlyGrowth = calculateGrowthRate(historicalData, 30)

    // 予測精度指標
    const avgSales = yValues.reduce((a, b) => a + b, 0) / n
    const variance = yValues.reduce((sum, y) => sum + Math.pow(y - avgSales, 2), 0) / n
    const volatility = Math.sqrt(variance) / avgSales

    return {
      data: [...historicalData, ...predictions],
      metrics: {
        weeklyGrowth,
        monthlyGrowth,
        volatility,
        avgDailySales: avgSales,
        trend: slope > 0 ? 'up' : slope < 0 ? 'down' : 'stable',
      },
      hasEnoughData: true,
    }
  }, [orders, predictionDays])

  function calculateGrowthRate(data: PredictionData[], days: number): number {
    if (data.length < days * 2) return 0

    const recentSum = data.slice(-days).reduce((sum, d) => sum + (d.actual || 0), 0)
    const previousSum = data.slice(-days * 2, -days).reduce((sum, d) => sum + (d.actual || 0), 0)

    return previousSum > 0 ? ((recentSum - previousSum) / previousSum) * 100 : 0
  }

  const formatYAxis = (value: number) => {
    if (value >= 1000000) {
      return `¥${(value / 1000000).toFixed(1)}M`
    } else if (value >= 1000) {
      return `¥${(value / 1000).toFixed(0)}K`
    }
    return `¥${value}`
  }

  if (!predictionData.hasEnoughData) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <p className="text-gray-600">予測分析には最低7日分のデータが必要です</p>
          </div>
        </div>
      </div>
    )
  }

  const { data, metrics } = predictionData

  return (
    <div className="space-y-6">
      {/* 予測グラフ */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              売上予測（{predictionDays}日間）
            </h3>
            <p className="text-sm text-gray-600 mt-1">過去のトレンドに基づく予測値と95%信頼区間</p>
          </div>
          <div className="flex items-center text-sm text-gray-500">
            <Info className="h-4 w-4 mr-1" />
            線形回帰モデル
          </div>
        </div>

        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={(value) => {
                  const date = new Date(value)
                  return `${date.getMonth() + 1}/${date.getDate()}`
                }}
              />
              <YAxis tickFormatter={formatYAxis} />
              <Tooltip
                formatter={(value: any) => `¥${value.toLocaleString()}`}
                labelFormatter={(label) => `日付: ${label}`}
              />
              <Legend />

              {/* 実績値 */}
              <Line
                type="monotone"
                dataKey="actual"
                stroke="#4F46E5"
                strokeWidth={2}
                dot={{ r: 3 }}
                name="実績"
              />

              {/* 予測値 */}
              <Line
                type="monotone"
                dataKey="predicted"
                stroke="#10B981"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ r: 3 }}
                name="予測"
              />

              {/* 信頼区間上限 */}
              <Line
                type="monotone"
                dataKey="upperBound"
                stroke="#10B981"
                strokeWidth={1}
                strokeDasharray="3 3"
                dot={false}
                name="上限（95%）"
                opacity={0.5}
              />

              {/* 信頼区間下限 */}
              <Line
                type="monotone"
                dataKey="lowerBound"
                stroke="#10B981"
                strokeWidth={1}
                strokeDasharray="3 3"
                dot={false}
                name="下限（95%）"
                opacity={0.5}
              />

              {/* 現在日の参照線 */}
              <ReferenceLine
                x={data.find((d) => !d.isHistorical)?.date}
                stroke="#EF4444"
                strokeDasharray="5 5"
                label="現在"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 予測メトリクス */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">週間成長率</p>
              <p
                className={`text-2xl font-semibold mt-1 ${
                  (metrics?.weeklyGrowth ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {(metrics?.weeklyGrowth ?? 0) >= 0 ? '+' : ''}
                {(metrics?.weeklyGrowth ?? 0).toFixed(1)}%
              </p>
            </div>
            <TrendingUp
              className={`h-8 w-8 ${
                (metrics?.weeklyGrowth ?? 0) >= 0 ? 'text-green-500' : 'text-red-500'
              }`}
            />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">月間成長率</p>
              <p
                className={`text-2xl font-semibold mt-1 ${
                  (metrics?.monthlyGrowth ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {(metrics?.monthlyGrowth ?? 0) >= 0 ? '+' : ''}
                {(metrics?.monthlyGrowth ?? 0).toFixed(1)}%
              </p>
            </div>
            <TrendingUp
              className={`h-8 w-8 ${
                (metrics?.monthlyGrowth ?? 0) >= 0 ? 'text-green-500' : 'text-red-500'
              }`}
            />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div>
            <p className="text-sm font-medium text-gray-600">平均日次売上</p>
            <p className="text-2xl font-semibold text-gray-900 mt-1">
              ¥{Math.round(metrics?.avgDailySales || 0).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div>
            <p className="text-sm font-medium text-gray-600">ボラティリティ</p>
            <p className="text-2xl font-semibold text-gray-900 mt-1">
              {((metrics?.volatility || 0) * 100).toFixed(1)}%
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {(metrics?.volatility ?? 0) < 0.2
                ? '安定'
                : (metrics?.volatility ?? 0) < 0.5
                  ? '中程度'
                  : '高変動'}
            </p>
          </div>
        </div>
      </div>

      {/* 予測サマリー */}
      <div className="bg-blue-50 rounded-lg p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-2">予測サマリー</h4>
        <div className="space-y-2 text-sm text-gray-700">
          <p>
            • 売上トレンド:
            <span
              className={`font-medium ml-1 ${
                metrics?.trend === 'up'
                  ? 'text-green-600'
                  : metrics?.trend === 'down'
                    ? 'text-red-600'
                    : 'text-gray-600'
              }`}
            >
              {metrics?.trend === 'up'
                ? '上昇傾向'
                : metrics?.trend === 'down'
                  ? '下降傾向'
                  : '横ばい'}
            </span>
          </p>
          <p>
            • 予測期間の推定売上:
            <span className="font-medium">
              ¥
              {Math.round(
                data.filter((d) => !d.isHistorical).reduce((sum, d) => sum + (d.predicted || 0), 0)
              ).toLocaleString()}
            </span>
          </p>
          <p>
            • 予測の信頼性:
            <span className="font-medium">
              {(metrics?.volatility ?? 0) < 0.3
                ? '高'
                : (metrics?.volatility ?? 0) < 0.6
                  ? '中'
                  : '低'}
            </span>
          </p>
        </div>
      </div>
    </div>
  )
}
