import React, { useState, useEffect } from 'react'
import { useConvex } from 'convex/react'
import { useAdFatigue } from '../hooks/useAdFatigue'
import { SimpleAccountStore } from '../account/account-store'
import { AccountSelector } from '../account/AccountSelector'
import { StatCard } from './StatCard'
import { FatigueTable } from './FatigueTable'
import { Alert } from './Alert'
import { MetaAccount } from '../core/types'

export function FatigueDashboard() {
  const convex = useConvex()
  const [accounts, setAccounts] = useState<MetaAccount[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true)
  
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
  
  const { data, isLoading, error, refetch, dataSource } = useAdFatigue(selectedAccountId || '')
  
  const handleAccountSelect = async (accountId: string) => {
    setSelectedAccountId(accountId)
    const store = new SimpleAccountStore(convex)
    await store.setActiveAccount(accountId)
  }
  
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            Simple Ad Fatigue Dashboard
          </h1>
          
          {selectedAccountId && (
            <div className="flex items-center gap-4">
              {dataSource && (
                <span className="text-sm text-gray-600">
                  データソース: {dataSource === 'cache' ? 'キャッシュ' : 'Meta API'}
                </span>
              )}
              <button
                onClick={refetch}
                disabled={isLoading}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {isLoading ? '更新中...' : 'データ更新'}
              </button>
            </div>
          )}
        </div>
        
        <AccountSelector
          accounts={accounts}
          selectedAccountId={selectedAccountId}
          onSelect={handleAccountSelect}
          isLoading={isLoadingAccounts}
        />
        
        {error && (
          <Alert
            type="error"
            title="データ取得エラー"
            message={error.message}
            action={
              error.message.includes('アクセストークン')
                ? { label: 'Meta API設定を開く', href: '/meta-api-setup' }
                : undefined
            }
          />
        )}
        
        {selectedAccountId && !error && !isLoading && data.length === 0 && (
          <Alert
            type="warning"
            title="広告データが見つかりません"
            message="このアカウントには表示可能な広告データがありません。"
            action={{ label: '再度取得を試す', onClick: refetch }}
          />
        )}
        
        {selectedAccountId && !error && (
          <>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading fatigue data...</p>
              </div>
            ) : (
              <>
                {data.length > 0 && (
                  <>
                    <div className="grid grid-cols-4 gap-4 mb-8">
                      <StatCard title="Total" value={data.length} />
                      <StatCard title="Critical" value={data.filter(d => d.status === 'critical').length} color="red" />
                      <StatCard title="Warning" value={data.filter(d => d.status === 'warning').length} color="yellow" />
                      <StatCard title="Healthy" value={data.filter(d => d.status === 'healthy').length} color="green" />
                    </div>
                    
                    <FatigueTable data={data} />
                  </>
                )}
              </>
            )}
          </>
        )}
        
        {!selectedAccountId && !isLoadingAccounts && (
          <div className="bg-gray-50 rounded-lg p-8 text-center text-gray-500">
            Please select an account to view fatigue data
          </div>
        )}
      </div>
    </div>
  )
}