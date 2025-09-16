import React, { useState, useMemo } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../../../../convex/_generated/api'
import {
  ChartBarIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline'

type SortField =
  | 'yearMonth'
  | 'advertiser'
  | 'orderAmount'
  | 'salesAmount'
  | 'accessCount'
  | 'cvOrder'
  | 'cvPayment'
  | 'cvrOrder'
  | 'cvrPayment'
  | 'roas'

type SortDirection = 'asc' | 'desc'

export const ECForceMonthlyData: React.FC = () => {
  const [selectedAdvertiser, setSelectedAdvertiser] = useState<string>('')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [sortField, setSortField] = useState<SortField>('yearMonth')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  // 月別集計データ取得（高速版）
  const monthlyData = useQuery(api.ecforceMonthlyAggregation.getMonthlyAggregatedDataFast, {
    startMonth: startDate ? startDate.substring(0, 7) : undefined,
    endMonth: endDate ? endDate.substring(0, 7) : undefined,
    advertiser: selectedAdvertiser || undefined,
  })

  // 広告主リスト取得
  const advertisers = useQuery(api.ecforce.getAdvertisers, {})

  // ソート処理
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  // ソート済みデータ
  const sortedData = useMemo(() => {
    if (!monthlyData?.data) return []

    return [...monthlyData.data].sort((a, b) => {
      const aValue = a[sortField]
      const bValue = b[sortField]

      if (aValue === null || aValue === undefined) return 1
      if (bValue === null || bValue === undefined) return -1

      if (typeof aValue === 'string') {
        return sortDirection === 'asc'
          ? aValue.localeCompare(bValue as string)
          : (bValue as string).localeCompare(aValue)
      } else {
        return sortDirection === 'asc'
          ? (aValue as number) - (bValue as number)
          : (bValue as number) - (aValue as number)
      }
    })
  }, [monthlyData, sortField, sortDirection])

  // 合計値の計算
  const totals = useMemo(() => {
    if (!sortedData.length) return null

    const sum = sortedData.reduce(
      (acc, item) => ({
        orderAmount: acc.orderAmount + item.orderAmount,
        salesAmount: acc.salesAmount + item.salesAmount,
        accessCount: acc.accessCount + item.accessCount,
        cvOrder: acc.cvOrder + item.cvOrder,
        cvPayment: acc.cvPayment + item.cvPayment,
        cost: acc.cost + item.cost,
      }),
      {
        orderAmount: 0,
        salesAmount: 0,
        accessCount: 0,
        cvOrder: 0,
        cvPayment: 0,
        cost: 0,
      }
    )

    return {
      ...sum,
      avgCvrOrder: sum.accessCount > 0 ? sum.cvOrder / sum.accessCount : 0,
      avgCvrPayment: sum.accessCount > 0 ? sum.cvPayment / sum.accessCount : 0,
      avgRoas: sum.cost > 0 ? sum.salesAmount / sum.cost : 0,
    }
  }, [sortedData])

  // フォーマット関数
  const formatNumber = (value: number) => value.toLocaleString('ja-JP')
  const formatPercent = (value: number) => `${(value * 100).toFixed(2)}%`
  const formatCurrency = (value: number) => `¥${formatNumber(value)}`

  // ソートアイコン
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <div className="w-4 h-4" />
    return sortDirection === 'asc' ? (
      <ArrowUpIcon className="w-4 h-4 text-blue-600" />
    ) : (
      <ArrowDownIcon className="w-4 h-4 text-blue-600" />
    )
  }

  if (!monthlyData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">データを読み込み中...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <ChartBarIcon className="h-6 w-6 text-blue-600" />
          <div>
            <h3 className="text-lg font-medium text-blue-900">月別集計データ</h3>
            <p className="text-sm text-blue-700 mt-1">
              日次データから自動的に月別集計を生成しています
            </p>
          </div>
        </div>
      </div>

      {/* フィルター */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center gap-4 mb-4">
          <CalendarIcon className="h-5 w-5 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900">フィルター</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* 広告主選択 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">広告主</label>
            <select
              value={selectedAdvertiser}
              onChange={(e) => setSelectedAdvertiser(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">すべて</option>
              {advertisers?.map((advertiser: string) => (
                <option key={advertiser} value={advertiser}>
                  {advertiser}
                </option>
              ))}
            </select>
          </div>

          {/* 開始月 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">開始月</label>
            <input
              type="month"
              value={startDate ? startDate.substring(0, 7) : ''}
              onChange={(e) => setStartDate(e.target.value ? `${e.target.value}-01` : '')}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          {/* 終了月 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">終了月</label>
            <input
              type="month"
              value={endDate ? endDate.substring(0, 7) : ''}
              onChange={(e) => {
                if (e.target.value) {
                  // 月末日を計算
                  const [year, month] = e.target.value.split('-').map(Number)
                  const lastDay = new Date(year, month, 0).getDate()
                  setEndDate(`${e.target.value}-${lastDay.toString().padStart(2, '0')}`)
                } else {
                  setEndDate('')
                }
              }}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          {/* クリアボタン */}
          <div className="flex items-end">
            <button
              onClick={() => {
                setSelectedAdvertiser('')
                setStartDate('')
                setEndDate('')
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              クリア
            </button>
          </div>
        </div>
      </div>

      {/* データ件数 */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex items-center justify-between">
          <div className="flex gap-6">
            <div>
              <span className="text-sm text-gray-600">表示中:</span>
              <span className="ml-2 font-bold text-blue-600">{sortedData.length}ヶ月</span>
            </div>
            {sortedData.length > 0 && (
              <div>
                <span className="text-sm text-gray-600">期間:</span>
                <span className="ml-2 font-bold">
                  {sortedData[sortedData.length - 1].yearMonth} ～ {sortedData[0].yearMonth}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* データテーブル */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {sortedData.length === 0 ? (
          <div className="p-8 text-center text-gray-500">データが見つかりません</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('yearMonth')}
                  >
                    <div className="flex items-center gap-1">
                      年月
                      <SortIcon field="yearMonth" />
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('advertiser')}
                  >
                    <div className="flex items-center gap-1">
                      広告主
                      <SortIcon field="advertiser" />
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('orderAmount')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      受注金額
                      <SortIcon field="orderAmount" />
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('salesAmount')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      売上金額
                      <SortIcon field="salesAmount" />
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('accessCount')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      アクセス数
                      <SortIcon field="accessCount" />
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('cvOrder')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      CV(受注)
                      <SortIcon field="cvOrder" />
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('cvrOrder')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      CVR(受注)
                      <SortIcon field="cvrOrder" />
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('roas')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      ROAS
                      <SortIcon field="roas" />
                    </div>
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    日数
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedData.map((item, index) => (
                  <tr key={`${item.yearMonth}_${item.advertiser}_${index}`} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm text-gray-900">{item.yearMonth}</td>
                    <td className="px-4 py-2 text-sm text-gray-900">{item.advertiser}</td>
                    <td className="px-4 py-2 text-sm text-right text-gray-900">
                      {formatCurrency(item.orderAmount)}
                    </td>
                    <td className="px-4 py-2 text-sm text-right text-gray-900">
                      {formatCurrency(item.salesAmount)}
                    </td>
                    <td className="px-4 py-2 text-sm text-right text-gray-900">
                      {formatNumber(item.accessCount)}
                    </td>
                    <td className="px-4 py-2 text-sm text-right text-gray-900">{item.cvOrder}</td>
                    <td className="px-4 py-2 text-sm text-right text-gray-900">
                      {formatPercent(item.cvrOrder)}
                    </td>
                    <td className="px-4 py-2 text-sm text-right text-gray-900">
                      {(item.roas || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-2 text-sm text-center text-gray-500">
                      {item.dataPoints}
                    </td>
                  </tr>
                ))}
              </tbody>
              {totals && (
                <tfoot className="bg-gray-100">
                  <tr>
                    <td colSpan={2} className="px-4 py-2 text-sm font-bold text-gray-900">
                      合計
                    </td>
                    <td className="px-4 py-2 text-sm text-right font-bold text-gray-900">
                      {formatCurrency(totals.orderAmount)}
                    </td>
                    <td className="px-4 py-2 text-sm text-right font-bold text-gray-900">
                      {formatCurrency(totals.salesAmount)}
                    </td>
                    <td className="px-4 py-2 text-sm text-right font-bold text-gray-900">
                      {formatNumber(totals.accessCount)}
                    </td>
                    <td className="px-4 py-2 text-sm text-right font-bold text-gray-900">
                      {totals.cvOrder}
                    </td>
                    <td className="px-4 py-2 text-sm text-right font-bold text-gray-900">
                      {formatPercent(totals.avgCvrOrder)}
                    </td>
                    <td className="px-4 py-2 text-sm text-right font-bold text-gray-900">
                      {totals.avgRoas.toFixed(2)}
                    </td>
                    <td className="px-4 py-2"></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>
    </div>
  )
}