import React from 'react'

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
  totalCv: number  // 決済CV
  totalCvOrder?: number  // 受注CV
  avgCpa: number
  avgCpm: number
  isComplete: boolean
  source: 'cache' | 'api' | 'loading' | 'missing'
}

interface MonthlySummaryTableProps {
  summaries: Array<{
    yearMonth: string
    data: MonthlySummaryData | null
    source: 'cache' | 'api' | 'missing'
  }>
  onRefresh?: (yearMonth: string) => void
}

export const MonthlySummaryTable: React.FC<MonthlySummaryTableProps> = ({
  summaries,
  onRefresh,
}) => {
  // 年月を日本語形式に変換
  const formatYearMonth = (yearMonth: string) => {
    const [year, month] = yearMonth.split('-')
    return `${parseInt(month)}月`
  }

  // 数値をフォーマット
  const formatNumber = (num: number | undefined, format: string): string => {
    if (num === undefined || num === null || isNaN(num)) return '-'

    try {
      switch (format) {
        case 'currency':
          return `¥${Math.floor(num).toLocaleString()}`
        case 'percent':
          return `${(num * 100).toFixed(2)}%`
        case 'decimal':
          return num.toFixed(2)
        case 'large':
          return Math.floor(num).toLocaleString()
        default:
          return num.toLocaleString()
      }
    } catch (error) {
      console.error('formatNumber error:', error, 'value:', num, 'format:', format)
      return '-'
    }
  }

  const currentYearMonth = new Date().toISOString().slice(0, 7)

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden h-full">
      <div className="p-3 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900">月次サマリー（過去3ヶ月）</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-700 uppercase tracking-wider bg-gray-50">
                月
              </th>
              <th className="px-2 py-1.5 text-right text-xs font-medium text-gray-700 uppercase tracking-wider bg-gray-50">
                FRQ
              </th>
              <th className="px-2 py-1.5 text-right text-xs font-medium text-gray-700 uppercase tracking-wider bg-gray-50">
                REACH
              </th>
              <th className="px-2 py-1.5 text-right text-xs font-medium text-gray-700 uppercase tracking-wider bg-gray-50">
                IMP
              </th>
              <th className="px-2 py-1.5 text-right text-xs font-medium text-gray-700 uppercase tracking-wider bg-gray-50">
                CLICK
              </th>
              <th className="px-2 py-1.5 text-right text-xs font-medium text-gray-700 uppercase tracking-wider bg-gray-50">
                CTR
              </th>
              <th className="px-2 py-1.5 text-right text-xs font-medium text-gray-700 uppercase tracking-wider bg-gray-50">
                U-CTR
              </th>
              <th className="px-2 py-1.5 text-right text-xs font-medium text-gray-700 uppercase tracking-wider bg-gray-50">
                CPC
              </th>
              <th className="px-2 py-1.5 text-right text-xs font-medium text-gray-700 uppercase tracking-wider bg-gray-50">
                SPEND
              </th>
              <th className="px-2 py-1.5 text-right text-xs font-medium text-gray-700 uppercase tracking-wider bg-gray-50">
                F-CV
              </th>
              <th className="px-2 py-1.5 text-right text-xs font-medium text-gray-700 uppercase tracking-wider bg-gray-50">
                CV
              </th>
              <th className="px-2 py-1.5 text-right text-xs font-medium text-gray-700 uppercase tracking-wider bg-gray-50">
                CPA
              </th>
              <th className="px-2 py-1.5 text-right text-xs font-medium text-gray-700 uppercase tracking-wider bg-gray-50">
                CPM
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {summaries.map((summary) => {
              const data = summary.data
              const isCurrentMonth = summary.yearMonth === currentYearMonth

              return (
                <tr key={summary.yearMonth} className="hover:bg-gray-50">
                  <td className="px-2 py-1.5 whitespace-nowrap text-xs font-medium text-gray-900">
                    <div className="flex items-center gap-2">
                      <span>{formatYearMonth(summary.yearMonth)}</span>
                      {isCurrentMonth && (
                        <span className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                          今月
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-1.5 whitespace-nowrap text-xs text-gray-900 text-right">
                    {data ? formatNumber(data.avgFrequency, 'decimal') : '-'}
                  </td>
                  <td className="px-2 py-1.5 whitespace-nowrap text-xs text-gray-900 text-right">
                    {data ? formatNumber(data.totalReach, 'large') : '-'}
                  </td>
                  <td className="px-2 py-1.5 whitespace-nowrap text-xs text-gray-900 text-right">
                    {data ? formatNumber(data.totalImpressions, 'large') : '-'}
                  </td>
                  <td className="px-2 py-1.5 whitespace-nowrap text-xs text-gray-900 text-right">
                    {data ? formatNumber(data.totalClicks, 'large') : '-'}
                  </td>
                  <td className="px-2 py-1.5 whitespace-nowrap text-xs text-gray-900 text-right">
                    {data ? `${data.avgCtr.toFixed(2)}%` : '-'}
                  </td>
                  <td className="px-2 py-1.5 whitespace-nowrap text-xs text-gray-900 text-right">
                    {data && data.avgUctr !== undefined ? `${data.avgUctr.toFixed(2)}%` : '-'}
                  </td>
                  <td className="px-2 py-1.5 whitespace-nowrap text-xs text-gray-900 text-right">
                    {data ? formatNumber(data.avgCpc, 'currency') : '-'}
                  </td>
                  <td className="px-2 py-1.5 whitespace-nowrap text-xs text-gray-900 text-right">
                    {data ? formatNumber(data.totalSpend, 'currency') : '-'}
                  </td>
                  <td className="px-2 py-1.5 whitespace-nowrap text-xs text-gray-900 text-right">
                    {data && data.totalFcv !== undefined ? formatNumber(data.totalFcv, 'number') : '-'}
                  </td>
                  <td className="px-2 py-1.5 whitespace-nowrap text-xs text-gray-900 text-right">
                    {data ? (
                      data.totalCvOrder !== undefined ?
                        `${formatNumber(data.totalCvOrder, 'number')}(${formatNumber(data.totalCv, 'number')})` :
                        formatNumber(data.totalCv, 'number')
                    ) : '-'}
                  </td>
                  <td className="px-2 py-1.5 whitespace-nowrap text-xs text-gray-900 text-right">
                    {data ? formatNumber(data.avgCpa, 'currency') : '-'}
                  </td>
                  <td className="px-2 py-1.5 whitespace-nowrap text-xs text-gray-900 text-right">
                    {data ? formatNumber(data.avgCpm, 'currency') : '-'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}