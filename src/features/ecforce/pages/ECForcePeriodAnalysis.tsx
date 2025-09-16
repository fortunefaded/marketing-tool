import React, { useState, useMemo } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import { ECForceLayout } from '../components/ECForceLayout'
import { DateRangePicker } from '@/components/DateRangePicker'
import {
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import 'react-datepicker/dist/react-datepicker.css'

type Granularity = 'daily' | 'weekly' | 'monthly'

export const ECForcePeriodAnalysis: React.FC = () => {
  // 期間設定（Date型で管理）
  const [period1Start, setPeriod1Start] = useState<Date | null>(null)
  const [period1End, setPeriod1End] = useState<Date | null>(null)
  const [selectedAdvertiser] = useState<string>('')

  // プリセット期間
  const presetPeriods = [
    { label: '今日', value: 'today' },
    { label: '昨日', value: 'yesterday' },
    { label: '過去7日間', value: 'last7days' },
    { label: '過去30日間', value: 'last30days' },
    { label: '今月', value: 'thisMonth' },
    { label: '先月', value: 'lastMonth' },
    { label: '過去3ヶ月', value: 'last3months' },
    { label: '今年', value: 'thisYear' },
  ]

  // プリセット期間を適用
  const applyPresetPeriod = (preset: string) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    let start: Date, end: Date

    switch (preset) {
      case 'today':
        start = new Date(today)
        end = new Date(today)
        break
      case 'yesterday':
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)
        start = new Date(yesterday)
        end = new Date(yesterday)
        break
      case 'last7days':
        end = new Date(today)
        start = new Date(today)
        start.setDate(start.getDate() - 6)
        break
      case 'last30days':
        end = new Date(today)
        start = new Date(today)
        start.setDate(start.getDate() - 29)
        break
      case 'thisMonth':
        start = new Date(today.getFullYear(), today.getMonth(), 1)
        end = new Date(today.getFullYear(), today.getMonth() + 1, 0)
        break
      case 'lastMonth':
        start = new Date(today.getFullYear(), today.getMonth() - 1, 1)
        end = new Date(today.getFullYear(), today.getMonth(), 0)
        break
      case 'last3months':
        end = new Date(today)
        start = new Date(today)
        start.setMonth(start.getMonth() - 3)
        break
      case 'thisYear':
        start = new Date(today.getFullYear(), 0, 1)
        end = new Date(today.getFullYear(), 11, 31)
        break
      default:
        return
    }

    setPeriod1Start(start)
    setPeriod1End(end)
  }

  // 日付フォーマット関数
  const formatDateToISO = (date: Date | null) => {
    if (!date) return ''
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // グラフ種別
  const [chartType, setChartType] = useState<'line' | 'bar'>('line')
  const [granularity, setGranularity] = useState<Granularity>('daily')
  const [autoCompare] = useState(false)

  // メトリクスのカテゴリ分け
  const metricCategories = {
    amount: {
      title: '金額',
      metrics: [
        { value: 'salesAmount', label: '売上金額', format: 'currency', color: '#3B82F6' },
        { value: 'orderAmount', label: '受注金額', format: 'currency', color: '#8B5CF6' },
      ]
    },
    conversion: {
      title: 'CV・アクセス',
      metrics: [
        { value: 'accessCount', label: 'アクセス数', format: 'number', color: '#10B981' },
        { value: 'cvOrder', label: 'CV(受注)', format: 'number', color: '#F59E0B' },
        { value: 'cvPayment', label: 'CV(決済)', format: 'number', color: '#EF4444' },
        { value: 'cvThanksUpsell', label: 'CV(サンクスアップセル)', format: 'number', color: '#6366F1' },
      ]
    },
    rate: {
      title: 'CVR',
      metrics: [
        { value: 'cvrOrder', label: 'CVR(受注)', format: 'percent', color: '#EC4899' },
        { value: 'cvrPayment', label: 'CVR(決済)', format: 'percent', color: '#14B8A6' },
      ]
    }
  }

  // 各カテゴリの選択された指標
  const [selectedAmountMetrics, setSelectedAmountMetrics] = useState<string[]>(['salesAmount'])
  const [selectedConversionMetrics, setSelectedConversionMetrics] = useState<string[]>(['cvOrder'])
  const [selectedRateMetrics, setSelectedRateMetrics] = useState<string[]>(['cvrOrder'])

  // データ取得（最適化版：月次集計テーブル使用、ページング処理）
  const trendData = useQuery(
    api.ecforceTrendOptimized.getTrendDataOptimized,
    period1Start && period1End
      ? {
          startDate: formatDateToISO(period1Start),
          endDate: formatDateToISO(period1End),
          advertiser: selectedAdvertiser || undefined,
          granularity,
        }
      : 'skip'
  )

  // データ存在確認（軽量版）
  const dataAvailability = useQuery(
    api.ecforceTrendOptimized.checkDataAvailability,
    period1Start && period1End
      ? {
          startDate: formatDateToISO(period1Start),
          endDate: formatDateToISO(period1End),
        }
      : 'skip'
  )

  // KPIサマリー取得
  const kpiSummary = useQuery(
    api.ecforcePeriodAnalysis.getKPISummary,
    period1Start && period1End
      ? {
          startDate: formatDateToISO(period1Start),
          endDate: formatDateToISO(period1End),
          advertiser: selectedAdvertiser || undefined,
          compareWithPrevious: autoCompare,
        }
      : 'skip'
  )


  // KPIカードコンポーネント
  const KPICard = ({ title, value, change, format }: any) => {
    const formatValue = (val: number, fmt: string) => {
      switch (fmt) {
        case 'currency':
          return `¥${val.toLocaleString('ja-JP')}`
        case 'percent':
          return `${(val * 100).toFixed(2)}%`
        case 'decimal':
          return val.toFixed(2)
        default:
          return val.toLocaleString('ja-JP')
      }
    }

    const isPositive = change > 0
    const isNegative = change < 0

    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{formatValue(value, format)}</p>
          </div>
          {change !== undefined && (
            <div className={`flex items-center ${isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-gray-600'}`}>
              {isPositive ? (
                <ArrowTrendingUpIcon className="h-5 w-5" />
              ) : isNegative ? (
                <ArrowTrendingDownIcon className="h-5 w-5" />
              ) : null}
              <span className="ml-1 text-sm font-medium">
                {isPositive ? '+' : ''}{change.toFixed(1)}%
              </span>
            </div>
          )}
        </div>
      </div>
    )
  }

  // グラフデータの準備（カテゴリ別）
  const chartData = useMemo(() => {
    if (!trendData) return []

    return trendData.map((item: any) => {
      const date = item.date || item.week || item.month
      const dataPoint: any = { date }

      // 全ての可能な指標を含める
      Object.keys(item).forEach(key => {
        if (key !== 'date' && key !== 'week' && key !== 'month') {
          dataPoint[key] = item[key] !== undefined && item[key] !== null ? item[key] : 0
        }
      })

      return dataPoint
    })
  }, [trendData])

  // チャートコンポーネント
  const ChartComponent = ({
    category,
    selectedMetrics,
    setSelectedMetrics
  }: {
    category: 'amount' | 'conversion' | 'rate',
    selectedMetrics: string[],
    setSelectedMetrics: (metrics: string[]) => void
  }) => {
    const categoryConfig = metricCategories[category]
    const metrics = categoryConfig.metrics

    const handleMetricToggle = (metricValue: string) => {
      setSelectedMetrics((prev: string[]) => {
        if (prev.includes(metricValue)) {
          // 最低1つは選択必須
          if (prev.length > 1) {
            return prev.filter((m: string) => m !== metricValue)
          }
          return prev
        } else {
          return [...prev, metricValue]
        }
      })
    }

    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <ChartBarIcon className="h-5 w-5 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900">{categoryConfig.title}</h3>
          </div>
          <div className="flex items-center gap-4">
            {/* メトリクス選択 */}
            <div className="flex gap-3">
              {metrics.map((metric) => (
                <label key={metric.value} className="flex items-center gap-1 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedMetrics.includes(metric.value)}
                    onChange={() => handleMetricToggle(metric.value)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>{metric.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* グラフ表示 */}
        {chartData.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>この期間にはグラフ表示可能なデータがありません</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            {chartType === 'line' ? (
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis
                  tickFormatter={category === 'rate'
                    ? (value) => `${(value * 100).toFixed(1)}%`
                    : category === 'amount'
                    ? (value) => `¥${(value / 1000).toFixed(0)}k`
                    : undefined
                  }
                />
                <Tooltip
                  formatter={(value: any, name: string) => {
                    const metric = metrics.find(m => m.label === name)
                    if (!metric) return value

                    switch (metric.format) {
                      case 'currency':
                        return `¥${Number(value).toLocaleString('ja-JP')}`
                      case 'percent':
                        return `${(Number(value) * 100).toFixed(2)}%`
                      case 'decimal':
                        return Number(value).toFixed(2)
                      default:
                        return Number(value).toLocaleString('ja-JP')
                    }
                  }}
                />
                <Legend />
                {selectedMetrics.map(metric => {
                  const metricConfig = metrics.find(m => m.value === metric)
                  return (
                    <Line
                      key={metric}
                      type="monotone"
                      dataKey={metric}
                      stroke={metricConfig?.color || '#3B82F6'}
                      strokeWidth={2}
                      dot={{ r: 2 }}
                      activeDot={{ r: 4 }}
                      name={metricConfig?.label}
                    />
                  )
                })}
              </LineChart>
            ) : (
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis
                  tickFormatter={category === 'rate'
                    ? (value) => `${(value * 100).toFixed(1)}%`
                    : category === 'amount'
                    ? (value) => `¥${(value / 1000).toFixed(0)}k`
                    : undefined
                  }
                />
                <Tooltip
                  formatter={(value: any, name: string) => {
                    const metric = metrics.find(m => m.label === name)
                    if (!metric) return value

                    switch (metric.format) {
                      case 'currency':
                        return `¥${Number(value).toLocaleString('ja-JP')}`
                      case 'percent':
                        return `${(Number(value) * 100).toFixed(2)}%`
                      case 'decimal':
                        return Number(value).toFixed(2)
                      default:
                        return Number(value).toLocaleString('ja-JP')
                    }
                  }}
                />
                <Legend />
                {selectedMetrics.map(metric => {
                  const metricConfig = metrics.find(m => m.value === metric)
                  return (
                    <Bar
                      key={metric}
                      dataKey={metric}
                      fill={metricConfig?.color || '#3B82F6'}
                      name={metricConfig?.label}
                    />
                  )
                })}
              </BarChart>
            )}
          </ResponsiveContainer>
        )}
      </div>
    )
  }

  return (
    <ECForceLayout>
      <div className="space-y-6">
        {/* ヘッダー */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">期間別データ分析</h1>
          <p className="mt-1 text-sm text-gray-600">
            期間を比較して、パフォーマンスの変化を分析します
          </p>
        </div>

        {/* 期間選択 */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-4">
            <CalendarIcon className="h-5 w-5 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900">期間設定</h3>
          </div>

          <div className="space-y-6">
            {/* 期間1 */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">分析期間</h4>

              {/* プリセットボタン */}
              <div className="flex flex-wrap gap-2 mb-3">
                {presetPeriods.map((preset) => (
                  <button
                    key={preset.value}
                    onClick={() => applyPresetPeriod(preset.value)}
                    className="px-3 py-1 text-xs font-medium rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* DateRangePicker */}
              <DateRangePicker
                startDate={period1Start}
                endDate={period1End}
                onDateChange={(start, end) => {
                  setPeriod1Start(start)
                  setPeriod1End(end)
                }}
                startPlaceholder="開始日"
                endPlaceholder="終了日"
              />
            </div>

            {/* グラフコントロール */}
            <div className="flex items-center gap-4">
              {/* 粒度選択 */}
              <select
                value={granularity}
                onChange={(e) => setGranularity(e.target.value as Granularity)}
                className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
              >
                <option value="daily">日別</option>
                <option value="weekly">週別</option>
                <option value="monthly">月別</option>
              </select>

              {/* グラフタイプ切替 */}
              <div className="flex rounded-md shadow-sm" role="group">
                <button
                  type="button"
                  onClick={() => setChartType('line')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-l-md border ${
                    chartType === 'line'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  折れ線
                </button>
                <button
                  type="button"
                  onClick={() => setChartType('bar')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-r-md border-t border-b border-r ${
                    chartType === 'bar'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  棒グラフ
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* KPIサマリー */}
        {kpiSummary && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
            <KPICard
              title="売上金額"
              value={kpiSummary.current.salesAmount}
              change={kpiSummary.comparison?.salesAmount}
              format="currency"
            />
            <KPICard
              title="CV（決済）"
              value={kpiSummary.current.cvPayment}
              change={kpiSummary.comparison?.cvPayment}
              format="number"
            />
            <KPICard
              title="CVR（受注）"
              value={kpiSummary.current.cvrOrder}
              change={kpiSummary.comparison?.cvrOrder}
              format="percent"
            />
            <KPICard
              title="決済率"
              value={kpiSummary.current.paymentRate || 0}
              change={kpiSummary.comparison?.paymentRate}
              format="percent"
            />
          </div>
        )}

        {/* データ存在確認メッセージ */}
        {dataAvailability && !dataAvailability.hasData && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              {dataAvailability.message}
            </p>
          </div>
        )}

        {/* 3つのグラフ（金額系、CV系、CVR系） */}
        {trendData && (
          <>
            <ChartComponent
              category="amount"
              selectedMetrics={selectedAmountMetrics}
              setSelectedMetrics={setSelectedAmountMetrics}
            />
            <ChartComponent
              category="conversion"
              selectedMetrics={selectedConversionMetrics}
              setSelectedMetrics={setSelectedConversionMetrics}
            />
            <ChartComponent
              category="rate"
              selectedMetrics={selectedRateMetrics}
              setSelectedMetrics={setSelectedRateMetrics}
            />
          </>
        )}
      </div>
    </ECForceLayout>
  )
}