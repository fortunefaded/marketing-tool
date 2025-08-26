import React, { useMemo } from 'react'
import { MetaInsightsData, ECForceOrder } from '@/types'
import { ECForceSalesData } from '@/types'
import { KPIAggregator } from '../../services/kpiAggregator'
import { logger } from '../../utils/logger'
import {
  CurrencyYenIcon,
  ChartBarIcon,
  ShoppingCartIcon,
  ArrowTrendingUpIcon,
  UserGroupIcon,
  BanknotesIcon,
  BuildingStorefrontIcon,
  GlobeAltIcon,
} from '@heroicons/react/24/outline'

interface KPIDashboardProps {
  insights: MetaInsightsData[]
  ecforceOrders?: ECForceOrder[]
  ecforceSales?: ECForceSalesData[]
  conversionValue?: number // 1コンバージョンあたりの売上
  dateRange?: { start: string; end: string }
  showComparison?: boolean
}

interface KPIMetrics {
  totalSpend: number
  totalImpressions: number
  totalClicks: number
  totalReach: number
  totalConversions: number
  totalRevenue: number
  ctr: number
  cpc: number
  cpm: number
  cpa: number
  roas: number
  frequency: number
}

export const KPIDashboard: React.FC<KPIDashboardProps> = ({
  insights,
  ecforceOrders = [],
  ecforceSales,
  conversionValue = 10000, // デフォルト: 1CV = 10,000円
  dateRange,
  showComparison = false,
}) => {
  const kpiAggregator = useMemo(() => new KPIAggregator(), [])

  // デバッグ情報
  logger.debug('KPIDashboard received:', {
    insights: insights.length,
    ecforceOrders: ecforceOrders.length,
    hasECForceData: ecforceOrders.length > 0 || (ecforceSales && ecforceSales.length > 0),
  })

  // 統合KPIを計算
  const unifiedKPIs = useMemo(() => {
    const options = {
      dateRange: dateRange || {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0],
      },
      previousPeriodComparison: showComparison,
    }

    return kpiAggregator.calculateUnifiedKPIs(insights, ecforceOrders, ecforceSales, options)
  }, [insights, ecforceOrders, ecforceSales, dateRange, showComparison, kpiAggregator])

  // 従来のMetaのみのKPIも計算（後方互換性のため）
  const calculateKPIs = (): KPIMetrics => {
    const metrics = insights.reduce(
      (acc, insight) => {
        acc.totalSpend += Number(insight.spend || 0)
        acc.totalImpressions += Number(insight.impressions || 0)
        acc.totalClicks += Number(insight.clicks || 0)
        acc.totalReach += Number(insight.reach || 0)
        acc.totalConversions += Number(insight.conversions || 0)
        return acc
      },
      {
        totalSpend: 0,
        totalImpressions: 0,
        totalClicks: 0,
        totalReach: 0,
        totalConversions: 0,
        totalRevenue: 0,
        ctr: 0,
        cpc: 0,
        cpm: 0,
        cpa: 0,
        roas: 0,
        frequency: 0,
      }
    )

    // 派生メトリクスを計算
    metrics.totalRevenue = metrics.totalConversions * conversionValue
    metrics.ctr =
      metrics.totalImpressions > 0 ? (metrics.totalClicks / metrics.totalImpressions) * 100 : 0
    metrics.cpc = metrics.totalClicks > 0 ? metrics.totalSpend / metrics.totalClicks : 0
    metrics.cpm =
      metrics.totalImpressions > 0 ? (metrics.totalSpend / metrics.totalImpressions) * 1000 : 0
    metrics.cpa = metrics.totalConversions > 0 ? metrics.totalSpend / metrics.totalConversions : 0
    metrics.roas = metrics.totalSpend > 0 ? (metrics.totalRevenue / metrics.totalSpend) * 100 : 0
    metrics.frequency = metrics.totalReach > 0 ? metrics.totalImpressions / metrics.totalReach : 0

    return metrics
  }

  const kpis = calculateKPIs()

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      minimumFractionDigits: 0,
    }).format(value)
  }

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('ja-JP').format(Math.round(value))
  }

  // ECForceデータがある場合は統合KPIカードを表示
  const hasECForceData = ecforceOrders.length > 0 || (ecforceSales && ecforceSales.length > 0)

  const unifiedKpiCards = hasECForceData
    ? [
        {
          title: '真のROAS',
          value: `${(unifiedKPIs.trueROAS * 100).toFixed(0)}%`,
          icon: ArrowTrendingUpIcon,
          color: unifiedKPIs.trueROAS >= 1 ? 'text-green-600' : 'text-red-600',
          bgColor: unifiedKPIs.trueROAS >= 1 ? 'bg-green-100' : 'bg-red-100',
          subtitle: `実売上 / 広告費`,
        },
        {
          title: '実売上（ECForce）',
          value: formatCurrency(unifiedKPIs.totalRevenue),
          icon: BuildingStorefrontIcon,
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          subtitle: `${unifiedKPIs.byChannel.ecforce.orders}件`,
        },
        {
          title: '総広告費',
          value: formatCurrency(unifiedKPIs.totalAdSpend),
          icon: CurrencyYenIcon,
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          subtitle: 'Meta広告',
        },
        {
          title: '真のCPA',
          value: formatCurrency(unifiedKPIs.trueCPA),
          icon: ChartBarIcon,
          color: 'text-orange-600',
          bgColor: 'bg-orange-100',
          subtitle: '広告費 / 実注文数',
        },
        {
          title: '利益率',
          value: `${(unifiedKPIs.profitMargin * 100).toFixed(1)}%`,
          icon: BanknotesIcon,
          color: unifiedKPIs.profitMargin > 0 ? 'text-green-600' : 'text-red-600',
          bgColor: unifiedKPIs.profitMargin > 0 ? 'bg-green-100' : 'bg-red-100',
          subtitle: '(売上-広告費)/売上',
        },
        {
          title: 'Meta ROAS',
          value: `${(unifiedKPIs.byChannel.meta.roas * 100).toFixed(0)}%`,
          icon: GlobeAltIcon,
          color: 'text-blue-600',
          bgColor: 'bg-blue-100',
          subtitle: 'Meta内での推定値',
        },
      ]
    : [
        // ECForceデータがない場合は従来のMetaのみのKPIカード
        {
          title: '総費用',
          value: formatCurrency(kpis.totalSpend),
          icon: CurrencyYenIcon,
          color: 'text-red-600',
          bgColor: 'bg-red-100',
        },
        {
          title: '売上（推定）',
          value: formatCurrency(kpis.totalRevenue),
          icon: BanknotesIcon,
          color: 'text-green-600',
          bgColor: 'bg-green-100',
        },
        {
          title: 'ROAS',
          value: `${kpis.roas.toFixed(0)}%`,
          icon: ArrowTrendingUpIcon,
          color: 'text-purple-600',
          bgColor: 'bg-purple-100',
          subtitle: kpis.roas >= 100 ? '利益' : '損失',
        },
        {
          title: 'コンバージョン数',
          value: formatNumber(kpis.totalConversions),
          icon: ShoppingCartIcon,
          color: 'text-blue-600',
          bgColor: 'bg-blue-100',
        },
        {
          title: 'CPA',
          value: kpis.totalConversions > 0 ? formatCurrency(kpis.cpa) : '-',
          icon: ChartBarIcon,
          color: 'text-orange-600',
          bgColor: 'bg-orange-100',
          subtitle: '獲得単価',
        },
        {
          title: 'CTR',
          value: `${kpis.ctr.toFixed(2)}%`,
          icon: UserGroupIcon,
          color: 'text-indigo-600',
          bgColor: 'bg-indigo-100',
          subtitle: 'クリック率',
        },
      ]

  return (
    <div className="space-y-6">
      {/* 統合KPIカード */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {unifiedKpiCards.map((kpi, index) => (
          <div key={index} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-2 rounded-lg ${kpi.bgColor}`}>
                <kpi.icon className={`h-6 w-6 ${kpi.color}`} />
              </div>
            </div>
            <h3 className="text-sm font-medium text-gray-500">{kpi.title}</h3>
            <p className={`text-2xl font-bold ${kpi.color} mt-1`}>{kpi.value}</p>
            {kpi.subtitle && <p className="text-xs text-gray-500 mt-1">{kpi.subtitle}</p>}
          </div>
        ))}
      </div>

      {/* 詳細メトリクス */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">詳細メトリクス</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-500">インプレッション</p>
            <p className="text-xl font-semibold">{formatNumber(kpis.totalImpressions)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">クリック数</p>
            <p className="text-xl font-semibold">{formatNumber(kpis.totalClicks)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">リーチ</p>
            <p className="text-xl font-semibold">{formatNumber(kpis.totalReach)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">フリークエンシー</p>
            <p className="text-xl font-semibold">{kpis.frequency.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">CPC</p>
            <p className="text-xl font-semibold">{formatCurrency(kpis.cpc)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">CPM</p>
            <p className="text-xl font-semibold">{formatCurrency(kpis.cpm)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">CV率</p>
            <p className="text-xl font-semibold">
              {kpis.totalClicks > 0
                ? `${((kpis.totalConversions / kpis.totalClicks) * 100).toFixed(2)}%`
                : '-'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">1CVあたり売上</p>
            <p className="text-xl font-semibold">{formatCurrency(conversionValue)}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
