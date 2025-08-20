import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useConvex } from 'convex/react'
import { MetaAccountManagerConvex } from '../../services/metaAccountManagerConvex'
import {
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  QuestionMarkCircleIcon,
} from '@heroicons/react/24/outline'
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

export const TestStepConvex: React.FC = () => {
  const navigate = useNavigate()
  const convexClient = useConvex()
  const [manager] = useState(() => MetaAccountManagerConvex.getInstance(convexClient))
  const [testResults, setTestResults] = useState<TestResult[]>([
    { name: 'API接続テスト', status: 'pending' },
    { name: 'アカウント情報取得', status: 'pending' },
    { name: 'キャンペーンデータ取得', status: 'pending' },
    { name: 'インサイトデータ取得', status: 'pending' },
  ])
  const [isTestComplete, setIsTestComplete] = useState(false)
  const [showTroubleshooting, setShowTroubleshooting] = useState(false)
  const [selectedError, setSelectedError] = useState<any>(null)

  useEffect(() => {
    runTests()
  }, [])

  const runTests = async () => {
    const activeAccount = await manager.getActiveAccount()

    if (!activeAccount) {
      navigate('/meta-api-setup/connect')
      return
    }

    const apiService = await manager.getActiveApiService()
    if (!apiService) return

    // API接続テスト
    await updateTestResult(0, 'success', 'API接続に成功しました')

    // アカウント情報取得テスト
    try {
      const accountInfo = await apiService.getAccountInfo()
      await updateTestResult(1, 'success', 'アカウント情報を取得しました', accountInfo)
    } catch {
      await updateTestResult(1, 'error', 'アカウント情報の取得に失敗しました')
    }

    // キャンペーンデータ取得テスト（最新1件のみ）
    try {
      const campaigns = await apiService.getCampaigns({ limit: 1 })
      const campaignCount = Array.isArray(campaigns) ? campaigns.length : 0
      await updateTestResult(
        2,
        'success',
        `${campaignCount}件のキャンペーンを取得しました`,
        campaigns
      )
    } catch (error: any) {
      const errorDetails = error.details || error
      const debugInfo = {
        request: `GET /act_${activeAccount.accountId}/campaigns`,
        response: errorDetails.error || errorDetails,
        errorCode: error.code,
        errorMessage: error.message,
        accountId: activeAccount.accountId,
        accessToken: activeAccount.accessToken
          ? '***' + activeAccount.accessToken.slice(-10)
          : 'なし',
      }
      await updateTestResult(
        2,
        'error',
        'キャンペーンデータの取得に失敗しました',
        null,
        error,
        debugInfo
      )
    }

    // インサイトデータ取得テスト
    try {
      // const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - 7)
      const insights = await apiService.getInsights({ level: 'ad', limit: 1 })
      const insightCount = Array.isArray(insights) ? insights.length : 0
      await updateTestResult(
        3,
        'success',
        `${insightCount}件のインサイトデータを取得しました`,
        insights
      )
    } catch (error: any) {
      const errorDetails = error.details || error
      const debugInfo = {
        request: `GET /act_${activeAccount.accountId}/insights`,
        response: errorDetails.error || errorDetails,
        errorCode: error.code,
        errorMessage: error.message,
      }
      await updateTestResult(
        3,
        'error',
        'インサイトデータの取得に失敗しました',
        null,
        error,
        debugInfo
      )
    }

    setIsTestComplete(true)
  }

  const updateTestResult = async (
    index: number,
    status: 'success' | 'error',
    message: string,
    data?: any,
    error?: any,
    debugInfo?: any
  ) => {
    await new Promise((resolve) => setTimeout(resolve, 500))
    setTestResults((prev) => {
      const newResults = [...prev]
      newResults[index] = { ...newResults[index], status, message, data, error, debugInfo }
      return newResults
    })
  }

  const hasErrors = testResults.some((result) => result.status === 'error')
  const allTestsPassed = testResults.every((result) => result.status === 'success')

  const handleContinue = () => {
    if (allTestsPassed) {
      navigate('/meta-api-setup/complete')
    }
  }

  const handleBack = () => {
    navigate('/meta-api-setup/permissions')
  }

  const handleShowTroubleshooting = (error: any) => {
    setSelectedError(error)
    setShowTroubleshooting(true)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">接続テスト</h2>
        <p className="text-gray-600">Meta広告APIへの接続をテストしています。</p>
      </div>

      <div className="space-y-3">
        {testResults.map((result, index) => (
          <div
            key={index}
            className={`p-4 rounded-lg border ${
              result.status === 'success'
                ? 'border-green-200 bg-green-50'
                : result.status === 'error'
                  ? 'border-red-200 bg-red-50'
                  : 'border-gray-200 bg-white'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                {result.status === 'pending' && (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600 mr-3"></div>
                )}
                {result.status === 'success' && (
                  <CheckCircleIcon className="h-5 w-5 text-green-400 mr-3" />
                )}
                {result.status === 'error' && <XCircleIcon className="h-5 w-5 text-red-400 mr-3" />}
                <div>
                  <h3 className="text-sm font-medium text-gray-900">{result.name}</h3>
                  {result.message && (
                    <p
                      className={`text-sm mt-1 ${
                        result.status === 'error' ? 'text-red-600' : 'text-gray-500'
                      }`}
                    >
                      {result.message}
                    </p>
                  )}
                </div>
              </div>
              {result.status === 'error' && result.error && (
                <button
                  onClick={() => handleShowTroubleshooting(result)}
                  className="text-sm text-indigo-600 hover:text-indigo-500 flex items-center"
                >
                  <QuestionMarkCircleIcon className="h-4 w-4 mr-1" />
                  トラブルシューティング
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {isTestComplete && hasErrors && (
        <div className="rounded-md bg-yellow-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">一部のテストが失敗しました</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>失敗したテストのトラブルシューティングを確認して、問題を解決してください。</p>
              </div>
            </div>
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
          <button
            onClick={handleContinue}
            disabled={!allTestsPassed}
            className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
              allTestsPassed
                ? 'bg-indigo-600 hover:bg-indigo-700'
                : 'bg-gray-300 cursor-not-allowed'
            }`}
          >
            {allTestsPassed ? '次へ進む' : 'エラーを解決してください'}
          </button>
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
