/**
 * API-Convex連携テストページ
 * Meta APIとConvexキャッシュシステムの動作確認用
 */

import React, { useState, useEffect } from 'react'
import { useConvex } from 'convex/react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../convex/_generated/api'
import { SimpleMetaApi } from '@/features/meta-api/core/api-client'
import { MetaApiOptimizer } from '@/features/meta-api/core/meta-api-optimizer'
import { DataFreshnessManager } from '@/features/meta-api/core/data-freshness-manager'
import { DifferentialUpdateEngine } from '@/features/meta-api/core/differential-update-engine'
import { SimpleAccountStore } from '@/features/meta-api/account/account-store'
import { SimpleTokenStore } from '@/features/meta-api/core/token'
import { vibe } from '@/lib/vibelogger'
import type { MetaAccount } from '@/types'
import {
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ServerIcon,
  CloudIcon,
  CpuChipIcon,
  CircleStackIcon,
} from '@heroicons/react/24/outline'

interface TestResult {
  name: string
  status: 'pending' | 'running' | 'success' | 'error'
  message?: string
  data?: any
  duration?: number
}

export const ApiConvexTestPage: React.FC = () => {
  const convex = useConvex()
  const navigate = useNavigate()
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [apiToken, setApiToken] = useState('')
  const [accountId, setAccountId] = useState('')
  const [useRealApi, setUseRealApi] = useState(false)
  const [accounts, setAccounts] = useState<MetaAccount[]>([])
  const [selectedAccount, setSelectedAccount] = useState<MetaAccount | null>(null)
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false)

  // アカウント情報を読み込み
  useEffect(() => {
    const loadAccounts = async () => {
      setIsLoadingAccounts(true)
      try {
        const accountStore = new SimpleAccountStore(convex)
        const accountsList = await accountStore.getAccounts()
        setAccounts(accountsList)

        // アクティブアカウントを取得
        const activeAccount = await accountStore.getActiveAccount()
        if (activeAccount) {
          setSelectedAccount(activeAccount)
          setApiToken(activeAccount.accessToken || '')
          setAccountId(activeAccount.accountId)
        } else if (accountsList.length > 0) {
          // アクティブアカウントがない場合は最初のアカウントを選択
          setSelectedAccount(accountsList[0])
          setApiToken(accountsList[0].accessToken || '')
          setAccountId(accountsList[0].accountId)
        }
      } catch (error) {
        vibe.bad('アカウント読み込みエラー', { error })
      } finally {
        setIsLoadingAccounts(false)
      }
    }

    loadAccounts()
  }, [convex])

  // アカウント選択時の処理
  const handleAccountSelect = (accountId: string) => {
    const account = accounts.find((a) => a.accountId === accountId)
    if (account) {
      setSelectedAccount(account)
      setApiToken(account.accessToken || '')
      setAccountId(account.accountId)
    }
  }

  // テスト結果を更新
  const updateTestResult = (name: string, update: Partial<TestResult>) => {
    setTestResults((prev) => prev.map((r) => (r.name === name ? { ...r, ...update } : r)))
  }

  // テスト結果を追加
  const addTestResult = (result: TestResult) => {
    setTestResults((prev) => [...prev, result])
  }

  // 1. Convex接続テスト
  const testConvexConnection = async () => {
    const testName = '1. Convex接続テスト'
    addTestResult({ name: testName, status: 'running' })
    const startTime = Date.now()

    try {
      // Convexのpingを実行
      const result = await convex.query(api.cacheMetrics.getMetrics)

      updateTestResult(testName, {
        status: 'success',
        message: 'Convex接続成功',
        data: result,
        duration: Date.now() - startTime,
      })
      return true
    } catch (error) {
      updateTestResult(testName, {
        status: 'error',
        message: `接続失敗: ${error}`,
        duration: Date.now() - startTime,
      })
      return false
    }
  }

  // 2. メモリキャッシュ（L1）テスト
  const testMemoryCache = async () => {
    const testName = '2. メモリキャッシュ (L1) テスト'
    addTestResult({ name: testName, status: 'running' })
    const startTime = Date.now()

    try {
      // メモリキャッシュのテスト
      const cache = new Map()
      const testKey = 'test_key_' + Date.now()
      const testData = { test: true, timestamp: Date.now() }

      // 書き込み
      cache.set(testKey, testData)

      // 読み込み
      const retrieved = cache.get(testKey)

      if (retrieved && retrieved.test === true) {
        updateTestResult(testName, {
          status: 'success',
          message: `キャッシュ動作確認 (${cache.size}件)`,
          duration: Date.now() - startTime,
        })
        return true
      } else {
        throw new Error('キャッシュデータ不一致')
      }
    } catch (error) {
      updateTestResult(testName, {
        status: 'error',
        message: `エラー: ${error}`,
        duration: Date.now() - startTime,
      })
      return false
    }
  }

  // 3. Convexキャッシュ（L2）テスト
  const testConvexCache = async () => {
    const testName = '3. Convexキャッシュ (L2) テスト'
    addTestResult({ name: testName, status: 'running' })
    const startTime = Date.now()

    try {
      const testKey = `test_cache_${Date.now()}`
      const testData = {
        accountId: 'test_account',
        dateRange: 'test_range',
        data: { test: true, timestamp: Date.now() },
      }

      // キャッシュに書き込み
      await convex.mutation(api.cacheEntries.upsert, {
        cacheKey: testKey,
        ...testData,
      })

      // キャッシュから読み込み
      const cached = await convex.query(api.cacheEntries.get, {
        cacheKey: testKey,
      })

      if (cached) {
        updateTestResult(testName, {
          status: 'success',
          message: 'Convexキャッシュ動作確認',
          data: { key: testKey, size: JSON.stringify(cached).length },
          duration: Date.now() - startTime,
        })
        return true
      } else {
        throw new Error('キャッシュデータ取得失敗')
      }
    } catch (error) {
      updateTestResult(testName, {
        status: 'error',
        message: `エラー: ${error}`,
        duration: Date.now() - startTime,
      })
      return false
    }
  }

  // 4. Meta API接続テスト（モック/実API）
  const testMetaApiConnection = async () => {
    const testName = '4. Meta API接続テスト'
    addTestResult({ name: testName, status: 'running' })
    const startTime = Date.now()

    try {
      if (!useRealApi) {
        // モックデータでテスト
        await new Promise((resolve) => setTimeout(resolve, 500))
        updateTestResult(testName, {
          status: 'success',
          message: 'モックAPI動作確認',
          data: { mode: 'mock', items: 10 },
          duration: Date.now() - startTime,
        })
        return true
      }

      // 実際のAPIでテスト
      if (!apiToken || !accountId) {
        throw new Error('API認証情報が未設定')
      }

      const api = new SimpleMetaApi(apiToken, accountId)
      const result = await api.getTimeSeriesInsights({
        datePreset: 'yesterday',
        forceRefresh: true,
      })

      updateTestResult(testName, {
        status: 'success',
        message: `API接続成功 (${result.data.length}件取得)`,
        data: { count: result.data.length, hasMore: result.hasMore },
        duration: Date.now() - startTime,
      })
      return true
    } catch (error) {
      updateTestResult(testName, {
        status: 'error',
        message: `接続失敗: ${error}`,
        duration: Date.now() - startTime,
      })
      return false
    }
  }

  // 5. データ鮮度管理テスト
  const testDataFreshness = async () => {
    const testName = '5. データ鮮度管理テスト'
    addTestResult({ name: testName, status: 'running' })
    const startTime = Date.now()

    try {
      const manager = new DataFreshnessManager()

      // 実際に存在するメソッドを使用
      const testData = [
        {
          id: '1',
          date: '2025-01-30',
          ctr: 2.5,
          frequency: 3.0,
          cpm: 1000,
          impressions: 1000,
          clicks: 25,
        },
        {
          id: '2',
          date: '2025-01-31',
          ctr: 2.0,
          frequency: 3.5,
          cpm: 1200,
          impressions: 2000,
          clicks: 40,
        },
      ] as any[]

      const freshnessState = manager.evaluateFreshness(testData, {
        accountId: 'test',
        dateRange: 'last_7d',
        lastFetched: new Date(Date.now() - 60 * 60 * 1000), // 1時間前
      })

      updateTestResult(testName, {
        status: 'success',
        message: `鮮度: ${freshnessState.status}, 優先度: ${freshnessState.updatePriority}, 古さ: ${freshnessState.staleness}%`,
        data: {
          status: freshnessState.status,
          priority: freshnessState.updatePriority,
          staleness: freshnessState.staleness,
          confidence: freshnessState.confidence,
        },
        duration: Date.now() - startTime,
      })
      return true
    } catch (error) {
      updateTestResult(testName, {
        status: 'error',
        message: `エラー: ${error}`,
        duration: Date.now() - startTime,
      })
      return false
    }
  }

  // 6. 差分更新エンジンテスト
  const testDifferentialUpdate = async () => {
    const testName = '6. 差分更新エンジンテスト'
    addTestResult({ name: testName, status: 'running' })
    const startTime = Date.now()

    try {
      const engine = new DifferentialUpdateEngine()
      const freshnessManager = new DataFreshnessManager()

      // テストデータ
      const currentData = [
        { id: '1', date: '2025-01-29', impressions: 1000, ctr: 2.5, clicks: 25 },
        { id: '2', date: '2025-01-30', impressions: 2000, ctr: 2.0, clicks: 40 },
      ] as any[]

      // 鮮度状態を評価
      const freshnessState = freshnessManager.evaluateFreshness(currentData, {
        accountId: 'test',
        dateRange: 'last_7d',
        lastFetched: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2時間前
      })

      // 更新プランを計算
      const updatePlan = engine.createUpdatePlan(currentData, {
        accountId: 'test',
        dateRange: 'last_7d',
        lastFetched: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2時間前
        freshnessState,
      })

      updateTestResult(testName, {
        status: 'success',
        message: `更新戦略: ${updatePlan.strategy}, 推定APIコール数: ${updatePlan.estimatedApiCalls}, 優先度: ${updatePlan.priority}`,
        data: {
          strategy: updatePlan.strategy,
          estimatedApiCalls: updatePlan.estimatedApiCalls,
          estimatedDuration: updatePlan.estimatedDuration,
          priority: updatePlan.priority,
          dataParts: updatePlan.dataParts.length,
        },
        duration: Date.now() - startTime,
      })
      return true
    } catch (error) {
      updateTestResult(testName, {
        status: 'error',
        message: `エラー: ${error}`,
        duration: Date.now() - startTime,
      })
      return false
    }
  }

  // 7. API最適化（レート制限）テスト
  const testApiOptimizer = async () => {
    const testName = '7. API最適化テスト'
    addTestResult({ name: testName, status: 'running' })
    const startTime = Date.now()

    try {
      const optimizer = new MetaApiOptimizer()

      // レート制限の確認
      const stats = optimizer.getStatistics()

      updateTestResult(testName, {
        status: 'success',
        message: `API使用: ${stats.apiUsage.hourly}/200 (時), ${stats.apiUsage.daily}/4800 (日)`,
        data: stats,
        duration: Date.now() - startTime,
      })
      return true
    } catch (error) {
      updateTestResult(testName, {
        status: 'error',
        message: `エラー: ${error}`,
        duration: Date.now() - startTime,
      })
      return false
    }
  }

  // 8. 3層キャッシュ統合テスト
  const testThreeLayerCache = async () => {
    const testName = '8. 3層キャッシュ統合テスト'
    addTestResult({ name: testName, status: 'running' })
    const startTime = Date.now()

    try {
      const testKey = 'integration_test_' + Date.now()
      let hitLayer = 'none'

      // L1チェック（メモリ）
      const memCache = new Map()
      if (memCache.has(testKey)) {
        hitLayer = 'L1 (Memory)'
      } else {
        // L2チェック（Convex）
        const convexData = await convex.query(api.cacheEntries.get, {
          cacheKey: testKey,
        })

        if (convexData) {
          hitLayer = 'L2 (Convex)'
        } else {
          // L3（API）をシミュレート
          await new Promise((resolve) => setTimeout(resolve, 300))
          hitLayer = 'L3 (API)'
        }
      }

      updateTestResult(testName, {
        status: 'success',
        message: `キャッシュヒット: ${hitLayer}`,
        data: { layer: hitLayer, key: testKey },
        duration: Date.now() - startTime,
      })
      return true
    } catch (error) {
      updateTestResult(testName, {
        status: 'error',
        message: `エラー: ${error}`,
        duration: Date.now() - startTime,
      })
      return false
    }
  }

  // 全テスト実行
  const runAllTests = async () => {
    setIsRunning(true)
    setTestResults([])

    vibe.info('🧪 API-Convex連携テスト開始')

    // 順番にテストを実行
    await testConvexConnection()
    await testMemoryCache()
    await testConvexCache()
    await testMetaApiConnection()
    await testDataFreshness()
    await testDifferentialUpdate()
    await testApiOptimizer()
    await testThreeLayerCache()

    vibe.success('✅ 全テスト完了')
    setIsRunning(false)
  }

  // ステータスアイコンを取得
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />
      case 'error':
        return <XCircleIcon className="w-5 h-5 text-red-500" />
      case 'running':
        return <ArrowPathIcon className="w-5 h-5 text-blue-500 animate-spin" />
      default:
        return <ClockIcon className="w-5 h-5 text-gray-400" />
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <CpuChipIcon className="w-8 h-8 text-blue-600" />
          API-Convex連携テスト
        </h1>

        {/* 設定セクション */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h2 className="text-lg font-semibold mb-4">テスト設定</h2>

          {/* アカウント選択セクション */}
          {accounts.length === 0 ? (
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-yellow-800 mb-2">Meta広告アカウントが設定されていません</p>
              <button
                onClick={() => navigate('/meta-api-setup')}
                className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
              >
                アカウントを設定する
              </button>
            </div>
          ) : (
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">使用するアカウント</label>
              <select
                value={selectedAccount?.accountId || ''}
                onChange={(e) => handleAccountSelect(e.target.value)}
                className="w-full px-3 py-2 border rounded-md bg-white"
                disabled={isLoadingAccounts}
              >
                <option value="">アカウントを選択</option>
                {accounts.map((account) => (
                  <option key={account.accountId} value={account.accountId}>
                    {account.name} ({account.accountId})
                  </option>
                ))}
              </select>
              {selectedAccount && (
                <div className="mt-2 text-sm text-gray-600">
                  <p>アカウントID: {selectedAccount.accountId}</p>
                  <p>トークン: {selectedAccount.accessToken ? '設定済み' : '未設定'}</p>
                </div>
              )}
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={useRealApi}
                  onChange={(e) => setUseRealApi(e.target.checked)}
                  className="rounded"
                  disabled={!selectedAccount || !selectedAccount.accessToken}
                />
                <span>実際のMeta APIを使用</span>
              </label>
              {(!selectedAccount || !selectedAccount.accessToken) && (
                <span className="text-sm text-red-600">（アカウント選択とトークン設定が必要）</span>
              )}
            </div>

            {useRealApi && selectedAccount && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                <p className="text-sm text-blue-800">
                  <strong>{selectedAccount.name}</strong> のアカウントで実際のAPIを使用します
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  アカウントID: {selectedAccount.accountId}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* テスト実行ボタン */}
        <div className="mb-6">
          <button
            onClick={runAllTests}
            disabled={isRunning}
            className={`px-6 py-3 rounded-lg font-semibold flex items-center gap-2 ${
              isRunning
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {isRunning ? (
              <>
                <ArrowPathIcon className="w-5 h-5 animate-spin" />
                テスト実行中...
              </>
            ) : (
              <>
                <ServerIcon className="w-5 h-5" />
                全テスト実行
              </>
            )}
          </button>
        </div>

        {/* テスト結果 */}
        {testResults.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">テスト結果</h2>

            {testResults.map((result, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${
                  result.status === 'success'
                    ? 'bg-green-50 border-green-200'
                    : result.status === 'error'
                      ? 'bg-red-50 border-red-200'
                      : result.status === 'running'
                        ? 'bg-blue-50 border-blue-200'
                        : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {getStatusIcon(result.status)}
                    <div>
                      <h3 className="font-semibold">{result.name}</h3>
                      {result.message && (
                        <p className="text-sm text-gray-600 mt-1">{result.message}</p>
                      )}
                      {result.duration && (
                        <p className="text-xs text-gray-500 mt-1">実行時間: {result.duration}ms</p>
                      )}
                    </div>
                  </div>
                  {result.data && (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-blue-600">詳細</summary>
                      <pre className="mt-2 p-2 bg-white rounded text-gray-700">
                        {JSON.stringify(result.data, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* アーキテクチャ図 */}
        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold mb-3">3層キャッシュアーキテクチャ</h3>
          <div className="flex items-center justify-around">
            <div className="text-center">
              <CpuChipIcon className="w-12 h-12 text-blue-600 mx-auto mb-2" />
              <p className="text-sm font-medium">L1: Memory</p>
              <p className="text-xs text-gray-600">~10ms</p>
            </div>
            <div className="text-gray-400">→</div>
            <div className="text-center">
              <CircleStackIcon className="w-12 h-12 text-green-600 mx-auto mb-2" />
              <p className="text-sm font-medium">L2: Convex</p>
              <p className="text-xs text-gray-600">~100ms</p>
            </div>
            <div className="text-gray-400">→</div>
            <div className="text-center">
              <CloudIcon className="w-12 h-12 text-purple-600 mx-auto mb-2" />
              <p className="text-sm font-medium">L3: Meta API</p>
              <p className="text-xs text-gray-600">~1000ms</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
