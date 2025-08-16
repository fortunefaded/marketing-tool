import React from 'react'
import {
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  MinusIcon,
} from '@heroicons/react/24/outline'
import { useRealtimeMetric } from '../../hooks/useRealtimeUpdates'

interface RealtimeMetricCardProps {
  title: string
  metricType: 'spend' | 'revenue' | 'impressions' | 'conversions'
  campaignId?: string
  icon?: React.ReactNode
  className?: string
  showTrend?: boolean
}

export const RealtimeMetricCard: React.FC<RealtimeMetricCardProps> = ({
  title,
  metricType,
  campaignId,
  icon,
  className = '',
  showTrend = true,
}) => {
  const { value, trend, formattedValue } = useRealtimeMetric(
    metricType,
    campaignId
  )

  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <ArrowTrendingUpIcon className="h-4 w-4 text-green-600" />
      case 'down':
        return <ArrowTrendingDownIcon className="h-4 w-4 text-red-600" />
      default:
        return <MinusIcon className="h-4 w-4 text-gray-400" />
    }
  }

  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return 'text-green-600'
      case 'down':
        return 'text-red-600'
      default:
        return 'text-gray-500'
    }
  }

  return (
    <div
      className={`bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow ${className}`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          {icon && <div className="mr-3">{icon}</div>}
          <h3 className="text-sm font-medium text-gray-900">{title}</h3>
        </div>
        {showTrend && (
          <div className="flex items-center space-x-1">
            {getTrendIcon()}
            <span className={`text-xs ${getTrendColor()}`}>
              {trend === 'up' ? '上昇' : trend === 'down' ? '下降' : '横ばい'}
            </span>
          </div>
        )}
      </div>

      <div className="mt-2">
        <p className={`text-2xl font-bold ${getTrendColor()}`}>
          {formattedValue}
        </p>
      </div>

      {/* Real-time indicator */}
      <div className="mt-4 flex items-center">
        <div className="relative mr-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
        </div>
        <span className="text-xs text-gray-500">リアルタイム更新中</span>
      </div>
    </div>
  )
}