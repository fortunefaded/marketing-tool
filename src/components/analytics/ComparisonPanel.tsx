import React, { useMemo } from 'react'
import {
  ArrowUpIcon,
  ArrowDownIcon,
  ChartBarIcon,
  DocumentArrowDownIcon,
} from '@heroicons/react/24/outline'

interface ComparisonMetrics {
  spend: number
  revenue: number
  impressions: number
  clicks: number
  conversions: number
  ctr: number
  cpc: number
  cpa: number
  roas: number
}

interface ComparisonData {
  current: {
    period: string
    metrics: ComparisonMetrics
  }
  previous: {
    period: string
    metrics: ComparisonMetrics
  }
}

interface ComparisonPanelProps {
  data?: ComparisonData | null
  selectedMetrics?: string[]
  onPeriodChange?: (period: string) => void
  onMetricsChange?: (metrics: string[]) => void
  onExport?: (params: { data: ComparisonData; format: string }) => void
  isLoading?: boolean
  className?: string
}

const METRIC_CONFIG = {
  spend: { label: '広告費用', format: 'currency', inverse: true },
  revenue: { label: '売上', format: 'currency', inverse: false },
  impressions: { label: 'インプレッション', format: 'number', inverse: false },
  clicks: { label: 'クリック数', format: 'number', inverse: false },
  conversions: { label: 'コンバージョン', format: 'number', inverse: false },
  ctr: { label: 'CTR', format: 'percentage', inverse: false },
  cpc: { label: 'CPC', format: 'currency', inverse: true },
  cpa: { label: 'CPA', format: 'currency', inverse: true },
  roas: { label: 'ROAS', format: 'decimal', inverse: false },
}

export const ComparisonPanel: React.FC<ComparisonPanelProps> = ({
  data,
  selectedMetrics = Object.keys(METRIC_CONFIG),
  onPeriodChange,
  onMetricsChange,
  onExport,
  isLoading = false,
  className = '',
}) => {
  const calculateChange = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0
    return ((current - previous) / previous) * 100
  }

  const formatValue = (value: number, format: string): string => {
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('ja-JP', {
          style: 'currency',
          currency: 'JPY',
        }).format(value)
      case 'number':
        return new Intl.NumberFormat('ja-JP').format(value)
      case 'percentage':
        return `${value.toFixed(2)}%`
      case 'decimal':
        return value.toFixed(2)
      default:
        return value.toString()
    }
  }

  const getChangeIndicator = (change: number, inverse: boolean) => {
    const isPositive = change > 0
    const isImprovement = inverse ? !isPositive : isPositive
    
    return {
      icon: isPositive ? ArrowUpIcon : ArrowDownIcon,
      color: isImprovement ? 'text-green-600' : 'text-red-600',
      bgColor: isImprovement ? 'bg-green-100' : 'bg-red-100',
    }
  }

  const metricRows = useMemo(() => {
    if (!data) return []

    return selectedMetrics.map((metricKey) => {
      const config = METRIC_CONFIG[metricKey as keyof typeof METRIC_CONFIG]
      const current = data.current.metrics[metricKey as keyof ComparisonMetrics]
      const previous = data.previous.metrics[metricKey as keyof ComparisonMetrics]
      const change = calculateChange(current, previous)
      const indicator = getChangeIndicator(change, config.inverse)

      return {
        key: metricKey,
        label: config.label,
        current: formatValue(current, config.format),
        previous: formatValue(previous, config.format),
        change: Math.abs(change),
        changeFormatted: `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`,
        indicator,
      }
    })
  }, [data, selectedMetrics])

  if (isLoading) {
    return (
      <div className={`bg-white shadow rounded-lg p-6 ${className}`} data-testid="comparison-skeleton">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 bg-gray-100 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className={`bg-white shadow rounded-lg p-6 ${className}`}>
        <div className="text-center text-gray-500">
          <ChartBarIcon className="h-12 w-12 mx-auto mb-2 text-gray-400" />
          <p>比較データがありません</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white shadow rounded-lg ${className}`}>
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">パフォーマンス比較</h3>
          <div className="flex items-center space-x-4">
            {onPeriodChange && (
              <select
                aria-label="比較期間"
                className="block rounded-md border-gray-300 py-1.5 pr-10 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                onChange={(e) => onPeriodChange(e.target.value)}
              >
                <option value="month-over-month">前月比</option>
                <option value="year-over-year">前年同期比</option>
                <option value="quarter-over-quarter">前四半期比</option>
              </select>
            )}
            {onExport && (
              <button
                onClick={() => onExport({ data, format: 'csv' })}
                className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <DocumentArrowDownIcon className="h-4 w-4 mr-1" />
                エクスポート
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="px-6 py-4">
        <div className="flex justify-between mb-4 text-sm text-gray-600">
          <span>{data.current.period}</span>
          <span>vs {data.previous.period}</span>
        </div>

        <div className="space-y-3">
          {metricRows.map((row) => (
            <div
              key={row.key}
              className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-gray-900">{row.label}</h4>
                <div
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${row.indicator.bgColor} ${row.indicator.color}`}
                  data-testid={`${row.key}-improvement`}
                >
                  <row.indicator.icon className="h-3 w-3 mr-0.5" />
                  {row.changeFormatted}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">現在: </span>
                  <span className="font-semibold text-gray-900">{row.current}</span>
                </div>
                <div>
                  <span className="text-gray-500">前期: </span>
                  <span className="text-gray-700">{row.previous}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}