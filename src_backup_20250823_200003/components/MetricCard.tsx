export interface MetricData {
  label: string
  value: string | number
  subValue?: string
  trend?: 'up' | 'down' | 'neutral'
  unit?: string
  format?: 'number' | 'currency' | 'percentage'
  status?: 'good' | 'normal' | 'bad' | 'over'
  comparison?: {
    value: number
    period: string
  }
  progressBar?: {
    value: number
    max: number
    label?: string
  }
}

interface MetricCardProps {
  data: MetricData
  onClick?: () => void
  isLoading?: boolean
  error?: string
}

export default function MetricCard({ data, onClick, isLoading, error }: MetricCardProps) {
  const formatValue = (value: string | number) => {
    if (typeof value === 'string') return value

    switch (data.format) {
      case 'currency':
        return value.toLocaleString('ja-JP')
      case 'percentage':
        return `${value}`
      default:
        return value.toLocaleString('ja-JP')
    }
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-200 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-24 mb-3"></div>
        <div className="h-8 bg-gray-200 rounded w-32 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-20"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg p-5 shadow-sm border border-red-200">
        <p className="text-red-600 text-sm">{error}</p>
      </div>
    )
  }

  const getSubValueStyle = () => {
    if (!data.comparison) return ''

    if (data.comparison.value > 0) {
      return 'text-gray-500'
    } else if (data.comparison.value < 0) {
      return 'text-gray-500'
    }
    return 'text-gray-500'
  }

  const getStatusBadge = () => {
    if (data.status === 'bad' && data.progressBar) {
      return (
        <div className="absolute bottom-2 right-2 bg-orange-500 text-white text-xs px-2 py-1 rounded flex items-center space-x-1">
          <span className="text-base font-bold">😱</span>
          <span>BAD</span>
        </div>
      )
    }
    return null
  }

  return (
    <div
      className={`relative bg-white rounded-lg p-5 shadow-sm border border-gray-200 hover:shadow-md transition-shadow ${
        onClick ? 'cursor-pointer' : ''
      }`}
      onClick={onClick}
    >
      <div className="mb-3">
        <p className="text-sm text-gray-600">{data.label}</p>
      </div>

      <div className="mb-3">
        <h3 className="text-2xl font-bold text-gray-900">
          {data.format === 'currency' && '¥'}
          {formatValue(data.value)}
          {data.unit && <span className="text-base font-normal ml-1">{data.unit}</span>}
        </h3>

        {data.comparison && (
          <p className={`text-sm mt-1 ${getSubValueStyle()}`}>
            {data.comparison.period}：{data.comparison.value > 0 ? '+' : ''}
            {data.comparison.value}%
          </p>
        )}
      </div>

      {data.progressBar && (
        <div className="mt-4">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-gray-500">{data.progressBar.label || '対目標'}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                data.status === 'bad' ? 'bg-orange-500' : 'bg-gray-400'
              }`}
              style={{
                width: `${Math.min((data.progressBar.value / data.progressBar.max) * 100, 100)}%`,
              }}
            />
          </div>
        </div>
      )}

      {getStatusBadge()}
    </div>
  )
}
