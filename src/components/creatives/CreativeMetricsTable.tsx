import React, { useState, useMemo } from 'react'
import { 
  PhotoIcon, 
  VideoCameraIcon, 
  ViewColumnsIcon,
  DocumentTextIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  FunnelIcon
} from '@heroicons/react/24/outline'
import { CreativeMetrics, CreativeType } from '../../services/creativeAggregator'

interface CreativeMetricsTableProps {
  metrics: CreativeMetrics[]
  isLoading?: boolean
}

type SortField = keyof Pick<CreativeMetrics, 
  'impressions' | 'clicks' | 'ctr' | 'conversions' | 'cpa' | 'roas' | 'spend' | 'creative_name'>
type SortDirection = 'asc' | 'desc'

export const CreativeMetricsTable: React.FC<CreativeMetricsTableProps> = ({
  metrics,
  isLoading = false
}) => {
  const [selectedTypes, setSelectedTypes] = useState<CreativeType[]>([])
  const [sortField, setSortField] = useState<SortField>('impressions')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [showFilters, setShowFilters] = useState(false)

  // クリエイティブタイプのアイコンを取得
  const getCreativeIcon = (type: CreativeType) => {
    switch (type) {
      case 'image':
        return <PhotoIcon className="h-5 w-5 text-blue-500" />
      case 'video':
        return <VideoCameraIcon className="h-5 w-5 text-purple-500" />
      case 'carousel':
        return <ViewColumnsIcon className="h-5 w-5 text-green-500" />
      case 'text':
        return <DocumentTextIcon className="h-5 w-5 text-gray-500" />
      default:
        return <DocumentTextIcon className="h-5 w-5 text-gray-400" />
    }
  }

  // フィルタリングとソート
  const processedMetrics = useMemo(() => {
    let filtered = metrics

    // タイプフィルター
    if (selectedTypes.length > 0) {
      filtered = filtered.filter(metric => selectedTypes.includes(metric.creative_type))
    }

    // ソート
    const sorted = [...filtered].sort((a, b) => {
      const aValue = a[sortField]
      const bValue = b[sortField]

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      }

      const aNum = Number(aValue) || 0
      const bNum = Number(bValue) || 0

      return sortDirection === 'asc' ? aNum - bNum : bNum - aNum
    })

    return sorted
  }, [metrics, selectedTypes, sortField, sortDirection])

  // ソート処理
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  // タイプフィルター切り替え
  const toggleTypeFilter = (type: CreativeType) => {
    setSelectedTypes(prev => 
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    )
  }

  // 数値フォーマット
  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('ja-JP').format(Math.round(num))
  }

  const formatCurrency = (num: number): string => {
    return `¥${new Intl.NumberFormat('ja-JP').format(Math.round(num))}`
  }

  const formatPercentage = (num: number): string => {
    return `${num.toFixed(2)}%`
  }

  // ソートアイコン
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <div className="w-4 h-4" />
    }
    return sortDirection === 'asc' 
      ? <ChevronUpIcon className="h-4 w-4" />
      : <ChevronDownIcon className="h-4 w-4" />
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">データを読み込んでいます...</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* フィルターセクション */}
      <div className="mb-4">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          <FunnelIcon className="h-5 w-5" />
          フィルター
          {selectedTypes.length > 0 && (
            <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
              {selectedTypes.length}
            </span>
          )}
        </button>

        {showFilters && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 mb-3">クリエイティブタイプ</h4>
            <div className="flex gap-2 flex-wrap">
              {(['image', 'video', 'carousel', 'text'] as CreativeType[]).map(type => (
                <button
                  key={type}
                  onClick={() => toggleTypeFilter(type)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                    selectedTypes.includes(type)
                      ? 'bg-blue-50 border-blue-300 text-blue-700'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {getCreativeIcon(type)}
                  <span className="text-sm capitalize">{type}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* テーブル */}
      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left">
                <button
                  onClick={() => handleSort('creative_name')}
                  className="flex items-center gap-1 text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700"
                >
                  クリエイティブ
                  <SortIcon field="creative_name" />
                </button>
              </th>
              <th className="px-6 py-3 text-center">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  タイプ
                </span>
              </th>
              <th className="px-6 py-3 text-right">
                <button
                  onClick={() => handleSort('impressions')}
                  className="flex items-center gap-1 ml-auto text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700"
                >
                  インプレッション
                  <SortIcon field="impressions" />
                </button>
              </th>
              <th className="px-6 py-3 text-right">
                <button
                  onClick={() => handleSort('clicks')}
                  className="flex items-center gap-1 ml-auto text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700"
                >
                  クリック数
                  <SortIcon field="clicks" />
                </button>
              </th>
              <th className="px-6 py-3 text-right">
                <button
                  onClick={() => handleSort('ctr')}
                  className="flex items-center gap-1 ml-auto text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700"
                >
                  CTR
                  <SortIcon field="ctr" />
                </button>
              </th>
              <th className="px-6 py-3 text-right">
                <button
                  onClick={() => handleSort('conversions')}
                  className="flex items-center gap-1 ml-auto text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700"
                >
                  コンバージョン
                  <SortIcon field="conversions" />
                </button>
              </th>
              <th className="px-6 py-3 text-right">
                <button
                  onClick={() => handleSort('cpa')}
                  className="flex items-center gap-1 ml-auto text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700"
                >
                  CPA
                  <SortIcon field="cpa" />
                </button>
              </th>
              <th className="px-6 py-3 text-right">
                <button
                  onClick={() => handleSort('roas')}
                  className="flex items-center gap-1 ml-auto text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700"
                >
                  ROAS
                  <SortIcon field="roas" />
                </button>
              </th>
              <th className="px-6 py-3 text-right">
                <button
                  onClick={() => handleSort('spend')}
                  className="flex items-center gap-1 ml-auto text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700"
                >
                  消化金額
                  <SortIcon field="spend" />
                </button>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {processedMetrics.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-6 py-4 text-center text-gray-500">
                  データがありません
                </td>
              </tr>
            ) : (
              processedMetrics.map((metric) => (
                <tr key={`${metric.creative_id}_${metric.period_start}`} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {metric.thumbnail_url ? (
                        <img
                          src={metric.thumbnail_url}
                          alt={metric.creative_name}
                          className="h-10 w-10 rounded object-cover mr-3"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded bg-gray-200 mr-3 flex items-center justify-center">
                          {getCreativeIcon(metric.creative_type)}
                        </div>
                      )}
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {metric.creative_name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {metric.campaign_name}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    {getCreativeIcon(metric.creative_type)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                    {formatNumber(metric.impressions)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                    {formatNumber(metric.clicks)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                    {formatPercentage(metric.ctr)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                    {formatNumber(metric.conversions)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                    {metric.conversions > 0 ? formatCurrency(metric.cpa) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                    {metric.roas > 0 ? `${metric.roas.toFixed(2)}x` : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                    {formatCurrency(metric.spend)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* サマリー */}
      {processedMetrics.length > 0 && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-500">合計インプレッション</p>
              <p className="text-lg font-semibold text-gray-900">
                {formatNumber(processedMetrics.reduce((sum, m) => sum + m.impressions, 0))}
              </p>
            </div>
            <div>
              <p className="text-gray-500">合計クリック</p>
              <p className="text-lg font-semibold text-gray-900">
                {formatNumber(processedMetrics.reduce((sum, m) => sum + m.clicks, 0))}
              </p>
            </div>
            <div>
              <p className="text-gray-500">合計コンバージョン</p>
              <p className="text-lg font-semibold text-gray-900">
                {formatNumber(processedMetrics.reduce((sum, m) => sum + m.conversions, 0))}
              </p>
            </div>
            <div>
              <p className="text-gray-500">合計消化金額</p>
              <p className="text-lg font-semibold text-gray-900">
                {formatCurrency(processedMetrics.reduce((sum, m) => sum + m.spend, 0))}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}