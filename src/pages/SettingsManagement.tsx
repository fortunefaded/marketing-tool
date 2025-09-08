import React from 'react'
import { Cog6ToothIcon } from '@heroicons/react/24/outline'

export const SettingsManagement: React.FC = () => {
  // const sections = [ - 未使用
  //   {
  //     id: 'api',
  //     title: 'API連携設定',
  //     icon: Cog6ToothIcon,
  //     description: '外部サービスとの連携設定を管理します',
  //   },
  // ]

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
              disabled
              className="px-4 py-2 bg-gray-300 text-gray-500 rounded-md cursor-not-allowed text-sm font-medium"
            >
              設定済み
            </button>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-base font-medium text-gray-900">Google Ads API</h4>
              <p className="text-sm text-gray-500 mt-1">Google広告のデータを取得するための設定</p>
            </div>
            <button
              disabled
              className="px-4 py-2 bg-gray-300 text-gray-500 rounded-md cursor-not-allowed text-sm font-medium"
            >
              近日公開
            </button>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-base font-medium text-gray-900">LINE Ads API</h4>
              <p className="text-sm text-gray-500 mt-1">LINE広告のデータを取得するための設定</p>
            </div>
            <button
              disabled
              className="px-4 py-2 bg-gray-300 text-gray-500 rounded-md cursor-not-allowed text-sm font-medium"
            >
              近日公開
            </button>
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
