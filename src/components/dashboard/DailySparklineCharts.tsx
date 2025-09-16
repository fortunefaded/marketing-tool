import React, { useMemo } from 'react'
import { LineChart, Line, ResponsiveContainer, YAxis, Tooltip } from 'recharts'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'

interface DailySparklineChartsProps {
  accountId: string | null
  dateRange: {
    start: string
    end: string
  } | null
}

export const DailySparklineCharts: React.FC<DailySparklineChartsProps> = ({
  accountId,
  dateRange,
}) => {
  // 日別データを取得
  const dailyData = useQuery(
    api.metaDailySummary.getDailySummaries,
    accountId && dateRange
      ? {
          accountId,
          startDate: dateRange.start,
          endDate: dateRange.end,
        }
      : 'skip'
  )

  // メトリクスグループの定義
  const metricGroups = useMemo(() => {
    if (!dailyData) return []

    return [
      {
        title: '広告費用と効率',
        metrics: [
          { key: 'spend', label: 'Cost', color: '#3B82F6', format: 'currency' },
          { key: 'cpa', label: 'CPA', color: '#EF4444', format: 'currency' },
        ],
      },
      {
        title: 'インプレッションとクリック',
        metrics: [
          { key: 'impressions', label: 'IMP', color: '#8B5CF6', format: 'large' },
          { key: 'clicks', label: 'Click', color: '#10B981', format: 'number' },
        ],
      },
      {
        title: 'コンバージョン',
        metrics: [
          { key: 'conversions', label: 'CV', color: '#F59E0B', format: 'number' },
          { key: 'ctr', label: 'CTR', color: '#EC4899', format: 'percent' },
        ],
      },
      {
        title: 'リーチとCPC',
        metrics: [
          { key: 'reach', label: 'Reach', color: '#6366F1', format: 'large' },
          { key: 'cpc', label: 'CPC', color: '#14B8A6', format: 'currency' },
        ],
      },
    ]
  }, [dailyData])

  // 数値フォーマット
  const formatValue = (value: number | undefined | null, format: string): string => {
    if (value === undefined || value === null || isNaN(value)) return '-'

    try {
      switch (format) {
        case 'currency':
          return `¥${Math.floor(value).toLocaleString()}`
        case 'percent':
          return `${value.toFixed(2)}%`
        case 'large':
          return Math.floor(value).toLocaleString()
        default:
          return value.toLocaleString()
      }
    } catch (error) {
      console.error('formatValue error:', error, 'value:', value, 'format:', format)
      return '-'
    }
  }

  // カスタムツールチップ
  const CustomTooltip = ({ active, payload, label, format }: any) => {
    if (!active || !payload || !payload.length) return null

    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-2">
        <p className="text-xs text-gray-600">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-xs font-medium" style={{ color: entry.color }}>
            {entry.name}: {formatValue(entry.value, format)}
          </p>
        ))}
      </div>
    )
  }

  if (!accountId || !dateRange) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <p className="text-sm text-gray-500">期間を選択してください</p>
      </div>
    )
  }

  if (!dailyData) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const { days } = dailyData

  return (
    <div className="bg-white rounded-lg shadow-sm h-full">
      <div className="p-3 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900">
          日別推移（{dateRange.start} ～ {dateRange.end}）
        </h3>
      </div>
      <div className="p-4">

      <div className="grid grid-cols-2 gap-3">
        {metricGroups.map((group) => (
          <div key={group.title} className="border border-gray-200 rounded-lg p-3">
            <h4 className="text-xs font-medium text-gray-600 mb-2">{group.title}</h4>

            <div className="h-20 mb-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={days}
                  margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                >
                  {group.metrics.map((metric) => (
                    <Line
                      key={metric.key}
                      type="monotone"
                      dataKey={metric.key}
                      stroke={metric.color}
                      strokeWidth={1.5}
                      dot={false}
                      animationDuration={500}
                    />
                  ))}
                  <YAxis hide />
                  <Tooltip
                    content={({ active, payload, label }) => (
                      <CustomTooltip
                        active={active}
                        payload={payload}
                        label={label}
                        format={group.metrics[0].format}
                      />
                    )}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="flex justify-between text-xs">
              {group.metrics.map((metric) => {
                const latestValue = days[days.length - 1]?.[metric.key as keyof typeof days[0]] as number
                const totalValue = days.reduce((sum, d) => sum + (d[metric.key as keyof typeof d] as number || 0), 0)
                const avgValue = totalValue / days.length

                return (
                  <div key={metric.key} className="flex items-center gap-1">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: metric.color }}
                    />
                    <span className="text-gray-600">{metric.label}:</span>
                    <span className="font-medium text-gray-900">
                      {formatValue(metric.key === 'ctr' ? avgValue : latestValue, metric.format)}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* サマリー統計 */}
      {dailyData.summary && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="grid grid-cols-4 gap-2 text-xs">
            <div>
              <span className="text-gray-500">総インプレッション:</span>
              <span className="ml-1 font-medium">{formatValue(dailyData.summary.totalImpressions, 'large')}</span>
            </div>
            <div>
              <span className="text-gray-500">総クリック:</span>
              <span className="ml-1 font-medium">{formatValue(dailyData.summary.totalClicks, 'number')}</span>
            </div>
            <div>
              <span className="text-gray-500">総費用:</span>
              <span className="ml-1 font-medium">{formatValue(dailyData.summary.totalSpend, 'currency')}</span>
            </div>
            <div>
              <span className="text-gray-500">総CV:</span>
              <span className="ml-1 font-medium">{formatValue(dailyData.summary.totalConversions, 'number')}</span>
            </div>
            <div>
              <span className="text-gray-500">平均CTR:</span>
              <span className="ml-1 font-medium">{formatValue(dailyData.summary.avgCtr, 'percent')}</span>
            </div>
            <div>
              <span className="text-gray-500">平均CPC:</span>
              <span className="ml-1 font-medium">{formatValue(dailyData.summary.avgCpc, 'currency')}</span>
            </div>
            <div>
              <span className="text-gray-500">平均CPA:</span>
              <span className="ml-1 font-medium">{formatValue(dailyData.summary.avgCpa, 'currency')}</span>
            </div>
            <div>
              <span className="text-gray-500">総リーチ:</span>
              <span className="ml-1 font-medium">{formatValue(dailyData.summary.totalReach, 'large')}</span>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}