/**
 * DashboardFilters.tsx
 * フィルター部分のコンポーネント
 */

import React from 'react'
import { CampaignFilter } from '../CampaignFilter'
import { PerformanceFilter } from '../PerformanceFilter'
import { SafeFilterWrapper } from '../SafeFilterWrapper'
import { UnifiedAdData } from '../../types'

interface DashboardFiltersProps {
  sourceData: UnifiedAdData[]
  filteredData: UnifiedAdData[]
  onFilterChange: (data: UnifiedAdData[]) => void
}

export const DashboardFilters: React.FC<DashboardFiltersProps> = ({
  sourceData,
  filteredData,
  onFilterChange
}) => {
  const hasActiveFilters = sourceData.length > filteredData.length
  const isDataEmpty = filteredData.length === 0
  
  return (
    <div className="mb-6">
      {/* フィルターヘッダー */}
      <div className="mb-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-lg font-medium text-gray-700">🔍 フィルター</span>
          {hasActiveFilters && (
            <button
              onClick={() => onFilterChange(sourceData)}
              className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-lg hover:bg-blue-200"
            >
              クリア
            </button>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-600">
            表示中: {filteredData.length}件 / 全{sourceData.length}件
          </div>
          
          {/* データが0件でフィルターが有効な場合の警告 */}
          {isDataEmpty && sourceData.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-orange-600">
                フィルター条件に該当するデータがありません
              </span>
              <button
                onClick={() => onFilterChange(sourceData)}
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                フィルターをリセット
              </button>
            </div>
          )}
        </div>
      </div>

      {/* フィルターパネル（常時表示） */}
      <SafeFilterWrapper>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
          <CampaignFilter 
            data={sourceData}
            onFilter={onFilterChange}
          />
          <PerformanceFilter
            data={sourceData}
            onFilter={onFilterChange}
          />
        </div>
      </SafeFilterWrapper>
      
      {/* アクティブフィルターの表示 */}
      {hasActiveFilters && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <span className="text-sm text-blue-800">
              フィルターが適用されています（{sourceData.length - filteredData.length}件を非表示）
            </span>
          </div>
          <button
            onClick={() => onFilterChange(sourceData)}
            className="text-sm text-blue-600 hover:text-blue-800 underline"
          >
            すべて表示
          </button>
        </div>
      )}
    </div>
  )
}