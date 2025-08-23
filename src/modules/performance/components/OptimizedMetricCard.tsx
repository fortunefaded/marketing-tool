import React, { memo } from 'react'
import { TrendingUpIcon, TrendingDownIcon } from '@heroicons/react/24/outline'

interface MetricCardProps {
  title: string
  value: number | string
  previousValue?: number
  format?: 'currency' | 'number' | 'percentage'
  icon?: React.ReactNode
}

// React.memoで再レンダリング防止
export const OptimizedMetricCard = memo<MetricCardProps>(({ 
  title, 
  value, 
  previousValue, 
  format = 'number',
  icon 
}) => {
  // 値のフォーマット（メモ化不要、軽い計算）
  const formattedValue = (() => {
    if (typeof value !== 'number') return value
    
    switch (format) {
      case 'currency':
        return `¥${value.toLocaleString()}`
      case 'percentage':
        return `${value.toFixed(2)}%`
      default:
        return value.toLocaleString()
    }
  })()

  // 変化率の計算（前の値がある場合のみ）
  const changeRate = previousValue && typeof value === 'number'
    ? ((value - previousValue) / previousValue) * 100
    : null

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{formattedValue}</p>
          
          {changeRate !== null && (
            <div className={`flex items-center mt-2 text-sm ${
              changeRate > 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {changeRate > 0 ? (
                <TrendingUpIcon className="h-4 w-4 mr-1" />
              ) : (
                <TrendingDownIcon className="h-4 w-4 mr-1" />
              )}
              <span>{Math.abs(changeRate).toFixed(1)}%</span>
            </div>
          )}
        </div>
        
        {icon && (
          <div className="ml-4 p-3 bg-gray-100 rounded-full">
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}, (prevProps, nextProps) => {
  // カスタム比較関数で再レンダリングを最小化
  return (
    prevProps.title === nextProps.title &&
    prevProps.value === nextProps.value &&
    prevProps.previousValue === nextProps.previousValue &&
    prevProps.format === nextProps.format
  )
})