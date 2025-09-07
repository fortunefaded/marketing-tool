import React, { useEffect, useState } from 'react'
import { AccountSelector } from '../account/AccountSelector'
import { StatCard } from './StatCard'
import { AggregatedFatigueTable } from './AggregatedFatigueTable'
import { CreativeTableTab } from './CreativeTableTab'
import { VirtualizedCreativeTable } from './VirtualizedCreativeTable'
import { Alert } from './Alert'
import { DataValidationAlert } from './DataValidationAlert'
import { MetaAccount, FatigueData } from '@/types'
import { aggregateByLevel } from '../utils/aggregation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { useRateLimitStatus } from '../hooks/useRateLimitStatus'
import { DataLoadingProgress } from './DataLoadingProgress'
import { DateRangeFilter } from './DateRangeFilter'
import { UnifiedFilterSection } from './UnifiedFilterSection'
import { SafeFilterWrapper } from './SafeFilterWrapper'
import { ErrorLogPanel } from './ErrorLogPanel'
import type { DateRangeFilter as DateRangeFilterType } from '../hooks/useAdFatigueSimplified'

interface FatigueDashboardPresentationProps {
  // アカウント関連
  accounts: MetaAccount[]
  selectedAccountId: string | null
  isLoadingAccounts: boolean
  onAccountSelect: (accountId: string) => void

  // データ関連
  data: any // FatigueData[]またはAdPerformanceData[]
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
  customDateRange?: { start: Date; end: Date } | null

  // 認証情報（追加）
  accessToken?: string
  onCustomDateRange?: (start: Date, end: Date) => void
  totalInsights?: number
  filteredCount?: number

  // 集約関連（常時有効）
  enableAggregation?: boolean
  // onToggleAggregation削除: トグル機能は廃止
  aggregatedData?: any
  aggregationMetrics?: {
    inputRows: number
    outputRows: number
    processingTimeMs: number
    dataReduction: string
  }
  isAggregating?: boolean

