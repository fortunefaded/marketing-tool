import React, { useState, useEffect } from 'react'
import { Cog6ToothIcon } from '@heroicons/react/24/outline'
import { useConvex } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useNavigate, Link } from 'react-router-dom'

export const SettingsManagement: React.FC = () => {
  const convex = useConvex()
  const navigate = useNavigate()
  const [hasMetaAccounts, setHasMetaAccounts] = useState(false)
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true)

  // Convexからアカウント情報を取得
  useEffect(() => {
    const checkAccounts = async () => {
      try {
        setIsLoadingAccounts(true)
        const accounts = await convex.query(api.metaAccounts.getAccounts)
        setHasMetaAccounts(accounts && accounts.length > 0)
      } catch (error) {
        console.error('アカウント確認エラー:', error)
        setHasMetaAccounts(false)
      } finally {
        setIsLoadingAccounts(false)
      }
    }
    checkAccounts()
  }, [convex])

  const handleMetaApiClick = () => {
    // Meta API設定ページに遷移
    navigate('/settings/meta-api')
  }

  const renderContent = () => {
    return (
      <div className="space-y-6">
        <h3 className="text-lg font-medium text-gray-900">API連携設定</h3>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-base font-medium text-gray-900">Meta (Facebook) API</h4>
              <p className="text-sm text-gray-500 mt-1">Meta広告のデータを取得するための設定</p>
            </div>
            <button
              onClick={handleMetaApiClick}
              disabled={isLoadingAccounts}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                isLoadingAccounts
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : hasMetaAccounts
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isLoadingAccounts ? '確認中...' : hasMetaAccounts ? '設定を変更' : '設定する'}
            </button>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-base font-medium text-gray-900">ECForce データ連携</h4>
              <p className="text-sm text-gray-500 mt-1">
                ECForceの広告パフォーマンスデータをインポート・管理
              </p>
            </div>
            <Link
              to="/settings/ecforce"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium transition-colors"
            >
              設定を開く
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">設定・管理</h1>
          <p className="mt-1 text-sm text-gray-500">システムの各種設定とデータ管理を行います</p>
        </div>

        {/* API連携設定のみを表示（サイドバーなし） */}
        <div className="w-full">{renderContent()}</div>
      </div>
    </div>
  )
}
