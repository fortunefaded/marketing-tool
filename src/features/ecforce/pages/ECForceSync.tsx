import React from 'react'
import { ECForceLayout } from '../components/ECForceLayout'
import { SyncSettings } from '../components/sync/SyncSettings'

export const ECForceSync: React.FC = () => {
  return (
    <ECForceLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">自動同期設定</h1>
          <p className="mt-2 text-sm text-gray-600">
            定期的にECForceデータを自動取得する設定を行います
          </p>
        </div>

        <SyncSettings />
      </div>
    </ECForceLayout>
  )
}
