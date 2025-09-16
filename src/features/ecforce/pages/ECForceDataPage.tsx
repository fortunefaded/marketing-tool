import React, { useState } from 'react'
import { ECForceLayout } from '../components/ECForceLayout'
import { ECForceDataList } from '../components/data/ECForceDataList'
import { ECForceMonthlyData } from '../components/data/ECForceMonthlyData'
import { CalendarDaysIcon, ChartBarIcon } from '@heroicons/react/24/outline'

export const ECForceDataPage: React.FC = () => {
  const [viewMode, setViewMode] = useState<'daily' | 'monthly'>('daily')

  return (
    <ECForceLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ECForce データ一覧</h1>
          <p className="mt-1 text-sm text-gray-600">
            保存済みのパフォーマンスデータを時間軸別に表示します
          </p>
        </div>

        {/* 表示モード切り替えタブ */}
        <div className="bg-white rounded-lg shadow">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
              <button
                onClick={() => setViewMode('daily')}
                className={`${
                  viewMode === 'daily'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
              >
                <CalendarDaysIcon className="h-5 w-5" />
                日次データ
              </button>
              <button
                onClick={() => setViewMode('monthly')}
                className={`${
                  viewMode === 'monthly'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
              >
                <ChartBarIcon className="h-5 w-5" />
                月別集計
              </button>
            </nav>
          </div>
        </div>

        {/* データ表示 */}
        {viewMode === 'daily' ? <ECForceDataList /> : <ECForceMonthlyData />}
      </div>
    </ECForceLayout>
  )
}
