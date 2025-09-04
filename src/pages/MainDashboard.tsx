import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useConvex } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { FatigueDashboardPresentation } from '../features/meta-api/components/FatigueDashboardPresentation'
import { MetaAccount } from '@/types'
import {
  saveSelectedAccount,
  getSelectedAccount,
  saveCachedData,
  getCachedData,
  clearCachedData,
  saveDateRange,
  getDateRange,
} from '@/utils/localStorage'
import { extractConversions } from '@/utils/conversionHelpers'

export default function MainDashboard() {
  const convex = useConvex()
  const [data, setData] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [accounts, setAccounts] = useState<MetaAccount[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true)
  const [dateRange, setDateRange] = useState<
    'last_7d' | 'last_14d' | 'last_30d' | 'last_month' | 'last_90d' | 'all' | 'custom'
  >('last_7d')
  const [customDateRange, setCustomDateRange] = useState<{ start: Date; end: Date } | null>(null)
  const [filteredData, setFilteredData] = useState<any>(null)
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null)
  const [dailyDataCache, setDailyDataCache] = useState<Record<string, any>>({}) // 日別データのキャッシュ
  const [cacheAge, setCacheAge] = useState<number>(Infinity) // キャッシュの経過時間

  // Convexからアカウント情報を取得
  const loadAccountsFromConvex = useCallback(async () => {
    try {
      setIsLoadingAccounts(true)
      console.log('📱 Convexからアカウント情報を取得中...')

      // Convexからアカウント情報を取得
      const convexAccounts = await convex.query(api.metaAccounts.getAccounts)

      if (!convexAccounts || convexAccounts.length === 0) {
        throw new Error(
          'アカウントが登録されていません。設定画面からアカウントを接続してください。'
        )
      }

      // MetaAccount型に変換
      const formattedAccounts: MetaAccount[] = convexAccounts.map((acc: any) => ({
        accountId: acc.accountId,
        accountName: acc.accountName,
        accessToken: acc.accessToken,
        isActive: acc.isActive || false,
      }))

      setAccounts(formattedAccounts)

      // 保存されたアカウントIDを復元、なければアクティブなアカウントを探す
      const savedAccountId = getSelectedAccount()
      const savedAccount = savedAccountId
        ? formattedAccounts.find((acc) => acc.accountId === savedAccountId)
        : null

      const accountToUse =
        savedAccount || formattedAccounts.find((acc) => acc.isActive) || formattedAccounts[0]

      setSelectedAccountId(accountToUse.accountId)
      saveSelectedAccount(accountToUse.accountId) // 選択を保存

      console.log('✅ アカウント情報取得完了:', accountToUse.accountId)
      return accountToUse
    } catch (err: any) {
      console.error('❌ アカウント情報取得エラー:', err)
      setError(err.message)
      throw err
    } finally {
      setIsLoadingAccounts(false)
    }
  }, [convex])

  // Meta APIから過去7日分のデータを直接取得
  const fetchDataFromMetaAPI = useCallback(
    async (
      accountId?: string | null,
      forceRefresh: boolean = false,
      customRange?: { start: Date; end: Date } | null
    ) => {
      if (!accountId && !selectedAccountId) {
        console.log('アカウントIDが設定されていません')
        return
      }

      const targetAccountId = accountId || selectedAccountId
      const account = accounts.find((acc) => acc.accountId === targetAccountId)

      if (!account) {
        console.log('アカウント情報が見つかりません')
        return
      }

      // キャッシュチェック（強制リフレッシュでない場合）
      if (!forceRefresh) {
        // 日付範囲を含めたキャッシュキー（カスタムの場合は日付を含める）
        const effectiveRange = customRange || customDateRange
        const cacheKey =
          dateRange === 'custom' && effectiveRange
            ? `${targetAccountId}_custom_${effectiveRange.start.toISOString().split('T')[0]}_${effectiveRange.end.toISOString().split('T')[0]}`
            : `${targetAccountId}_${dateRange}`
        const { data: cachedData, age } = getCachedData(cacheKey)

        if (cachedData) {
          // 30分以内ならキャッシュを使用
          if (age < 30 * 60 * 1000) {
            console.log('💾 キャッシュを使用（' + Math.floor(age / 1000) + '秒前）', { dateRange })
            setCacheAge(age)

            // キャッシュデータも数値型に変換
            const formattedCachedData = (cachedData || []).map((item: any) => ({
              ...item,
              impressions: parseInt(item.impressions) || 0,
              clicks: parseInt(item.clicks) || 0,
              spend: parseFloat(item.spend) || 0,
              ctr: parseFloat(item.ctr) || 0,
              cpm: parseFloat(item.cpm) || 0,
              cpc: parseFloat(item.cpc) || 0,
              frequency: parseFloat(item.frequency) || 0,
              reach: parseInt(item.reach) || 0,
              conversions: item.conversions ? parseInt(item.conversions) : 0,
              conversion_values: item.conversion_values ? parseFloat(item.conversion_values) : 0,
              cost_per_conversion: item.cost_per_conversion
                ? parseFloat(item.cost_per_conversion)
                : 0,
              status: item.status || 'normal',
              fatigueScore: item.fatigueScore || 0,
            }))

            setData(formattedCachedData)
            // タイムスタンプから最終更新時刻を計算
            setLastUpdateTime(new Date(Date.now() - age))
            return
          }
        }
      }

      setIsLoading(true)
      setError(null)

      try {
        console.log('📊 Meta APIからデータを取得開始')

        if (!account.accessToken) {
          throw new Error('アクセストークンが見つかりません')
        }

        // 日付範囲を計算
        const endDate = new Date()
        const startDate = new Date()

        // dateRangeに応じて期間を設定
        console.log('📅 fetchDataFromMetaAPI: Setting date range', {
          dateRange,
          hasCustomDateRange: !!customDateRange,
          hasCustomRange: !!customRange,
          customDateRange: customDateRange
            ? {
                start: customDateRange.start.toISOString(),
                end: customDateRange.end.toISOString(),
              }
            : null,
          customRange: customRange
            ? {
                start: customRange.start.toISOString(),
                end: customRange.end.toISOString(),
              }
            : null,
        })

        const effectiveCustomRange = customRange || customDateRange
        if (dateRange === 'custom' && effectiveCustomRange) {
          // カスタム日付範囲を使用
          startDate.setTime(effectiveCustomRange.start.getTime())
          endDate.setTime(effectiveCustomRange.end.getTime())
          console.log('📅 Using custom date range:', {
            start: startDate.toISOString(),
            end: endDate.toISOString(),
            source: customRange ? 'argument' : 'state',
          })
        } else {
          // プリセット範囲を使用
          switch (dateRange) {
            case 'last_7d':
              startDate.setDate(startDate.getDate() - 7)
              break
            case 'last_14d':
              startDate.setDate(startDate.getDate() - 14)
              break
            case 'last_30d':
              startDate.setDate(startDate.getDate() - 30)
              break
            case 'last_month': {
              // 先月の初日から最終日
              const now = new Date()
              startDate.setFullYear(now.getFullYear(), now.getMonth() - 1, 1)
              endDate.setFullYear(now.getFullYear(), now.getMonth(), 0)
              break
            }
            case 'last_90d':
              startDate.setDate(startDate.getDate() - 90)
              break
            case 'all':
              startDate.setDate(startDate.getDate() - 365)
              break
          }
        }

        const formatDate = (date: Date) => {
          const year = date.getFullYear()
          const month = String(date.getMonth() + 1).padStart(2, '0')
          const day = String(date.getDate()).padStart(2, '0')
          return `${year}-${month}-${day}`
        }

        // Meta API URL構築
        const baseUrl = 'https://graph.facebook.com/v23.0'
        const cleanAccountId = account.accountId.replace('act_', '')
        const url = new URL(`${baseUrl}/act_${cleanAccountId}/insights`)

        // パラメータ設定
        // 注: time_incrementは削除 - メイン表示では期間集約データを取得
        // 日別データは詳細分析モーダルで個別に取得
        const params = {
          access_token: account.accessToken,
          time_range: JSON.stringify({
            since: formatDate(startDate),
            until: formatDate(endDate),
          }),
          level: 'ad',
          fields:
            'ad_id,ad_name,campaign_id,campaign_name,adset_id,adset_name,impressions,clicks,spend,ctr,cpm,cpc,frequency,reach,date_start,date_stop,conversions,actions,action_values,unique_actions,unique_action_values,unique_conversions,cost_per_action_type,cost_per_conversion',
          // F-CV調査用: action_attribution_windowsで1日クリックアトリビューションを指定
          action_attribution_windows: JSON.stringify(['1d_click']),
          use_unified_attribution_setting: true,
          // time_increment: '1' を削除 - 期間全体の集約データを取得
          limit: '500',
        }

        Object.entries(params).forEach(([key, value]) => {
          url.searchParams.append(key, value)
        })

        console.log('🔗 API URL:', url.toString().replace(account.accessToken, '***'))

        // API呼び出し
        const response = await fetch(url.toString())
        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error?.message || 'Meta API Error')
        }

        console.log(`✅ ${result.data?.length || 0}件のデータ取得完了`)

        // デバッグ: 生のAPIレスポンスを確認
        console.log('🔍 API生データ（最初の3件）:', {
          count: result.data?.length,
          firstItems: result.data?.slice(0, 3),
          allFields: result.data?.[0] ? Object.keys(result.data[0]) : [],
          sampleData: result.data?.[0] ? JSON.stringify(result.data[0], null, 2) : 'No data',
        })

        // データの形式を整形（数値文字列を数値に変換）
        const formattedData = (result.data || []).map((item: any, index: number) => {
          // 最初の1件だけ詳細ログ
          if (index === 0) {
            console.log('📊 変換前の生データ:', {
              ad_name: item.ad_name,
              impressions: item.impressions,
              impressions_type: typeof item.impressions,
              clicks: item.clicks,
              clicks_type: typeof item.clicks,
              spend: item.spend,
              spend_type: typeof item.spend,
              ctr: item.ctr,
              ctr_type: typeof item.ctr,
              allKeys: Object.keys(item),
            })
          }

          // F-CV調査: コンバージョンデータを抽出
          const conversionData = extractConversions(item)

          const formatted = {
            ...item,
            // 数値型に変換（文字列から数値へ）
            impressions: parseInt(item.impressions) || 0,
            clicks: parseInt(item.clicks) || 0,
            spend: parseFloat(item.spend) || 0,
            // コンバージョンメトリクスを追加
            conversions: conversionData.conversions,
            conversions_1d_click: conversionData.conversions_1d_click,
            fcv_debug: conversionData.fcv_debug,
            ctr: parseFloat(item.ctr) || 0,
            cpm: parseFloat(item.cpm) || 0,
            cpc: parseFloat(item.cpc) || 0,
            frequency: parseFloat(item.frequency) || 0,
            reach: parseInt(item.reach) || 0,
            // コンバージョン関連は存在しない場合があるのでオプショナル
            conversions: item.conversions ? parseInt(item.conversions) : 0,
            conversion_values: item.conversion_values ? parseFloat(item.conversion_values) : 0,
            cost_per_conversion: item.cost_per_conversion
              ? parseFloat(item.cost_per_conversion)
              : 0,
            // 疲労度ステータスを追加（仮の判定）
            status: 'normal' as const,
            fatigueScore: 0,
          }

          // 最初の1件だけ変換後のデータも確認
          if (index === 0) {
            console.log('📊 変換後のデータ:', {
              ad_name: formatted.ad_name,
              impressions: formatted.impressions,
              clicks: formatted.clicks,
              spend: formatted.spend,
              ctr: formatted.ctr,
            })
          }

          return formatted
        })

        // F-CV調査: デバッグサマリーを表示
        console.log('🔬 === F-CV調査サマリー ===')
        const debugSummary = formattedData.slice(0, 5).map((item: any) => ({
          ad_name: item.ad_name?.substring(0, 30) + '...',
          CV: item.conversions,
          'F-CV候補1 (unique_actions.value)': item.fcv_debug?.unique_actions_value || 0,
          'F-CV候補2 (unique_actions.1d_click)': item.fcv_debug?.unique_actions_1d_click || 0,
          'F-CV候補3 (unique_conversions)': item.fcv_debug?.unique_conversions || 0,
          '選択されたF-CV': item.conversions_1d_click,
        }))
        console.table(debugSummary)

        // データをセット
        setData(formattedData)
        setLastUpdateTime(new Date())
        setCacheAge(0) // 新規取得なので経過時間はゼロ

        // localStorageにキャッシュ（日付範囲を含めたキーで保存）
        const effectiveDateRange = customRange || customDateRange
        const cacheKey =
          dateRange === 'custom' && effectiveDateRange
            ? `${targetAccountId}_custom_${effectiveDateRange.start.toISOString().split('T')[0]}_${effectiveDateRange.end.toISOString().split('T')[0]}`
            : `${targetAccountId}_${dateRange}`
        saveCachedData(cacheKey, formattedData)
      } catch (err: any) {
        console.error('❌ データ取得エラー:', err)
        setError(err.message)

        // エラー時はキャッシュから復元を試みる
        const fallbackCacheKey = `${targetAccountId}_${dateRange}`
        const { data: cachedData, age } = getCachedData(fallbackCacheKey)
        if (cachedData) {
          try {
            console.log('💾 エラー時のフォールバック: キャッシュから復元')
            setCacheAge(age)

            // エラー時のキャッシュデータも数値型に変換
            const formattedCachedData = (cachedData || []).map((item: any) => ({
              ...item,
              impressions: parseInt(item.impressions) || 0,
              clicks: parseInt(item.clicks) || 0,
              spend: parseFloat(item.spend) || 0,
              ctr: parseFloat(item.ctr) || 0,
              cpm: parseFloat(item.cpm) || 0,
              cpc: parseFloat(item.cpc) || 0,
              frequency: parseFloat(item.frequency) || 0,
              reach: parseInt(item.reach) || 0,
              conversions: item.conversions ? parseInt(item.conversions) : 0,
              conversion_values: item.conversion_values ? parseFloat(item.conversion_values) : 0,
              cost_per_conversion: item.cost_per_conversion
                ? parseFloat(item.cost_per_conversion)
                : 0,
              status: item.status || 'normal',
              fatigueScore: item.fatigueScore || 0,
            }))

            setData(formattedCachedData)
          } catch (e) {
            console.error('キャッシュ復元エラー:', e)
          }
        }
      } finally {
        setIsLoading(false)
      }
    },
    [selectedAccountId, accounts, dateRange]
  ) // customDateRangeを削除して無限ループを防ぐ

  // 初回ロード時
  useEffect(() => {
    const initializeData = async () => {
      try {
        // Convexからアカウント情報を取得
        const account = await loadAccountsFromConvex()

        // データを取得
        if (account) {
          await fetchDataFromMetaAPI(account.accountId, false, null)
        }
      } catch (err: any) {
        // エラー処理は各関数内で実施済み
      }
    }

    initializeData()
  }, []) // 初回のみ実行

  // アカウント変更時
  const handleAccountSelect = async (accountId: string) => {
    setSelectedAccountId(accountId)
    saveSelectedAccount(accountId) // 選択を保存

    // まずキャッシュを確認
    await fetchDataFromMetaAPI(accountId, false, null) // キャッシュがあれば使う
  }

  // リフレッシュボタン用
  const handleRefresh = async (options?: { clearCache?: boolean }) => {
    console.log('🔄 手動リフレッシュ', { clearCache: options?.clearCache, dateRange })

    // キャッシュをクリアする場合（日付範囲を含めたキーで削除）
    if (options?.clearCache && selectedAccountId) {
      const cacheKey = `${selectedAccountId}_${dateRange}`
      clearCachedData(cacheKey)
    }

    await fetchDataFromMetaAPI(selectedAccountId, true, customDateRange) // 強制リフレッシュ
  }

  // 日付範囲変更時（デバウンス付き）
  useEffect(() => {
    if (selectedAccountId && !isLoadingAccounts) {
      console.log('📅 Date range changed, scheduling data fetch...', {
        dateRange,
        customDateRange,
        selectedAccountId,
      })

      // 既存のタイマーをクリア
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current)
      }

      // 300ms後にデータ取得（連続的な変更を防ぐ）
      fetchTimeoutRef.current = setTimeout(() => {
        console.log('📅 Executing delayed fetch...')
        fetchDataFromMetaAPI(selectedAccountId, false, customDateRange)
      }, 300)
    }

    // クリーンアップ
    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current)
      }
    }
  }, [dateRange, customDateRange, selectedAccountId, fetchDataFromMetaAPI])

  // 詳細分析用：特定の広告の日別データを取得
  const fetchDailyDataForAd = useCallback(
    async (adId: string) => {
      // キャッシュチェック
      const cacheKey = `${adId}_${dateRange}`
      if (dailyDataCache[cacheKey]) {
        console.log('📊 日別データをキャッシュから取得')
        return dailyDataCache[cacheKey]
      }

      const account = accounts.find((acc) => acc.accountId === selectedAccountId)
      if (!account || !account.accessToken) {
        console.error('アカウント情報が見つかりません')
        return []
      }

      try {
        console.log(`📈 広告 ${adId} の日別データを取得中...`)

        // 日付範囲を計算
        const endDate = new Date()
        const startDate = new Date()

        switch (dateRange) {
          case 'last_7d':
            startDate.setDate(startDate.getDate() - 7)
            break
          case 'last_14d':
            startDate.setDate(startDate.getDate() - 14)
            break
          case 'last_30d':
            startDate.setDate(startDate.getDate() - 30)
            break
          case 'last_month': {
            // 先月の初日から最終日
            const now = new Date()
            startDate.setFullYear(now.getFullYear(), now.getMonth() - 1, 1)
            endDate.setFullYear(now.getFullYear(), now.getMonth(), 0)
            break
          }
          case 'last_90d':
            startDate.setDate(startDate.getDate() - 90)
            break
          case 'all':
            startDate.setDate(startDate.getDate() - 365)
            break
        }

        const formatDate = (date: Date) => {
          const year = date.getFullYear()
          const month = String(date.getMonth() + 1).padStart(2, '0')
          const day = String(date.getDate()).padStart(2, '0')
          return `${year}-${month}-${day}`
        }

        // Meta API URL構築
        const baseUrl = 'https://graph.facebook.com/v23.0'
        const cleanAdId = adId.replace('act_', '')
        const url = new URL(`${baseUrl}/${cleanAdId}/insights`)

        // パラメータ設定 - 日別データ取得
        const params = {
          access_token: account.accessToken,
          time_range: JSON.stringify({
            since: formatDate(startDate),
            until: formatDate(endDate),
          }),
          fields:
            'impressions,clicks,spend,ctr,cpm,cpc,frequency,reach,conversions,date_start,date_stop',
          time_increment: '1', // 日別データ
          limit: '100',
        }

        Object.entries(params).forEach(([key, value]) => {
          url.searchParams.append(key, value)
        })

        // API呼び出し
        const response = await fetch(url.toString())
        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error?.message || 'Meta API Error')
        }

        console.log(`✅ ${result.data?.length || 0}件の日別データ取得完了`)

        // データの形式を整形
        const formattedData = (result.data || []).map((item: any) => ({
          ...item,
          date: item.date_start,
          impressions: parseInt(item.impressions) || 0,
          clicks: parseInt(item.clicks) || 0,
          spend: parseFloat(item.spend) || 0,
          ctr: parseFloat(item.ctr) || 0,
          cpm: parseFloat(item.cpm) || 0,
          cpc: parseFloat(item.cpc) || 0,
          frequency: parseFloat(item.frequency) || 0,
          reach: parseInt(item.reach) || 0,
          conversions: parseInt(item.conversions) || 0,
        }))

        // キャッシュに保存
        setDailyDataCache((prev) => ({
          ...prev,
          [cacheKey]: formattedData,
        }))

        return formattedData
      } catch (err: any) {
        console.error('❌ 日別データ取得エラー:', err)
        return []
      }
    },
    [accounts, selectedAccountId, dateRange, dailyDataCache]
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* エラー表示 */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <div className="font-medium">エラー</div>
            <div className="text-sm mt-1">{error}</div>
          </div>
        </div>
      )}

      {/* ヘッダー情報 */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">広告パフォーマンスダッシュボード</h1>
              <p className="text-sm text-gray-500 mt-1">
                Meta APIから直接取得 • アカウント情報はConvex使用
              </p>
              {selectedAccountId && (
                <p className="text-xs text-gray-400 mt-1">
                  データ件数: {data.length}件 • 最終更新:{' '}
                  {lastUpdateTime ? lastUpdateTime.toLocaleTimeString('ja-JP') : '未取得'}
                  {cacheAge < Infinity && cacheAge > 0 && (
                    <>
                      {' • '}
                      <span
                        className={cacheAge > 10 * 60 * 1000 ? 'text-yellow-600' : 'text-green-600'}
                      >
                        キャッシュ使用中（{Math.floor(cacheAge / 60000)}分前）
                      </span>
                    </>
                  )}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* FatigueDashboardPresentationを使用 */}
      {(() => {
        console.log('🔍 MainDashboard: Passing data to FatigueDashboardPresentation:', {
          dataLength: data.length,
          sampleData: data.slice(0, 2),
          firstItem: data[0]
            ? {
                ad_name: data[0].ad_name,
                impressions: data[0].impressions,
                clicks: data[0].clicks,
                spend: data[0].spend,
                type_impressions: typeof data[0].impressions,
                type_clicks: typeof data[0].clicks,
                type_spend: typeof data[0].spend,
              }
            : null,
        })
        return null
      })()}
      <FatigueDashboardPresentation
        // アカウント関連
        accounts={accounts}
        selectedAccountId={selectedAccountId}
        isLoadingAccounts={isLoadingAccounts}
        onAccountSelect={handleAccountSelect}
        // データ関連
        data={data}
        insights={data}
        isLoading={isLoading}
        isRefreshing={false}
        error={error ? new Error(error) : null}
        // アクション
        onRefresh={handleRefresh}
        // メタ情報
        dataSource="api"
        lastUpdateTime={lastUpdateTime}
        // 日付範囲
        dateRange={dateRange}
        onDateRangeChange={(range) => setDateRange(range)}
        customDateRange={customDateRange}
        onCustomDateRange={(start, end) => {
          console.log('📅 MainDashboard: Custom date range selected', {
            start: start.toISOString(),
            end: end.toISOString(),
            selectedAccountId,
          })

          // カスタム日付範囲を設定
          setCustomDateRange({ start, end })
          setDateRange('custom')
          // useEffectが自動的にデータ取得をトリガーする
        }}
        // 進捗情報
        progress={undefined}
        // フィルター関連
        totalInsights={data.length}
        filteredCount={filteredData?.length || data.length}
        // 集約関連
        enableAggregation={true}
        aggregatedData={undefined}
        aggregationMetrics={undefined}
        isAggregating={false}
        onFilterChange={() => {}}
        sourceData={data}
      />
    </div>
  )
}
