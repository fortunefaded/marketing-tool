import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  CloudArrowUpIcon,
  ArrowPathIcon,
  ClockIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline'

const navigation = [
  { name: 'ダッシュボード', href: '/settings/ecforce', icon: ChartBarIcon },
  { name: 'データアップロード', href: '/settings/ecforce/upload', icon: CloudArrowUpIcon },
  { name: '自動同期設定', href: '/settings/ecforce/sync', icon: ArrowPathIcon },
  { name: 'インポート履歴', href: '/settings/ecforce/history', icon: ClockIcon },
]

export const ECForceNav: React.FC = () => {
  const location = useLocation()

  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between">
          <div className="flex">
            <div className="flex flex-shrink-0 items-center">
              <h2 className="text-xl font-semibold text-gray-900">ECForce データ連携</h2>
            </div>
            <div className="hidden sm:ml-8 sm:flex sm:space-x-8">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`
                      inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium
                      ${
                        isActive
                          ? 'border-blue-500 text-gray-900'
                          : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                      }
                    `}
                  >
                    <item.icon className="mr-2 h-4 w-4" />
                    {item.name}
                  </Link>
                )
              })}
            </div>
          </div>
          <div className="flex items-center">
            <Link to="/settings" className="text-sm text-gray-500 hover:text-gray-700">
              設定に戻る
            </Link>
          </div>
        </div>
      </div>

      {/* モバイルナビゲーション */}
      <div className="sm:hidden">
        <div className="space-y-1 pb-3 pt-2">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`
                  block border-l-4 py-2 pl-3 pr-4 text-base font-medium
                  ${
                    isActive
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-700'
                  }
                `}
              >
                <div className="flex items-center">
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.name}
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
