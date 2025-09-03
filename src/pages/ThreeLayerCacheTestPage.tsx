/**
 * 3層キャッシュシステムのテストページ
 * 
 * 新しい同期機能を独立してテストするための専用ページ
 */

import { useState, useEffect } from 'react'
import { useConvex } from 'convex/react'
import { ThreeLayerCache } from '../features/meta-api/core/three-layer-cache'
import { SimpleAccountStore } from '../features/meta-api/account/account-store'
import { MetaAccount } from '@/types'
import { 
  PlayIcon, 
  TrashIcon, 
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ServerIcon,
  CpuChipIcon,
  CloudIcon
} from '@heroicons/react/24/outline'

interface TestResult {
  testName: string
  status: 'pending' | 'running' | 'success' | 'error'
  layer?: 'L1' | 'L2' | 'L3' | 'miss'
  latency?: number
  message?: string
  data?: any
}

export function ThreeLayerCacheTestPage() {
  const convex = useConvex()
  const [cacheSystem] = useState(() => new ThreeLayerCache(convex))
  const [accounts, setAccounts] = useState<MetaAccount[]>([])
  const [selectedAccount, setSelectedAccount] = useState<MetaAccount | null>(null)
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true)
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [testKey, setTestKey] = useState('')
  const [testData, setTestData] = useState<any>(null)

  // アカウント読み込み
  useEffect(() => {
    const loadAccounts = async () => {
      setIsLoadingAccounts(true)
      try {
        const store = new SimpleAccountStore(convex)
        const accountsList = await store.getAccounts()
        setAccounts(accountsList)
        
        const activeAccount = await store.getActiveAccount()
        if (activeAccount) {
          setSelectedAccount(activeAccount)
        } else if (accountsList.length > 0) {
          setSelectedAccount(accountsList[0])
        }
      } catch (error) {
        console.error('Failed to load accounts:', error)
      } finally {
        setIsLoadingAccounts(false)
      }
    }
    
    loadAccounts()
  }, [convex])

  // アカウント選択時の処理
  const handleAccountSelect = (accountId: string) => {
    const account = accounts.find(a => a.accountId === accountId)
    if (account) {
      setSelectedAccount(account)
      // アクセストークンをキャッシュシステムに設定
      if (account.accessToken) {
        cacheSystem.setAccessToken(account.accessToken)
      }
    }
  }

  // テスト結果を追加
  const addTestResult = (result: TestResult) => {
    setTestResults(prev => [...prev, result])
  }

  // テスト結果をクリア
  const clearResults = () => {
    setTestResults([])
  }

  // 1. データ書き込みテスト
  const testWrite = async () => {
    if (!selectedAccount) {
      addTestResult({
        testName: 'データ書き込み',
        status: 'error',
        message: 'アカウントが選択されていません'
      })
      return
    }

    const key = `test_${selectedAccount.accountId}_${Date.now()}`
    const data = {
      test: true,
      timestamp: Date.now(),
      accountName: selectedAccount.name,
      data: [
        { id: 1, value: 'test1', impressions: 1000 },
        { id: 2, value: 'test2', impressions: 2000 }
      ]
    }

    setTestKey(key)
    setTestData(data)

    addTestResult({
      testName: 'データ書き込み',
      status: 'running'
    })

    try {
      const startTime = Date.now()
      await cacheSystem.set(key, data)
      
      addTestResult({
        testName: 'データ書き込み',
        status: 'success',
        latency: Date.now() - startTime,
        message: `キー: ${key}`,
        data: { key, dataSize: JSON.stringify(data).length }
      })
    } catch (error) {
      addTestResult({
        testName: 'データ書き込み',
        status: 'error',
        message: String(error)
      })
    }
  }

  // 2. L1（メモリ）読み込みテスト
  const testL1Read = async () => {
    if (!testKey) {
      addTestResult({
        testName: 'L1読み込み',
        status: 'error',
        message: '先にデータ書き込みテストを実行してください'
      })
      return
    }

    addTestResult({
      testName: 'L1読み込み',
      status: 'running'
    })

    try {
      const startTime = Date.now()
      const result = await cacheSystem.get(testKey)
      
      addTestResult({
        testName: 'L1読み込み',
        status: 'success',
        layer: result.source as any,
        latency: Date.now() - startTime,
        message: `ソース: ${result.source}`,
        data: result.data
      })
    } catch (error) {
      addTestResult({
        testName: 'L1読み込み',
        status: 'error',
        message: String(error)
      })
    }
  }

  // 3. L2（Convex）読み込みテスト
  const testL2Read = async () => {
    if (!testKey) {
      addTestResult({
        testName: 'L2読み込み',
        status: 'error',
        message: '先にデータ書き込みテストを実行してください'
      })
      return
    }

    addTestResult({
      testName: 'L2読み込み（L1スキップ）',
      status: 'running'
    })

    try {
      const startTime = Date.now()
      const result = await cacheSystem.get(testKey, { skipL1: true })
      
      addTestResult({
        testName: 'L2読み込み（L1スキップ）',
        status: 'success',
        layer: result.source as any,
        latency: Date.now() - startTime,
        message: `ソース: ${result.source}`,
        data: result.data
      })
    } catch (error) {
      addTestResult({
        testName: 'L2読み込み（L1スキップ）',
        status: 'error',
        message: String(error)
      })
    }
  }

  // 4. キャッシュクリアテスト
  const testCacheClear = async () => {
    if (!testKey) {
      addTestResult({
        testName: 'キャッシュクリア',
        status: 'error',
        message: '先にデータ書き込みテストを実行してください'
      })
      return
    }

    addTestResult({
      testName: 'キャッシュクリア',
      status: 'running'
    })

    try {
      const startTime = Date.now()
      await cacheSystem.clear(testKey)
      
      addTestResult({
        testName: 'キャッシュクリア',
        status: 'success',
        latency: Date.now() - startTime,
        message: `キー ${testKey} をクリアしました`
      })

      // クリア後の確認（全層チェック）
      const result = await cacheSystem.get(testKey)
      addTestResult({
        testName: 'クリア後確認',
        status: result.data ? 'error' : 'success',
        layer: result.source as any,
        message: result.data ? 'データが残っています' : 'データがクリアされました'
      })
    } catch (error) {
      addTestResult({
        testName: 'キャッシュクリア',
        status: 'error',
        message: String(error)
      })
    }
  }

  // 5. 実データ取得テスト（L3: Meta API）
  const testRealDataFetch = async () => {
    if (!selectedAccount || !selectedAccount.accessToken) {
      addTestResult({
        testName: 'Meta API実データ取得',
        status: 'error',
        message: 'アカウントまたはアクセストークンが設定されていません'
      })
      return
    }

    addTestResult({
      testName: 'Meta API実データ取得',
      status: 'running'
    })

    try {
      // アクセストークンを設定
      cacheSystem.setAccessToken(selectedAccount.accessToken)
      
      // 新しいキーで実データを取得
      const key = `${selectedAccount.accountId}_last_7d`
      const startTime = Date.now()
      
      // 強制的にAPIから取得（キャッシュをスキップ）
      const result = await cacheSystem.get(key, { forceRefresh: true })
      
      addTestResult({
        testName: 'Meta API実データ取得',
        status: result.data ? 'success' : 'error',
        layer: result.source as any,
        latency: Date.now() - startTime,
        message: result.data 
          ? `${Array.isArray(result.data) ? result.data.length : 0}件のデータを取得` 
          : 'データ取得失敗',
        data: result
      })
    } catch (error) {
      addTestResult({
        testName: 'Meta API実データ取得',
        status: 'error',
        message: String(error)
      })
    }
  }

  // 6. 統計情報テスト
  const testStats = async () => {
    addTestResult({
      testName: 'キャッシュ統計',
      status: 'running'
    })

    try {
      const stats = cacheSystem.getStats()
      
      addTestResult({
        testName: 'キャッシュ統計',
        status: 'success',
        message: `ヒット率: ${stats.overallHitRate.toFixed(1)}%`,
        data: stats
      })
    } catch (error) {
      addTestResult({
        testName: 'キャッシュ統計',
        status: 'error',
        message: String(error)
      })
    }
  }

  // 全テスト実行
  const runAllTests = async () => {
    setIsRunning(true)
    clearResults()

    await testWrite()
    await new Promise(resolve => setTimeout(resolve, 500))
    
    await testL1Read()
    await new Promise(resolve => setTimeout(resolve, 500))
    
    await testL2Read()
    await new Promise(resolve => setTimeout(resolve, 500))
    
    await testRealDataFetch()
    await new Promise(resolve => setTimeout(resolve, 500))
    
    await testStats()
    await new Promise(resolve => setTimeout(resolve, 500))
    
    await testCacheClear()

    setIsRunning(false)
  }

  // ステータスアイコン取得
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

  // レイヤーアイコン取得
  const getLayerIcon = (layer?: string) => {
    switch (layer) {
      case 'L1':
        return <CpuChipIcon className="w-5 h-5 text-purple-500" />
      case 'L2':
        return <ServerIcon className="w-5 h-5 text-blue-500" />
      case 'L3':
        return <CloudIcon className="w-5 h-5 text-green-500" />
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <CpuChipIcon className="w-8 h-8 text-blue-600" />
            3層キャッシュシステム テスト
          </h1>

          {/* アカウント選択 */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h2 className="text-lg font-semibold mb-4">アカウント設定</h2>
            
            {accounts.length === 0 ? (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-yellow-800">アカウントが設定されていません</p>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium mb-2">テスト用アカウント</label>
                <select
                  value={selectedAccount?.accountId || ''}
                  onChange={(e) => handleAccountSelect(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md bg-white"
                  disabled={isLoadingAccounts}
                >
                  <option value="">選択してください</option>
                  {accounts.map(account => (
                    <option key={account.accountId} value={account.accountId}>
                      {account.name} ({account.accountId})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* コントロールボタン */}
          <div className="mb-6 flex gap-4">
            <button
              onClick={runAllTests}
              disabled={isRunning || !selectedAccount}
              className={`px-4 py-2 rounded flex items-center gap-2 text-white ${
                isRunning || !selectedAccount
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              <PlayIcon className="w-5 h-5" />
              全テスト実行
            </button>

            <button
              onClick={clearResults}
              disabled={isRunning}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 flex items-center gap-2"
            >
              <TrashIcon className="w-5 h-5" />
              結果クリア
            </button>
          </div>

          {/* 個別テストボタン */}
          <div className="mb-6 grid grid-cols-2 md:grid-cols-3 gap-3">
            <button
              onClick={testWrite}
              disabled={isRunning || !selectedAccount}
              className="px-3 py-2 bg-green-100 text-green-800 rounded hover:bg-green-200 text-sm"
            >
              1. データ書き込み
            </button>
            <button
              onClick={testL1Read}
              disabled={isRunning || !testKey}
              className="px-3 py-2 bg-purple-100 text-purple-800 rounded hover:bg-purple-200 text-sm"
            >
              2. L1読み込み
            </button>
            <button
              onClick={testL2Read}
              disabled={isRunning || !testKey}
              className="px-3 py-2 bg-blue-100 text-blue-800 rounded hover:bg-blue-200 text-sm"
            >
              3. L2読み込み
            </button>
            <button
              onClick={testRealDataFetch}
              disabled={isRunning || !selectedAccount}
              className="px-3 py-2 bg-green-100 text-green-800 rounded hover:bg-green-200 text-sm"
            >
              4. Meta API実データ
            </button>
            <button
              onClick={testStats}
              disabled={isRunning}
              className="px-3 py-2 bg-indigo-100 text-indigo-800 rounded hover:bg-indigo-200 text-sm"
            >
              5. 統計情報
            </button>
            <button
              onClick={testCacheClear}
              disabled={isRunning || !testKey}
              className="px-3 py-2 bg-red-100 text-red-800 rounded hover:bg-red-200 text-sm"
            >
              6. キャッシュクリア
            </button>
          </div>

          {/* テスト結果 */}
          {testResults.length > 0 && (
            <div className="space-y-3">
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
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{result.testName}</h3>
                          {result.layer && getLayerIcon(result.layer)}
                        </div>
                        {result.message && (
                          <p className="text-sm text-gray-600 mt-1">{result.message}</p>
                        )}
                        {result.latency !== undefined && (
                          <p className="text-xs text-gray-500 mt-1">
                            レイテンシ: {result.latency}ms
                          </p>
                        )}
                      </div>
                    </div>
                    {result.data && (
                      <details className="text-xs">
                        <summary className="cursor-pointer text-blue-600">詳細</summary>
                        <pre className="mt-2 p-2 bg-white rounded text-gray-700 overflow-auto max-w-md">
                          {JSON.stringify(result.data, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* キャッシュ層の説明 */}
          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold mb-3">3層キャッシュアーキテクチャ</h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="flex items-start gap-2">
                <CpuChipIcon className="w-5 h-5 text-purple-500 mt-1" />
                <div>
                  <p className="font-medium">L1: メモリ</p>
                  <p className="text-xs text-gray-600">最速・揮発性</p>
                  <p className="text-xs text-gray-600">~10ms</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <ServerIcon className="w-5 h-5 text-blue-500 mt-1" />
                <div>
                  <p className="font-medium">L2: Convex</p>
                  <p className="text-xs text-gray-600">永続化・同期</p>
                  <p className="text-xs text-gray-600">~100ms</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CloudIcon className="w-5 h-5 text-green-500 mt-1" />
                <div>
                  <p className="font-medium">L3: Meta API</p>
                  <p className="text-xs text-gray-600">最新データ</p>
                  <p className="text-xs text-gray-600">~1000ms</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}