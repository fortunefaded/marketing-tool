import { useState, useEffect, useCallback, useRef } from 'react'
import { useConvex } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { FatigueDashboardPresentation } from '../features/meta-api/components/FatigueDashboardPresentation'
import { AccountSelector } from '../features/meta-api/account/AccountSelector'
import { MonthlySummaryTable } from '../components/dashboard/MonthlySummaryTable'
import { DailySparklineCharts } from '../components/dashboard/DailySparklineCharts'
import { IntegratedDashboard } from '../components/dashboard/IntegratedDashboard'
import { useMonthlySummary } from '../hooks/useMonthlySummary'
import { MetaAccount } from '@/types'
import {
  saveSelectedAccount,
  getSelectedAccount,
  saveCachedData,
  getCachedData,
  clearCachedData,
} from '@/utils/localStorage'
import { logAPI, logState, logFilter } from '../utils/debugLogger'

// デバッグコマンドを読み込み（開発環境のみ）
if (
  typeof process !== 'undefined' &&
  process.env?.NODE_ENV === 'development' &&
  typeof window !== 'undefined'
) {
  import('../utils/debug-commands.js' as any).catch(() => {
    // エラーを無視（ファイルが存在しない場合）
  })
}

export default function MainDashboard() {
  const convex = useConvex()
  const [data, setData] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [accounts, setAccounts] = useState<MetaAccount[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true)
  const [ecforceData, setEcforceData] = useState<any[]>([]) // ECForceデータ用state
  // localStorageから保存された期間選択を復元
  const [dateRange, setDateRange] = useState<
    | 'last_7d'
    | 'last_14d'
    | 'last_28d'
    | 'last_30d'
    | 'last_month'
    | 'last_90d'
    | 'all'
    | 'custom'
    | 'today'
    | 'yesterday'
    | 'this_week'
    | 'last_week'
    | 'this_month'
  >(() => {
    const savedDateRange = localStorage.getItem('selectedDateRange')
    return (savedDateRange as any) || 'last_7d'
  })
  const [customDateRange, setCustomDateRange] = useState<{ start: Date; end: Date } | null>(() => {
    const savedCustomRange = localStorage.getItem('customDateRange')
    if (savedCustomRange) {
      try {
        const parsed = JSON.parse(savedCustomRange)
        return {
          start: new Date(parsed.start),
          end: new Date(parsed.end),
        }
      } catch (e) {
        return null
      }
    }
    return null
  })
  const [filteredData] = useState<any>(null)
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null)
  // const [, setDailyDataCache] = useState<Record<string, any>>({}) // 未使用のためコメント化
  const [, setCacheAge] = useState<number>(Infinity) // キャッシュの経過時間

  // 期間選択が変更されたらlocalStorageに保存
  useEffect(() => {
    localStorage.setItem('selectedDateRange', dateRange)
    logState('MainDashboard', '期間選択を保存', { dateRange })
  }, [dateRange])

  // カスタム期間が変更されたらlocalStorageに保存
  useEffect(() => {
    if (customDateRange) {
      localStorage.setItem(
        'customDateRange',
        JSON.stringify({
          start: customDateRange.start.toISOString(),
          end: customDateRange.end.toISOString(),
        })
      )
      logState('MainDashboard', 'カスタム期間を保存', customDateRange)
    }
  }, [customDateRange])

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
        id: acc._id || acc.accountId,
        accountId: acc.accountId,
        fullAccountId: acc.accountId.startsWith('act_') ? acc.accountId : `act_${acc.accountId}`,
        name: acc.accountName || acc.name || 'Unknown Account',
        accessToken: acc.accessToken || '',
        isActive: acc.isActive || false,
        createdAt: new Date(acc.createdAt || Date.now()),
        currency: acc.currency,
        timezone: acc.timezone,
        permissions: acc.permissions,
        lastUsedAt: acc.lastSyncAt ? new Date(acc.lastSyncAt) : undefined,
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

  // ECForceからデータを取得（Convex経由）
  const fetchDataFromECForce = useCallback(
    async (startDate: string, endDate: string) => {
      try {
        console.log('📊 ECForceからデータを取得開始（Convex）', { startDate, endDate })

        // ConvexからECForceデータを取得
        const result = await convex.query(api.ecforce.getPerformanceData, {
          startDate,
          endDate,
          limit: 1000 // 十分な量のデータを取得
        })

        if (result && result.data) {
          // Convexのデータ形式を統合ダッシュボード用に変換
          const formattedData = result.data.map((item: any) => ({
            date: item.dataDate,
            access: item.accessCount || 0,
            cvOrder: item.cvOrder || 0,
            cvPayment: item.cvPayment || 0,
            cvThanksUpsell: item.cvThanksUpsell || 0,
            revenue: item.salesAmount || 0,
            orderRevenue: item.orderAmount || 0,
            upsellRevenue: (item.salesAmount || 0) - (item.orderAmount || 0),
            cvrOrder: item.cvrOrder || 0,
            cvrPayment: item.cvrPayment || 0,
            offerSuccessRate: item.offerRateThanksUpsell || 0,
            cost: item.cost || 0,
            roas: item.roas || 0,
            realCPA: item.realCPA || 0,
            advertiser: item.advertiser || '',
          }))

          console.log('✅ ECForceデータ取得完了（Convex）', {
            count: formattedData.length,
            sample: formattedData[0],
            rawSample: result.data[0],
            dateRange: { startDate, endDate }
          })

          setEcforceData(formattedData)
          return formattedData
        } else {
          console.log('⚠️ ECForceデータが見つかりません')
          setEcforceData([])
          return []
        }
      } catch (error) {
        console.error('❌ ECForceデータ取得エラー（Convex）', error)
        // エラー時は空配列をセット
        setEcforceData([])
        return []
      }
    },
    [convex]
  )

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
      // デバッグ: キャッシュを一時的に無効化
      const DISABLE_CACHE = true

      if (!forceRefresh && !DISABLE_CACHE) {
        // 日付範囲を含めたキャッシュキー（カスタムの場合は日付を含める）
        const effectiveRange = customRange || customDateRange
        // 日付範囲を含めたキャッシュキーを生成
        const dateRangeKey =
          dateRange === 'custom' && effectiveRange
            ? `custom_${effectiveRange.start.toISOString().split('T')[0]}_${effectiveRange.end.toISOString().split('T')[0]}`
            : dateRange
        const { data: cachedData, age } = getCachedData(targetAccountId!, dateRangeKey)

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

        // 日付フォーマット関数
        const formatDate = (date: Date) => {
          const year = date.getFullYear()
          const month = String(date.getMonth() + 1).padStart(2, '0')
          const day = String(date.getDate()).padStart(2, '0')
          return `${year}-${month}-${day}`
        }

        // 日付範囲を計算（独立したDateオブジェクトを作成）
        let startDate = new Date()
        let endDate = new Date()

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
            case 'last_7d': {
              const now = new Date()
              startDate = new Date(now)
              startDate.setDate(startDate.getDate() - 7)
              startDate.setHours(0, 0, 0, 0)
              endDate = new Date(now)
              endDate.setDate(endDate.getDate() - 1)
              endDate.setHours(23, 59, 59, 999)
              break
            }
            case 'last_14d': {
              const now = new Date()
              startDate = new Date(now)
              startDate.setDate(startDate.getDate() - 14)
              startDate.setHours(0, 0, 0, 0)
              endDate = new Date(now)
              endDate.setDate(endDate.getDate() - 1)
              endDate.setHours(23, 59, 59, 999)
              break
            }
            case 'last_28d': {
              const now = new Date()
              startDate = new Date(now)
              startDate.setDate(startDate.getDate() - 28)
              startDate.setHours(0, 0, 0, 0)
              endDate = new Date(now)
              endDate.setDate(endDate.getDate() - 1)
              endDate.setHours(23, 59, 59, 999)
              break
            }
            case 'last_30d': {
              const now = new Date()
              startDate = new Date(now)
              startDate.setDate(startDate.getDate() - 30)
              startDate.setHours(0, 0, 0, 0)
              endDate = new Date(now)
              endDate.setDate(endDate.getDate() - 1)
              endDate.setHours(23, 59, 59, 999)
              break
            }
            case 'last_month': {
              // 先月の初日から最終日
              const now = new Date()
              // 先月の初日
              startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
              startDate.setHours(0, 0, 0, 0)
              // 先月の最終日
              endDate = new Date(now.getFullYear(), now.getMonth(), 0)
              endDate.setHours(23, 59, 59, 999)
              break
            }
            case 'this_month': {
              // 今月の初日から今日まで
              const now = new Date()
              startDate.setFullYear(now.getFullYear(), now.getMonth(), 1)
              startDate.setHours(0, 0, 0, 0)
              endDate.setHours(23, 59, 59, 999)
              // logAPI('今月の日付範囲設定') - useEffect内で実行
              break
            }
            case 'today': {
              // 今日のみ
              // Meta APIは現在時刻までのデータしか返さないため、
              // 終了時刻を現在時刻に設定する
              const now = new Date()
              startDate = new Date(now)
              startDate.setHours(0, 0, 0, 0)
              endDate = new Date(now) // 現在時刻をそのまま使用

              // logAPI('今日の日付範囲設定') - useEffect内で実行
              break
            }
            case 'yesterday': {
              // 昨日のみ
              const now = new Date()
              startDate = new Date(now)
              startDate.setDate(startDate.getDate() - 1)
              startDate.setHours(0, 0, 0, 0)
              endDate = new Date(now)
              endDate.setDate(endDate.getDate() - 1)
              endDate.setHours(23, 59, 59, 999)
              // logAPI('昨日の日付範囲設定') - useEffect内で実行
              break
            }
            case 'this_week': {
              // 今週（日曜始まり）
              const now = new Date()
              const dayOfWeek = now.getDay() // 0=日曜, 1=月曜, ..., 6=土曜
              // 今週の日曜日を計算（今日から dayOfWeek 日前）
              startDate.setDate(now.getDate() - dayOfWeek)
              startDate.setHours(0, 0, 0, 0)
              // 今週の土曜日（今週の日曜日から6日後）
              const weekEnd = new Date(startDate)
              weekEnd.setDate(startDate.getDate() + 6)
              weekEnd.setHours(23, 59, 59, 999)
              // 今日が土曜日より後の場合は今日を終了日とする
              if (weekEnd > now) {
                endDate.setHours(23, 59, 59, 999)
              } else {
                endDate.setTime(weekEnd.getTime())
              }
              break
            }
            case 'last_week': {
              // 先週（日曜始まり）
              const now = new Date()
              const currentDay = now.getDay() // 0=日曜, 1=月曜, ..., 6=土曜
              // 先週の土曜日を計算（今日から currentDay + 1 日前）
              endDate.setDate(now.getDate() - currentDay - 1)
              endDate.setHours(23, 59, 59, 999)
              // 先週の日曜日を計算（先週の土曜日から6日前）
              startDate.setTime(endDate.getTime())
              startDate.setDate(endDate.getDate() - 6)
              startDate.setHours(0, 0, 0, 0)
              break
            }
            case 'last_90d': {
              const now = new Date()
              startDate = new Date(now)
              startDate.setDate(startDate.getDate() - 90)
              startDate.setHours(0, 0, 0, 0)
              endDate = new Date(now)
              endDate.setDate(endDate.getDate() - 1)
              endDate.setHours(23, 59, 59, 999)
              break
            }
            case 'all':
              startDate.setDate(startDate.getDate() - 365)
              break
          }
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
            'ad_id,ad_name,campaign_id,campaign_name,adset_id,adset_name,impressions,clicks,spend,ctr,cpm,cpc,frequency,reach,date_start,date_stop,conversions,actions,action_values,unique_actions,cost_per_action_type,cost_per_unique_action_type',
          // F-CV調査用: 複数のアトリビューション期間を取得して比較
          action_attribution_windows: ['1d_click', '7d_click'],
          action_breakdowns: ['action_type'],
          use_unified_attribution_setting: 'true',
          // time_increment: '1' を削除 - 期間全体の集約データを取得
          limit: '500',
        }

        Object.entries(params).forEach(([key, value]) => {
          url.searchParams.append(key, Array.isArray(value) ? value.join(',') : value)
        })

        // グローバルにデバッグ情報を保存
        const requestDebugInfo = {
          url: url.toString().replace(account.accessToken, '***'),
          dateRange,
          timeRange: {
            since: formatDate(startDate),
            until: formatDate(endDate),
          },
          debugDateInfo: {
            startDate: {
              iso: startDate.toISOString(),
              formatted: formatDate(startDate),
              time: `${startDate.getHours()}:${startDate.getMinutes()}:${startDate.getSeconds()}.${startDate.getMilliseconds()}`,
            },
            endDate: {
              iso: endDate.toISOString(),
              formatted: formatDate(endDate),
              time: `${endDate.getHours()}:${endDate.getMinutes()}:${endDate.getSeconds()}.${endDate.getMilliseconds()}`,
            },
          },
          account: cleanAccountId,
        }

        // グローバル変数に保存
        if (typeof window !== 'undefined') {
          ;(window as any).LAST_API_REQUEST = requestDebugInfo
          console.log('🌐 APIリクエスト情報をwindow.LAST_API_REQUESTに保存しました')
        }

        logAPI('MainDashboard', 'Meta API Request', requestDebugInfo)

        // API呼び出し
        const response = await fetch(url.toString())
        const result = await response.json()

        // 最大インプレッションを持つ広告を找す
        let maxImpressionsItem = null
        let maxImpressions = 0
        const top5Items = []

        if (result.data && Array.isArray(result.data)) {
          // インプレッションでソート
          const sortedByImpressions = [...result.data].sort(
            (a, b) => parseInt(b.impressions || '0') - parseInt(a.impressions || '0')
          )

          maxImpressionsItem = sortedByImpressions[0]
          maxImpressions = parseInt(maxImpressionsItem?.impressions || '0')

          // 上位5件を取得
          for (let i = 0; i < Math.min(5, sortedByImpressions.length); i++) {
            top5Items.push({
              ad_name: sortedByImpressions[i].ad_name,
              impressions: parseInt(sortedByImpressions[i].impressions || '0'),
              spend: parseFloat(sortedByImpressions[i].spend || '0'),
            })
          }
        }

        // レスポンス情報をグローバルに保存
        const responseDebugInfo = {
          dateRange,
          requestedRange: {
            since: formatDate(startDate),
            until: formatDate(endDate),
          },
          dataCount: result.data?.length || 0,
          hasData: !!result.data,
          hasPaging: !!result.paging,
          maxImpressions: {
            value: maxImpressions,
            ad_name: maxImpressionsItem?.ad_name || 'N/A',
            spend: maxImpressionsItem?.spend || 0,
          },
          top5ByImpressions: top5Items,
          totalSpend: result.data?.reduce(
            (sum: number, item: any) => sum + parseFloat(item.spend || 0),
            0
          ),
        }

        // グローバル変数に保存
        if (typeof window !== 'undefined') {
          ;(window as any).LAST_API_RESPONSE = responseDebugInfo
          console.log('🌐 APIレスポンス情報をwindow.LAST_API_RESPONSEに保存しました')

          // 簡単なデバッグ情報を表示
          console.log('🔍 === デバッグ情報 ===')
          console.log('フィルター:', responseDebugInfo.dateRange)
          console.log('日付範囲:', responseDebugInfo.requestedRange)
          console.log('データ件数:', responseDebugInfo.dataCount)
          console.log('合計広告費:', '¥' + responseDebugInfo.totalSpend.toLocaleString())
          console.log(
            '最大インプレッション:',
            responseDebugInfo.maxImpressions.value.toLocaleString()
          )
          console.log('最大インプレッション広告:', responseDebugInfo.maxImpressions.ad_name)

          if (responseDebugInfo.maxImpressions.value < 80594) {
            console.warn('⚠️ 最大インプレッションが実際の値(80,594)より小さいです')
            console.warn('差分:', (80594 - responseDebugInfo.maxImpressions.value).toLocaleString())
          }
        }

        logAPI('MainDashboard', 'Meta API Response', responseDebugInfo)

        // コンバージョンデータを正しく抽出する関数（重複カウント回避）
        const extractConversionData = (item: any) => {
          let cv = 0
          let fcv = null // F-CVは後日Pixel実装で対応
          let action_type_used = 'none'

          // CV: offsite_conversion.fb_pixel_purchaseのみを使用（重複回避）
          if (item.actions && Array.isArray(item.actions)) {
            const fbPixelPurchase = item.actions.find(
              (action: any) => action.action_type === 'offsite_conversion.fb_pixel_purchase'
            )

            if (fbPixelPurchase) {
              // 1d_click値を優先、なければvalue値を使用
              cv = parseInt(fbPixelPurchase['1d_click'] || fbPixelPurchase.value || '0')
              action_type_used = 'offsite_conversion.fb_pixel_purchase'
            }
            // Pixelが設置されていない場合のフォールバック
            else {
              const purchaseAction = item.actions.find(
                (action: any) => action.action_type === 'purchase'
              )
              if (purchaseAction) {
                cv = parseInt(purchaseAction['1d_click'] || purchaseAction.value || '0')
                action_type_used = 'purchase (fallback)'
              }
            }
          }

          // conversionsフィールドは使用しない（3214という誤った値のため）

          return {
            cv,
            fcv,
            debug: {
              original_conversions_field: item.conversions, // デバッグ用
              calculated_cv: cv,
              action_type_used: action_type_used,
              all_actions: (item as any).actions?.map((a: any) => ({
                type: a.action_type,
                value: a.value,
                '1d_click': a['1d_click'],
              })),
            },
          }
        }

        // デバッグ: 250802_テキスト流しのCV確認
        const debugTarget = result.data?.find((item: any) =>
          item.ad_name?.includes('250802_テキスト流し')
        )

        if (debugTarget) {
          const conversionData = extractConversionData(debugTarget)
          console.log('🎯 250802_テキスト流し CVデバッグ:')
          console.log('  正しいCV:', conversionData.cv)
          console.log('  使用したaction_type:', conversionData.debug.action_type_used)
          console.log(
            '  元のconversionsフィールド:',
            conversionData.debug.original_conversions_field
          )
          console.log('  全actions:', conversionData.debug.all_actions)
        }

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
          // 最初の3件だけ超詳細ログ
          if (index < 3) {
            console.log(`🔬 === F-CV調査 アイテム${index + 1} ===`)
            console.log('📋 利用可能フィールド:', Object.keys(item))

            // conversionsフィールド
            console.log('1️⃣ conversions:', item.conversions)

            // actions配列の詳細
            if (item.actions && Array.isArray(item.actions)) {
              console.log('2️⃣ actions配列:')
              item.actions.forEach((action: any) => {
                if (
                  action.action_type?.includes('purchase') ||
                  action.action_type?.includes('omni_purchase') ||
                  action.action_type?.includes('conversion')
                ) {
                  console.log('  - 購入系アクション:', {
                    type: action.action_type,
                    value: action.value,
                    '1d_click': action['1d_click'],
                    '7d_click': action['7d_click'],
                    '1d_view': action['1d_view'],
                    '28d_click': action['28d_click'],
                  })
                }
              })
            }

            // unique_actions配列の詳細（これが最重要！）
            if (item.unique_actions && Array.isArray(item.unique_actions)) {
              console.log('3️⃣ 🔥 unique_actions配列（F-CV候補）:')
              item.unique_actions.forEach((action: any) => {
                if (
                  action.action_type?.includes('purchase') ||
                  action.action_type?.includes('omni_purchase') ||
                  action.action_type?.includes('conversion')
                ) {
                  console.log('  - ユニーク購入アクション:', {
                    type: action.action_type,
                    value: action.value,
                    '1d_click': action['1d_click'],
                    '7d_click': action['7d_click'],
                  })
                }
              })
            } else {
              console.log('3️⃣ ⚠️ unique_actionsが存在しません')
            }

            // 比較サマリー
            const normalPurchase =
              item.actions
                ?.filter((a: any) => a.action_type?.includes('purchase'))
                ?.reduce((sum: number, a: any) => sum + parseInt(a.value || '0'), 0) || 0

            const uniquePurchase =
              item.unique_actions
                ?.filter((a: any) => a.action_type?.includes('purchase'))
                ?.reduce((sum: number, a: any) => sum + parseInt(a.value || '0'), 0) || 0

            console.log('📊 購入コンバージョン比較:', {
              通常購入: normalPurchase,
              ユニーク購入: uniquePurchase,
              比率:
                normalPurchase > 0
                  ? `${((uniquePurchase / normalPurchase) * 100).toFixed(1)}%`
                  : 'N/A',
            })
            console.log('---')
          }

          // コンバージョンデータを正しく抽出（重複カウント回避）
          const conversionData = extractConversionData(item)

          const formatted = {
            ...item,
            // 数値型に変換（文字列から数値へ）
            impressions: parseInt(item.impressions) || 0,
            clicks: parseInt(item.clicks) || 0,
            spend: parseFloat(item.spend) || 0,
            // コンバージョンメトリクスを追加（extractConversionDataから取得）
            conversions: conversionData.cv, // 正しいCV値
            conversions_1d_click: conversionData.fcv, // F-CV（現在はnull）
            conversion_debug: conversionData.debug, // デバッグ情報
            ctr: parseFloat(item.ctr) || 0,
            cpm: parseFloat(item.cpm) || 0,
            cpc: parseFloat(item.cpc) || 0,
            frequency: parseFloat(item.frequency) || 0,
            reach: parseInt(item.reach) || 0,
            conversion_values: item.conversion_values ? parseFloat(item.conversion_values) : 0,
            cost_per_conversion:
              conversionData.cv > 0 ? parseFloat(item.spend || '0') / conversionData.cv : 0,
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
              conversion_values: formatted.conversion_values,
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

        // ECForceデータを取得して統合
        try {
          console.log('📊 ECForceデータを取得開始')
          const ecforceResponse = await convex.query(
            api.advertiserMappings.getECForceDataForMetaAccount,
            {
              metaAccountId: targetAccountId!,
              startDate: formatDate(startDate),
              endDate: formatDate(endDate),
            }
          )

          console.log('ECForceデータ取得完了:', ecforceResponse.length + '件')

          // 日付をキーにしたECForceデータのマップを作成
          const ecforceMap = new Map()
          ecforceResponse.forEach((ec: any) => {
            if (ec.date) {
              ecforceMap.set(ec.date, ec)
            }
          })

          console.log('ECForce日別データマップ:', ecforceMap.size + '件の日付データ')

          // 期間全体の合計を計算（合計行用）
          const ecforceTotals = ecforceResponse.reduce((acc: any, ec: any) => {
            return {
              totalCvOrder: (acc.totalCvOrder || 0) + (ec.cvOrder || 0),
              totalCvPayment: (acc.totalCvPayment || 0) + (ec.cvPayment || 0),
            }
          }, {})

          console.log('ECForce合計:', ecforceTotals)

          // ECForceデータを広告名(creativeName)でグループ化
          const ecforceByCreativeName = new Map<string, { cv: number; fcv: number }>()
          ecforceResponse.forEach((ec: any) => {
            const creativeName = ec.creativeName || ''
            if (creativeName) {
              const existing = ecforceByCreativeName.get(creativeName) || { cv: 0, fcv: 0 }
              ecforceByCreativeName.set(creativeName, {
                cv: existing.cv + (ec.cvOrder || 0),
                fcv: existing.fcv + (ec.cvPayment || 0),
              })
            }
          })

          console.log('ECForce広告名別データ:', ecforceByCreativeName.size + '件のクリエイティブ')

          // MetaデータにECForceデータを統合
          // 全てのアイテムに合計値を追加（合計行で使用するため）
          const dataWithEcforce = formattedData.map((item: any) => {
            // 広告名でECForceデータを検索
            const ecforceCreativeData = ecforceByCreativeName.get(item.ad_name || '') || {
              cv: 0,
              fcv: 0,
            }

            return {
              ...item,
              // ECForce合計値を全アイテムに保存（合計行で参照するため）
              ecforce_cv_total: ecforceTotals.totalCvOrder || 0,
              ecforce_fcv_total: ecforceTotals.totalCvPayment || 0,
              // 個別のクリエイティブ用（広告名でマッチング）
              ecforce_cv: ecforceCreativeData.cv,
              ecforce_fcv: ecforceCreativeData.fcv,
              ecforce_cpa:
                ecforceCreativeData.fcv > 0 ? item.spend / ecforceCreativeData.fcv : null,
            }
          })

          setData(dataWithEcforce)
          setEcforceData(ecforceResponse)
        } catch (ecError) {
          console.error('ECForceデータ取得エラー:', ecError)
          // ECForceデータが取得できなくてもMetaデータは表示
          setData(formattedData)
        }

        setLastUpdateTime(new Date())
        setCacheAge(0) // 新規取得なので経過時間はゼロ

        // ECForceデータも同時に取得
        await fetchDataFromECForce(formatDate(startDate), formatDate(endDate))

        // localStorageにキャッシュ（日付範囲を含めたキーで保存）
        const effectiveDateRange = customRange || customDateRange
        // 日付範囲を含めたキャッシュキーを生成
        const dateRangeKey =
          dateRange === 'custom' && effectiveDateRange
            ? `custom_${effectiveDateRange.start.toISOString().split('T')[0]}_${effectiveDateRange.end.toISOString().split('T')[0]}`
            : dateRange
        saveCachedData(targetAccountId!, formattedData, dateRangeKey)
      } catch (err: any) {
        console.error('❌ データ取得エラー:', err)
        setError(err.message)

        // エラー時はキャッシュから復元を試みる
        const { data: cachedData, age } = getCachedData(targetAccountId!, dateRange)
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
    [selectedAccountId, accounts, dateRange, fetchDataFromECForce, convex]
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
      clearCachedData(selectedAccountId, dateRange)
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
  // Unused function - commented out for future use
  /* const fetchDailyDataForAd = useCallback(
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
            endDate.setDate(endDate.getDate() - 1)
            endDate.setHours(23, 59, 59, 999)
            break
          case 'last_14d':
            startDate.setDate(startDate.getDate() - 14)
            endDate.setDate(endDate.getDate() - 1)
            endDate.setHours(23, 59, 59, 999)
            break
          case 'last_28d':
            startDate.setDate(startDate.getDate() - 28)
            endDate.setDate(endDate.getDate() - 1)
            endDate.setHours(23, 59, 59, 999)
            break
          case 'last_30d':
            startDate.setDate(startDate.getDate() - 30)
            endDate.setDate(endDate.getDate() - 1)
            endDate.setHours(23, 59, 59, 999)
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
            endDate.setDate(endDate.getDate() - 1)
            endDate.setHours(23, 59, 59, 999)
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
          url.searchParams.append(key, Array.isArray(value) ? value.join(',') : value)
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
  ) */

  // 月次サマリーフックを使用
  const {
    summaries: monthlySummaries,
    isLoading: isLoadingMonthlySummary,
    error: monthlySummaryError,
    refetchSummary,
  } = useMonthlySummary(
    selectedAccountId,
    accounts.find((acc) => acc.accountId === selectedAccountId)?.accessToken
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダーを最上部に固定 */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="px-4 py-2">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold text-gray-900">Marketing Dashboard</h1>
            <div className="flex items-center gap-4">
              <AccountSelector
                accounts={accounts}
                selectedAccountId={selectedAccountId}
                onSelect={handleAccountSelect}
                isLoading={isLoadingAccounts}
              />
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

        {/* 月次サマリーエラー表示 */}
        {monthlySummaryError && (
          <div className="px-4 py-2">
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-2 rounded-lg">
              <div className="text-sm">{monthlySummaryError}</div>
            </div>
          </div>
        )}

        {/* 月次サマリーと日別グラフを縦並びに配置（全幅） */}
        {selectedAccountId && (
          <div className="px-4 py-4 space-y-4">
            {/* 月次サマリー（3ヶ月分） */}
            {monthlySummaries && (
              <MonthlySummaryTable
                summaries={monthlySummaries}
                onRefresh={async (yearMonth) => {
                  // 現在月のみ手動リフレッシュ可能
                  const currentYearMonth = new Date().toISOString().slice(0, 7)
                  if (yearMonth === currentYearMonth) {
                    await refetchSummary(yearMonth)
                  }
                }}
              />
            )}

            {/* 日別スパークラインチャート */}
            <DailySparklineCharts
            accountId={selectedAccountId}
            dateRange={(() => {
              const today = new Date()
              const formatDate = (date: Date) => date.toISOString().split('T')[0]

              switch (dateRange) {
                case 'today':
                  return { start: formatDate(today), end: formatDate(today) }
                case 'yesterday':
                  const yesterday = new Date(today)
                  yesterday.setDate(yesterday.getDate() - 1)
                  return { start: formatDate(yesterday), end: formatDate(yesterday) }
                case 'last_7d':
                  const week = new Date(today)
                  week.setDate(week.getDate() - 7)
                  const endWeek = new Date(today)
                  endWeek.setDate(endWeek.getDate() - 1)
                  return { start: formatDate(week), end: formatDate(endWeek) }
                case 'last_14d':
                  const twoWeeks = new Date(today)
                  twoWeeks.setDate(twoWeeks.getDate() - 14)
                  const endTwoWeeks = new Date(today)
                  endTwoWeeks.setDate(endTwoWeeks.getDate() - 1)
                  return { start: formatDate(twoWeeks), end: formatDate(endTwoWeeks) }
                case 'last_28d':
                  const fourWeeks = new Date(today)
                  fourWeeks.setDate(fourWeeks.getDate() - 28)
                  const endFourWeeks = new Date(today)
                  endFourWeeks.setDate(endFourWeeks.getDate() - 1)
                  return { start: formatDate(fourWeeks), end: formatDate(endFourWeeks) }
                case 'last_30d':
                  const thirtyDays = new Date(today)
                  thirtyDays.setDate(thirtyDays.getDate() - 30)
                  const endThirtyDays = new Date(today)
                  endThirtyDays.setDate(endThirtyDays.getDate() - 1)
                  return { start: formatDate(thirtyDays), end: formatDate(endThirtyDays) }
                case 'last_month':
                  const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
                  const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0)
                  return { start: formatDate(lastMonth), end: formatDate(lastMonthEnd) }
                case 'this_month':
                  const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1)
                  return { start: formatDate(thisMonth), end: formatDate(today) }
                case 'last_90d':
                  const ninetyDays = new Date(today)
                  ninetyDays.setDate(ninetyDays.getDate() - 90)
                  const endNinetyDays = new Date(today)
                  endNinetyDays.setDate(endNinetyDays.getDate() - 1)
                  return { start: formatDate(ninetyDays), end: formatDate(endNinetyDays) }
                case 'custom':
                  if (customDateRange) {
                    return {
                      start: formatDate(customDateRange.start),
                      end: formatDate(customDateRange.end),
                    }
                  }
                  return null
                default:
                  return null
              }
            })()}
            />

            {/* 統合ダッシュボード */}
            <IntegratedDashboard
              metaData={data}
              ecforceData={ecforceData}
              dateRange={(() => {
                const today = new Date()
                const formatDate = (date: Date) => date.toISOString().split('T')[0]

                switch (dateRange) {
                  case 'today':
                    return { start: formatDate(today), end: formatDate(today) }
                  case 'yesterday':
                    const yesterday = new Date(today)
                    yesterday.setDate(yesterday.getDate() - 1)
                    return { start: formatDate(yesterday), end: formatDate(yesterday) }
                  case 'last_7d':
                    const week = new Date(today)
                    week.setDate(week.getDate() - 7)
                    const endWeek = new Date(today)
                    endWeek.setDate(endWeek.getDate() - 1)
                    return { start: formatDate(week), end: formatDate(endWeek) }
                  case 'last_14d':
                    const twoWeeks = new Date(today)
                    twoWeeks.setDate(twoWeeks.getDate() - 14)
                    const endTwoWeeks = new Date(today)
                    endTwoWeeks.setDate(endTwoWeeks.getDate() - 1)
                    return { start: formatDate(twoWeeks), end: formatDate(endTwoWeeks) }
                  case 'last_28d':
                    const fourWeeks = new Date(today)
                    fourWeeks.setDate(fourWeeks.getDate() - 28)
                    const endFourWeeks = new Date(today)
                    endFourWeeks.setDate(endFourWeeks.getDate() - 1)
                    return { start: formatDate(fourWeeks), end: formatDate(endFourWeeks) }
                  case 'last_30d':
                    const thirtyDays = new Date(today)
                    thirtyDays.setDate(thirtyDays.getDate() - 30)
                    const endThirtyDays = new Date(today)
                    endThirtyDays.setDate(endThirtyDays.getDate() - 1)
                    return { start: formatDate(thirtyDays), end: formatDate(endThirtyDays) }
                  case 'last_month':
                    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
                    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0)
                    return { start: formatDate(lastMonth), end: formatDate(lastMonthEnd) }
                  case 'this_month':
                    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1)
                    return { start: formatDate(thisMonth), end: formatDate(today) }
                  case 'last_90d':
                    const ninetyDays = new Date(today)
                    ninetyDays.setDate(ninetyDays.getDate() - 90)
                    const endNinetyDays = new Date(today)
                    endNinetyDays.setDate(endNinetyDays.getDate() - 1)
                    return { start: formatDate(ninetyDays), end: formatDate(endNinetyDays) }
                  case 'custom':
                    if (customDateRange) {
                      return {
                        start: formatDate(customDateRange.start),
                        end: formatDate(customDateRange.end),
                      }
                    }
                    return null
                  default:
                    return null
                }
              })()}
              selectedAccountId={selectedAccountId}
            />
          </div>
        )}

        {/* FatigueDashboardPresentationを使用（テーブルのみ表示） */}
        <div className="px-4">
          <FatigueDashboardPresentation
            // アカウント関連
            accounts={accounts}
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
            dataSource="api"
            lastUpdateTime={lastUpdateTime}
            // 日付範囲
            dateRange={dateRange}
            onDateRangeChange={(range) => setDateRange(range)}
            customDateRange={customDateRange}
            // 認証情報（追加）
            accessToken={accounts.find((acc) => acc.accountId === selectedAccountId)?.accessToken}
            onCustomDateRange={(start, end) => {
              logFilter('MainDashboard', 'Custom date range selected', {
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
      </div>
    </div>
  )
}
