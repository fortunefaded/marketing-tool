/**
 * UnifiedFilterSection
 * CampaignFilterとPerformanceFilterを統合した折り畳み可能なフィルターセクション
 */

import React, { useState, useEffect } from 'react'
import { ChevronDown, ChevronRight, Filter } from 'lucide-react'
import { CampaignFilter } from './CampaignFilter'
import { PerformanceFilter } from './PerformanceFilter'

interface UnifiedFilterSectionProps {
  data: any[]
  onFilter: (filteredData: any[]) => void
  className?: string
  filteredCount?: number // 親コンポーネントから受け取る
  totalCount?: number // 親コンポーネントから受け取る
}

export function UnifiedFilterSection({
  data,
  onFilter,
  className = '',
  filteredCount: externalFilteredCount,
  totalCount: externalTotalCount,
}: UnifiedFilterSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false) // デフォルトは折りたたみ状態
  const [localFilteredCount, setLocalFilteredCount] = useState<number | null>(null)

  // 実際の表示に使う件数を決定
  const displayFilteredCount = externalFilteredCount ?? localFilteredCount
  const displayTotalCount = externalTotalCount ?? data.length

  // フィルター適用時のコールバック
  const handleFilter = (filteredData: any[]) => {
    console.log('[UnifiedFilterSection] フィルター適用:', {
      元データ件数: data.length,
      フィルター後件数: filteredData.length,
    })
    setLocalFilteredCount(filteredData.length)
    onFilter(filteredData)
  }

  // データが変更されたらローカルカウントをリセット
  useEffect(() => {
    setLocalFilteredCount(null)
  }, [data.length])

  return (
    <div className={`bg-white rounded-lg shadow-sm ${className}`}>
      {/* ヘッダー（クリックで開閉） */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors rounded-lg"
      >
        <div className="flex items-center gap-3">
          <Filter className="h-5 w-5 text-gray-500" />
          <span className="font-semibold text-gray-900">フィルター</span>
          {displayFilteredCount !== null && displayFilteredCount !== displayTotalCount && (
            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
              {displayFilteredCount}件 / {displayTotalCount}件
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">{isExpanded ? '閉じる' : '開く'}</span>
          {isExpanded ? (
            <ChevronDown className="h-5 w-5 text-gray-500" />
          ) : (
            <ChevronRight className="h-5 w-5 text-gray-500" />
          )}
        </div>
      </button>

      {/* 折りたたみ可能なコンテンツ */}
      {isExpanded && (
        <div className="px-6 pb-6 border-t border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {/* 左側：キャンペーンフィルター */}
            <CampaignFilter
              data={data}
              onFilter={handleFilter}
              className="shadow-none border border-gray-200"
            />

            {/* 右側：パフォーマンスフィルター */}
            <PerformanceFilter
              data={data}
              onFilter={handleFilter}
              className="shadow-none border border-gray-200"
            />
          </div>
        </div>
      )}
    </div>
  )
}
