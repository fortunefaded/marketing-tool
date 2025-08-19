import React from 'react'
import {
  ArrowUpIcon,
  ArrowDownIcon,
  CurrencyYenIcon,
  ChartBarIcon,
  ShoppingCartIcon,
  CursorArrowRaysIcon,
  ArrowTrendingUpIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'
import { KPIMetrics, KPIComparison } from '../../services/kpiCalculator'

interface KPIOverviewProps {
  metrics: KPIMetrics
  comparison?: KPIComparison
  isLoading?: boolean
}

interface KPICardProps {
  title: string
  value: string | number
  change?: number
  icon: React.ReactNode
  format?: 'currency' | 'percentage' | 'number' | 'decimal'
  color?: 'blue' | 'green' | 'purple' | 'yellow' | 'red' | 'gray'
  subtitle?: string
}

const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  change,
  icon,
  format = 'number',
  color = 'blue',
  subtitle
}) => {
  // 値のフォーマット
  const formatValue = (val: string | number): string => {
    const numValue = typeof val === 'string' ? parseFloat(val) : val
    
    switch (format) {
      case 'currency':
        return `¥${numValue.toLocaleString('ja-JP', { maximumFractionDigits: 0 })}`
      case 'percentage':
        return `${numValue.toFixed(2)}%`
      case 'decimal':
        return numValue.toFixed(2)
      case 'number':
      default:
        return numValue.toLocaleString('ja-JP', { maximumFractionDigits: 0 })
    }
  }

  // 変化の表示
  const renderChange = () => {
    if (change === undefined) return null

    const isPositive = change > 0
    const changeColor = isPositive ? 'text-green-600' : 'text-red-600'
    const ChangeIcon = isPositive ? ArrowUpIcon : ArrowDownIcon

    return (
      <div className={`flex items-center text-sm ${changeColor}`}>
        <ChangeIcon className="h-4 w-4 mr-1" />
        <span>{Math.abs(change).toFixed(1)}%</span>
      </div>
    )
  }

  // カラーマッピング
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    gray: 'bg-gray-50 text-gray-700 border-gray-200'
  }

  const iconColorClasses = {
    blue: 'text-blue-500',
    green: 'text-green-500',
    purple: 'text-purple-500',
    yellow: 'text-yellow-500',
    red: 'text-red-500',
    gray: 'text-gray-500'
  }

  return (
    <div className={`rounded-lg border p-4 sm:p-6 ${colorClasses[color]} transition-all hover:shadow-md`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-2 rounded-lg bg-white ${iconColorClasses[color]}`}>
              {icon}
            </div>
            <h3 className="text-sm font-medium text-gray-700">{title}</h3>
          </div>
          
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-bold">
              {formatValue(value)}
            </p>
            
            {subtitle && (
              <p className="text-xs text-gray-600 mt-1">{subtitle}</p>
            )}
            
            {renderChange()}
          </div>
        </div>
      </div>
    </div>
  )
}

export const KPIOverview: React.FC<KPIOverviewProps> = ({
  metrics,
  comparison,
  isLoading = false
}) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-gray-200 rounded-lg h-32"></div>
        ))}
      </div>
    )
  }

  const kpiCards = [
    {
      title: '総ROAS',
      value: metrics.roas,
      change: comparison?.changes.roas,
      icon: <ArrowTrendingUpIcon className="h-6 w-6" />,
      format: 'decimal' as const,
      color: 'green' as const,
      subtitle: 'Return on Ad Spend'
    },
    {
      title: '平均CPA',
      value: metrics.cpa,
      change: comparison?.changes.cpa,
      icon: <CurrencyYenIcon className="h-6 w-6" />,
      format: 'currency' as const,
      color: 'blue' as const,
      subtitle: 'Cost Per Acquisition'
    },
    {
      title: '総コンバージョン',
      value: metrics.totalConversions,
      change: comparison?.changes.totalConversions,
      icon: <ShoppingCartIcon className="h-6 w-6" />,
      format: 'number' as const,
      color: 'purple' as const,
      subtitle: 'Total Conversions'
    },
    {
      title: '総広告費',
      value: metrics.totalSpend,
      change: comparison?.changes.totalSpend,
      icon: <ChartBarIcon className="h-6 w-6" />,
      format: 'currency' as const,
      color: 'yellow' as const,
      subtitle: 'Total Ad Spend'
    },
    {
      title: '総売上',
      value: metrics.totalRevenue,
      change: comparison?.changes.totalRevenue,
      icon: <CurrencyYenIcon className="h-6 w-6" />,
      format: 'currency' as const,
      color: 'green' as const,
      subtitle: 'Total Revenue'
    },
    {
      title: 'CTR',
      value: metrics.ctr,
      change: comparison?.changes.ctr,
      icon: <CursorArrowRaysIcon className="h-6 w-6" />,
      format: 'percentage' as const,
      color: 'blue' as const,
      subtitle: 'Click Through Rate'
    },
    {
      title: 'CVR',
      value: metrics.cvr,
      change: comparison?.changes.cvr,
      icon: <SparklesIcon className="h-6 w-6" />,
      format: 'percentage' as const,
      color: 'purple' as const,
      subtitle: 'Conversion Rate'
    },
    {
      title: '総インプレッション',
      value: metrics.totalImpressions,
      change: undefined, // インプレッションの変化率は表示しない
      icon: <ChartBarIcon className="h-6 w-6" />,
      format: 'number' as const,
      color: 'gray' as const,
      subtitle: 'Total Impressions'
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">KPIサマリー</h2>
        {comparison && (
          <p className="text-sm text-gray-500">
            前期間比較
          </p>
        )}
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((card, index) => (
          <KPICard
            key={index}
            title={card.title}
            value={card.value}
            change={card.change}
            icon={card.icon}
            format={card.format}
            color={card.color}
            subtitle={card.subtitle}
          />
        ))}
      </div>
      
      {/* パフォーマンスサマリー */}
      {comparison && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700 mb-3">パフォーマンスサマリー</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-600">最も改善:</span>
              <span className="ml-2 font-medium text-green-600">
                {getTopImprovement(comparison.changes)}
              </span>
            </div>
            <div>
              <span className="text-gray-600">要注意:</span>
              <span className="ml-2 font-medium text-red-600">
                {getWorstPerformance(comparison.changes)}
              </span>
            </div>
            <div>
              <span className="text-gray-600">効率性:</span>
              <span className="ml-2 font-medium">
                {metrics.roas >= 3 ? '良好' : metrics.roas >= 1 ? '改善余地あり' : '要改善'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ヘルパー関数
const getTopImprovement = (changes: KPIComparison['changes']): string => {
  const improvements = [
    { name: 'ROAS', value: changes.roas },
    { name: 'CTR', value: changes.ctr },
    { name: 'CVR', value: changes.cvr },
    { name: '売上', value: changes.totalRevenue }
  ].filter(item => item.value > 0)
  
  if (improvements.length === 0) return 'なし'
  
  const best = improvements.reduce((prev, current) => 
    current.value > prev.value ? current : prev
  )
  
  return `${best.name} (+${best.value.toFixed(1)}%)`
}

const getWorstPerformance = (changes: KPIComparison['changes']): string => {
  const declines = [
    { name: 'ROAS', value: changes.roas },
    { name: 'CTR', value: changes.ctr },
    { name: 'CVR', value: changes.cvr },
    { name: 'CPA', value: -changes.cpa } // CPAは低い方が良いので符号を反転
  ].filter(item => item.value < 0)
  
  if (declines.length === 0) return 'なし'
  
  const worst = declines.reduce((prev, current) => 
    current.value < prev.value ? current : prev
  )
  
  return `${worst.name} (${worst.value.toFixed(1)}%)`
}