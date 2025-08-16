import React, { useState, useMemo } from 'react'
import {
  PhotoIcon,
  VideoCameraIcon,
  Squares2X2Icon,
  FunnelIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  EyeIcon,
  CursorArrowRaysIcon,
  BanknotesIcon,
} from '@heroicons/react/24/outline'
import { PlayIcon } from '@heroicons/react/24/solid'

export interface CreativeData {
  id: string
  name: string
  type: 'IMAGE' | 'VIDEO' | 'CAROUSEL'
  thumbnailUrl?: string
  videoUrl?: string
  campaignName: string
  metrics: {
    impressions: number
    clicks: number
    conversions: number
    spend: number
    revenue: number
    ctr: number
    cpc: number
    cpa: number
    roas: number
  }
  status: 'ACTIVE' | 'PAUSED' | 'DELETED'
}

interface CreativePerformanceGridProps {
  creatives?: CreativeData[]
  onCreativeClick?: (creative: CreativeData) => void
  viewMode?: 'grid' | 'list'
  isLoading?: boolean
  className?: string
}

const CREATIVE_TYPE_LABELS = {
  IMAGE: '画像',
  VIDEO: '動画',
  CAROUSEL: 'カルーセル',
}

const CREATIVE_TYPE_ICONS = {
  IMAGE: PhotoIcon,
  VIDEO: VideoCameraIcon,
  CAROUSEL: Squares2X2Icon,
}

const SORT_OPTIONS = [
  { value: 'impressions', label: 'インプレッション' },
  { value: 'clicks', label: 'クリック数' },
  { value: 'conversions', label: 'コンバージョン' },
  { value: 'revenue', label: '売上' },
  { value: 'ctr', label: 'CTR' },
  { value: 'roas', label: 'ROAS' },
]

