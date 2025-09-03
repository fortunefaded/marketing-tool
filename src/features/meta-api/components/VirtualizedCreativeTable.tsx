import React, { useState, useCallback, useMemo } from 'react'
import { FixedSizeList as List } from 'react-window'
import {
  ChevronUpIcon,
  ChevronDownIcon,
  PhotoIcon,
  VideoCameraIcon,
  DocumentTextIcon,
  ViewColumnsIcon,
} from '@heroicons/react/24/outline'
import { FatigueData } from '@/types'
import { normalizeCreativeMediaType } from '../utils/creative-type'
import { CreativeDetailModal } from './CreativeDetailModal'
import { getSafeMetrics } from '../utils/safe-data-access'
import { aggregateCreativesByName, AggregatedCreative } from '../utils/creative-aggregation'

interface VirtualizedCreativeTableProps {
  data: FatigueData[]
  insights: any[]
  selectedAccountId: string | null
  isLoading: boolean
}

export function VirtualizedCreativeTable({
  data,
  insights,
  selectedAccountId: _,
  isLoading,
}: VirtualizedCreativeTableProps) {
  // ソート状態管理
  const [sortField, setSortField] = useState<string>('score')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  
  // モーダル状態管理
  const [selectedItem, setSelectedItem] = useState<FatigueData | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // クリエイティブタイプを判定する関数
  const getCreativeType = (insight: any): { type: string; icon: any; color: string } => {
    if (!insight) return { type: 'UNKNOWN', icon: DocumentTextIcon, color: 'text-gray-500' }

    const objectType =
      insight.creative?.object_type || insight.creative_type || insight.creative_media_type
    const normalizedType = normalizeCreativeMediaType(objectType)

    if (normalizedType === 'text') {
      if (insight.video_url || insight.video_id) {
        return { type: 'VIDEO', icon: VideoCameraIcon, color: 'text-purple-600' }
      }
      if (insight.image_url || insight.thumbnail_url) {
        return { type: 'IMAGE', icon: PhotoIcon, color: 'text-blue-600' }
      }
    }

    switch (normalizedType) {
      case 'video':
        return { type: 'VIDEO', icon: VideoCameraIcon, color: 'text-purple-600' }
      case 'image':
        return { type: 'IMAGE', icon: PhotoIcon, color: 'text-blue-600' }
      case 'carousel':
        return { type: 'CAROUSEL', icon: ViewColumnsIcon, color: 'text-green-600' }
      default:
        return { type: 'TEXT', icon: DocumentTextIcon, color: 'text-gray-600' }
    }
  }

  // insightsをマップ化
  const insightsMap = useMemo(() => {
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

  // データを集約してからソート
  const sortedData = useMemo(() => {
    if (!data || !Array.isArray(data)) return []

    // まずクリエイティブ名で集約
    const aggregated = aggregateCreativesByName(data)
    
    // 各集約データにクリエイティブタイプ情報を追加
    const items = aggregated.map((item) => {
      // 最初の広告IDでinsightを取得
      const insight = item.adIds.length > 0 ? insightsMap.get(item.adIds[0]) : null
      const creativeInfo = getCreativeType(insight || item.originalInsight)

      return {
        ...item,
        adId: item.adIds[0] || '', // 代表ID
        creativeType: creativeInfo.type,
        creativeIcon: creativeInfo.icon,
        creativeColor: creativeInfo.color,
        score: item.fatigue_score,
        revenue: item.conversion_values,
        insight: insight || item.originalInsight,
      }
    })

    // ソート処理
    items.sort((a, b) => {
      let aValue: any = 0
      let bValue: any = 0

      switch (sortField) {
        case 'adName':
          aValue = a.adName.toLowerCase()
          bValue = b.adName.toLowerCase()
          break
        case 'creativeType':
          aValue = a.creativeType.toLowerCase()
          bValue = b.creativeType.toLowerCase()
          break
        default:
          aValue = Number(a[sortField as keyof typeof a]) || 0
          bValue = Number(b[sortField as keyof typeof b]) || 0
      }

      if (typeof aValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      }

      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue
    })

    return items
  }, [data, insightsMap, sortField, sortDirection])

  const handleSort = useCallback((field: string) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }, [sortField])

  const handleViewDetails = useCallback((item: any) => {
    setSelectedItem(item)
    setIsModalOpen(true)
  }, [])

  const closeModal = useCallback(() => {
    setIsModalOpen(false)
    setSelectedItem(null)
  }, [])

  const formatNumber = (num: number) => new Intl.NumberFormat('ja-JP').format(Math.round(num))
  const formatCurrency = (num: number) => `¥${formatNumber(num)}`
  const formatPercentage = (num: number) => `${num.toFixed(2)}%`

  // 行のレンダリング関数
  const Row = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const item = sortedData[index]
    if (!item) return null

    const CreativeIcon = item.creativeIcon

    return (
      <div style={style} className="flex items-center border-b border-gray-200 hover:bg-gray-50">
        {/* タイプ */}
        <div className="flex items-center justify-center" style={{ width: '80px' }}>
          <CreativeIcon className={`h-5 w-5 ${item.creativeColor}`} />
        </div>
        
        {/* クリエイティブ名 */}
        <div className="px-4 truncate" style={{ width: '300px' }}>
          <button
            onClick={() => handleViewDetails(item)}
            className="text-left text-sm text-blue-600 hover:text-blue-800 hover:underline truncate block w-full"
            title={item.adName}
          >
            {item.adName}
          </button>
        </div>

        {/* 疲労度 */}
        <div className="text-center" style={{ width: '80px' }}>
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
            item.score >= 70
              ? 'bg-red-100 text-red-800'
              : item.score >= 40
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-green-100 text-green-800'
          }`}>
            {Math.round(item.score)}
          </span>
        </div>

        {/* メトリクス */}
        <div className="text-center text-sm" style={{ width: '70px' }}>
          {item.frequency.toFixed(2)}
        </div>
        <div className="text-center text-sm" style={{ width: '70px' }}>
          {formatPercentage(item.ctr)}
        </div>
        <div className="text-center text-sm" style={{ width: '70px' }}>
          {formatPercentage(item.unique_ctr)}
        </div>
        <div className="text-center text-sm" style={{ width: '80px' }}>
          {formatCurrency(item.cpm)}
        </div>
        <div className="text-center text-sm" style={{ width: '80px' }}>
          {formatCurrency(item.cpc)}
        </div>
        <div className="text-center text-sm" style={{ width: '100px' }}>
          {formatNumber(item.impressions)}
        </div>
        <div className="text-center text-sm" style={{ width: '80px' }}>
          {formatNumber(item.clicks)}
        </div>
        <div className="text-center text-sm" style={{ width: '100px' }}>
          {formatCurrency(item.spend)}
        </div>
        <div className="text-center text-sm" style={{ width: '75px' }}>
          {formatNumber(item.conversions)}
        </div>
        <div className="text-center text-sm" style={{ width: '90px' }}>
          {formatCurrency(item.cpa)}
        </div>
        <div className="text-center text-sm" style={{ width: '100px' }}>
          {formatCurrency(item.revenue)}
        </div>
        <div className="text-center text-sm" style={{ width: '80px' }}>
          {item.roas.toFixed(2)}x
        </div>
      </div>
    )
  }, [sortedData, handleViewDetails, formatNumber, formatCurrency, formatPercentage])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">データを読み込み中...</div>
      </div>
    )
  }

  if (!sortedData || sortedData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">データがありません</div>
      </div>
    )
  }

  // ヘッダーのカラム定義
  const columns = [
    { field: 'creativeType', label: 'タイプ', width: 80 },
    { field: 'adName', label: 'クリエイティブ名', width: 300 },
    { field: 'score', label: '疲労度', width: 80 },
    { field: 'frequency', label: 'Freq', width: 70 },
    { field: 'ctr', label: 'CTR', width: 70 },
    { field: 'unique_ctr', label: 'U-CTR', width: 70 },
    { field: 'cpm', label: 'CPM', width: 80 },
    { field: 'cpc', label: 'CPC', width: 80 },
    { field: 'impressions', label: 'IMP', width: 100 },
    { field: 'clicks', label: 'クリック', width: 80 },
    { field: 'spend', label: '消化金額', width: 100 },
    { field: 'conversions', label: 'CV', width: 75 },
    { field: 'cpa', label: 'CPA', width: 90 },
    { field: 'revenue', label: '売上', width: 100 },
    { field: 'roas', label: 'ROAS', width: 80 },
  ]

  const totalWidth = columns.reduce((sum, col) => sum + col.width, 0)

  return (
    <div className="w-full max-w-none">
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {/* ヘッダー */}
        <div className="overflow-x-auto">
          <div className="bg-gray-50 border-b border-gray-200" style={{ width: `${totalWidth}px` }}>
            <div className="flex">
              {columns.map((col) => (
                <div
                  key={col.field}
                  className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  style={{ width: `${col.width}px` }}
                  onClick={() => handleSort(col.field)}
                >
                  <div className="flex items-center justify-center gap-1">
                    {col.label}
                    {sortField === col.field && (
                      sortDirection === 'asc' ? (
                        <ChevronUpIcon className="h-3 w-3" />
                      ) : (
                        <ChevronDownIcon className="h-3 w-3" />
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 仮想スクロールリスト */}
          <List
            height={600} // 表示領域の高さ
            itemCount={sortedData.length}
            itemSize={48} // 各行の高さ
            width={totalWidth}
          >
            {Row}
          </List>
        </div>
      </div>

      {/* 詳細モーダル */}
      {selectedItem && (
        <CreativeDetailModal
          isOpen={isModalOpen}
          onClose={closeModal}
          data={selectedItem}
          insight={selectedItem.insight}
        />
      )}
    </div>
  )
}