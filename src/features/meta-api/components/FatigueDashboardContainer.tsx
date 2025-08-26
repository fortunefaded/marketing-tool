import { useState, useEffect } from 'react'
import { useConvex } from 'convex/react'
import { useAdFatigue } from '../hooks/useAdFatigue'
import { SimpleAccountStore } from '../account/account-store'
import { FatigueDashboardPresentation } from './FatigueDashboardPresentation'
import { MetaAccount } from '@/types'

/**
 * FatigueDashboard のコンテナコンポーネント
 * 責務: ビジネスロジックと状態管理
 */
export function FatigueDashboardContainer() {
  const convex = useConvex()
  const [accounts, setAccounts] = useState<MetaAccount[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true)
  
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
  
  // 疲労度データの取得
  const {
    data,
    insights,
    isLoading,
    isRefreshing,
    error,
    refetch,
    dataSource,
    lastUpdateTime
  } = useAdFatigue(selectedAccountId || '')
  
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
    />
  )
}