import { useState } from 'react'
import { useAction, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'

export function TestOAuthCallback() {
  const [authCode, setAuthCode] = useState('')
  const [result, setResult] = useState<any>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const handleOAuthCallbackAction = useAction(api.googleAds.handleOAuthCallback)
  const existingConfig = useQuery(api.googleAds.getConfig)

  const handleTest = async () => {
    if (!authCode || !existingConfig) {
      alert('認証コードと設定が必要です')
      return
    }

    setIsProcessing(true)
    try {
      const result = await handleOAuthCallbackAction({
        code: authCode,
        clientId: existingConfig.clientId,
        clientSecret: existingConfig.clientSecret,
        customerId: existingConfig.customerId,
      })
      setResult(result)
    } catch (error: any) {
      setResult({ error: error.message })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">OAuth コールバックテスト</h1>

      <div className="bg-white rounded-lg shadow p-6 mb-4">
        <h2 className="font-semibold mb-2">現在の設定</h2>
        {existingConfig && (
          <div className="text-sm text-gray-600">
            <p>Client ID: {existingConfig.clientId}</p>
            <p>Customer ID: {existingConfig.customerId}</p>
            <p>Developer Token: {existingConfig.developerToken ? '設定済み' : '未設定'}</p>
            <p>Access Token: {existingConfig.accessToken ? existingConfig.accessToken.substring(0, 20) + '...' : '未設定'}</p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <label className="block mb-2">
          <span className="text-sm font-medium">認証コード (Google OAuth から取得した code パラメータ)</span>
          <input
            type="text"
            value={authCode}
            onChange={(e) => setAuthCode(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="4/0AeanS0..."
          />
        </label>

        <button
          onClick={handleTest}
          disabled={isProcessing}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {isProcessing ? '処理中...' : 'トークン交換をテスト'}
        </button>

        {result && (
          <div className="mt-4 p-4 bg-gray-100 rounded">
            <pre className="text-xs overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}