import React, { useState, useEffect, Suspense } from 'react'
import { FatigueDashboard } from './FatigueDashboardOld'
import { AdFatigueErrorBoundary } from './AdFatigueErrorBoundary'
import { ArrowPathIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline'
import { logger } from '../../utils/logger'
import { getApiCallStats } from '../../utils/metaApiMonitor'

// 遅延読み込みコンポーネント
const LazyFatigueDashboard = React.lazy(() => 
  import('./FatigueDashboardEnhanced').then(module => ({ 
    default: module.FatigueDashboardEnhanced 
  }))
)

interface Props {
  accountId: string
}

// ローディングコンポーネント
const LoadingState = () => (
  <div className="min-h-[600px] flex items-center justify-center">
    <div className="text-center">
      <ArrowPathIcon className="h-12 w-12 text-indigo-600 animate-spin mx-auto mb-4" />
      <h3 className="text-lg font-medium text-gray-900">データを読み込んでいます</h3>
      <p className="text-sm text-gray-500 mt-2">しばらくお待ちください...</p>
    </div>
  </div>
)

// エラー時のフォールバック
const ErrorFallback = ({ error, retry }: { error?: Error; retry?: () => void }) => (
  <div className="min-h-[600px] flex items-center justify-center p-8">
    <div className="max-w-lg w-full">
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <div className="flex items-start">
          <ExclamationCircleIcon className="h-6 w-6 text-yellow-600 mt-0.5" />
          <div className="ml-3 flex-1">
            <h3 className="text-lg font-medium text-yellow-800">
              一時的な問題が発生しています
            </h3>
            <p className="mt-2 text-sm text-yellow-700">
              広告疲労度分析の読み込みに問題が発生しました。
              ネットワーク接続を確認し、再度お試しください。
            </p>
            
            {error && process.env.NODE_ENV === 'development' && (
              <details className="mt-4">
                <summary className="text-xs text-yellow-600 cursor-pointer">
                  エラー詳細
                </summary>
                <pre className="mt-2 text-xs text-yellow-600 overflow-x-auto">
                  {error.message}
                </pre>
              </details>
            )}

            {retry && (
              <button
                onClick={retry}
                className="mt-4 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700"
              >
                <ArrowPathIcon className="h-4 w-4 mr-1.5" />
                再試行
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  </div>
)

// デバッグ情報パネル
const DebugPanel = () => {
  const [stats, setStats] = useState<any>(null)
  
  useEffect(() => {
    const interval = setInterval(() => {
      setStats(getApiCallStats())
    }, 5000)
    
    return () => clearInterval(interval)
  }, [])
  
  if (!stats || process.env.NODE_ENV !== 'development') return null
  
  return (
    <div className="fixed bottom-4 right-4 bg-gray-900 text-white p-4 rounded-lg shadow-lg max-w-sm text-xs">
      <h4 className="font-bold mb-2">API Monitor</h4>
      <div className="space-y-1">
        <div>Total Calls: {stats.totalCalls}</div>
        <div>Success Rate: {stats.successRate}</div>
        <div>Avg Duration: {stats.avgDuration}ms</div>
        {Object.entries(stats.currentErrors).map(([context, count]) => (
          <div key={context} className="text-red-400">
            Error: {context} ({count})
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * 安定版FatigueDashboardラッパー
 * エラーハンドリング、ローディング状態、監視機能を統合
 */
export const FatigueDashboardStable: React.FC<Props> = ({ accountId }) => {
  const [hasError, setHasError] = useState(false)
  const [retryKey, setRetryKey] = useState(0)

  const handleError = (error: Error, errorInfo: any) => {
    logger.error('[FatigueDashboardStable] Error occurred:', {
      error: error.message,
      accountId,
      errorInfo
    })
    setHasError(true)
  }

  const handleRetry = () => {
    logger.info('[FatigueDashboardStable] Retrying dashboard load')
    setHasError(false)
    setRetryKey(prev => prev + 1)
  }

  // アカウントIDが変更されたらリセット
  useEffect(() => {
    setHasError(false)
    setRetryKey(prev => prev + 1)
  }, [accountId])

  return (
    <>
      <AdFatigueErrorBoundary 
        key={retryKey}
        onError={handleError}
        fallback={<ErrorFallback retry={handleRetry} />}
      >
        <Suspense fallback={<LoadingState />}>
          {hasError ? (
            <ErrorFallback retry={handleRetry} />
          ) : (
            <LazyFatigueDashboard accountId={accountId} />
          )}
        </Suspense>
      </AdFatigueErrorBoundary>
      
      {/* デバッグパネル */}
      <DebugPanel />
    </>
  )
}