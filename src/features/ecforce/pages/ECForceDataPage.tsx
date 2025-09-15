import React from 'react'
import { ECForceLayout } from '../components/ECForceLayout'
import { ECForceDataList } from '../components/data/ECForceDataList'

export const ECForceDataPage: React.FC = () => {
  return (
    <ECForceLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ECForce データ一覧</h1>
          <p className="mt-1 text-sm text-gray-600">
            保存済みのパフォーマンスデータを日付ごとに表示します
          </p>
        </div>

        <ECForceDataList />
      </div>
    </ECForceLayout>
  )
}
