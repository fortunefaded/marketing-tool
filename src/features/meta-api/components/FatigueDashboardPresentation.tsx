import { useMemo, useEffect } from 'react'
import { AccountSelector } from '../account/AccountSelector'
import { StatCard } from './StatCard'
import { AggregatedFatigueTable } from './AggregatedFatigueTable'
import { CreativeTableTab } from './CreativeTableTab'
import { Alert } from './Alert'
import { DataValidationAlert } from './DataValidationAlert'
import { MetaAccount, FatigueData } from '@/types'
import { aggregateByLevel } from '../utils/aggregation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useRateLimitStatus } from '../hooks/useRateLimitStatus'
import { DataLoadingProgress } from './DataLoadingProgress'
import { DateRangeFilter } from './DateRangeFilter'
import type { DateRangeFilter as DateRangeFilterType } from '../hooks/useAdFatigueSimplified'

interface FatigueDashboardPresentationProps {
  // アカウント関連
  accounts: MetaAccount[]
  selectedAccountId: string | null
  isLoadingAccounts: boolean
  onAccountSelect: (accountId: string) => void

  // データ関連
  data: FatigueData[]
  insights: any[]
  isLoading: boolean
  isRefreshing: boolean
  error: Error | null

  // アクション
  onRefresh: (options?: { clearCache?: boolean }) => Promise<void>

  // メタ情報
  dataSource: 'cache' | 'api' | null
  lastUpdateTime: Date | null
  
  // 進捗情報
  progress?: {
    loaded: number
    hasMore: boolean
    isAutoFetching: boolean
  }
  
  // フィルター関連
  dateRange: DateRangeFilterType
  onDateRangeChange: (dateRange: DateRangeFilterType) => void
  totalInsights?: number
  filteredCount?: number
}

/**
 * FatigueDashboard のプレゼンテーションコンポーネント
 * 責務: UI の表示とユーザーインタラクションのみ
 */
