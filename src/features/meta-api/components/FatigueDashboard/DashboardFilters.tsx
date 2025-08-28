/**
 * DashboardFilters.tsx
 * フィルター部分のコンポーネント
 */

import React, { useState } from 'react'
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
  const [showFilters, setShowFilters] = useState(false)
  
  const hasActiveFilters = sourceData.length > filteredData.length
  const isDataEmpty = filteredData.length === 0
  
  return (
    <div className="mb-6">
      {/* フィルターコントロール */}
      <div className="mb-4 flex justify-between items-center">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            showFilters 
              ? 'bg-indigo-600 text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          🔍 フィルター {showFilters ? '▼' : '▶'}
        </button>
        
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
                onClick={() => {
                  onFilterChange(sourceData) // 全データを表示
                  setShowFilters(true) // フィルターパネルを開く
                }}
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                フィルターをリセット
              </button>
            </div>
          )}
        </div>
      </div>

      {/* フィルターパネル */}
      {showFilters && (
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
      )}
      
      {/* アクティブフィルターの表示 */}
      {hasActiveFilters && !showFilters && (
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
            クリア
          </button>
        </div>
      )}
    </div>
  )
}