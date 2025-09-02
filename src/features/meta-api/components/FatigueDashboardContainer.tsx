import { useState, useEffect, useCallback } from 'react'
import { useConvex } from 'convex/react'
import { useAdFatigue } from '../hooks/useAdFatigue'
import { useAdFatigueWithAggregation } from '../hooks/useAdFatigueWithAggregation'
import { SimpleAccountStore } from '../account/account-store'
import { FatigueDashboardPresentation } from './FatigueDashboardPresentation'
import { MetaAccount } from '@/types'
import type { DateRangeFilter } from '../hooks/useAdFatigueSimplified'
import { DEFAULT_SIMPLIFIED_CONFIG } from '../types/aggregation-config'
import { ThreeLayerCache } from '../core/three-layer-cache'

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
  // TASK-102: SimplifiedAggregationConfig使用による常時集約有効化
  const enableAggregation = DEFAULT_SIMPLIFIED_CONFIG.alwaysEnabled
  const [filteredData, setFilteredData] = useState<any>(null) // フィルター済みデータ
  const [cacheLayerUsed, setCacheLayerUsed] = useState<string | null>(null) // 使用されたキャッシュ層

  // 3層キャッシュシステムのインスタンス
  const [cacheSystem] = useState(() => new ThreeLayerCache(convex))

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

  // 集約機能付き疲労度データの取得
  const {
    data,
    insights,
    isLoading,
    isRefreshing,
    error,
    refetch,
    dataSource,
    lastUpdateTime,
    progress,
    totalInsights,
    filteredCount,
    // 集約関連の新しいプロパティ
    aggregatedData,
    isAggregating,
    aggregationError,
    aggregationMetrics,
  } = useAdFatigueWithAggregation({
    accountId: selectedAccountId || '',
    dateRange,
    enableAggregation,
    aggregationOptions: {
      includePlatformBreakdown: DEFAULT_SIMPLIFIED_CONFIG.includePlatformBreakdown,
      includeDailyBreakdown: DEFAULT_SIMPLIFIED_CONFIG.includeDailyBreakdown,
    },
  })

  // アカウント選択ハンドラ
  const handleAccountSelect = async (accountId: string) => {
    setSelectedAccountId(accountId)
    const store = new SimpleAccountStore(convex)
    await store.setActiveAccount(accountId)
  }

  // 3層キャッシュを使用した強化されたリフレッシュ関数
  const enhancedRefetch = useCallback(
    async (options?: { clearCache?: boolean }) => {
      if (!selectedAccountId) {
        console.warn('No account selected for data refresh')
        return
      }

      try {
        console.log('🚀 3層キャッシュシステムでデータ更新開始', {
          accountId: selectedAccountId,
          dateRange,
          clearCache: options?.clearCache,
        })

        // キャッシュクリアオプション
        if (options?.clearCache) {
          await cacheSystem.clearAll()
        }

        // 選択されたアカウントの情報を取得
        const selectedAccount = accounts.find((acc) => acc.accountId === selectedAccountId)
        if (!selectedAccount?.accessToken) {
          throw new Error('Access token not found for selected account')
        }

        // APIクライアントにアクセストークンを設定
        cacheSystem.setAccessToken(selectedAccount.accessToken)

        // データ鮮度を評価
        const currentData = data || []
        const freshnessManager = cacheSystem.getFreshnessManager()
        const freshnessState = freshnessManager.evaluateFreshness(currentData, {
          accountId: selectedAccountId,
          dateRange,
          lastFetched: lastUpdateTime || undefined,
        })

        // 差分更新プランを作成
        const updateEngine = cacheSystem.getUpdateEngine()
        const updatePlan = updateEngine.createUpdatePlan(currentData, {
          accountId: selectedAccountId,
          dateRange,
          freshnessState,
        })

        console.log('📊 更新プラン:', {
          strategy: updatePlan.strategy,
          estimatedApiCalls: updatePlan.estimatedApiCalls,
          priority: updatePlan.priority,
        })

        // 3層キャッシュからデータを取得
        const cacheKey = `${selectedAccountId}_${dateRange}`
        const result = await cacheSystem.get(cacheKey, {
          forceRefresh: options?.clearCache,
        })

        // 使用されたキャッシュ層を記録
        setCacheLayerUsed(result.source)

        if (result.source === 'L3') {
          console.log('✅ Meta APIから最新データを取得')
        } else if (result.source !== 'miss') {
          console.log(`✅ ${result.source}キャッシュからデータを取得`)
        }

        // キャッシュ統計を表示
        const stats = cacheSystem.getStats()
        console.log('📊 キャッシュ統計:', {
          hitRate: `${stats.overallHitRate.toFixed(1)}%`,
          totalKeys: stats.totalKeys,
          memorySize: stats.memorySize,
        })

        // 既存のrefetch関数も呼び出して状態を更新
        await refetch(options)
      } catch (error) {
        console.error('❌ データ更新エラー:', error)
        throw error
      }
    },
    [selectedAccountId, accounts, dateRange, data, lastUpdateTime, cacheSystem, refetch]
  )

  // 表示するデータを決定（フィルター > 集約 > 元データ）
  // filteredDataが配列でない場合はnullとして扱う
  const displayData = Array.isArray(filteredData)
    ? filteredData
    : (enableAggregation && aggregatedData ? aggregatedData : data) || []

  return (
    <FatigueDashboardPresentation
      // アカウント関連
      accounts={accounts}
      selectedAccountId={selectedAccountId}
      isLoadingAccounts={isLoadingAccounts}
      onAccountSelect={handleAccountSelect}
      // データ関連（フィルター済みまたは集約データを使用）
      data={displayData}
      insights={insights}
      isLoading={isLoading || isAggregating}
      isRefreshing={isRefreshing}
      error={error || aggregationError}
      // アクション (3層キャッシュ統合版を使用)
      onRefresh={enhancedRefetch}
      // メタ情報
      dataSource={dataSource}
      lastUpdateTime={lastUpdateTime}
      // 進捗情報
      progress={progress}
      // フィルター関連
      dateRange={dateRange}
      onDateRangeChange={setDateRange}
      totalInsights={totalInsights}
      filteredCount={filteredCount}
      // 集約関連の新しいプロパティ
      enableAggregation={enableAggregation}
      // onToggleAggregationは削除（常に集約有効のため不要）
      aggregatedData={aggregatedData}
      aggregationMetrics={aggregationMetrics}
      isAggregating={isAggregating}
      // フィルター関連
      onFilterChange={setFilteredData}
      sourceData={(enableAggregation && aggregatedData ? aggregatedData : data) || []}
      // 3層キャッシュ情報
      cacheLayerUsed={cacheLayerUsed}
    />
  )
}
