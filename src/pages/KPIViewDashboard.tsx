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
  ReferenceArea,
  Brush,
} from 'recharts'
import {
  saveSelectedAccount,
  getSelectedAccount,
  saveCachedData,
  getCachedData,
  clearCachedData,
} from '@/utils/localStorage'
import { logAPI, logState } from '../utils/debugLogger'

export default function KPIViewDashboard() {
  const convex = useConvex()
  const [data, setData] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [accounts, setAccounts] = useState<MetaAccount[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true)
  const [ecforceData, setEcforceData] = useState<any[]>([])
  const [metaSpendData, setMetaSpendData] = useState<any>(null)
  const [dailyMetaData, setDailyMetaData] = useState<any[]>([]) // 日別Metaデータ用state

  // ドラッグ選択用のstate
  const [isDragging, setIsDragging] = useState(false)
  const [dragStartIndex, setDragStartIndex] = useState<number | null>(null)
  const [dragEndIndex, setDragEndIndex] = useState<number | null>(null)
  const [selectedRange, setSelectedRange] = useState<{ start: number; end: number } | null>(null)


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

  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null)

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

  // Meta APIから広告費を取得（シンプル版）
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
        fields: 'spend,impressions,clicks,actions,date_start,date_stop',
        limit: withDailyData ? '500' : '1',
      }

      // 日別データが必要な場合はtime_incrementを追加
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
        // 日別データを返す
        const dailyData = result.data.map((item: any) => ({
          date: item.date_start,
          spend: parseFloat(item.spend || '0'),
          impressions: parseInt(item.impressions || '0'),
          clicks: parseInt(item.clicks || '0'),
          actions: item.actions || [],
        }))
        console.log('✅ Meta API日別データ取得完了:', dailyData.length, '日分')
        return dailyData
      } else if (result.data?.[0]) {
        const metaData = {
          spend: parseFloat(result.data[0].spend || '0'),
          impressions: parseInt(result.data[0].impressions || '0'),
          clicks: parseInt(result.data[0].clicks || '0'),
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

      // ECForceデータを取得
      await fetchDataFromECForce(formatDateToISO(startDate), formatDateToISO(endDate))

      // Metaデータを取得（集計データ）
      const metaData = await fetchMetaSpendData(selectedAccountId, startDate, endDate, false)

      // Meta日別データを取得（グラフ用）
      const dailyData = await fetchMetaSpendData(selectedAccountId, startDate, endDate, true)
      if (dailyData && Array.isArray(dailyData)) {
        setDailyMetaData(dailyData)
      }

      // 前期間のデータも取得（比較用）
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
      const metaData = await fetchMetaSpendData(accountId, startDate, endDate)
      setMetaSpendData({ current: metaData, previous: null })
    }
  }

  // カスタム日付範囲ハンドラー
  const handleCustomDateRange = (start: Date, end: Date) => {
    setCustomDateRange({ start, end })
  }

  // Brush選択のハンドラー
  const handleBrushChange = (e: any) => {
    if (!e || (!e.startIndex && e.startIndex !== 0) || (!e.endIndex && e.endIndex !== 0)) return

    const start = e.startIndex
    const end = e.endIndex

    if (start !== end && chartData[start] && chartData[end]) {
      const startDateStr = chartData[start].originalDate
      const endDateStr = chartData[end].originalDate

      // カスタム期間として設定
      const newStartDate = new Date(startDateStr)
      const newEndDate = new Date(endDateStr)

      setCustomDateRange({ start: newStartDate, end: newEndDate })
      setDateRange('custom')
      setSelectedRange({ start, end })

      console.log('📅 期間選択:', {
        start: startDateStr,
        end: endDateStr,
        startIndex: start,
        endIndex: end
      })
    }
  }

  // マウスドラッグイベントハンドラー（DOM座標ベース）
  const chartRef = useRef<HTMLDivElement>(null)

  const getIndexFromMousePosition = useCallback((clientX: number, containerRect: DOMRect) => {
    if (!chartData || chartData.length === 0) return -1;

    // チャートエリアの実際の描画領域を計算（マージンを考慮）
    const chartMargin = { left: 60, right: 60, top: 20, bottom: 80 }; // Brushの分も含む
    const chartWidth = containerRect.width - chartMargin.left - chartMargin.right;
    const relativeX = clientX - containerRect.left - chartMargin.left;

    // 相対位置からインデックスを計算
    const ratio = relativeX / chartWidth;
    const index = Math.round(ratio * (chartData.length - 1));

    return Math.max(0, Math.min(index, chartData.length - 1));
  }, [chartData]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    console.log('🖱️ DOM MouseDown Event triggered', { chartDataLength: chartData.length });

    if (!chartData || chartData.length === 0) {
      console.log('❌ ChartData is empty');
      return;
    }

    if (!chartRef.current) {
      console.log('❌ Chart ref not available');
      return;
    }

    const rect = chartRef.current.getBoundingClientRect();
    const index = getIndexFromMousePosition(e.clientX, rect);

    console.log(`✅ Starting drag at index: ${index}, date: ${chartData[index]?.date}`);
    setIsDragging(true);
    setDragStartIndex(index);
    setDragEndIndex(index);
  }, [chartData, getIndexFromMousePosition])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) {
      return;
    }

    if (!chartData || chartData.length === 0 || !chartRef.current) {
      return;
    }

    const rect = chartRef.current.getBoundingClientRect();
    const index = getIndexFromMousePosition(e.clientX, rect);

    console.log(`🔄 Moving drag to index: ${index}, date: ${chartData[index]?.date}`);
    setDragEndIndex(index);
  }, [isDragging, chartData, getIndexFromMousePosition])

  const handleMouseUp = useCallback(() => {
    console.log(`🖱️ MouseUp - isDragging: ${isDragging}, start: ${dragStartIndex}, end: ${dragEndIndex}`);

    if (!isDragging || dragStartIndex === null || dragEndIndex === null) {
      console.log('❌ MouseUp: Invalid state');
      setIsDragging(false)
      return
    }

    const start = Math.min(dragStartIndex, dragEndIndex)
    const end = Math.max(dragStartIndex, dragEndIndex)

    console.log(`📊 Selection range: ${start} to ${end}`);

    if (start !== end && chartData[start] && chartData[end]) {
      const startDateStr = chartData[start].originalDate
      const endDateStr = chartData[end].originalDate

      console.log(`📅 Setting date range: ${startDateStr} to ${endDateStr}`);

      // カスタム期間として設定
      const newStartDate = new Date(startDateStr)
      const newEndDate = new Date(endDateStr)

      setCustomDateRange({ start: newStartDate, end: newEndDate })
      setDateRange('custom')
      setSelectedRange({ start, end })

      console.log('✅ ドラッグ期間選択完了');
    } else {
      console.log('❌ Invalid selection range');
    }

    setIsDragging(false)
    setDragStartIndex(null)
    setDragEndIndex(null)
  }, [isDragging, dragStartIndex, dragEndIndex, chartData, setCustomDateRange, setDateRange])

  // 選択をリセット
  const handleResetSelection = () => {
    setSelectedRange(null)
    setIsDragging(false)
    setDragStartIndex(null)
    setDragEndIndex(null)
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

  // KPI計算（MetaとECForceデータの統合）
  const cost = metaSpendData?.current?.spend || kpiSummaryData?.current?.cost || 0
  const cv = kpiSummaryData?.current?.cvOrder || ecforceData.reduce((sum, item) => sum + item.cvOrder, 0) || 0
  const sales = kpiSummaryData?.current?.salesAmount || ecforceData.reduce((sum, item) => sum + item.salesAmount, 0) || 0
  const clicks = metaSpendData?.current?.clicks || kpiSummaryData?.current?.accessCount || 0
  const cpo = cv > 0 ? cost / cv : 0
  const roas = cost > 0 ? sales / cost : 0
  const cvr = clicks > 0 ? (cv / clicks) * 100 : 0

  // 前期比較データ
  const previousCost = metaSpendData?.previous?.spend || kpiSummaryData?.previous?.cost || 0
  const previousCv = kpiSummaryData?.previous?.cvOrder || 0
  const previousSales = kpiSummaryData?.previous?.salesAmount || 0
  const previousClicks = metaSpendData?.previous?.clicks || kpiSummaryData?.previous?.accessCount || 0
  const previousCpo = previousCv > 0 ? previousCost / previousCv : 0
  const previousRoas = previousCost > 0 ? previousSales / previousCost : 0
  const previousCvr = previousClicks > 0 ? (previousCv / previousClicks) * 100 : 0

  // 変化率計算
  const costChange = previousCost > 0 ? ((cost - previousCost) / previousCost) * 100 : 0
  const cvChange = previousCv > 0 ? ((cv - previousCv) / previousCv) * 100 : 0
  const cpoChange = previousCpo > 0 ? ((cpo - previousCpo) / previousCpo) * 100 : 0
  const salesChange = previousSales > 0 ? ((sales - previousSales) / previousSales) * 100 : 0
  const clicksChange = previousClicks > 0 ? ((clicks - previousClicks) / previousClicks) * 100 : 0
  const roasChange = previousRoas > 0 ? ((roas - previousRoas) / previousRoas) * 100 : 0
  const cvrChange = previousCvr > 0 ? ((cvr - previousCvr) / previousCvr) * 100 : 0

  // グラフ用データ整形（ECForceとMetaデータを統合）
  const chartData = useMemo(() => {
    // ECForceデータとMeta日別データを日付でマージ
    const dataMap = new Map<string, { cv: number; spend: number; originalDate: string }>()

    // ECForceデータを日付ごとに集計
    ecforceData.forEach(item => {
      const dateStr = item.date
      if (!dataMap.has(dateStr)) {
        dataMap.set(dateStr, { cv: 0, spend: 0, originalDate: dateStr })
      }
      const existing = dataMap.get(dateStr)!
      existing.cv += item.cvOrder || 0
    })

    // Meta日別データを追加
    dailyMetaData.forEach(item => {
      const dateStr = item.date
      if (!dataMap.has(dateStr)) {
        dataMap.set(dateStr, { cv: 0, spend: 0, originalDate: dateStr })
      }
      const existing = dataMap.get(dateStr)!
      existing.spend += item.spend || 0
    })

    // Convex APIのトレンドデータも考慮（cost情報がある場合）
    if (trendData?.data) {
      trendData.data.forEach((item: any) => {
        const dateStr = item.date
        if (dataMap.has(dateStr)) {
          const existing = dataMap.get(dateStr)!
          // Convexからのcostデータがあればそれを使用（優先度低）
          if (item.cost && !existing.spend) {
            existing.spend = item.cost
          }
        }
      })
    }

    // マップを配列に変換し、日付でソート
    const sortedData = Array.from(dataMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([dateStr, data]) => {
        // 日付を MM/DD 形式に変換
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

    // データがない場合はテスト用のダミーデータを返す
    if (sortedData.length === 0) {
      console.log('📊 Using dummy data for testing');
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
          cv: Math.floor(Math.random() * 20) + 5, // 5-25のランダムCV
          cpo: Math.floor(Math.random() * 100) + 50, // 50-150のランダムCPO
        })
      }
      console.log('📊 Generated dummy data:', data);
      return data
    }

    return sortedData
  }, [ecforceData, dailyMetaData, trendData])

  // 数値フォーマット
  const formatNumber = (num: number) => num.toLocaleString('ja-JP')
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

  // 数式カードコンポーネント
  const FormulaCard = ({
    label,
    value,
    change,
    unit = '',
    isResult = false,
    isPositiveGood = true,
  }: {
    label: string
    value: number
    change?: number
    unit?: string
    isResult?: boolean
    isPositiveGood?: boolean
  }) => (
    <div
      className={`
        relative rounded-xl p-6 transition-all duration-200
        ${isResult
          ? 'bg-gradient-to-br from-yellow-50 to-amber-50 border-2 border-amber-300 shadow-lg'
          : 'bg-white border border-gray-200 shadow-md'
        }
      `}
    >
      <div className={`text-xs text-gray-500 font-medium tracking-wider mb-2 ${
        label.includes('Meta') || label.includes('ECForce') ? '' : 'uppercase'
      }`}>
        {label}
      </div>
      <div className={`text-3xl font-bold ${isResult ? 'text-amber-900' : 'text-gray-900'}`}>
        {unit === '¥' || unit === '円' ? formatCurrency(value) : formatNumber(value)}
        {unit && unit !== '¥' && unit !== '円' && <span className="text-xl ml-1">{unit}</span>}
      </div>
      {change !== undefined && (
        <div className="mt-2">
          <ChangeIndicator value={change} isPositiveGood={isPositiveGood} />
        </div>
      )}
      {isResult && (
        <div className="absolute -top-2 -right-2 bg-amber-400 text-amber-900 text-xs font-bold px-2 py-1 rounded-full">
          結果
        </div>
      )}
    </div>
  )

  // 演算子コンポーネント
  const Operator = ({ symbol }: { symbol: string }) => (
    <div className="flex items-center justify-center text-5xl font-light text-gray-400">
      {symbol}
    </div>
  )

  // ローディング状態
  if (isLoadingAccounts) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-gray-500">アカウント読み込み中...</div>
      </div>
    )
  }

  // エラー状態
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-red-500">エラー: {error}</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* ヘッダー部分 - 全幅 */}
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

      {/* メインコンテンツ部分 - 全幅 */}
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

        {/* メイン数式（CPO） */}
        <div className="mb-12">
          <h2 className="text-lg font-semibold text-gray-700 mb-6 flex items-center gap-2">
            <span className="text-2xl">📐</span> CPO（注文獲得単価）
          </h2>
          <div className="bg-gradient-to-r from-slate-50 to-gray-50 rounded-2xl p-8 shadow-inner">
            <div className="flex items-center justify-center gap-8">
              <FormulaCard
                label="広告費用"
                value={cost}
                change={costChange}
                unit="円"
                isPositiveGood={false}
              />
              <Operator symbol="÷" />
              <FormulaCard
                label="コンバージョン"
                value={cv}
                change={cvChange}
              />
              <Operator symbol="=" />
              <FormulaCard
                label="CPO"
                value={cpo}
                change={cpoChange}
                unit="円"
                isResult
                isPositiveGood={false}
              />
            </div>
          </div>
        </div>

        {/* グラフセクション（ドラッグ選択機能付き） */}
        <div className="mb-12 bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-700">CV数とCPOの推移</h3>
              <p className="text-sm text-gray-500 mt-1">
                チャート上でドラッグして期間を選択できます
              </p>
            </div>
            {selectedRange && (
              <div className="flex items-center gap-2">

                <button
                  onClick={handleResetSelection}
                  className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                >
                  選択をリセット
                </button>
              </div>
            )}
          </div>

          <ResponsiveContainer width="100%" height={300}>
            <div
              ref={chartRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={() => setIsDragging(false)}
              style={{
                width: '100%',
                height: '100%',
                cursor: isDragging ? 'grabbing' : 'grab',
                border: isDragging ? '2px solid #3b82f6' : 'none',
                borderRadius: '8px',
                padding: '4px',
                backgroundColor: 'transparent'
              }}
            >
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip
                  formatter={(value: number) => formatNumber(value)}
                  cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
                />
                <Legend />
                <Bar
                  yAxisId="left"
                  dataKey="cv"
                  fill="#3B82F6"
                  name="CV数"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="cpo"
                  stroke="#F59E0B"
                  strokeWidth={2}
                  name="CPO"
                />

                {/* ドラッグ選択範囲の表示 */}
                {isDragging && dragStartIndex !== null && dragEndIndex !== null && (
                  <ReferenceArea
                    yAxisId="left"
                    x1={chartData[Math.min(dragStartIndex, dragEndIndex)]?.date}
                    x2={chartData[Math.max(dragStartIndex, dragEndIndex)]?.date}
                    strokeOpacity={0.3}
                    fill="#3b82f6"
                    fillOpacity={0.3}
                  />
                )}

                {/* 選択済み範囲の表示（ドラッグ中でない時） */}
                {!isDragging && selectedRange && (
                  <ReferenceArea
                    yAxisId="left"
                    x1={chartData[selectedRange.start]?.date}
                    x2={chartData[selectedRange.end]?.date}
                    strokeOpacity={0.5}
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.1}
                  />
                )}

                {/* Brush コンポーネントを追加してドラッグ選択を有効化 */}
                <Brush
                  dataKey="date"
                  height={30}
                  stroke="#3B82F6"
                  fill="#3B82F6"
                  fillOpacity={0.2}
                  onChange={handleBrushChange}
                  startIndex={selectedRange?.start}
                  endIndex={selectedRange?.end}
                />
              </ComposedChart>
            </div>
          </ResponsiveContainer>
        </div>

        {/* Meta専用 CPO */}
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
                value={cv}
                change={cvChange}
              />
              <Operator symbol="=" />
              <FormulaCard
                label="Meta CPO"
                value={(() => {
                  const metaCost = metaSpendData?.current?.spend || 0
                  return cv > 0 ? metaCost / cv : 0
                })()}
                change={(() => {
                  const metaCost = metaSpendData?.current?.spend || 0
                  const prevMetaCost = metaSpendData?.previous?.spend || 0
                  const currentCPO = cv > 0 ? metaCost / cv : 0
                  const prevCPO = previousCv > 0 ? prevMetaCost / previousCv : 0
                  return prevCPO > 0 ? ((currentCPO - prevCPO) / prevCPO) * 100 : undefined
                })()}
                unit="円"
                isResult
                isPositiveGood={false}
              />
            </div>
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
                  value={sales}
                  change={salesChange}
                  unit="円"
                />
                <Operator symbol="÷" />
                <FormulaCard
                  label="広告費"
                  value={cost}
                  change={costChange}
                  unit="円"
                  isPositiveGood={false}
                />
                <Operator symbol="=" />
                <FormulaCard
                  label="ROAS"
                  value={roas}
                  change={roasChange}
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
                  value={cv}
                  change={cvChange}
                />
                <Operator symbol="÷" />
                <FormulaCard
                  label="クリック"
                  value={clicks}
                  change={clicksChange}
                />
                <Operator symbol="=" />
                <FormulaCard
                  label="CVR"
                  value={cvr}
                  change={cvrChange}
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