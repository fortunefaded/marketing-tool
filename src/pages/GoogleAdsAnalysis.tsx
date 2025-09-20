import { useState, useEffect, useCallback, useRef } from 'react'
import { useAction, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { GoogleAdsDailyCharts } from '../components/dashboard/GoogleAdsDailyCharts'
import { GoogleAdsAccountSelector } from '../components/GoogleAdsAccountSelector'
import { IntegratedDashboard } from '../components/dashboard/IntegratedDashboard'
import { MonthlySummaryTable } from '../components/dashboard/MonthlySummaryTable'
import { FatigueDashboardPresentation } from '../features/meta-api/components/FatigueDashboardPresentation'
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns'

type DateRangeType = 'last_7d' | 'last_14d' | 'last_28d' | 'last_30d' | 'last_month' | 'last_90d' | 'today' | 'yesterday' | 'this_week' | 'last_week' | 'this_month' | 'custom'

interface GoogleAdsAccount {
  id: string
  accountId: string
  fullAccountId: string
  name: string
  accessToken: string
  isActive: boolean
  createdAt: Date
  currency?: string
  timezone?: string
  lastUsedAt?: Date
}

export function GoogleAdsAnalysis() {
  const [data, setData] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true)
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null)
  const [dateRange, setDateRange] = useState<DateRangeType>('last_7d')
  const [customDateRange, setCustomDateRange] = useState<{ start: Date; end: Date } | null>(null)
  const fetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Google Ads設定とアクション
  const config = useQuery(api.googleAds.getConfig)
  const fetchPerformanceDataAction = useAction(api.googleAds.fetchPerformanceData)
  const getCostSummaryAction = useAction(api.googleAds.getCostSummary)

  // Google Adsアカウント情報を設定から作成
  const accounts: GoogleAdsAccount[] = config ? [{
    id: config.customerId || '',
    accountId: config.customerId || '',
    fullAccountId: config.customerId || '',
    name: config.customerName || 'Google Ads Account',
    accessToken: config.accessToken || '',
    isActive: config.isConnected || false,
    createdAt: new Date(config.createdAt || Date.now()),
    currency: config.currency || 'JPY',
    timezone: config.timezone || 'Asia/Tokyo',
    lastUsedAt: config.lastUsedAt ? new Date(config.lastUsedAt) : undefined
  }] : []

  // 日付範囲を文字列形式に変換
  const getDateRangeStrings = useCallback(() => {
    const today = new Date()
    let start: Date
    let end: Date

    switch (dateRange) {
      case 'today':
        start = new Date(today)
        start.setHours(0, 0, 0, 0)
        end = new Date(today)
        end.setHours(23, 59, 59, 999)
        break
      case 'yesterday':
        start = new Date(today)
        start.setDate(start.getDate() - 1)
        start.setHours(0, 0, 0, 0)
        end = new Date(today)
        end.setDate(end.getDate() - 1)
        end.setHours(23, 59, 59, 999)
        break
      case 'last_7d':
        start = subDays(today, 7)
        end = subDays(today, 1)
        break
      case 'last_14d':
        start = subDays(today, 14)
        end = subDays(today, 1)
        break
      case 'last_28d':
        start = subDays(today, 28)
        end = subDays(today, 1)
        break
      case 'last_30d':
        start = subDays(today, 30)
        end = subDays(today, 1)
        break
      case 'this_month':
        start = startOfMonth(today)
        end = today
        break
      case 'last_month':
        const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
        start = startOfMonth(lastMonth)
        end = endOfMonth(lastMonth)
        break
      case 'this_week':
        const dayOfWeek = today.getDay()
        start = new Date(today)
        start.setDate(today.getDate() - dayOfWeek)
        start.setHours(0, 0, 0, 0)
        end = today
        break
      case 'last_week':
        const currentDay = today.getDay()
        end = new Date(today)
        end.setDate(today.getDate() - currentDay - 1)
        end.setHours(23, 59, 59, 999)
        start = new Date(end)
        start.setDate(end.getDate() - 6)
        start.setHours(0, 0, 0, 0)
        break
      case 'last_90d':
        start = subDays(today, 90)
        end = subDays(today, 1)
        break
      case 'custom':
        if (customDateRange) {
          start = customDateRange.start
          end = customDateRange.end
        } else {
          start = subDays(today, 7)
          end = subDays(today, 1)
        }
        break
      default:
        start = subDays(today, 7)
        end = subDays(today, 1)
    }

    return {
      startDate: format(start, 'yyyy-MM-dd'),
      endDate: format(end, 'yyyy-MM-dd'),
      start,
      end
    }
  }, [dateRange, customDateRange])

  // Google Ads APIからデータを取得
  const fetchDataFromGoogleAdsAPI = useCallback(
    async (forceRefresh: boolean = false) => {
      if (!config?.isConnected) {
        setError('Google Ads APIが接続されていません。設定画面から接続してください。')
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const { startDate, endDate } = getDateRangeStrings()

        // パフォーマンスデータを取得
        await fetchPerformanceDataAction({ startDate, endDate })

        // コストサマリーを取得
        const costSummary = await getCostSummaryAction({ startDate, endDate })

        // データを変換してセット
        const formattedData = (costSummary || []).map((item: any) => ({
          ...item,
          date: item.date,
          campaignName: item.campaignName || 'Unknown Campaign',
          impressions: item.impressions || 0,
          clicks: item.clicks || 0,
          cost: item.cost || 0,
          conversions: item.conversions || 0,
          conversionValue: item.conversionValue || 0,
          ctr: item.impressions > 0 ? (item.clicks / item.impressions * 100) : 0,
          cpc: item.clicks > 0 ? (item.cost / item.clicks) : 0,
          cpa: item.conversions > 0 ? (item.cost / item.conversions) : 0,
        }))

        setData(formattedData)
        setLastUpdateTime(new Date())
      } catch (err: any) {
        console.error('❌ Google Ads データ取得エラー:', err)
        setError(err.message || 'データ取得中にエラーが発生しました')
      } finally {
        setIsLoading(false)
      }
    },
    [config, fetchPerformanceDataAction, getCostSummaryAction, getDateRangeStrings]
  )

  // 初回ロード
  useEffect(() => {
    if (config) {
      setIsLoadingAccounts(false)
      if (config.customerId) {
        setSelectedAccountId(config.customerId)
      }
      if (config.isConnected) {
        fetchDataFromGoogleAdsAPI()
      }
    }
  }, [config])

  // 日付範囲変更時のデータ取得
  useEffect(() => {
    if (selectedAccountId && config?.isConnected) {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current)
      }

      fetchTimeoutRef.current = setTimeout(() => {
        fetchDataFromGoogleAdsAPI()
      }, 300)
    }

    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current)
      }
    }
  }, [dateRange, customDateRange, selectedAccountId])

  // アカウント選択ハンドラー
  const handleAccountSelect = (accountId: string) => {
    setSelectedAccountId(accountId)
  }

  // リフレッシュハンドラー
  const handleRefresh = async () => {
    await fetchDataFromGoogleAdsAPI(true)
  }

  // ECForceダータ（Google Ads版では空配列）
  const ecforceData: any[] = []

  // 月次サマリー用のダミーデータ
  const monthlySummaries: any[] = []

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="px-4 py-2">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold text-gray-900">Google Ads Analysis</h1>
            <div className="flex items-center gap-4">
              <GoogleAdsAccountSelector
                accounts={accounts}
                selectedAccountId={selectedAccountId}
                onSelect={handleAccountSelect}
                isLoading={isLoadingAccounts}
              />
              {config && !config.isConnected && (
                <a
                  href="/settings/google-ads"
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                >
                  Google Ads APIを接続
                </a>
              )}
              {lastUpdateTime && (
                <span className="text-xs text-gray-500">
                  最終更新: {lastUpdateTime.toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div>
        {/* エラー表示 */}
        {error && (
          <div className="px-4 py-4">
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              <div className="font-medium">エラー</div>
              <div className="text-sm mt-1">{error}</div>
            </div>
          </div>
        )}

        {/* 日別グラフと統合ダッシュボード */}
        {selectedAccountId && (
          <div className="px-4 py-4 space-y-4">
            {/* Google Ads日別チャート */}
            <GoogleAdsDailyCharts
              accountId={selectedAccountId}
              dateRange={(() => {
                const { start, end } = getDateRangeStrings()
                return {
                  start: format(start, 'yyyy-MM-dd'),
                  end: format(end, 'yyyy-MM-dd')
                }
              })()}
            />

            {/* 統合ダッシュボード */}
            <IntegratedDashboard
              metaData={data}
              ecforceData={ecforceData}
              dateRange={(() => {
                const { start, end } = getDateRangeStrings()
                return {
                  start: format(start, 'yyyy-MM-dd'),
                  end: format(end, 'yyyy-MM-dd')
                }
              })()}
              selectedAccountId={selectedAccountId}
            />

            {/* 月次サマリー（データがある場合のみ） */}
            {monthlySummaries.length > 0 && (
              <MonthlySummaryTable
                summaries={monthlySummaries}
                onRefresh={async () => {
                  await handleRefresh()
                }}
              />
            )}
          </div>
        )}

        {/* FatigueDashboardPresentation（テーブル表示） */}
        <div className="px-4">
          <FatigueDashboardPresentation
            // アカウント関連
            accounts={accounts as any}
            selectedAccountId={selectedAccountId}
            isLoadingAccounts={isLoadingAccounts}
            onAccountSelect={handleAccountSelect}
            // データ関連
            data={data}
            insights={data}
            ecforceData={ecforceData}
            isLoading={isLoading}
            isRefreshing={false}
            error={error ? new Error(error) : null}
            // アクション
            onRefresh={handleRefresh}
            // メタ情報
            dataSource={data.length > 0 ? 'api' : null}
            lastUpdateTime={lastUpdateTime}
            // 日付範囲
            dateRange={dateRange}
            onDateRangeChange={(range) => setDateRange(range)}
            customDateRange={customDateRange}
            // 認証情報
            accessToken={config?.accessToken}
            onCustomDateRange={(start, end) => {
              setCustomDateRange({ start, end })
              setDateRange('custom')
            }}
            // 進捗情報
            progress={undefined}
            // フィルター関連
            totalInsights={data.length}
            filteredCount={data.length}
            // 集約関連
            enableAggregation={true}
            aggregatedData={undefined}
            aggregationMetrics={undefined}
            isAggregating={false}
            onFilterChange={() => {}}
            sourceData={data}
          />
        </div>
      </div>
    </div>
  )
}