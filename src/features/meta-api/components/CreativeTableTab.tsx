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

    // URLベースの判定
    if (insight.video_url || insight.video_id) {
      return { type: 'VIDEO', icon: VideoCameraIcon, color: 'text-purple-600' }
    }
    if (insight.image_url || insight.thumbnail_url) {
      return { type: 'IMAGE', icon: PhotoIcon, color: 'text-blue-600' }
    }

    // Meta APIのobject_typeから判定
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
          // デフォルトは画像として扱う（多くの広告は画像）
          return { type: 'IMAGE', icon: PhotoIcon, color: 'text-blue-600' }
      }
    }

    // デフォルトは画像（TEXTではなく）
    return { type: 'IMAGE', icon: PhotoIcon, color: 'text-blue-600' }
  }

  // ソート状態管理
  const [sortField, setSortField] = useState<string>('score')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  // モーダル状態管理
  const [selectedItem, setSelectedItem] = useState<FatigueData | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // insightsをマップ化
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

  // データを拡張してソート
  const sortedData = React.useMemo(() => {
    console.log('sortedData recalculating:', { sortField, sortDirection, dataLength: data?.length })

    // デバッグ情報を出力（開発環境のみ）
    debugDataStructure(data, 'CreativeTableTab Input Data')

    // データのnullチェック
    if (!data || !Array.isArray(data) || data.length === 0) {
      console.warn('CreativeTableTab: No valid data')
      return []
    }

    // クリエイティブ名で集約（正規化せずに直接渡す）
    const aggregatedCreatives = aggregateCreativesByName(data)
    console.log('CreativeTableTab: Aggregated creatives:', {
      originalCount: data.length,
      aggregatedCount: aggregatedCreatives.length,
    })

    // 疲労度データの詳細をログ出力（安全）
    console.log(
      '📊 疲労度データの詳細:',
      aggregatedCreatives.slice(0, 5).map((d) => ({
        adName: d.adName,
        score: d.fatigue_score,
        status: 'normal',
        frequency: d.frequency,
        ctr: d.ctr,
        cpm: d.cpm,
      }))
    )

    const enrichedData = aggregatedCreatives.map((item) => {
      // 集約されたクリエイティブの最初のIDからinsightを取得
      const insight = item.adIds.length > 0 ? insightsMap.get(item.adIds[0]) : null
      // 集約データのメトリクスを直接使用
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

      // ステータスを計算（疲労度スコアベース）
      // 疲労度スコアが未計算（-1）の場合は'unknown'
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
        // 元のデータ構造との互換性を保つためのマッピング
        adId: item.adIds[0], // 最初のIDを代表として使用
        adIds: item.adIds, // 全てのIDを保持
        adName: item.adName,
        campaignId: item.campaignId,
        campaignName: item.campaignName,
        adsetId: item.adsetId,
        adsetName: item.adsetName,
        score: item.fatigue_score,
        status: status,
        metrics: metrics,

        // インサイトデータ
        insight,

        // 集約されたメトリクスを使用
        impressions: item.impressions,
        clicks: item.clicks,
        spend: item.spend,
        conversions: item.conversions,
        conversions_1d_click: item.conversions_1d_click,
        fcv_debug: item.fcv_debug,

        // ECForceデータを追加
        ecforce_cv: item.ecforce_cv || 0,
        ecforce_fcv: item.ecforce_fcv || 0,
        ecforce_cpa: item.ecforce_cpa,
        ecforce_cv_total: item.ecforce_cv_total || 0, // 合計値を保持
        ecforce_fcv_total: item.ecforce_fcv_total || 0, // 合計値を保持

        // 計算メトリクス（集約データから）
        cpa: item.cpa,
        roas: item.roas,
        cvr: item.conversions > 0 && item.clicks > 0 ? (item.conversions / item.clicks) * 100 : 0,
        revenue: item.conversion_values,
        // クリエイティブタイプ
        creativeType: getCreativeType(insight).type,
      }
    })

    // ソート処理を分離して確実に実行
    const sortedItems = [...enrichedData].sort((a, b) => {
      let aValue: any, bValue: any

      // フィールド値を取得
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
        case 'roas':
          aValue = Number(a.roas) || 0
          bValue = Number(b.roas) || 0
          break
        case 'creativeType':
          aValue = (a.creativeType || '').toString().toLowerCase()
          bValue = (b.creativeType || '').toString().toLowerCase()
          break
        default:
          aValue = 0
          bValue = 0
      }

      // 文字列の場合
      if (sortField === 'adName' || sortField === 'creativeType') {
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

    console.log('sortedData result:', {
      length: sortedItems.length,
      sortField,
      sortDirection,
      firstValue:
        sortedItems[0]?.[sortField as keyof (typeof sortedItems)[0]] ||
        (sortedItems[0]?.metrics as any)?.[sortField] ||
        sortedItems[0]?.score,
      lastValue:
        sortedItems[sortedItems.length - 1]?.[sortField as keyof (typeof sortedItems)[0]] ||
        (sortedItems[sortedItems.length - 1]?.metrics as any)?.[sortField] ||
        sortedItems[sortedItems.length - 1]?.score,
    })

    return sortedItems
  }, [data, insightsMap, sortField, sortDirection])

  const handleSort = (field: string) => {
    console.log('handleSort called:', {
      field,
      currentSortField: sortField,
      currentDirection: sortDirection,
    })

    if (sortField === field) {
      const newDirection = sortDirection === 'asc' ? 'desc' : 'asc'
      setSortDirection(newDirection)
      console.log('Same field, toggling direction to:', newDirection)
    } else {
      setSortField(field)
      setSortDirection('desc')
      console.log('New field, setting:', { field, direction: 'desc' })
    }
  }

  const handleViewDetails = (item: any) => {
    // 集約されたクリエイティブの最初のIDからinsightを取得
    const insight =
      item.adIds && item.adIds.length > 0
        ? insightsMap.get(item.adIds[0])
        : insightsMap.get(item.adId)
    const creativeInfo = getCreativeType(insight)

    console.log('詳細表示:', {
      adId: item.adId,
      adIds: item.adIds,
      adName: item.adName,
      creativeType: creativeInfo.type,
      fatigueScore: item.score,
      metrics: item.metrics,
      dailyData: item.dailyData,
      insight: insight,
      urls: {
        image: insight?.image_url,
        video: insight?.video_url,
        thumbnail: insight?.thumbnail_url,
      },
    })

    // モーダルを開く
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

  console.log('CreativeTableTab rendered:', {
    dataLength: data?.length,
    insightsLength: insights?.length,
    isLoading,
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
                <th
                  className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  style={{ width: '80px' }}
                  onClick={() => handleSort('score')}
                >
                  <div className="flex items-center justify-center gap-1">
                    疲労度
                    {sortField === 'score' &&
                      (sortDirection === 'asc' ? (
                        <ChevronUpIcon className="h-3 w-3" />
                      ) : (
                        <ChevronDownIcon className="h-3 w-3" />
                      ))}
                  </div>
                </th>
                <th
                  className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  style={{ width: '70px' }}
                  onClick={() => handleSort('frequency')}
                >
                  <div className="flex items-center justify-center gap-1">
                    Freq
                    {sortField === 'frequency' &&
                      (sortDirection === 'asc' ? (
                        <ChevronUpIcon className="h-3 w-3" />
                      ) : (
                        <ChevronDownIcon className="h-3 w-3" />
                      ))}
                  </div>
                </th>
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
                <th
                  className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  style={{ width: '80px' }}
                  onClick={() => handleSort('clicks')}
                >
                  <div className="flex items-center justify-center gap-1">
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
                  className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  style={{ width: '100px' }}
                  onClick={() => handleSort('spend')}
                >
                  <div className="flex items-center justify-center gap-1">
                    消化金額
                    {sortField === 'spend' &&
                      (sortDirection === 'asc' ? (
                        <ChevronUpIcon className="h-3 w-3" />
                      ) : (
                        <ChevronDownIcon className="h-3 w-3" />
                      ))}
                  </div>
                </th>
                <th
                  className="px-2 py-3 text-center text-xs font-medium text-purple-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  style={{ width: '75px' }}
                  onClick={() => handleSort('conversions')}
                >
                  <div className="flex items-center justify-center gap-1">
                    <div className="flex flex-col items-center">
                      <span>CV</span>
                      <span className="text-[10px] text-purple-500">(ecforce)</span>
                    </div>
                    {sortField === 'conversions' &&
                      (sortDirection === 'asc' ? (
                        <ChevronUpIcon className="h-3 w-3" />
                      ) : (
                        <ChevronDownIcon className="h-3 w-3" />
                      ))}
                  </div>
                </th>
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
                <th
                  className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  style={{ width: '80px' }}
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
                <th
                  className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  style={{ width: '100px' }}
                  onClick={() => handleSort('revenue')}
                >
                  <div className="flex items-center justify-center gap-1">
                    売上
                    {sortField === 'revenue' &&
                      (sortDirection === 'asc' ? (
                        <ChevronUpIcon className="h-3 w-3" />
                      ) : (
                        <ChevronDownIcon className="h-3 w-3" />
                      ))}
                  </div>
                </th>
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
                <th
                  className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                  style={{ width: '90px' }}
                >
                  ステータス
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
                {/* 疲労度 */}
                <td className="px-2 py-3 whitespace-nowrap text-center text-sm text-blue-900">-</td>
                {/* Frequency */}
                <td className="px-2 py-3 whitespace-nowrap text-center text-sm text-blue-900">
                  {sortedData.length > 0
                    ? formatDecimal(
                        sortedData.reduce((sum, item) => sum + (item.metrics?.frequency || 0), 0) /
                          sortedData.length
                      )
                    : '-'}
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
                {/* IMP */}
                <td className="px-2 py-3 whitespace-nowrap text-center text-sm text-blue-900">
                  {formatNumber(sortedData.reduce((sum, item) => sum + (item.impressions || 0), 0))}
                </td>
                {/* クリック */}
                <td className="px-2 py-3 whitespace-nowrap text-center text-sm text-blue-900">
                  {formatNumber(sortedData.reduce((sum, item) => sum + (item.clicks || 0), 0))}
                </td>
                {/* 消化金額 */}
                <td className="px-2 py-3 whitespace-nowrap text-center text-sm text-blue-900">
                  ¥{formatNumber(sortedData.reduce((sum, item) => sum + (item.spend || 0), 0))}
                </td>
                {/* CV */}
                <td className="px-2 py-3 whitespace-nowrap text-center text-sm text-purple-600">
                  {/* ECForceの合計値を表示（最初のアイテムから取得） */}
                  {sortedData.length > 0 && sortedData[0].ecforce_cv_total !== undefined
                    ? formatNumber(sortedData[0].ecforce_cv_total)
                    : 'N/A'}
                </td>
                {/* F-CV */}
                <td className="px-2 py-3 whitespace-nowrap text-center text-sm text-blue-900">
                  {formatNumber(
                    sortedData.reduce((sum, item) => sum + (item.conversions_1d_click || 0), 0)
                  )}
                </td>
                {/* CPA */}
                <td className="px-2 py-3 whitespace-nowrap text-center text-sm text-blue-900">
                  {sortedData.reduce((sum, item) => sum + (item.conversions || 0), 0) > 0
                    ? `¥${formatNumber(
                        sortedData.reduce((sum, item) => sum + (item.spend || 0), 0) /
                          sortedData.reduce((sum, item) => sum + (item.conversions || 0), 0)
                      )}`
                    : '-'}
                </td>
                {/* 売上 */}
                <td className="px-2 py-3 whitespace-nowrap text-center text-sm text-blue-900">
                  {sortedData.reduce((sum, item) => sum + (item.revenue || 0), 0) > 0
                    ? `¥${formatNumber(sortedData.reduce((sum, item) => sum + (item.revenue || 0), 0))}`
                    : '-'}
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
                {/* ステータス */}
                <td className="px-2 py-3 whitespace-nowrap text-center text-sm text-blue-900">-</td>
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

                  {/* 疲労度スコア */}
                  <td className="px-2 py-3 whitespace-nowrap text-center">
                    {item.score < 0 ? (
                      <span className="text-gray-400 text-sm">-</span>
                    ) : (
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          item.score >= 80
                            ? 'bg-red-100 text-red-800'
                            : item.score >= 60
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-green-100 text-green-800'
                        }`}
                        title={`総合疲労度スコア: ${item.score}`}
                      >
                        {item.score}
                      </span>
                    )}
                  </td>

                  {/* Frequency */}
                  <td className="px-2 py-3 whitespace-nowrap text-center text-sm">
                    <span
                      className={
                        item.metrics.frequency > 3.5 ? 'text-red-600 font-medium' : 'text-gray-900'
                      }
                    >
                      {formatDecimal(item.metrics.frequency || 0)}
                    </span>
                  </td>

                  {/* CTR */}
                  <td className="px-2 py-3 whitespace-nowrap text-center text-sm text-gray-900">
                    {formatPercentage(item.metrics.ctr || 0)}
                  </td>

                  {/* Unique CTR */}
                  <td className="px-2 py-3 whitespace-nowrap text-center text-sm text-gray-900">
                    {formatPercentage(item.metrics.unique_ctr || 0)}
                  </td>

                  {/* CPM */}
                  <td className="px-2 py-3 whitespace-nowrap text-center text-sm text-gray-900">
                    ¥{formatNumber(item.metrics.cpm || 0)}
                  </td>

                  {/* CPC */}
                  <td className="px-2 py-3 whitespace-nowrap text-center text-sm text-gray-900">
                    ¥{formatNumber(item.metrics.cpc || 0)}
                  </td>

                  {/* インプレッション */}
                  <td className="px-2 py-3 whitespace-nowrap text-center text-sm text-gray-900">
                    {formatNumber(item.impressions)}
                  </td>

                  {/* クリック数 */}
                  <td className="px-2 py-3 whitespace-nowrap text-center text-sm text-gray-900">
                    {formatNumber(item.clicks)}
                  </td>

                  {/* 消化金額 */}
                  <td className="px-2 py-3 whitespace-nowrap text-center text-sm text-gray-900">
                    ¥{formatNumber(item.spend)}
                  </td>

                  {/* コンバージョン */}
                  <td className="px-2 py-3 whitespace-nowrap text-center text-sm text-gray-900">
                    {formatNumber(item.conversions)}
                  </td>

                  {/* ファーストCV */}
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

                  {/* CPA */}
                  <td className="px-2 py-3 whitespace-nowrap text-center text-sm text-gray-900">
                    {item.conversions > 0 ? `¥${formatNumber(item.cpa)}` : '-'}
                  </td>

                  {/* 売上 */}
                  <td className="px-2 py-3 whitespace-nowrap text-center text-sm text-gray-900">
                    {item.revenue > 0 ? `¥${formatNumber(item.revenue)}` : '-'}
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

                  {/* ステータス */}
                  <td className="px-2 py-3 whitespace-nowrap text-center">
                    {item.status === 'unknown' ? (
                      <span className="text-gray-400 text-sm">未計算</span>
                    ) : (
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          item.status === 'critical'
                            ? 'bg-red-100 text-red-800'
                            : item.status === 'warning'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {item.status}
                      </span>
                    )}
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
