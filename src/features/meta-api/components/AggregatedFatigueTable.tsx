import React, { useState, useEffect } from 'react'
import { AggregatedData } from '../utils/aggregation'
import { ChevronUpIcon, ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import { FatigueData } from '@/types'
import { CreativeDetailModal } from './CreativeDetailModal'

interface AggregatedFatigueTableProps {
  data: AggregatedData[]
  level: 'campaign' | 'adset'
  insights?: any[] // insightsデータを追加
  accessToken?: string // 認証トークン
  accountId?: string | null // アカウントID
  dateRange?: {
    // 日付範囲を追加
    start: Date | string
    end: Date | string
  }
}

export function AggregatedFatigueTable({
  data,
  level,
  insights,
  accessToken,
  accountId,
  dateRange,
}: AggregatedFatigueTableProps) {
  // デバッグ：受け取ったdateRangeを確認
  console.log('🔍 AggregatedFatigueTable - received dateRange:', dateRange)

  // ソート状態管理
  const [sortField, setSortField] = useState<string>('fatigueScore')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  // アコーディオンの展開状態管理
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  // モーダル状態管理（統合管理方式）
  const [modalProps, setModalProps] = useState<{
    item: FatigueData | null
    insight: any | null
    dateRange: any | null
    isOpen: boolean
  }>({
    item: null,
    insight: null,
    dateRange: null,
    isOpen: false,
  })

  // modalPropsが更新されたときにログを出力
  useEffect(() => {
    console.log('📊 modalProps updated:', {
      isOpen: modalProps.isOpen,
      hasItem: !!modalProps.item,
      hasInsight: !!modalProps.insight,
      dateRange: modalProps.dateRange,
      dateRangeStringified: modalProps.dateRange ? JSON.stringify(modalProps.dateRange) : 'null',
    })
  }, [modalProps])

  // insightsをマップ化（クリエイティブタブと同じ方式）
  const insightsMap = React.useMemo(() => {
    const map = new Map()
    if (insights && Array.isArray(insights)) {
      insights.forEach((insight) => {
        if (insight.ad_id) {
          map.set(insight.ad_id, insight)
        }
      })
    }
    return map
  }, [insights])

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
        case 'reach':
          aValue = Number(a.metrics.reach) || 0
          bValue = Number(b.metrics.reach) || 0
          break
        case 'unique_ctr':
          aValue = Number(a.metrics.unique_ctr) || 0
          bValue = Number(b.metrics.unique_ctr) || 0
          break
        case 'conversions_1d_click':
          aValue = Number(a.metrics.conversions_1d_click) || 0
          bValue = Number(b.metrics.conversions_1d_click) || 0
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
      // 日別データを追加（空配列で初期化）
      dailyData: [],
      dayCount: 0,
      firstDate: '',
      lastDate: '',
      // その他のフィールドも追加（クリエイティブタブと同じ構造）
      impressions: insight.impressions || 0,
      clicks: insight.clicks || 0,
      spend: insight.spend || 0,
      conversions: insight.conversions || 0,
      conversions_1d_click: insight.conversions_1d_click || 0,
      revenue: insight.revenue || 0,
      roas: insight.roas || 0,
    }
  }

  // 広告詳細モーダルを開く
  const handleAdClick = (insight: any, event: React.MouseEvent) => {
    event.stopPropagation() // アコーディオンの切り替えを防ぐ

    // 詳細なデバッグログ
    console.log('🎯 AggregatedFatigueTable - handleAdClick called:', {
      currentDateRange: dateRange,
      dateRangeType: typeof dateRange,
      dateRangeStringified: JSON.stringify(dateRange),
      hasStart: dateRange?.start !== undefined,
      hasEnd: dateRange?.end !== undefined,
      startValue: dateRange?.start,
      endValue: dateRange?.end,
      timestamp: new Date().toISOString(),
    })

    const fatigueData = generateFatigueDataForAd(insight)
    const fullInsight = insightsMap.get(insight.ad_id) || insight

    // modalPropsに設定する前の値を確認
    const newModalProps = {
      item: fatigueData,
      insight: fullInsight,
      dateRange: dateRange,
      isOpen: true,
    }

    console.log('📦 Setting modalProps with:', {
      dateRangeInNewProps: newModalProps.dateRange,
      stringified: JSON.stringify(newModalProps.dateRange),
    })

    setModalProps(newModalProps)
  }

  // モーダルを閉じる
  const closeModal = () => {
    setModalProps({
      item: null,
      insight: null,
      dateRange: null,
      isOpen: false,
    })
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {/* Name */}
            <th
              className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              style={{ width: '150px', maxWidth: '150px' }}
              onClick={() => handleSort('name')}
            >
              <div className="flex items-center gap-1">
                {level === 'campaign' ? 'Campaign' : 'Ad Set'}
                {sortField === 'name' &&
                  (sortDirection === 'asc' ? (
                    <ChevronUpIcon className="h-3 w-3" />
                  ) : (
                    <ChevronDownIcon className="h-3 w-3" />
                  ))}
              </div>
            </th>
            {/* 広告数 */}
            <th
              className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              style={{ width: '60px' }}
              onClick={() => handleSort('adCount')}
            >
              <div className="flex items-center justify-center gap-1">
                Ads
                {sortField === 'adCount' &&
                  (sortDirection === 'asc' ? (
                    <ChevronUpIcon className="h-3 w-3" />
                  ) : (
                    <ChevronDownIcon className="h-3 w-3" />
                  ))}
              </div>
            </th>
            {/* FRQ */}
            <th
              className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              style={{ width: '45px' }}
              onClick={() => handleSort('frequency')}
            >
              <div className="flex items-center justify-center gap-1">
                FRQ
                {sortField === 'frequency' &&
                  (sortDirection === 'asc' ? (
                    <ChevronUpIcon className="h-3 w-3" />
                  ) : (
                    <ChevronDownIcon className="h-3 w-3" />
                  ))}
              </div>
            </th>
            {/* REACH */}
            <th
              className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              style={{ width: '75px' }}
              onClick={() => handleSort('reach')}
            >
              <div className="flex items-center justify-center gap-1">
                REACH
                {sortField === 'reach' &&
                  (sortDirection === 'asc' ? (
                    <ChevronUpIcon className="h-3 w-3" />
                  ) : (
                    <ChevronDownIcon className="h-3 w-3" />
                  ))}
              </div>
            </th>
            {/* IMP */}
            <th
              className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              style={{ width: '80px' }}
              onClick={() => handleSort('impressions')}
            >
              <div className="flex items-center justify-center gap-1">
                IMP
                {sortField === 'impressions' &&
                  (sortDirection === 'asc' ? (
                    <ChevronUpIcon className="h-3 w-3" />
                  ) : (
                    <ChevronDownIcon className="h-3 w-3" />
                  ))}
              </div>
            </th>
            {/* CLICK */}
            <th
              className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              style={{ width: '65px' }}
              onClick={() => handleSort('clicks')}
            >
              <div className="flex items-center justify-center gap-1">
                CLICK
                {sortField === 'clicks' &&
                  (sortDirection === 'asc' ? (
                    <ChevronUpIcon className="h-3 w-3" />
                  ) : (
                    <ChevronDownIcon className="h-3 w-3" />
                  ))}
              </div>
            </th>
            {/* CTR */}
            <th
              className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              style={{ width: '55px' }}
              onClick={() => handleSort('ctr')}
            >
              <div className="flex items-center justify-center gap-1">
                CTR
                {sortField === 'ctr' &&
                  (sortDirection === 'asc' ? (
                    <ChevronUpIcon className="h-3 w-3" />
                  ) : (
                    <ChevronDownIcon className="h-3 w-3" />
                  ))}
              </div>
            </th>
            {/* U-CTR */}
            <th
              className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              style={{ width: '55px' }}
              onClick={() => handleSort('unique_ctr')}
            >
              <div className="flex items-center justify-center gap-1">
                U-CTR
                {sortField === 'unique_ctr' &&
                  (sortDirection === 'asc' ? (
                    <ChevronUpIcon className="h-3 w-3" />
                  ) : (
                    <ChevronDownIcon className="h-3 w-3" />
                  ))}
              </div>
            </th>
            {/* CPC */}
            <th
              className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              style={{ width: '65px' }}
              onClick={() => handleSort('cpc')}
            >
              <div className="flex items-center justify-center gap-1">
                CPC
                {sortField === 'cpc' &&
                  (sortDirection === 'asc' ? (
                    <ChevronUpIcon className="h-3 w-3" />
                  ) : (
                    <ChevronDownIcon className="h-3 w-3" />
                  ))}
              </div>
            </th>
            {/* SPEND */}
            <th
              className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              style={{ width: '85px' }}
              onClick={() => handleSort('spend')}
            >
              <div className="flex items-center justify-center gap-1">
                SPEND
                {sortField === 'spend' &&
                  (sortDirection === 'asc' ? (
                    <ChevronUpIcon className="h-3 w-3" />
                  ) : (
                    <ChevronDownIcon className="h-3 w-3" />
                  ))}
              </div>
            </th>
            {/* F-CV */}
            <th
              className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              style={{ width: '55px' }}
              onClick={() => handleSort('conversions_1d_click')}
            >
              <div className="flex items-center justify-center gap-1">
                F-CV
                {sortField === 'conversions_1d_click' &&
                  (sortDirection === 'asc' ? (
                    <ChevronUpIcon className="h-3 w-3" />
                  ) : (
                    <ChevronDownIcon className="h-3 w-3" />
                  ))}
              </div>
            </th>
            {/* CV */}
            <th
              className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              style={{ width: '55px' }}
              onClick={() => handleSort('conversions')}
            >
              <div className="flex items-center justify-center gap-1">
                CV
                {sortField === 'conversions' &&
                  (sortDirection === 'asc' ? (
                    <ChevronUpIcon className="h-3 w-3" />
                  ) : (
                    <ChevronDownIcon className="h-3 w-3" />
                  ))}
              </div>
            </th>
            {/* CPA */}
            <th
              className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              style={{ width: '70px' }}
              onClick={() => handleSort('cpa')}
            >
              <div className="flex items-center justify-center gap-1">
                CPA
                {sortField === 'cpa' &&
                  (sortDirection === 'asc' ? (
                    <ChevronUpIcon className="h-3 w-3" />
                  ) : (
                    <ChevronDownIcon className="h-3 w-3" />
                  ))}
              </div>
            </th>
            {/* CPM */}
            <th
              className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              style={{ width: '65px' }}
              onClick={() => handleSort('cpm')}
            >
              <div className="flex items-center justify-center gap-1">
                CPM
                {sortField === 'cpm' &&
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
            <td className="px-4 py-3 text-right text-sm text-blue-900">
              {formatCurrency(sortedData.reduce((sum, item) => sum + (item.metrics.spend || 0), 0))}
            </td>
            <td className="px-4 py-3 text-right text-sm text-blue-900">
              {formatNumber(
                sortedData.reduce((sum, item) => sum + (item.metrics.impressions || 0), 0)
              )}
            </td>
            <td className="px-4 py-3 text-right text-sm text-blue-900">
              {formatNumber(sortedData.reduce((sum, item) => sum + (item.metrics.clicks || 0), 0))}
            </td>
            <td className="px-4 py-3 text-right text-sm text-purple-600">N/A</td>
            <td className="px-4 py-3 text-right text-sm text-blue-900">0</td>
            <td className="px-4 py-3 text-right text-sm text-blue-900">
              {sortedData.reduce((sum, item) => sum + (item.metrics.conversions || 0), 0) > 0
                ? formatCurrency(
                    sortedData.reduce((sum, item) => sum + (item.metrics.spend || 0), 0) /
                      sortedData.reduce((sum, item) => sum + (item.metrics.conversions || 0), 0)
                  )
                : '-'}
            </td>
            <td className="px-4 py-3 text-right text-sm text-blue-900">
              {sortedData.reduce((sum, item) => sum + (item.metrics.impressions || 0), 0) > 0
                ? (
                    (sortedData.reduce((sum, item) => sum + (item.metrics.clicks || 0), 0) /
                      sortedData.reduce((sum, item) => sum + (item.metrics.impressions || 0), 0)) *
                    100
                  ).toFixed(2) + '%'
                : '-'}
            </td>
            <td className="px-4 py-3 text-right text-sm text-blue-900">
              {sortedData.length > 0
                ? formatCurrency(
                    sortedData.reduce((sum, item) => sum + (item.metrics.cpc || 0), 0) /
                      sortedData.length
                  )
                : '-'}
            </td>
            <td className="px-4 py-3 text-right text-sm text-blue-900">
              {sortedData.reduce((sum, item) => sum + (item.metrics.clicks || 0), 0) > 0 &&
              sortedData.reduce((sum, item) => sum + (item.metrics.conversions || 0), 0) > 0
                ? (
                    (sortedData.reduce((sum, item) => sum + (item.metrics.conversions || 0), 0) /
                      sortedData.reduce((sum, item) => sum + (item.metrics.clicks || 0), 0)) *
                    100
                  ).toFixed(2) + '%'
                : '-'}
            </td>
            <td className="px-4 py-3 text-right text-sm text-blue-900">
              {sortedData.length > 0
                ? formatCurrency(
                    sortedData.reduce((sum, item) => sum + (item.metrics.cpm || 0), 0) /
                      sortedData.length
                  )
                : '-'}
            </td>
            <td className="px-4 py-3 text-right text-sm text-blue-900">
              {sortedData.length > 0
                ? (
                    sortedData.reduce((sum, item) => sum + (item.metrics.frequency || 0), 0) /
                    sortedData.length
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
                <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                  {formatCurrency(item.metrics.spend || 0)}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                  {formatNumber(item.metrics.impressions || 0)}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                  {formatNumber(item.metrics.clicks || 0)}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                  {formatNumber(item.metrics.conversions || 0)}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-gray-500">0</td>
                <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                  {item.metrics.conversions > 0 ? formatCurrency(item.metrics.cpa) : '-'}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                  {formatNumber(item.metrics.ctr || 0, 2)}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                  {formatCurrency(item.metrics.cpc || 0)}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                  {formatNumber(item.metrics.cvr || 0, 2)}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                  {formatCurrency(item.metrics.cpm || 0)}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                  {formatNumber(item.metrics.frequency || 0, 2)}
                </td>
              </tr>

              {/* Expanded content showing individual ads */}
              {expandedRows.has(item.id) && item.insights.length > 0 && (
                <tr>
                  <td colSpan={13} className="px-4 py-2 bg-gray-50 border-l-4 border-indigo-200">
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
      {modalProps.item && modalProps.insight && (
        <CreativeDetailModal
          isOpen={modalProps.isOpen}
          onClose={closeModal}
          item={modalProps.item}
          insight={modalProps.insight}
          accessToken={accessToken}
          accountId={accountId || ''}
          dateRange={modalProps.dateRange} // modalPropsから取得
        />
      )}
    </div>
  )
}
