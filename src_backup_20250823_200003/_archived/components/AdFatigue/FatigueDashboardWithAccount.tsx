import React, { useState, useEffect } from 'react'
import { useConvex } from 'convex/react'
import { FatigueDashboardFull } from './FatigueDashboardFull'
import { MetaAccountManagerConvex } from '../../services/metaAccountManagerConvex'
import { MetaAccount } from '../../../types/meta-account'
import { MetaApiService } from '../../services/metaApiService'
import { 
  UserCircleIcon, 
  ArrowPathIcon,
  ExclamationTriangleIcon,
  PlusIcon
} from '@heroicons/react/24/outline'

export const FatigueDashboardWithAccount: React.FC = () => {
  const convex = useConvex()
  const [accounts, setAccounts] = useState<MetaAccount[]>([])
  const [activeAccount, setActiveAccount] = useState<MetaAccount | null>(null)
  const [apiService, setApiService] = useState<MetaApiService | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // アカウントマネージャーの取得
  const accountManager = MetaAccountManagerConvex.getInstance(convex)

  // アカウント情報の読み込み
  useEffect(() => {
    loadAccounts()
  }, [])

  const loadAccounts = async () => {
    try {
      setLoading(true)
      setError(null)

      // アカウント一覧を取得
      const accountsList = await accountManager.getAccounts()
      setAccounts(accountsList)

      // アクティブアカウントを取得
      const active = await accountManager.getActiveAccount()
      setActiveAccount(active)

      // APIサービスを取得
      if (active) {
        const service = await accountManager.getApiService(active.accountId)
        setApiService(service)
      }
    } catch (err) {
      console.error('Failed to load accounts:', err)
      setError('アカウント情報の読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  // アカウント切り替え処理
  const handleAccountChange = async (accountId: string) => {
    try {
      setError(null)
      
      // アクティブアカウントを設定
      await accountManager.setActiveAccount(accountId)
      
      // 新しいアカウント情報を取得
      const newActive = accounts.find(acc => acc.accountId === accountId)
      if (newActive) {
        setActiveAccount(newActive)
        
        // APIサービスを更新
        const service = await accountManager.getApiService(accountId)
        setApiService(service)
      }
    } catch (err) {
      console.error('Failed to change account:', err)
      setError('アカウントの切り替えに失敗しました')
    }
  }

  // ローディング表示
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <ArrowPathIcon className="h-12 w-12 text-indigo-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">アカウント情報を読み込んでいます...</p>
        </div>
      </div>
    )
  }

  // エラー表示
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 m-4">
        <div className="flex items-center">
          <ExclamationTriangleIcon className="h-6 w-6 text-red-600 mr-3" />
          <div>
            <h3 className="text-lg font-medium text-red-800">エラー</h3>
            <p className="text-red-600 mt-1">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  // アカウントが存在しない場合
  if (accounts.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-8 m-4 text-center">
        <UserCircleIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Metaアカウントが登録されていません</h3>
        <p className="text-gray-500 mb-6">
          広告疲労度分析を開始するには、まずMetaアカウントを接続してください。
        </p>
        <a
          href="/meta-api-setup"
          className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Metaアカウントを接続
        </a>
      </div>
    )
  }

  // アカウントが選択されていない場合
  if (!activeAccount) {
    return (
      <div className="p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">アカウントを選択してください</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((account) => (
            <button
              key={account.id}
              onClick={() => handleAccountChange(account.accountId)}
              className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow text-left"
            >
              <div className="flex items-center mb-3">
                <UserCircleIcon className="h-8 w-8 text-gray-400 mr-3" />
                <h3 className="font-medium text-gray-900">{account.name}</h3>
              </div>
              <p className="text-sm text-gray-500">ID: {account.accountId}</p>
              <p className="text-sm text-gray-500 mt-1">
                最終使用: {account.lastUsedAt ? new Date(account.lastUsedAt).toLocaleDateString('ja-JP') : '未使用'}
              </p>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // アカウント切り替えUI付きでダッシュボードを表示
  return (
    <div>
      {/* アカウント切り替えバー */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <UserCircleIcon className="h-5 w-5 text-gray-400 mr-2" />
            <span className="text-sm text-gray-600">現在のアカウント:</span>
            <span className="ml-2 font-medium text-gray-900">{activeAccount.name}</span>
            <span className="ml-2 text-sm text-gray-500">({activeAccount.accountId})</span>
          </div>
          
          {accounts.length > 1 && (
            <select
              value={activeAccount.accountId}
              onChange={(e) => handleAccountChange(e.target.value)}
              className="text-sm border-gray-300 rounded-md"
            >
              {accounts.map((account) => (
                <option key={account.id} value={account.accountId}>
                  {account.name} ({account.accountId})
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* 疲労度ダッシュボード */}
      <FatigueDashboardFull 
        accountId={activeAccount.accountId} 
        apiService={apiService}
      />
    </div>
  )
}