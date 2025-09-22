import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useConvex, useMutation, useAction } from 'convex/react'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { AccountSelector } from '../features/meta-api/account/AccountSelector'
import { DateRangeFilter } from '../features/meta-api/components/DateRangeFilter'
import type { DateRangeFilter as DateRangeFilterType } from '../features/meta-api/hooks/useAdFatigueSimplified'
import { MetaAccount } from '@/types'
import { MetaCampaignBreakdown } from '../components/MetaCampaignBreakdown'
import { GoogleAdsBreakdown } from '../components/dashboard/GoogleAdsBreakdown'
import { GoogleAdsBreakdownFormula } from '../components/dashboard/GoogleAdsBreakdownFormula'
import { MetaAdsBreakdownFormula } from '../components/dashboard/MetaAdsBreakdownFormula'
import { YahooAdsBreakdownFormula } from '../components/dashboard/YahooAdsBreakdownFormula'
import { PlatformKPIFormula } from '../components/dashboard/PlatformKPIFormula'
import {
  ChartBarSquareIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ChevronDownIcon,
  CameraIcon,
  BookmarkIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { BookmarkIcon as BookmarkSolidIcon } from '@heroicons/react/24/solid'
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceArea,
  ReferenceLine,
} from 'recharts'
import { motion, AnimatePresence } from 'framer-motion'
import { generateYahooAdsData } from '../utils/mockData/yahooAds'
// import { generateGoogleAdsData } from '../utils/mockData/googleAds'  // 実データのみ使用するため無効化
import { generateMetaAdsData } from '../utils/mockData/metaAds'
import {
  saveSelectedAccount,
  getSelectedAccount,
  saveCachedData,
  getCachedData,
  clearCachedData,
} from '@/utils/localStorage'
import { logAPI, logState } from '../utils/debugLogger'
import { testGoogleAdsDirectly } from '../utils/testGoogleAdsApi'

