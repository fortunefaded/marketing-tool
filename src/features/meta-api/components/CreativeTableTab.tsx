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
  accessToken: string
  dateRange: {
    startDate: Date
    endDate: Date
  }
}

export function CreativeTableTab({
  data,
  insights,
  selectedAccountId,
  isLoading,
  accessToken,
  dateRange,
}: CreativeTableTabProps) {
  // 既存のロジックはそのまま維持
  const getCreativeType = (insight: any): { type: string; icon: any; color: string } => {
    if (!insight) return { type: 'UNKNOWN', icon: DocumentTextIcon, color: 'text-gray-500' }

    const adName = insight.ad_name || ''
    const namePattern = adName.toLowerCase()

    if (
      namePattern.includes('動画') ||
      namePattern.includes('video') ||
      namePattern.includes('ver') ||
      namePattern.includes('.mp4')
    ) {
      return { type: 'VIDEO', icon: VideoCameraIcon, color: 'text-purple-600' }
    }
    if (
      namePattern.includes('画像') ||
      namePattern.includes('image') ||
      namePattern.includes('.jpg') ||
      namePattern.includes('.png')
    ) {
      return { type: 'IMAGE', icon: PhotoIcon, color: 'text-blue-600' }
    }
    if (namePattern.includes('カルーセル') || namePattern.includes('carousel')) {
      return { type: 'CAROUSEL', icon: ViewColumnsIcon, color: 'text-green-600' }
    }

    if (insight.video_url || insight.video_id) {
      return { type: 'VIDEO', icon: VideoCameraIcon, color: 'text-purple-600' }
    }
    if (insight.image_url || insight.thumbnail_url) {
      return { type: 'IMAGE', icon: PhotoIcon, color: 'text-blue-600' }
    }

    const objectType =
      insight.creative?.object_type || insight.creative_type || insight.creative_media_type

    if (objectType) {
      const normalizedType = normalizeCreativeMediaType(objectType)
      switch (normalizedType) {
        case 'video':
          return { type: 'VIDEO', icon: VideoCameraIcon, color: 'text-purple-600' }
        case 'image':
          return { type: 'IMAGE', icon: PhotoIcon, color: 'text-blue-600' }
        case 'carousel':
          return { type: 'CAROUSEL', icon: ViewColumnsIcon, color: 'text-green-600' }
        default:
          return { type: 'IMAGE', icon: PhotoIcon, color: 'text-blue-600' }
      }
    }

    return { type: 'IMAGE', icon: PhotoIcon, color: 'text-blue-600' }
  }

  const [sortField, setSortField] = useState<string>('score')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [selectedItem, setSelectedItem] = useState<FatigueData | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

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

  const sortedData = React.useMemo(() => {
    debugDataStructure(data, 'CreativeTableTab Input Data')

    if (!data || !Array.isArray(data) || data.length === 0) {
      return []
    }

    const aggregatedCreatives = aggregateCreativesByName(data)

    const enrichedData = aggregatedCreatives.map((item) => {
      const insight = item.adIds.length > 0 ? insightsMap.get(item.adIds[0]) : null
      const metrics = {
        impressions: item.impressions,
        clicks: item.clicks,
        spend: item.spend,
        conversions: item.conversions,
        frequency: item.frequency,
        ctr: item.ctr,
        unique_ctr: item.unique_ctr,
        cpm: item.cpm,
        cpc: item.cpc,
      }

      const status =
        item.fatigue_score < 0
          ? 'unknown'
          : item.fatigue_score >= 80
            ? 'critical'
            : item.fatigue_score >= 60
              ? 'warning'
              : 'normal'

      return {
        ...item,
        adId: item.adIds[0],
        adIds: item.adIds,
        adName: item.adName,
        campaignId: item.campaignId,
        campaignName: item.campaignName,
        adsetId: item.adsetId,
        adsetName: item.adsetName,
        score: item.fatigue_score,
        status: status,
        metrics: metrics,
        insight,
        impressions: item.impressions,
        clicks: item.clicks,
        spend: item.spend,
        conversions: item.conversions,
        conversions_1d_click: item.conversions_1d_click,
        fcv_debug: item.fcv_debug,
        ecforce_cv: item.ecforce_cv || 0,
        ecforce_fcv: item.ecforce_fcv || 0,
        ecforce_cpa: item.ecforce_cpa,
        ecforce_cv_total: item.ecforce_cv_total || 0,
        ecforce_fcv_total: item.ecforce_fcv_total || 0,
        cpa: item.cpa,
        roas: item.roas,
        cvr: item.conversions > 0 && item.clicks > 0 ? (item.conversions / item.clicks) * 100 : 0,
        revenue: item.conversion_values,
        creativeType: getCreativeType(insight).type,
      }
    })

    const sortedItems = [...enrichedData].sort((a, b) => {
      let aValue: any, bValue: any

      switch (sortField) {
        case 'adName':
          aValue = (a.adName || '').toString().toLowerCase()
          bValue = (b.adName || '').toString().toLowerCase()
          break
        case 'score':
          aValue = Number(a.score) || 0
          bValue = Number(b.score) || 0
          break
        case 'frequency':
          aValue = Number(a.metrics?.frequency) || 0
          bValue = Number(b.metrics?.frequency) || 0
          break
        case 'ctr':
          aValue = Number(a.metrics?.ctr) || 0
          bValue = Number(b.metrics?.ctr) || 0
          break
        case 'unique_ctr':
          aValue = Number(a.metrics?.unique_ctr) || 0
          bValue = Number(b.metrics?.unique_ctr) || 0
          break
        case 'cpm':
          aValue = Number(a.metrics?.cpm) || 0
          bValue = Number(b.metrics?.cpm) || 0
          break
        case 'cpc':
          aValue = Number(a.metrics?.cpc) || 0
          bValue = Number(b.metrics?.cpc) || 0
          break
        case 'impressions':
          aValue = Number(a.impressions) || 0
          bValue = Number(b.impressions) || 0
          break
        case 'reach':
          aValue = Number(a.reach) || 0
          bValue = Number(b.reach) || 0
          break
        case 'clicks':
          aValue = Number(a.clicks) || 0
          bValue = Number(b.clicks) || 0
          break
        case 'spend':
          aValue = Number(a.spend) || 0
          bValue = Number(b.spend) || 0
          break
        case 'conversions':
          aValue = Number(a.conversions) || 0
          bValue = Number(b.conversions) || 0
          break
        case 'conversions_1d_click':
          aValue = Number(a.conversions_1d_click) || 0
          bValue = Number(b.conversions_1d_click) || 0
          break
        case 'cpa':
          aValue = Number(a.cpa) || 0
          bValue = Number(b.cpa) || 0
          break
        case 'revenue':
          aValue = Number(a.revenue) || 0
          bValue = Number(b.revenue) || 0
          break
        case 'creativeType':
          aValue = (a.creativeType || '').toString().toLowerCase()
          bValue = (b.creativeType || '').toString().toLowerCase()
          break
        default:
          aValue = 0
          bValue = 0
      }

      if (sortField === 'adName' || sortField === 'creativeType') {
        if (sortDirection === 'asc') {
          return aValue.localeCompare(bValue)
        } else {
          return bValue.localeCompare(aValue)
        }
      }

      if (sortDirection === 'asc') {
        return aValue - bValue
      } else {
        return bValue - aValue
      }
    })

    return sortedItems
  }, [data, insightsMap, sortField, sortDirection])

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const handleViewDetails = (item: any) => {
    const insight =
      item.adIds && item.adIds.length > 0
        ? insightsMap.get(item.adIds[0])
        : insightsMap.get(item.adId)
    setSelectedItem(item)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setSelectedItem(null)
  }

  const formatNumber = (num: number) => new Intl.NumberFormat('ja-JP').format(Math.round(num))
  const formatPercentage = (num: number) => `${num.toFixed(2)}%`
  const formatDecimal = (num: number, decimals: number = 2) => num.toFixed(decimals)

  return (
    <div className="w-full max-w-none">
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {/* Type */}
                <th
                  className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                  style={{ width: '50px' }}
                >
                  Type
                </th>
                {/* Name */}
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  style={{ minWidth: '200px' }}
                  onClick={() => handleSort('adName')}
                >
                  <div className="flex items-center gap-1">
                    Creative Name
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
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {/* 集計行 */}
              <tr className="bg-blue-50 font-bold border-b-2 border-blue-200">
                <td className="px-2 py-3 whitespace-nowrap text-center text-sm text-blue-900">-</td>
                <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-blue-900">
                  合計
                </td>
                <td className="px-2 py-3 whitespace-nowrap text-center text-sm text-blue-900">
                  {sortedData.length > 0
                    ? formatDecimal(
                        sortedData.reduce((sum, item) => sum + (item.metrics?.frequency || 0), 0) /
                          sortedData.length
                      )
                    : '-'}
                </td>
                <td className="px-2 py-3 whitespace-nowrap text-center text-sm text-blue-900">
                  {formatNumber(sortedData.reduce((sum, item) => sum + (item.reach || 0), 0))}
                </td>
                <td className="px-2 py-3 whitespace-nowrap text-center text-sm text-blue-900">
                  {formatNumber(sortedData.reduce((sum, item) => sum + (item.impressions || 0), 0))}
                </td>
                <td className="px-2 py-3 whitespace-nowrap text-center text-sm text-blue-900">
                  {formatNumber(sortedData.reduce((sum, item) => sum + (item.clicks || 0), 0))}
                </td>
                <td className="px-2 py-3 whitespace-nowrap text-center text-sm text-blue-900">
                  {sortedData.reduce((sum, item) => sum + (item.impressions || 0), 0) > 0
                    ? formatPercentage(
                        (sortedData.reduce((sum, item) => sum + (item.clicks || 0), 0) /
                          sortedData.reduce((sum, item) => sum + (item.impressions || 0), 0)) *
                          100
                      )
                    : '-'}
                </td>
                <td className="px-2 py-3 whitespace-nowrap text-center text-sm text-blue-900">
                  {sortedData.length > 0
                    ? formatPercentage(
                        sortedData.reduce((sum, item) => sum + (item.metrics?.unique_ctr || 0), 0) /
                          sortedData.length
                      )
                    : '-'}
                </td>
                <td className="px-2 py-3 whitespace-nowrap text-center text-sm text-blue-900">
                  ¥
                  {sortedData.length > 0
                    ? formatNumber(
                        sortedData.reduce((sum, item) => sum + (item.metrics?.cpc || 0), 0) /
                          sortedData.length
                      )
                    : '0'}
                </td>
                <td className="px-2 py-3 whitespace-nowrap text-center text-sm text-blue-900">
                  ¥{formatNumber(sortedData.reduce((sum, item) => sum + (item.spend || 0), 0))}
                </td>
                <td className="px-2 py-3 whitespace-nowrap text-center text-sm text-blue-900">
                  {formatNumber(
                    sortedData.reduce((sum, item) => sum + (item.conversions_1d_click || 0), 0)
                  )}
                </td>
                <td className="px-2 py-3 whitespace-nowrap text-center text-sm text-purple-600">
                  {sortedData.length > 0 && sortedData[0].ecforce_cv_total !== undefined
                    ? formatNumber(sortedData[0].ecforce_cv_total)
                    : 'N/A'}
                </td>
                <td className="px-2 py-3 whitespace-nowrap text-center text-sm text-blue-900">
                  {sortedData.reduce((sum, item) => sum + (item.conversions || 0), 0) > 0
                    ? `¥${formatNumber(sortedData.reduce((sum, item) => sum + (item.spend || 0), 0) / sortedData.reduce((sum, item) => sum + (item.conversions || 0), 0))}`
                    : '-'}
                </td>
                <td className="px-2 py-3 whitespace-nowrap text-center text-sm text-blue-900">
                  ¥
                  {sortedData.length > 0
                    ? formatNumber(
                        sortedData.reduce((sum, item) => sum + (item.metrics?.cpm || 0), 0) /
                          sortedData.length
                      )
                    : '0'}
                </td>
              </tr>

              {/* データ行 */}
              {sortedData.map((item, index) => (
                <tr
                  key={`${item.adId}-${index}`}
                  className="hover:bg-blue-50 cursor-pointer transition-colors duration-150"
                  onClick={() => handleViewDetails(item)}
                  title="クリックして詳細を表示"
                >
                  {/* Type */}
                  <td className="px-2 py-3 whitespace-nowrap text-center">
                    <div className={`inline-flex ${getCreativeType(item.insight).color}`}>
                      {React.createElement(getCreativeType(item.insight).icon, {
                        className: 'h-5 w-5',
                      })}
                    </div>
                  </td>
                  {/* Name */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div
                      className="text-sm font-medium text-gray-900 truncate"
                      style={{ maxWidth: '300px' }}
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
                  {/* FRQ */}
                  <td className="px-2 py-3 whitespace-nowrap text-center text-sm">
                    <span
                      className={
                        item.metrics.frequency > 3.5 ? 'text-red-600 font-medium' : 'text-gray-900'
                      }
                    >
                      {formatDecimal(item.metrics.frequency || 0)}
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
                    {formatPercentage(item.metrics.ctr || 0)}
                  </td>
                  {/* U-CTR */}
                  <td className="px-2 py-3 whitespace-nowrap text-center text-sm text-gray-900">
                    {formatPercentage(item.metrics.unique_ctr || 0)}
                  </td>
                  {/* CPC */}
                  <td className="px-2 py-3 whitespace-nowrap text-center text-sm text-gray-900">
                    ¥{formatNumber(item.metrics.cpc || 0)}
                  </td>
                  {/* SPEND */}
                  <td className="px-2 py-3 whitespace-nowrap text-center text-sm text-gray-900">
                    ¥{formatNumber(item.spend)}
                  </td>
                  {/* F-CV */}
                  <td className="px-2 py-3 whitespace-nowrap text-center text-sm">
                    <div className="group relative cursor-help inline-block">
                      <span
                        className={
                          item.fcv_debug?.cv_fcv_valid === false
                            ? 'text-red-600 font-bold'
                            : 'text-gray-900'
                        }
                      >
                        {formatNumber(item.conversions_1d_click || 0)}
                      </span>
                      {process.env.NODE_ENV === 'development' && item.fcv_debug && (
                        <span className="ml-1 text-xs text-gray-400">
                          ({item.fcv_debug.unique_actions_value}/
                          {item.fcv_debug.unique_actions_1d_click})
                        </span>
                      )}
                      {item.fcv_debug && (
                        <div className="hidden group-hover:block absolute z-50 bg-gray-900 text-white text-xs rounded-lg p-3 bottom-full left-1/2 transform -translate-x-1/2 w-64 shadow-xl mb-2 pointer-events-none">
                          <div className="font-semibold mb-2">F-CV (ファーストコンバージョン)</div>
                          <div className="space-y-1">
                            <div className="flex justify-between">
                              <span className="text-gray-400">unique_actions:</span>
                              <span className="font-mono">
                                {item.fcv_debug.unique_actions_value || 0}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">1d_click:</span>
                              <span className="font-mono">
                                {item.fcv_debug.unique_actions_1d_click || 0}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">通常CV:</span>
                              <span className="font-mono">
                                {item.fcv_debug.conversions_value || 0}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">1d_click CV:</span>
                              <span className="font-mono">
                                {item.fcv_debug.conversions_1d_click || 0}
                              </span>
                            </div>
                            <div className="mt-2 pt-2 border-t border-gray-700">
                              <div className="flex justify-between">
                                <span className="text-gray-400">検証結果:</span>
                                <span
                                  className={
                                    item.fcv_debug.cv_fcv_valid === false
                                      ? 'text-red-400 font-bold'
                                      : 'text-green-400'
                                  }
                                >
                                  {item.fcv_debug.cv_fcv_valid === false ? '要確認' : '正常'}
                                </span>
                              </div>
                              {item.fcv_debug.cv_fcv_valid === false && (
                                <div className="mt-1 text-yellow-400 text-[10px]">
                                  CV ≠ F-CVのため、データに不整合があります
                                </div>
                              )}
                            </div>
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
                    ¥{formatNumber(item.metrics.cpm || 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 詳細モーダル */}
      {selectedItem && isModalOpen && (
        <CreativeDetailModal
          isOpen={isModalOpen}
          item={selectedItem}
          onClose={closeModal}
          insight={insightsMap.get(selectedItem.adId)}
          accessToken={accessToken}
          accountId={selectedAccountId || ''}
          dateRange={dateRange}
        />
      )}
    </div>
  )
}
