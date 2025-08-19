import React, { useState, useMemo } from 'react'
import {
  PhotoIcon,
  VideoCameraIcon,
  Squares2X2Icon,
  ArrowsRightLeftIcon,
  SparklesIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  PlayIcon,
  ChartBarIcon,
  UserGroupIcon,
  MapPinIcon,
  CursorArrowRaysIcon,
} from '@heroicons/react/24/outline'
import { EnhancedCreativeData } from '../../services/creativeDataAggregator'

interface EnhancedMetricsTableProps {
  data: EnhancedCreativeData[]
  isLoading?: boolean
  onCreativeClick?: (creative: EnhancedCreativeData) => void
  showVideoMetrics?: boolean
  showDemographics?: boolean
  showPlacements?: boolean
  showTargeting?: boolean
}

const CREATIVE_TYPE_ICONS = {
  IMAGE: PhotoIcon,
  VIDEO: VideoCameraIcon,
  CAROUSEL: Squares2X2Icon,
  COLLECTION: ArrowsRightLeftIcon,
  DYNAMIC: SparklesIcon,
}

const CREATIVE_TYPE_LABELS = {
  IMAGE: '画像',
  VIDEO: '動画',
  CAROUSEL: 'カルーセル',
  COLLECTION: 'コレクション',
  DYNAMIC: 'ダイナミック',
}

