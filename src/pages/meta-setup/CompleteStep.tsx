import React from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircleIcon, ArrowRightIcon } from '@heroicons/react/24/outline'
import { MetaAccountManager } from '../../_archived/services/metaAccountManager'

export const CompleteStep: React.FC = () => {
  const navigate = useNavigate()
  const manager = MetaAccountManager.getInstance()
  const activeAccount = manager.getActiveAccount()

  const handleGoToDashboard = () => {
    navigate('/meta-dashboard')
  }

  const handleAddAnotherAccount = () => {
    navigate('/meta-api-setup/connect')
  }

  return (
    <div className="space-y-6">
      <div className="text-center py-8">
        <CheckCircleIcon className="mx-auto h-16 w-16 text-green-500" />
        <h2 className="mt-4 text-2xl font-semibold text-gray-900">設定が完了しました！</h2>
        <p className="mt-2 text-gray-600">
          Meta広告APIの設定が正常に完了しました。 ダッシュボードで広告データの分析を開始できます。
        </p>
      </div>

      {activeAccount && (
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">接続されたアカウント情報</h3>
          <dl className="space-y-2">
            <div>
              <dt className="text-sm font-medium text-gray-500">アカウント名</dt>
              <dd className="text-sm text-gray-900">{activeAccount.name}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">アカウントID</dt>
              <dd className="text-sm text-gray-900 font-mono">{activeAccount.fullAccountId}</dd>
            </div>
            {activeAccount.currency && (
              <div>
                <dt className="text-sm font-medium text-gray-500">通貨</dt>
                <dd className="text-sm text-gray-900">{activeAccount.currency}</dd>
              </div>
            )}
          </dl>
        </div>
      )}

      <div className="bg-blue-50 rounded-lg p-6">
        <h3 className="text-lg font-medium text-blue-900 mb-2">次のステップ</h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>ダッシュボードで広告パフォーマンスを確認</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>期間を選択してデータを分析</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>レポートをエクスポートして共有</span>
          </li>
        </ul>
      </div>

      <div className="flex justify-center space-x-4">
        <button
          onClick={handleAddAnotherAccount}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          別のアカウントを追加
        </button>

        <button
          onClick={handleGoToDashboard}
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
        >
          ダッシュボードへ
          <ArrowRightIcon className="ml-2 h-5 w-5" />
        </button>
      </div>
    </div>
  )
}
