/**
 * 広告疲労度リストコンポーネント
 * 複数の広告の疲労度を一覧表示
 */

import React, { useState, useMemo } from 'react'
import {
  ChevronUpIcon,
  ChevronDownIcon,
  FunnelIcon,
  ArrowsUpDownIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  PhotoIcon,
  VideoCameraIcon,
  ViewColumnsIcon,
} from '@heroicons/react/24/outline'

interface AdFatigueItem {
  adId: string
  adName: string
  campaignName: string
  creativeType: 'image' | 'video' | 'carousel'
  thumbnailUrl?: string
  fatigueScore: number
  fatigueLevel: 'critical' | 'warning' | 'caution' | 'healthy'
  metrics: {
    impressions: number
    frequency: number
    ctr: number
    cpm: number
    spend: number
  }
  trends: {
    ctrChange: number
    frequencyChange: number
    cpmChange: number
  }
  lastUpdated: string
}

interface AdFatigueListProps {
  items: AdFatigueItem[]
  onItemClick?: (item: AdFatigueItem) => void
  className?: string
}

type SortField = 'fatigueScore' | 'impressions' | 'frequency' | 'ctr' | 'spend'
type SortOrder = 'asc' | 'desc'

export const AdFatigueList: React.FC<AdFatigueListProps> = ({
  items,
  onItemClick,
  className = ''
}) => {
  const [sortField, setSortField] = useState<SortField>('fatigueScore')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [filterLevel, setFilterLevel] = useState<'all' | 'critical' | 'warning' | 'caution' | 'healthy'>('all')
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

  // フィルタリングとソート
  const processedItems = useMemo(() => {
    let filtered = items
    if (filterLevel !== 'all') {
      filtered = items.filter(item => item.fatigueLevel === filterLevel)
    }

    return [...filtered].sort((a, b) => {
      let aValue: number, bValue: number
      
      switch (sortField) {
        case 'fatigueScore':
          aValue = a.fatigueScore
          bValue = b.fatigueScore
          break
        case 'impressions':
          aValue = a.metrics.impressions
          bValue = b.metrics.impressions
          break
        case 'frequency':
          aValue = a.metrics.frequency
          bValue = b.metrics.frequency
          break
        case 'ctr':
          aValue = a.metrics.ctr
          bValue = b.metrics.ctr
          break
        case 'spend':
          aValue = a.metrics.spend
          bValue = b.metrics.spend
          break
        default:
          aValue = 0
          bValue = 0
      }

      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue
    })
  }, [items, filterLevel, sortField, sortOrder])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
  }

  const toggleExpanded = (adId: string) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(adId)) {
      newExpanded.delete(adId)
    } else {
      newExpanded.add(adId)
    }
    setExpandedItems(newExpanded)
  }

  const getCreativeIcon = (type: 'image' | 'video' | 'carousel') => {
    switch (type) {
      case 'image':
        return <PhotoIcon className="h-4 w-4" />
      case 'video':
        return <VideoCameraIcon className="h-4 w-4" />
      case 'carousel':
        return <ViewColumnsIcon className="h-4 w-4" />
    }
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200'
      case 'warning':
        return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'caution':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'healthy':
        return 'text-green-600 bg-green-50 border-green-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getTrendIcon = (value: number) => {
    if (value > 0) return <ChevronUpIcon className="h-3 w-3 text-red-500" />
    if (value < 0) return <ChevronDownIcon className="h-3 w-3 text-green-500" />
    return null
  }

  // 統計情報
  const stats = useMemo(() => {
    return {
      total: items.length,
      critical: items.filter(i => i.fatigueLevel === 'critical').length,
      warning: items.filter(i => i.fatigueLevel === 'warning').length,
      caution: items.filter(i => i.fatigueLevel === 'caution').length,
      healthy: items.filter(i => i.fatigueLevel === 'healthy').length,
    }
  }, [items])

  return (
    <div className={`bg-white rounded-lg shadow-lg ${className}`}>
      {/* ヘッダー */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">広告疲労度一覧</h3>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">
              {processedItems.length} / {items.length} 件
            </span>
          </div>
        </div>

        {/* 統計サマリー */}
        <div className="grid grid-cols-5 gap-2 mb-4">
          <button
            onClick={() => setFilterLevel('all')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterLevel === 'all' 
                ? 'bg-gray-900 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            全て ({stats.total})
          </button>
          <button
            onClick={() => setFilterLevel('critical')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterLevel === 'critical' 
                ? 'bg-red-600 text-white' 
                : 'bg-red-50 text-red-700 hover:bg-red-100'
            }`}
          >
            危険 ({stats.critical})
          </button>
          <button
            onClick={() => setFilterLevel('warning')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterLevel === 'warning' 
                ? 'bg-orange-600 text-white' 
                : 'bg-orange-50 text-orange-700 hover:bg-orange-100'
            }`}
          >
            警告 ({stats.warning})
          </button>
          <button
            onClick={() => setFilterLevel('caution')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterLevel === 'caution' 
                ? 'bg-yellow-600 text-white' 
                : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
            }`}
          >
            注意 ({stats.caution})
          </button>
          <button
            onClick={() => setFilterLevel('healthy')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterLevel === 'healthy' 
                ? 'bg-green-600 text-white' 
                : 'bg-green-50 text-green-700 hover:bg-green-100'
            }`}
          >
            健全 ({stats.healthy})
          </button>
        </div>

        {/* ソートオプション */}
        <div className="flex items-center space-x-2 text-sm">
          <FunnelIcon className="h-4 w-4 text-gray-500" />
          <span className="text-gray-500">並び替え:</span>
          <div className="flex space-x-1">
            {(['fatigueScore', 'impressions', 'frequency', 'ctr', 'spend'] as SortField[]).map(field => (
              <button
                key={field}
                onClick={() => handleSort(field)}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                  sortField === field 
                    ? 'bg-indigo-100 text-indigo-700' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {field === 'fatigueScore' && '疲労度'}
                {field === 'impressions' && '表示回数'}
                {field === 'frequency' && '頻度'}
                {field === 'ctr' && 'CTR'}
                {field === 'spend' && '費用'}
                {sortField === field && (
                  <ArrowsUpDownIcon className="inline-block h-3 w-3 ml-1" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* リスト */}
      <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
        {processedItems.map(item => {
          const isExpanded = expandedItems.has(item.adId)
          
          return (
            <div key={item.adId} className="hover:bg-gray-50 transition-colors">
              {/* メイン行 */}
              <div
                className="px-6 py-4 cursor-pointer"
                onClick={() => {
                  toggleExpanded(item.adId)
                  onItemClick?.(item)
                }}
              >
                <div className="flex items-center justify-between">
                  {/* 左側: 広告情報 */}
                  <div className="flex items-center space-x-4 flex-1">
                    {/* サムネイル */}
                    <div className="relative w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                      {item.thumbnailUrl ? (
                        <img 
                          src={item.thumbnailUrl} 
                          alt={item.adName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          {getCreativeIcon(item.creativeType)}
                        </div>
                      )}
                      <div className="absolute top-1 right-1 bg-white rounded p-1">
                        {getCreativeIcon(item.creativeType)}
                      </div>
                    </div>

                    {/* 広告名とキャンペーン */}
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{item.adName}</h4>
                      <p className="text-sm text-gray-500">{item.campaignName}</p>
                    </div>
                  </div>

                  {/* 右側: メトリクスとスコア */}
                  <div className="flex items-center space-x-6">
                    {/* 主要メトリクス */}
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="text-center">
                        <div className="text-gray-500">表示回数</div>
                        <div className="font-medium">{item.metrics.impressions.toLocaleString()}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-gray-500">頻度</div>
                        <div className="font-medium flex items-center justify-center">
                          {item.metrics.frequency.toFixed(1)}
                          {getTrendIcon(item.trends.frequencyChange)}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-gray-500">CTR</div>
                        <div className="font-medium flex items-center justify-center">
                          {item.metrics.ctr.toFixed(2)}%
                          {getTrendIcon(item.trends.ctrChange)}
                        </div>
                      </div>
                    </div>

                    {/* 疲労度スコア */}
                    <div className="text-center">
                      <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full border-2 ${getLevelColor(item.fatigueLevel)}`}>
                        <div>
                          <div className="text-2xl font-bold">{item.fatigueScore}</div>
                          <div className="text-xs">
                            {item.fatigueLevel === 'critical' && '危険'}
                            {item.fatigueLevel === 'warning' && '警告'}
                            {item.fatigueLevel === 'caution' && '注意'}
                            {item.fatigueLevel === 'healthy' && '健全'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 展開アイコン */}
                    <ChevronDownIcon className={`h-5 w-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </div>
                </div>
              </div>

              {/* 展開時の詳細情報 */}
              {isExpanded && (
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                  <div className="grid grid-cols-2 gap-6">
                    {/* 詳細メトリクス */}
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-3">詳細メトリクス</h5>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">CPM</span>
                          <span className="font-medium">
                            ¥{item.metrics.cpm.toFixed(0)}
                            {item.trends.cpmChange !== 0 && (
                              <span className={item.trends.cpmChange > 0 ? 'text-red-500' : 'text-green-500'}>
                                {' '}({item.trends.cpmChange > 0 ? '+' : ''}{item.trends.cpmChange.toFixed(1)}%)
                              </span>
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">総費用</span>
                          <span className="font-medium">¥{item.metrics.spend.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">最終更新</span>
                          <span className="font-medium">{new Date(item.lastUpdated).toLocaleString('ja-JP')}</span>
                        </div>
                      </div>
                    </div>

                    {/* 推奨アクション */}
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-3">推奨アクション</h5>
                      <div className="space-y-2">
                        {item.fatigueLevel === 'critical' && (
                          <div className="flex items-start space-x-2 text-sm">
                            <ExclamationTriangleIcon className="h-4 w-4 text-red-500 mt-0.5" />
                            <span className="text-gray-700">この広告は即座に停止し、新しいクリエイティブに置き換えることを強く推奨します</span>
                          </div>
                        )}
                        {item.fatigueLevel === 'warning' && (
                          <div className="flex items-start space-x-2 text-sm">
                            <ExclamationTriangleIcon className="h-4 w-4 text-orange-500 mt-0.5" />
                            <span className="text-gray-700">フリークエンシーキャップの設定や、ターゲティングの見直しを検討してください</span>
                          </div>
                        )}
                        {item.fatigueLevel === 'caution' && (
                          <div className="flex items-start space-x-2 text-sm">
                            <ExclamationTriangleIcon className="h-4 w-4 text-yellow-500 mt-0.5" />
                            <span className="text-gray-700">パフォーマンスを注視し、新しいバリエーションのテストを開始してください</span>
                          </div>
                        )}
                        {item.fatigueLevel === 'healthy' && (
                          <div className="flex items-start space-x-2 text-sm">
                            <CheckCircleIcon className="h-4 w-4 text-green-500 mt-0.5" />
                            <span className="text-gray-700">現在のパフォーマンスは良好です。継続的にモニタリングしてください</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* 空状態 */}
      {processedItems.length === 0 && (
        <div className="px-6 py-12 text-center">
          <div className="text-gray-500">
            {filterLevel === 'all' 
              ? '広告データがありません' 
              : `${filterLevel}レベルの広告はありません`}
          </div>
        </div>
      )}
    </div>
  )
}