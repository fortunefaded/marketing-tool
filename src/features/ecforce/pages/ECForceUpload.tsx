import React from 'react'
import { ECForceLayout } from '../components/ECForceLayout'
import { ECForceUploader } from '../components/upload/ECForceUploader'

export const ECForceUpload: React.FC = () => {
  return (
    <ECForceLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">データアップロード</h1>
          <p className="mt-2 text-sm text-gray-600">
            ECForceのCSVファイルをアップロードしてデータをインポートします
          </p>
        </div>

        <ECForceUploader />
      </div>
    </ECForceLayout>
  )
}
