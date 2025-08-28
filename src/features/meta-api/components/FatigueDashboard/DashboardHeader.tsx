/**
 * DashboardHeader.tsx
 * ダッシュボードのヘッダー部分
 */

import React from 'react'
import { DateRangeFilter } from '../../types'
import { AccountSelector } from '../../account/AccountSelector'
import { DateRangeFilterComponent } from '../DateRangeFilter'

interface DashboardHeaderProps {
  // アカウント関連
  accounts: any[]
  selectedAccountId: string | null
  isLoadingAccounts: boolean
  onAccountSelect: (accountId: string) => void
  
  // 日付範囲
  dateRange: DateRangeFilter
  onDateRangeChange: (range: DateRangeFilter) => void
  
  // 集約トグル
  enableAggregation?: boolean
  onToggleAggregation?: () => void
  aggregationMetrics?: {
    dataReduction: string
  }
  
  // 更新関連
  isRefreshing: boolean
  onRefresh: (options?: { clearCache?: boolean }) => void
  isRateLimited?: boolean
  rateLimitTimeRemaining?: number
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  accounts,
  selectedAccountId,
  isLoadingAccounts,
  onAccountSelect,
  dateRange,
  onDateRangeChange,
  enableAggregation,
  onToggleAggregation,
  aggregationMetrics,
  isRefreshing,
  onRefresh,
  isRateLimited,
  rateLimitTimeRemaining
}) => {
  return (
    <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900">
          Ad Fatigue Dashboard
        </h1>
        
        {selectedAccountId && (
          <div className="flex items-center gap-3">
            {/* 日付範囲フィルター */}
            <DateRangeFilterComponent 
              value={dateRange}
              onChange={onDateRangeChange} 
            />

            {/* 集約トグル */}
            {onToggleAggregation && (
              <button
                onClick={onToggleAggregation}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  enableAggregation 
                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
                title={enableAggregation ? 'データを広告単位で集約中' : 'データ集約がオフです'}
              >
                集約: {enableAggregation ? 'ON' : 'OFF'}
                {aggregationMetrics && enableAggregation && (
                  <span className="ml-2 text-xs opacity-90">
                    ({aggregationMetrics.dataReduction}削減)
                  </span>
                )}
              </button>
            )}

            {/* レート制限状態 */}
            {isRateLimited && (
              <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 border border-orange-200 rounded-lg">
                <svg className="w-5 h-5 text-orange-600 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm text-orange-700">
                  レート制限中: {rateLimitTimeRemaining}秒後に再試行可能
                </span>
              </div>
            )}
            
            {/* データ更新ボタン */}
            <button
              onClick={() => onRefresh({ clearCache: true })}
              disabled={isRefreshing || isRateLimited}
              className={`px-4 py-2 rounded-lg text-white transition-colors ${
                isRefreshing || isRateLimited
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-indigo-600 hover:bg-indigo-700 cursor-pointer'
              }`}
            >
              {isRefreshing ? '更新中...' : 'データ更新'}
            </button>
          </div>
        )}
      </div>

      {/* アカウント選択 */}
      <AccountSelector
        accounts={accounts}
        selectedAccountId={selectedAccountId}
        onSelect={onAccountSelect}
        isLoading={isLoadingAccounts}
      />
    </div>
  )
}