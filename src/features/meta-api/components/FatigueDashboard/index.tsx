/**
 * FatigueDashboard/index.tsx
 * リファクタリング後のメインコンテナコンポーネント
 */

import React, { useState, useMemo } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useMetaAdsData } from '../../hooks/core/useMetaAdsData'
import { useAdAggregation } from '../../hooks/composed/useAdAggregation'
import { useFatigueScoring } from '../../hooks/composed/useFatigueScoring'
import { useDataFiltering } from '../../hooks/composed/useDataFiltering'
import { DateRangeFilter, UnifiedAdData } from '../../types'

// 子コンポーネント
import { DashboardHeader } from './DashboardHeader'
import { DashboardFilters } from './DashboardFilters'
import { DashboardStats } from './DashboardStats'
import { DashboardEmpty } from './DashboardEmpty'
import { CreativeTableTab } from '../CreativeTableTab'
import { VirtualizedCreativeTable } from '../VirtualizedCreativeTable'
import { AggregatedFatigueTable } from '../AggregatedFatigueTable'
import { DataLoadingProgress } from '../DataLoadingProgress'
import { DataValidationAlert } from '../DataValidationAlert'
import { aggregateByLevel } from '../../utils/aggregation'

interface FatigueDashboardProps {
  accounts: any[]
  selectedAccountId: string | null
  isLoadingAccounts: boolean
  onAccountSelect: (accountId: string) => void
}

export const FatigueDashboard: React.FC<FatigueDashboardProps> = ({
  accounts,
  selectedAccountId,
  isLoadingAccounts,
  onAccountSelect
}) => {
  // 状態管理
  const [dateRange, setDateRange] = useState<DateRangeFilter>('last_30d')
  const [enableAggregation, setEnableAggregation] = useState(false)
  const [enableVirtualization, setEnableVirtualization] = useState(false)
  const [activeTab, setActiveTab] = useState('creative-table')

  // データ取得
  const {
    data: rawData,
    isLoading,
    isRefreshing,
    error,
    dataSource,
    lastUpdateTime,
    refetch
  } = useMetaAdsData({
    accountId: selectedAccountId || '',
    dateRange,
    preferCache: true
  })

  // データ集約
  const {
    aggregatedData,
    aggregationMetrics,
    isAggregating
  } = useAdAggregation(rawData, {
    enabled: enableAggregation
  })

  // 疲労度計算
  const {
    scoredData,
    fatigueScores,
    statistics: fatigueStatistics,
    baseline
  } = useFatigueScoring(
    enableAggregation && aggregatedData.length > 0 
      ? aggregatedData as UnifiedAdData[] 
      : rawData,
    { enabled: true }
  )

  // フィルタリング
  const {
    sortedData: filteredData,
    criteria,
    updateCriteria,
    resetCriteria,
    filterStats
  } = useDataFiltering(scoredData)

  // レベル別集約（タブ用）
  const levelAggregatedData = useMemo(() => ({
    adset: aggregateByLevel(filteredData, 'adset'),
    campaign: aggregateByLevel(filteredData, 'campaign')
  }), [filteredData])

  // ハンドラー
  const handleRefresh = async (options?: { clearCache?: boolean }) => {
    await refetch(options)
  }

  const handleFilterChange = (filtered: UnifiedAdData[]) => {
    // フィルタリングロジック
    console.log('Filter applied:', filtered.length)
  }

  const handleToggleAggregation = () => {
    setEnableAggregation(!enableAggregation)
  }

  // レンダリング
  if (!selectedAccountId && !isLoadingAccounts) {
    return (
      <DashboardEmpty
        hasSourceData={false}
        isFiltered={false}
        selectedAccountId={selectedAccountId}
        isLoadingAccounts={isLoadingAccounts}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* ヘッダー */}
        <DashboardHeader
          accounts={accounts}
          selectedAccountId={selectedAccountId}
          isLoadingAccounts={isLoadingAccounts}
          onAccountSelect={onAccountSelect}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          enableAggregation={enableAggregation}
          onToggleAggregation={handleToggleAggregation}
          aggregationMetrics={aggregationMetrics}
          isRefreshing={isRefreshing}
          onRefresh={handleRefresh}
        />

        {/* エラー表示 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error.message}</p>
          </div>
        )}

        {/* ローディング表示 */}
        {isLoading && !filteredData.length ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading fatigue data...</p>
          </div>
        ) : (
          <>
            {/* データ検証アラート */}
            {filteredData.length > 0 && (
              <DataValidationAlert
                data={filteredData}
                onRevalidate={() => handleRefresh()}
                isValidating={isLoading}
              />
            )}

            {/* フィルター */}
            <DashboardFilters
              sourceData={scoredData}
              filteredData={filteredData}
              onFilterChange={handleFilterChange}
            />

            {/* 統計カード */}
            <DashboardStats
              data={filteredData}
              enableAggregation={enableAggregation}
              aggregationMetrics={aggregationMetrics}
              fatigueStatistics={fatigueStatistics}
            />

            {/* データ表示 */}
            {filteredData.length > 0 ? (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-3 mb-6">
                    <TabsTrigger value="creative-table">
                      クリエイティブ
                    </TabsTrigger>
                    <TabsTrigger value="adset">広告セット</TabsTrigger>
                    <TabsTrigger value="campaign">キャンペーン</TabsTrigger>
                  </TabsList>

                  <TabsContent value="creative-table">
                    {enableVirtualization && filteredData.length > 100 ? (
                      <VirtualizedCreativeTable
                        data={filteredData}
                        fatigueScores={fatigueScores}
                        height={600}
                      />
                    ) : (
                      <CreativeTableTab
                        data={filteredData}
                        insights={[]}
                        selectedAccountId={selectedAccountId}
                        isLoading={isLoading}
                      />
                    )}
                  </TabsContent>

                  <TabsContent value="adset">
                    <AggregatedFatigueTable 
                      data={levelAggregatedData.adset} 
                      level="adset" 
                    />
                  </TabsContent>

                  <TabsContent value="campaign">
                    <AggregatedFatigueTable 
                      data={levelAggregatedData.campaign} 
                      level="campaign" 
                    />
                  </TabsContent>
                </Tabs>
              </div>
            ) : (
              <DashboardEmpty
                hasSourceData={scoredData.length > 0}
                isFiltered={filterStats.filterActive}
                onClearFilters={resetCriteria}
                onRefresh={() => handleRefresh({ clearCache: true })}
                selectedAccountId={selectedAccountId}
                isLoadingAccounts={isLoadingAccounts}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default FatigueDashboard