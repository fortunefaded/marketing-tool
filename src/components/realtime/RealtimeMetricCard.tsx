import React from 'react'
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/solid'

export interface RealtimeMetricCardProps {
  title: string
  value: number
  format: 'currency' | 'number' | 'percentage'
  icon: React.ReactNode
  trend?: number
  previousValue?: number
  description?: string
  isLoading?: boolean
  className?: string
}

export const RealtimeMetricCard: React.FC<RealtimeMetricCardProps> = ({
  title,
  value,
  format,
  icon,
  trend,
  previousValue,
  description,
  isLoading,
  className = ''
}) => {
  // 値のフォーマット
  const formatValue = (val: number): string => {
    switch (format) {
      case 'currency':
        return `¥${Math.round(val).toLocaleString()}`
      case 'number':
        return val.toLocaleString()
      case 'percentage':
        return `${val}%`
      default:
        return val.toString()
    }
  }

  // トレンドの計算
  const calculatedTrend = previousValue !== undefined 
    ? ((value - previousValue) / previousValue) * 100
    : trend

  const showTrend = calculatedTrend !== undefined && calculatedTrend !== 0

  return (
    <div className={`bg-gray-800 rounded-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="text-gray-400">
          {icon}
        </div>
        {showTrend && (
          <div className={`flex items-center text-sm ${
            calculatedTrend > 0 ? 'text-green-400' : 'text-red-400'
          }`}>
            {calculatedTrend > 0 ? (
              <ArrowUpIcon className="h-4 w-4 mr-1" />
            ) : (
              <ArrowDownIcon className="h-4 w-4 mr-1" />
            )}
            <span>
              {calculatedTrend > 0 ? '+' : ''}{calculatedTrend.toFixed(1)}%
            </span>
          </div>
        )}
      </div>
      
      <h3 className="text-gray-400 text-sm mb-1">{title}</h3>
      
      {isLoading ? (
        <p className="text-2xl font-bold">読み込み中...</p>
      ) : (
        <p className="text-2xl font-bold">{formatValue(value)}</p>
      )}
      
      {description && (
        <p className="text-gray-500 text-xs mt-2">{description}</p>
      )}
    </div>
  )
}