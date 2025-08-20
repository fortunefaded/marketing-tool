import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useConvex } from 'convex/react'
import { MetaAccountManagerConvex } from '../../services/metaAccountManagerConvex'
import { CheckCircleIcon, ChartBarIcon, ArrowRightIcon } from '@heroicons/react/24/outline'

export const CompleteStepConvex: React.FC = () => {
  const navigate = useNavigate()
  const convexClient = useConvex()
  const [manager] = useState(() => MetaAccountManagerConvex.getInstance(convexClient))
  const [accountName, setAccountName] = useState('')

  useEffect(() => {
    loadAccountInfo()
  }, [])

  const loadAccountInfo = async () => {
    const activeAccount = await manager.getActiveAccount()
    if (activeAccount) {
      setAccountName(activeAccount.name)
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
          <CheckCircleIcon className="h-6 w-6 text-green-600" />
        </div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">設定が完了しました！</h2>
        <p className="text-gray-600">{accountName}の接続が正常に完了しました。</p>
      </div>

      <div className="border-t border-b py-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">次のステップ</h3>
        <div className="space-y-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center h-10 w-10 rounded-md bg-indigo-500 text-white">
                1
              </div>
            </div>
            <div className="ml-4">
              <h4 className="text-sm font-medium text-gray-900">データの同期</h4>
              <p className="mt-1 text-sm text-gray-500">
                Meta広告のキャンペーン、クリエイティブ、インサイトデータが自動的に同期されます。
              </p>
            </div>
          </div>

          <div className="flex items-start">
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center h-10 w-10 rounded-md bg-indigo-500 text-white">
                2
              </div>
            </div>
            <div className="ml-4">
              <h4 className="text-sm font-medium text-gray-900">ダッシュボードで分析</h4>
              <p className="mt-1 text-sm text-gray-500">
                同期されたデータはダッシュボードでリアルタイムに確認できます。
              </p>
            </div>
          </div>

          <div className="flex items-start">
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center h-10 w-10 rounded-md bg-indigo-500 text-white">
                3
              </div>
            </div>
            <div className="ml-4">
              <h4 className="text-sm font-medium text-gray-900">クリエイティブの最適化</h4>
              <p className="mt-1 text-sm text-gray-500">
                パフォーマンスデータを基に、効果的なクリエイティブを特定し改善します。
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-center space-x-4">
        <button
          onClick={() => navigate('/meta-dashboard')}
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <ChartBarIcon className="h-5 w-5 mr-2" />
          ダッシュボードへ
        </button>
        <button
          onClick={() => navigate('/settings')}
          className="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          設定を確認
          <ArrowRightIcon className="h-5 w-5 ml-2" />
        </button>
      </div>
    </div>
  )
}
