import React from 'react'
import { ECForceLayout } from '../components/ECForceLayout'
import { ImportHistory } from '../components/history/ImportHistory'

export const ECForceHistory: React.FC = () => {
  return (
    <ECForceLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">インポート履歴</h1>
          <p className="mt-2 text-sm text-gray-600">
            過去のデータインポート履歴と詳細を確認できます
          </p>
        </div>

        <ImportHistory />
      </div>
    </ECForceLayout>
  )
}
