import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useConvex } from 'convex/react'
import { MetaAccountManagerConvex } from '../../services/meta-account/MetaAccountManagerConvex'
import { MetaApiService } from '../../services/meta-account/MetaApiServiceSimple'
import { CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'

interface TestResult {
  name: string
  status: 'pending' | 'success' | 'error'
  message?: string
  data?: any
  error?: any
}

interface Permission {
  name: string
  description: string
  required: boolean
  granted: boolean
  scope: string
}

export const PermissionsAndTestStep: React.FC = () => {
  const navigate = useNavigate()
  const convexClient = useConvex()
  const [manager] = useState(() => MetaAccountManagerConvex.getInstance(convexClient))

  // 権限関連の状態
  const [permissions, setPermissions] = useState<Permission[]>([
    {
      name: 'ads_read',
      description: '広告データの読み取り',
      required: true,
      granted: false,
      scope: 'ads_read',
    },
    {
      name: 'ads_management',
      description: '広告の管理（作成・編集・削除）',
      required: false,
      granted: false,
      scope: 'ads_management',
    },
    {
      name: 'business_management',
      description: 'ビジネスアカウントの管理',
      required: false,
      granted: false,
      scope: 'business_management',
    },
    {
      name: 'pages_read_engagement',
      description: 'ページエンゲージメントの読み取り',
      required: false,
      granted: false,
      scope: 'pages_read_engagement',
    },
    {
      name: 'insights',
      description: 'インサイトデータへのアクセス',
      required: true,
      granted: false,
      scope: 'read_insights',
    },
  ])

  // テスト関連の状態
  const [testResults, setTestResults] = useState<TestResult[]>([
    { name: 'API接続テスト', status: 'pending' },
    { name: 'アカウント情報取得', status: 'pending' },
    { name: 'キャンペーンデータ取得', status: 'pending' },
    { name: 'インサイトデータ取得', status: 'pending' },
  ])

  const [isLoading, setIsLoading] = useState(true)
  const [isTestComplete, setIsTestComplete] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeAccount, setActiveAccount] = useState<any>(null)
  const [currentStep, setCurrentStep] = useState<'permissions' | 'test'>('permissions')

  useEffect(() => {
    loadAccountAndCheckPermissions()
  }, [])

  const loadAccountAndCheckPermissions = async () => {
    try {
      setIsLoading(true)
      const account = await manager.getActiveAccount()

      if (!account) {
        navigate('/settings/meta-api/connect')
        return
      }

      setActiveAccount(account)

      // 実際の権限チェック
      await checkPermissions(account)
    } catch (error) {
      console.error('Failed to load account:', error)
      setError('アカウント情報の読み込みに失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  const checkPermissions = async (account: any) => {
    try {
      // /me/permissions エンドポイントで権限を確認
      const response = await fetch(
        `https://graph.facebook.com/v23.0/me/permissions?access_token=${account.accessToken}`
      )

      if (response.ok) {
        const data = await response.json()
        const grantedPermissions = data.data || []

        // 権限の状態を更新
        const updatedPermissions = permissions.map((perm) => {
          const isGranted = grantedPermissions.some(
            (p: any) => p.permission === perm.scope && p.status === 'granted'
          )
          return {
            ...perm,
            granted: isGranted,
          }
        })

        setPermissions(updatedPermissions)

        // 必須権限が不足している場合は警告
        const missingRequired = updatedPermissions.filter((p) => p.required && !p.granted)
        if (missingRequired.length > 0) {
          setError(`必須権限が不足しています: ${missingRequired.map((p) => p.name).join(', ')}`)
        }
      } else {
        // エラーの場合は全て許可されているものとして扱う（後方互換性）
        console.warn('権限チェックに失敗しました。全ての権限が付与されているものとして処理します。')
        const updatedPermissions = permissions.map((perm) => ({
          ...perm,
          granted: true,
        }))
        setPermissions(updatedPermissions)
      }
    } catch (error) {
      console.error('Permission check failed:', error)
      // エラーの場合は全て許可されているものとして扱う（後方互換性）
      const updatedPermissions = permissions.map((perm) => ({
        ...perm,
        granted: true,
      }))
      setPermissions(updatedPermissions)
    }
  }

  const runTests = async () => {
    if (!activeAccount) return

    setCurrentStep('test')
    const apiService = new MetaApiService({
      accessToken: activeAccount.accessToken,
      accountId: activeAccount.accountId,
    })

    const results: TestResult[] = []

    // API接続テスト
    try {
      setTestResults((prev) => {
        const newResults = [...prev]
        newResults[0] = { ...newResults[0], status: 'pending' }
        return newResults
      })

      const tokenValidation = await apiService.validateToken()

      if (tokenValidation.valid) {
        results[0] = {
          name: 'API接続テスト',
          status: 'success',
          message: 'APIトークンが有効です',
          data: tokenValidation.user,
        }
      } else {
        results[0] = {
          name: 'API接続テスト',
          status: 'error',
          message: 'APIトークンが無効です',
          error: tokenValidation.error,
        }
      }
      setTestResults([...results, ...testResults.slice(results.length)])
    } catch (error) {
      results[0] = {
        name: 'API接続テスト',
        status: 'error',
        message: 'API接続に失敗しました',
        error,
      }
      setTestResults([...results, ...testResults.slice(results.length)])
    }

    // アカウント情報取得テスト
    try {
      setTestResults((prev) => {
        const newResults = [...prev]
        newResults[1] = { ...newResults[1], status: 'pending' }
        return newResults
      })

      const accountInfo = await apiService.getAccountInfo()
      results[1] = {
        name: 'アカウント情報取得',
        status: 'success',
        message: `アカウント: ${accountInfo.name}`,
        data: accountInfo,
      }
      setTestResults([...results, ...testResults.slice(results.length)])
    } catch (error) {
      results[1] = {
        name: 'アカウント情報取得',
        status: 'error',
        message: 'アカウント情報の取得に失敗しました',
        error,
      }
      setTestResults([...results, ...testResults.slice(results.length)])
    }

    // キャンペーンデータ取得テスト
    try {
      setTestResults((prev) => {
        const newResults = [...prev]
        newResults[2] = { ...newResults[2], status: 'pending' }
        return newResults
      })

      const campaigns = await apiService.getCampaigns()
      results[2] = {
        name: 'キャンペーンデータ取得',
        status: 'success',
        message: `${campaigns.length}個のキャンペーンを取得`,
        data: campaigns,
      }
      setTestResults([...results, ...testResults.slice(results.length)])
    } catch (error) {
      results[2] = {
        name: 'キャンペーンデータ取得',
        status: 'error',
        message: 'キャンペーンデータの取得に失敗しました',
        error,
      }
      setTestResults([...results, ...testResults.slice(results.length)])
    }

    // インサイトデータ取得テスト
    try {
      setTestResults((prev) => {
        const newResults = [...prev]
        newResults[3] = { ...newResults[3], status: 'pending' }
        return newResults
      })

      const insights = await apiService.getInsights({ datePreset: 'yesterday' })
      results[3] = {
        name: 'インサイトデータ取得',
        status: 'success',
        message: `${insights.length}件のインサイトデータを取得`,
        data: insights,
      }
      setTestResults([...results, ...testResults.slice(results.length)])
    } catch (error) {
      results[3] = {
        name: 'インサイトデータ取得',
        status: 'error',
        message: 'インサイトデータの取得に失敗しました',
        error,
      }
      setTestResults([...results, ...testResults.slice(results.length)])
    }

    setIsTestComplete(true)
  }

  const handleContinue = () => {
    if (currentStep === 'permissions') {
      runTests()
    } else {
      navigate('/settings/meta-api/complete')
    }
  }

  const allTestsPassed = testResults.every((result) => result.status === 'success')
  const requiredPermissionsGranted = permissions.filter((p) => p.required).every((p) => p.granted)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <p className="mt-2 text-sm text-gray-500">読み込み中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            {currentStep === 'permissions' ? '権限の確認' : 'API接続テスト'}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {currentStep === 'permissions'
              ? 'Meta APIへのアクセスに必要な権限を確認します。'
              : 'Meta APIへの接続をテストしています。'}
          </p>
        </div>

        <div className="space-y-6">
          {/* エラー表示 */}
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* 権限リスト表示 */}
          {currentStep === 'permissions' && (
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">必要な権限</h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">
                  以下の権限が付与されていることを確認してください。
                </p>
              </div>
              <div className="border-t border-gray-200">
                <ul className="divide-y divide-gray-200">
                  {permissions.map((permission) => (
                    <li key={permission.name} className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            {permission.granted ? (
                              <CheckCircleIcon className="h-6 w-6 text-green-500" />
                            ) : (
                              <XCircleIcon className="h-6 w-6 text-red-500" />
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {permission.description}
                            </div>
                            <div className="text-sm text-gray-500">
                              スコープ: {permission.scope}
                            </div>
                          </div>
                        </div>
                        {permission.required && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                            必須
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* テスト結果表示 */}
          {currentStep === 'test' && (
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">接続テスト結果</h3>
              </div>
              <div className="border-t border-gray-200">
                <ul className="divide-y divide-gray-200">
                  {testResults.map((result, index) => (
                    <li key={index} className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            {result.status === 'pending' && (
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                            )}
                            {result.status === 'success' && (
                              <CheckCircleIcon className="h-6 w-6 text-green-500" />
                            )}
                            {result.status === 'error' && (
                              <XCircleIcon className="h-6 w-6 text-red-500" />
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{result.name}</div>
                            {result.message && (
                              <div className="text-sm text-gray-500">{result.message}</div>
                            )}
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* ナビゲーションボタン */}
          <div className="flex justify-between">
            <button
              onClick={() => navigate('/settings/meta-api/connect')}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              戻る
            </button>
            <button
              onClick={handleContinue}
              disabled={
                currentStep === 'permissions' ? !requiredPermissionsGranted : !isTestComplete
              }
              className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white ${
                (currentStep === 'permissions' && requiredPermissionsGranted) ||
                (currentStep === 'test' && allTestsPassed)
                  ? 'bg-indigo-600 hover:bg-indigo-700'
                  : 'bg-gray-400 cursor-not-allowed'
              }`}
            >
              {currentStep === 'permissions'
                ? 'テストを実行'
                : allTestsPassed
                  ? '次へ進む'
                  : 'エラーを解決してください'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
