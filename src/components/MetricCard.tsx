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
}

interface MetricCardProps {
  data: MetricData
  onClick?: () => void
  isLoading?: boolean
  error?: string
}

export default function MetricCard({ data, onClick, isLoading, error }: MetricCardProps) {
  const getTrendIcon = () => {
    if (!data.trend) return null

    switch (data.trend) {
      case 'up':
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 10l7-7m0 0l7 7m-7-7v18"
            />
          </svg>
        )
      case 'down':
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
        )
      default:
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
          </svg>
        )
    }
  }

  const getTrendColor = () => {
    if (!data.trend) return 'text-gray-500'

    switch (data.trend) {
      case 'up':
        return 'text-green-600'
      case 'down':
        return 'text-red-600'
      default:
        return 'text-gray-500'
    }
  }

  const formatValue = (value: string | number) => {
    if (typeof value === 'string') return value

    switch (data.format) {
      case 'currency':
        return `¥${value.toLocaleString('ja-JP')}`
      case 'percentage':
        return `${value}%`
      default:
        return value.toLocaleString('ja-JP')
    }
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-24 mb-3"></div>
        <div className="h-8 bg-gray-200 rounded w-32 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-20"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-sm border border-red-200">
        <p className="text-red-600 text-sm">{error}</p>
      </div>
    )
  }

  const getStatusStyle = () => {
    switch (data.status) {
      case 'good':
        return {
          text: 'GOOD',
          bgColor: 'bg-green-50',
          textColor: 'text-green-600',
          badgeColor: 'bg-green-500',
        }
      case 'normal':
        return {
          text: 'NORMAL',
          bgColor: 'bg-blue-50',
          textColor: 'text-blue-600',
          badgeColor: 'bg-blue-500',
        }
      case 'bad':
        return {
          text: 'BAD',
          bgColor: 'bg-red-50',
          textColor: 'text-red-600',
          badgeColor: 'bg-red-500',
        }
      case 'over':
        return {
          text: 'OVER',
          bgColor: 'bg-orange-50',
          textColor: 'text-orange-600',
          badgeColor: 'bg-orange-500',
        }
      default:
        return {
          text: '',
          bgColor: 'bg-white',
          textColor: 'text-gray-900',
          badgeColor: 'bg-gray-500',
        }
    }
  }

  const statusStyle = getStatusStyle()

  return (
    <div
      className={`relative ${statusStyle.bgColor} rounded-lg p-4 border border-gray-200 transition-all hover:shadow-sm ${
        onClick ? 'cursor-pointer' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs text-gray-600">{data.label}</p>
        <div className="flex items-center space-x-2">
          {data.trend && <span className={getTrendColor()}>{getTrendIcon()}</span>}
          {statusStyle.text && (
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded text-white ${statusStyle.badgeColor} font-semibold`}
            >
              {statusStyle.text}
            </span>
          )}
        </div>
      </div>

      <div>
        <h3 className={`text-xl font-bold ${statusStyle.textColor}`}>
          {formatValue(data.value)}
          {data.unit && <span className="text-sm font-normal ml-0.5">{data.unit}</span>}
        </h3>
        {data.subValue && <p className="text-xs text-gray-500 mt-0.5">{data.subValue}</p>}
      </div>

      <div className="mt-3">
        <div className="text-[10px] text-gray-400 mb-1">対目標</div>
        <div className="w-full bg-gray-200 rounded h-1">
          <div
            className={`h-1 rounded transition-all duration-300 ${statusStyle.badgeColor}`}
            style={{ width: '75%' }}
          />
        </div>
      </div>
    </div>
  )
}
