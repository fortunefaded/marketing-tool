/* eslint-env browser */
import { useState } from 'react'
import { CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline'
import { useMetaApiConfig } from '../../hooks/useMetaApiConfig'

interface EnvConfig {
  appId: string
  appSecret: string
  adAccountId: string
  accessToken: string
}

export function EnvConfigPanel() {
  const { config, loading, saveConfig, updateConfig } = useMetaApiConfig()
  const [isSaved, setIsSaved] = useState(false)
  const [error, setError] = useState('')

  // Convexフックが設定を自動的に読み込むため、useEffectは不要

  const handleSave = async () => {
    // バリデーション
    if (!config.appId || !config.adAccountId) {
      setError('App IDと広告アカウントIDは必須です')
      return
    }

    if (config.appSecret && config.appSecret.length !== 32) {
      setError('App Secretは32文字の英数字である必要があります')
      return
    }

    try {
      // Convexに保存
      await saveConfig(config)
      
      setIsSaved(true)
      setError('')

      // 3秒後に保存メッセージを消す
      setTimeout(() => setIsSaved(false), 3000)
    } catch (err) {
      setError('設定の保存に失敗しました')
    }
  }

  const handleChange = (field: keyof EnvConfig) => (e: React.ChangeEvent<HTMLInputElement>) => {
    updateConfig({ [field]: e.target.value })
    setIsSaved(false)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">設定を読み込み中...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex">
          <ExclamationCircleIcon className="h-5 w-5 text-yellow-400 mr-2 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-yellow-800">重要な注意事項</h4>
            <p className="text-sm text-yellow-700 mt-1">
              この設定はConvexデータベースに安全に保存されます。
              本番環境では、より安全な方法でクレデンシャルを管理してください。
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="appId" className="block text-sm font-medium text-gray-700">
            App ID <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="appId"
            value={config.appId}
            onChange={handleChange('appId')}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="1234567890123456"
          />
          <p className="mt-1 text-sm text-gray-500">Meta開発者ダッシュボードから取得できます</p>
        </div>

        <div>
          <label htmlFor="appSecret" className="block text-sm font-medium text-gray-700">
            App Secret（トークン永続化に必要）
          </label>
          <input
            type="password"
            id="appSecret"
            value={config.appSecret}
            onChange={handleChange('appSecret')}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="32文字の英数字"
          />
          <p className="mt-1 text-sm text-gray-500">
            トークンの自動更新と長期保存に必要です。開発環境でのみ使用してください。
          </p>
        </div>

        <div>
          <label htmlFor="adAccountId" className="block text-sm font-medium text-gray-700">
            広告アカウントID <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="adAccountId"
            value={config.adAccountId}
            onChange={handleChange('adAccountId')}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="act_123456789"
          />
          <p className="mt-1 text-sm text-gray-500">"act_" で始まる広告アカウントID</p>
        </div>

        <div>
          <label htmlFor="accessToken" className="block text-sm font-medium text-gray-700">
            アクセストークン（オプション）
          </label>
          <input
            type="password"
            id="accessToken"
            value={config.accessToken}
            onChange={handleChange('accessToken')}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="EAA..."
          />
          <p className="mt-1 text-sm text-gray-500">
            トークン設定タブで取得できます。ここで設定することも可能です。
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="flex items-center justify-between">
        <button
          onClick={handleSave}
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          設定を保存
        </button>

        {isSaved && (
          <div className="flex items-center text-green-600">
            <CheckCircleIcon className="h-5 w-5 mr-2" />
            <span className="text-sm">保存しました</span>
          </div>
        )}
      </div>

      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-2">設定の確認</h4>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-gray-600">App ID:</dt>
            <dd className="font-mono text-gray-900">{config.appId || '未設定'}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-600">App Secret:</dt>
            <dd className="font-mono text-gray-900">{config.appSecret ? '設定済み' : '未設定'}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-600">広告アカウントID:</dt>
            <dd className="font-mono text-gray-900">{config.adAccountId || '未設定'}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-600">アクセストークン:</dt>
            <dd className="font-mono text-gray-900">
              {config.accessToken ? '設定済み' : '未設定'}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  )
}
