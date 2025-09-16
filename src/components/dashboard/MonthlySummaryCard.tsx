import React from 'react'
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/solid'

interface MonthlySummaryData {
  yearMonth: string
  totalAds: number
  avgFrequency: number
  totalReach: number
  totalImpressions: number
  totalClicks: number
  avgCtr: number
  avgUctr?: number
  avgCpc: number
  totalSpend: number
  totalFcv?: number
  totalCv: number
  avgCpa: number
  avgCpm: number
  isComplete: boolean
  source: 'cache' | 'api' | 'loading' | 'missing'
}

interface MonthlySummaryCardProps {
  data: MonthlySummaryData | null
  previousData?: MonthlySummaryData | null
  isCurrentMonth?: boolean
  onRefresh?: () => void
}

export const MonthlySummaryCard: React.FC<MonthlySummaryCardProps> = ({
  data,
  previousData,
  isCurrentMonth = false,
  onRefresh,
}) => {
  if (!data) {
    return (
      <div className="bg-white rounded-lg shadow p-4 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-24 mb-4"></div>
        <div className="space-y-2">
          <div className="h-3 bg-gray-200 rounded"></div>
          <div className="h-3 bg-gray-200 rounded"></div>
          <div className="h-3 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  // 年月を日本語形式に変換
  const formatYearMonth = (yearMonth: string) => {
    const [year, month] = yearMonth.split('-')
    return `${year}年${parseInt(month)}月`
  }

  // 数値をフォーマット
  const formatNumber = (num: number | undefined | null, decimals = 0): string => {
    if (num === undefined || num === null || isNaN(num)) return '-'

    try {
      if (num >= 1000000) {
        return `${(num / 1000000).toFixed(1)}M`
      } else if (num >= 1000) {
        return `${(num / 1000).toFixed(1)}K`
      }
      const fixed = num.toFixed(decimals)
      const [intPart, decPart] = fixed.split('.')
      const formattedInt = parseInt(intPart).toLocaleString()
      return decPart ? `${formattedInt}.${decPart}` : formattedInt
    } catch (error) {
      console.error('formatNumber error:', error, 'value:', num)
      return '-'
    }
  }

  // 前月比を計算
  const calcChange = (current: number, previous?: number): number | null => {
    if (!previous || previous === 0) return null
    return ((current - previous) / previous) * 100
  }

  // メトリクス行コンポーネント
  const MetricRow = ({
    label,
    value,
    format = 'number',
    previousValue,
    decimals = 0,
  }: {
    label: string
    value: number
    format?: 'number' | 'currency' | 'percent'
    previousValue?: number
    decimals?: number
  }) => {
    const change = previousValue !== undefined ? calcChange(value, previousValue) : null

    let formattedValue = ''
    switch (format) {
      case 'currency':
        formattedValue = `¥${formatNumber(value)}`
        break
      case 'percent':
        formattedValue = `${(value * 100).toFixed(2)}%`
        break
      default:
        formattedValue = formatNumber(value, decimals)
    }

    return (
      <div className="flex justify-between items-center py-1 text-sm">
        <span className="text-gray-600">{label}</span>
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900">{formattedValue}</span>
          {change !== null && (
            <span
              className={`flex items-center text-xs ${
                change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-500'
              }`}
            >
              {change > 0 && <ArrowUpIcon className="w-3 h-3" />}
              {change < 0 && <ArrowDownIcon className="w-3 h-3" />}
              {Math.abs(change).toFixed(1)}%
            </span>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow">
      {/* ヘッダー */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">
            {formatYearMonth(data.yearMonth)}
          </h3>
          <div className="flex items-center gap-2">
            {data.source === 'cache' && (
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                キャッシュ
              </span>
            )}
            {isCurrentMonth && (
              <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                リアルタイム
              </span>
            )}
            {onRefresh && isCurrentMonth && (
              <button
                onClick={onRefresh}
                className="text-xs text-blue-600 hover:text-blue-700"
              >
                更新
              </button>
            )}
          </div>
        </div>
      </div>

      {/* メトリクス */}
      <div className="px-4 py-3 space-y-1">
        <MetricRow
          label="広告数"
          value={data.totalAds}
          previousValue={previousData?.totalAds}
        />
        <MetricRow
          label="FRQ"
          value={data.avgFrequency}
          previousValue={previousData?.avgFrequency}
          decimals={2}
        />
        <MetricRow
          label="リーチ"
          value={data.totalReach}
          previousValue={previousData?.totalReach}
        />
        <MetricRow
          label="インプレッション"
          value={data.totalImpressions}
          previousValue={previousData?.totalImpressions}
        />
        <MetricRow
          label="クリック"
          value={data.totalClicks}
          previousValue={previousData?.totalClicks}
        />
        <MetricRow
          label="CTR"
          value={data.avgCtr}
          format="percent"
          previousValue={previousData?.avgCtr}
        />
        {data.avgUctr !== undefined && (
          <MetricRow
            label="U-CTR"
            value={data.avgUctr}
            format="percent"
            previousValue={previousData?.avgUctr}
          />
        )}
        <MetricRow
          label="CPC"
          value={data.avgCpc}
          format="currency"
          previousValue={previousData?.avgCpc}
        />
        <MetricRow
          label="費用"
          value={data.totalSpend}
          format="currency"
          previousValue={previousData?.totalSpend}
        />
        {data.totalFcv !== undefined && (
          <MetricRow
            label="F-CV"
            value={data.totalFcv}
            previousValue={previousData?.totalFcv}
          />
        )}
        <MetricRow
          label="CV"
          value={data.totalCv}
          previousValue={previousData?.totalCv}
        />
        <MetricRow
          label="CPA"
          value={data.avgCpa}
          format="currency"
          previousValue={previousData?.avgCpa}
        />
        <MetricRow
          label="CPM"
          value={data.avgCpm}
          format="currency"
          previousValue={previousData?.avgCpm}
        />
      </div>
    </div>
  )
}

// 3ヶ月分のサマリーを表示するコンテナ
interface MonthlySummaryContainerProps {
  summaries: Array<{
    yearMonth: string
    data: MonthlySummaryData | null
    source: 'cache' | 'api' | 'missing'
  }>
  onRefresh?: (yearMonth: string) => void
}

export const MonthlySummaryContainer: React.FC<MonthlySummaryContainerProps> = ({
  summaries,
  onRefresh,
}) => {
  const currentYearMonth = new Date().toISOString().slice(0, 7)

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {summaries.map((summary, index) => {
        const previousSummary = index > 0 ? summaries[index - 1] : null
        const isCurrentMonth = summary.yearMonth === currentYearMonth

        return (
          <MonthlySummaryCard
            key={summary.yearMonth}
            data={
              summary.data
                ? {
                    ...summary.data,
                    source: summary.source as 'cache' | 'api',
                  }
                : null
            }
            previousData={previousSummary?.data || undefined}
            isCurrentMonth={isCurrentMonth}
            onRefresh={onRefresh ? () => onRefresh(summary.yearMonth) : undefined}
          />
        )
      })}
    </div>
  )
}