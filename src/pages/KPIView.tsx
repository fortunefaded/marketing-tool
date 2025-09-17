import React from 'react'
import { ChartBarSquareIcon, ArrowTrendingUpIcon, UserGroupIcon, CurrencyYenIcon } from '@heroicons/react/24/outline'

// 将来的にメインダッシュボードとなるKPIビューページ
export default function KPIView() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ページヘッダー */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <ChartBarSquareIcon className="w-8 h-8 text-[#f6d856]" />
            KPIビュー
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            重要な指標を一目で確認できるダッシュボード
          </p>
        </div>

        {/* KPIカードセクション */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* ROAS */}
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">ROAS</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">3.45</p>
                <p className="mt-1 text-sm text-green-600">
                  +12% 前週比
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <ArrowTrendingUpIcon className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          {/* CPA */}
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">CPA</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">¥2,450</p>
                <p className="mt-1 text-sm text-green-600">
                  -8% 前週比
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <CurrencyYenIcon className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          {/* CVR */}
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">CVR</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">2.8%</p>
                <p className="mt-1 text-sm text-green-600">
                  +0.3% 前週比
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <UserGroupIcon className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          {/* 広告疲労度 */}
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-orange-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">広告疲労度</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">42</p>
                <p className="mt-1 text-sm text-orange-600">
                  要注意レベル
                </p>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <ChartBarSquareIcon className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* 詳細セクション（将来的に拡張予定） */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* パフォーマンス推移 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              パフォーマンス推移
            </h2>
            <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-300 rounded">
              <p className="text-gray-500">グラフ実装予定</p>
            </div>
          </div>

          {/* クリエイティブ疲労度分析 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              クリエイティブ疲労度分析
            </h2>
            <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-300 rounded">
              <p className="text-gray-500">分析データ実装予定</p>
            </div>
          </div>
        </div>

        {/* アクションアイテム */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            推奨アクション
          </h2>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg">
              <div className="w-2 h-2 rounded-full bg-yellow-400 mt-2"></div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Campaign_A の広告疲労度が高まっています
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  CTRが25%低下しています。クリエイティブの更新を検討してください。
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
              <div className="w-2 h-2 rounded-full bg-blue-400 mt-2"></div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Campaign_B のパフォーマンスが向上中
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  ROASが前週比20%上昇。予算配分の見直しを推奨します。
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 開発中のお知らせ */}
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <span className="font-semibold">開発中:</span> このページは将来的にメインダッシュボードとなる予定です。現在のダッシュボードは詳細版として残ります。
          </p>
        </div>
      </div>
    </div>
  )
}