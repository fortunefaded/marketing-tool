import React from 'react'
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/solid'

interface MetricCardProps {
  title: string
  value?: number
  format?: 'currency' | 'percentage' | 'number' | 'decimal'
  comparison?: {
    value: number
    period: string
  }
  icon?: React.ReactNode
  trend?: 'up' | 'down' | 'neutral'
  isLoading?: boolean
  error?: string
  className?: string
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  format = 'number',
  comparison,
  icon,
  trend,
  isLoading = false,
  error,
  className = '',
}) => {
  // Format the value based on the format type
  const formatValue = (val: number, fmt: string): string => {
    switch (fmt) {
      case 'currency':
        return `¥${new Intl.NumberFormat('ja-JP').format(val)}`
      case 'percentage':
        return `${val}%`
      case 'number':
        return new Intl.NumberFormat('ja-JP').format(val)
      case 'decimal':
        return val.toString()
      default:
        return val.toString()
    }
  }

  // Calculate comparison percentage
  const getComparisonPercentage = () => {
    if (!comparison || !value) return null
    const percentageChange = ((value - comparison.value) / comparison.value) * 100
    const sign = percentageChange >= 0 ? '+' : ''
    return `${sign}${percentageChange.toFixed(1)}%`
  }

  const comparisonPercentage = getComparisonPercentage()
  const isPositiveChange = comparison && value && value > comparison.value

  return (
    <div className={`bg-white rounded-lg shadow-sm p-6 ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-sm font-medium text-gray-600">{title}</h3>

          {isLoading ? (
            <div data-testid="metric-skeleton" className="mt-2">
              <div className="h-8 w-24 bg-gray-200 rounded animate-pulse"></div>
            </div>
          ) : error ? (
            <p className="mt-2 text-sm text-red-600">{error}</p>
          ) : value !== undefined ? (
            <div className="mt-2">
              <p className="text-2xl font-bold text-gray-900">{formatValue(value, format)}</p>

              {comparison && comparisonPercentage && (
                <div className="mt-2 flex items-center gap-2 text-sm">
                  <span
                    className={`font-medium ${isPositiveChange ? 'text-green-600' : 'text-red-600'}`}
                  >
                    {comparisonPercentage}
                  </span>
                  <span className="text-gray-500">{comparison.period}比</span>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {icon && <div className="ml-4 flex-shrink-0">{icon}</div>}

        {trend && !icon && (
          <div className="ml-4 flex-shrink-0">
            {trend === 'up' && (
              <ArrowUpIcon data-testid="trend-up" className="h-5 w-5 text-green-500" />
            )}
            {trend === 'down' && (
              <ArrowDownIcon data-testid="trend-down" className="h-5 w-5 text-red-500" />
            )}
            {trend === 'neutral' && (
              <div data-testid="trend-neutral" className="h-5 w-5 bg-gray-300 rounded-full" />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
