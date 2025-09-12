import React, { useEffect, useState } from 'react'
import { AccountSelector } from '../account/AccountSelector'
import { AggregatedFatigueTable } from './AggregatedFatigueTable'
import { CreativeTableTab } from './CreativeTableTab'
import { Alert } from './Alert'
import { MetaAccount } from '@/types'
import { aggregateByLevel } from '../utils/aggregation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useRateLimitStatus } from '../hooks/useRateLimitStatus'
import { downloadCSV, downloadAggregatedCSV } from '@/utils/csv-export'
import { DataLoadingProgress } from './DataLoadingProgress'
import { DateRangeFilter } from './DateRangeFilter'
import { UnifiedFilterSection } from './UnifiedFilterSection'
import { SafeFilterWrapper } from './SafeFilterWrapper'
import type { DateRangeFilter as DateRangeFilterType } from '../hooks/useAdFatigueSimplified'
// import { logFilter } from '@/utils/debugLogger' // レンダリング中のstate更新を避けるため一時的に無効化

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
  // onToggleAggregation削除済み
  onFilterChange,
  sourceData: rawSourceData,
}: FatigueDashboardPresentationProps) {
  const [activeTab, setActiveTab] = useState<string>('campaign')

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

      switch (dateRange) {
        case 'last_7d':
          const yesterday7d = new Date(today.getTime() - 24 * 60 * 60 * 1000)
          yesterday7d.setHours(23, 59, 59, 999)
          calculatedRange = {
            start: new Date(yesterday7d.getTime() - 6 * 24 * 60 * 60 * 1000),
            end: yesterday7d,
          }
          break
        case 'last_14d':
          const yesterday14d = new Date(today.getTime() - 24 * 60 * 60 * 1000)
          yesterday14d.setHours(23, 59, 59, 999)
          calculatedRange = {
            start: new Date(yesterday14d.getTime() - 13 * 24 * 60 * 60 * 1000),
            end: yesterday14d,
          }
          break
        case 'last_30d':
          const yesterday30d = new Date(today.getTime() - 24 * 60 * 60 * 1000)
          yesterday30d.setHours(23, 59, 59, 999)
          calculatedRange = {
            start: new Date(yesterday30d.getTime() - 29 * 24 * 60 * 60 * 1000),
            end: yesterday30d,
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
            end: lastMonthEnd,
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
            endISO: lastMonthEnd.toISOString(),
          })
          break
        case 'this_month':
          // 今月の範囲を計算
          const thisMonth = new Date()
          const thisMonthStart = new Date(
            thisMonth.getFullYear(),
            thisMonth.getMonth(),
            1,
            0,
            0,
            0,
            0
          )
          const thisMonthEnd = new Date(
            thisMonth.getFullYear(),
            thisMonth.getMonth(),
            thisMonth.getDate(),
            23,
            59,
            59,
            999
          )

          calculatedRange = {
            start: thisMonthStart,
            end: thisMonthEnd,
          }

          // デバッグログはuseEffectで記録するように変更
          // logFilter('FatigueDashboardPresentation', '今月の範囲計算', {
          //   currentDate: thisMonth.toLocaleDateString('ja-JP'),
          //   currentMonth: thisMonth.getMonth() + 1,
          //   startDate: thisMonthStart.toLocaleDateString('ja-JP'),
          //   endDate: thisMonthEnd.toLocaleDateString('ja-JP'),
          //   startISO: thisMonthStart.toISOString(),
          //   endISO: thisMonthEnd.toISOString(),
          // })
          break
        case 'last_90d':
          const yesterday90d = new Date(today.getTime() - 24 * 60 * 60 * 1000)
          yesterday90d.setHours(23, 59, 59, 999)
          calculatedRange = {
            start: new Date(yesterday90d.getTime() - 89 * 24 * 60 * 60 * 1000),
            end: yesterday90d,
          }
          break

        case 'today':
          const todayStart = new Date(today)
          todayStart.setHours(0, 0, 0, 0)
          const todayEnd = new Date(today)
          todayEnd.setHours(23, 59, 59, 999)
          calculatedRange = {
            start: todayStart,
            end: todayEnd,
          }
          break

        case 'yesterday':
          const yesterday = new Date(today)
          yesterday.setDate(yesterday.getDate() - 1)
          yesterday.setHours(0, 0, 0, 0)
          const yesterdayEnd = new Date(yesterday)
          yesterdayEnd.setHours(23, 59, 59, 999)
          calculatedRange = {
            start: yesterday,
            end: yesterdayEnd,
          }
          break

        case 'last_28d':
          const yesterday28d = new Date(today.getTime() - 24 * 60 * 60 * 1000)
          yesterday28d.setHours(23, 59, 59, 999)
          calculatedRange = {
            start: new Date(yesterday28d.getTime() - 27 * 24 * 60 * 60 * 1000),
            end: yesterday28d,
          }
          break

        case 'this_week':
          // 今週（日曜始まり）
          const weekStart = new Date(today)
          const dayOfWeek = weekStart.getDay() // 0=日曜, 1=月曜, ..., 6=土曜
          // 今週の日曜日を計算（今日から dayOfWeek 日前）
          weekStart.setDate(weekStart.getDate() - dayOfWeek)
          weekStart.setHours(0, 0, 0, 0)
          // 今週の土曜日（今日または未来の土曜日）
          const weekEnd = new Date(weekStart)
          weekEnd.setDate(weekStart.getDate() + 6)
          weekEnd.setHours(23, 59, 59, 999)
          // 今日が土曜日より後の場合は今日を終了日とする
          const actualEnd = weekEnd > today ? today : weekEnd
          actualEnd.setHours(23, 59, 59, 999)
          calculatedRange = {
            start: weekStart,
            end: actualEnd,
          }
          break

        case 'last_week':
          // 先週（日曜始まり）
          const currentDay = today.getDay() // 0=日曜, 1=月曜, ..., 6=土曜
          // 先週の土曜日を計算（今日から currentDay + 1 日前）
          const lastSaturday = new Date(today)
          lastSaturday.setDate(today.getDate() - currentDay - 1)
          lastSaturday.setHours(23, 59, 59, 999)
          // 先週の日曜日を計算（先週の土曜日から6日前）
          const lastSunday = new Date(lastSaturday)
          lastSunday.setDate(lastSaturday.getDate() - 6)
          lastSunday.setHours(0, 0, 0, 0)
          calculatedRange = {
            start: lastSunday,
            end: lastSaturday,
          }
          break

        case 'this_month':
          const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
          monthStart.setHours(0, 0, 0, 0)
          const monthEnd = new Date(today)
          monthEnd.setHours(23, 59, 59, 999)
          calculatedRange = {
            start: monthStart,
            end: monthEnd,
          }
          console.log('📅 今月の範囲（FatigueDashboard）:', {
            start: monthStart.toISOString(),
            end: monthEnd.toISOString(),
            startFormatted: monthStart.toLocaleDateString('ja-JP'),
            endFormatted: monthEnd.toLocaleDateString('ja-JP'),
          })
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
      {/* 全画面ローディングオーバーレイ */}
      {(isLoading || isRefreshing) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-2xl p-8 flex flex-col items-center space-y-4 max-w-sm">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200"></div>
              <div className="absolute top-0 left-0 animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent"></div>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-gray-800">データを取得中...</p>
              {(dateRange === 'last_30d' || dateRange === 'last_28d') && (
                <p className="text-sm text-gray-600 mt-2">過去1ヶ月分のデータを取得しています。</p>
              )}
              {dateRange === 'last_month' && (
                <p className="text-sm text-gray-600 mt-2">先月のデータを取得しています。</p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="w-full max-w-none">
        {/* デバッグログパネル */}
        {typeof window !== 'undefined' && (window as any).DEBUG_FATIGUE && (
          <div className="bg-gray-800 text-gray-100 p-4 rounded-lg mb-4 font-mono text-xs">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-yellow-400 font-bold">🔧 Debug Logs</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    // デバッグ情報を整形して収集
                    const debugInfo = {
                      timestamp: new Date().toISOString(),
                      accounts: {
                        count: accounts.length,
                        selected: selectedAccountId || 'none',
                        list: accounts.map((a) => ({ id: a.id, name: a.name })),
                      },
                      data: {
                        count: data.length,
                        sample: data.slice(0, 3),
                      },
                      insights: {
                        count: insights.length,
                        sample: insights.slice(0, 3),
                      },
                      states: {
                        isLoading,
                        isRefreshing,
                        dataSource: dataSource || 'none',
                        error: error?.message || 'none',
                        dateRange,
                        customDateRange,
                      },
                      logs: (window as any).DEBUG_FATIGUE_LOGS || [],
                    }

                    const debugText = JSON.stringify(debugInfo, null, 2)

                    // クリップボードにコピー
                    navigator.clipboard
                      .writeText(debugText)
                      .then(() => {
                        // 成功時のフィードバック（一時的に表示を変更）
                        const button = document.getElementById('copy-debug-btn')
                        if (button) {
                          const originalText = button.textContent
                          button.textContent = '✅ Copied!'
                          button.classList.add('bg-green-600')
                          button.classList.remove('bg-purple-600')
                          setTimeout(() => {
                            button.textContent = originalText || ''
                            button.classList.remove('bg-green-600')
                            button.classList.add('bg-purple-600')
                          }, 2000)
                        }
                      })
                      .catch((err) => {
                        console.error('クリップボードへのコピーに失敗:', err)
                        alert('クリップボードへのコピーに失敗しました')
                      })
                  }}
                  id="copy-debug-btn"
                  className="px-2 py-1 bg-purple-600 hover:bg-purple-700 rounded text-xs transition-colors"
                >
                  📋 Copy to Clipboard
                </button>
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
              <div>
                📅 Date Filter: {dateFilter} | Custom Range:{' '}
                {customDateRange
                  ? `${customDateRange.start.toLocaleDateString()} - ${customDateRange.end.toLocaleDateString()}`
                  : 'none'}
              </div>
              <div className="text-yellow-300">
                💡 To enable debug mode: window.DEBUG_FATIGUE = true
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>

          <div className="flex items-center gap-4">
            {/* アカウント選択 */}
            <AccountSelector
              accounts={accounts}
              selectedAccountId={selectedAccountId}
              onSelect={onAccountSelect}
              isLoading={isLoadingAccounts}
            />

            {/* レート制限状態の表示 */}
            {selectedAccountId && isRateLimited && (
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
          </div>
        </div>

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
                ? { label: 'Meta API設定を開く', href: '/settings/meta-api' }
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
                {/* データ取得情報 */}
                {dataSource && (
                  <div className="mb-2 text-sm text-gray-600 px-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs">
                        取得件数: <span className="font-medium">{data.length}件</span>
                      </span>
                      <span className="text-xs text-gray-400">|</span>
                      <span className="text-xs">
                        データソース: {dataSource === 'cache' ? 'キャッシュ' : 'Meta API'}
                      </span>
                      <span className="text-xs text-gray-400">|</span>
                      <span className="text-xs">最終更新: {formatDateTime(lastUpdateTime)}</span>
                    </div>
                  </div>
                )}

                {/* 日付フィルター */}
                <div className="mb-4 bg-white rounded-lg shadow-sm border px-4 py-2">
                  <div className="flex items-center justify-between">
                    <DateRangeFilter
                      value={dateRange}
                      onChange={onDateRangeChange}
                      customDateRange={customDateRange}
                      onCustomDateRange={onCustomDateRange}
                      isLoading={isLoading || isRefreshing}
                    />
                    <button
                      onClick={() => {
                        // 現在のタブに応じてエクスポート
                        if (activeTab === 'creative-table') {
                          // クリエイティブタブの場合は生データをエクスポート
                          downloadCSV(data)
                        } else {
                          // キャンペーンまたは広告セットタブの場合は集計データをエクスポート
                          const aggregatedData =
                            activeTab === 'campaign'
                              ? levelAggregatedData.campaign
                              : levelAggregatedData.adset
                          downloadAggregatedCSV(aggregatedData, activeTab as 'campaign' | 'adset')
                        }
                      }}
                      className="px-3 py-1.5 h-[32px] bg-green-600 text-white text-xs rounded-md hover:bg-green-700 transition-colors flex items-center justify-center gap-1"
                    >
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      エクスポート
                    </button>
                  </div>
                </div>

                {/* データ表示エリア */}
                {data.length > 0 ? (
                  <div className="relative">
                    <Tabs
                      defaultValue="campaign"
                      className="w-full"
                      onValueChange={(value) => setActiveTab(value)}
                    >
                      <TabsList className="grid w-full grid-cols-3 mb-6">
                        <TabsTrigger value="campaign">キャンペーン</TabsTrigger>
                        <TabsTrigger value="adset">広告セット</TabsTrigger>
                        <TabsTrigger value="creative-table">クリエイティブ</TabsTrigger>
                      </TabsList>

                      <TabsContent value="creative-table">
                        <CreativeTableTab
                          data={data}
                          insights={insights}
                          selectedAccountId={selectedAccountId}
                          isLoading={isLoading}
                          accessToken={accessToken}
                          dateRange={effectiveDateRange || undefined}
                        />
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
                            type: typeof effectiveDateRange,
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
    </div>
  )
}
