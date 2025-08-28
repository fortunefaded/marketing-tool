/**
 * TimeSeriesChart.tsx
 * 時系列データを表示するチャートコンポーネント
 */

import React from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'

interface TimeSeriesDataPoint {
  date: string
  ctr: number
  cpm: number
  frequency: number
  spend: number
  impressions: number
  clicks: number
  conversions?: number
}

interface TimeSeriesChartProps {
  data: TimeSeriesDataPoint[]
  metrics: ('ctr' | 'cpm' | 'frequency' | 'spend' | 'impressions' | 'clicks' | 'conversions')[]
  title: string
  height?: number
}

const metricConfig = {
  ctr: {
    label: 'CTR (%)',
    color: '#3B82F6',
    yAxisId: 'percentage',
    formatter: (value: number) => `${(value * 100).toFixed(2)}%`
  },
  cpm: {
    label: 'CPM (¥)',
    color: '#10B981',
    yAxisId: 'currency',
    formatter: (value: number) => `¥${value.toFixed(0)}`
  },
  frequency: {
    label: 'Frequency',
    color: '#F59E0B',
    yAxisId: 'count',
    formatter: (value: number) => value.toFixed(2)
  },
  spend: {
    label: '広告費 (¥)',
    color: '#EF4444',
    yAxisId: 'currency',
    formatter: (value: number) => `¥${value.toLocaleString()}`
  },
  impressions: {
    label: 'インプレッション',
    color: '#8B5CF6',
    yAxisId: 'count',
    formatter: (value: number) => value.toLocaleString()
  },
  clicks: {
    label: 'クリック数',
    color: '#06B6D4',
    yAxisId: 'count',
    formatter: (value: number) => value.toLocaleString()
  },
  conversions: {
    label: 'コンバージョン',
    color: '#F97316',
    yAxisId: 'count',
    formatter: (value: number) => value.toLocaleString()
  }
}

export const TimeSeriesChart: React.FC<TimeSeriesChartProps> = ({
  data,
  metrics,
  title,
  height = 400
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
        <div className="text-center">
          <div className="text-gray-400 mb-2">📊</div>
          <div className="text-sm text-gray-600">時系列データがありません</div>
        </div>
      </div>
    )
  }

  // Y軸の種類を判定
  const hasPercentage = metrics.some(m => metricConfig[m].yAxisId === 'percentage')
  const hasCurrency = metrics.some(m => metricConfig[m].yAxisId === 'currency')
  const hasCount = metrics.some(m => metricConfig[m].yAxisId === 'count')

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg">
          <p className="font-medium text-gray-900 mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {metricConfig[entry.dataKey as keyof typeof metricConfig]?.formatter(entry.value) || entry.value}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className="bg-white">
      <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>
      
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis 
            dataKey="date" 
            stroke="#6B7280"
            fontSize={12}
            tickFormatter={(value) => {
              const date = new Date(value)
              return `${date.getMonth() + 1}/${date.getDate()}`
            }}
          />
          
          {/* パーセンテージ用Y軸 */}
          {hasPercentage && (
            <YAxis
              yAxisId="percentage"
              orientation="left"
              stroke="#6B7280"
              fontSize={12}
              tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
            />
          )}
          
          {/* 通貨用Y軸 */}
          {hasCurrency && (
            <YAxis
              yAxisId="currency"
              orientation={hasPercentage ? "right" : "left"}
              stroke="#6B7280"
              fontSize={12}
              tickFormatter={(value) => `¥${value.toFixed(0)}`}
            />
          )}
          
          {/* カウント用Y軸 */}
          {hasCount && !hasPercentage && !hasCurrency && (
            <YAxis
              yAxisId="count"
              orientation="left"
              stroke="#6B7280"
              fontSize={12}
              tickFormatter={(value) => value.toLocaleString()}
            />
          )}
          
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          
          {metrics.map((metric) => {
            const config = metricConfig[metric]
            return (
              <Line
                key={metric}
                type="monotone"
                dataKey={metric}
                stroke={config.color}
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
                name={config.label}
                yAxisId={config.yAxisId}
              />
            )
          })}
        </LineChart>
      </ResponsiveContainer>
      
      {/* データ期間の表示 */}
      {data.length > 0 && (
        <div className="text-xs text-gray-500 mt-2 text-center">
          期間: {data[0].date} ～ {data[data.length - 1].date} ({data.length}日間)
        </div>
      )}
    </div>
  )
}