export default function KPIViewDashboardBreakdown() {
  const convex = useConvex()
  const convexAction = useAction  // Convex Action呼び出し用
  const getGoogleAdsCostSummary = useAction(api.googleAds.getCostSummary)
  const fetchGoogleAdsDirectData = useAction(api.googleAds.fetchDirectApiData)
  const getGoogleAdsConfig = useQuery(api.googleAds.getConfig)
  const getAllGoogleAdsCampaigns = useAction(api.googleAds.getAllCampaigns)
  const [data, setData] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [accounts, setAccounts] = useState<MetaAccount[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true)
  const [metaSpendData, setMetaSpendData] = useState<any>(null)
  const [dailyMetaData, setDailyMetaData] = useState<any[]>([])
  const [googleAdsData, setGoogleAdsData] = useState<any>(null)
  const [yahooAdsData, setYahooAdsData] = useState<any>(null)
  const [googleAdsDebugInfo, setGoogleAdsDebugInfo] = useState<any>(null)

  // Google Ads API直接呼び出し用のstate
  const [googleAdsSpendData, setGoogleAdsSpendData] = useState<any>(null)
  const [googleAdsConfigState, setGoogleAdsConfigState] = useState<any>(null)
  const [dailyGoogleAdsData, setDailyGoogleAdsData] = useState<any[]>([])

  // ブレークダウン展開状態の管理
  const [expandedMetric, setExpandedMetric] = useState<'cv' | 'cpo' | 'cost' | null>(null)

  // Convex接続状態の監視
  const [convexConnectionStatus, setConvexConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting')

  // ドラッグ選択用のstate（表示範囲のみ管理、データは変更しない）
  const [brushRange, setBrushRange] = useState<{ start: number; end: number } | null>(null)
  const [originalDateRange, setOriginalDateRange] = useState<DateRangeFilterType>('current_month')

  // ドラッグ選択用のstate
  const [isDragging, setIsDragging] = useState(false)
  const [dragStartIndex, setDragStartIndex] = useState<number | null>(null)
  const [dragEndIndex, setDragEndIndex] = useState<number | null>(null)

  // 媒体別表示用のstate
  const [showMeta, setShowMeta] = useState(true)
  const [showGoogle, setShowGoogle] = useState(true)
  const [showYahoo, setShowYahoo] = useState(true)
  const [showStackedCv, setShowStackedCv] = useState(true) // true: 積み上げ表示, false: 合計表示

  // 日足/週足/月足切り替え用のstate（localStorage保持）
  const [viewMode, setViewMode] = useState<'daily' | 'weekly' | 'monthly'>(() => {
    // localStorageから保存された値を取得
    const savedMode = localStorage.getItem('viewMode')
    if (savedMode === 'daily' || savedMode === 'weekly' || savedMode === 'monthly') {
      return savedMode
    }
    // デフォルトは日足（後でuseEffectで期間に応じて調整）
    return 'daily'
  })

  // 目標値設定用のstate
  const [showTargetModal, setShowTargetModal] = useState(false)
  const [targetCV, setTargetCV] = useState<number | null>(() => {
    const saved = localStorage.getItem('targetCV')
    return saved ? Number(saved) : null
  })
  const [targetCPO, setTargetCPO] = useState<number | null>(() => {
    const saved = localStorage.getItem('targetCPO')
    return saved ? Number(saved) : null
  })

  // 期間レポート保存用のstate
  const [showSnapshotList, setShowSnapshotList] = useState(false)
  const saveSnapshotMutation = useMutation(api.kpiSnapshots.saveSnapshot)
  const deleteSnapshotMutation = useMutation(api.kpiSnapshots.deleteSnapshot)
  const snapshots = useQuery(api.kpiSnapshots.listSnapshots, { limit: 20 })

  // 期間選択の状態管理
  const [dateRange, setDateRange] = useState<DateRangeFilterType>(() => {
    const savedDateRange = localStorage.getItem('selectedDateRange')
    return (savedDateRange as DateRangeFilterType) || 'last_7d'
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
  const [, setCacheAge] = useState<number>(Infinity)

  // メトリクスの展開切り替え
  const toggleMetricExpansion = (metric: 'cv' | 'cpo') => {
    setExpandedMetric(prev => prev === metric ? null : metric)
  }

  // Convex接続状態の監視
  useEffect(() => {
    // Convex接続状態をチェック
    const checkConnection = async () => {
      try {
        // 簡単なクエリを実行して接続を確認
        const testQuery = await convex.query(api.googleAds.getConfig)
        setConvexConnectionStatus('connected')
      } catch (error: any) {
        if (error.message?.includes('WebSocket') || error.message?.includes('ws://') || error.message?.includes('wss://')) {
          setConvexConnectionStatus('disconnected')
          console.error('❌ Convex WebSocket接続エラー:', error.message)
        } else {
          setConvexConnectionStatus('connecting')
        }
      }
    }

    checkConnection()
    // 10秒ごとに接続状態をチェック
    const interval = setInterval(checkConnection, 10000)

    return () => clearInterval(interval)
  }, [convex])

  // 期間選択が変更されたらlocalStorageに保存
  useEffect(() => {
    localStorage.setItem('selectedDateRange', dateRange)
    logState('KPIViewDashboard', '期間選択を保存', { dateRange })
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
      logState('KPIViewDashboard', 'カスタム期間を保存', customDateRange)
    }
  }, [customDateRange])

  // Convexからアカウント情報を取得
  const loadAccountsFromConvex = useCallback(async () => {
    try {
      setIsLoadingAccounts(true)
      console.log('📱 Convexからアカウント情報を取得中...')

      const convexAccounts = await convex.query(api.metaAccounts.getAccounts)

      if (!convexAccounts || convexAccounts.length === 0) {
        throw new Error(
          'アカウントが登録されていません。設定画面からアカウントを接続してください。'
        )
      }

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

      const savedAccountId = getSelectedAccount()
      const savedAccount = savedAccountId
        ? formattedAccounts.find((acc) => acc.accountId === savedAccountId)
        : null

      const accountToUse =
        savedAccount || formattedAccounts.find((acc) => acc.isActive) || formattedAccounts[0]

      setSelectedAccountId(accountToUse.accountId)
      saveSelectedAccount(accountToUse.accountId)

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

  // Google Ads設定を取得
  useEffect(() => {
    const loadGoogleAdsConfig = async () => {
      try {
        const config = await convex.query(api.googleAds.getConfig)
        setGoogleAdsConfigState(config)
        console.log('✅ Google Ads設定取得完了:', config?.isConnected ? '接続済み' : '未接続')
      } catch (error) {
        console.error('❌ Google Ads設定取得エラー:', error)
      }
    }
    loadGoogleAdsConfig()
  }, [convex])

  // 日付フォーマット関数
  const formatDateToISO = (date: Date | null) => {
    if (!date) return ''
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // DateRangeが変更された時に元の値を保存
  useEffect(() => {
    if (dateRange !== 'custom') {
      setOriginalDateRange(dateRange)
      console.log('元のDateRangeを保存:', dateRange)
    }
  }, [dateRange])

  // 日付範囲の計算
  const calculateDateRange = useMemo(() => {
    let startDate: Date | null = null
    let endDate: Date | null = null
    const today = new Date()
    today.setHours(23, 59, 59, 999)

    switch (dateRange) {
      case 'today':
        startDate = new Date()
        startDate.setHours(0, 0, 0, 0)
        endDate = today
        break
      case 'yesterday':
        startDate = new Date(today)
        startDate.setDate(startDate.getDate() - 1)
        startDate.setHours(0, 0, 0, 0)
        endDate = new Date(startDate)
        endDate.setHours(23, 59, 59, 999)
        break
      case 'last_3d':
        startDate = new Date(today)
        startDate.setDate(startDate.getDate() - 2)
        startDate.setHours(0, 0, 0, 0)
        endDate = today
        break
      case 'last_7d':
        startDate = new Date(today)
        startDate.setDate(startDate.getDate() - 6)
        startDate.setHours(0, 0, 0, 0)
        endDate = today
        break
      case 'last_14d':
        startDate = new Date(today)
        startDate.setDate(startDate.getDate() - 13)
        startDate.setHours(0, 0, 0, 0)
        endDate = today
        break
      case 'last_30d':
        startDate = new Date(today)
        startDate.setDate(startDate.getDate() - 29)
        startDate.setHours(0, 0, 0, 0)
        endDate = today
        break
      case 'last_60d':
        startDate = new Date(today)
        startDate.setDate(startDate.getDate() - 59)
        startDate.setHours(0, 0, 0, 0)
        endDate = today
        break
      case 'last_90d':
        startDate = new Date(today)
        startDate.setDate(startDate.getDate() - 89)
        startDate.setHours(0, 0, 0, 0)
        endDate = today
        break
      case 'this_month':
        startDate = new Date(today.getFullYear(), today.getMonth(), 1)
        startDate.setHours(0, 0, 0, 0)
        endDate = today
        break
      case 'last_month':
        startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1)
        startDate.setHours(0, 0, 0, 0)
        endDate = new Date(today.getFullYear(), today.getMonth(), 0)
        endDate.setHours(23, 59, 59, 999)
        console.log('📅 先月の範囲計算:', {
          today: today.toISOString(),
          month: today.getMonth(),
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        })
        break
      case 'last_3_months':
        startDate = new Date(today)
        startDate.setMonth(startDate.getMonth() - 3)
        startDate.setHours(0, 0, 0, 0)
        endDate = today
        break
      case 'last_6_months':
        startDate = new Date(today)
        startDate.setMonth(startDate.getMonth() - 6)
        startDate.setHours(0, 0, 0, 0)
        endDate = today
        break
      case 'last_12_months':
        startDate = new Date(today)
        startDate.setMonth(startDate.getMonth() - 12)
        startDate.setHours(0, 0, 0, 0)
        endDate = today
        break
      case 'custom':
        if (customDateRange) {
          startDate = customDateRange.start
          endDate = customDateRange.end
        }
        break
    }

    return { startDate, endDate }
  }, [dateRange, customDateRange])


  // Meta APIから広告費を取得
  const fetchMetaSpendData = useCallback(async (
    accountId: string,
    startDate: Date,
    endDate: Date,
    withDailyData: boolean = false
  ) => {
    const account = accounts.find(acc => acc.accountId === accountId)
    if (!account?.accessToken) return null

    try {
      setIsLoading(true)
      const baseUrl = 'https://graph.facebook.com/v23.0'
      const cleanAccountId = account.accountId.replace('act_', '')
      const url = new URL(`${baseUrl}/act_${cleanAccountId}/insights`)

      const params: any = {
        access_token: account.accessToken,
        time_range: JSON.stringify({
          since: formatDateToISO(startDate),
          until: formatDateToISO(endDate),
        }),
        level: 'account',
        fields: 'spend,impressions,clicks,actions,ctr,cpm,cpc,date_start,date_stop,account_currency',
        limit: withDailyData ? '500' : '1',
      }

      if (withDailyData) {
        params.time_increment = '1'
      }

      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value)
      })

      console.log('📊 Meta APIからデータ取得中...', {
        withDailyData,
        since: formatDateToISO(startDate),
        until: formatDateToISO(endDate),
        url: url.toString()
      })
      const response = await fetch(url.toString())
      const result = await response.json()

      if (withDailyData && result.data) {
        const dailyData = result.data.map((item: any) => ({
          date: item.date_start,
          spend: parseFloat(item.spend || '0'),
          impressions: parseInt(item.impressions || '0'),
          clicks: parseInt(item.clicks || '0'),
          ctr: parseFloat(item.ctr || '0'),
          cpm: parseFloat(item.cpm || '0'),
          cpc: parseFloat(item.cpc || '0'),
          actions: item.actions || [],
        }))
        console.log('✅ Meta API日別データ取得完了:', dailyData.length, '日分')
        return dailyData
      } else if (result.data?.[0]) {
        console.log('🔍 Meta API生データ:', result.data[0])
        const metaData = {
          spend: parseFloat(result.data[0].spend || '0'),
          impressions: parseInt(result.data[0].impressions || '0'),
          clicks: parseInt(result.data[0].clicks || '0'),
          ctr: parseFloat(result.data[0].ctr || '0'),
          cpm: parseFloat(result.data[0].cpm || '0'),
          cpc: parseFloat(result.data[0].cpc || '0'),
          actions: result.data[0].actions || [],
        }
        console.log('✅ Meta APIデータ取得完了:', metaData)
        return metaData
      }
    } catch (error) {
      console.error('Meta API取得エラー:', error)
    } finally {
      setIsLoading(false)
    }
    return null
  }, [accounts])

  // Google Ads APIから広告費を取得（Convex経由でCORS回避）
  const fetchGoogleAdsSpendData = useCallback(async (
    startDate: Date,
    endDate: Date,
    withDailyData: boolean = false
  ) => {
    if (!googleAdsConfigState?.isConnected) {
      console.log('Google Ads未接続')
      return null
    }

    try {
      console.log('📊 Google Ads APIからデータ取得中（Convex経由）...', {
        withDailyData,
        since: formatDateToISO(startDate),
        until: formatDateToISO(endDate)
      })

      // ConvexのActionを呼び出し（CORS回避）
      const result = await fetchGoogleAdsDirectData({
        startDate: formatDateToISO(startDate),
        endDate: formatDateToISO(endDate),
        withDailyData
      })

      console.log('📥 Convex Action結果:', result)

      if (!result || !result.success) {
        console.error('Google Ads API エラー:', result?.error || 'Unknown error')
        return null
      }

      if (!result.data) {
        console.log('⚠️ Google Ads APIレスポンスにデータなし')
        return null
      }

      if (withDailyData && result.data.dailyData) {
        console.log('✅ Google Ads日別データ取得完了:', result.data.dailyData.length, '日分')
        return result.data.dailyData
      } else {
        const googleAdsData = {
          spend: result.data.totalSpend || 0,
          clicks: result.data.totalClicks || 0,
          impressions: result.data.totalImpressions || 0,
          conversions: result.data.totalConversions || 0,
          ctr: result.data.ctr || 0,
          cpc: result.data.cpc || 0,
          cpa: result.data.cpa || 0,
          campaignTypeBreakdown: result.data.campaignTypeBreakdown || null,
        }
        console.log('✅ Google Ads集計データ取得完了:', googleAdsData)
        return googleAdsData
      }
    } catch (error) {
      console.error('Google Ads API取得エラー:', error)
      return null
    }
  }, [googleAdsConfigState, formatDateToISO, fetchGoogleAdsDirectData])


  // データの統合取得
  useEffect(() => {
    const fetchAllData = async () => {
      const { startDate, endDate } = calculateDateRange
      if (!startDate || !endDate) return

      console.log('📆 データ取得期間:', {
        startDate: formatDateToISO(startDate),
        endDate: formatDateToISO(endDate),
        dateRange,
        selectedAccountId
      })

      // Google Adsデータを取得（実データのみ、モックデータは使用しない）
      const debugInfo = {
        config: {
          isConnected: getGoogleAdsConfig?.isConnected,
          hasAccessToken: !!getGoogleAdsConfig?.accessToken,
          customerId: getGoogleAdsConfig?.customerId,
          tokenExpiresAt: getGoogleAdsConfig?.tokenExpiresAt
        },
        request: {
          startDate: formatDateToISO(startDate),
          endDate: formatDateToISO(endDate)
        },
        response: null as any,
        error: null as any,
        timestamp: new Date().toISOString()
      }

      if (getGoogleAdsConfig?.isConnected) {
        try {
          debugInfo.request.status = 'API呼び出し中...'
          setGoogleAdsDebugInfo(debugInfo)

          const googleSummary = await getGoogleAdsCostSummary({
            startDate: formatDateToISO(startDate),
            endDate: formatDateToISO(endDate)
          })

          debugInfo.response = {
            dataCount: googleSummary.length,
            rawData: googleSummary,
            firstItem: googleSummary[0] || null
          }

          // APIデータを集計
          const totalCost = googleSummary.reduce((sum: number, item: any) => sum + (item.cost || 0), 0)
          const totalImpressions = googleSummary.reduce((sum: number, item: any) => sum + (item.impressions || 0), 0)
          const totalClicks = googleSummary.reduce((sum: number, item: any) => sum + (item.clicks || 0), 0)
          const totalConversions = googleSummary.reduce((sum: number, item: any) => sum + (item.conversions || 0), 0)

          const googleAdsDataToSet = {
            totalCost,
            totalImpressions,
            totalClicks,
            totalConversions,
            cost: totalCost,
            impressions: totalImpressions,
            clicks: totalClicks,
            conversions: totalConversions,
            current: googleSummary,
            data: googleSummary
          }

          debugInfo.response.aggregated = {
            totalCost,
            totalImpressions,
            totalClicks,
            totalConversions
          }
          debugInfo.request.status = 'API呼び出し成功'
          setGoogleAdsDebugInfo(debugInfo)
          setGoogleAdsData(googleAdsDataToSet)
        } catch (error: any) {
          debugInfo.error = {
            message: error.message || 'Unknown error',
            stack: error.stack,
            timestamp: new Date().toISOString()
          }
          debugInfo.request.status = 'API呼び出し失敗'
          setGoogleAdsDebugInfo(debugInfo)

          // エラー時は実データがないことを明示（モックデータは使用しない）
          setGoogleAdsData({
            totalCost: 0,
            totalImpressions: 0,
            totalClicks: 0,
            totalConversions: 0,
            cost: 0,
            impressions: 0,
            clicks: 0,
            conversions: 0,
            current: [],
            data: []
          })
        }
      } else {
        debugInfo.request.status = 'Google Ads未接続'
        setGoogleAdsDebugInfo(debugInfo)

        // 未接続時は実データがないことを明示（モックデータは使用しない）
        setGoogleAdsData({
          totalCost: 0,
          totalImpressions: 0,
          totalClicks: 0,
          totalConversions: 0,
          cost: 0,
          impressions: 0,
          clicks: 0,
          conversions: 0,
          current: [],
          data: []
        })
      }

      // Yahoo Adsデータを取得（モック）
      const yahooData = generateYahooAdsData(startDate, endDate)
      console.log('🔴 Yahoo Adsデータ生成結果:', yahooData)
      setYahooAdsData({
        ...yahooData,
        cost: yahooData.totalCost,
        impressions: yahooData.totalImpressions,
        clicks: yahooData.totalClicks,
        conversions: yahooData.totalConversions,
        data: yahooData.current || {}
      })

      // ECForceデータは実データ（Convex）を使用するため、ここでは生成しない
      // Meta CVはConvexのECForce実データから取得する

      // Meta広告データ取得（アカウント選択時のみ）
      if (selectedAccountId) {
        const metaData = await fetchMetaSpendData(selectedAccountId, startDate, endDate, false)
        console.log('🔷 Meta広告費取得結果:', {
          dateRange,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          metaData,
          spend: metaData?.spend
        })

        // 日別データを取得（エラーが発生してもdailyMetaDataは更新する）
        try {
          const dailyData = await fetchMetaSpendData(selectedAccountId, startDate, endDate, true)
          console.log('📡 fetchMetaSpendData結果 (daily):', dailyData)
          if (dailyData && Array.isArray(dailyData)) {
            console.log('✅ dailyMetaDataにセット:', dailyData.length, '日分', '最初のデータ:', dailyData[0])
            setDailyMetaData(dailyData)
          } else {
            console.warn('⚠️ dailyMetaDataは空または無効:', dailyData)
            setDailyMetaData([])
          }
        } catch (error) {
          console.error('❌ 日別Meta広告データ取得エラー:', error)
          setDailyMetaData([])
        }

        const periodDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
        const previousStart = new Date(startDate)
        previousStart.setDate(previousStart.getDate() - periodDays - 1)
        const previousEnd = new Date(startDate)
        previousEnd.setDate(previousEnd.getDate() - 1)

        const previousMetaData = await fetchMetaSpendData(selectedAccountId, previousStart, previousEnd, false)
        console.log('🔷 前期間Meta広告費取得結果:', {
          previousStart: previousStart.toISOString(),
          previousEnd: previousEnd.toISOString(),
          previousMetaData,
          spend: previousMetaData?.spend
        })

        setMetaSpendData({
          current: metaData,
          previous: previousMetaData
        })
      }

      // Google Adsデータを取得（直接API呼び出し）
      if (googleAdsConfigState?.isConnected) {
        // 集計データを取得
        const googleAdsData = await fetchGoogleAdsSpendData(startDate, endDate, false)
        console.log('🔷 Google Ads広告費取得結果:', {
          dateRange,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          googleAdsData,
          spend: googleAdsData?.spend,
          campaignTypeBreakdown: googleAdsData?.campaignTypeBreakdown
        })

        // 日別データを取得
        try {
          const dailyGoogleAds = await fetchGoogleAdsSpendData(startDate, endDate, true)
          console.log('📡 fetchGoogleAdsSpendData結果 (daily):', dailyGoogleAds)
          if (dailyGoogleAds && Array.isArray(dailyGoogleAds)) {
            console.log('✅ dailyGoogleAdsDataにセット:', dailyGoogleAds.length, '日分')
            setDailyGoogleAdsData(dailyGoogleAds)
          } else {
            console.warn('⚠️ dailyGoogleAdsDataは空または無効:', dailyGoogleAds)
            setDailyGoogleAdsData([])
          }
        } catch (error) {
          console.error('❌ 日別Google Adsデータ取得エラー:', error)
          setDailyGoogleAdsData([])
        }

        // 前期間のGoogle Adsデータも取得
        const periodDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
        const previousStart = new Date(startDate)
        previousStart.setDate(previousStart.getDate() - periodDays - 1)
        const previousEnd = new Date(startDate)
        previousEnd.setDate(previousEnd.getDate() - 1)

        const previousGoogleAdsData = await fetchGoogleAdsSpendData(previousStart, previousEnd, false)
        console.log('🔷 前期間Google Ads広告費取得結果:', {
          previousStart: previousStart.toISOString(),
          previousEnd: previousEnd.toISOString(),
          previousGoogleAdsData,
          spend: previousGoogleAdsData?.spend
        })

        // Google Adsデータを保存
        console.log('📊 Google AdsデータのcampaignTypeBreakdown:', {
          current: googleAdsData?.campaignTypeBreakdown,
          previous: previousGoogleAdsData?.campaignTypeBreakdown
        })
        setGoogleAdsSpendData({
          current: googleAdsData,
          previous: previousGoogleAdsData
        })
      }

      setLastUpdateTime(new Date())
    }

    // Google/Yahooモックデータは常に取得、Metaはアカウント選択時のみ
    if (!isLoadingAccounts) {
      fetchAllData()
    }
  }, [selectedAccountId, dateRange, customDateRange, isLoadingAccounts])

  // 初回ロード時
  useEffect(() => {
    loadAccountsFromConvex()
  }, [loadAccountsFromConvex])

  // 期間に応じてviewModeのデフォルト値を設定（localStorageに値がない場合のみ）
  useEffect(() => {
    const savedMode = localStorage.getItem('viewMode')
    if (!savedMode && calculateDateRange.startDate && calculateDateRange.endDate) {
      const diffInDays = Math.ceil(
        (calculateDateRange.endDate.getTime() - calculateDateRange.startDate.getTime()) /
        (1000 * 60 * 60 * 24)
      )
      // 3ヶ月（約90日）未満の場合は日足、それ以上は週足をデフォルトに
      const defaultMode = diffInDays < 90 ? 'daily' : 'weekly'
      setViewMode(defaultMode)
      localStorage.setItem('viewMode', defaultMode)
    }
  }, [calculateDateRange])

  // アカウント変更ハンドラー
  const handleAccountChange = async (accountId: string) => {
    setSelectedAccountId(accountId)
    saveSelectedAccount(accountId)
    const { startDate, endDate } = calculateDateRange
    if (startDate && endDate) {
      // Yahooモックデータを生成
      const yahooData = generateYahooAdsData(startDate, endDate)

      // Google Adsは実データのみ使用（モックデータは生成しない）
      // ECForceデータは実データ（Convex）を使用するため、ここでは生成しない

      // Metaデータを取得
      const metaData = await fetchMetaSpendData(accountId, startDate, endDate, false)
      setMetaSpendData({ current: metaData, previous: null })
    }
  }

  // カスタム日付範囲ハンドラー
  const handleCustomDateRange = (start: Date, end: Date) => {
    setCustomDateRange({ start, end })
  }


  // グラフ上でのドラッグ選択ハンドラー
  const handleChartMouseDown = (e: any) => {
    console.log('🔽 MouseDown event:', e)
    console.log('activeTooltipIndex:', e?.activeTooltipIndex)
    console.log('activeLabel:', e?.activeLabel)
    console.log('activePayload:', e?.activePayload)

    // Rechartsの新しいバージョンではactiveTooltipIndexが存在しない場合がある
    // activeLabelを使ってインデックスを取得
    if ((e && e.activeTooltipIndex !== undefined && e.activeTooltipIndex !== null) ||
        (e && e.activeLabel)) {
      // activeTooltipIndexが無い場合、activeLabelから探す
      let chartIndex = e.activeTooltipIndex
      if (chartIndex === undefined && e.activeLabel) {
        chartIndex = chartData.findIndex(item => item.date === e.activeLabel)
      }

      if (chartIndex === undefined || chartIndex === -1) {
        console.log('⚠️ インデックスが見つかりません')
        return
      }

      const dataPoint = chartData[chartIndex]

      // 現在の表示範囲での選択を開始（chartDataのインデックスをそのまま使用）
      console.log('✅ MouseDown詳細:', {
        chartIndex,
        date: dataPoint?.date,
        chartDataLength: chartData.length,
        currentBrushRange: brushRange
      })
      setIsDragging(true)
      setDragStartIndex(chartIndex)
      setDragEndIndex(chartIndex)
    } else {
      console.log('❌ activeTooltipIndexが取得できません')
    }
  }

  const handleChartMouseMove = (e: any) => {
    if (isDragging && e) {
      let chartIndex = e.activeTooltipIndex
      if (chartIndex === undefined && e.activeLabel) {
        chartIndex = chartData.findIndex(item => item.date === e.activeLabel)
      }

      if (chartIndex !== undefined && chartIndex !== -1) {
        console.log('MouseMove at index:', chartIndex, 'date:', chartData[chartIndex]?.date)
        setDragEndIndex(chartIndex)
      }
    }
  }

  const handleChartMouseUp = (e: any) => {
    if (isDragging && dragStartIndex !== null && dragEndIndex !== null) {
      const start = Math.min(dragStartIndex, dragEndIndex)
      const end = Math.max(dragStartIndex, dragEndIndex)

      // 新しい選択範囲を計算（既存のbrushRangeを考慮）
      let newStart = start
      let newEnd = end

      if (brushRange) {
        // すでに選択範囲がある場合、その範囲内での相対位置を絶対位置に変換
        newStart = brushRange.start + start
        newEnd = brushRange.start + end
      }

      console.log('ドラッグ選択完了:', {
        chartIndexRange: { start, end },
        newFullRange: { start: newStart, end: newEnd },
        dates: {
          start: fullChartData[newStart]?.date,
          end: fullChartData[newEnd]?.date
        }
      })

      if (start !== end) {
        setBrushRange({ start: newStart, end: newEnd })
      }

      setIsDragging(false)
      setDragStartIndex(null)
      setDragEndIndex(null)
    }
  }

  // 目標値を保存
  const handleSaveTargets = (cv: number | null, cpo: number | null) => {
    setTargetCV(cv)
    setTargetCPO(cpo)

    // LocalStorageに保存
    if (cv !== null) {
      localStorage.setItem('targetCV', cv.toString())
    } else {
      localStorage.removeItem('targetCV')
    }

    if (cpo !== null) {
      localStorage.setItem('targetCPO', cpo.toString())
    } else {
      localStorage.removeItem('targetCPO')
    }

    setShowTargetModal(false)
    console.log('目標値を保存:', { cv, cpo })
  }

  // 選択をリセット（シンプルな実装）
  const handleResetSelection = () => {
    console.log('Reset前:', {
      brushRange,
      dateRange,
      dragStartIndex,
      dragEndIndex
    })

    // すべての選択状態をリセット
    setBrushRange(null)
    setIsDragging(false)
    setDragStartIndex(null)
    setDragEndIndex(null)

    // もしcustomに変更されていたら元の期間に戻す
    if (dateRange === 'custom') {
      setDateRange(originalDateRange)
      setCustomDateRange(null)
    }

    console.log('Reset後:', {
      brushRange: null,
      dateRange: originalDateRange,
      allStatesCleared: true
    })
  }

  // KPIサマリー取得
  const { startDate, endDate } = calculateDateRange
  const kpiSummaryData = useQuery(
    api.ecforcePeriodAnalysis.getKPISummary,
    startDate && endDate
      ? {
          startDate: formatDateToISO(startDate),
          endDate: formatDateToISO(endDate),
          advertiser: undefined,
          compareWithPrevious: true,
        }
      : 'skip'
  )

  // グラフ用データ取得
  const trendData = useQuery(
    api.ecforcePeriodAnalysis.getTrendData,
    startDate && endDate
      ? {
          startDate: formatDateToISO(startDate),
          endDate: formatDateToISO(endDate),
          advertiser: undefined,
          granularity: 'daily',
        }
      : 'skip'
  )

  // 比較期間のラベルを取得
  const getComparisonLabel = useMemo(() => {
    switch (dateRange) {
      case 'today':
        return '前日比'
      case 'yesterday':
        return '前日比'
      case 'last_3d':
        return '前3日比'
      case 'last_7d':
        return '前週比'
      case 'last_14d':
        return '前2週比'
      case 'last_28d':
        return '前28日比'
      case 'last_30d':
        return '前30日比'
      case 'last_60d':
        return '前60日比'
      case 'last_90d':
        return '前90日比'
      case 'this_week':
        return '先週比'
      case 'last_week':
        return '前週比'
      case 'this_month':
        return '先月比'
      case 'last_month':
        return '前月比'
      case 'last_3_months':
        return '前3ヶ月比'
      case 'last_6_months':
        return '前6ヶ月比'
      case 'last_12_months':
        return '前年比'
      case 'custom':
        if (customDateRange) {
          const days = Math.ceil(
            (customDateRange.end.getTime() - customDateRange.start.getTime()) / (1000 * 60 * 60 * 24)
          )
          return `前${days}日比`
        }
        return '前期比'
      default:
        return '前期比'
    }
  }, [dateRange, customDateRange])

  // KPIメトリクスの計算
  // 月足データ集約関数
  const aggregateToMonthly = (dailyData: any[]) => {
    if (!dailyData || dailyData.length === 0) return []

    // データを月ごとにグループ化
    const monthlyMap = new Map<string, {
      startDate: string
      endDate: string
      cv: number
      metaCv: number
      googleCv: number
      yahooCv: number
      spend: number
      metaSpend: number
      googleSpend: number
      yahooSpend: number
      totalSpend: number
      displayCv: number
      displaySpend: number
      displayCpo: number
      cpo: number
    }>()

    dailyData.forEach(day => {
      // originalDateまたはdateから日付を取得
      const dateStr = day.originalDate || day.date
      if (!dateStr || dateStr === 'Invalid date') return

      // 既に集約されたデータ（週足形式など）の場合はスキップ
      if (dateStr.includes('週') || dateStr.includes('月')) return

      // 日付をパース（YYYY-MM-DD形式のみ処理）
      const dateParts = dateStr.split('-')
      if (dateParts.length !== 3) return

      // 数値に変換できるか確認
      const year = parseInt(dateParts[0])
      const month = parseInt(dateParts[1])
      const dayNum = parseInt(dateParts[2])

      if (isNaN(year) || isNaN(month) || isNaN(dayNum)) return

      const date = new Date(year, month - 1, dayNum)

      // 月のキーを生成（YYYY-MM形式）
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, {
          startDate: dateStr,
          endDate: dateStr,
          cv: 0,
          metaCv: 0,
          googleCv: 0,
          yahooCv: 0,
          spend: 0,
          metaSpend: 0,
          googleSpend: 0,
          yahooSpend: 0,
          totalSpend: 0,
          displayCv: 0,
          displaySpend: 0,
          displayCpo: 0,
          cpo: 0
        })
      }

      const monthData = monthlyMap.get(monthKey)!

      // 日付範囲を更新
      if (dateStr < monthData.startDate) monthData.startDate = dateStr
      if (dateStr > monthData.endDate) monthData.endDate = dateStr

      // データを累積
      monthData.cv += day.cv || 0
      monthData.metaCv += day.metaCv || 0
      monthData.googleCv += day.googleCv || 0
      monthData.yahooCv += day.yahooCv || 0
      monthData.spend += day.spend || 0
      monthData.metaSpend += day.metaSpend || 0
      monthData.googleSpend += day.googleSpend || 0
      monthData.yahooSpend += day.yahooSpend || 0
      monthData.totalSpend += day.totalSpend || 0

      // display用の値も集計（チェックボックスでフィルタされた値）
      monthData.displayCv += day.displayCv || 0
      monthData.displaySpend += day.displaySpend || 0
    })

    // 月ごとのCPOを計算してソート
    return Array.from(monthlyMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([monthKey, monthData]) => {
        const monthParts = monthKey.split('-')
        if (monthParts.length < 2) return null

        const [year, monthNum] = monthParts
        const displayDate = `${parseInt(year)}/${parseInt(monthNum)}月`

        // 月のCPOを再計算
        const monthCpo = monthData.displayCv > 0 ? Math.round(monthData.displaySpend / monthData.displayCv) : 0

        return {
          ...monthData,
          date: displayDate,
          originalDate: monthData.startDate,
          displayCpo: monthCpo,
          cpo: monthCpo
        }
      })
      .filter(item => item !== null)
  }

  // 週足データ集約関数
  const aggregateToWeekly = (dailyData: any[]) => {
    if (!dailyData || dailyData.length === 0) return []

    // データを週ごとにグループ化（月曜日を週の開始日とする）
    const weeklyMap = new Map<string, {
      startDate: string
      endDate: string
      cv: number
      metaCv: number
      googleCv: number
      yahooCv: number
      spend: number
      metaSpend: number
      googleSpend: number
      yahooSpend: number
      totalSpend: number
      displayCv: number
      displaySpend: number
      displayCpo: number
      cpo: number
    }>()

    dailyData.forEach(day => {
      // originalDateまたはdateから日付を取得
      const dateStr = day.originalDate || day.date
      if (!dateStr || dateStr === 'Invalid date') return

      // 既に集約されたデータ（週足・月足形式など）の場合はスキップ
      if (dateStr.includes('週') || dateStr.includes('月')) return

      // 日付をパース（YYYY-MM-DD形式のみ処理）
      const dateParts = dateStr.split('-')
      if (dateParts.length !== 3) return

      // 数値に変換できるか確認
      const year = parseInt(dateParts[0])
      const month = parseInt(dateParts[1])
      const dayNum = parseInt(dateParts[2])

      if (isNaN(year) || isNaN(month) || isNaN(dayNum)) return

      const date = new Date(year, month - 1, dayNum)

      // 月曜日を週の開始日として週のキーを作成
      const dayOfWeek = date.getDay()
      const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1 // 日曜日の場合は6日前、それ以外はdayOfWeek - 1日前が月曜日
      const monday = new Date(date)
      monday.setDate(date.getDate() - diff)

      const weekKey = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`

      if (!weeklyMap.has(weekKey)) {
        const sunday = new Date(monday)
        sunday.setDate(monday.getDate() + 6)

        weeklyMap.set(weekKey, {
          startDate: weekKey,
          endDate: `${sunday.getFullYear()}-${String(sunday.getMonth() + 1).padStart(2, '0')}-${String(sunday.getDate()).padStart(2, '0')}`,
          cv: 0,
          metaCv: 0,
          googleCv: 0,
          yahooCv: 0,
          spend: 0,
          metaSpend: 0,
          googleSpend: 0,
          yahooSpend: 0,
          totalSpend: 0,
          displayCv: 0,
          displaySpend: 0,
          displayCpo: 0,
          cpo: 0
        })
      }

      const week = weeklyMap.get(weekKey)!

      // データを累積
      week.cv += day.cv || 0
      week.metaCv += day.metaCv || 0
      week.googleCv += day.googleCv || 0
      week.yahooCv += day.yahooCv || 0
      week.spend += day.spend || 0
      week.metaSpend += day.metaSpend || 0
      week.googleSpend += day.googleSpend || 0
      week.yahooSpend += day.yahooSpend || 0
      week.totalSpend += day.totalSpend || 0

      // display用の値も集計（チェックボックスでフィルタされた値）
      week.displayCv += day.displayCv || 0
      week.displaySpend += day.displaySpend || 0
    })

    // 週ごとのCPOを計算してソート
    return Array.from(weeklyMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([weekKey, week]) => {
        const weekStartParts = week.startDate.split('-')
        const displayDate = `${parseInt(weekStartParts[1])}/${parseInt(weekStartParts[2])}週`

        // 週のCPOを再計算
        const weekCpo = week.displayCv > 0 ? Math.round(week.displaySpend / week.displayCv) : 0

        return {
          ...week,
          date: displayDate,
          originalDate: week.startDate,
          displayCpo: weekCpo,
          cpo: weekCpo
        }
      })
  }

  const calculateKPIMetrics = useMemo(() => {
    // Meta広告費、Google広告費、Yahoo広告費を合算
    console.log('📊 メトリクス計算:', {
      selectedAccountId,
      metaSpendData: metaSpendData?.current,
      metaSpend: metaSpendData?.current?.spend,
      dateRange
    })
    const metaCost = metaSpendData?.current?.spend || 0
    const googleCost = googleAdsSpendData?.current?.spend || googleAdsData?.cost || 0  // API直接呼び出しデータを優先
    const yahooCost = yahooAdsData?.cost || 0
    console.log('💰 広告費計算:', {
      metaCost,
      googleCost,
      googleAdsSpendData: googleAdsSpendData?.current,
      yahooCost,
      googleAdsData,
      yahooAdsData,
      total: metaCost + googleCost + yahooCost
    })
    const cost = metaCost + googleCost + yahooCost || kpiSummaryData?.current?.cost || 0

    // クリック数も統合
    const metaClicks = metaSpendData?.current?.clicks || 0
    const googleAdsClicks = googleAdsSpendData?.current?.clicks || googleAdsData?.clicks || 0
    const yahooClicks = yahooAdsData?.clicks || 0
    const totalClicks = metaClicks + googleAdsClicks + yahooClicks

    // 各媒体のCV数を計算（Meta CVはConvexの実データから取得）
    const metaConversions = kpiSummaryData?.current?.cvOrder || 0
    const googleConversionsValue = googleAdsSpendData?.current?.conversions || googleAdsData?.conversions || 0
    const yahooConversionsValue = yahooAdsData?.conversions || 0

    // 全体のCV数（各媒体のCVを合算）
    const cv = metaConversions + googleConversionsValue + yahooConversionsValue
    const sales = kpiSummaryData?.current?.salesAmount || 0

    // クリック数はすでに上で計算済み（totalClicks）
    const clicks = totalClicks || kpiSummaryData?.current?.accessCount || 0

    // インプレッションを合算
    const metaImpressions = metaSpendData?.current?.impressions || 0
    const googleImpressions = googleAdsSpendData?.current?.impressions || googleAdsData?.impressions || 0
    const yahooImpressions = yahooAdsData?.impressions || 0
    const impressions = metaImpressions + googleImpressions + yahooImpressions || 0

    // 計算指標
    const cpo = cv > 0 ? cost / cv : 0
    const roas = cost > 0 ? sales / cost : 0
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0
    const cvr = clicks > 0 ? (cv / clicks) * 100 : 0
    const cpc = clicks > 0 ? cost / clicks : 0
    const cpm = impressions > 0 ? (cost / impressions) * 1000 : 0

    // 前期比較データ
    const previousMetaCost = metaSpendData?.previous?.spend || 0
    const previousGoogleCost = googleAdsSpendData?.previous?.spend || googleAdsData?.previous?.cost || 0
    const previousYahooCost = 0  // Yahooの前期データは今回は扱わない
    const previousCost = previousMetaCost + previousGoogleCost + previousYahooCost || kpiSummaryData?.previous?.cost || 0

    const previousCv = kpiSummaryData?.previous?.cvOrder || 0
    const previousSales = kpiSummaryData?.previous?.salesAmount || 0

    const previousMetaClicks = metaSpendData?.previous?.clicks || 0
    const previousGoogleClicks = googleAdsSpendData?.previous?.clicks || googleAdsData?.previous?.clicks || 0
    const previousYahooClicks = 0  // Yahooの前期データは今回は扱わない
    const previousClicks = previousMetaClicks + previousGoogleClicks + previousYahooClicks || kpiSummaryData?.previous?.accessCount || 0

    const previousMetaImpressions = metaSpendData?.previous?.impressions || 0
    const previousGoogleImpressions = googleAdsData?.previous?.impressions || 0
    const previousImpressions = previousMetaImpressions + previousGoogleImpressions || 0

    const previousCpo = previousCv > 0 ? previousCost / previousCv : 0
    const previousRoas = previousCost > 0 ? previousSales / previousCost : 0
    const previousCtr = previousImpressions > 0 ? (previousClicks / previousImpressions) * 100 : 0
    const previousCvr = previousClicks > 0 ? (previousCv / previousClicks) * 100 : 0
    const previousCpc = previousClicks > 0 ? previousCost / previousClicks : 0

    // 変化率計算
    const changes = {
      cost: previousCost > 0 ? ((cost - previousCost) / previousCost) * 100 : 0,
      cv: previousCv > 0 ? ((cv - previousCv) / previousCv) * 100 : 0,
      cpo: previousCpo > 0 ? ((cpo - previousCpo) / previousCpo) * 100 : 0,
      sales: previousSales > 0 ? ((sales - previousSales) / previousSales) * 100 : 0,
      clicks: previousClicks > 0 ? ((clicks - previousClicks) / previousClicks) * 100 : 0,
      impressions: previousImpressions > 0 ? ((impressions - previousImpressions) / previousImpressions) * 100 : 0,
      roas: previousRoas > 0 ? ((roas - previousRoas) / previousRoas) * 100 : 0,
      ctr: previousCtr > 0 ? ((ctr - previousCtr) / previousCtr) * 100 : 0,
      cvr: previousCvr > 0 ? ((cvr - previousCvr) / previousCvr) * 100 : 0,
      cpc: previousCpc > 0 ? ((cpc - previousCpc) / previousCpc) * 100 : 0,
    }

    // Meta広告のCPOを計算
    const metaCPO = metaConversions > 0 ? metaCost / metaConversions : 0

    // Google広告のCV数とCPOを計算
    const googleConversions = googleConversionsValue  // 上で計算済みの値を使用
    const googleCPO = googleConversions > 0 ? googleCost / googleConversions : 0
    console.log('🔵 Google CV計算:', {
      googleAdsData,
      conversions: googleAdsData?.conversions,
      googleConversions,
      googleCost,
      googleCPO
    })

    // Yahoo広告のCV数とCPOを計算
    const yahooConversions = yahooConversionsValue  // 上で計算済みの値を使用
    const yahooCPO = yahooConversions > 0 ? yahooCost / yahooConversions : 0
    console.log('🔴 Yahoo CV計算:', {
      yahooAdsData,
      conversions: yahooAdsData?.conversions,
      yahooConversions,
      yahooCost,
      yahooCPO
    })

    return {
      // メイン指標
      cost,
      metaCost,
      googleCost,
      yahooCost,
      metaConversions,
      metaCPO,
      googleConversions,
      googleCPO,
      yahooConversions,
      yahooCPO,
      cv,
      cpo,
      sales,
      roas,
      // CVブレークダウン要素
      impressions,
      ctr,
      cvr,
      clicks,
      // CPOブレークダウン要素
      cpc,
      cpm,
      // 変化率
      changes
    }
  }, [metaSpendData, googleAdsData, yahooAdsData, kpiSummaryData])

  // グラフ用データ整形（ECForce、Meta、Google Ads、Yahoo Adsデータを統合）
  // 元のチャートデータを計算
  const fullChartData = useMemo(() => {
    const dataMap = new Map<string, {
      cv: number;
      metaCv: number;
      googleCv: number;
      yahooCv: number;
      spend: number;
      metaSpend: number;
      googleSpend: number;
      yahooSpend: number
    }>()

    // ConvexのECForce実データ（Meta CV）を集計
    if (trendData?.data) {
      trendData.data.forEach((item: any) => {
        const dateStr = item.date
        if (!dataMap.has(dateStr)) {
          dataMap.set(dateStr, { cv: 0, metaCv: 0, googleCv: 0, yahooCv: 0, spend: 0, metaSpend: 0, googleSpend: 0, yahooSpend: 0 })
        }
        const existing = dataMap.get(dateStr)!
        // ECForce実データのCVをMeta CVとして扱う
        const metaCvCount = item.cv || item.cvOrder || 0
        existing.metaCv += metaCvCount
        existing.cv += metaCvCount
      })
    }

    // Meta広告費の日別集計
    console.log('🔍 dailyMetaData確認:', {
      データ数: dailyMetaData.length,
      最初のデータ: dailyMetaData[0],
      dailyMetaData
    })
    dailyMetaData.forEach(item => {
      const dateStr = item.date
      if (!dataMap.has(dateStr)) {
        dataMap.set(dateStr, { cv: 0, metaCv: 0, googleCv: 0, yahooCv: 0, spend: 0, metaSpend: 0, googleSpend: 0, yahooSpend: 0 })
      }
      const existing = dataMap.get(dateStr)!
      const spendValue = item.spend || 0
      console.log(`💵 ${dateStr}: Meta広告費 = ¥${spendValue}`)
      existing.metaSpend += spendValue
      existing.spend += spendValue
    })

    // Google Ads API直接呼び出しの日別データを追加（優先）
    console.log('🔍 dailyGoogleAdsData確認:', {
      データ数: dailyGoogleAdsData.length,
      最初のデータ: dailyGoogleAdsData[0],
      dailyGoogleAdsData
    })
    if (dailyGoogleAdsData.length > 0) {
      dailyGoogleAdsData.forEach(item => {
        const dateStr = item.date
        if (!dataMap.has(dateStr)) {
          dataMap.set(dateStr, { cv: 0, metaCv: 0, googleCv: 0, yahooCv: 0, spend: 0, metaSpend: 0, googleSpend: 0, yahooSpend: 0 })
        }
        const existing = dataMap.get(dateStr)!
        const spendValue = item.spend || 0
        console.log(`💵 ${dateStr}: Google Ads広告費(API直接) = ¥${spendValue}`)
        existing.googleSpend += spendValue
        existing.spend += spendValue
        existing.googleCv += item.conversions || 0
        existing.cv += item.conversions || 0
      })
    }
    // Google Adsデータの日別集計を追加（フォールバック）
    else if (googleAdsData?.dailyData) {
      googleAdsData.dailyData.forEach((item: any) => {
        const dateStr = item.date
        if (!dataMap.has(dateStr)) {
          dataMap.set(dateStr, { cv: 0, metaCv: 0, googleCv: 0, yahooCv: 0, spend: 0, metaSpend: 0, googleSpend: 0, yahooSpend: 0 })
        }
        const existing = dataMap.get(dateStr)!
        existing.googleSpend += item.cost || 0
        existing.spend += item.cost || 0
        existing.googleCv += item.conversions || 0
        existing.cv += item.conversions || 0
      })
    }

    // Yahoo Adsデータの日別集計を追加
    if (yahooAdsData?.dailyData) {
      yahooAdsData.dailyData.forEach((item: any) => {
        const dateStr = item.date
        if (!dataMap.has(dateStr)) {
          dataMap.set(dateStr, { cv: 0, metaCv: 0, googleCv: 0, yahooCv: 0, spend: 0, metaSpend: 0, googleSpend: 0, yahooSpend: 0 })
        }
        const existing = dataMap.get(dateStr)!
        existing.yahooSpend += item.cost || 0
        existing.spend += item.cost || 0
        existing.yahooCv += item.conversions || 0
        existing.cv += item.conversions || 0
      })
    }


    const sortedData = Array.from(dataMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([dateStr, data]) => {
        const dateParts = dateStr.split('-')
        const displayDate = dateParts.length === 3
          ? `${parseInt(dateParts[1])}/${parseInt(dateParts[2])}`
          : dateStr

        const result = {
          date: displayDate,
          originalDate: dateStr,
          cv: data.cv,
          metaCv: data.metaCv,
          googleCv: data.googleCv,
          yahooCv: data.yahooCv,
          cpo: data.cv > 0 && data.spend > 0 ? Math.round(data.spend / data.cv) : 0,
          totalSpend: Math.round(data.spend),
          metaSpend: Math.round(data.metaSpend),
          googleSpend: Math.round(data.googleSpend),
          yahooSpend: Math.round(data.yahooSpend),
        }

        if (data.metaSpend > 0 || data.googleSpend > 0) {
          console.log(`📊 ${dateStr}: Meta=¥${result.metaSpend}, Google=¥${result.googleSpend}, 合計=¥${result.totalSpend}`)
        }

        return result
      })

    if (sortedData.length === 0) {
      const days = 7
      const data = []
      const today = new Date()

      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today)
        date.setDate(date.getDate() - i)
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        data.push({
          date: `${date.getMonth() + 1}/${date.getDate()}`,
          originalDate: `${year}-${month}-${day}`,
          cv: 0,
          metaCv: 0,
          googleCv: 0,
          yahooCv: 0,
          cpo: 0,
          totalSpend: 0,
          metaSpend: 0,
          googleSpend: 0,
          yahooSpend: 0,
        })
      }
      return data
    }

    return sortedData
  }, [dailyMetaData, trendData, googleAdsData, yahooAdsData, dailyGoogleAdsData])

  // 表示用のデータ（選択範囲がある場合はフィルタリング + チェックボックスに応じた動的計算）
  const chartData = useMemo(() => {
    let data = fullChartData
    if (brushRange && fullChartData.length > 0) {
      console.log('選択範囲でフィルタリング:', brushRange)
      data = fullChartData.slice(brushRange.start, brushRange.end + 1)
    }

    // チェックボックスの状態に応じてCPOを再計算
    const processedData = data.map(item => {
      // 選択された媒体のみのCV数と広告費を計算
      const selectedCv =
        (showMeta ? item.metaCv : 0) +
        (showGoogle ? item.googleCv : 0) +
        (showYahoo ? item.yahooCv : 0)

      const selectedSpend =
        (showMeta ? item.metaSpend : 0) +
        (showGoogle ? item.googleSpend : 0) +
        (showYahoo ? item.yahooSpend : 0)

      // 選択された媒体のみのCPOを計算
      const selectedCpo = selectedCv > 0 && selectedSpend > 0
        ? Math.round(selectedSpend / selectedCv)
        : 0

      return {
        ...item,
        // 動的に計算した値を追加（グラフ表示用）
        displayCv: selectedCv,
        displaySpend: selectedSpend,
        displayCpo: selectedCpo,
        // 元のcpoを動的計算値で上書き（Line chartで使用）
        cpo: selectedCpo
      }
    })

    // 表示モードに応じてデータを集約
    if (viewMode === 'weekly') {
      return aggregateToWeekly(processedData)
    } else if (viewMode === 'monthly') {
      return aggregateToMonthly(processedData)
    }

    return processedData
  }, [fullChartData, brushRange, showMeta, showGoogle, showYahoo, viewMode])

  // 数値フォーマット
  const formatNumber = (num: number) => {
    if (num < 1 && num > 0) {
      return num.toFixed(2)
    }
    return Math.round(num).toLocaleString('ja-JP')
  }

  const formatCurrency = (num: number) => `¥${formatNumber(Math.round(num))}`

  // 変化率の表示コンポーネント
  const ChangeIndicator = ({ value, isPositiveGood = true }: { value: number; isPositiveGood?: boolean }) => {
    const isPositive = value >= 0
    const isGood = isPositiveGood ? isPositive : !isPositive

    return (
      <div className={`flex items-center gap-1 text-sm font-medium ${isGood ? 'text-green-600' : 'text-red-600'}`}>
        {isPositive ? (
          <ArrowTrendingUpIcon className="w-4 h-4" />
        ) : (
          <ArrowTrendingDownIcon className="w-4 h-4" />
        )}
        <span>
          {getComparisonLabel} {isPositive ? '+' : ''}{Math.abs(Math.round(value))}%
        </span>
      </div>
    )
  }

  // 拡張版FormulaCard（クリック可能、展開状態表示）
  const FormulaCard = ({
    label,
    value,
    change,
    unit = '',
    isResult = false,
    isPositiveGood = true,
    isExpandable = false,
    isExpanded = false,
    onClick,
    breakdown,
  }: {
    label: string
    value: number | string
    change?: number
    unit?: string
    isResult?: boolean
    isPositiveGood?: boolean
    isExpandable?: boolean
    isExpanded?: boolean
    onClick?: () => void
    breakdown?: React.ReactNode
  }) => {
    // 広告費用、コンバージョン、CPO、ECForce CV、Meta CPOの場合の特別な横長レイアウト
    if ((label === '広告費用' || label === 'コンバージョン' || label === 'CPO' || label === 'ECForce CV' || label === 'Meta CPO') && isExpanded && breakdown) {
      const borderColor =
        label === '広告費用' ? 'border-blue-500' :
        label === 'コンバージョン' ? 'border-green-500' :
        label === 'ECForce CV' ? 'border-blue-500' :
        label === 'Meta CPO' ? 'border-orange-500' :
        'border-orange-500'
      const bgGradient =
        label === '広告費用' ? 'from-blue-50 to-white' :
        label === 'コンバージョン' ? 'from-green-50 to-white' :
        label === 'ECForce CV' ? 'from-blue-50 to-white' :
        label === 'Meta CPO' ? 'from-orange-50 to-white' :
        'from-orange-50 to-white'

      return (
        <div
          className={`relative rounded-xl p-6 shadow-2xl transform scale-105 z-50 bg-white border-2 ${borderColor} bg-gradient-to-br ${bgGradient} cursor-pointer transition-all duration-300`}
          onClick={onClick}
          style={{ minWidth: 'max-content' }}
        >
          <div className="flex items-center gap-6">
            {/* 左側：メイン値 */}
            <div>
              <div className="text-xs text-gray-500 font-medium tracking-wider mb-2">{label}</div>
              <div className="text-4xl font-bold text-gray-900">
                {typeof value === 'number' ?
                  (label === 'CPO' || label === 'Meta CPO' || label === '広告費用' ? formatCurrency(value) : formatNumber(value))
                  : value}
              </div>
              {change !== undefined && (
                <div className="mt-2">
                  <ChangeIndicator value={change} isPositiveGood={isPositiveGood} />
                </div>
              )}
            </div>

            {/* 中央：演算子 */}
            <div className="text-3xl text-gray-400">=</div>

            {/* 右側：内訳 */}
            {breakdown}
          </div>
        </div>
      )
    }

    // 通常のカードレイアウト
    return (
      <div
        className={`
          relative rounded-xl transition-all duration-300
          ${isExpanded
            ? 'p-8 min-w-[600px] shadow-2xl transform scale-110 z-50 bg-white'
            : 'p-6 min-w-[180px] shadow-md'
          }
          ${isResult && !isExpanded
            ? 'bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-orange-300'
            : isExpanded
            ? 'border-2 border-blue-500 bg-gradient-to-br from-blue-50 to-white'
            : 'bg-white border border-gray-200'
          }
          ${isExpandable
            ? 'cursor-pointer hover:shadow-lg hover:scale-105'
            : ''
          }
        `}
        onClick={onClick}
      >
        <div className={`font-medium tracking-wider mb-2 ${
          isExpanded ? 'text-lg text-blue-700' : 'text-xs text-gray-500'
        } ${
          label.includes('Meta') || label.includes('ECForce') ? '' : 'uppercase'
        }`}>
          {label}
        </div>
        <div className={`font-bold ${
          isExpanded ? 'text-5xl' : 'text-3xl'
        } ${isResult && !isExpanded ? 'text-orange-900' : 'text-gray-900'}`}>
          {typeof value === 'number'
            ? (unit === '¥' || unit === '円' ? formatCurrency(value) : formatNumber(value))
            : value
          }
          {unit && unit !== '¥' && unit !== '円' && <span className={`${isExpanded ? 'text-3xl' : 'text-xl'} ml-1`}>{unit}</span>}
        </div>
        {change !== undefined && (
          <div className={`${isExpanded ? 'mt-4' : 'mt-2'}`}>
            <ChangeIndicator value={change} isPositiveGood={isPositiveGood} />
          </div>
        )}
        {isExpandable && !isExpanded && (
          <div className="absolute bottom-2 right-2">
            <ChevronDownIcon
              className="w-4 h-4 text-gray-400"
            />
          </div>
        )}
        {isExpandable && isExpanded && (
          <div className="absolute top-2 right-2">
            <XMarkIcon
              className="w-6 h-6 text-gray-400 hover:text-gray-600"
            />
          </div>
        )}
        {isResult && !isExpanded && (
          <div className="absolute -top-2 -right-2 bg-orange-400 text-orange-900 text-xs font-bold px-2 py-1 rounded-full">
            結果
          </div>
        )}
        {breakdown && isExpanded && label !== '広告費用' && (
          <div className="mt-6 pt-6 border-t-2 border-gray-200">
            {breakdown}
          </div>
        )}
      </div>
    )
  }

  // サブフォーミュラカード（ブレークダウン用の小さいカード）
  const SubFormulaCard = ({
    label,
    value,
    unit = '',
    isResult = false,
    onClick,
  }: {
    label: string
    value: number
    unit?: string
    isResult?: boolean
    onClick?: () => void
  }) => (
    <div
      className={`
        rounded-lg px-4 py-3 min-w-[100px] text-center
        ${isResult ? 'bg-blue-100 border border-blue-300' : 'bg-gray-50'}
        ${onClick ? 'cursor-pointer' : ''}
      `}
      onClick={(e) => {
        if (onClick) {
          e.stopPropagation()
          onClick()
        }
      }}
    >
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-lg font-semibold mt-1">
        {unit === '¥' || unit === '円'
          ? formatCurrency(value)
          : unit === '%'
            ? `${value.toFixed(2)}${unit}`
            : `${formatNumber(value)}${unit}`
        }
      </div>
    </div>
  )

  // 演算子コンポーネント
  const Operator = ({ symbol, size = 'lg' }: { symbol: string; size?: 'sm' | 'lg' }) => (
    <div className={`
      font-light text-gray-400
      ${size === 'lg' ? 'text-5xl' : 'text-2xl'}
    `}>
      {symbol}
    </div>
  )

  // 期間レポートを保存する処理
  const handleSaveSnapshot = async () => {
    // ドラッグ選択中の期間を保存
    if (!brushRange) {
      alert('保存する期間をドラッグで選択してください')
      return
    }

    const startData = fullChartData[brushRange.start]
    const endData = fullChartData[brushRange.end]

    if (!startData || !endData) {
      alert('選択期間のデータが取得できません')
      return
    }

    // レポート名を自動生成（期間から）
    const reportName = `${startData.originalDate || startData.date} 〜 ${endData.originalDate || endData.date}`

    try {
      await saveSnapshotMutation({
        name: reportName,
        startIndex: brushRange.start,
        endIndex: brushRange.end,
        startDate: startData.originalDate || startData.date,
        endDate: endData.originalDate || endData.date,
        originalDateRange: originalDateRange,
      })

      console.log('✅ 期間レポート保存完了:', reportName)
      alert(`期間レポート「${reportName}」を保存しました`)
    } catch (error) {
      console.error('期間レポート保存エラー:', error)
      alert('期間レポートの保存に失敗しました')
    }
  }

  // ローディング状態
  if ((startDate && endDate && !kpiSummaryData) || isLoadingAccounts) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-gray-500">データ読み込み中...</div>
      </div>
    )
  }

  const metrics = calculateKPIMetrics

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* 目標設定モーダル */}
      {showTargetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-800 mb-4">📊 目標値の設定</h3>

            <div className="space-y-4">
              {/* CV目標 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CV目標（件数）
                </label>
                <input
                  type="number"
                  placeholder="例: 100"
                  defaultValue={targetCV || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  id="target-cv-input"
                />
                <p className="text-xs text-gray-500 mt-1">
                  目標とするコンバージョン件数を入力
                </p>
              </div>

              {/* CPO目標 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CPO目標（円）
                </label>
                <input
                  type="number"
                  placeholder="例: 10000"
                  defaultValue={targetCPO || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  id="target-cpo-input"
                />
                <p className="text-xs text-gray-500 mt-1">
                  目標とする獲得単価（CPO）を入力
                </p>
              </div>
            </div>

            {/* ボタン */}
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => {
                  const cvInput = document.getElementById('target-cv-input') as HTMLInputElement
                  const cpoInput = document.getElementById('target-cpo-input') as HTMLInputElement

                  const cv = cvInput.value ? Number(cvInput.value) : null
                  const cpo = cpoInput.value ? Number(cpoInput.value) : null

                  handleSaveTargets(cv, cpo)
                }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                保存
              </button>
              <button
                onClick={() => setShowTargetModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}


      {/* 保存済み期間レポート一覧モーダル */}
      {showSnapshotList && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-3xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">📚 保存済み期間レポート</h3>
              <button
                onClick={() => setShowSnapshotList(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            {snapshots && snapshots.length > 0 ? (
              <div className="space-y-3">
                {snapshots.map((snapshot) => (
                  <div key={snapshot._id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">{snapshot.name}</h4>
                        {snapshot.description && (
                          <p className="text-sm text-gray-600 mt-1">{snapshot.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
                          <span className="flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            期間: {snapshot.startDate} 〜 {snapshot.endDate}
                          </span>
                          <span className="flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            範囲: インデックス {snapshot.startIndex} - {snapshot.endIndex}
                          </span>
                          <span className="flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            保存日: {new Date(snapshot.createdAt).toLocaleDateString('ja-JP')}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium px-3 py-1 bg-blue-50 hover:bg-blue-100 rounded transition-colors"
                          onClick={() => {
                            // カスタム期間として設定
                            const startDate = new Date(snapshot.startDate)
                            const endDate = new Date(snapshot.endDate)

                            // DateRangeFilterをカスタムモードに切り替えて期間を設定
                            setDateRange('custom')
                            setCustomDateRange({ start: startDate, end: endDate })
                            handleCustomDateRange(startDate, endDate)

                            // モーダルを閉じる
                            setShowSnapshotList(false)

                            console.log('📊 期間レポートから詳細分析:', snapshot.name)
                          }}
                        >
                          詳細分析
                        </button>
                        <button
                          className="text-red-500 hover:text-red-700 text-sm"
                          onClick={async () => {
                            if (confirm('この期間レポートを削除しますか？')) {
                              try {
                                await deleteSnapshotMutation({ id: snapshot._id })
                                console.log('✅ 期間レポート削除完了')
                              } catch (error) {
                                console.error('削除エラー:', error)
                                alert('削除に失敗しました')
                              }
                            }
                          }}
                        >
                          削除
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                保存済みの期間レポートはありません
              </div>
            )}

            <div className="mt-6">
              <p className="text-sm text-gray-500 text-center">
                「詳細分析」をクリックすると、保存した期間のデータが表示されます
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ヘッダー部分 */}
      <div className="sticky top-0 z-50 bg-white shadow-sm border-b border-gray-200">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ChartBarSquareIcon className="w-8 h-8 text-[#f6d856]" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">KPIビュー</h1>
                <p className="text-sm text-gray-600 mt-0.5">数式で見る広告パフォーマンス</p>
              </div>
            </div>

            {/* アカウントセレクター */}
            {accounts.length > 0 && (
              <AccountSelector
                accounts={accounts}
                selectedAccountId={selectedAccountId}
                onSelect={handleAccountChange}
                isLoading={isLoadingAccounts}
              />
            )}
          </div>
        </div>
      </div>

      {/* メインコンテンツ部分 */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* エラー表示 */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* 期間選択UI */}
        <div className="mb-8 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <DateRangeFilter
              value={dateRange}
              onChange={setDateRange}
              onCustomDateRange={handleCustomDateRange}
              customDateRange={customDateRange}
            />

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowTargetModal(true)}
                className="px-4 py-1.5 text-sm bg-amber-100 hover:bg-amber-200 border border-amber-400 rounded-md transition-colors font-semibold text-amber-800 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                目標設定
              </button>

              <button
                onClick={() => setShowSnapshotList(true)}
                className="px-4 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 border border-gray-400 rounded-md transition-colors font-semibold text-gray-800 flex items-center gap-2"
              >
                <BookmarkIcon className="w-4 h-4" />
                保存済みレポート ({snapshots?.length || 0})
              </button>
            </div>
          </div>
        </div>

        {/* メイン数式（CPO）- 全媒体合算 */}
        <div className="mb-12">
          <h2 className="text-lg font-semibold text-gray-700 mb-6 flex items-center gap-2">
            <span className="text-2xl">📐</span> CPO（注文獲得単価）- 全媒体合算
          </h2>
          <div className="bg-gradient-to-r from-slate-50 to-gray-50 rounded-2xl p-8 shadow-inner">
            {/* メイン数式 */}
            <div className="flex items-center justify-center gap-8">
              <FormulaCard
                label="広告費用"
                value={metrics.cost}
                change={metrics.changes.cost}
                unit="円"
                isPositiveGood={false}
                isExpandable={true}
                isExpanded={expandedMetric === 'cost'}
                onClick={() => setExpandedMetric(expandedMetric === 'cost' ? null : 'cost')}
                breakdown={
                  <div className="flex items-center gap-3">
                    <div
                      className="text-center px-4 py-3 bg-blue-50 rounded-lg min-w-[120px] cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation()
                        setExpandedMetric(null)
                      }}
                    >
                      <div className="text-xs text-gray-400 mb-1">Meta</div>
                      <div className="text-2xl font-semibold text-gray-500">
                        ¥{formatNumber(metrics.metaCost)}
                      </div>
                    </div>
                    <div className="text-xl text-gray-400">+</div>
                    <div
                      className="text-center px-4 py-3 bg-yellow-50 rounded-lg min-w-[120px] cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation()
                        setExpandedMetric(null)
                      }}
                    >
                      <div className="text-xs text-gray-400 mb-1">Google</div>
                      <div className="text-2xl font-semibold text-gray-500">
                        ¥{formatNumber(metrics.googleCost)}
                      </div>
                    </div>
                    <div className="text-xl text-gray-400">+</div>
                    <div
                      className="text-center px-4 py-3 bg-red-50 rounded-lg min-w-[120px] cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation()
                        setExpandedMetric(null)
                      }}
                    >
                      <div className="text-xs text-gray-400 mb-1">Yahoo</div>
                      <div className="text-2xl font-semibold text-gray-500">
                        ¥{formatNumber(metrics.yahooCost)}
                      </div>
                    </div>
                  </div>
                }
              />
              <Operator symbol="÷" />
              <FormulaCard
                label="コンバージョン"
                value={metrics.cv}
                change={metrics.changes.cv}
                isExpandable={true}
                isExpanded={expandedMetric === 'cv'}
                onClick={() => setExpandedMetric(expandedMetric === 'cv' ? null : 'cv')}
                breakdown={
                  <div className="flex items-center gap-3">
                    <div
                      className="text-center px-4 py-3 bg-blue-50 rounded-lg min-w-[100px] cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation()
                        setExpandedMetric(null)
                      }}
                    >
                      <div className="text-xs text-gray-400 mb-1">Meta</div>
                      <div className="text-2xl font-semibold text-gray-500">
                        {formatNumber(metrics.metaConversions)}
                      </div>
                    </div>
                    <div className="text-xl text-gray-400">+</div>
                    <div
                      className="text-center px-4 py-3 bg-yellow-50 rounded-lg min-w-[100px] cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation()
                        setExpandedMetric(null)
                      }}
                    >
                      <div className="text-xs text-gray-400 mb-1">Google</div>
                      <div className="text-2xl font-semibold text-gray-500">
                        {formatNumber(metrics.googleConversions)}
                      </div>
                    </div>
                    <div className="text-xl text-gray-400">+</div>
                    <div
                      className="text-center px-4 py-3 bg-red-50 rounded-lg min-w-[100px] cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation()
                        setExpandedMetric(null)
                      }}
                    >
                      <div className="text-xs text-gray-400 mb-1">Yahoo</div>
                      <div className="text-2xl font-semibold text-gray-500">
                        {formatNumber(metrics.yahooConversions)}
                      </div>
                    </div>
                  </div>
                }
              />
              <Operator symbol="=" />
              <FormulaCard
                label="CPO"
                value={metrics.cpo}
                change={metrics.changes.cpo}
                unit="円"
                isResult
                isPositiveGood={false}
                isExpandable={true}
                isExpanded={expandedMetric === 'cpo'}
                onClick={() => setExpandedMetric(expandedMetric === 'cpo' ? null : 'cpo')}
                breakdown={
                  <div className="flex items-center gap-4">
                    <div className="text-sm text-gray-600 font-semibold">媒体別</div>
                    <div className="text-center px-4 py-3 bg-blue-50 rounded-lg min-w-[140px]">
                      <div className="text-xs text-gray-400 mb-1">Meta CPO</div>
                      <div className="text-2xl font-semibold text-gray-500">
                        ¥{formatNumber(metrics.metaCPO)}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {formatNumber(metrics.metaCost)}円 ÷ {formatNumber(metrics.metaConversions)}件
                      </div>
                    </div>
                    <div className="text-center px-4 py-3 bg-yellow-50 rounded-lg min-w-[140px]">
                      <div className="text-xs text-gray-400 mb-1">Google CPO</div>
                      <div className="text-2xl font-semibold text-gray-500">
                        ¥{formatNumber(metrics.googleCPO)}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {formatNumber(metrics.googleCost)}円 ÷ {formatNumber(metrics.googleConversions)}件
                      </div>
                    </div>
                    <div className="text-center px-4 py-3 bg-red-50 rounded-lg min-w-[140px]">
                      <div className="text-xs text-gray-400 mb-1">Yahoo CPO</div>
                      <div className="text-2xl font-semibold text-gray-500">
                        ¥{formatNumber(metrics.yahooCPO)}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {formatNumber(metrics.yahooCost)}円 ÷ {formatNumber(metrics.yahooConversions)}件
                      </div>
                    </div>
                  </div>
                }
              />
            </div>

          </div>
        </div>

        {/* グラフセクション */}
        <div className="mb-12 bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-700">CV数とCPOの推移</h3>
                <p className="text-sm text-gray-500 mt-1">
                  下部のバーをドラッグして期間を選択できます
                </p>
              </div>
              {/* 日足/週足/月足切り替えボタン */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => {
                    setViewMode('daily')
                    localStorage.setItem('viewMode', 'daily')
                  }}
                  className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
                    viewMode === 'daily'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  日足
                </button>
                <button
                  onClick={() => {
                    setViewMode('weekly')
                    localStorage.setItem('viewMode', 'weekly')
                  }}
                  className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
                    viewMode === 'weekly'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  週足
                </button>
                <button
                  onClick={() => {
                    setViewMode('monthly')
                    localStorage.setItem('viewMode', 'monthly')
                  }}
                  className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
                    viewMode === 'monthly'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  月足
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {/* 媒体別チェックボックス */}
              <div className="flex items-center gap-2">
              {brushRange && (
                <>
                  <button
                    onClick={handleSaveSnapshot}
                    className="px-4 py-1.5 text-sm bg-blue-100 hover:bg-blue-200 border border-blue-400 rounded-md transition-colors font-semibold text-blue-800 flex items-center gap-2"
                  >
                    <CameraIcon className="w-4 h-4" />
                    選択期間を保存
                  </button>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-green-600 font-medium bg-green-50 px-2 py-1 rounded border border-green-200">
                      📅 期間選択中: {brushRange.start} - {brushRange.end}
                    </span>
                    <button
                      onClick={handleResetSelection}
                      className="px-3 py-1.5 text-sm bg-red-100 hover:bg-red-200 border border-red-300 rounded-md transition-colors text-red-700"
                    >
                      🔄 選択をリセット
                    </button>
                  </div>
                </>
              )}
              </div>
            </div>
          </div>

          {/* 簡単な状態表示 */}
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
            <div className="font-bold text-blue-800 mb-2">📊 デバッグ情報</div>
            <div className="space-y-1 text-blue-700">
              <div>ファイル: KPIViewDashboardBreakdown.tsx</div>
              <div>fullChartData数: {fullChartData?.length || 0} 件</div>
              <div>chartData数: {chartData?.length || 0} 件</div>
              <div>選択範囲: {brushRange ? `${brushRange.start}-${brushRange.end}` : 'なし'}</div>
              <div>ドラッグ中: {isDragging ? `${dragStartIndex}-${dragEndIndex}` : 'なし'}</div>
              <div>ドラッグ状態: isDragging={String(isDragging)}</div>
              <div>現在時刻: {new Date().toLocaleTimeString()}</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={450}>
            <ComposedChart
              data={chartData}
              onMouseDown={handleChartMouseDown}
              onMouseMove={handleChartMouseMove}
              onMouseUp={handleChartMouseUp}
              onMouseLeave={handleChartMouseUp}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip
                formatter={(value: number, name: string) => {
                  if (name === 'CPO' || name === '広告費用 (日別)') {
                    return `¥${formatNumber(value)}`;
                  }
                  return formatNumber(value);
                }}
              />
              <Legend
                content={(props) => {
                  const { payload } = props;
                  return (
                    <div className="flex items-center justify-between mt-4 px-4">
                      <div className="flex items-center gap-6">
                        {/* 通常の凡例項目 */}
                        {payload?.map((entry, index) => (
                          <span key={`item-${index}`} className="flex items-center gap-2">
                            <span
                              className={
                                entry.dataKey === 'cpo'
                                  ? 'w-4 h-1 bg-orange-500'
                                  : 'w-4 h-3'
                              }
                              style={{ backgroundColor: entry.color }}
                            />
                            <span className="text-sm text-gray-600">{entry.value}</span>
                          </span>
                        ))}
                        {/* 目標値の凡例 */}
                        {targetCV !== null && (
                          <span className="flex items-center gap-2">
                            <span className="w-4 h-0 border-t-2 border-dashed border-blue-500" />
                            <span className="text-sm text-blue-600">CV目標: {targetCV}件</span>
                          </span>
                        )}
                        {targetCPO !== null && (
                          <span className="flex items-center gap-2">
                            <span className="w-4 h-0 border-t-2 border-dashed border-orange-500" />
                            <span className="text-sm text-orange-600">CPO目標: ¥{targetCPO.toLocaleString()}</span>
                          </span>
                        )}
                      </div>

                      {/* チェックボックス - 右側 */}
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={showStackedCv}
                            onChange={(e) => setShowStackedCv(e.target.checked)}
                            className="cursor-pointer"
                          />
                          <span className="text-sm text-gray-600">積み上げ表示</span>
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={showMeta}
                            onChange={(e) => setShowMeta(e.target.checked)}
                            className="cursor-pointer"
                          />
                          <span className="text-sm text-gray-600">
                            <span className="inline-block w-3 h-3 bg-[#4267B2] rounded-sm mr-1"></span>
                            Meta
                          </span>
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={showGoogle}
                            onChange={(e) => setShowGoogle(e.target.checked)}
                            className="cursor-pointer"
                          />
                          <span className="text-sm text-gray-600">
                            <span className="inline-block w-3 h-3 bg-[#FFC107] rounded-sm mr-1"></span>
                            Google
                          </span>
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={showYahoo}
                            onChange={(e) => setShowYahoo(e.target.checked)}
                            className="cursor-pointer"
                          />
                          <span className="text-sm text-gray-600">
                            <span className="inline-block w-3 h-3 bg-[#FF1A00] rounded-sm mr-1"></span>
                            Yahoo!
                          </span>
                        </label>
                      </div>
                    </div>
                  );
                }}
              />
              {/* 積み上げ表示の場合 */}
              {showStackedCv ? (
                <>
                  {showMeta && <Bar yAxisId="left" dataKey="metaCv" stackId="cv" fill="#4267B2" name="Meta CV" />}
                  {showGoogle && <Bar yAxisId="left" dataKey="googleCv" stackId="cv" fill="#FFC107" name="Google CV" />}
                  {showYahoo && <Bar yAxisId="left" dataKey="yahooCv" stackId="cv" fill="#FF1A00" name="Yahoo! CV" />}
                </>
              ) : (
                /* 合計表示の場合 */
                <Bar yAxisId="left" dataKey="cv" fill="#3B82F6" name="CV数（合計）" />
              )}
              <Line yAxisId="right" type="monotone" dataKey="cpo" stroke="#F59E0B" strokeWidth={2} name="CPO" />

              {/* 目標線の表示（ラベルなし） */}
              {targetCV !== null && (
                <ReferenceLine
                  yAxisId="left"
                  y={targetCV}
                  stroke="#3B82F6"
                  strokeDasharray="5 5"
                  strokeWidth={2}
                />
              )}
              {targetCPO !== null && (
                <ReferenceLine
                  yAxisId="right"
                  y={targetCPO}
                  stroke="#F59E0B"
                  strokeDasharray="5 5"
                  strokeWidth={2}
                />
              )}

              {/* ドラッグ中の選択範囲を表示 */}
              {isDragging && dragStartIndex !== null && dragEndIndex !== null &&
               chartData[dragStartIndex] && chartData[dragEndIndex] && (
                <ReferenceArea
                  x1={chartData[Math.min(dragStartIndex, dragEndIndex)].date}
                  x2={chartData[Math.max(dragStartIndex, dragEndIndex)].date}
                  strokeOpacity={0.3}
                  fill="#3B82F6"
                  fillOpacity={0.3}
                />
              )}

            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* 広告費用トレンドグラフ */}
        <div className="mb-12 bg-white rounded-2xl p-8 shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-800">💰 広告費用トレンド</h2>
              <div className="mt-2 flex items-center gap-4">
                <span className="text-sm text-gray-600">
                  期間総額:
                  <span className="ml-2 font-bold text-lg text-gray-900">
                    ¥{formatNumber(chartData.reduce((sum, item) => sum + (item.totalSpend || 0), 0))}
                  </span>
                </span>
                <span className="text-sm text-gray-600">
                  内訳:
                  <span className="ml-2 text-[#4267B2] font-medium">
                    Meta ¥{formatNumber(chartData.reduce((sum, item) => sum + (item.metaSpend || 0), 0))}
                  </span>
                  <span className="ml-2 text-[#FFC107] font-medium">
                    Google ¥{formatNumber(chartData.reduce((sum, item) => sum + (item.googleSpend || 0), 0))}
                  </span>
                  <span className="ml-2 text-[#FF1A00] font-medium">
                    Yahoo! ¥{formatNumber(chartData.reduce((sum, item) => sum + (item.yahooSpend || 0), 0))}
                  </span>
                </span>
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip
                formatter={(value: number, name: string) => `¥${formatNumber(value)}`}
              />
              <Legend />
              <Bar dataKey="metaSpend" stackId="spend" fill="#4267B2" name="Meta広告費" />
              <Bar dataKey="googleSpend" stackId="spend" fill="#FFC107" name="Google広告費" />
              <Bar dataKey="yahooSpend" stackId="spend" fill="#FF1A00" name="Yahoo!広告費" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>


        {/* Meta専用セクション with ブレークダウン */}
        <div className="mb-12">
          <h2 className="text-lg font-semibold text-gray-700 mb-6 flex items-center gap-2">
            <span className="text-2xl">📊</span> Meta広告
          </h2>
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-8 shadow-inner overflow-x-auto">
            <PlatformKPIFormula
              platformName="Meta"
              platformConfig={{
                color: 'blue',
                bgGradient: 'from-blue-50 to-indigo-50'
              }}
              data={{
                adSpend: {
                  total: metaSpendData?.current?.spend || 0,
                  breakdown: [
                    {
                      label: 'Facebook',
                      value: (metaSpendData?.current?.spend || 0) * 0.6,
                      color: 'blue'
                    },
                    {
                      label: 'Instagram',
                      value: (metaSpendData?.current?.spend || 0) * 0.35,
                      color: 'pink'
                    },
                    {
                      label: 'Audience Network',
                      value: (metaSpendData?.current?.spend || 0) * 0.05,
                      color: 'purple'
                    }
                  ]
                },
                conversions: metrics.metaConversions,
                cpo: metrics.metaCPO,
                impressions: metaSpendData?.current?.impressions,
                clicks: metaSpendData?.current?.clicks,
                ctr: metaSpendData?.current?.ctr,
                cvr: metrics.cvr,
                cpc: metaSpendData?.current?.cpc
              }}
              isLoading={false}
            />
          </div>
        </div>

        {/* Google広告 CPO（注文獲得単価） */}
        <div className="mb-12">
          <h2 className="text-lg font-semibold text-gray-700 mb-6 flex items-center gap-2">
            <span className="text-2xl">
              <svg className="w-6 h-6 inline" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            </span> Google広告
          </h2>
          <div className="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-2xl p-8 shadow-inner overflow-x-auto">
            <PlatformKPIFormula
              platformName="Google"
              platformConfig={{
                color: 'yellow',
                bgGradient: 'from-yellow-50 to-amber-50'
              }}
              data={{
                adSpend: {
                  total: (() => {
                    const breakdown = googleAdsSpendData?.current?.campaignTypeBreakdown
                    if (breakdown) {
                      const pmaxTotal = breakdown.pmax?.reduce((sum: number, item: any) => sum + item.spend, 0) || 0
                      const demandgenTotal = breakdown.demandgen?.reduce((sum: number, item: any) => sum + item.spend, 0) || 0
                      const generalTotal = breakdown.general?.reduce((sum: number, item: any) => sum + item.spend, 0) || 0
                      const calculatedTotal = pmaxTotal + demandgenTotal + generalTotal

                      // キャンペーンタイプ別のデータがある場合はその合計を使用、なければmetrics.googleCostを使用
                      return calculatedTotal > 0 ? calculatedTotal : metrics.googleCost
                    }
                    return metrics.googleCost
                  })(),
                  breakdown: (() => {
                    const breakdown = googleAdsSpendData?.current?.campaignTypeBreakdown
                    console.log('🎯 Google Ads Breakdown データ:', {
                      breakdown,
                      pmax: breakdown?.pmax,
                      demandgen: breakdown?.demandgen,
                      general: breakdown?.general
                    })
                    if (breakdown) {
                      return [
                        {
                          label: 'P-Max',
                          value: breakdown.pmax?.reduce((sum: number, item: any) => sum + item.spend, 0) || 0,
                          color: 'blue'
                        },
                        {
                          label: 'Demand Gen',
                          value: breakdown.demandgen?.reduce((sum: number, item: any) => sum + item.spend, 0) || 0,
                          color: 'green'
                        },
                        {
                          label: '一般',
                          value: breakdown.general?.reduce((sum: number, item: any) => sum + item.spend, 0) || 0,
                          color: 'gray'
                        }
                      ]
                    } else {
                      return [
                        { label: 'P-Max', value: 0, color: 'blue' },
                        { label: 'Demand Gen', value: 0, color: 'green' },
                        { label: '一般', value: 0, color: 'gray' }
                      ]
                    }
                  })()
                },
                conversions: metrics.googleConversions,
                cpo: metrics.googleCPO,
                impressions: googleAdsSpendData?.current?.impressions || googleAdsData?.impressions,
                clicks: googleAdsSpendData?.current?.clicks || googleAdsData?.clicks,
                ctr: (googleAdsSpendData?.current?.clicks && googleAdsSpendData?.current?.impressions)
                  ? (googleAdsSpendData.current.clicks / googleAdsSpendData.current.impressions * 100)
                  : (googleAdsData?.clicks && googleAdsData?.impressions)
                  ? (googleAdsData.clicks / googleAdsData.impressions * 100)
                  : undefined,
                cvr: metrics.cvr,
                cpc: metrics.googleCost && (googleAdsSpendData?.current?.clicks || googleAdsData?.clicks)
                  ? metrics.googleCost / (googleAdsSpendData?.current?.clicks || googleAdsData?.clicks)
                  : undefined
              }}
              isLoading={false}
            />

          {/* データソース表示 */}
          <div className="mt-6 pt-6 border-t border-yellow-200">
              {getGoogleAdsConfig?.isConnected ? (
                <div>
                  <p className="text-sm text-yellow-600 text-center">
                    Google Ads APIから取得
                  </p>

                  {/* APIレスポンス詳細表示 */}
                  <div className="mt-4 bg-white/50 rounded-lg p-4 text-left">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">APIレスポンス詳細:</h4>

                    {/* WebSocketエラー表示 */}
                    {convexConnectionStatus === 'disconnected' && (
                      <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-md">
                        <h5 className="text-xs font-semibold text-red-700 mb-2">⚠️ 接続エラー</h5>
                        <div className="text-xs text-red-600 space-y-1">
                          <p>WebSocket接続エラーが発生しています:</p>
                          <p className="font-mono text-xxs bg-red-100 p-1 rounded">wss://basic-ferret-772.convex.cloud/api/1.27.0/sync</p>
                          <p className="mt-2">考えられる原因:</p>
                          <ul className="ml-4 list-disc space-y-1">
                            <li>Convexサーバーへの接続がタイムアウト</li>
                            <li>ネットワーク接続の問題</li>
                            <li>Convex設定の不一致</li>
                          </ul>
                        </div>
                      </div>
                    )}

                    {/* 接続状態表示 */}
                    <div className="mb-3 p-3 bg-gray-50 border border-gray-200 rounded-md">
                      <h5 className="text-xs font-semibold text-gray-700 mb-2">🔌 システム接続状態</h5>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Convex:</span>
                          <span className={`font-medium flex items-center gap-1 ${
                            convexConnectionStatus === 'connected' ? 'text-green-600' :
                            convexConnectionStatus === 'connecting' ? 'text-yellow-600' :
                            'text-red-600'
                          }`}>
                            <span className={`w-2 h-2 rounded-full inline-block ${
                              convexConnectionStatus === 'connected' ? 'bg-green-500' :
                              convexConnectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' :
                              'bg-red-500'
                            }`}></span>
                            {convexConnectionStatus === 'connected' ? '接続済み' :
                             convexConnectionStatus === 'connecting' ? '接続中...' :
                             '切断'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Google Ads:</span>
                          <span className={`font-medium flex items-center gap-1 ${
                            getGoogleAdsConfig?.isConnected ? 'text-green-600' : 'text-gray-400'
                          }`}>
                            <span className={`w-2 h-2 rounded-full inline-block ${
                              getGoogleAdsConfig?.isConnected ? 'bg-green-500' : 'bg-gray-400'
                            }`}></span>
                            {getGoogleAdsConfig?.isConnected ? '接続済み' : '未接続'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-600">接続状態:</span>
                        <span className="text-green-600 font-medium">
                          {getGoogleAdsConfig?.isConnected ? '✓ 接続済み' : '✗ 未接続'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Customer ID:</span>
                        <span className="font-mono">{getGoogleAdsConfig?.customerId || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">データ件数:</span>
                        <span>{googleAdsData?.data?.length || 0}件</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">取得期間:</span>
                        <span>{formatDateToISO(calculateDateRange.startDate)} ~ {formatDateToISO(calculateDateRange.endDate)}</span>
                      </div>
                      {/* キャンペーンタイプ別データ表示 */}
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="font-semibold text-gray-700 mb-2">キャンペーンタイプ別内訳:</div>
                        {(() => {
                          const breakdown = googleAdsSpendData?.current?.campaignTypeBreakdown
                          if (breakdown) {
                            const pmaxTotal = breakdown.pmax?.reduce((sum: number, item: any) => sum + item.spend, 0) || 0
                            const demandgenTotal = breakdown.demandgen?.reduce((sum: number, item: any) => sum + item.spend, 0) || 0
                            const generalTotal = breakdown.general?.reduce((sum: number, item: any) => sum + item.spend, 0) || 0

                            return (
                              <div className="space-y-1">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">P-Max:</span>
                                  <span className="font-medium">¥{Math.round(pmaxTotal).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Demand Gen:</span>
                                  <span className="font-medium">¥{Math.round(demandgenTotal).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">一般:</span>
                                  <span className="font-medium">¥{Math.round(generalTotal).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between pt-2 border-t border-gray-100">
                                  <span className="text-gray-700 font-semibold">合計:</span>
                                  <span className="font-bold text-blue-600">
                                    ¥{Math.round(pmaxTotal + demandgenTotal + generalTotal).toLocaleString()}
                                  </span>
                                </div>
                              </div>
                            )
                          } else {
                            return (
                              <div className="space-y-2">
                                <div className="text-gray-500 italic">データ取得中...</div>
                                <div className="text-xs text-gray-400">
                                  <div>googleAdsSpendData: {googleAdsSpendData ? 'あり' : 'なし'}</div>
                                  <div>current: {googleAdsSpendData?.current ? 'あり' : 'なし'}</div>
                                  <div>campaignTypeBreakdown: {googleAdsSpendData?.current?.campaignTypeBreakdown ? 'あり' : 'なし'}</div>
                                  {googleAdsSpendData?.current && (
                                    <div className="mt-2 p-2 bg-gray-100 rounded overflow-x-auto">
                                      <pre className="text-xs">{JSON.stringify(googleAdsSpendData.current, null, 2).substring(0, 500)}</pre>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )
                          }
                        })()}
                      </div>

                      {/* デバッグ情報表示 */}
                      {googleAdsDebugInfo && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-md border border-gray-200">
                          <h5 className="text-xs font-semibold text-gray-700 mb-2">📊 デバッグ情報</h5>

                          {/* タイムスタンプ */}
                          <div className="text-xs text-gray-500 mb-2">
                            最終更新: {googleAdsDebugInfo.timestamp ? new Date(googleAdsDebugInfo.timestamp).toLocaleString('ja-JP') : 'N/A'}
                          </div>

                          {/* リクエスト情報 */}
                          <div className="mb-2">
                            <p className="text-xs font-medium text-gray-600">リクエスト:</p>
                            <div className="ml-2 text-xs text-gray-500">
                              <p>状態: <span className={googleAdsDebugInfo.request?.status === 'API呼び出し成功' ? 'text-green-600' : 'text-yellow-600'}>{googleAdsDebugInfo.request?.status}</span></p>
                              <p>期間: {googleAdsDebugInfo.request?.startDate} ~ {googleAdsDebugInfo.request?.endDate}</p>
                            </div>
                          </div>

                          {/* レスポンス情報 */}
                          {googleAdsDebugInfo.response && (
                            <div className="mb-2">
                              <p className="text-xs font-medium text-gray-600">レスポンス:</p>
                              <div className="ml-2 text-xs text-gray-500">
                                <p>データ件数: {googleAdsDebugInfo.response.dataCount}件</p>
                                {googleAdsDebugInfo.response.aggregated && (
                                  <>
                                    <p>合計費用: ¥{googleAdsDebugInfo.response.aggregated.totalCost.toLocaleString()}</p>
                                    <p>合計インプレッション: {googleAdsDebugInfo.response.aggregated.totalImpressions.toLocaleString()}</p>
                                    <p>合計クリック: {googleAdsDebugInfo.response.aggregated.totalClicks.toLocaleString()}</p>
                                  </>
                                )}
                              </div>

                              {/* 生データプレビュー */}
                              {googleAdsDebugInfo.response.rawData && googleAdsDebugInfo.response.rawData.length > 0 && (
                                <div className="mt-2">
                                  <p className="text-xs font-medium text-gray-600">生データ (最初の3件):</p>
                                  <pre className="ml-2 mt-1 p-2 bg-white rounded text-xs overflow-x-auto max-h-40">
{JSON.stringify(googleAdsDebugInfo.response.rawData.slice(0, 3), null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          )}

                          {/* エラー情報 */}
                          {googleAdsDebugInfo.error && (
                            <div className="mb-2 p-2 bg-red-50 rounded">
                              <p className="text-xs font-medium text-red-600">エラー:</p>
                              <div className="ml-2 text-xs text-red-500">
                                <p>{googleAdsDebugInfo.error.message}</p>
                                {googleAdsDebugInfo.error.stack && (
                                  <details className="mt-1">
                                    <summary className="cursor-pointer text-xs text-gray-500">スタックトレース</summary>
                                    <pre className="mt-1 p-2 bg-white rounded text-xs overflow-x-auto max-h-32">
{googleAdsDebugInfo.error.stack}
                                    </pre>
                                  </details>
                                )}
                              </div>
                            </div>
                          )}

                          <p className="text-xs text-gray-400 mt-2">更新時刻: {googleAdsDebugInfo.timestamp}</p>
                        </div>
                      )}

                      {/* ボタン群 */}
                      <div className="mt-3 flex gap-2">
                        {/* 全キャンペーン確認ボタン */}
                        <button
                          onClick={async () => {
                            const campaignDebugInfo = {
                              ...googleAdsDebugInfo,
                              campaignCheck: {
                                status: 'キャンペーン確認中...',
                                campaigns: null as any,
                                error: null as any
                              },
                              timestamp: new Date().toISOString()
                            }
                            setGoogleAdsDebugInfo(campaignDebugInfo)

                            try {
                              const result = await getAllGoogleAdsCampaigns()
                              console.log('Campaign check result:', result)

                              // 新しいオブジェクトを作成して状態を更新
                              setGoogleAdsDebugInfo({
                                ...campaignDebugInfo,
                                campaignCheck: {
                                  status: 'キャンペーン確認完了',
                                  campaigns: result.campaigns,
                                  totalCount: result.totalCount || result.campaigns?.length || 0
                                },
                                timestamp: new Date().toISOString()
                              })
                            } catch (error: any) {
                              console.error('Campaign check error:', error)
                              // 新しいオブジェクトを作成して状態を更新
                              setGoogleAdsDebugInfo({
                                ...campaignDebugInfo,
                                campaignCheck: {
                                  status: 'キャンペーン確認失敗',
                                  campaigns: null,
                                  error: error.message || 'Unknown error'
                                },
                                timestamp: new Date().toISOString()
                              })
                            }
                          }}
                          className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors"
                        >
                          全キャンペーン確認
                        </button>

                        {/* 直接APIテストボタン */}
                        <button
                          onClick={async () => {
                            if (!getGoogleAdsConfig?.accessToken || !getGoogleAdsConfig?.developerToken) {
                              alert('認証情報がありません')
                              return
                            }

                            const apiUrl = `https://googleads.googleapis.com/v21/customers/${getGoogleAdsConfig.customerId.replace(/-/g, '')}/googleAds:searchStream`

                            const query = `
                              SELECT
                                campaign.id,
                                campaign.name,
                                campaign.status,
                                segments.date,
                                metrics.impressions,
                                metrics.clicks,
                                metrics.cost_micros
                              FROM campaign
                              WHERE segments.date BETWEEN '${formatDateToISO(calculateDateRange.startDate)}' AND '${formatDateToISO(calculateDateRange.endDate)}'
                            `

                            console.log('🚀 直接API呼び出し:', {
                              url: apiUrl,
                              query: query.trim(),
                              customerId: getGoogleAdsConfig.customerId,
                              hasToken: !!getGoogleAdsConfig.accessToken
                            })

                            try {
                              const response = await fetch(apiUrl, {
                                method: 'POST',
                                headers: {
                                  'Authorization': `Bearer ${getGoogleAdsConfig.accessToken}`,
                                  'developer-token': getGoogleAdsConfig.developerToken || getGoogleAdsConfig.developerId,
                                  'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({ query }),
                              })

                              const responseText = await response.text()
                              console.log('📥 直接APIレスポンス:', {
                                status: response.status,
                                ok: response.ok,
                                responseText: responseText.substring(0, 1000)
                              })

                              if (!response.ok) {
                                console.error('APIエラー:', responseText)
                                alert(`APIエラー (${response.status}): ${responseText.substring(0, 200)}`)
                              } else {
                                const data = JSON.parse(responseText)
                                console.log('✅ 成功! データ:', data)
                                alert(`成功! データ件数: ${data.results?.length || 0}件\n\n詳細はコンソールを確認してください`)
                              }
                            } catch (error: any) {
                              console.error('リクエストエラー:', error)
                              alert(`リクエストエラー: ${error.message}`)
                            }
                          }}
                          className="px-3 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600 transition-colors"
                        >
                          直接APIテスト
                        </button>

                        {/* API再テストボタン */}
                        <button
                          onClick={async () => {
                            const testDebugInfo = {
                              config: {
                                isConnected: getGoogleAdsConfig?.isConnected,
                                hasAccessToken: !!getGoogleAdsConfig?.accessToken,
                                customerId: getGoogleAdsConfig?.customerId,
                              },
                              request: {
                                startDate: formatDateToISO(calculateDateRange.startDate),
                                endDate: formatDateToISO(calculateDateRange.endDate),
                                status: 'API呼び出し中...'
                              },
                              response: null as any,
                              error: null as any,
                              timestamp: new Date().toISOString(),
                              convexStatus: 'checking...',
                              websocketError: null as string | null
                            }
                            setGoogleAdsDebugInfo(testDebugInfo)

                            // キャンペーンタイプ別データを取得
                            if (getGoogleAdsConfig?.isConnected) {
                              try {
                                console.log('🚀 キャンペーンタイプ別データ取得開始...')
                                const result = await fetchGoogleAdsDirectData({
                                  startDate: formatDateToISO(calculateDateRange.startDate),
                                  endDate: formatDateToISO(calculateDateRange.endDate),
                                  withDailyData: true
                                })

                                console.log('📊 取得結果:', result)

                                if (result.success && result.data) {
                                  const campaignBreakdown = result.data.campaignTypeBreakdown
                                  console.log('🎯 キャンペーンタイプ別:', campaignBreakdown)

                                  // データをstateに保存
                                  setGoogleAdsSpendData({
                                    current: {
                                      ...result.data,
                                      spend: result.data.totalSpend,
                                      campaignTypeBreakdown: campaignBreakdown
                                    },
                                    previous: googleAdsSpendData?.previous
                                  })

                                  testDebugInfo.response = {
                                    dataCount: result.data.dailyData?.length || 0,
                                    totalSpend: result.data.totalSpend,
                                    campaignTypeBreakdown: campaignBreakdown,
                                    rawData: result.data
                                  }
                                  testDebugInfo.request.status = 'キャンペーンタイプ別データ取得成功'
                                } else {
                                  testDebugInfo.response = result
                                  testDebugInfo.request.status = 'データ取得失敗'
                                }
                                setGoogleAdsDebugInfo(testDebugInfo)
                              } catch (error: any) {
                                testDebugInfo.error = {
                                  message: error.message || 'Unknown error',
                                  stack: error.stack
                                }
                                testDebugInfo.request.status = 'API呼び出し失敗'

                                // WebSocketエラーをチェック
                                if (error.message?.includes('WebSocket') || error.message?.includes('ws://') || error.message?.includes('wss://')) {
                                  testDebugInfo.websocketError = error.message
                                  testDebugInfo.convexStatus = 'disconnected'
                                } else {
                                  testDebugInfo.convexStatus = 'error'
                                }

                                setGoogleAdsDebugInfo(testDebugInfo)
                              }
                            }
                          }}
                          className="px-3 py-1 bg-yellow-500 text-white text-xs rounded hover:bg-yellow-600 transition-colors"
                        >
                          キャンペーンタイプ別データ取得
                        </button>
                      </div>

                      {/* キャンペーン確認結果の表示 */}
                      {googleAdsDebugInfo?.campaignCheck && (
                        <div className="mt-3 p-3 bg-blue-50 rounded-md border border-blue-200">
                          <h5 className="text-xs font-semibold text-blue-700 mb-2">📋 キャンペーン確認結果</h5>
                          <p className="text-xs text-blue-600">
                            状態: {googleAdsDebugInfo.campaignCheck.status}
                          </p>
                          {googleAdsDebugInfo.campaignCheck.totalCount !== undefined && (
                            <p className="text-xs text-blue-600">
                              キャンペーン総数: {googleAdsDebugInfo.campaignCheck.totalCount}件
                            </p>
                          )}
                          {googleAdsDebugInfo.campaignCheck.campaigns && googleAdsDebugInfo.campaignCheck.campaigns.length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs font-medium text-blue-700">キャンペーン一覧:</p>
                              <div className="mt-1 max-h-32 overflow-y-auto">
                                {googleAdsDebugInfo.campaignCheck.campaigns.map((campaign: any, idx: number) => (
                                  <div key={idx} className="text-xs text-blue-600 ml-2 py-1 border-b border-blue-100 last:border-b-0">
                                    <p className="font-medium">{campaign.campaign?.name || 'Unknown'}</p>
                                    <p className="text-blue-500">
                                      ID: {campaign.campaign?.id} |
                                      Status: {campaign.campaign?.status} |
                                      Start: {campaign.campaign?.start_date || campaign.campaign?.startDate || 'N/A'} |
                                      End: {campaign.campaign?.end_date || campaign.campaign?.endDate || 'N/A'}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {googleAdsDebugInfo.campaignCheck.error && (
                            <p className="text-xs text-red-600 mt-2">
                              エラー: {googleAdsDebugInfo.campaignCheck.error}
                            </p>
                          )}
                        </div>
                      )}
                      {googleAdsData?.data?.length === 0 && (
                        <div className="mt-3 p-3 bg-yellow-50 rounded-md">
                          <p className="text-yellow-800 font-medium">データが取得できていません</p>
                          <p className="text-yellow-700 text-xs mt-1">
                            考えられる原因:
                          </p>
                          <ul className="text-yellow-600 text-xs mt-1 ml-4 list-disc">
                            <li>指定期間にキャンペーンが存在しない</li>
                            <li>アカウントに有効なキャンペーンがない</li>
                            <li>APIアクセス権限が不足している</li>
                          </ul>
                        </div>
                      )}
                      {googleAdsData?.data?.length > 0 && (
                        <div className="mt-3 p-2 bg-gray-50 rounded max-h-40 overflow-y-auto">
                          <p className="text-xs font-medium text-gray-700 mb-1">取得データ:</p>
                          <pre className="text-xs text-gray-600 whitespace-pre-wrap">
                            {JSON.stringify(googleAdsData.data.slice(0, 3), null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-sm text-yellow-600">
                    Google Ads APIが未接続です
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    設定画面から接続してください
                  </p>
                </div>
              )}
              <div className="mt-2 flex justify-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                <span className="w-2 h-2 rounded-full bg-red-400"></span>
                <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
                <span className="w-2 h-2 rounded-full bg-green-400"></span>
              </div>
            </div>
          </div>
        </div>

        {/* Yahoo広告 CPO（注文獲得単価） */}
        <div className="mb-12">
          <h2 className="text-lg font-semibold text-gray-700 mb-6 flex items-center gap-2">
            <span className="text-2xl">
              <svg className="w-6 h-6 inline" viewBox="0 0 24 24" fill="none">
                <path d="M3 3h18v18H3V3z" fill="#FF0033"/>
                <path d="M11.5 7.5L9 15h1.5l.5-2h2l.5 2H15l-2.5-7.5h-1zm.5 4l.5-2 .5 2h-1z" fill="white"/>
              </svg>
            </span> Yahoo!広告
          </h2>
          <div className="bg-gradient-to-r from-purple-50 to-fuchsia-50 rounded-2xl p-8 shadow-inner overflow-x-auto">
            <PlatformKPIFormula
              platformName="Yahoo!"
              platformConfig={{
                color: 'purple',
                bgGradient: 'from-purple-50 to-fuchsia-50'
              }}
              data={{
                adSpend: {
                  total: metrics.yahooCost,
                  breakdown: [
                    {
                      label: '検索広告',
                      value: metrics.yahooCost * 0.7,
                      color: 'red'
                    },
                    {
                      label: 'ディスプレイ広告',
                      value: metrics.yahooCost * 0.25,
                      color: 'orange'
                    },
                    {
                      label: 'その他',
                      value: metrics.yahooCost * 0.05,
                      color: 'gray'
                    }
                  ]
                },
                conversions: metrics.yahooConversions,
                cpo: metrics.yahooCPO,
                impressions: yahooAdsData?.impressions,
                clicks: yahooAdsData?.clicks,
                ctr: yahooAdsData?.clicks && yahooAdsData?.impressions
                  ? (yahooAdsData.clicks / yahooAdsData.impressions * 100)
                  : undefined,
                cvr: metrics.cvr,
                cpc: metrics.yahooCost && yahooAdsData?.clicks
                  ? metrics.yahooCost / yahooAdsData.clicks
                  : undefined
              }}
              isLoading={false}
            />

            {/* 連携準備中メッセージ */}
            <div className="mt-6 pt-6 border-t border-purple-200 text-center">
              <p className="text-sm text-purple-600">
                Yahoo!広告 API連携準備中
              </p>
              <div className="mt-2 flex justify-center">
                <div className="w-12 h-2 bg-gradient-to-r from-red-400 to-purple-400 rounded-full"></div>
              </div>
            </div>
          </div>
        </div>

        {/* 更新時刻 */}
        {lastUpdateTime && (
          <div className="mt-8 text-center text-sm text-gray-500">
            最終更新: {lastUpdateTime.toLocaleString('ja-JP')}
          </div>
        )}
      </div>
    </div>
  )
}