export const CreativePerformanceGrid: React.FC<CreativePerformanceGridProps> = ({
  creatives = [],
  onCreativeClick,
  viewMode = 'grid',
  isLoading = false,
  className = '',
}) => {
  const [filterType, setFilterType] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('revenue')
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const filteredAndSortedCreatives = useMemo(() => {
    let filtered = creatives

    // Apply type filter
    if (filterType !== 'all') {
      filtered = filtered.filter((c) => c.type === filterType)
    }

    // Sort
    return [...filtered].sort((a, b) => {
      const aValue = a.metrics[sortBy as keyof typeof a.metrics]
      const bValue = b.metrics[sortBy as keyof typeof b.metrics]
      return Number(bValue) - Number(aValue)
    })
  }, [creatives, filterType, sortBy])

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('ja-JP').format(num)
  }

  const formatCurrency = (num: number): string => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
    }).format(num)
  }

  if (isLoading) {
    return (
      <div className={`bg-white shadow rounded-lg p-6 ${className}`}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              data-testid="creative-skeleton"
              className="bg-gray-100 rounded-lg h-64 animate-pulse"
            />
          ))}
        </div>
      </div>
    )
  }

  if (creatives.length === 0) {
    return (
      <div className={`bg-white shadow rounded-lg p-6 ${className}`}>
        <div className="text-center py-12">
          <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">クリエイティブがありません</h3>
          <p className="mt-1 text-sm text-gray-500">
            クリエイティブがアップロードされると、ここに表示されます。
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white shadow rounded-lg ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">クリエイティブパフォーマンス</h3>
          <div className="flex items-center space-x-4">
            {/* Type Filter */}
            <select
              aria-label="タイプで絞り込み"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="block rounded-md border-gray-300 py-1.5 pr-10 text-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="all">すべてのタイプ</option>
              <option value="IMAGE">画像</option>
              <option value="VIDEO">動画</option>
              <option value="CAROUSEL">カルーセル</option>
            </select>

            {/* Sort */}
            <select
              aria-label="並び替え"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="block rounded-md border-gray-300 py-1.5 pr-10 text-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}順
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {viewMode === 'grid' ? (
          <div
            data-testid="creative-grid"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {filteredAndSortedCreatives.map((creative) => {
              const TypeIcon = CREATIVE_TYPE_ICONS[creative.type]
              return (
                <div
                  key={creative.id}
                  data-testid={`creative-card-${creative.id}`}
                  className="relative bg-gray-50 rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => onCreativeClick?.(creative)}
                  onMouseEnter={() => setHoveredId(creative.id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  {/* Thumbnail */}
                  <div className="relative aspect-video bg-gray-200">
                    {creative.thumbnailUrl ? (
                      <>
                        <img
                          src={creative.thumbnailUrl}
                          alt={creative.name}
                          className="w-full h-full object-cover"
                        />
                        {creative.type === 'VIDEO' && hoveredId === creative.id && creative.videoUrl && (
                          <video
                            data-testid="video-preview"
                            src={creative.videoUrl}
                            className="absolute inset-0 w-full h-full object-cover"
                            autoPlay
                            muted
                            loop
                          />
                        )}
                        {creative.type === 'VIDEO' && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <PlayIcon className="h-12 w-12 text-white opacity-80" />
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <TypeIcon className="h-12 w-12 text-gray-400" />
                      </div>
                    )}
                    
                    {/* Type Badge */}
                    <div className="absolute top-2 left-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-gray-900 text-white">
                        {CREATIVE_TYPE_LABELS[creative.type]}
                      </span>
                    </div>
                    
                    {/* Status Badge */}
                    {creative.status !== 'ACTIVE' && (
                      <div className="absolute top-2 right-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-yellow-100 text-yellow-800">
                          {creative.status === 'PAUSED' ? '一時停止' : '削除済み'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <h4 data-testid="creative-name" className="text-sm font-medium text-gray-900 truncate">
                      {creative.name}
                    </h4>
                    <p className="text-xs text-gray-500 mt-1 truncate">{creative.campaignName}</p>

                    {/* Metrics */}
                    <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                      <div className="text-center">
                        <EyeIcon className="h-4 w-4 mx-auto text-gray-400 mb-1" />
                        <p className="text-gray-900 font-medium">{formatNumber(creative.metrics.impressions)}</p>
                        <p className="text-gray-500">表示</p>
                      </div>
                      <div className="text-center">
                        <CursorArrowRaysIcon className="h-4 w-4 mx-auto text-gray-400 mb-1" />
                        <p className="text-gray-900 font-medium">{creative.metrics.ctr.toFixed(2)}%</p>
                        <p className="text-gray-500">CTR</p>
                      </div>
                      <div className="text-center">
                        <BanknotesIcon className="h-4 w-4 mx-auto text-gray-400 mb-1" />
                        <p className="text-gray-900 font-medium">{creative.metrics.roas.toFixed(2)}x</p>
                        <p className="text-gray-500">ROAS</p>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div data-testid="creative-list" className="space-y-4">
            {filteredAndSortedCreatives.map((creative) => {
              const TypeIcon = CREATIVE_TYPE_ICONS[creative.type]
              return (
                <div
                  key={creative.id}
                  className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer"
                  onClick={() => onCreativeClick?.(creative)}
                >
                  {/* Thumbnail */}
                  <div className="flex-shrink-0 w-20 h-20 bg-gray-200 rounded">
                    {creative.thumbnailUrl ? (
                      <img
                        src={creative.thumbnailUrl}
                        alt={creative.name}
                        className="w-full h-full object-cover rounded"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <TypeIcon className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-medium text-gray-900 truncate">{creative.name}</h4>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                        {CREATIVE_TYPE_LABELS[creative.type]}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{creative.campaignName}</p>
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">表示</p>
                      <p className="font-medium">{formatNumber(creative.metrics.impressions)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">CTR</p>
                      <p className="font-medium">{creative.metrics.ctr.toFixed(2)}%</p>
                    </div>
                    <div>
                      <p className="text-gray-500">CPA</p>
                      <p className="font-medium">{formatCurrency(creative.metrics.cpa)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">ROAS</p>
                      <p className="font-medium">{creative.metrics.roas.toFixed(2)}x</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}