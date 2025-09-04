import React, { useState } from 'react'
import { AggregatedData } from '../utils/aggregation'
import { ChevronUpIcon, ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import { FatigueData } from '@/types'
import { CreativeDetailModal } from './CreativeDetailModal'

interface AggregatedFatigueTableProps {
  data: AggregatedData[]
  level: 'campaign' | 'adset'
}

export function AggregatedFatigueTable({ data, level }: AggregatedFatigueTableProps) {
  // ソート状態管理
  const [sortField, setSortField] = useState<string>('fatigueScore')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  // アコーディオンの展開状態管理
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  // モーダル状態管理
  const [selectedItem, setSelectedItem] = useState<FatigueData | null>(null)
  const [selectedInsight, setSelectedInsight] = useState<any | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // ソートされたデータ
  const sortedData = React.useMemo(() => {
    if (!data) return []

    const sortedItems = [...data].sort((a, b) => {
      let aValue: any, bValue: any

      // フィールド値を取得
      switch (sortField) {
        case 'name':
          aValue = (a.name || '').toString().toLowerCase()
          bValue = (b.name || '').toString().toLowerCase()
          break
        case 'adCount':
          aValue = Number(a.adCount) || 0
          bValue = Number(b.adCount) || 0
          break
        case 'fatigueScore':
          aValue = Number(a.fatigueScore) || 0
          bValue = Number(b.fatigueScore) || 0
          break
        case 'spend':
          aValue = Number(a.metrics.spend) || 0
          bValue = Number(b.metrics.spend) || 0
          break
        case 'impressions':
          aValue = Number(a.metrics.impressions) || 0
          bValue = Number(b.metrics.impressions) || 0
          break
        case 'clicks':
          aValue = Number(a.metrics.clicks) || 0
          bValue = Number(b.metrics.clicks) || 0
          break
        case 'conversions':
          aValue = Number(a.metrics.conversions) || 0
          bValue = Number(b.metrics.conversions) || 0
          break
        case 'cpa':
          aValue = Number(a.metrics.cpa) || 0
          bValue = Number(b.metrics.cpa) || 0
          break
        case 'ctr':
          aValue = Number(a.metrics.ctr) || 0
          bValue = Number(b.metrics.ctr) || 0
          break
        case 'cpc':
          aValue = Number(a.metrics.cpc) || 0
          bValue = Number(b.metrics.cpc) || 0
          break
        case 'cvr':
          aValue = Number(a.metrics.cvr) || 0
          bValue = Number(b.metrics.cvr) || 0
          break
        case 'cpm':
          aValue = Number(a.metrics.cpm) || 0
          bValue = Number(b.metrics.cpm) || 0
          break
        case 'frequency':
          aValue = Number(a.metrics.frequency) || 0
          bValue = Number(b.metrics.frequency) || 0
          break
        default:
          aValue = 0
          bValue = 0
      }

      // 文字列の場合
      if (sortField === 'name') {
        if (sortDirection === 'asc') {
          return aValue.localeCompare(bValue)
        } else {
          return bValue.localeCompare(aValue)
        }
      }

      // 数値の場合
      if (sortDirection === 'asc') {
        return aValue - bValue
      } else {
        return bValue - aValue
      }
    })

    return sortedItems
  }, [data, sortField, sortDirection])

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'critical':
        return 'bg-red-100 text-red-800'
      case 'warning':
        return 'bg-yellow-100 text-yellow-800'
      case 'caution':
        return 'bg-orange-100 text-orange-800'
      case 'healthy':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatCurrency = (value: number) => {
    return `¥${Math.ceil(value).toLocaleString('ja-JP')}`
  }

  const formatNumber = (value: number, decimals: number = 0) => {
    return value.toLocaleString('ja-JP', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
  }

  // アコーディオンの切り替え
  const toggleRow = (rowId: string) => {
    const newExpandedRows = new Set(expandedRows)
    if (newExpandedRows.has(rowId)) {
      newExpandedRows.delete(rowId)
    } else {
      newExpandedRows.add(rowId)
    }
    setExpandedRows(newExpandedRows)
  }

  // 個別広告のFatigueDataを生成
  const generateFatigueDataForAd = (insight: any): FatigueData => {
    // 簡単な疲労度計算（実際のロジックに合わせて調整）
    const frequency = insight.frequency || 0
    const ctr = insight.ctr || 0
    const cpm = insight.cpm || 0

    const frequencyScore = Math.min(100, frequency * 20)
    const ctrPenalty = ctr < 1 ? 30 : 0
    const cpmPenalty = cpm > 50 ? 20 : 0

    const score = Math.round((frequencyScore + ctrPenalty + cpmPenalty) / 3)

    let status: FatigueData['status']
    if (score >= 70) status = 'critical'
    else if (score >= 50) status = 'warning'
    else if (score >= 30) status = 'caution'
    else status = 'healthy'

    return {
      adId: insight.ad_id,
      adName: insight.ad_name || 'Unnamed Ad',
      score,
      status,
      metrics: {
        impressions: insight.impressions || 0,
        clicks: insight.clicks || 0,
        spend: insight.spend || 0,
        conversions: insight.conversions || 0,
        reach: insight.reach || 0,
        frequency: insight.frequency || 0,
        ctr: insight.ctr || 0,
        cpc: insight.cpc || 0,
        cpm: insight.cpm || 0,
        unique_ctr: insight.unique_ctr || 0,
        unique_inline_link_click_ctr: insight.unique_inline_link_click_ctr || 0,
        instagram_metrics: insight.instagram_metrics,
      },
    }
  }

  // 広告詳細モーダルを開く
  const handleAdClick = (insight: any, event: React.MouseEvent) => {
    event.stopPropagation() // アコーディオンの切り替えを防ぐ
    const fatigueData = generateFatigueDataForAd(insight)
    setSelectedItem(fatigueData)
    setSelectedInsight(insight)
    setIsModalOpen(true)
  }

  // モーダルを閉じる
  const closeModal = () => {
    setIsModalOpen(false)
    setSelectedItem(null)
    setSelectedInsight(null)
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th
              className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => handleSort('name')}
            >
              <div className="flex items-center gap-1">
                {level === 'campaign' ? 'キャンペーン' : '広告セット'}
                {sortField === 'name' &&
                  (sortDirection === 'asc' ? (
                    <ChevronUpIcon className="h-3 w-3" />
                  ) : (
                    <ChevronDownIcon className="h-3 w-3" />
                  ))}
              </div>
            </th>
            <th
              className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => handleSort('adCount')}
            >
              <div className="flex items-center justify-center gap-1">
                広告数
                {sortField === 'adCount' &&
                  (sortDirection === 'asc' ? (
                    <ChevronUpIcon className="h-3 w-3" />
                  ) : (
                    <ChevronDownIcon className="h-3 w-3" />
                  ))}
              </div>
            </th>
            <th
              className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => handleSort('fatigueScore')}
            >
              <div className="flex items-center justify-center gap-1">
                疲労度
                {sortField === 'fatigueScore' &&
                  (sortDirection === 'asc' ? (
                    <ChevronUpIcon className="h-3 w-3" />
                  ) : (
                    <ChevronDownIcon className="h-3 w-3" />
                  ))}
              </div>
            </th>
            <th
              className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => handleSort('spend')}
            >
              <div className="flex items-center justify-end gap-1">
                広告費用 (¥)
                {sortField === 'spend' &&
                  (sortDirection === 'asc' ? (
                    <ChevronUpIcon className="h-3 w-3" />
                  ) : (
                    <ChevronDownIcon className="h-3 w-3" />
                  ))}
              </div>
            </th>
            <th
              className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => handleSort('impressions')}
            >
              <div className="flex items-center justify-end gap-1">
                インプレッション
                {sortField === 'impressions' &&
                  (sortDirection === 'asc' ? (
                    <ChevronUpIcon className="h-3 w-3" />
                  ) : (
                    <ChevronDownIcon className="h-3 w-3" />
                  ))}
              </div>
            </th>
            <th
              className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => handleSort('clicks')}
            >
              <div className="flex items-center justify-end gap-1">
                クリック
                {sortField === 'clicks' &&
                  (sortDirection === 'asc' ? (
                    <ChevronUpIcon className="h-3 w-3" />
                  ) : (
                    <ChevronDownIcon className="h-3 w-3" />
                  ))}
              </div>
            </th>
            <th
              className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => handleSort('conversions')}
            >
              <div className="flex items-center justify-end gap-1">
                CV
                {sortField === 'conversions' &&
                  (sortDirection === 'asc' ? (
                    <ChevronUpIcon className="h-3 w-3" />
                  ) : (
                    <ChevronDownIcon className="h-3 w-3" />
                  ))}
              </div>
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              <div className="flex items-center justify-end gap-1">F-CV</div>
            </th>
            <th
              className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => handleSort('cpa')}
            >
              <div className="flex items-center justify-end gap-1">
                CPA (¥)
                {sortField === 'cpa' &&
                  (sortDirection === 'asc' ? (
                    <ChevronUpIcon className="h-3 w-3" />
                  ) : (
                    <ChevronDownIcon className="h-3 w-3" />
                  ))}
              </div>
            </th>
            <th
              className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => handleSort('ctr')}
            >
              <div className="flex items-center justify-end gap-1">
                CTR (%)
                {sortField === 'ctr' &&
                  (sortDirection === 'asc' ? (
                    <ChevronUpIcon className="h-3 w-3" />
                  ) : (
                    <ChevronDownIcon className="h-3 w-3" />
                  ))}
              </div>
            </th>
            <th
              className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => handleSort('cpc')}
            >
              <div className="flex items-center justify-end gap-1">
                CPC (¥)
                {sortField === 'cpc' &&
                  (sortDirection === 'asc' ? (
                    <ChevronUpIcon className="h-3 w-3" />
                  ) : (
                    <ChevronDownIcon className="h-3 w-3" />
                  ))}
              </div>
            </th>
            <th
              className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => handleSort('cvr')}
            >
              <div className="flex items-center justify-end gap-1">
                CVR (%)
                {sortField === 'cvr' &&
                  (sortDirection === 'asc' ? (
                    <ChevronUpIcon className="h-3 w-3" />
                  ) : (
                    <ChevronDownIcon className="h-3 w-3" />
                  ))}
              </div>
            </th>
            <th
              className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => handleSort('cpm')}
            >
              <div className="flex items-center justify-end gap-1">
                CPM (¥)
                {sortField === 'cpm' &&
                  (sortDirection === 'asc' ? (
                    <ChevronUpIcon className="h-3 w-3" />
                  ) : (
                    <ChevronDownIcon className="h-3 w-3" />
                  ))}
              </div>
            </th>
            <th
              className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => handleSort('frequency')}
            >
              <div className="flex items-center justify-end gap-1">
                Frequency
                {sortField === 'frequency' &&
                  (sortDirection === 'asc' ? (
                    <ChevronUpIcon className="h-3 w-3" />
                  ) : (
                    <ChevronDownIcon className="h-3 w-3" />
                  ))}
              </div>
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {/* 集計行 */}
          <tr className="bg-blue-50 font-bold border-b-2 border-blue-200">
            <td className="px-4 py-3 text-left text-sm text-blue-900">合計</td>
            <td className="px-4 py-3 text-center text-sm text-blue-900">
              {sortedData.reduce((sum, item) => sum + item.adCount, 0)}
            </td>
            <td className="px-4 py-3 text-center text-sm text-blue-900">-</td>
            <td className="px-4 py-3 text-right text-sm text-blue-900">
              {formatCurrency(sortedData.reduce((sum, item) => sum + item.spend, 0))}
            </td>
            <td className="px-4 py-3 text-right text-sm text-blue-900">
              {formatNumber(sortedData.reduce((sum, item) => sum + item.impressions, 0))}
            </td>
            <td className="px-4 py-3 text-right text-sm text-blue-900">
              {formatNumber(sortedData.reduce((sum, item) => sum + item.clicks, 0))}
            </td>
            <td className="px-4 py-3 text-right text-sm text-blue-900">
              {sortedData.reduce((sum, item) => sum + item.conversions, 0)}
            </td>
            <td className="px-4 py-3 text-right text-sm text-blue-900">
              {sortedData.reduce((sum, item) => sum + item.fcv, 0)}
            </td>
            <td className="px-4 py-3 text-right text-sm text-blue-900">
              {sortedData.reduce((sum, item) => sum + item.conversions, 0) > 0
                ? formatCurrency(
                    sortedData.reduce((sum, item) => sum + item.spend, 0) /
                      sortedData.reduce((sum, item) => sum + item.conversions, 0)
                  )
                : '-'}
            </td>
            <td className="px-4 py-3 text-right text-sm text-blue-900">
              {sortedData.reduce((sum, item) => sum + item.impressions, 0) > 0
                ? (
                    (sortedData.reduce((sum, item) => sum + item.clicks, 0) /
                      sortedData.reduce((sum, item) => sum + item.impressions, 0)) *
                    100
                  ).toFixed(2) + '%'
                : '-'}
            </td>
            <td className="px-4 py-3 text-right text-sm text-blue-900">
              {sortedData.length > 0
                ? formatCurrency(
                    sortedData.reduce((sum, item) => sum + item.cpc, 0) / sortedData.length
                  )
                : '-'}
            </td>
            <td className="px-4 py-3 text-right text-sm text-blue-900">
              {sortedData.reduce((sum, item) => sum + item.clicks, 0) > 0 &&
              sortedData.reduce((sum, item) => sum + item.conversions, 0) > 0
                ? (
                    (sortedData.reduce((sum, item) => sum + item.conversions, 0) /
                      sortedData.reduce((sum, item) => sum + item.clicks, 0)) *
                    100
                  ).toFixed(2) + '%'
                : '-'}
            </td>
            <td className="px-4 py-3 text-right text-sm text-blue-900">
              {sortedData.length > 0
                ? formatCurrency(
                    sortedData.reduce((sum, item) => sum + item.cpm, 0) / sortedData.length
                  )
                : '-'}
            </td>
            <td className="px-4 py-3 text-right text-sm text-blue-900">
              {sortedData.length > 0
                ? (
                    sortedData.reduce((sum, item) => sum + item.frequency, 0) / sortedData.length
                  ).toFixed(2)
                : '-'}
            </td>
          </tr>
          {sortedData.map((item) => (
            <React.Fragment key={item.id}>
              {/* Main row for campaign/adset */}
              <tr
                className={`hover:bg-gray-50 ${item.insights.length > 0 ? 'cursor-pointer' : ''} transition-colors duration-150`}
                onClick={item.insights.length > 0 ? () => toggleRow(item.id) : undefined}
                title={item.insights.length > 0 ? 'クリックして含まれる広告を表示' : undefined}
              >
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    {item.insights.length > 0 && (
                      <div className="text-gray-400 transition-colors">
                        {expandedRows.has(item.id) ? (
                          <ChevronDownIcon className="h-4 w-4" />
                        ) : (
                          <ChevronRightIcon className="h-4 w-4" />
                        )}
                      </div>
                    )}
                    <div>
                      <div className="text-sm font-medium text-gray-900">{item.name}</div>
                      <div className="text-xs text-gray-500">ID: {item.id}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-center">
                  <span className="text-sm text-gray-900">{item.adCount}</span>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-center">
                  <div className="flex flex-col items-center">
                    <span className="text-lg font-semibold text-gray-900">
                      {item.fatigueScore !== undefined ? item.fatigueScore : '-'}
                    </span>
                    {item.fatigueStatus && (
                      <span
                        className={`mt-1 px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(item.fatigueStatus)}`}
                      >
                        {item.fatigueStatus}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                  {formatCurrency(item.metrics.spend)}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                  {formatNumber(item.metrics.impressions)}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                  {formatNumber(item.metrics.clicks)}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                  {formatNumber(item.metrics.conversions)}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-gray-500">
                  N/A
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                  {item.metrics.conversions > 0 ? formatCurrency(item.metrics.cpa) : '-'}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                  {formatNumber(item.metrics.ctr, 2)}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                  {formatCurrency(item.metrics.cpc)}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                  {formatNumber(item.metrics.cvr, 2)}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                  {formatCurrency(item.metrics.cpm)}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                  {formatNumber(item.metrics.frequency, 2)}
                </td>
              </tr>

              {/* Expanded content showing individual ads */}
              {expandedRows.has(item.id) && item.insights.length > 0 && (
                <tr>
                  <td colSpan={14} className="px-4 py-2 bg-gray-50 border-l-4 border-indigo-200">
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-gray-700 mb-3">
                        この{level === 'campaign' ? 'キャンペーン' : '広告セット'}の広告 (
                        {item.insights.length}件)
                      </div>
                      <div className="grid gap-2">
                        {item.insights.map((insight) => {
                          const fatigueData = generateFatigueDataForAd(insight)
                          return (
                            <div
                              key={insight.ad_id}
                              className="bg-white rounded-lg border border-gray-200 p-3 hover:shadow-sm hover:border-indigo-300 transition-all cursor-pointer"
                              onClick={(e) => handleAdClick(insight, e)}
                              title="クリックして詳細を表示"
                            >
                              <div className="grid grid-cols-6 gap-4 items-center text-sm">
                                <div className="col-span-2">
                                  <div className="font-medium text-gray-900 truncate">
                                    {insight.ad_name || 'Unnamed Ad'}
                                  </div>
                                  <div className="text-xs text-gray-500 truncate">
                                    ID: {insight.ad_id}
                                  </div>
                                </div>
                                <div className="text-center">
                                  <span
                                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(fatigueData.status)}`}
                                  >
                                    {fatigueData.score}
                                  </span>
                                </div>
                                <div className="text-right">
                                  <div className="font-medium">{formatCurrency(insight.spend)}</div>
                                  <div className="text-xs text-gray-500">広告費</div>
                                </div>
                                <div className="text-right">
                                  <div className="font-medium">
                                    {formatNumber(insight.impressions)}
                                  </div>
                                  <div className="text-xs text-gray-500">IMP</div>
                                </div>
                                <div className="text-right">
                                  <div className="font-medium">{formatNumber(insight.ctr, 2)}%</div>
                                  <div className="text-xs text-gray-500">CTR</div>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>

      {/* 詳細モーダル */}
      {selectedItem && selectedInsight && (
        <CreativeDetailModal
          isOpen={isModalOpen}
          onClose={closeModal}
          item={selectedItem}
          insight={selectedInsight}
        />
      )}
    </div>
  )
}
