import { useState, useEffect, useCallback } from 'react'
import { useConvex } from 'convex/react'
import { SimpleAccountStore } from '../account/account-store'
import { FatigueDashboardPresentation } from './FatigueDashboardPresentation'
import { MetaAccount } from '@/types'
import { ThreeLayerCache } from '../core/three-layer-cache'
// import { api } from '../../../../convex/_generated/api' - 未使用

// 日付範囲の型定義（シンプル化）
export type DateRangeFilter = 'last_7d' | 'last_14d' | 'last_30d' | 'last_month' | 'last_90d' | 'all'

/**
 * FatigueDashboard のコンテナコンポーネント
 * 責務: ビジネスロジックと状態管理
 */
export function FatigueDashboardContainer() {
  const convex = useConvex()
  const [accounts, setAccounts] = useState<MetaAccount[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true)
  const [dateRange, setDateRange] = useState<DateRangeFilter>('last_30d')
  const [filteredData, setFilteredData] = useState<any>(null)
  const [cacheLayerUsed, setCacheLayerUsed] = useState<string | null>(null)

  // 3層キャッシュシステム
  const [cacheSystem] = useState(() => new ThreeLayerCache(convex))

  // データ管理
  const [data, setData] = useState<any>(null)
  const [insights, setInsights] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [dataSource, setDataSource] = useState<'cache' | 'api' | null>(null)
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null)

  // 同期結果の管理
  const [syncResult, setSyncResult] = useState<{
    added: number
    updated: number
    unchanged: number
    total: number
    source?: string
  } | null>(null)
  const [showSyncResult, setShowSyncResult] = useState(false)

  // エラーメッセージの管理
  const [errorMessages, setErrorMessages] = useState<string[]>([])

  // アカウント読み込み
  useEffect(() => {
    const loadAccounts = async () => {
      setIsLoadingAccounts(true)
      const store = new SimpleAccountStore(convex)
      const accountsList = await store.getAccounts()
      setAccounts(accountsList)

      const activeAccount = await store.getActiveAccount()
      if (activeAccount) {
        setSelectedAccountId(activeAccount.accountId)
      } else if (accountsList.length > 0) {
        setSelectedAccountId(accountsList[0].accountId)
      }

      setIsLoadingAccounts(false)
    }

    loadAccounts()
  }, [convex])

  // 削除：旧実装のフック呼び出しは不要

  // データ取得（forceRefreshで同期結果を返す）
  const fetchData = useCallback(
    async (options?: { forceRefresh?: boolean }) => {
      if (!selectedAccountId) return

      setIsLoading(true)
      setError(null)
      setShowSyncResult(false)

      try {
        console.log('🚀 [新実装] データ取得開始', {
          accountId: selectedAccountId,
          dateRange,
          forceRefresh: options?.forceRefresh,
        })

        // アクセストークンの設定
        const selectedAccount = accounts.find((acc) => acc.accountId === selectedAccountId)
        if (selectedAccount?.accessToken) {
          cacheSystem.setAccessToken(selectedAccount.accessToken)
        }

        // 既存データを保持（差分計算用）
        // const oldData = data || [] - 未使用

        // キャッシュキーの生成
        const accountIdForKey = selectedAccountId.startsWith('act_')
          ? selectedAccountId
          : `act_${selectedAccountId}`
        const cacheKey = `${accountIdForKey}_${dateRange}`

        let result: any

        if (options?.forceRefresh) {
          // 強制リフレッシュの場合（weekly-syncと同じ方式）
          console.log('🔄 強制リフレッシュ: Meta APIから最新データを取得して差分を計算')

          // 1. 【最適化】既存データ取得を削除（Bandwidth削減のため）
          console.log('📊 差分計算をスキップ（Bandwidth削減）')
          const existingByKey = new Map() // 空のマップ（全てを新規として扱う）
          console.log('📊 既存データ: 0件（スキップ）')

          // 2. Meta APIから最新データを取得
          // 日付範囲の設定（過去7日間）
          const endDate = new Date()
          const startDate = new Date()
          startDate.setDate(startDate.getDate() - 7)

          const apiOptions = {
            level: 'ad',
            time_increment: '1',
            since: formatDate(startDate),
            until: formatDate(endDate),
            fields: [
              'ad_id',
              'ad_name',
              'campaign_id',
              'campaign_name',
              'adset_id',
              'adset_name',
              'impressions',
              'clicks',
              'spend',
              'ctr',
              'cpm',
              'cpc',
              'frequency',
              'reach',
              'conversions',
              'conversion_values',
              'cost_per_conversion',
              'date_start',
              'date_stop',
            ],
          }

          console.log('🔄 Meta APIから過去7日間のデータを取得中...')
          result = await cacheSystem.fetchFromApi(
            selectedAccountId.replace('act_', ''),
            'custom',
            apiOptions
          )

          if (result.data && Array.isArray(result.data)) {
            console.log(`✅ Meta APIから${result.data.length}件取得`)

            // 3. 差分を計算
            let added = 0
            let updated = 0
            let unchanged = 0

            result.data.forEach((newRecord: any) => {
              const key = `${newRecord.ad_id}_${newRecord.date_start}`
              const existingRecord = existingByKey.get(key)

              if (!existingRecord) {
                added++
              } else {
                // 重要なメトリクスの変更をチェック
                const fieldsToCompare = ['impressions', 'clicks', 'spend', 'ctr', 'conversions']
                let hasChanges = false

                for (const field of fieldsToCompare) {
                  const oldVal = parseFloat(existingRecord[field]) || 0
                  const newVal = parseFloat(newRecord[field]) || 0

                  if (Math.abs(oldVal - newVal) > 0.01) {
                    hasChanges = true
                    break
                  }
                }

                if (hasChanges) {
                  updated++
                } else {
                  unchanged++
                }
              }
            })

            // 4. 同期結果を設定
            const syncResultData = {
              added,
              updated,
              unchanged,
              total: result.data.length,
              source: 'L3',
            }

            setSyncResult(syncResultData)
            setShowSyncResult(true)
            console.log('✅ 同期結果:', syncResultData)

            // 5. Convexに保存（weekly-syncと同じ方式）
            if (result.data.length > 0) {
              console.log('💾 Convexにデータを保存中...')
              await cacheSystem.set(cacheKey, result.data)
            }
          }
        } else {
          // 通常のキャッシュシステムから取得
          result = await cacheSystem.get(cacheKey, {
            forceRefresh: false,
          })
        }

        console.log('📊 データ取得完了', {
          source: result.source,
          dataCount: result.data?.length || 0,
          cacheHit: result.source !== 'L3',
          timestamp: new Date().toISOString(),
          hasData: !!result.data,
          dataPreview: result.data?.slice(0, 2) // 最初の2件だけプレビュー
        })

        // 通常のキャッシュ取得時は同期結果を表示しない（forceRefresh時のみ表示）
        // forceRefreshの場合は上記で既に処理済み

        // 状態を更新
        setData(result.data || [])
        setInsights(result.data || [])
        setDataSource(result.source as 'cache' | 'api' | null)
        setLastUpdateTime(new Date())
        setCacheLayerUsed(result.source)

        // 既知の警告を追加（8月1-2日のデータ欠落）
        if (result.data && result.data.length > 0) {
          const hasAug1 = result.data.some((d: any) => d.date_start === '2025-08-01')
          const hasAug2 = result.data.some((d: any) => d.date_start === '2025-08-02')

          if (!hasAug1 || !hasAug2) {
            const missingDates = []
            if (!hasAug1) missingDates.push('2025-08-01')
            if (!hasAug2) missingDates.push('2025-08-02')

            setErrorMessages((prev) => [
              ...prev,
              `${new Date().toLocaleTimeString()}: ⚠️ 以下の日付のデータが取得できませんでした: ${missingDates.join(', ')}`,
            ])
          }
        }
      } catch (error) {
        console.error('❌ [新実装] データ取得エラー:', error)
        setError(error as Error)

        // エラーメッセージを追加
        const errorMsg =
          error instanceof Error ? error.message : 'データ取得中にエラーが発生しました'
        setErrorMessages((prev) => [...prev, `${new Date().toLocaleTimeString()}: ${errorMsg}`])
      } finally {
        setIsLoading(false)
      }
    },
    [selectedAccountId, dateRange, accounts, cacheSystem]
  ) // dataを削除（無限ループ防止）

  // 日付フォーマット用のヘルパー関数
  const formatDate = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // データ取得（アカウントor日付範囲変更時）
  useEffect(() => {
    if (selectedAccountId) {
      fetchData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAccountId, dateRange]) // fetchDataは意図的に除外（無限ループ防止）

  // アカウント選択ハンドラ
  const handleAccountSelect = async (accountId: string) => {
    setSelectedAccountId(accountId)
    const store = new SimpleAccountStore(convex)
    await store.setActiveAccount(accountId)
  }

  // リフレッシュ関数（強制的にAPIから取得して同期結果を表示）
  const refetch = useCallback(
    async (options?: { clearCache?: boolean }) => {
      console.log('🔄 refetch called with options:', options)
      if (options?.clearCache) {
        await cacheSystem.clearAll()
      }
      // forceRefresh=trueで強制的にL3（API）から取得
      console.log('🚀 Calling fetchData with forceRefresh=true')
      await fetchData({ forceRefresh: true })
    },
    [cacheSystem, fetchData]
  )

  // 表示するデータを決定
  const displayData = Array.isArray(filteredData) ? filteredData : data || []

  return (
    <>
      {/* エラー/警告メッセージの表示 */}
      {errorMessages.length > 0 && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start justify-between">
            <div className="w-full">
              <h3 className="font-semibold text-red-900 mb-2">⚠️ エラー/警告</h3>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {errorMessages.map((msg, index) => (
                  <div key={index} className="text-sm text-red-700">
                    {msg}
                  </div>
                ))}
              </div>
            </div>
            <button
              onClick={() => setErrorMessages([])}
              className="text-gray-400 hover:text-gray-600 text-xl ml-4"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* 同期結果の表示 */}
      {showSyncResult && syncResult && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="w-full">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-semibold text-blue-900">✨ データ同期完了</h3>
                <span className="text-xs text-gray-500">(ソース: {syncResult.source})</span>
              </div>
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-green-600 font-semibold">新規: {syncResult.added}件</span>
                </div>
                <div>
                  <span className="text-blue-600 font-semibold">更新: {syncResult.updated}件</span>
                </div>
                <div>
                  <span className="text-gray-600">変更なし: {syncResult.unchanged}件</span>
                </div>
                <div>
                  <span className="font-semibold">合計: {syncResult.total}件</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowSyncResult(false)}
              className="text-gray-400 hover:text-gray-600 text-xl"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <FatigueDashboardPresentation
        // アカウント関連
        accounts={accounts}
        selectedAccountId={selectedAccountId}
        isLoadingAccounts={isLoadingAccounts}
        onAccountSelect={handleAccountSelect}
        // データ関連
        data={displayData}
        insights={insights || []}
        isLoading={isLoading}
        isRefreshing={false}
        error={error}
        // アクション
        onRefresh={refetch}
        // メタ情報
        dataSource={dataSource}
        lastUpdateTime={lastUpdateTime}
        // 進捗情報
        progress={undefined}
        // フィルター関連
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        totalInsights={insights?.length || 0}
        filteredCount={displayData?.length || 0}
        // 集約関連（シンプル化のため無効化）
        enableAggregation={false}
        aggregatedData={null}
        aggregationMetrics={undefined}
        isAggregating={false}
        // フィルター関連
        onFilterChange={setFilteredData}
        sourceData={data || []}
        // 3層キャッシュ情報
        cacheLayerUsed={cacheLayerUsed}
      />
    </>
  )
}