export function FatigueDashboardPresentation({
  accounts,
  selectedAccountId,
  isLoadingAccounts,
  onAccountSelect,
  data,
  insights,
  isLoading,
  isRefreshing,
  error,
  onRefresh,
  dataSource,
  lastUpdateTime,
  progress,
  dateRange,
  onDateRangeChange,
  totalInsights,
  filteredCount,
}: FatigueDashboardPresentationProps) {
  // デバッグモード設定（初回のみ）
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (!(window as any).DEBUG_FATIGUE) {
        console.log('🔧 デバッグモードのヒント: window.DEBUG_FATIGUE = true でデバッグログを有効化できます')
      }
      // デバッグツールをグローバルに公開（遅延読み込み対応）
      import('../utils/debug-helper').then(() => {
        console.log('🔧 デバッグツール準備完了: FatigueDebug')
      })
    }
  }, [])
  
  // レート制限状態を取得
  const rateLimitStatus = useRateLimitStatus()
  
  // レート制限中かどうかチェック
  const isRateLimited = rateLimitStatus.isRateLimited
  const canRefresh = !isRefreshing && rateLimitStatus.canRetry
  
  // 集計データをメモ化
  const aggregatedData = useMemo(() => {
    if (!insights || insights.length === 0) return { campaign: [], adset: [] }

    return {
      campaign: aggregateByLevel(insights, 'campaign'),
      adset: aggregateByLevel(insights, 'adset'),
    }
  }, [insights])

  // 日時フォーマット関数
  const formatDateTime = (date: Date | null) => {
    if (!date) return '不明'
    return new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="w-full max-w-none">
        {/* デバッグログパネル */}
        {typeof window !== 'undefined' && (window as any).DEBUG_FATIGUE && (
          <div className="bg-gray-800 text-gray-100 p-4 rounded-lg mb-4 font-mono text-xs">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-yellow-400 font-bold">🔧 Debug Logs</h3>
              <button
                onClick={() => {
                  console.log('🔍 現在のデバッグログ:', (window as any).DEBUG_FATIGUE_LOGS)
                  alert('デバッグログをコンソールに出力しました')
                }}
                className="px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs"
              >
                View All Logs
              </button>
            </div>
            <div className="space-y-1">
              <div>👥 Accounts: {accounts.length} | Selected: {selectedAccountId || 'none'}</div>
              <div>📊 Data: {data.length} items | Insights: {insights.length} items</div>
              <div>🎮 Loading: {isLoading ? 'Yes' : 'No'} | Refreshing: {isRefreshing ? 'Yes' : 'No'}</div>
              <div>📡 Data Source: {dataSource || 'none'} | Error: {error?.message || 'none'}</div>
              <div className="text-yellow-300">
                💡 To enable debug mode: window.DEBUG_FATIGUE = true
              </div>
            </div>
          </div>
        )}
        
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Simple Ad Fatigue Dashboard</h1>

          {selectedAccountId && (
            <div className="flex items-center gap-4">
              {/* フィルター件数の表示 */}
              {totalInsights !== undefined && filteredCount !== undefined && (
                <div className="text-sm text-gray-600">
                  <div>表示中: {filteredCount}件 / 全{totalInsights}件</div>
                  {totalInsights !== filteredCount && (
                    <div className="text-xs text-blue-600">
                      {totalInsights - filteredCount}件をフィルターで非表示
                    </div>
                  )}
                </div>
              )}
              
              {dataSource && (
                <div className="text-sm text-gray-600">
                  <div>データソース: {dataSource === 'cache' ? 'キャッシュ' : 'Meta API'}</div>
                  <div className="text-xs">最終更新: {formatDateTime(lastUpdateTime)}</div>
                </div>
              )}

              {/* 期間フィルター */}
              <DateRangeFilter 
                value={dateRange} 
                onChange={onDateRangeChange} 
              />

              {/* レート制限状態の表示 */}
              {isRateLimited && (
                <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 border border-orange-200 rounded-lg">
                  <svg className="w-5 h-5 text-orange-600 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm text-orange-700">
                    レート制限中: {rateLimitStatus.timeRemaining}秒後に再試行可能
                  </span>
                </div>
              )}
              
              {/* データ更新ボタン */}
              <button
                onClick={() => {
                  console.log('🔥 データ更新ボタンクリック:', { 
                    isRefreshing, 
                    isRateLimited,
                    canRefresh,
                    onRefreshType: typeof onRefresh,
                    selectedAccountId,
                    hasOnRefresh: !!onRefresh,
                    timestamp: new Date().toISOString()
                  })
                  
                  if (!onRefresh) {
                    console.error('❌ onRefresh関数が定義されていません')
                    return
                  }
                  
                  if (!selectedAccountId) {
                    console.warn('⚠️ アカウントが選択されていません')
                    return
                  }
                  
                  if (isRateLimited) {
                    console.warn('⏳ レート制限中のため更新できません')
                    return
                  }
                  
                  console.log('📡 onRefresh関数を呼び出します...')
                  // キャッシュをクリアして最新データを取得
                  onRefresh({ clearCache: true })
                  console.log('✅ onRefresh関数の呼び出しが完了しました')
                }}
                disabled={!canRefresh}
                className={`px-4 py-2 rounded-lg text-white transition-colors ${
                  !canRefresh 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-indigo-600 hover:bg-indigo-700 cursor-pointer'
                }`}
                title={isRateLimited ? `あと${rateLimitStatus.timeRemaining}秒お待ちください` : ''}
              >
                {isRefreshing ? '更新中...' : isRateLimited ? `再試行まで ${rateLimitStatus.timeRemaining}秒` : 'データ更新'}
              </button>
            </div>
          )}
        </div>

        <AccountSelector
          accounts={accounts}
          selectedAccountId={selectedAccountId}
          onSelect={onAccountSelect}
          isLoading={isLoadingAccounts}
        />

        {error && (
          <Alert
            type="error"
            title="データ取得エラー"
            message={
              error.message.includes('Token expired or invalid')
                ? 'Meta広告のアクセストークンが期限切れです。再度接続設定を行ってください。'
                : error.message.includes('No token found')
                  ? 'Meta広告アカウントが接続されていません。'
                  : error.message.includes('API Error: 401')
                    ? 'Meta広告APIの認証に失敗しました。トークンを更新してください。'
                    : error.message
            }
            action={
              error.message.includes('Token expired or invalid') ||
              error.message.includes('No token found') ||
              error.message.includes('API Error: 401')
                ? { label: 'Meta API設定を開く', href: '/meta-api-setup' }
                : undefined
            }
          />
        )}

        {selectedAccountId && !error && !isLoading && data.length === 0 && (
          <Alert
            type="warning"
            title="広告データが見つかりません"
            message="このアカウントには表示可能な広告データがありません。"
            action={{ 
              label: 'キャッシュをクリアして再取得', 
              onClick: () => {
                console.log('🗑️ キャッシュクリアして再取得')
                onRefresh({ clearCache: true })
              }
            }}
          />
        )}
        
        {/* 進捗バー表示 */}
        {selectedAccountId && progress && (
          <DataLoadingProgress progress={progress} />
        )}

        {selectedAccountId && !error && (
          <>
            {isLoading && !data.length ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading fatigue data...</p>
              </div>
            ) : (
              <>
                {data.length > 0 && (
                  <>
                    {/* データ検証アラート */}
                    <DataValidationAlert
                      data={data}
                      onRevalidate={() => onRefresh()}
                      isValidating={isLoading}
                    />

                    <div className="relative">
                      {/* 更新中のオーバーレイ */}
                      {isRefreshing && (
                        <div className="absolute inset-0 bg-white bg-opacity-75 z-10 flex items-center justify-center">
                          <div className="bg-white rounded-lg shadow-lg p-6 flex items-center space-x-4">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                            <span className="text-gray-700">データを更新中...</span>
                          </div>
                        </div>
                      )}

                      <Tabs defaultValue="creative-table" className="w-full">
                        <TabsList className="grid w-full grid-cols-3 mb-6">
                          <TabsTrigger value="creative-table">
                            クリエイティブ（テーブル）
                          </TabsTrigger>
                          <TabsTrigger value="adset">広告セット</TabsTrigger>
                          <TabsTrigger value="campaign">キャンペーン</TabsTrigger>
                        </TabsList>

                        <TabsContent value="creative-table">
                          <div className="grid grid-cols-4 gap-4 mb-8">
                            <StatCard title="Total" value={data.length} />
                            <StatCard
                              title="Critical"
                              value={data.filter((d) => d.status === 'critical').length}
                              color="red"
                            />
                            <StatCard
                              title="Warning"
                              value={data.filter((d) => d.status === 'warning').length}
                              color="yellow"
                            />
                            <StatCard
                              title="Healthy"
                              value={data.filter((d) => d.status === 'healthy').length}
                              color="green"
                            />
                          </div>

                          <CreativeTableTab
                            data={data}
                            insights={insights}
                            selectedAccountId={selectedAccountId}
                            isLoading={isLoading}
                          />
                        </TabsContent>

                        <TabsContent value="adset">
                          <AggregatedFatigueTable data={aggregatedData.adset} level="adset" />
                        </TabsContent>

                        <TabsContent value="campaign">
                          <AggregatedFatigueTable data={aggregatedData.campaign} level="campaign" />
                        </TabsContent>
                      </Tabs>
                    </div>
                  </>
                )}
              </>
            )}
          </>
        )}

        {!selectedAccountId && !isLoadingAccounts && (
          <div className="bg-gray-50 rounded-lg p-8 text-center text-gray-500">
            Please select an account to view fatigue data
          </div>
        )}
      </div>
    </div>
  )
}
