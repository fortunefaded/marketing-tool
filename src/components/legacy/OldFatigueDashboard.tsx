import React, { useState, useEffect } from 'react'
import { useConvex } from 'convex/react'
import { 
  UserCircleIcon, 
  ArrowPathIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  ChartBarIcon,
  CheckCircleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'
import { MetaAccount } from '@/types'
import { SimpleAccountStore } from '@/features/meta-api/account/account-store'
import { useAdFatigue } from '@/features/meta-api/hooks/useAdFatigue'

export const OldFatigueDashboard: React.FC = () => {
  const convex = useConvex()
  const [accounts, setAccounts] = useState<MetaAccount[]>([])
  const [activeAccount, setActiveAccount] = useState<MetaAccount | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // アカウント情報の読み込み
  useEffect(() => {
    loadAccounts()
  }, [])

  const loadAccounts = async () => {
    try {
      setLoading(true)
      setError(null)

      const accountStore = new SimpleAccountStore(convex)
      
      // アカウント一覧を取得
      const accountsList = await accountStore.getAccounts()
      setAccounts(accountsList)

      // アクティブアカウントを取得
      const active = await accountStore.getActiveAccount()
      setActiveAccount(active || (accountsList.length > 0 ? accountsList[0] : null))
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
      
      const accountStore = new SimpleAccountStore(convex)
      await accountStore.setActiveAccount(accountId)
      
      const newActive = accounts.find(acc => acc.accountId === accountId)
      if (newActive) {
        setActiveAccount(newActive)
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
        <button
          onClick={loadAccounts}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          再試行
        </button>
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
              key={account.accountId}
              onClick={() => handleAccountChange(account.accountId)}
              className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow text-left"
            >
              <div className="flex items-center mb-3">
                <UserCircleIcon className="h-8 w-8 text-gray-400 mr-3" />
                <h3 className="font-medium text-gray-900">{account.name}</h3>
              </div>
              <p className="text-sm text-gray-500">ID: {account.accountId}</p>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // メインダッシュボード表示
  return <OldFatigueDashboardMain accountId={activeAccount.accountId} accounts={accounts} activeAccount={activeAccount} onAccountChange={handleAccountChange} />
}

// メインダッシュボードコンポーネント
const OldFatigueDashboardMain: React.FC<{
  accountId: string
  accounts: MetaAccount[]
  activeAccount: MetaAccount
  onAccountChange: (accountId: string) => void
}> = ({ accountId, accounts, activeAccount, onAccountChange }) => {
  
  const { data: allAdsData, isLoading, error, refetch } = useAdFatigue(accountId)

  // 統計情報の計算
  const stats = React.useMemo(() => {
    const critical = allAdsData.filter(ad => ad.score < 50).length
    const warning = allAdsData.filter(ad => ad.score >= 50 && ad.score < 70).length
    const caution = allAdsData.filter(ad => ad.score >= 70 && ad.score < 85).length
    const healthy = allAdsData.filter(ad => ad.score >= 85).length
    
    return {
      total: allAdsData.length,
      critical,
      warning, 
      caution,
      healthy,
      avgScore: allAdsData.reduce((sum, ad) => sum + ad.score, 0) / (allAdsData.length || 1)
    }
  }, [allAdsData])

  // サマリーカード
  const SummaryCard = ({ title, value, icon: Icon, color }: any) => (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-full ${color}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-100">
      {/* ヘッダー */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <ChartBarIcon className="h-8 w-8 text-indigo-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">Ad Fatigue Dashboard (Legacy)</h1>
            </div>
            
            {/* アカウント切り替え */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <UserCircleIcon className="h-5 w-5 text-gray-400 mr-2" />
                <span className="text-sm text-gray-600">アカウント:</span>
                <select
                  value={activeAccount.accountId}
                  onChange={(e) => onAccountChange(e.target.value)}
                  className="ml-2 text-sm border-gray-300 rounded-md"
                >
                  {accounts.map((account) => (
                    <option key={account.accountId} value={account.accountId}>
                      {account.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <button
                onClick={() => refetch()}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <ArrowPathIcon className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                更新
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* エラー表示 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mr-2" />
              <p className="text-red-600">データの取得に失敗しました: {error.message}</p>
            </div>
          </div>
        )}

        {/* 統計サマリー */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <SummaryCard
            title="総広告数"
            value={stats.total}
            icon={ChartBarIcon}
            color="bg-indigo-500"
          />
          <SummaryCard
            title="健全"
            value={stats.healthy}
            icon={CheckCircleIcon}
            color="bg-green-500"
          />
          <SummaryCard
            title="警告"
            value={stats.warning}
            icon={ExclamationTriangleIcon}
            color="bg-yellow-500"
          />
          <SummaryCard
            title="危険"
            value={stats.critical}
            icon={ExclamationTriangleIcon}
            color="bg-red-500"
          />
        </div>

        {/* データテーブル */}
        {isLoading ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <ArrowPathIcon className="h-8 w-8 text-gray-400 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">データを読み込んでいます...</p>
          </div>
        ) : allAdsData.length > 0 ? (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">広告一覧</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      広告名
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      疲労スコア
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      状態
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      フリークエンシー
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      CTR
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {allAdsData.map((ad) => (
                    <tr key={ad.adId}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {ad.adName || ad.adId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">{ad.score}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          ad.score >= 85 ? 'bg-green-100 text-green-800' :
                          ad.score >= 70 ? 'bg-yellow-100 text-yellow-800' :
                          ad.score >= 50 ? 'bg-orange-100 text-orange-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {ad.score >= 85 ? '健全' :
                           ad.score >= 70 ? '注意' :
                           ad.score >= 50 ? '警告' : '危険'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {ad.metrics?.frequency?.toFixed(2) || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {ad.metrics?.ctr?.toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <InformationCircleIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">データがありません</h3>
            <p className="text-gray-600">
              このアカウントには分析可能な広告データがありません。
            </p>
          </div>
        )}
      </div>
    </div>
  )
}