export const EnhancedMetricsTable: React.FC<EnhancedMetricsTableProps> = ({
  data,
  isLoading = false,
  onCreativeClick,
  showVideoMetrics = true,
  showDemographics = false,
  showPlacements = false,
  showTargeting = false,
}) => {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [sortConfig, setSortConfig] = useState<{
    key: string
    direction: 'asc' | 'desc'
  } | null>(null)
  const [filterType, setFilterType] = useState<string>('all')

  // フィルタリングとソート
  const processedData = useMemo(() => {
    let filtered = data

    // タイプフィルター
    if (filterType !== 'all') {
      filtered = filtered.filter((item) => item.type === filterType)
    }

    // ソート
    if (sortConfig) {
      filtered = [...filtered].sort((a, b) => {
        const aValue = getNestedValue(a, sortConfig.key)
        const bValue = getNestedValue(b, sortConfig.key)

        if (aValue === null || aValue === undefined) return 1
        if (bValue === null || bValue === undefined) return -1

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1
        }
        return 0
      })
    }

    return filtered
  }, [data, filterType, sortConfig])

  const getNestedValue = (obj: any, path: string): any => {
    return path.split('.').reduce((acc, part) => acc?.[part], obj)
  }

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'desc'
    if (
      sortConfig &&
      sortConfig.key === key &&
      sortConfig.direction === 'desc'
    ) {
      direction = 'asc'
    }
    setSortConfig({ key, direction })
  }

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedRows(newExpanded)
  }

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('ja-JP').format(num)
  }

  const formatCurrency = (num: number): string => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
    }).format(num)
  }

  const formatPercentage = (num: number): string => {
    return `${num.toFixed(2)}%`
  }

  const renderRankingBadge = (ranking?: string) => {
    if (!ranking) return null

    const colors = {
      above_average: 'bg-green-100 text-green-800',
      average: 'bg-yellow-100 text-yellow-800',
      below_average: 'bg-red-100 text-red-800',
    }

    const labels = {
      above_average: '平均以上',
      average: '平均',
      below_average: '平均以下',
    }

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          colors[ranking as keyof typeof colors] || 'bg-gray-100 text-gray-800'
        }`}
      >
        {labels[ranking as keyof typeof labels] || ranking}
      </span>
    )
  }

  if (isLoading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white shadow rounded-lg">
      {/* ヘッダー */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">
            拡張クリエイティブメトリクス
          </h3>
          <div className="flex items-center space-x-4">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="block rounded-md border-gray-300 py-1.5 pr-10 text-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="all">すべてのタイプ</option>
              {Object.entries(CREATIVE_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* テーブル */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="w-8 px-3 py-3"></th>
              <th
                scope="col"
                className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                クリエイティブ
              </th>
              <th
                scope="col"
                className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('metrics.impressions')}
              >
                表示回数
              </th>
              <th
                scope="col"
                className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('metrics.ctr')}
              >
                CTR
              </th>
              <th
                scope="col"
                className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('metrics.conversions')}
              >
                コンバージョン
              </th>
              <th
                scope="col"
                className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('metrics.roas')}
              >
                ROAS
              </th>
              <th
                scope="col"
                className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('metrics.spend')}
              >
                広告費
              </th>
              {showVideoMetrics && (
                <th
                  scope="col"
                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  動画指標
                </th>
              )}
              <th
                scope="col"
                className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                品質
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {processedData.map((item) => {
              const TypeIcon = CREATIVE_TYPE_ICONS[item.type]
              const isExpanded = expandedRows.has(item.id)

              return (
                <React.Fragment key={item.id}>
                  <tr
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => onCreativeClick?.(item)}
                  >
                    <td className="px-3 py-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleRow(item.id)
                        }}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        {isExpanded ? (
                          <ChevronDownIcon className="h-4 w-4" />
                        ) : (
                          <ChevronRightIcon className="h-4 w-4" />
                        )}
                      </button>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          {item.creative.thumbnailUrl ? (
                            <img
                              className="h-10 w-10 rounded-lg object-cover"
                              src={item.creative.thumbnailUrl}
                              alt={item.name}
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-lg bg-gray-200 flex items-center justify-center">
                              <TypeIcon className="h-6 w-6 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {item.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {item.campaignName}
                          </div>
                          <div className="flex items-center mt-1">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                              {CREATIVE_TYPE_LABELS[item.type]}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatNumber(item.metrics.impressions)}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatPercentage(item.metrics.ctr)}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatNumber(item.metrics.conversions)}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.metrics.roas.toFixed(2)}x
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(item.metrics.spend)}
                    </td>
                    {showVideoMetrics && (
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.type === 'VIDEO' && item.metrics.videoMetrics ? (
                          <div className="flex items-center space-x-2">
                            <PlayIcon className="h-4 w-4 text-gray-400" />
                            <span>
                              {formatPercentage(
                                item.metrics.videoMetrics.completionRate
                              )}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    )}
                    <td className="px-3 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        {renderRankingBadge(item.metrics.qualityRanking)}
                        {renderRankingBadge(item.metrics.engagementRateRanking)}
                      </div>
                    </td>
                  </tr>

                  {/* 展開行 */}
                  {isExpanded && (
                    <tr>
                      <td colSpan={9} className="px-3 py-4 bg-gray-50">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          {/* 詳細メトリクス */}
                          <div>
                            <h4 className="text-sm font-medium text-gray-900 mb-2">
                              詳細メトリクス
                            </h4>
                            <dl className="space-y-1 text-sm">
                              <div className="flex justify-between">
                                <dt className="text-gray-500">リーチ:</dt>
                                <dd className="text-gray-900">
                                  {formatNumber(item.metrics.reach)}
                                </dd>
                              </div>
                              <div className="flex justify-between">
                                <dt className="text-gray-500">頻度:</dt>
                                <dd className="text-gray-900">
                                  {item.metrics.frequency.toFixed(2)}
                                </dd>
                              </div>
                              <div className="flex justify-between">
                                <dt className="text-gray-500">CPM:</dt>
                                <dd className="text-gray-900">
                                  {formatCurrency(item.metrics.cpm)}
                                </dd>
                              </div>
                              <div className="flex justify-between">
                                <dt className="text-gray-500">CPC:</dt>
                                <dd className="text-gray-900">
                                  {formatCurrency(item.metrics.cpc)}
                                </dd>
                              </div>
                            </dl>
                          </div>

                          {/* 動画メトリクス */}
                          {item.type === 'VIDEO' && item.metrics.videoMetrics && (
                            <div>
                              <h4 className="text-sm font-medium text-gray-900 mb-2">
                                動画パフォーマンス
                              </h4>
                              <dl className="space-y-1 text-sm">
                                <div className="flex justify-between">
                                  <dt className="text-gray-500">再生数:</dt>
                                  <dd className="text-gray-900">
                                    {formatNumber(item.metrics.videoMetrics.plays)}
                                  </dd>
                                </div>
                                <div className="flex justify-between">
                                  <dt className="text-gray-500">25%視聴:</dt>
                                  <dd className="text-gray-900">
                                    {formatNumber(
                                      item.metrics.videoMetrics.p25Watched
                                    )}
                                  </dd>
                                </div>
                                <div className="flex justify-between">
                                  <dt className="text-gray-500">50%視聴:</dt>
                                  <dd className="text-gray-900">
                                    {formatNumber(
                                      item.metrics.videoMetrics.p50Watched
                                    )}
                                  </dd>
                                </div>
                                <div className="flex justify-between">
                                  <dt className="text-gray-500">完全視聴:</dt>
                                  <dd className="text-gray-900">
                                    {formatNumber(
                                      item.metrics.videoMetrics.p100Watched
                                    )}
                                  </dd>
                                </div>
                                <div className="flex justify-between">
                                  <dt className="text-gray-500">平均視聴時間:</dt>
                                  <dd className="text-gray-900">
                                    {item.metrics.videoMetrics.avgWatchTime.toFixed(
                                      1
                                    )}
                                    秒
                                  </dd>
                                </div>
                              </dl>
                            </div>
                          )}

                          {/* ターゲティング */}
                          {showTargeting && item.targeting && (
                            <div>
                              <h4 className="text-sm font-medium text-gray-900 mb-2">
                                ターゲティング
                              </h4>
                              <dl className="space-y-1 text-sm">
                                {item.targeting.ageMin && item.targeting.ageMax && (
                                  <div className="flex justify-between">
                                    <dt className="text-gray-500">年齢:</dt>
                                    <dd className="text-gray-900">
                                      {item.targeting.ageMin}-{item.targeting.ageMax}
                                    </dd>
                                  </div>
                                )}
                                {item.targeting.genders && (
                                  <div className="flex justify-between">
                                    <dt className="text-gray-500">性別:</dt>
                                    <dd className="text-gray-900">
                                      {item.targeting.genders.join(', ')}
                                    </dd>
                                  </div>
                                )}
                              </dl>
                            </div>
                          )}
                        </div>

                        {/* カルーセルカード */}
                        {item.type === 'CAROUSEL' &&
                          item.creative.carouselCards && (
                            <div className="mt-4">
                              <h4 className="text-sm font-medium text-gray-900 mb-2">
                                カルーセルカード
                              </h4>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                {item.creative.carouselCards.map((card, index) => (
                                  <div
                                    key={index}
                                    className="bg-white border border-gray-200 rounded-lg p-2"
                                  >
                                    {card.imageUrl ? (
                                      <img
                                        src={card.imageUrl}
                                        alt={card.name}
                                        className="w-full h-20 object-cover rounded mb-1"
                                      />
                                    ) : (
                                      <div className="w-full h-20 bg-gray-100 rounded mb-1"></div>
                                    )}
                                    <p className="text-xs text-gray-900 truncate">
                                      {card.name}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* 統計サマリー */}
      <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
          <div>
            <span className="text-gray-500">合計クリエイティブ:</span>
            <span className="ml-2 font-medium text-gray-900">
              {processedData.length}件
            </span>
          </div>
          <div>
            <span className="text-gray-500">合計表示回数:</span>
            <span className="ml-2 font-medium text-gray-900">
              {formatNumber(
                processedData.reduce((sum, item) => sum + item.metrics.impressions, 0)
              )}
            </span>
          </div>
          <div>
            <span className="text-gray-500">合計広告費:</span>
            <span className="ml-2 font-medium text-gray-900">
              {formatCurrency(
                processedData.reduce((sum, item) => sum + item.metrics.spend, 0)
              )}
            </span>
          </div>
          <div>
            <span className="text-gray-500">平均CTR:</span>
            <span className="ml-2 font-medium text-gray-900">
              {formatPercentage(
                processedData.reduce((sum, item) => sum + item.metrics.ctr, 0) /
                  processedData.length
              )}
            </span>
          </div>
          <div>
            <span className="text-gray-500">平均ROAS:</span>
            <span className="ml-2 font-medium text-gray-900">
              {(
                processedData.reduce((sum, item) => sum + item.metrics.roas, 0) /
                processedData.length
              ).toFixed(2)}
              x
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}