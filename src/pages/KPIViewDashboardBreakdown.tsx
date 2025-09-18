import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useConvex, useMutation, useAction } from 'convex/react'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { AccountSelector } from '../features/meta-api/account/AccountSelector'
import { DateRangeFilter } from '../features/meta-api/components/DateRangeFilter'
import type { DateRangeFilter as DateRangeFilterType } from '../features/meta-api/hooks/useAdFatigueSimplified'
import { MetaAccount } from '@/types'
import { MetaCampaignBreakdown } from '../components/MetaCampaignBreakdown'
import {
  ChartBarSquareIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ChevronDownIcon,
  CameraIcon,
  BookmarkIcon,
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
import {
  saveSelectedAccount,
  getSelectedAccount,
  saveCachedData,
  getCachedData,
  clearCachedData,
} from '@/utils/localStorage'
import { logAPI, logState } from '../utils/debugLogger'

export default function KPIViewDashboardBreakdown() {
  const convex = useConvex()
  const getGoogleAdsCostSummary = useAction(api.googleAds.getCostSummary)
  const [data, setData] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [accounts, setAccounts] = useState<MetaAccount[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true)
  const [ecforceData, setEcforceData] = useState<any[]>([])
  const [metaSpendData, setMetaSpendData] = useState<any>(null)
  const [dailyMetaData, setDailyMetaData] = useState<any[]>([])
  const [googleAdsData, setGoogleAdsData] = useState<any>(null)

  // ブレークダウン展開状態の管理
  const [expandedMetric, setExpandedMetric] = useState<'cv' | 'cpo' | 'cost' | null>(null)

  // ドラッグ選択用のstate（表示範囲のみ管理、データは変更しない）
  const [brushRange, setBrushRange] = useState<{ start: number; end: number } | null>(null)
  const [originalDateRange, setOriginalDateRange] = useState<DateRangeFilterType>('current_month')

  // ドラッグ選択用のstate
  const [isDragging, setIsDragging] = useState(false)
  const [dragStartIndex, setDragStartIndex] = useState<number | null>(null)
  const [dragEndIndex, setDragEndIndex] = useState<number | null>(null)

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
        break
      case 'last_3_months':
        startDate = new Date(today)
        startDate.setMonth(startDate.getMonth() - 3)
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

  // ECForceからデータを取得（Convex経由）
  const fetchDataFromECForce = useCallback(
    async (startDate: string, endDate: string) => {
      try {
        console.log('📊 ECForceからデータを取得開始', { startDate, endDate })

        const result = await convex.query(api.ecforce.getPerformanceData, {
          startDate,
          endDate,
          limit: 1000
        })

        if (result && result.data) {
          const formattedData = result.data.map((item: any) => ({
            date: item.dataDate,
            access: item.accessCount || 0,
            cvOrder: item.cvOrder || 0,
            cvPayment: item.cvPayment || 0,
            salesAmount: item.salesAmount || 0,
            orderAmount: item.orderAmount || 0,
            cost: item.cost || 0,
            roas: item.roas || 0,
            advertiser: item.advertiser || '',
          }))

          console.log('✅ ECForceデータ取得完了', {
            count: formattedData.length,
          })

          setEcforceData(formattedData)
          return formattedData
        } else {
          console.log('⚠️ ECForceデータが見つかりません')
          setEcforceData([])
          return []
        }
      } catch (error) {
        console.error('❌ ECForceデータ取得エラー', error)
        setEcforceData([])
        return []
      }
    },
    [convex]
  )

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
        fields: 'spend,impressions,clicks,actions,ctr,cpm,cpc,date_start,date_stop',
        limit: withDailyData ? '500' : '1',
      }

      if (withDailyData) {
        params.time_increment = '1'
      }

      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value)
      })

      console.log('📊 Meta APIからデータ取得中...', { withDailyData })
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

  // Google Adsデータ取得
  const fetchGoogleAdsData = useCallback(async (startDate: Date, endDate: Date) => {
    try {
      console.log('📊 Google Adsデータ取得開始', {
        startDate: formatDateToISO(startDate),
        endDate: formatDateToISO(endDate)
      })

      const result = await getGoogleAdsCostSummary({
        startDate: formatDateToISO(startDate),
        endDate: formatDateToISO(endDate)
      })

      if (result.success && result.data) {
        console.log('✅ Google Adsデータ取得成功:', result.data)
        return result.data
      } else {
        console.log('⚠️ Google Adsデータ取得失敗:', result.error)
        return null
      }
    } catch (error) {
      console.error('❌ Google Adsデータ取得エラー:', error)
      return null
    }
  }, [getGoogleAdsCostSummary])

  // データの統合取得
  useEffect(() => {
    const fetchAllData = async () => {
      const { startDate, endDate } = calculateDateRange
      if (!startDate || !endDate || !selectedAccountId) return

      await fetchDataFromECForce(formatDateToISO(startDate), formatDateToISO(endDate))

      const metaData = await fetchMetaSpendData(selectedAccountId, startDate, endDate, false)

      const dailyData = await fetchMetaSpendData(selectedAccountId, startDate, endDate, true)
      if (dailyData && Array.isArray(dailyData)) {
        setDailyMetaData(dailyData)
      }

      // Google Adsデータを取得
      const googleData = await fetchGoogleAdsData(startDate, endDate)

      const periodDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      const previousStart = new Date(startDate)
      previousStart.setDate(previousStart.getDate() - periodDays - 1)
      const previousEnd = new Date(startDate)
      previousEnd.setDate(previousEnd.getDate() - 1)

      const previousMetaData = await fetchMetaSpendData(selectedAccountId, previousStart, previousEnd, false)

      // 前期間のGoogle Adsデータも取得
      const previousGoogleData = await fetchGoogleAdsData(previousStart, previousEnd)

      setMetaSpendData({
        current: metaData,
        previous: previousMetaData
      })

      setGoogleAdsData({
        current: googleData,
        previous: previousGoogleData
      })

      setLastUpdateTime(new Date())
    }

    if (selectedAccountId && !isLoadingAccounts) {
      fetchAllData()
    }
  }, [selectedAccountId, calculateDateRange, isLoadingAccounts, fetchDataFromECForce, fetchMetaSpendData, fetchGoogleAdsData])

  // 初回ロード時
  useEffect(() => {
    loadAccountsFromConvex()
  }, [loadAccountsFromConvex])

  // アカウント変更ハンドラー
  const handleAccountChange = async (accountId: string) => {
    setSelectedAccountId(accountId)
    saveSelectedAccount(accountId)
    const { startDate, endDate } = calculateDateRange
    if (startDate && endDate) {
      await fetchDataFromECForce(formatDateToISO(startDate), formatDateToISO(endDate))
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

    if (e && e.activeTooltipIndex !== undefined && e.activeTooltipIndex !== null) {
      const chartIndex = e.activeTooltipIndex
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
    if (isDragging && e && e.activeTooltipIndex !== undefined && e.activeTooltipIndex !== null) {
      const chartIndex = e.activeTooltipIndex
      console.log('MouseMove at index:', chartIndex, 'date:', chartData[chartIndex]?.date)
      setDragEndIndex(chartIndex)
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
  const calculateKPIMetrics = useMemo(() => {
    // Meta広告費とGoogle広告費を合算
    const metaCost = metaSpendData?.current?.spend || 0
    const googleCost = googleAdsData?.current?.cost || 0
    const cost = metaCost + googleCost || kpiSummaryData?.current?.cost || 0

    const cv = kpiSummaryData?.current?.cvOrder || ecforceData.reduce((sum, item) => sum + item.cvOrder, 0) || 0
    const sales = kpiSummaryData?.current?.salesAmount || ecforceData.reduce((sum, item) => sum + item.salesAmount, 0) || 0

    // MetaとGoogle Adsのクリック・インプレッションを合算
    const metaClicks = metaSpendData?.current?.clicks || 0
    const googleClicks = googleAdsData?.current?.clicks || 0
    const clicks = metaClicks + googleClicks || kpiSummaryData?.current?.accessCount || 0

    const metaImpressions = metaSpendData?.current?.impressions || 0
    const googleImpressions = googleAdsData?.current?.impressions || 0
    const impressions = metaImpressions + googleImpressions || 0

    // 計算指標
    const cpo = cv > 0 ? cost / cv : 0
    const roas = cost > 0 ? sales / cost : 0
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0
    const cvr = clicks > 0 ? (cv / clicks) * 100 : 0
    const cpc = clicks > 0 ? cost / clicks : 0
    const cpm = impressions > 0 ? (cost / impressions) * 1000 : 0

    // 前期比較データ
    const previousMetaCost = metaSpendData?.previous?.spend || 0
    const previousGoogleCost = googleAdsData?.previous?.cost || 0
    const previousCost = previousMetaCost + previousGoogleCost || kpiSummaryData?.previous?.cost || 0

    const previousCv = kpiSummaryData?.previous?.cvOrder || 0
    const previousSales = kpiSummaryData?.previous?.salesAmount || 0

    const previousMetaClicks = metaSpendData?.previous?.clicks || 0
    const previousGoogleClicks = googleAdsData?.previous?.clicks || 0
    const previousClicks = previousMetaClicks + previousGoogleClicks || kpiSummaryData?.previous?.accessCount || 0

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

    return {
      // メイン指標
      cost,
      metaCost,
      googleCost,
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
  }, [metaSpendData, googleAdsData, kpiSummaryData, ecforceData])

  // グラフ用データ整形（ECForceとMetaデータを統合）
  // 元のチャートデータを計算
  const fullChartData = useMemo(() => {
    const dataMap = new Map<string, { cv: number; spend: number }>()

    ecforceData.forEach(item => {
      const dateStr = item.date
      if (!dataMap.has(dateStr)) {
        dataMap.set(dateStr, { cv: 0, spend: 0 })
      }
      const existing = dataMap.get(dateStr)!
      existing.cv += item.cvOrder || 0
    })

    dailyMetaData.forEach(item => {
      const dateStr = item.date
      if (!dataMap.has(dateStr)) {
        dataMap.set(dateStr, { cv: 0, spend: 0 })
      }
      const existing = dataMap.get(dateStr)!
      existing.spend += item.spend || 0
    })

    if (trendData?.data) {
      trendData.data.forEach((item: any) => {
        const dateStr = item.date
        if (dataMap.has(dateStr)) {
          const existing = dataMap.get(dateStr)!
          if (item.cost && !existing.spend) {
            existing.spend = item.cost
          }
        }
      })
    }

    const sortedData = Array.from(dataMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([dateStr, data]) => {
        const dateParts = dateStr.split('-')
        const displayDate = dateParts.length === 3
          ? `${parseInt(dateParts[1])}/${parseInt(dateParts[2])}`
          : dateStr

        return {
          date: displayDate,
          originalDate: dateStr,
          cv: data.cv,
          cpo: data.cv > 0 && data.spend > 0 ? Math.round(data.spend / data.cv) : 0,
        }
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
          cpo: 0,
        })
      }
      return data
    }

    return sortedData
  }, [ecforceData, dailyMetaData, trendData])

  // 表示用のデータ（選択範囲がある場合はフィルタリング）
  const chartData = useMemo(() => {
    if (brushRange && fullChartData.length > 0) {
      console.log('選択範囲でフィルタリング:', brushRange)
      return fullChartData.slice(brushRange.start, brushRange.end + 1)
    }
    return fullChartData
  }, [fullChartData, brushRange])

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
  }) => (
    <div
      className={`
        relative rounded-xl p-6 transition-all duration-200 min-w-[180px]
        ${isResult
          ? 'bg-gradient-to-br from-yellow-50 to-amber-50 border-2 border-amber-300 shadow-lg'
          : 'bg-white border border-gray-200 shadow-md'
        }
        ${isExpandable
          ? 'cursor-pointer hover:shadow-lg hover:scale-105'
          : ''
        }
        ${isExpanded
          ? 'ring-2 ring-blue-500 transform scale-105'
          : ''
        }
      `}
      onClick={onClick}
    >
      <div className={`text-xs font-medium tracking-wider mb-2 ${
        label.includes('Meta') || label.includes('ECForce') ? 'text-gray-500' : 'text-gray-500 uppercase'
      }`}>
        {label}
      </div>
      <div className={`text-3xl font-bold ${isResult ? 'text-amber-900' : 'text-gray-900'}`}>
        {typeof value === 'number'
          ? (unit === '¥' || unit === '円' ? formatCurrency(value) : formatNumber(value))
          : value
        }
        {unit && unit !== '¥' && unit !== '円' && <span className="text-xl ml-1">{unit}</span>}
      </div>
      {change !== undefined && (
        <div className="mt-2">
          <ChangeIndicator value={change} isPositiveGood={isPositiveGood} />
        </div>
      )}
      {isExpandable && (
        <div className="absolute bottom-2 right-2">
          <ChevronDownIcon
            className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
              isExpanded ? 'rotate-180' : ''
            }`}
          />
        </div>
      )}
      {isResult && (
        <div className="absolute -top-2 -right-2 bg-amber-400 text-amber-900 text-xs font-bold px-2 py-1 rounded-full">
          結果
        </div>
      )}
    </div>
  )

  // サブフォーミュラカード（ブレークダウン用の小さいカード）
  const SubFormulaCard = ({
    label,
    value,
    unit = '',
    isResult = false,
  }: {
    label: string
    value: number
    unit?: string
    isResult?: boolean
  }) => (
    <div className={`
      rounded-lg px-4 py-3 min-w-[100px] text-center
      ${isResult ? 'bg-blue-100 border border-blue-300' : 'bg-gray-50'}
    `}>
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
          <DateRangeFilter
            value={dateRange}
            onChange={setDateRange}
            onCustomDateRange={handleCustomDateRange}
            customDateRange={customDateRange}
          />
        </div>

        {/* メイン数式（CPO）- 全媒体合算 */}
        <div className="mb-12">
          <h2 className="text-lg font-semibold text-gray-700 mb-6 flex items-center gap-2">
            <span className="text-2xl">📐</span> CPO（注文獲得単価）- 全媒体合算
          </h2>
          <div className="bg-gradient-to-r from-slate-50 to-gray-50 rounded-2xl p-8 shadow-inner">
            <div className="flex items-center justify-center gap-8">
              <div>
                <FormulaCard
                  label="広告費用"
                  value={metrics.cost}
                  change={metrics.changes.cost}
                  unit="円"
                  isPositiveGood={false}
                  isExpandable={true}
                  isExpanded={expandedMetric === 'cost'}
                  onClick={() => setExpandedMetric(expandedMetric === 'cost' ? null : 'cost')}
                />
                {/* 広告費用のブレークダウン */}
                {expandedMetric === 'cost' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4 space-y-3"
                  >
                    <div className="flex items-center justify-center gap-4">
                      <SubFormulaCard
                        label="Meta広告費"
                        value={metrics.metaCost}
                        unit="円"
                      />
                      <Operator symbol="+" size="sm" />
                      <SubFormulaCard
                        label="Google広告費"
                        value={metrics.googleCost}
                        unit="円"
                      />
                      <Operator symbol="=" size="sm" />
                      <SubFormulaCard
                        label="合計広告費"
                        value={metrics.cost}
                        unit="円"
                        isResult
                      />
                    </div>
                  </motion.div>
                )}
              </div>
              <Operator symbol="÷" />
              <FormulaCard
                label="コンバージョン"
                value={metrics.cv}
                change={metrics.changes.cv}
              />
              <Operator symbol="=" />
              <FormulaCard
                label="CPO"
                value={metrics.cpo}
                change={metrics.changes.cpo}
                unit="円"
                isResult
                isPositiveGood={false}
              />
            </div>
          </div>
        </div>

        {/* グラフセクション */}
        <div className="mb-12 bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-700">CV数とCPOの推移</h3>
              <p className="text-sm text-gray-500 mt-1">
                下部のバーをドラッグして期間を選択できます
              </p>
            </div>
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

              {brushRange && (
                <button
                  onClick={handleSaveSnapshot}
                  className="px-4 py-1.5 text-sm bg-blue-100 hover:bg-blue-200 border border-blue-400 rounded-md transition-colors font-semibold text-blue-800 flex items-center gap-2"
                >
                  <CameraIcon className="w-4 h-4" />
                  選択期間を保存
                </button>
              )}

              <button
                onClick={() => setShowSnapshotList(true)}
                className="px-4 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 border border-gray-400 rounded-md transition-colors font-semibold text-gray-800 flex items-center gap-2"
              >
                <BookmarkIcon className="w-4 h-4" />
                保存済みレポート ({snapshots?.length || 0})
              </button>
              {brushRange && (
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
              )}
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
          <ResponsiveContainer width="100%" height={300}>
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
              <Tooltip formatter={(value: number) => formatNumber(value)} />
              <Legend
                content={(props) => {
                  const { payload } = props;
                  return (
                    <div className="flex items-center justify-center gap-6 mt-4">
                      {/* 通常の凡例項目 */}
                      {payload?.map((entry, index) => (
                        <span key={`item-${index}`} className="flex items-center gap-2">
                          <span
                            className={entry.dataKey === 'cv' ? 'w-4 h-3 bg-blue-500' : 'w-4 h-1 bg-orange-500'}
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
                  );
                }}
              />
              <Bar yAxisId="left" dataKey="cv" fill="#3B82F6" name="CV数" />
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

        {/* Meta専用セクション with ブレークダウン */}
        <div className="mb-12">
          <h2 className="text-lg font-semibold text-gray-700 mb-6 flex items-center gap-2">
            <span className="text-2xl">📊</span> Meta広告
          </h2>
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-8 shadow-inner">
            <div className="flex items-center justify-center gap-8">
              <FormulaCard
                label="Meta広告費"
                value={metaSpendData?.current?.spend || 0}
                change={metaSpendData?.previous?.spend
                  ? ((metaSpendData.current.spend - metaSpendData.previous.spend) / metaSpendData.previous.spend) * 100
                  : undefined}
                unit="円"
                isPositiveGood={false}
              />
              <Operator symbol="÷" />
              <FormulaCard
                label="ECForce CV"
                value={metrics.cv}
                change={metrics.changes.cv}
                isExpandable={true}
                isExpanded={expandedMetric === 'cv'}
                onClick={() => toggleMetricExpansion('cv')}
              />
              <Operator symbol="=" />
              <FormulaCard
                label="Meta CPO"
                value={(() => {
                  const metaCost = metaSpendData?.current?.spend || 0
                  return metrics.cv > 0 ? metaCost / metrics.cv : 0
                })()}
                unit="円"
                isResult
                isPositiveGood={false}
                isExpandable={true}
                isExpanded={expandedMetric === 'cpo'}
                onClick={() => toggleMetricExpansion('cpo')}
              />
            </div>

            {/* Meta CVブレークダウン */}
            <AnimatePresence>
              {expandedMetric === 'cv' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  <div className="mt-8 pt-8 border-t border-blue-200">
                    <p className="text-sm text-gray-600 mb-2 text-center">
                      CV = IMP × CTR × CVR (Meta広告経由)
                    </p>
                    <p className="text-xs text-gray-500 mb-4 text-center">
                      ※CVはECForceの実際の注文数、CVRは逆算値（CV ÷ クリック数）
                    </p>
                    <div className="flex items-center justify-center gap-3">
                      <SubFormulaCard
                        label="Meta IMP"
                        value={metaSpendData?.current?.impressions || 0}
                        unit=""
                      />
                      <Operator symbol="×" size="sm" />
                      <SubFormulaCard
                        label="Meta CTR"
                        value={metaSpendData?.current?.ctr || 0}
                        unit="%"
                      />
                      <Operator symbol="×" size="sm" />
                      <SubFormulaCard
                        label="CVR（逆算）"
                        value={metrics.cvr}
                        unit="%"
                      />
                      <Operator symbol="=" size="sm" />
                      <SubFormulaCard
                        label="ECForce CV"
                        value={metrics.cv}
                        unit=""
                        isResult={true}
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Meta CPOブレークダウン */}
            <AnimatePresence>
              {expandedMetric === 'cpo' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  <div className="mt-8 pt-8 border-t border-blue-200">
                    <p className="text-sm text-gray-600 mb-2 text-center">
                      Meta CPO = Meta CPC ÷ CVR
                    </p>
                    <p className="text-xs text-gray-500 mb-4 text-center">
                      ※CVRはECForceのCVとMetaのクリック数から算出
                    </p>
                    <div className="flex items-center justify-center gap-3">
                      <SubFormulaCard
                        label="Meta CPC"
                        value={metaSpendData?.current?.cpc || 0}
                        unit="円"
                      />
                      <Operator symbol="÷" size="sm" />
                      <SubFormulaCard
                        label="CVR（ECForce基準）"
                        value={metrics.cvr}
                        unit="%"
                      />
                      <Operator symbol="=" size="sm" />
                      <SubFormulaCard
                        label="Meta CPO"
                        value={(() => {
                          const metaCost = metaSpendData?.current?.spend || 0
                          return metrics.cv > 0 ? metaCost / metrics.cv : 0
                        })()}
                        unit="円"
                        isResult={true}
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
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
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-8 shadow-inner">
            <div className="flex items-center justify-center gap-8">
              <FormulaCard
                label="Google広告費"
                value={0}
                unit="円"
                isPositiveGood={false}
              />
              <Operator symbol="÷" />
              <FormulaCard
                label="ECForce CV"
                value={0}
              />
              <Operator symbol="=" />
              <FormulaCard
                label="Google CPO"
                value={0}
                unit="円"
                isResult
                isPositiveGood={false}
              />
            </div>

            {/* 連携準備中メッセージ */}
            <div className="mt-6 pt-6 border-t border-green-200 text-center">
              <p className="text-sm text-green-600">
                Google Ads API連携準備中
              </p>
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
          <div className="bg-gradient-to-r from-purple-50 to-fuchsia-50 rounded-2xl p-8 shadow-inner">
            <div className="flex items-center justify-center gap-8">
              <FormulaCard
                label="Yahoo!広告費"
                value={0}
                unit="円"
                isPositiveGood={false}
              />
              <Operator symbol="÷" />
              <FormulaCard
                label="ECForce CV"
                value={0}
              />
              <Operator symbol="=" />
              <FormulaCard
                label="Yahoo! CPO"
                value={0}
                unit="円"
                isResult
                isPositiveGood={false}
              />
            </div>

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