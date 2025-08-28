import { useState, useEffect } from 'react'
import { useConvex } from 'convex/react'
import { useAdFatigue } from '../hooks/useAdFatigue'
import { useAdFatigueWithAggregation } from '../hooks/useAdFatigueWithAggregation'
import { SimpleAccountStore } from '../account/account-store'
import { FatigueDashboardPresentation } from './FatigueDashboardPresentation'
import { MetaAccount } from '@/types'
import type { DateRangeFilter } from '../hooks/useAdFatigueSimplified'
import { DEFAULT_SIMPLIFIED_CONFIG } from '../types/aggregation-config'

/**
 * FatigueDashboard のコンテナコンポーネント
 * 責務: ビジネスロジックと状態管理
 */
export function FatigueDashboardContainer() {
  const convex = useConvex()
  const [accounts, setAccounts] = useState<MetaAccount[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true)
  const [dateRange, setDateRange] = useState<DateRangeFilter>('last_30d')
  // TASK-102: SimplifiedAggregationConfig使用による常時集約有効化
  const enableAggregation = DEFAULT_SIMPLIFIED_CONFIG.alwaysEnabled
  const [filteredData, setFilteredData] = useState<any>(null) // フィルター済みデータ
  
  // アカウント読み込み
  useEffect(() => {
    const loadAccounts = async () => {
      setIsLoadingAccounts(true)
      const store = new SimpleAccountStore(convex)
      const accountsList = await store.getAccounts()
      setAccounts(accountsList)
      
      const activeAccount = await store.getActiveAccount()
      if (activeAccount) {
        setSelectedAccountId(activeAccount.accountId)
      } else if (accountsList.length > 0) {
        setSelectedAccountId(accountsList[0].accountId)
      }
      
      setIsLoadingAccounts(false)
    }
    
    loadAccounts()
  }, [convex])
  
  // 集約機能付き疲労度データの取得
  const {
    data,
    insights,
    isLoading,
    isRefreshing,
    error,
    refetch,
    dataSource,
    lastUpdateTime,
    progress,
    totalInsights,
    filteredCount,
    // 集約関連の新しいプロパティ
    aggregatedData,
    isAggregating,
    aggregationError,
    aggregationMetrics
  } = useAdFatigueWithAggregation({
    accountId: selectedAccountId || '',
    dateRange,
    enableAggregation,
    aggregationOptions: {
      includePlatformBreakdown: DEFAULT_SIMPLIFIED_CONFIG.includePlatformBreakdown,
      includeDailyBreakdown: DEFAULT_SIMPLIFIED_CONFIG.includeDailyBreakdown
    }
  })
  
  // アカウント選択ハンドラ
  const handleAccountSelect = async (accountId: string) => {
    setSelectedAccountId(accountId)
    const store = new SimpleAccountStore(convex)
    await store.setActiveAccount(accountId)
  }
  
  // 表示するデータを決定（フィルター > 集約 > 元データ）
  // filteredDataが配列でない場合はnullとして扱う
  const displayData = Array.isArray(filteredData) 
    ? filteredData 
    : (enableAggregation && aggregatedData ? aggregatedData : data) || []

  return (
    <FatigueDashboardPresentation
      // アカウント関連
      accounts={accounts}
      selectedAccountId={selectedAccountId}
      isLoadingAccounts={isLoadingAccounts}
      onAccountSelect={handleAccountSelect}
      
      // データ関連（フィルター済みまたは集約データを使用）
      data={displayData}
      insights={insights}
      isLoading={isLoading || isAggregating}
      isRefreshing={isRefreshing}
      error={error || aggregationError}
      
      // アクション
      onRefresh={refetch}
      
      // メタ情報
      dataSource={dataSource}
      lastUpdateTime={lastUpdateTime}
      
      // 進捗情報
      progress={progress}
      
      // フィルター関連
      dateRange={dateRange}
      onDateRangeChange={setDateRange}
      totalInsights={totalInsights}
      filteredCount={filteredCount}
      
      // 集約関連の新しいプロパティ
      enableAggregation={enableAggregation}
      // onToggleAggregationは削除（常に集約有効のため不要）
      aggregatedData={aggregatedData}
      aggregationMetrics={aggregationMetrics}
      isAggregating={isAggregating}
      
      // フィルター関連
      onFilterChange={setFilteredData}
      sourceData={(enableAggregation && aggregatedData ? aggregatedData : data) || []}
    />
  )
}