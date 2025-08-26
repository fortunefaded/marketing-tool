import { useState, useMemo } from 'react'
import { AggregatedData } from '../utils/aggregation'
import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/outline'

interface AggregatedFatigueTableProps {
  data: AggregatedData[]
  level: 'campaign' | 'adset'
}

export function AggregatedFatigueTable({ data, level }: AggregatedFatigueTableProps) {
  // ソート状態管理
  const [sortField, setSortField] = useState<string>('fatigueScore')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  // ソートされたデータ
  const sortedData = useMemo(() => {
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
        case 'cvr':
          aValue = Number(a.metrics.cvr) || 0
          bValue = Number(b.metrics.cvr) || 0
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
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'critical': return 'bg-red-100 text-red-800'
      case 'warning': return 'bg-yellow-100 text-yellow-800'
      case 'caution': return 'bg-orange-100 text-orange-800'
      case 'healthy': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatCurrency = (value: number) => {
    return `¥${Math.ceil(value).toLocaleString('ja-JP')}`
  }

  const formatNumber = (value: number, decimals: number = 0) => {
    return value.toLocaleString('ja-JP', { 
      minimumFractionDigits: decimals, 
      maximumFractionDigits: decimals 
    })
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('name')}>
              <div className="flex items-center gap-1">
                {level === 'campaign' ? 'キャンペーン' : '広告セット'}
                {sortField === 'name' && (
                  sortDirection === 'asc' ? <ChevronUpIcon className="h-3 w-3" /> : <ChevronDownIcon className="h-3 w-3" />
                )}
              </div>
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('adCount')}>
              <div className="flex items-center justify-center gap-1">
                広告数
                {sortField === 'adCount' && (
                  sortDirection === 'asc' ? <ChevronUpIcon className="h-3 w-3" /> : <ChevronDownIcon className="h-3 w-3" />
                )}
              </div>
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('fatigueScore')}>
              <div className="flex items-center justify-center gap-1">
                疲労度
                {sortField === 'fatigueScore' && (
                  sortDirection === 'asc' ? <ChevronUpIcon className="h-3 w-3" /> : <ChevronDownIcon className="h-3 w-3" />
                )}
              </div>
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('spend')}>
              <div className="flex items-center justify-end gap-1">
                広告費用 (¥)
                {sortField === 'spend' && (
                  sortDirection === 'asc' ? <ChevronUpIcon className="h-3 w-3" /> : <ChevronDownIcon className="h-3 w-3" />
                )}
              </div>
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('impressions')}>
              <div className="flex items-center justify-end gap-1">
                インプレッション
                {sortField === 'impressions' && (
                  sortDirection === 'asc' ? <ChevronUpIcon className="h-3 w-3" /> : <ChevronDownIcon className="h-3 w-3" />
                )}
              </div>
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('clicks')}>
              <div className="flex items-center justify-end gap-1">
                クリック
                {sortField === 'clicks' && (
                  sortDirection === 'asc' ? <ChevronUpIcon className="h-3 w-3" /> : <ChevronDownIcon className="h-3 w-3" />
                )}
              </div>
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('conversions')}>
              <div className="flex items-center justify-end gap-1">
                CV
                {sortField === 'conversions' && (
                  sortDirection === 'asc' ? <ChevronUpIcon className="h-3 w-3" /> : <ChevronDownIcon className="h-3 w-3" />
                )}
              </div>
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('cpa')}>
              <div className="flex items-center justify-end gap-1">
                CPA (¥)
                {sortField === 'cpa' && (
                  sortDirection === 'asc' ? <ChevronUpIcon className="h-3 w-3" /> : <ChevronDownIcon className="h-3 w-3" />
                )}
              </div>
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('ctr')}>
              <div className="flex items-center justify-end gap-1">
                CTR (%)
                {sortField === 'ctr' && (
                  sortDirection === 'asc' ? <ChevronUpIcon className="h-3 w-3" /> : <ChevronDownIcon className="h-3 w-3" />
                )}
              </div>
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('cpc')}>
              <div className="flex items-center justify-end gap-1">
                CPC (¥)
                {sortField === 'cpc' && (
                  sortDirection === 'asc' ? <ChevronUpIcon className="h-3 w-3" /> : <ChevronDownIcon className="h-3 w-3" />
                )}
              </div>
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('cvr')}>
              <div className="flex items-center justify-end gap-1">
                CVR (%)
                {sortField === 'cvr' && (
                  sortDirection === 'asc' ? <ChevronUpIcon className="h-3 w-3" /> : <ChevronDownIcon className="h-3 w-3" />
                )}
              </div>
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('cpm')}>
              <div className="flex items-center justify-end gap-1">
                CPM (¥)
                {sortField === 'cpm' && (
                  sortDirection === 'asc' ? <ChevronUpIcon className="h-3 w-3" /> : <ChevronDownIcon className="h-3 w-3" />
                )}
              </div>
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('frequency')}>
              <div className="flex items-center justify-end gap-1">
                Frequency
                {sortField === 'frequency' && (
                  sortDirection === 'asc' ? <ChevronUpIcon className="h-3 w-3" /> : <ChevronDownIcon className="h-3 w-3" />
                )}
              </div>
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sortedData.map((item) => (
            <tr key={item.id} className="hover:bg-gray-50">
              <td className="px-4 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">{item.name}</div>
                <div className="text-xs text-gray-500">ID: {item.id}</div>
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-center">
                <span className="text-sm text-gray-900">{item.adCount}</span>
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-center">
                <div className="flex flex-col items-center">
                  <span className="text-lg font-semibold text-gray-900">
                    {item.fatigueScore !== undefined ? item.fatigueScore : '-'}
                  </span>
                  {item.fatigueStatus && (
                    <span className={`mt-1 px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(item.fatigueStatus)}`}>
                      {item.fatigueStatus}
                    </span>
                  )}
                </div>
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                {formatCurrency(item.metrics.spend)}
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                {formatNumber(item.metrics.impressions)}
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                {formatNumber(item.metrics.clicks)}
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                {formatNumber(item.metrics.conversions)}
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                {item.metrics.conversions > 0 ? formatCurrency(item.metrics.cpa) : '-'}
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                {formatNumber(item.metrics.ctr, 2)}
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                {formatCurrency(item.metrics.cpc)}
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                {formatNumber(item.metrics.cvr, 2)}
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                {formatCurrency(item.metrics.cpm)}
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                {formatNumber(item.metrics.frequency, 2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}