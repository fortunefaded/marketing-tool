import React, { useState, useMemo } from 'react'
import {
  ChevronUpIcon,
  ChevronDownIcon,
  PhotoIcon,
  VideoCameraIcon,
  ViewColumnsIcon,
  DocumentTextIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline'

export interface Creative {
  id: string
  name: string
  type: 'IMAGE' | 'VIDEO' | 'CAROUSEL' | 'TEXT'
  campaignName: string
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED'
  thumbnailUrl?: string
  videoUrl?: string
  // メトリクス
  impressions: number
  clicks: number
  conversions: number
  spend: number
  revenue: number
  ctr: number
  cpc: number
  cpa: number
  roas: number
  frequency: number
  cpm: number
  // 広告疲労度関連
  fatigueScore?: number
  creativeFatigue?: number
  audienceFatigue?: number
  algorithmFatigue?: number
  // 日付
  startDate: string
  endDate?: string
}

interface CreativeTableProps {
  creatives: Creative[]
  onRowClick?: (creative: Creative) => void
  onSort?: (column: string) => void
  onSelectionChange?: (selectedIds: string[]) => void
  selectable?: boolean
  isLoading?: boolean
  error?: string
  className?: string
}

type SortField = keyof Creative
type SortDirection = 'asc' | 'desc'

export const CreativeTable: React.FC<CreativeTableProps> = ({
  creatives,
  onRowClick,
  onSort,
  onSelectionChange,
  selectable = false,
  isLoading = false,
  error,
  className = '',
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [sortColumn, setSortColumn] = useState<SortField>('impressions')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [showFilters, setShowFilters] = useState(false)
  const [typeFilter, setTypeFilter] = useState<Creative['type'][]>([])
  const [statusFilter, setStatusFilter] = useState<Creative['status'][]>([])

  // フィルタリングとソート処理
  const processedCreatives = useMemo(() => {
    let filtered = creatives

    // タイプフィルター
    if (typeFilter.length > 0) {
      filtered = filtered.filter(creative => typeFilter.includes(creative.type))
    }

    // ステータスフィルター
    if (statusFilter.length > 0) {
      filtered = filtered.filter(creative => statusFilter.includes(creative.status))
    }

    // ソート
    const sorted = [...filtered].sort((a, b) => {
      const aValue = a[sortColumn]
      const bValue = b[sortColumn]

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue)
      }

      const aNum = Number(aValue) || 0
      const bNum = Number(bValue) || 0

      return sortDirection === 'asc' ? aNum - bNum : bNum - aNum
    })

    return sorted
  }, [creatives, typeFilter, statusFilter, sortColumn, sortDirection])

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(processedCreatives.map(c => c.id))
      setSelectedIds(allIds)
      onSelectionChange?.(Array.from(allIds))
    } else {
      setSelectedIds(new Set())
      onSelectionChange?.([])
    }
  }

  const handleSelectRow = (creativeId: string, checked: boolean) => {
    const newSelected = new Set(selectedIds)
    if (checked) {
      newSelected.add(creativeId)
    } else {
      newSelected.delete(creativeId)
    }
    setSelectedIds(newSelected)
    onSelectionChange?.(Array.from(newSelected))
  }

  const handleSort = (column: SortField) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('desc')
    }
    onSort?.(column as string)
  }

  const getCreativeIcon = (type: Creative['type']) => {
    switch (type) {
      case 'IMAGE':
        return <PhotoIcon className="h-5 w-5 text-blue-500" />
      case 'VIDEO':
        return <VideoCameraIcon className="h-5 w-5 text-purple-500" />
      case 'CAROUSEL':
        return <ViewColumnsIcon className="h-5 w-5 text-green-500" />
      case 'TEXT':
        return <DocumentTextIcon className="h-5 w-5 text-gray-500" />
      default:
        return <DocumentTextIcon className="h-5 w-5 text-gray-400" />
    }
  }

  const getStatusBadge = (status: Creative['status']) => {
    const statusConfig = {
      ACTIVE: { label: 'アクティブ', className: 'bg-green-100 text-green-800' },
      PAUSED: { label: '一時停止', className: 'bg-yellow-100 text-yellow-800' },
      ARCHIVED: { label: 'アーカイブ', className: 'bg-gray-100 text-gray-800' },
    }
    const config = statusConfig[status]
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
        {config.label}
      </span>
    )
  }

  const getFatigueScoreBadge = (score?: number) => {
    if (score === undefined) return <span className="text-gray-400">-</span>
    
    const getColorClass = (score: number) => {
      if (score >= 80) return 'bg-red-100 text-red-800'
      if (score >= 60) return 'bg-yellow-100 text-yellow-800'
      return 'bg-green-100 text-green-800'
    }

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getColorClass(score)}`}>
        {Math.round(score)}
      </span>
    )
  }

  const formatCurrency = (value: number) => `¥${new Intl.NumberFormat('ja-JP').format(Math.round(value))}`
  const formatNumber = (value: number) => new Intl.NumberFormat('ja-JP').format(Math.round(value))
  const formatPercentage = (value: number) => `${value.toFixed(2)}%`
  const formatDecimal = (value: number, decimals: number = 2) => value.toFixed(decimals)

  const toggleTypeFilter = (type: Creative['type']) => {
    setTypeFilter(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    )
  }

  const toggleStatusFilter = (status: Creative['status']) => {
    setStatusFilter(prev => 
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    )
  }

  if (isLoading) {
    return (
      <div data-testid="table-skeleton" className={`bg-white rounded-lg shadow-sm p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-10 bg-gray-200 rounded mb-4"></div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded mb-2"></div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow-sm p-6 ${className}`}>
        <div className="text-center text-red-600">{error}</div>
      </div>
    )
  }

  if (creatives.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow-sm p-6 ${className}`}>
        <div className="text-center text-gray-500">クリエイティブがありません</div>
      </div>
    )
  }

  return (
    <div className={className}>
      {/* フィルターセクション */}
      <div className="mb-4">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          <FunnelIcon className="h-5 w-5" />
          フィルター
          {(typeFilter.length > 0 || statusFilter.length > 0) && (
            <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
              {typeFilter.length + statusFilter.length}
            </span>
          )}
        </button>

        {showFilters && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* タイプフィルター */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">クリエイティブタイプ</h4>
                <div className="flex gap-2 flex-wrap">
                  {(['IMAGE', 'VIDEO', 'CAROUSEL', 'TEXT'] as Creative['type'][]).map(type => (
                    <button
                      key={type}
                      onClick={() => toggleTypeFilter(type)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                        typeFilter.includes(type)
                          ? 'bg-blue-50 border-blue-300 text-blue-700'
                          : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {getCreativeIcon(type)}
                      <span className="text-sm">{type}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* ステータスフィルター */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">ステータス</h4>
                <div className="flex gap-2 flex-wrap">
                  {(['ACTIVE', 'PAUSED', 'ARCHIVED'] as Creative['status'][]).map(status => (
                    <button
                      key={status}
                      onClick={() => toggleStatusFilter(status)}
                      className={`px-3 py-2 rounded-lg border transition-colors text-sm ${
                        statusFilter.includes(status)
                          ? 'bg-blue-50 border-blue-300 text-blue-700'
                          : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* テーブル */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {selectable && (
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === processedCreatives.length && processedCreatives.length > 0}
                      onChange={e => handleSelectAll(e.target.checked)}
                      className="h-4 w-4 text-blue-600 rounded border-gray-300"
                    />
                  </th>
                )}
                
                {/* クリエイティブ名 */}
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-1">
                    クリエイティブ名
                    {sortColumn === 'name' && (
                      sortDirection === 'asc' ? <ChevronUpIcon className="h-3 w-3" /> : <ChevronDownIcon className="h-3 w-3" />
                    )}
                  </div>
                </th>

                {/* タイプ・ステータス */}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  タイプ・ステータス
                </th>

                {/* インプレッション */}
                <th
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('impressions')}
                >
                  <div className="flex items-center gap-1 justify-end">
                    インプレッション
                    {sortColumn === 'impressions' && (
                      sortDirection === 'asc' ? <ChevronUpIcon className="h-3 w-3" /> : <ChevronDownIcon className="h-3 w-3" />
                    )}
                  </div>
                </th>

                {/* クリック */}
                <th
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('clicks')}
                >
                  <div className="flex items-center gap-1 justify-end">
                    クリック
                    {sortColumn === 'clicks' && (
                      sortDirection === 'asc' ? <ChevronUpIcon className="h-3 w-3" /> : <ChevronDownIcon className="h-3 w-3" />
                    )}
                  </div>
                </th>

                {/* CTR */}
                <th
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('ctr')}
                >
                  <div className="flex items-center gap-1 justify-end">
                    CTR
                    {sortColumn === 'ctr' && (
                      sortDirection === 'asc' ? <ChevronUpIcon className="h-3 w-3" /> : <ChevronDownIcon className="h-3 w-3" />
                    )}
                  </div>
                </th>

                {/* コンバージョン */}
                <th
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('conversions')}
                >
                  <div className="flex items-center gap-1 justify-end">
                    コンバージョン
                    {sortColumn === 'conversions' && (
                      sortDirection === 'asc' ? <ChevronUpIcon className="h-3 w-3" /> : <ChevronDownIcon className="h-3 w-3" />
                    )}
                  </div>
                </th>

                {/* CPA */}
                <th
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('cpa')}
                >
                  <div className="flex items-center gap-1 justify-end">
                    CPA
                    {sortColumn === 'cpa' && (
                      sortDirection === 'asc' ? <ChevronUpIcon className="h-3 w-3" /> : <ChevronDownIcon className="h-3 w-3" />
                    )}
                  </div>
                </th>

                {/* ROAS */}
                <th
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('roas')}
                >
                  <div className="flex items-center gap-1 justify-end">
                    ROAS
                    {sortColumn === 'roas' && (
                      sortDirection === 'asc' ? <ChevronUpIcon className="h-3 w-3" /> : <ChevronDownIcon className="h-3 w-3" />
                    )}
                  </div>
                </th>

                {/* 消化金額 */}
                <th
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('spend')}
                >
                  <div className="flex items-center gap-1 justify-end">
                    消化金額
                    {sortColumn === 'spend' && (
                      sortDirection === 'asc' ? <ChevronUpIcon className="h-3 w-3" /> : <ChevronDownIcon className="h-3 w-3" />
                    )}
                  </div>
                </th>

                {/* CPM */}
                <th
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('cpm')}
                >
                  <div className="flex items-center gap-1 justify-end">
                    CPM
                    {sortColumn === 'cpm' && (
                      sortDirection === 'asc' ? <ChevronUpIcon className="h-3 w-3" /> : <ChevronDownIcon className="h-3 w-3" />
                    )}
                  </div>
                </th>

                {/* Frequency */}
                <th
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('frequency')}
                >
                  <div className="flex items-center gap-1 justify-end">
                    Frequency
                    {sortColumn === 'frequency' && (
                      sortDirection === 'asc' ? <ChevronUpIcon className="h-3 w-3" /> : <ChevronDownIcon className="h-3 w-3" />
                    )}
                  </div>
                </th>

                {/* 疲労度スコア */}
                <th
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('fatigueScore')}
                >
                  <div className="flex items-center gap-1 justify-end">
                    疲労度スコア
                    {sortColumn === 'fatigueScore' && (
                      sortDirection === 'asc' ? <ChevronUpIcon className="h-3 w-3" /> : <ChevronDownIcon className="h-3 w-3" />
                    )}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {processedCreatives.map(creative => (
                <tr
                  key={creative.id}
                  onClick={() => onRowClick?.(creative)}
                  className={onRowClick ? 'hover:bg-gray-50 cursor-pointer' : ''}
                >
                  {selectable && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(creative.id)}
                        onChange={e => handleSelectRow(creative.id, e.target.checked)}
                        onClick={e => e.stopPropagation()}
                        className="h-4 w-4 text-blue-600 rounded border-gray-300"
                      />
                    </td>
                  )}

                  {/* クリエイティブ名・サムネイル */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {creative.thumbnailUrl ? (
                        <img
                          src={creative.thumbnailUrl}
                          alt={creative.name}
                          className="h-12 w-12 rounded-lg object-cover mr-4"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-lg bg-gray-200 mr-4 flex items-center justify-center">
                          {getCreativeIcon(creative.type)}
                        </div>
                      )}
                      <div>
                        <div className="text-sm font-medium text-gray-900 max-w-xs truncate">
                          {creative.name}
                        </div>
                        <div className="text-xs text-gray-500 max-w-xs truncate">
                          {creative.campaignName}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* タイプ・ステータス */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col items-center space-y-2">
                      {getCreativeIcon(creative.type)}
                      {getStatusBadge(creative.status)}
                    </div>
                  </td>

                  {/* インプレッション */}
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                    {formatNumber(creative.impressions)}
                  </td>

                  {/* クリック */}
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                    {formatNumber(creative.clicks)}
                  </td>

                  {/* CTR */}
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                    {formatPercentage(creative.ctr)}
                  </td>

                  {/* コンバージョン */}
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                    {formatNumber(creative.conversions)}
                  </td>

                  {/* CPA */}
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                    {creative.conversions > 0 ? formatCurrency(creative.cpa) : '-'}
                  </td>

                  {/* ROAS */}
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                    {creative.roas > 0 ? `${formatDecimal(creative.roas)}x` : '-'}
                  </td>

                  {/* 消化金額 */}
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                    {formatCurrency(creative.spend)}
                  </td>

                  {/* CPM */}
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                    {formatCurrency(creative.cpm)}
                  </td>

                  {/* Frequency */}
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                    {formatDecimal(creative.frequency)}
                  </td>

                  {/* 疲労度スコア */}
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    {getFatigueScoreBadge(creative.fatigueScore)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* サマリー */}
        {processedCreatives.length > 0 && (
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 text-sm">
              <div>
                <p className="text-gray-500">表示件数</p>
                <p className="font-semibold text-gray-900">{processedCreatives.length}件</p>
              </div>
              <div>
                <p className="text-gray-500">合計インプレッション</p>
                <p className="font-semibold text-gray-900">
                  {formatNumber(processedCreatives.reduce((sum, c) => sum + c.impressions, 0))}
                </p>
              </div>
              <div>
                <p className="text-gray-500">合計クリック</p>
                <p className="font-semibold text-gray-900">
                  {formatNumber(processedCreatives.reduce((sum, c) => sum + c.clicks, 0))}
                </p>
              </div>
              <div>
                <p className="text-gray-500">合計コンバージョン</p>
                <p className="font-semibold text-gray-900">
                  {formatNumber(processedCreatives.reduce((sum, c) => sum + c.conversions, 0))}
                </p>
              </div>
              <div>
                <p className="text-gray-500">合計消化金額</p>
                <p className="font-semibold text-gray-900">
                  {formatCurrency(processedCreatives.reduce((sum, c) => sum + c.spend, 0))}
                </p>
              </div>
              <div>
                <p className="text-gray-500">平均ROAS</p>
                <p className="font-semibold text-gray-900">
                  {formatDecimal(processedCreatives.reduce((sum, c) => sum + c.roas, 0) / processedCreatives.length)}x
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}