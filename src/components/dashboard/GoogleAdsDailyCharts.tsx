import React, { useMemo, useState } from 'react'
import { LineChart, Line, BarChart, Bar, ResponsiveContainer, YAxis, Tooltip } from 'recharts'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'

interface GoogleAdsDailyChartsProps {
  accountId: string | null
  dateRange: {
    start: string
    end: string
  } | null
}

export const GoogleAdsDailyCharts: React.FC<GoogleAdsDailyChartsProps> = ({
  accountId,
  dateRange,
}) => {
  const [chartType, setChartType] = useState<'line' | 'bar'>('line')

  // Google Ads日別データを取得
  const dailyData = useQuery(
    api.googleAds.getDailySummaries,
    accountId && dateRange
      ? {
          accountId,
          startDate: dateRange.start,
          endDate: dateRange.end,
        }
      : 'skip'
  )

  // メトリクスグループの定義（Metaと同じカラーパレット）
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
        title: 'クリック率と単価',
        metrics: [
          { key: 'ctr', label: 'CTR', color: '#F59E0B', format: 'percent' },
          { key: 'cpc', label: 'CPC', color: '#EC4899', format: 'currency' },
        ],
      },
      {
        title: 'コンバージョン',
        metrics: [
          { key: 'conversions', label: 'CV', color: '#06B6D4', format: 'number' },
          { key: 'conversionValue', label: 'CV Value', color: '#84CC16', format: 'currency' },
        ],
      },
    ]
  }, [dailyData])

  const formatValue = (value: number, format: string) => {
    switch (format) {
      case 'currency':
        return `¥${value.toLocaleString()}`
      case 'percent':
        return `${value.toFixed(2)}%`
      case 'large':
        if (value >= 1000000) {
          return `${(value / 1000000).toFixed(1)}M`
        } else if (value >= 1000) {
          return `${(value / 1000).toFixed(1)}K`
        }
        return value.toString()
      default:
        return value.toLocaleString()
    }
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 shadow-lg rounded-lg border border-gray-200">
          <p className="text-sm font-medium text-gray-900 mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {formatValue(entry.value, entry.payload.format || 'number')}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  if (!dailyData || dailyData.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Google Ads 日別パフォーマンス</h3>
        <p className="text-gray-500 text-center py-8">データがありません</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Google Ads 日別パフォーマンス</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setChartType('line')}
            className={`px-3 py-1 text-sm rounded-md ${
              chartType === 'line'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            ライン
          </button>
          <button
            onClick={() => setChartType('bar')}
            className={`px-3 py-1 text-sm rounded-md ${
              chartType === 'bar'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            バー
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {metricGroups.map((group, groupIndex) => {
          const ChartComponent = chartType === 'line' ? LineChart : BarChart
          const DataComponent = chartType === 'line' ? Line : Bar

          return (
            <div key={groupIndex} className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700">{group.title}</h4>
              <ResponsiveContainer width="100%" height={150}>
                <ChartComponent data={dailyData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                  <YAxis hide />
                  <Tooltip content={<CustomTooltip />} />
                  {group.metrics.map((metric) => (
                    <DataComponent
                      key={metric.key}
                      dataKey={metric.key}
                      stroke={metric.color}
                      fill={metric.color}
                      strokeWidth={2}
                      dot={false}
                      name={metric.label}
                    />
                  ))}
                </ChartComponent>
              </ResponsiveContainer>
              <div className="flex justify-around text-xs">
                {group.metrics.map((metric) => {
                  const latestValue = dailyData[dailyData.length - 1]?.[metric.key] || 0
                  return (
                    <div key={metric.key} className="text-center">
                      <div className="font-medium" style={{ color: metric.color }}>
                        {metric.label}
                      </div>
                      <div className="text-gray-900">
                        {formatValue(latestValue, metric.format)}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}