  // フィルター関連（新規追加）
  onFilterChange?: (filteredData: any) => void
  sourceData?: any
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
  data: rawData,
  insights: rawInsights,
  isLoading,
  isRefreshing,
  error,
  onRefresh,
  dataSource,
  lastUpdateTime,
  progress,
  dateRange,
  onDateRangeChange,
  customDateRange,
  onCustomDateRange,
  accessToken, // 追加
  totalInsights,
  filteredCount,
  enableAggregation = true, // デフォルトをtrueに変更
  // onToggleAggregation削除済み
  aggregatedData,
  aggregationMetrics,
  isAggregating,
  onFilterChange,
  sourceData: rawSourceData,
}: FatigueDashboardPresentationProps) {
  // 実効的な日付範囲を計算（一度だけ計算して保持）
  const effectiveDateRange = React.useMemo(() => {
    // カスタム日付範囲が設定されている場合はそれを優先
    if (customDateRange) {
      console.log('📅 Using custom date range:', customDateRange)
      return customDateRange
    }
    
    // プリセットの場合は日付範囲を計算
    if (dateRange) {
      const today = new Date()
      let calculatedRange = null
      
      switch(dateRange) {
        case 'last_7d':
          calculatedRange = {
            start: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000),
            end: today
          }
          break
        case 'last_14d':
          calculatedRange = {
            start: new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000),
            end: today
          }
          break
        case 'last_30d':
          calculatedRange = {
            start: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000),
            end: today
          }
          break
        case 'last_month':
          // 現在の日付を取得
          const now = new Date()
          let year = now.getFullYear()
          let month = now.getMonth() - 1 // 先月の月インデックス（0-based）
          
          // 1月の場合は前年の12月
          if (month < 0) {
            month = 11
            year = year - 1
          }
          
          // 先月の1日 0:00:00（ローカルタイムで設定）
          const lastMonthStart = new Date(year, month, 1, 0, 0, 0, 0)
          // 先月の最終日 23:59:59.999（ローカルタイムで設定）
          const lastMonthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999)
          
          calculatedRange = {
            start: lastMonthStart,
            end: lastMonthEnd
          }
          
          console.log('📅 Last month calculation fixed:', {
            currentDate: now.toLocaleDateString('ja-JP'),
            currentMonth: now.getMonth() + 1,
            targetYear: year,
            targetMonth: month + 1, // 人間が読みやすい形式（1-based）
            startDate: `${year}/${month + 1}/1`,
            endDate: `${year}/${month + 1}/${lastMonthEnd.getDate()}`,
            startFull: lastMonthStart.toLocaleDateString('ja-JP'),
            endFull: lastMonthEnd.toLocaleDateString('ja-JP'),
            startISO: lastMonthStart.toISOString(),
            endISO: lastMonthEnd.toISOString()
          })
          break
        case 'last_90d':
          calculatedRange = {
            start: new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000),
            end: today
          }
          break
      }
      
      console.log('📅 Calculated date range from preset:', dateRange, calculatedRange)
      return calculatedRange
    }
    
    return null
  }, [dateRange, customDateRange])

  // データが配列であることを保証
  const data = Array.isArray(rawData) ? rawData : []
  const insights = Array.isArray(rawInsights) ? rawInsights : []
  const sourceData = Array.isArray(rawSourceData) ? rawSourceData : []

  // 仮想スクロールの使用状態
  const [useVirtualScroll, setUseVirtualScroll] = useState(data.length > 100) // 100件以上で自動的に有効化

  // フィルターの表示状態
  // デバッグモード設定（初回のみ）
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (!(window as any).DEBUG_FATIGUE) {
        console.log(
          '🔧 デバッグモードのヒント: window.DEBUG_FATIGUE = true でデバッグログを有効化できます'
        )
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

  // 集計データをメモ化（キャンペーン・広告セット別）
  const levelAggregatedData = React.useMemo(() => {
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
              <div>
                👥 Accounts: {accounts.length} | Selected: {selectedAccountId || 'none'}
              </div>
              <div>
                📊 Data: {data.length} items | Insights: {insights.length} items
              </div>
              <div>
                🎮 Loading: {isLoading ? 'Yes' : 'No'} | Refreshing: {isRefreshing ? 'Yes' : 'No'}
              </div>
              <div>
                📡 Data Source: {dataSource || 'none'} | Error: {error?.message || 'none'}
              </div>
              <div className="text-yellow-300">
                💡 To enable debug mode: window.DEBUG_FATIGUE = true
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>

          {selectedAccountId && (
            <div className="flex items-center gap-4">
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
                customDateRange={customDateRange}
                onCustomDateRange={onCustomDateRange}
                isLoading={isLoading || isRefreshing}
              />

              {/* 集約トグル削除: 常時集約有効のため不要 */}

              {/* レート制限状態の表示 */}
              {isRateLimited && (
                <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 border border-orange-200 rounded-lg">
                  <svg
                    className="w-5 h-5 text-orange-600 animate-pulse"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
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
                    timestamp: new Date().toISOString(),
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
                {isRefreshing
                  ? '更新中...'
                  : isRateLimited
                    ? `再試行まで ${rateLimitStatus.timeRemaining}秒`
                    : 'データ更新'}
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
              },
            }}
          />
        )}

        {/* 進捗バー表示 */}
        {selectedAccountId && progress && <DataLoadingProgress progress={progress} />}

        {selectedAccountId && !error ? (
          <>
            {isLoading && !data.length ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading fatigue data...</p>
              </div>
            ) : (
              <>
                {/* データ検証アラート - データがある場合のみ */}
                {data.length > 0 && (
                  <DataValidationAlert
                    data={data}
                    onRevalidate={() => onRefresh()}
                    isValidating={isLoading}
                  />
                )}

                {/* フィルターセクション */}
                {onFilterChange && sourceData && (
                  <>
                    {/* 統合フィルターパネル - 折り畳み可能 */}
                    <SafeFilterWrapper>
                      <div className="mb-6">
                        <UnifiedFilterSection
                          data={sourceData}
                          onFilter={onFilterChange}
                          filteredCount={filteredCount}
                          totalCount={totalInsights}
                        />
                      </div>
                    </SafeFilterWrapper>
                  </>
                )}

                {/* データ表示エリア */}
                {data.length > 0 ? (
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

                    <Tabs defaultValue="campaign" className="w-full">
                      <TabsList className="grid w-full grid-cols-3 mb-6">
                        <TabsTrigger value="campaign">キャンペーン</TabsTrigger>
                        <TabsTrigger value="adset">広告セット</TabsTrigger>
                        <TabsTrigger value="creative-table">クリエイティブ</TabsTrigger>
                      </TabsList>

                      <TabsContent value="creative-table">
                        {/* 仮想スクロールトグル（大量データ時のみ表示） */}
                        {data.length > 50 && (
                          <div className="mb-4 flex items-center justify-between">
                            <div className="text-sm text-gray-600">{data.length}件のデータ</div>
                            <div className="flex items-center">
                              <label className="flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={useVirtualScroll}
                                  onChange={(e) => setUseVirtualScroll(e.target.checked)}
                                  className="mr-2"
                                />
                                <span className="text-sm text-gray-700">
                                  高速スクロールモード（仮想スクロール）
                                </span>
                              </label>
                            </div>
                          </div>
                        )}

                        {/* テーブル表示（条件分岐） */}
                        {useVirtualScroll ? (
                          <VirtualizedCreativeTable
                            data={data}
                            insights={insights}
                            selectedAccountId={selectedAccountId}
                            isLoading={isLoading}
                          />
                        ) : (
                          <CreativeTableTab
                            data={data}
                            insights={insights}
                            selectedAccountId={selectedAccountId}
                            isLoading={isLoading}
                            accessToken={accessToken}
                            dateRange={effectiveDateRange || undefined}
                          />
                        )}
                      </TabsContent>

                      <TabsContent value="adset">
                        <AggregatedFatigueTable
                          data={levelAggregatedData.adset}
                          level="adset"
                          insights={insights}
                          accessToken={accessToken}
                          accountId={selectedAccountId}
                          dateRange={effectiveDateRange || undefined}
                        />
                      </TabsContent>

                      <TabsContent value="campaign">
                        {(() => {
                          console.log('📊 Passing to AggregatedFatigueTable:', {
                            effectiveDateRange,
                            hasEffectiveDateRange: !!effectiveDateRange,
                            type: typeof effectiveDateRange
                          })
                          return null
                        })()}
                        <AggregatedFatigueTable
                          data={levelAggregatedData.campaign}
                          level="campaign"
                          insights={insights}
                          accessToken={accessToken}
                          accountId={selectedAccountId}
                          dateRange={effectiveDateRange || undefined}
                        />
                      </TabsContent>
                    </Tabs>
                  </div>
                ) : (
                  /* データなしの場合の表示 */
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                    <div className="flex items-center">
                      <svg
                        className="w-6 h-6 text-yellow-600 mr-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                        />
                      </svg>
                      <div>
                        <h3 className="text-lg font-semibold text-yellow-800 mb-2">
                          広告データが見つかりません
                        </h3>
                        <p className="text-yellow-700">
                          このアカウントには表示可能な広告データがありません。
                        </p>
                        {sourceData && sourceData.length > 0 && (
                          <p className="text-sm text-yellow-600 mt-2">
                            フィルター条件を調整するか、上記の「フィルターをリセット」ボタンをクリックしてください。
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={() => onRefresh({ clearCache: true })}
                        className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 text-sm"
                      >
                        キャッシュをクリアして再取得
                      </button>
                      {sourceData && sourceData.length > 0 && onFilterChange && (
                        <button
                          onClick={() => onFilterChange(sourceData)}
                          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                        >
                          すべてのデータを表示
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        ) : null}

        {!selectedAccountId && !isLoadingAccounts && (
          <div className="bg-gray-50 rounded-lg p-8 text-center text-gray-500">
            Please select an account to view fatigue data
          </div>
        )}
      </div>
      
      {/* エラーログパネル */}
      <ErrorLogPanel />
    </div>
  )
}
