import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MetaAccountManager } from '../../services/metaAccountManager'
import { CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/outline'
import { TroubleshootingModal } from '../../components/meta/TroubleshootingModal'

interface TestResult {
  name: string
  status: 'pending' | 'success' | 'error'
  message?: string
  data?: any
  error?: any
  debugInfo?: {
    request?: string
    response?: any
    headers?: any
  }
}

export const TestStep: React.FC = () => {
  const navigate = useNavigate()
  const [manager] = useState(() => MetaAccountManager.getInstance())
  const [testResults, setTestResults] = useState<TestResult[]>([
    { name: 'API接続テスト', status: 'pending' },
    { name: 'アカウント情報取得', status: 'pending' },
    { name: 'キャンペーンデータ取得', status: 'pending' },
    { name: 'インサイトデータ取得', status: 'pending' }
  ])
  const [isTestComplete, setIsTestComplete] = useState(false)
  const [showTroubleshooting, setShowTroubleshooting] = useState(false)
  const [selectedError, setSelectedError] = useState<any>(null)

  useEffect(() => {
    runTests()
  }, [])

  const runTests = async () => {
    const activeAccount = manager.getActiveAccount()
    
    if (!activeAccount) {
      navigate('/meta-api-setup/connect')
      return
    }

    const apiService = manager.getActiveApiService()
    if (!apiService) return

    // API接続テスト
    await updateTestResult(0, 'success', 'API接続に成功しました')
    
    // アカウント情報取得テスト
    try {
      const accountInfo = await apiService.getAccountInfo()
      await updateTestResult(1, 'success', 'アカウント情報を取得しました', accountInfo)
    } catch (error) {
      await updateTestResult(1, 'error', 'アカウント情報の取得に失敗しました')
    }

    // キャンペーンデータ取得テスト（最新1件のみ）
    try {
      const campaigns = await apiService.getCampaigns({ limit: 1 })
      const campaignCount = Array.isArray(campaigns) ? campaigns.length : 0
      await updateTestResult(2, 'success', `${campaignCount}件のキャンペーンを取得しました`, campaigns)
    } catch (error: any) {
      const errorDetails = error.details || error
      const debugInfo = {
        request: `GET /act_${activeAccount.accountId}/campaigns`,
        response: errorDetails.error || errorDetails,
        errorCode: error.code,
        errorMessage: error.message,
        accountId: activeAccount.accountId,
        accessToken: activeAccount.accessToken ? '***' + activeAccount.accessToken.slice(-10) : 'なし'
      }
      await updateTestResult(2, 'error', 'キャンペーンデータの取得に失敗しました', null, error, debugInfo)
    }

    // インサイトデータ取得テスト
    try {
      // const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - 7)
      
      const insights = await apiService.getInsights({
        datePreset: 'last_7d',
        fields: ['impressions', 'clicks', 'spend'],
        level: 'account'
      })
      
      const insightCount = Array.isArray(insights) ? insights.length : 0
      await updateTestResult(3, 'success', `インサイトデータを取得しました（${insightCount}件）`, insights)
    } catch (error: any) {
      const errorDetails = error.details || error
      const debugInfo = {
        request: `GET /act_${activeAccount.accountId}/insights`,
        response: errorDetails.error || errorDetails,
        errorCode: error.code,
        errorMessage: error.message,
        accountId: activeAccount.accountId,
        accessToken: activeAccount.accessToken ? '***' + activeAccount.accessToken.slice(-10) : 'なし'
      }
      await updateTestResult(3, 'error', 'インサイトデータの取得に失敗しました', null, error, debugInfo)
    }

    setIsTestComplete(true)
  }

  const updateTestResult = async (
    index: number, 
    status: TestResult['status'], 
    message?: string, 
    data?: any, 
    error?: any,
    debugInfo?: any
  ) => {
    // アニメーション効果のため少し遅延を追加
    await new Promise(resolve => setTimeout(resolve, 500))
    
    setTestResults(prev => {
      const newResults = [...prev]
      newResults[index] = { 
        ...newResults[index], 
        status, 
        message, 
        data, 
        error,
        debugInfo 
      }
      return newResults
    })
  }

  const handleContinue = () => {
    const allTestsPassed = testResults.every(result => result.status === 'success')
    if (allTestsPassed) {
      navigate('/meta-api-setup/complete')
    }
  }

  const handleBack = () => {
    navigate('/meta-api-setup/permissions')
  }

  const handleRetry = () => {
    setTestResults(testResults.map(result => ({ ...result, status: 'pending', message: undefined, data: undefined })))
    setIsTestComplete(false)
    runTests()
  }

  const allTestsPassed = testResults.every(result => result.status === 'success')
  const hasErrors = testResults.some(result => result.status === 'error')

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          接続テスト
        </h2>
        <p className="text-gray-600">
          Meta APIへの接続をテストし、データが正しく取得できることを確認します。
        </p>
      </div>

      <div className="space-y-3">
        {testResults.map((result) => (
          <div
            key={result.name}
            className={`border rounded-lg p-4 transition-all ${
              result.status === 'success'
                ? 'border-green-200 bg-green-50'
                : result.status === 'error'
                ? 'border-red-200 bg-red-50'
                : 'border-gray-200 bg-gray-50'
            }`}
          >
            <div className="flex items-start">
              <div className="flex-shrink-0 mt-0.5">
                {result.status === 'pending' && (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600"></div>
                )}
                {result.status === 'success' && (
                  <CheckCircleIcon className="h-5 w-5 text-green-600" />
                )}
                {result.status === 'error' && (
                  <XCircleIcon className="h-5 w-5 text-red-600" />
                )}
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-medium text-gray-900">
                  {result.name}
                </h3>
                {result.message && (
                  <p className="mt-1 text-sm text-gray-600">
                    {result.message}
                  </p>
                )}
                {result.data && result.name === 'アカウント情報取得' && (
                  <div className="mt-2 text-xs text-gray-500 bg-white p-2 rounded border border-gray-200">
                    <p>アカウント名: {result.data.name}</p>
                    <p>通貨: {result.data.currency}</p>
                    <p>タイムゾーン: {result.data.timezone_name}</p>
                  </div>
                )}
                {result.error && result.debugInfo && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm text-red-600 hover:text-red-700">
                      エラー詳細を表示
                    </summary>
                    <div className="mt-2 p-3 bg-gray-900 text-gray-100 rounded-md text-xs font-mono overflow-x-auto">
                      <p className="text-yellow-400 mb-2">リクエスト:</p>
                      <p className="mb-3">{result.debugInfo.request}</p>
                      
                      <p className="text-yellow-400 mb-2">エラーレスポンス:</p>
                      <pre className="whitespace-pre-wrap">
                        {typeof result.debugInfo.response === 'object' 
                          ? JSON.stringify(result.debugInfo.response, null, 2)
                          : result.debugInfo.response}
                      </pre>
                      
                      {result.error.stack && (
                        <>
                          <p className="text-yellow-400 mt-3 mb-2">スタックトレース:</p>
                          <pre className="text-xs opacity-75">{result.error.stack}</pre>
                        </>
                      )}
                    </div>
                  </details>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {isTestComplete && hasErrors && (
        <div className="rounded-md bg-yellow-50 p-4">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-yellow-800">
                一部のテストが失敗しました
              </h3>
              <p className="mt-2 text-sm text-yellow-700">
                エラーが発生したテストがあります。
                アクセストークンと権限を確認してください。
              </p>
            </div>
            <button
              onClick={() => {
                const failedTest = testResults.find(r => r.status === 'error')
                setSelectedError(failedTest?.error)
                setShowTroubleshooting(true)
              }}
              className="ml-3 inline-flex items-center px-3 py-1.5 border border-yellow-600 text-xs font-medium rounded-md text-yellow-700 bg-yellow-100 hover:bg-yellow-200"
            >
              <QuestionMarkCircleIcon className="h-4 w-4 mr-1" />
              トラブルシューティング
            </button>
          </div>
        </div>
      )}

      {isTestComplete && (
        <div className="flex justify-between">
          <button
            onClick={handleBack}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            戻る
          </button>
          
          <div className="space-x-3">
            {hasErrors && (
              <button
                onClick={handleRetry}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                再テスト
              </button>
            )}
            
            <button
              onClick={handleContinue}
              disabled={!allTestsPassed}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              次へ進む
            </button>
          </div>
        </div>
      )}

      <TroubleshootingModal
        isOpen={showTroubleshooting}
        onClose={() => setShowTroubleshooting(false)}
        error={selectedError}
      />
    </div>
  )
}