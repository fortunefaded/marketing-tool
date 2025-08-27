/**
 * AggregationTestComponent
 * 
 * データ集約機能をテストするためのコンポーネント
 * 集約前後のデータ比較と性能測定を行う
 */

import React, { useState, useEffect } from 'react'
import { useConvex } from 'convex/react'
import { useAdFatigueWithAggregation } from '@/features/meta-api/hooks/useAdFatigueWithAggregation'
import { SimpleAccountStore } from '@/features/meta-api/account/account-store'
import { vibe } from '@/lib/vibelogger'

export function AggregationTestComponent() {
  const [enableAggregation, setEnableAggregation] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [accountId, setAccountId] = useState<string>('')
  const [accountName, setAccountName] = useState<string>('')
  const [isLoadingAccount, setIsLoadingAccount] = useState(true)
  
  const convexClient = useConvex()
  const [accountStore] = useState(() => new SimpleAccountStore(convexClient))
  
  // アクティブなアカウントを取得
  useEffect(() => {
    const fetchActiveAccount = async () => {
      try {
        const account = await accountStore.getActiveAccount()
        if (account) {
          setAccountId(account.accountId)
          setAccountName(account.name || account.accountId)
          vibe.good('アクティブアカウント取得成功', { accountId: account.accountId })
        } else {
          vibe.warn('アクティブアカウントが設定されていません')
        }
      } catch (error) {
        vibe.bad('アカウント取得エラー', { error })
      } finally {
        setIsLoadingAccount(false)
      }
    }
    fetchActiveAccount()
  }, [accountStore])
  
  const {
    insights,
    aggregatedData,
    isLoading,
    isAggregating,
    error,
    aggregationError,
    aggregationMetrics,
    refetch,
    dataSource
  } = useAdFatigueWithAggregation({
    accountId: accountId || 'dummy', // アカウントIDがまだない場合はダミー値
    dateRange: 'last_30d',
    enableAggregation: enableAggregation && !!accountId, // アカウントIDがある場合のみ集約を有効化
    aggregationOptions: {
      includePlatformBreakdown: true,
      includeDailyBreakdown: true
    }
  })

  // データ統計を計算
  const stats = {
    originalRows: insights?.length || 0,
    aggregatedRows: aggregatedData?.length || 0,
    uniqueAds: aggregatedData ? aggregatedData.length : 
      insights ? new Set(insights.map((i: any) => i.ad_id)).size : 0,
    processingTime: aggregationMetrics?.processingTimeMs || 0,
    dataReduction: aggregationMetrics?.dataReduction || '0%'
  }

  // アカウントローディング中の表示
  if (isLoadingAccount) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-3xl animate-pulse mb-4">⏳</div>
          <p className="text-gray-600">アカウント情報を取得中...</p>
        </div>
      </div>
    )
  }

  // アカウントが設定されていない場合
  if (!accountId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center bg-yellow-50 border border-yellow-200 rounded-lg p-8">
          <div className="text-3xl mb-4">⚠️</div>
          <p className="text-lg font-semibold mb-2">アカウントが設定されていません</p>
          <p className="text-sm text-gray-600 mb-4">
            Meta APIアカウントを設定してからお試しください
          </p>
          <button
            onClick={() => window.location.href = '/meta-api-setup'}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            アカウント設定へ
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* ヘッダー */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            📊 データ集約テスト
          </h2>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              dataSource === 'api' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
            }`}>
              {dataSource || 'No Data'}
            </span>
            <button
              onClick={() => setEnableAggregation(!enableAggregation)}
              disabled={!accountId}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                enableAggregation 
                  ? 'bg-blue-600 text-white hover:bg-blue-700' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              } ${!accountId ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              集約: {enableAggregation ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>
        <p className="text-sm text-gray-600">
          Meta APIから取得した生データを階層構造に集約し、
          重複を解消して広告単位のパフォーマンスデータを生成します。
        </p>
        <div className="mt-2 text-xs text-gray-500">
          アカウント: {accountName} ({accountId})
        </div>
      </div>

      {/* ステータス */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 元データ */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold">{stats.originalRows.toLocaleString()}</div>
          <p className="text-sm text-gray-600">元データ行数</p>
          <p className="text-xs mt-1 text-gray-500">
            {stats.uniqueAds} 広告 × 日数 × プラットフォーム
          </p>
        </div>

        {/* 集約後データ */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold">
            {enableAggregation ? stats.aggregatedRows.toLocaleString() : '-'}
          </div>
          <p className="text-sm text-gray-600">集約後行数</p>
          {enableAggregation && (
            <p className="text-xs mt-1 text-green-600">
              削減率: {stats.dataReduction}
            </p>
          )}
        </div>

        {/* 処理時間 */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold">
            {enableAggregation ? `${stats.processingTime.toFixed(0)}ms` : '-'}
          </div>
          <p className="text-sm text-gray-600">処理時間</p>
          {enableAggregation && stats.processingTime > 0 && (
            <p className="text-xs mt-1 text-gray-500">
              {Math.floor(stats.originalRows / (stats.processingTime / 1000))} rows/sec
            </p>
          )}
        </div>

        {/* ステータス */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-center h-8">
            {isLoading || isAggregating ? (
              <div className="text-3xl animate-pulse">⏳</div>
            ) : error || aggregationError ? (
              <div className="text-3xl">❌</div>
            ) : aggregatedData && enableAggregation ? (
              <div className="text-3xl">✅</div>
            ) : (
              <div className="text-3xl">📊</div>
            )}
          </div>
          <p className="text-sm text-gray-600 text-center mt-2">
            {isLoading ? '読み込み中...' :
             isAggregating ? '集約処理中...' :
             error ? 'エラー' :
             aggregationError ? '集約エラー' :
             aggregatedData && enableAggregation ? '完了' : '待機中'}
          </p>
        </div>
      </div>

      {/* エラー表示 */}
      {(error || aggregationError) && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-red-600">
            <div className="font-semibold mb-2">エラーが発生しました</div>
            <div className="text-sm">{error?.message || aggregationError?.message}</div>
          </div>
        </div>
      )}

      {/* データプレビュー */}
      {enableAggregation && aggregatedData && aggregatedData.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">集約データプレビュー（最初の5件）</h3>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
            >
              {showDetails ? '詳細を隠す' : '詳細を表示'}
            </button>
          </div>
          <div className="space-y-4">
            {aggregatedData.slice(0, 5).map((ad, index) => (
              <div key={ad.ad_id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-semibold">{ad.ad_name}</div>
                    <div className="text-sm text-gray-600">
                      ID: {ad.ad_id} | Campaign: {ad.campaign_name}
                    </div>
                  </div>
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                    {ad.metadata.dataQuality}
                  </span>
                </div>
                
                <div className="grid grid-cols-3 gap-4 mt-3">
                  <div>
                    <div className="text-sm text-gray-600">インプレッション</div>
                    <div className="font-mono">
                      {ad.summary.metrics.impressions.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">クリック</div>
                    <div className="font-mono">
                      {ad.summary.metrics.clicks.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">CTR</div>
                    <div className="font-mono">
                      {ad.summary.metrics.ctr.toFixed(2)}%
                    </div>
                  </div>
                </div>

                {showDetails && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="text-sm">
                      <div className="mb-2">
                        <span className="text-gray-600">期間: </span>
                        {ad.summary.dateRange.start} ～ {ad.summary.dateRange.end}
                      </div>
                      <div className="mb-2">
                        <span className="text-gray-600">日別データ: </span>
                        {ad.dailyBreakdown.length} 日分
                      </div>
                      {ad.summary.platformBreakdown && (
                        <div>
                          <span className="text-gray-600">プラットフォーム: </span>
                          {Object.keys(ad.summary.platformBreakdown).join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* アクション */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              isLoading 
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isLoading ? '読み込み中...' : 'データを再取得'}
          </button>
          
          {enableAggregation && aggregatedData && (
            <button
              onClick={() => {
                console.log('Aggregated Data:', aggregatedData)
                console.log('Metrics:', aggregationMetrics)
                alert('コンソールに詳細データを出力しました')
              }}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              コンソールに出力
            </button>
          )}

          <div className="text-sm text-gray-600 ml-auto">
            使用中: {accountName}
          </div>
        </div>
      </div>

      {/* デバッグ情報 */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-gray-50 border border-gray-300 border-dashed rounded-lg p-4">
          <h4 className="text-sm font-semibold mb-2">デバッグ情報</h4>
          <pre className="text-xs overflow-auto bg-white p-2 rounded">
            {JSON.stringify({
              enableAggregation,
              dataSource,
              originalRows: stats.originalRows,
              aggregatedRows: stats.aggregatedRows,
              uniqueAds: stats.uniqueAds,
              metrics: aggregationMetrics,
              hasError: !!(error || aggregationError)
            }, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}