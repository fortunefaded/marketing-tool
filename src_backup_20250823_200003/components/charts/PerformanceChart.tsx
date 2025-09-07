import React, { useState } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'

interface ChartDataPoint {
  date: string
  impressions?: number
  clicks?: number
  conversions?: number
  cost?: number
  revenue?: number
  previousImpressions?: number
  previousClicks?: number
  previousConversions?: number
  previousCost?: number
  previousRevenue?: number
  [key: string]: number | string | undefined
}

type MetricType = 'impressions' | 'clicks' | 'conversions' | 'cost' | 'revenue' | 'roas' | 'orders'

interface PerformanceChartProps {
  data: ChartDataPoint[]
  metrics?: MetricType[]
  title?: string
  height?: number
  showMetricSelector?: boolean
  onMetricsChange?: (metrics: MetricType[]) => void
  showComparison?: boolean
  isLoading?: boolean
  error?: string
  className?: string
}

const metricConfig = {
  impressions: {
    label: 'インプレッション',
    color: '#3B82F6',
    yAxisId: 'left',
  },
  clicks: {
    label: 'クリック',
    color: '#10B981',
    yAxisId: 'left',
  },
  conversions: {
    label: 'コンバージョン',
    color: '#F59E0B',
    yAxisId: 'right',
  },
  cost: {
    label: '広告費',
    color: '#EF4444',
    yAxisId: 'right',
  },
  revenue: {
    label: '売上',
    color: '#8B5CF6',
    yAxisId: 'right',
  },
  roas: {
    label: 'ROAS',
    color: '#06B6D4',
    yAxisId: 'right',
  },
  orders: {
    label: '注文数',
    color: '#EC4899',
    yAxisId: 'left',
  },
}

export const PerformanceChart: React.FC<PerformanceChartProps> = ({
  data,
  metrics = ['impressions', 'clicks', 'conversions'],
  title,
  height = 400,
  showMetricSelector = false,
  onMetricsChange,
  showComparison = false,
  isLoading = false,
  error,
  className = '',
}) => {
  const [selectedMetrics, setSelectedMetrics] = useState<Set<MetricType>>(new Set(metrics))

  const handleMetricToggle = (metric: MetricType) => {
    const newMetrics = new Set(selectedMetrics)
    if (newMetrics.has(metric)) {
      newMetrics.delete(metric)
    } else {
      newMetrics.add(metric)
    }
    setSelectedMetrics(newMetrics)
    onMetricsChange?.(Array.from(newMetrics))
  }

  const formatNumber = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`
    }
    return value.toString()
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return `${date.getMonth() + 1}/${date.getDate()}`
  }

  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm p-6 ${className}`}>
        <div data-testid="chart-skeleton" className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="h-96 bg-gray-100 rounded"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow-sm p-6 ${className}`}>
        <div className="text-center text-red-600">{error}</div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow-sm p-6 ${className}`}>
        <div className="text-center text-gray-500">データがありません</div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm p-6 ${className}`}>
      {(title || showMetricSelector) && (
        <div className="mb-4 flex items-center justify-between">
          {title && <h2 className="text-lg font-semibold text-gray-900">{title}</h2>}

          {showMetricSelector && (
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">表示する指標</span>
              <div className="flex gap-3">
                {(Object.keys(metricConfig) as MetricType[]).map((metric) => (
                  <label key={metric} className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedMetrics.has(metric)}
                      onChange={() => handleMetricToggle(metric)}
                      className="h-4 w-4 text-blue-600 rounded border-gray-300"
                      aria-label={metricConfig[metric].label}
                    />
                    <span className="text-sm text-gray-700">{metricConfig[metric].label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis dataKey="date" tickFormatter={formatDate} stroke="#6B7280" />
          <YAxis yAxisId="left" tickFormatter={formatNumber} stroke="#6B7280" />
          <YAxis
            yAxisId="right"
            orientation="right"
            tickFormatter={formatNumber}
            stroke="#6B7280"
          />
          <Tooltip
            formatter={(value: number) => formatNumber(value)}
            labelFormatter={(label) => `日付: ${label}`}
          />
          <Legend />

          {Array.from(selectedMetrics).map((metric) => (
            <Line
              key={metric}
              type="monotone"
              dataKey={metric}
              stroke={metricConfig[metric].color}
              name={metricConfig[metric].label}
              yAxisId={metricConfig[metric].yAxisId}
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          ))}

          {showComparison &&
            Array.from(selectedMetrics).map((metric) => {
              const previousKey =
                `previous${metric.charAt(0).toUpperCase() + metric.slice(1)}` as keyof ChartDataPoint
              if (data[0] && previousKey in data[0]) {
                return (
                  <Line
                    key={previousKey}
                    type="monotone"
                    dataKey={previousKey}
                    stroke={metricConfig[metric].color}
                    name={`${metricConfig[metric].label}（前期間）`}
                    yAxisId={metricConfig[metric].yAxisId}
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    opacity={0.5}
                    dot={false}
                  />
                )
              }
              return null
            })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
