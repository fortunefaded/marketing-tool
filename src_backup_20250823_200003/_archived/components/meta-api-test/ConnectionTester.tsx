import { useState, useEffect } from 'react'
import { Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { useConvex } from 'convex/react'
import { MetaAPIClientEnhanced } from '../../_archived/lib/meta-api/client-enhanced'
import { MetaTokenManagerConvex } from '../../_archived/lib/meta-api/token-manager-convex'
import { getMetaApiConfig, getAccessToken, setConvexClient } from '../../_archived/lib/meta-api/config-helper-convex'

interface TestResult {
  name: string
  status: 'pending' | 'running' | 'success' | 'failed' | 'warning'
  message?: string
  details?: any
}

export function ConnectionTester() {
  const [isRunning, setIsRunning] = useState(false)
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const convex = useConvex()

  useEffect(() => {
    // Convexクライアントを設定
    setConvexClient(convex as any)
  }, [convex])

  const runTests = async () => {
    setIsRunning(true)
    setTestResults([])

    const tests: TestResult[] = [
      { name: '環境変数チェック', status: 'pending' },
      { name: 'API接続テスト', status: 'pending' },
      { name: 'アカウント情報取得', status: 'pending' },
      { name: 'キャンペーン一覧取得', status: 'pending' },
      { name: 'トークン検証', status: 'pending' },
      { name: 'レート制限チェック', status: 'pending' },
    ]

    setTestResults([...tests])

    // 環境変数チェック
    await runTest(0, async () => {
      const config = await getMetaApiConfig()

      if (!config.appId || !config.adAccountId) {
        throw new Error('App IDと広告アカウントIDが設定されていません')
      }

      const accessToken = await getAccessToken()
      if (!accessToken) {
        throw new Error('アクセストークンが設定されていません')
      }

      return {
        message: 'すべての必要な設定が確認されました',
        details: {
          appId: config.appId,
          appSecret: config.appSecret ? '設定済み' : '未設定',
          adAccountId: config.adAccountId,
          accessToken: '設定済み',
        },
      }
    })

    // 設定とトークン取得
    const config = await getMetaApiConfig()
    const accessToken = await getAccessToken()

    if (!accessToken) {
      setTestResults((prev) =>
        prev.map((test, i) =>
          i > 0 ? { ...test, status: 'failed', message: 'アクセストークンが必要です' } : test
        )
      )
      setIsRunning(false)
      return
    }

    const client = new MetaAPIClientEnhanced({
      accessToken,
      accountId: config.adAccountId,
    })

    // API接続テスト
    await runTest(1, async () => {
      const response = await fetch(
        `https://graph.facebook.com/v23.0/me?access_token=${accessToken}`
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error?.message || `HTTP ${response.status}`)
      }

      const data = await response.json()
      return {
        message: 'API接続成功',
        details: { userId: data.id, name: data.name },
      }
    })

    // アカウント情報取得（アクセストークンの検証）
    await runTest(2, async () => {
      const isValid = await client.validateAccessToken()
      return {
        message: isValid ? 'アカウント接続成功' : 'アカウント接続失敗',
        details: {
          status: isValid ? 'valid' : 'invalid',
        },
      }
    })

    // キャンペーン一覧取得
    await runTest(3, async () => {
      const campaigns = await client.getCampaigns()
      return {
        message: `${campaigns.length}個のキャンペーンを取得`,
        details: campaigns.slice(0, 3).map((c) => ({
          name: c.name,
          status: c.status,
          objective: c.objective,
        })),
      }
    })

    // トークン検証
    await runTest(4, async () => {
      if (!config.appSecret) {
        // App Secretなしの簡易検証
        try {
          const response = await fetch(
            `https://graph.facebook.com/v23.0/me?access_token=${accessToken}&fields=id,name,permissions`
          )

          if (!response.ok) {
            throw new Error('トークンが無効です')
          }

          const data = await response.json()
          const permissions = data.permissions?.data || []

          return {
            status: 'warning',
            message: 'トークンは有効です（簡易検証）',
            details: {
              userId: data.id,
              userName: data.name,
              permissions: permissions.map((p: any) => p.permission).join(', '),
              note: 'App Secretが設定されていないため、詳細な検証はスキップされました',
            },
          }
        } catch {
          throw new Error('トークン検証に失敗しました')
        }
      }

      // App Secretありの詳細検証
      const tokenManager = new MetaTokenManagerConvex({
        appId: config.appId,
        appSecret: config.appSecret,
      }, convex as any)

      const isValid = await tokenManager.validateToken(accessToken)
      if (!isValid) {
        throw new Error('トークンが無効です')
      }

      const info = await tokenManager.getTokenInfo()
      return {
        message: 'トークンは有効です（詳細検証）',
        details: {
          type: info.type,
          expiresAt: info.expiresAt?.toLocaleString(),
          scopes: info.scopes,
          userId: info.userId,
        },
      }
    })

    // レート制限チェック
    await runTest(5, async () => {
      const rateLimitStatus = (client as any).getRateLimitStatus()
      const isNearLimit = rateLimitStatus.callCount > 50

      return {
        status: isNearLimit ? 'warning' : 'success',
        message: isNearLimit ? 'レート制限に近づいています' : 'レート制限内で動作しています',
        details: rateLimitStatus,
      }
    })

    setIsRunning(false)

    async function runTest(index: number, testFn: () => Promise<any>) {
      setTestResults((prev) =>
        prev.map((test, i) => (i === index ? { ...test, status: 'running' } : test))
      )

      try {
        const result = await testFn()
        setTestResults((prev) =>
          prev.map((test, i) =>
            i === index
              ? {
                  ...test,
                  status: result.status || 'success',
                  message: result.message,
                  details: result.details,
                }
              : test
          )
        )
      } catch (error) {
        setTestResults((prev) =>
          prev.map((test, i) =>
            i === index
              ? {
                  ...test,
                  status: 'failed',
                  message: error instanceof Error ? error.message : '不明なエラー',
                }
              : test
          )
        )
      }
    }
  }

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'pending':
        return <div className="w-5 h-5 rounded-full bg-gray-200" />
      case 'running':
        return <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />
    }
  }

  const hasFailures = testResults.some((t) => t.status === 'failed')
  const allSuccess = testResults.every((t) => t.status === 'success' || t.status === 'warning')

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Meta API接続テスト</h3>
        <div className="space-y-4">
          <button
            onClick={runTests}
            disabled={isRunning}
            className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            {isRunning ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin inline-block" />
                テスト実行中...
              </>
            ) : (
              'テストを実行'
            )}
          </button>

          {testResults.length > 0 && (
            <div className="space-y-2">
              {testResults.map((test, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                  {getStatusIcon(test.status)}
                  <div className="flex-1">
                    <div className="font-medium">{test.name}</div>
                    {test.message && (
                      <div className="text-sm text-gray-600 mt-1">{test.message}</div>
                    )}
                    {test.details && (
                      <pre className="text-xs bg-gray-100 p-2 rounded mt-2 overflow-x-auto">
                        {JSON.stringify(test.details, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {testResults.length > 0 && !isRunning && (
            <div
              className={`p-4 rounded-md ${
                hasFailures
                  ? 'bg-red-50 border border-red-200'
                  : allSuccess
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-yellow-50 border border-yellow-200'
              }`}
            >
              <p
                className={`text-sm ${
                  hasFailures ? 'text-red-800' : allSuccess ? 'text-green-800' : 'text-yellow-800'
                }`}
              >
                {hasFailures
                  ? 'いくつかのテストが失敗しました。エラーメッセージを確認してください。'
                  : allSuccess
                    ? 'すべてのテストが成功しました！本番環境へのデプロイ準備が整っています。'
                    : 'テストは完了しましたが、いくつかの警告があります。'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
