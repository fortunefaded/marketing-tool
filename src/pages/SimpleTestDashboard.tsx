import React, { useState, useEffect } from 'react'
import { useConvex } from 'convex/react'
import { SimpleAccountStore } from '@/features/meta-api/account/account-store'
import { SimpleTokenStore } from '@/features/meta-api/core/token'
import { useECForceData } from '../hooks/useECForceData'

export const SimpleTestDashboard: React.FC = () => {
  const convexClient = useConvex()
  const [accountStore] = useState(() => new SimpleAccountStore(convexClient))
  const [tokenStore] = useState(() => new SimpleTokenStore(convexClient))
  const [isLoading, setIsLoading] = useState(true)
  const [activeAccount, setActiveAccount] = useState<any>(null)
  const [debugInfo, setDebugInfo] = useState<any>({})

  // ECForceデータを取得（日付フィルターなし）
  const { orders: ecforceOrders, isLoading: ecforceLoading } = useECForceData({})

  useEffect(() => {
    const initialize = async () => {
      try {
        console.log('SimpleTestDashboard: 初期化開始')
        
        // Meta広告データの初期化
        const account = await accountStore.getActiveAccount()
        console.log('SimpleTestDashboard: アカウント取得完了', { account })
        
        setActiveAccount(account)
        setDebugInfo(prev => ({ ...prev, account }))
        
        // とりあえずローディング終了
        setIsLoading(false)
        console.log('SimpleTestDashboard: 初期化完了')
      } catch (err) {
        console.error('SimpleTestDashboard: 初期化エラー', err)
        setIsLoading(false)
      }
    }

    initialize()
  }, [accountStore, tokenStore])

  // デバッグ情報を更新
  useEffect(() => {
    setDebugInfo(prev => ({
      ...prev,
      isLoading,
      ecforceLoading,
      ecforceOrdersLength: ecforceOrders.length,
      timestamp: new Date().toISOString(),
    }))
  }, [isLoading, ecforceLoading, ecforceOrders.length])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">アプリケーション初期化中...</p>
          <div className="mt-4 text-sm text-gray-500">
            <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
          </div>
        </div>
      </div>
    )
  }

  if (ecforceLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-gray-600">ECForceデータ読み込み中...</p>
          <div className="mt-4 text-sm text-gray-500">
            <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">シンプルテストダッシュボード</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">システム状態</h3>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-500">アプリケーションローディング</p>
              <p className="text-xl font-semibold">{isLoading ? '読み込み中' : '完了'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">ECForceローディング</p>
              <p className="text-xl font-semibold">{ecforceLoading ? '読み込み中' : '完了'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">ECForce注文数</p>
              <p className="text-xl font-semibold">{ecforceOrders.length}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Metaアカウント</p>
              <p className="text-xl font-semibold">{activeAccount ? '接続済み' : '未接続'}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">デバッグ情報</h3>
          <pre className="text-sm text-gray-600 bg-gray-100 p-4 rounded overflow-x-auto">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>

        {ecforceOrders.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mt-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">ECForce注文サンプル（最初の5件）</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">注文ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">注文日</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">小計</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">顧客番号</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {ecforceOrders.slice(0, 5).map((order, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{order.受注ID}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{order.注文日}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">¥{order.小計?.toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{order.顧客番号}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}