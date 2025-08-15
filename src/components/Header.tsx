import { useState } from 'react'
import { ChevronDownIcon, QuestionMarkCircleIcon, BellIcon } from '@heroicons/react/24/outline'

export default function Header() {
  const [showUserMenu, setShowUserMenu] = useState(false)

  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold">
              <span className="text-gray-800">Mogumo</span>
              <span className="text-gray-700"> Marketing Dashboard</span>
            </h1>
          </div>

          <nav className="flex items-center space-x-1">
            <button className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded">
              特設サイトへ
            </button>
          </nav>
        </div>

        <div className="flex items-center space-x-4">
          <button className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors">
            <span className="text-sm font-medium text-gray-700">設定/管理</span>
          </button>

          <button className="flex items-center space-x-2 px-4 py-2 bg-[#f6d856] hover:bg-[#e5c945] text-gray-800 rounded-md transition-colors">
            <span className="text-sm font-medium">データエクスポート</span>
          </button>

          <div className="flex items-center space-x-3 pl-4 border-l border-gray-200">
            <button className="p-2 hover:bg-gray-100 rounded-full">
              <QuestionMarkCircleIcon className="w-5 h-5 text-gray-500" />
            </button>

            <button className="p-2 hover:bg-gray-100 rounded-full">
              <BellIcon className="w-5 h-5 text-gray-500" />
            </button>

            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-2 hover:bg-gray-100 rounded-md px-2 py-1"
              >
                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-gray-600">A</span>
                </div>
                <div className="text-left">
                  <p className="text-xs font-medium text-gray-900">adebisdemo_2020</p>
                  <p className="text-xs text-gray-500">adebisdemo_2020</p>
                </div>
                <ChevronDownIcon className="w-4 h-4 text-gray-500" />
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                  <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    プロフィール
                  </a>
                  <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    設定
                  </a>
                  <hr className="my-1" />
                  <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    ログアウト
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
