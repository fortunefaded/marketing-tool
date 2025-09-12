import React, { useState } from 'react'
// CreativeTable import removed - component not used
import { FatigueData } from '@/types'
import { debugDataStructure } from '../utils/safe-data-access'
import { aggregateCreativesByName } from '../utils/creative-aggregation'
import {
  ChevronUpIcon,
  ChevronDownIcon,
  PhotoIcon,
  VideoCameraIcon,
  DocumentTextIcon,
  ViewColumnsIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline'
import { CreativeDetailModal } from './CreativeDetailModal'
import { normalizeCreativeMediaType } from '../utils/creative-type'

interface CreativeTableTabProps {
  data: FatigueData[]
  insights: any[]
  selectedAccountId: string | null
  isLoading: boolean
  accessToken?: string // 追加
  dateRange?: {
    // 日付範囲を追加
    start: Date | string
    end: Date | string
  }
}

/**
 * 疲労度ダッシュボード内のクリエイティブテーブルタブ
 * 疲労度データを含むクリエイティブの統計データテーブルを表示
 */
export function CreativeTableTab({
  data,
  insights,
  selectedAccountId,
  isLoading,
  accessToken,
  dateRange,
}: CreativeTableTabProps) {
  // クリエイティブタイプを判定する関数
  const getCreativeType = (insight: any): { type: string; icon: any; color: string } => {
    if (!insight) return { type: 'UNKNOWN', icon: DocumentTextIcon, color: 'text-gray-500' }

    // クリエイティブ名から推測（拡張子やパターンを見る）
    const adName = insight.ad_name || ''
    const namePattern = adName.toLowerCase()

    // 名前から判定
    if (
      namePattern.includes('.mp4') ||
      namePattern.includes('動画') ||
      namePattern.includes('video')
    ) {
      return { type: 'VIDEO', icon: VideoCameraIcon, color: 'text-blue-500' }
    }
    if (
      namePattern.includes('.jpg') ||
      namePattern.includes('.png') ||
      namePattern.includes('.jpeg') ||
      namePattern.includes('画像') ||
      namePattern.includes('image')
    ) {
      return { type: 'IMAGE', icon: PhotoIcon, color: 'text-green-500' }
    }
    if (namePattern.includes('カルーセル') || namePattern.includes('carousel')) {
      return { type: 'CAROUSEL', icon: ViewColumnsIcon, color: 'text-purple-500' }
    }

    // effective_object_story_idから判定
    if (insight.effective_object_story_id) {
      const storyId = insight.effective_object_story_id
      if (storyId.includes('video')) {
        return { type: 'VIDEO', icon: VideoCameraIcon, color: 'text-blue-500' }
      }
    }

    // メディアタイプの正規化を試みる（object_typeプロパティを渡す）
    const normalizedType = normalizeCreativeMediaType(insight?.object_type, {
      video_url: insight?.video_url,
      thumbnail_url: insight?.thumbnail_url,
      carousel_cards: insight?.carousel_cards,
    })
    switch (normalizedType) {
      case 'video':
        return { type: 'VIDEO', icon: VideoCameraIcon, color: 'text-blue-500' }
      case 'image':
        return { type: 'IMAGE', icon: PhotoIcon, color: 'text-green-500' }
      case 'carousel':
        return { type: 'CAROUSEL', icon: ViewColumnsIcon, color: 'text-purple-500' }
      case 'text':
        return { type: 'TEXT', icon: DocumentTextIcon, color: 'text-gray-500' }
      default:
        return { type: 'UNKNOWN', icon: DocumentTextIcon, color: 'text-gray-500' }
    }
  }

  // ソート関連のstate
  const [sortField, setSortField] = useState<string>('impressions')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  // 詳細モーダル関連
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleViewDetails = (item: any) => {
    console.log('詳細表示:', item)
    setSelectedItem(item)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setSelectedItem(null)
  }

  // ローディング中の表示
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  // ソート関数
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  // データ構造のデバッグログ（本番では削除可能）
  debugDataStructure(data, 'CreativeTableTab data')
  debugDataStructure(insights, 'CreativeTableTab insights')

  // insightsをMapに変換（高速アクセス用）
  const insightsMap = new Map()
  insights.forEach((insight) => {
    insightsMap.set(insight.ad_id, insight)
  })

  // 疲労度データの詳細をログ出力（安全）
  console.log(
    '📊 疲労度データの詳細:',
    data.map((item) => ({
      adId: item.adId,
      adName: item.adName || 'N/A',
      impressions: item.impressions || 0,
      clicks: item.clicks || 0,
      spend: item.spend || 0,
      metrics: item.metrics || {},
      score: item.score || -1,
      status: item.status || 'unknown',
    }))
  )

  // クリエイティブ名で集約
  const aggregatedData = aggregateCreativesByName(data, insights)

  // 集約データを疲労度テーブル用に変換
  const formattedData = aggregatedData.map((item) => ({
    ...item,
    // ステータスを計算（疲労度スコアベース）
    // 疲労度スコアが未計算（-1）の場合は'unknown'
    status:
      item.score < 0
        ? ('unknown' as const)
        : item.score >= 80
          ? ('critical' as const)
          : item.score >= 60
            ? ('warning' as const)
            : ('normal' as const),
  }))

  // フォーマット用関数
  const formatNumber = (num: number) => {
    // 整数部分をカンマ区切りで表示
    return Math.round(num).toLocaleString('ja-JP')
  }

  const formatPercentage = (num: number) => {
    return num.toFixed(2) + '%'
  }

  const formatDecimal = (num: number) => {
    return num.toFixed(2)
  }

  // ソート処理
  const sortedData = [...formattedData].sort((a, b) => {
    let aValue, bValue

    switch (sortField) {
      case 'adName':
        aValue = a.adName || ''
        bValue = b.adName || ''
        break
      case 'impressions':
        aValue = a.impressions || 0
        bValue = b.impressions || 0
        break
      case 'clicks':
        aValue = a.clicks || 0
        bValue = b.clicks || 0
        break
      case 'spend':
        aValue = a.spend || 0
        bValue = b.spend || 0
        break
      case 'frequency':
        aValue = a.metrics?.frequency || 0
        bValue = b.metrics?.frequency || 0
        break
      case 'ctr':
        aValue = a.metrics?.ctr || 0
        bValue = b.metrics?.ctr || 0
        break
      case 'unique_ctr':
        aValue = a.metrics?.unique_ctr || 0
        bValue = b.metrics?.unique_ctr || 0
        break
      case 'cpm':
        aValue = a.metrics?.cpm || 0
        bValue = b.metrics?.cpm || 0
        break
      case 'cpc':
        aValue = a.metrics?.cpc || 0
        bValue = b.metrics?.cpc || 0
        break
      case 'reach':
        aValue = a.reach || 0
        bValue = b.reach || 0
        break
      case 'conversions':
        aValue = a.conversions || 0
        bValue = b.conversions || 0
        break
      case 'conversions_1d_click':
        aValue = a.conversions_1d_click || 0
        bValue = b.conversions_1d_click || 0
        break
      case 'cpa':
        aValue = a.cpa || 0
        bValue = b.cpa || 0
        break
      case 'revenue':
        aValue = a.revenue || 0
        bValue = b.revenue || 0
        break
      case 'roas':
        aValue = a.roas || 0
        bValue = b.roas || 0
        break
      case 'score':
        aValue = a.score || -1
        bValue = b.score || -1
        break
      case 'creativeType':
        const aType = getCreativeType(insightsMap.get(a.adId))
        const bType = getCreativeType(insightsMap.get(b.adId))
        aValue = aType.type
        bValue = bType.type
        break
      default:
        aValue = 0
        bValue = 0
    }

    if (sortDirection === 'asc') {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
    }
  })

  // 包括的なソート可能テーブル
  return (
    <div className="w-full max-w-none">
      {/* 包括的な統計データテーブル */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table
            className="w-full divide-y divide-gray-200 table-fixed"
            style={{ minWidth: '1555px' }}
          >
            <thead className="bg-gray-50">
              <tr>
                <th
                  className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  style={{ width: '80px' }}
                  onClick={() => handleSort('creativeType')}
                >
                  <div className="flex items-center justify-center gap-1">
                    タイプ
                    {sortField === 'creativeType' &&
                      (sortDirection === 'asc' ? (
                        <ChevronUpIcon className="h-3 w-3" />
                      ) : (
                        <ChevronDownIcon className="h-3 w-3" />
                      ))}
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  style={{ width: '300px' }}
                  onClick={() => handleSort('adName')}
                >
                  <div className="flex items-center justify-center gap-1">
                    クリエイティブ名
                    {sortField === 'adName' &&
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
                  style={{ width: '70px' }}
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
                  style={{ width: '90px' }}
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
                  style={{ width: '100px' }}
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
                  style={{ width: '80px' }}
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
                  style={{ width: '70px' }}
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
                  style={{ width: '70px' }}
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
                  style={{ width: '80px' }}
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
                  style={{ width: '100px' }}
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
                  style={{ width: '75px' }}
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
                  className="px-2 py-3 text-center text-xs font-medium text-purple-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  style={{ width: '75px' }}
                  onClick={() => handleSort('conversions')}
                >
                  <div className="flex items-center justify-center gap-1">
                    <div className="flex items-center gap-1">
                      <span>CV</span>
                      <div className="group relative">
                        <InformationCircleIcon className="h-3 w-3 text-purple-400 cursor-help" />
                        {/* ツールチップ */}
                        <div className="hidden group-hover:block absolute z-50 bg-gray-900 text-white text-xs rounded-lg p-2 bottom-full left-1/2 transform -translate-x-1/2 w-56 shadow-xl mb-1 pointer-events-none">
                          <div className="font-semibold mb-1">ECForceコンバージョン</div>
                          <div className="text-gray-300">
                            ECForceから取得した注文完了数です。Meta広告経由の購入データを表示しています。
                          </div>
                          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full">
                            <div className="border-4 border-transparent border-t-gray-900"></div>
                          </div>
                        </div>
                      </div>
                    </div>
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
                  className="px-2 py-3 text-center text-xs font-medium text-purple-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  style={{ width: '80px' }}
                  onClick={() => handleSort('cpa')}
                >
                  <div className="flex items-center justify-center gap-1">
                    <div className="flex items-center gap-1">
                      <span>CPA</span>
                      <div className="group relative">
                        <InformationCircleIcon className="h-3 w-3 text-purple-400 cursor-help" />
                        {/* ツールチップ */}
                        <div className="hidden group-hover:block absolute z-50 bg-gray-900 text-white text-xs rounded-lg p-2 bottom-full left-1/2 transform -translate-x-1/2 w-48 shadow-xl mb-1 pointer-events-none">
                          <div className="font-semibold mb-1">獲得単価（CPA）</div>
                          <div className="text-gray-300">
                            1件のコンバージョンを獲得するのにかかった広告費用
                          </div>
                          <div className="text-gray-400 mt-1 text-[10px]">
                            計算式: 消化金額 ÷ CV数
                          </div>
                          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full">
                            <div className="border-4 border-transparent border-t-gray-900"></div>
                          </div>
                        </div>
                      </div>
                    </div>
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
                  style={{ width: '80px' }}
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
                {/* ROAS */}
                <th
                  className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  style={{ width: '75px' }}
                  onClick={() => handleSort('roas')}
                >
                  <div className="flex items-center justify-center gap-1">
                    ROAS
                    {sortField === 'roas' &&
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
                {/* タイプ */}
                <td className="px-2 py-3 whitespace-nowrap text-center text-sm text-blue-900">-</td>
                {/* クリエイティブ名 */}
                <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-blue-900">
                  合計
                </td>
                {/* FRQ (Frequency) */}
                <td className="px-2 py-3 whitespace-nowrap text-center text-sm text-blue-900">
                  {sortedData.length > 0
                    ? formatDecimal(
                        sortedData.reduce((sum, item) => sum + (item.metrics?.frequency || 0), 0) /
                          sortedData.length
                      )
                    : '-'}
                </td>
                {/* REACH */}
                <td className="px-2 py-3 whitespace-nowrap text-center text-sm text-blue-900">
                  {formatNumber(sortedData.reduce((sum, item) => sum + (item.reach || 0), 0))}
                </td>
                {/* IMP */}
                <td className="px-2 py-3 whitespace-nowrap text-center text-sm text-blue-900">
                  {formatNumber(sortedData.reduce((sum, item) => sum + (item.impressions || 0), 0))}
                </td>
                {/* CLICK */}
                <td className="px-2 py-3 whitespace-nowrap text-center text-sm text-blue-900">
                  {formatNumber(sortedData.reduce((sum, item) => sum + (item.clicks || 0), 0))}
                </td>
                {/* CTR */}
                <td className="px-2 py-3 whitespace-nowrap text-center text-sm text-blue-900">
                  {sortedData.reduce((sum, item) => sum + (item.impressions || 0), 0) > 0
                    ? formatPercentage(
                        (sortedData.reduce((sum, item) => sum + (item.clicks || 0), 0) /
                          sortedData.reduce((sum, item) => sum + (item.impressions || 0), 0)) *
                          100
                      )
                    : '-'}
                </td>
                {/* U-CTR */}
                <td className="px-2 py-3 whitespace-nowrap text-center text-sm text-blue-900">
                  {sortedData.length > 0
                    ? formatPercentage(
                        sortedData.reduce((sum, item) => sum + (item.metrics?.unique_ctr || 0), 0) /
                          sortedData.length
                      )
                    : '-'}
                </td>
                {/* CPC */}
                <td className="px-2 py-3 whitespace-nowrap text-center text-sm text-blue-900">
                  ¥
                  {sortedData.length > 0
                    ? formatNumber(
                        sortedData.reduce((sum, item) => sum + (item.metrics?.cpc || 0), 0) /
                          sortedData.length
                      )
                    : '0'}
                </td>
                {/* SPEND */}
                <td className="px-2 py-3 whitespace-nowrap text-center text-sm text-blue-900">
                  ¥{formatNumber(sortedData.reduce((sum, item) => sum + (item.spend || 0), 0))}
                </td>
                {/* F-CV */}
                <td className="px-2 py-3 whitespace-nowrap text-center text-sm text-blue-900">
                  {formatNumber(
                    sortedData.reduce((sum, item) => sum + (item.conversions_1d_click || 0), 0)
                  )}
                </td>
                {/* CV */}
                <td className="px-2 py-3 whitespace-nowrap text-center text-sm text-purple-600">
                  {/* ECForceの合計値を表示（最初のアイテムから取得） */}
                  {sortedData.length > 0 && sortedData[0].ecforce_cv_total !== undefined
                    ? formatNumber(sortedData[0].ecforce_cv_total)
                    : 'N/A'}
                </td>
                {/* CPA */}
                <td className="px-2 py-3 whitespace-nowrap text-center text-sm text-purple-600">
                  {sortedData.reduce((sum, item) => sum + (item.conversions || 0), 0) > 0
                    ? `¥${formatNumber(
                        sortedData.reduce((sum, item) => sum + (item.spend || 0), 0) /
                          sortedData.reduce((sum, item) => sum + (item.conversions || 0), 0)
                      )}`
                    : '-'}
                </td>
                {/* CPM */}
                <td className="px-2 py-3 whitespace-nowrap text-center text-sm text-blue-900">
                  ¥
                  {sortedData.length > 0
                    ? formatNumber(
                        sortedData.reduce((sum, item) => sum + (item.metrics?.cpm || 0), 0) /
                          sortedData.length
                      )
                    : '0'}
                </td>
                {/* ROAS */}
                <td className="px-2 py-3 whitespace-nowrap text-center text-sm text-blue-900">
                  {sortedData.length > 0 && sortedData.some((item) => item.roas > 0)
                    ? `${formatDecimal(
                        sortedData.reduce((sum, item) => sum + (item.roas || 0), 0) /
                          sortedData.filter((item) => item.roas > 0).length
                      )}x`
                    : '-'}
                </td>
              </tr>
              {sortedData.map((item, index) => (
                <tr
                  key={`${item.adId}-${index}`}
                  className="hover:bg-blue-50 cursor-pointer transition-colors duration-150"
                  onClick={() => handleViewDetails(item)}
                  title="クリックして詳細を表示"
                >
                  {/* クリエイティブタイプ */}
                  <td className="px-2 py-3 whitespace-nowrap text-center">
                    {(() => {
                      const insight =
                        item.adIds && item.adIds.length > 0
                          ? insightsMap.get(item.adIds[0])
                          : insightsMap.get(item.adId)
                      const { type, icon: Icon, color } = getCreativeType(insight)
                      return (
                        <div className="flex flex-col items-center">
                          <Icon className={`h-5 w-5 ${color}`} />
                          <span className="text-xs text-gray-500 mt-1">{type}</span>
                        </div>
                      )
                    })()}
                  </td>

                  {/* クリエイティブ名 */}
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    <div
                      className="text-sm font-medium text-gray-900 truncate"
                      title={item.adName || `Creative ${index + 1}`}
                    >
                      {item.adName || `Creative ${index + 1}`}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {item.adIds && item.adIds.length > 1
                        ? `${item.adIds.length} ads (${item.firstDate} - ${item.lastDate})`
                        : item.adId}
                    </div>
                  </td>

                  {/* FRQ (Frequency) */}
                  <td className="px-2 py-3 whitespace-nowrap text-center text-sm">
                    <span
                      className={
                        (item.metrics?.frequency || 0) > 3.5
                          ? 'text-red-600 font-medium'
                          : 'text-gray-900'
                      }
                    >
                      {formatDecimal(item.metrics?.frequency || 0)}
                    </span>
                  </td>

                  {/* REACH */}
                  <td className="px-2 py-3 whitespace-nowrap text-center text-sm text-gray-900">
                    {formatNumber(item.reach || 0)}
                  </td>

                  {/* IMP */}
                  <td className="px-2 py-3 whitespace-nowrap text-center text-sm text-gray-900">
                    {formatNumber(item.impressions)}
                  </td>

                  {/* CLICK */}
                  <td className="px-2 py-3 whitespace-nowrap text-center text-sm text-gray-900">
                    {formatNumber(item.clicks)}
                  </td>

                  {/* CTR */}
                  <td className="px-2 py-3 whitespace-nowrap text-center text-sm text-gray-900">
                    {formatPercentage(item.metrics?.ctr || 0)}
                  </td>

                  {/* U-CTR */}
                  <td className="px-2 py-3 whitespace-nowrap text-center text-sm text-gray-900">
                    {formatPercentage(item.metrics?.unique_ctr || 0)}
                  </td>

                  {/* CPC */}
                  <td className="px-2 py-3 whitespace-nowrap text-center text-sm text-gray-900">
                    ¥{formatNumber(item.metrics?.cpc || 0)}
                  </td>

                  {/* SPEND */}
                  <td className="px-2 py-3 whitespace-nowrap text-center text-sm text-gray-900">
                    ¥{formatNumber(item.spend)}
                  </td>

                  {/* F-CV */}
                  <td className="px-2 py-3 whitespace-nowrap text-center text-sm">
                    <div className="group relative cursor-help inline-block">
                      {/* メイン表示 */}
                      <span
                        className={
                          item.fcv_debug?.cv_fcv_valid === false
                            ? 'text-red-600 font-bold'
                            : 'text-gray-900'
                        }
                      >
                        {formatNumber(item.conversions_1d_click || 0)}
                      </span>

                      {/* デバッグ情報（開発環境のみ） */}
                      {process.env.NODE_ENV === 'development' && item.fcv_debug && (
                        <span className="ml-1 text-xs text-gray-400">
                          ({item.fcv_debug.unique_actions_value}/
                          {item.fcv_debug.unique_actions_1d_click})
                        </span>
                      )}

                      {/* ツールチップ */}
                      {item.fcv_debug && (
                        <div className="hidden group-hover:block absolute z-50 bg-gray-900 text-white text-xs rounded-lg p-3 bottom-full left-1/2 transform -translate-x-1/2 w-80 shadow-xl">
                          <div className="font-bold mb-2 text-yellow-300">F-CVデバッグ情報</div>
                          <div className="space-y-1">
                            <div>
                              unique_actions.value:{' '}
                              <span className="font-mono text-green-300">
                                {item.fcv_debug.unique_actions_value || 'N/A'}
                              </span>
                            </div>
                            <div>
                              unique_actions['1d_click']:{' '}
                              <span className="font-mono text-green-300">
                                {item.fcv_debug.unique_actions_1d_click || 'N/A'}
                              </span>
                            </div>
                            <div>
                              unique_actions['7d_click']:{' '}
                              <span className="font-mono text-gray-400">
                                {item.fcv_debug.unique_actions_7d_click || 'N/A'}
                              </span>
                            </div>
                            <div>
                              unique_conversions:{' '}
                              <span className="font-mono text-gray-400">
                                {item.fcv_debug.unique_conversions || 'N/A'}
                              </span>
                            </div>
                            <div>
                              unique_actions存在:{' '}
                              <span
                                className={
                                  item.fcv_debug.has_unique_actions
                                    ? 'text-green-400'
                                    : 'text-red-400'
                                }
                              >
                                {item.fcv_debug.has_unique_actions ? '✓' : '✗'}
                              </span>
                            </div>
                          </div>
                          <div className="mt-2 pt-2 border-t border-gray-700">
                            <div>
                              CV: <span className="font-mono">{item.conversions}</span>
                            </div>
                            <div>
                              F-CV: <span className="font-mono">{item.conversions_1d_click}</span>
                            </div>
                            <div
                              className={
                                item.fcv_debug.cv_fcv_valid
                                  ? 'text-green-400'
                                  : 'text-red-400 font-bold'
                              }
                            >
                              CV≥F-CV: {item.fcv_debug.cv_fcv_valid ? '✓ 正常' : '✗ エラー'}
                            </div>
                          </div>
                          <div className="mt-2 text-xs text-gray-400">
                            ※Meta Ad Managerの値と比較してください
                          </div>
                          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full">
                            <div className="border-8 border-transparent border-t-gray-900"></div>
                          </div>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* CV */}
                  <td className="px-2 py-3 whitespace-nowrap text-center text-sm text-gray-900">
                    {formatNumber(item.conversions)}
                  </td>

                  {/* CPA */}
                  <td className="px-2 py-3 whitespace-nowrap text-center text-sm text-gray-900">
                    {item.conversions > 0 ? `¥${formatNumber(item.cpa)}` : '-'}
                  </td>

                  {/* CPM */}
                  <td className="px-2 py-3 whitespace-nowrap text-center text-sm text-gray-900">
                    ¥{formatNumber(item.metrics?.cpm || 0)}
                  </td>

                  {/* ROAS */}
                  <td className="px-2 py-3 whitespace-nowrap text-center text-sm">
                    <span
                      className={
                        item.roas >= 3.0
                          ? 'text-green-600 font-medium'
                          : item.roas >= 2.0
                            ? 'text-yellow-600'
                            : item.roas > 0
                              ? 'text-red-600'
                              : 'text-gray-900'
                      }
                    >
                      {item.roas > 0 ? `${formatDecimal(item.roas)}x` : '-'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 詳細モーダル */}
      {selectedItem && (
        <CreativeDetailModal
          isOpen={isModalOpen}
          onClose={closeModal}
          item={selectedItem}
          insight={insightsMap.get(selectedItem.adId)}
          accessToken={accessToken}
          accountId={selectedAccountId || ''}
          dateRange={dateRange} // 日付範囲を渡す
        />
      )}
    </div>
  )
}
