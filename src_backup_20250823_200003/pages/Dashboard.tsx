import React, { useState, useMemo } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { CreativePerformance } from '../components/analytics/CreativePerformance'
import { OptimizedCreativePerformance } from '../components/analytics/OptimizedCreativePerformance'
import { MetaAccountManager } from '../_archived/services/metaAccountManager'
import { AccountSelectorConvex } from '../_archived/components/meta/AccountSelectorConvex'
import { PresentationChartLineIcon, ArrowPathIcon } from '@heroicons/react/24/outline'
import { useNavigate } from 'react-router-dom'

export const Dashboard: React.FC = () => {
  const [useOptimized, setUseOptimized] = useState(false)
  const navigate = useNavigate()
  
  // アクティブなアカウントを取得
  const manager = MetaAccountManager.getInstance()
  const activeAccount = manager.getActiveAccount()
  const accountId = activeAccount?.accountId || ''

  // Convexからインサイトデータを取得
  const insights = useQuery(
    api.metaInsights.getInsights, 
    accountId ? { accountId } : 'skip'
  )

  // 広告レベルのインサイトのみをフィルタリング
  const adLevelInsights = useMemo(() => {
    if (!insights) return []
    return insights.filter(insight => insight.ad_id && insight.ad_id !== '')
  }, [insights])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <PresentationChartLineIcon className="h-8 w-8 text-indigo-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">クリエイティブ分析ダッシュボード</h1>
            </div>
            <div className="flex items-center space-x-4">
              {accountId && (
                <button
                  onClick={() => navigate('/meta-dashboard')}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <ArrowPathIcon className="h-4 w-4 mr-2" />
                  データを同期
                </button>
              )}
              <AccountSelectorConvex
                onAccountChange={() => {
                  // アカウント変更時に自動的にリロード
                  window.location.reload()
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!accountId ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center max-w-2xl mx-auto mt-8">
            <h3 className="text-lg font-medium text-yellow-900 mb-2">
              Meta広告アカウントを選択してください
            </h3>
            <p className="text-yellow-800 mb-4">
              右上のプルダウンからアカウントを選択して、クリエイティブ分析を開始しましょう。
            </p>
            <div className="mt-6">
              <button
                onClick={() => navigate('/meta-api-setup')}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
              >
                新しいアカウントを追加
              </button>
            </div>
          </div>
        ) : !insights ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : adLevelInsights.length === 0 ? (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
            <p className="text-blue-800">
              データがありません。Meta広告データを同期してください。
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* パフォーマンスモード切り替え */}
            <div className="flex justify-end">
              <label className="flex items-center cursor-pointer">
                <span className="mr-3 text-sm text-gray-700">
                  高速モード
                </span>
                <div className="relative">
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={useOptimized}
                    onChange={(e) => setUseOptimized(e.target.checked)}
                  />
                  <div className={`block w-14 h-8 rounded-full ${useOptimized ? 'bg-indigo-600' : 'bg-gray-300'}`}></div>
                  <div className={`absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${useOptimized ? 'transform translate-x-6' : ''}`}></div>
                </div>
              </label>
            </div>

            {/* クリエイティブパフォーマンスコンポーネント */}
            {useOptimized ? (
              <OptimizedCreativePerformance insights={adLevelInsights} />
            ) : (
              <CreativePerformance insights={adLevelInsights} />
            )}
          </div>
        )}
      </div>
    </div>
  )
}