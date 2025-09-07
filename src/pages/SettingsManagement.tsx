import React, { useState } from 'react'
import {
  Cog6ToothIcon,
  CloudArrowUpIcon,
  DocumentTextIcon,
  BellIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  CircleStackIcon,
} from '@heroicons/react/24/outline'
import { DataManagement } from '../components/settings/DataManagement'

export const SettingsManagement: React.FC = () => {
  const [activeSection, setActiveSection] = useState<string>('api')

  const sections = [
    {
      id: 'api',
      title: 'API連携設定',
      icon: Cog6ToothIcon,
      description: '外部サービスとの連携設定を管理します',
    },
    {
      id: 'import',
      title: 'データインポート',
      icon: CloudArrowUpIcon,
      description: 'CSVファイルなどからデータをインポートします',
    },
    {
      id: 'notifications',
      title: '通知設定',
      icon: BellIcon,
      description: 'アラートや通知の設定を管理します',
    },
    {
      id: 'security',
      title: 'セキュリティ',
      icon: ShieldCheckIcon,
      description: 'パスワードやアクセス権限の設定',
    },
    {
      id: 'users',
      title: 'ユーザー管理',
      icon: UserGroupIcon,
      description: 'ユーザーの追加・編集・削除',
    },
    {
      id: 'reports',
      title: 'レポート設定',
      icon: DocumentTextIcon,
      description: 'レポートの自動生成とエクスポート設定',
    },
    {
      id: 'storage',
      title: 'データ管理',
      icon: CircleStackIcon,
      description: 'ローカルデータの管理とストレージ設定',
    },
  ]

  const renderContent = () => {
    switch (activeSection) {
      case 'api':
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
                  <p className="text-sm text-gray-500 mt-1">
                    Google広告のデータを取得するための設定
                  </p>
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

      case 'import':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">データインポート</h3>

            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-base font-medium text-gray-900">ECForce売上データ</h4>
                  <p className="text-sm text-gray-500 mt-1">
                    ECForceからエクスポートしたCSVファイルをインポート
                  </p>
                </div>
                <button
                  disabled
                  className="px-4 py-2 bg-gray-300 text-gray-500 rounded-md cursor-not-allowed text-sm font-medium"
                >
                  準備中
                </button>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-base font-medium text-gray-900">カスタムCSVインポート</h4>
                  <p className="text-sm text-gray-500 mt-1">
                    独自フォーマットのCSVファイルをインポート
                  </p>
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

      case 'notifications':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">通知設定</h3>
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <p className="text-gray-500">通知設定機能は準備中です。</p>
            </div>
          </div>
        )

      case 'security':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">セキュリティ設定</h3>
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <p className="text-gray-500">セキュリティ設定機能は準備中です。</p>
            </div>
          </div>
        )

      case 'users':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">ユーザー管理</h3>
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <p className="text-gray-500">ユーザー管理機能は準備中です。</p>
            </div>
          </div>
        )

      case 'reports':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">レポート設定</h3>
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <p className="text-gray-500">レポート設定機能は準備中です。</p>
            </div>
          </div>
        )

      case 'storage':
        return (
          <div className="space-y-6">
            <DataManagement />
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">設定・管理</h1>
          <p className="mt-1 text-sm text-gray-500">システムの各種設定とデータ管理を行います</p>
        </div>

        <div className="flex gap-6">
          {/* サイドバー */}
          <div className="w-64 flex-shrink-0">
            <nav className="space-y-1">
              {sections.map((section) => {
                const Icon = section.icon
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeSection === section.id
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <Icon className="mr-3 h-5 w-5 flex-shrink-0" />
                    {section.title}
                  </button>
                )
              })}
            </nav>
          </div>

          {/* コンテンツエリア */}
          <div className="flex-1">{renderContent()}</div>
        </div>
      </div>
    </div>
  )
}
