import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useConvex } from 'convex/react'
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
} from '@heroicons/react/24/outline'
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

  // ブレークダウン展開状態の管理
  const [expandedMetric, setExpandedMetric] = useState<'cv' | 'cpo' | null>(null)

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

      const periodDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      const previousStart = new Date(startDate)
      previousStart.setDate(previousStart.getDate() - periodDays - 1)
      const previousEnd = new Date(startDate)
      previousEnd.setDate(previousEnd.getDate() - 1)

      const previousMetaData = await fetchMetaSpendData(selectedAccountId, previousStart, previousEnd, false)

      setMetaSpendData({
        current: metaData,
        previous: previousMetaData
      })

      setLastUpdateTime(new Date())
    }

    if (selectedAccountId && !isLoadingAccounts) {
      fetchAllData()
    }
  }, [selectedAccountId, calculateDateRange, isLoadingAccounts, fetchDataFromECForce, fetchMetaSpendData])

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

  // KPIメトリクスの計算
  const calculateKPIMetrics = useMemo(() => {
    const cost = metaSpendData?.current?.spend || kpiSummaryData?.current?.cost || 0
    const cv = kpiSummaryData?.current?.cvOrder || ecforceData.reduce((sum, item) => sum + item.cvOrder, 0) || 0
    const sales = kpiSummaryData?.current?.salesAmount || ecforceData.reduce((sum, item) => sum + item.salesAmount, 0) || 0
    const clicks = metaSpendData?.current?.clicks || kpiSummaryData?.current?.accessCount || 0
    const impressions = metaSpendData?.current?.impressions || 0

    // 計算指標
    const cpo = cv > 0 ? cost / cv : 0
    const roas = cost > 0 ? sales / cost : 0
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0
    const cvr = clicks > 0 ? (cv / clicks) * 100 : 0
    const cpc = clicks > 0 ? cost / clicks : 0
    const cpm = impressions > 0 ? (cost / impressions) * 1000 : 0

    // 前期比較データ
    const previousCost = metaSpendData?.previous?.spend || kpiSummaryData?.previous?.cost || 0
    const previousCv = kpiSummaryData?.previous?.cvOrder || 0
    const previousSales = kpiSummaryData?.previous?.salesAmount || 0
    const previousClicks = metaSpendData?.previous?.clicks || kpiSummaryData?.previous?.accessCount || 0
    const previousImpressions = metaSpendData?.previous?.impressions || 0

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
  }, [metaSpendData, kpiSummaryData, ecforceData])

  // グラフ用データ整形（ECForceとMetaデータを統合）
  const chartData = useMemo(() => {
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
        data.push({
          date: `${date.getMonth() + 1}/${date.getDate()}`,
          cv: 0,
          cpo: 0,
        })
      }
      return data
    }

    return sortedData
  }, [ecforceData, dailyMetaData, trendData])

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
        <span>{Math.abs(Math.round(value))}%</span>
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
              <FormulaCard
                label="広告費用"
                value={metrics.cost}
                change={metrics.changes.cost}
                unit="円"
                isPositiveGood={false}
              />
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
          <h3 className="text-lg font-semibold text-gray-700 mb-4">CV数とCPOの推移</h3>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip formatter={(value: number) => formatNumber(value)} />
              <Legend />
              <Bar yAxisId="left" dataKey="cv" fill="#3B82F6" name="CV数" />
              <Line yAxisId="right" type="monotone" dataKey="cpo" stroke="#F59E0B" strokeWidth={2} name="CPO" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Meta専用セクション with ブレークダウン */}
        <div className="mb-12">
          <h2 className="text-lg font-semibold text-gray-700 mb-6 flex items-center gap-2">
            <span className="text-2xl">📊</span> Meta広告 CPO（注文獲得単価）
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

          {/* Meta Breakdown テーブル */}
          <div className="mt-8">
            <MetaCampaignBreakdown
              accountId={selectedAccountId}
              startDate={startDate}
              endDate={endDate}
              accounts={accounts}
              ecforceData={ecforceData}
            />
          </div>
        </div>

        {/* その他の数式 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* ROAS */}
          <div>
            <h3 className="text-lg font-semibold text-gray-700 mb-6 flex items-center gap-2">
              <span className="text-2xl">📈</span> ROAS（広告費用対効果）
            </h3>
            <div className="bg-gradient-to-r from-slate-50 to-gray-50 rounded-2xl p-8 shadow-inner">
              <div className="flex items-center justify-center gap-8">
                <FormulaCard
                  label="売上"
                  value={metrics.sales}
                  change={metrics.changes.sales}
                  unit="円"
                />
                <Operator symbol="÷" />
                <FormulaCard
                  label="広告費"
                  value={metrics.cost}
                  change={metrics.changes.cost}
                  unit="円"
                  isPositiveGood={false}
                />
                <Operator symbol="=" />
                <FormulaCard
                  label="ROAS"
                  value={metrics.roas}
                  change={metrics.changes.roas}
                  isResult
                />
              </div>
            </div>
          </div>

          {/* CVR */}
          <div>
            <h3 className="text-lg font-semibold text-gray-700 mb-6 flex items-center gap-2">
              <span className="text-2xl">🎯</span> CVR（コンバージョン率）
            </h3>
            <div className="bg-gradient-to-r from-slate-50 to-gray-50 rounded-2xl p-8 shadow-inner">
              <div className="flex items-center justify-center gap-8">
                <FormulaCard
                  label="CV"
                  value={metrics.cv}
                  change={metrics.changes.cv}
                />
                <Operator symbol="÷" />
                <FormulaCard
                  label="クリック"
                  value={metrics.clicks}
                  change={metrics.changes.clicks}
                />
                <Operator symbol="=" />
                <FormulaCard
                  label="CVR"
                  value={metrics.cvr}
                  change={metrics.changes.cvr}
                  unit="%"
                  isResult
                />
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