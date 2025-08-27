import { useState, useEffect } from 'react'
import { useConvex } from 'convex/react'
import { useAdFatigue } from '../hooks/useAdFatigue'
import { SimpleAccountStore } from '../account/account-store'
import { FatigueDashboardPresentation } from './FatigueDashboardPresentation'
import { MetaAccount } from '@/types'
import type { DateRangeFilter } from '../hooks/useAdFatigueSimplified'

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
  
  // 疲労度データの取得（accountIdがある場合のみ）
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
    filteredCount
  } = useAdFatigue(selectedAccountId || '', dateRange)
  
  // アカウント選択ハンドラ
  const handleAccountSelect = async (accountId: string) => {
    setSelectedAccountId(accountId)
    const store = new SimpleAccountStore(convex)
    await store.setActiveAccount(accountId)
  }
  
  return (
    <FatigueDashboardPresentation
      // アカウント関連
      accounts={accounts}
      selectedAccountId={selectedAccountId}
      isLoadingAccounts={isLoadingAccounts}
      onAccountSelect={handleAccountSelect}
      
      // データ関連
      data={data}
      insights={insights}
      isLoading={isLoading}
      isRefreshing={isRefreshing}
      error={error}
      
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
    />
  )
}