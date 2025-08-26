import React, { memo, Suspense, lazy } from 'react'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { vibe } from '@/lib/vibelogger'
import { useOptimizedMetaInsights } from '../hooks/useOptimizedMetaData'
import { usePerformanceStore, usePerformanceActions } from '../stores/usePerformanceStore'
import { useMetricsCalculator } from '../hooks/useWebWorker'
import { VirtualizedAdList } from './VirtualizedAdList'
import { OptimizedMetricCard } from './OptimizedMetricCard'
import { 
  CurrencyYenIcon, 
  EyeIcon, 
  CursorArrowRaysIcon,
  ChartBarIcon 
} from '@heroicons/react/24/outline'

// 遅延ロードコンポーネント (temporarily disabled - components not yet created)
// const HeavyChartComponent = lazy(() => import('./HeavyChartComponent'))
// const DetailedAnalytics = lazy(() => import('./DetailedAnalytics'))

/**
 * パフォーマンス最適化されたダッシュボード
 */
export const OptimizedDashboard = memo(() => {
  const { selectedAccountId, dateRange, viewMode } = usePerformanceStore()
  const { setViewMode } = usePerformanceActions()
  
  // 最適化されたデータフェッチング
  const { 
    insights, 
    metrics, 
    isLoading, 
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useOptimizedMetaInsights({
    accountId: selectedAccountId || '',
    dateRange
  })
  
  // Web Workerでの重い計算
  const { calculateMetrics, result: calculatedMetrics, isProcessing } = useMetricsCalculator()
  
  // insightsが変更されたら再計算（デバウンス付き）
  React.useEffect(() => {
    if (insights.length > 0) {
      const timer = setTimeout(() => {
        calculateMetrics(insights)
      }, 300)
      
      return () => clearTimeout(timer)
    }
  }, [insights, calculateMetrics])
  
  if (isLoading) {
    return <DashboardSkeleton />
  }
  
  return (
    <ErrorBoundary fallback={<ErrorFallback />}>
      <div className="p-6 space-y-6">
        {/* メトリクスカード（メモ化済み） */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <OptimizedMetricCard
            title="総広告費"
            value={metrics?.totalSpend || 0}
            format="currency"
            icon={<CurrencyYenIcon className="h-6 w-6" />}
          />
          <OptimizedMetricCard
            title="総インプレッション"
            value={metrics?.totalImpressions || 0}
            format="number"
            icon={<EyeIcon className="h-6 w-6" />}
          />
          <OptimizedMetricCard
            title="平均CTR"
            value={metrics?.avgCtr || 0}
            format="percentage"
            icon={<CursorArrowRaysIcon className="h-6 w-6" />}
          />
          <OptimizedMetricCard
            title="平均頻度"
            value={metrics?.avgFrequency || 0}
            format="number"
            icon={<ChartBarIcon className="h-6 w-6" />}
          />
        </div>
        
        {/* ビューモード切替（メモ化済み） */}
        <ViewModeSelector viewMode={viewMode} onChange={setViewMode} />
        
        {/* コンテンツエリア */}
        <div className="bg-white rounded-lg shadow">
          {viewMode === 'list' && (
            <div className="h-[600px]">
              <VirtualizedAdList 
                ads={insights}
                onAdSelect={(ad) => vibe.info('広告選択', { adId: ad.ad_id, adName: ad.ad_name })}
              />
            </div>
          )}
          
          {viewMode === 'chart' && (
            <div className="p-8 text-center text-gray-500">
              Chart view is temporarily unavailable
            </div>
          )}
          
          {viewMode === 'grid' && (
            <div className="p-8 text-center text-gray-500">
              Grid view is temporarily unavailable
            </div>
          )}
        </div>
        
        {/* 無限スクロールのロードモア */}
        {hasNextPage && (
          <div className="text-center py-4">
            <button
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400"
            >
              {isFetchingNextPage ? 'Loading...' : 'Load More'}
            </button>
          </div>
        )}
      </div>
    </ErrorBoundary>
  )
})

// ビューモードセレクター（メモ化）
const ViewModeSelector = memo<{
  viewMode: string
  onChange: (mode: 'grid' | 'list' | 'chart') => void
}>(({ viewMode, onChange }) => (
  <div className="flex space-x-2">
    {(['grid', 'list', 'chart'] as const).map(mode => (
      <button
        key={mode}
        onClick={() => onChange(mode)}
        className={`px-4 py-2 rounded-lg transition-colors ${
          viewMode === mode 
            ? 'bg-indigo-600 text-white' 
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
        }`}
      >
        {mode.charAt(0).toUpperCase() + mode.slice(1)}
      </button>
    ))}
  </div>
))

// スケルトンコンポーネント
const DashboardSkeleton = () => (
  <div className="p-6 space-y-6 animate-pulse">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-gray-200 h-32 rounded-lg" />
      ))}
    </div>
    <div className="bg-gray-200 h-96 rounded-lg" />
  </div>
)

const ChartSkeleton = () => (
  <div className="h-96 bg-gray-100 animate-pulse flex items-center justify-center">
    <span className="text-gray-400">Loading chart...</span>
  </div>
)

const GridSkeleton = () => (
  <div className="grid grid-cols-3 gap-4 p-4">
    {[...Array(9)].map((_, i) => (
      <div key={i} className="bg-gray-200 h-48 rounded-lg animate-pulse" />
    ))}
  </div>
)

const ErrorFallback = () => (
  <div className="p-8 text-center">
    <h2 className="text-xl font-bold text-red-600 mb-2">エラーが発生しました</h2>
    <p className="text-gray-600">ページを再読み込みしてください</p>
  </div>
)