import React, { useState, useEffect, useMemo } from 'react'
import { useVibeLogger } from '../hooks/useVibeLogger'
import { useQuery, useConvex } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { DateRangeFilter } from '../features/meta-api/components/DateRangeFilter'
import type { DateRangeFilter as DateRangeFilterType } from '../features/meta-api/hooks/useAdFatigueSimplified'
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
} from 'recharts'

export default function KPIViewDashboard() {
  const logger = useVibeLogger('KPIViewDashboard')
  const convex = useConvex()

  // 期間選択の状態管理（MainDashboardと同様）
  const [dateRange, setDateRange] = useState<DateRangeFilterType>(() => {
    const saved = localStorage.getItem('selectedDateRange')
    return (saved as DateRangeFilterType) || 'last_7d'
  })
  const [customDateRange, setCustomDateRange] = useState<{ start: Date; end: Date } | null>(() => {
    const saved = localStorage.getItem('customDateRange')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        return {
          start: new Date(parsed.start),
          end: new Date(parsed.end),
        }
      } catch {
        return null
      }
    }
    return null
  })

  // Metaアカウント情報
  const [metaAccounts, setMetaAccounts] = useState<any[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const [isLoadingMeta, setIsLoadingMeta] = useState(false)
  const [metaSpendData, setMetaSpendData] = useState<any>(null)

  // 期間選択が変更されたらlocalStorageに保存
  useEffect(() => {
    localStorage.setItem('selectedDateRange', dateRange)
    logger.debug('期間選択を保存', { dateRange })
  }, [dateRange])

  // カスタム期間が変更されたらlocalStorageに保存
  useEffect(() => {
    if (customDateRange) {
      localStorage.setItem('customDateRange', JSON.stringify(customDateRange))
      logger.debug('カスタム期間を保存', { customDateRange })
    }
  }, [customDateRange])

  useEffect(() => {
    logger.debug('KPIViewDashboard マウント', { dateRange })
    return () => {
      logger.debug('KPIViewDashboard アンマウント')
    }
  }, [])

  // Metaアカウント情報を取得
  useEffect(() => {
    const loadAccounts = async () => {
      try {
        const accounts = await convex.query(api.metaAccounts.getAccounts)
        setMetaAccounts(accounts || [])
        // アクティブなアカウントを自動選択
        const activeAccount = accounts?.find((acc: any) => acc.isActive) || accounts?.[0]
        if (activeAccount) {
          setSelectedAccountId(activeAccount.accountId)
        }
      } catch (error) {
        console.error('Metaアカウント取得エラー:', error)
      }
    }
    loadAccounts()
  }, [convex])

  // カスタム日付範囲のハンドラー
  const handleCustomDateRange = (start: Date, end: Date) => {
    logger.action('カスタム日付範囲設定', { start, end })
    setCustomDateRange({ start, end })
  }

  // 日付フォーマット関数
  const formatDateToISO = (date: Date | null) => {
    if (!date) return ''
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Meta APIから広告費を取得
  const fetchMetaSpendData = async (startDate: Date, endDate: Date) => {
    const account = metaAccounts.find(acc => acc.accountId === selectedAccountId)
    if (!account?.accessToken) return null

    try {
      // Meta API URL構築
      const baseUrl = 'https://graph.facebook.com/v23.0'
      const cleanAccountId = account.accountId.replace('act_', '')
      const url = new URL(`${baseUrl}/act_${cleanAccountId}/insights`)

      // パラメータ設定（期間集約データのみ取得）
      const params = {
        access_token: account.accessToken,
        time_range: JSON.stringify({
          since: formatDateToISO(startDate),
          until: formatDateToISO(endDate),
        }),
        level: 'account',
        fields: 'spend,impressions,clicks',
        limit: '1',
      }

      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value)
      })

      // API呼び出し
      const response = await fetch(url.toString())
      const result = await response.json()

      if (result.data?.[0]) {
        return {
          spend: parseFloat(result.data[0].spend || '0'),
          impressions: parseInt(result.data[0].impressions || '0'),
          clicks: parseInt(result.data[0].clicks || '0'),
        }
      }
    } catch (error) {
      console.error('Meta API取得エラー:', error)
    }
    return null
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

  // KPIサマリー取得
  const { startDate, endDate } = calculateDateRange
  const kpiSummaryData = useQuery(
    api.ecforcePeriodAnalysis.getKPISummary,
    startDate && endDate
      ? {
          startDate: formatDateToISO(startDate),
          endDate: formatDateToISO(endDate),
          advertiser: undefined, // 全体データ
          compareWithPrevious: true, // 前期比較を有効に
        }
      : 'skip'
  )

  // MetaデータとECForceデータを統合
  useEffect(() => {
    const fetchAllData = async () => {
      if (!startDate || !endDate || !selectedAccountId) return

      setIsLoadingMeta(true)
      try {
        // Meta APIからデータ取得
        const metaData = await fetchMetaSpendData(startDate, endDate)

        // 前期間のデータも取得（比較用）
        const periodDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
        const previousStart = new Date(startDate)
        previousStart.setDate(previousStart.getDate() - periodDays - 1)
        const previousEnd = new Date(startDate)
        previousEnd.setDate(previousEnd.getDate() - 1)

        const previousMetaData = await fetchMetaSpendData(previousStart, previousEnd)

        setMetaSpendData({
          current: metaData,
          previous: previousMetaData
        })
      } catch (error) {
        console.error('データ取得エラー:', error)
      } finally {
        setIsLoadingMeta(false)
      }
    }

    fetchAllData()
  }, [startDate, endDate, selectedAccountId, metaAccounts])

  // 実データから値を計算（Metaデータ優先）
  const cost = metaSpendData?.current?.spend || kpiSummaryData?.current?.cost || 0
  const cv = kpiSummaryData?.current?.cvOrder || 0  // ecforceのCV（受注）を使用
  const cvPayment = kpiSummaryData?.current?.cvPayment || 0
  const sales = kpiSummaryData?.current?.salesAmount || 0
  const accessCount = kpiSummaryData?.current?.accessCount || 0
  const clicks = metaSpendData?.current?.clicks || accessCount // Metaのクリック数があれば優先
  const impressions = metaSpendData?.current?.impressions || 0
  const cpo = cv > 0 ? cost / cv : 0
  const roas = cost > 0 ? sales / cost : 0
  const cvr = clicks > 0 ? (cv / clicks) * 100 : 0

  // 前期比較データ（Metaデータ優先）
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

  // KPIデータオブジェクト
  const kpiData = {
    cost,
    costChange,
    cv,
    cvChange,
    cpo,
    cpoChange,
    sales,
    salesChange,
    clicks,
    clicksChange,
    roas,
    roasChange,
    cvr,
    cvrChange,
  }

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

  // グラフ用データ整形
  const chartData = useMemo(() => {
    // trendDataの新しい構造に対応
    const dataArray = trendData?.data || []

    if (dataArray.length === 0) {
      // データがない場合は空データ
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

    // 実データから変換
    return dataArray.map(item => ({
      date: item.label || item.date,
      cv: item.cvOrder || 0,
      cpo: item.cvOrder > 0 && item.cost > 0 ? Math.round(item.cost / item.cvOrder) : 0,
    }))
  }, [trendData])

  // 数値フォーマット
  const formatNumber = (num: number) => num.toLocaleString('ja-JP')
  const formatCurrency = (num: number) => `¥${formatNumber(num)}`

  // 変化率の表示
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
        <span>{Math.abs(value)}%</span>
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
    onClick,
  }: {
    label: string
    value: number | string
    change?: number
    unit?: string
    isResult?: boolean
    isPositiveGood?: boolean
    onClick?: () => void
  }) => (
    <div
      className={`
        relative rounded-xl p-6 transition-all duration-200 cursor-pointer
        ${isResult
          ? 'bg-gradient-to-br from-yellow-50 to-amber-50 border-2 border-amber-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1'
          : 'bg-white border border-gray-200 shadow-md hover:shadow-lg hover:border-gray-300'
        }
      `}
      onClick={onClick}
      title={onClick ? 'クリックで詳細表示（開発中）' : undefined}
    >
      <div className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-2">
        {label}
      </div>
      <div className={`text-3xl font-bold ${isResult ? 'text-amber-900' : 'text-gray-900'}`}>
        {typeof value === 'number' ? (unit === '¥' ? formatCurrency(value) : formatNumber(value)) : value}
        {unit && unit !== '¥' && <span className="text-xl ml-1">{unit}</span>}
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
  if (startDate && endDate && (!kpiSummaryData || isLoadingMeta)) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-gray-500">
          {isLoadingMeta ? 'Meta広告データ読み込み中...' : 'データ読み込み中...'}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* ヘッダー部分 */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ChartBarSquareIcon className="w-8 h-8 text-[#f6d856]" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">KPIビュー</h1>
                <p className="text-sm text-gray-600 mt-0.5">数式で見る広告パフォーマンス</p>
              </div>
            </div>
          </div>
          {/* Metaアカウント情報（デバッグ用） */}
          {selectedAccountId && (
            <div className="text-xs text-gray-500">
              Meta Account: {selectedAccountId}
            </div>
          )}
        </div>
      </div>

      {/* メインコンテンツ部分 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 期間選択UI（ヘッダーとCPOの間） */}
        <div className="mb-8 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <DateRangeFilter
            value={dateRange}
            onChange={setDateRange}
            onCustomDateRange={handleCustomDateRange}
            customDateRange={customDateRange}
          />
        </div>

        {/* メイン数式（CPO） - 最上部に大きく表示 */}
        <div className="mb-12">
          <h2 className="text-lg font-semibold text-gray-700 mb-6 flex items-center gap-2">
            <span className="text-2xl">📐</span> CPO（注文獲得単価）
          </h2>
          <div className="bg-gradient-to-r from-slate-50 to-gray-50 rounded-2xl p-8 shadow-inner">
            <div className="flex items-center justify-center gap-8">
              <FormulaCard
                label="広告費用"
                value={kpiData.cost}
                change={kpiData.costChange}
                unit="¥"
                isPositiveGood={false}
                onClick={() => logger.action('広告費用カードクリック', {})}
              />
              <Operator symbol="÷" />
              <FormulaCard
                label="コンバージョン"
                value={kpiData.cv}
                change={kpiData.cvChange}
                onClick={() => logger.action('CVカードクリック', {})}
              />
              <Operator symbol="=" />
              <FormulaCard
                label="CPO"
                value={kpiData.cpo}
                change={kpiData.cpoChange}
                unit="¥"
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
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="cv" fill="#3B82F6" name="CV数" />
              <Line yAxisId="right" type="monotone" dataKey="cpo" stroke="#F59E0B" strokeWidth={2} name="CPO" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* その他の数式（小さめに表示） */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* ROAS */}
          <div className="bg-white rounded-xl p-6 shadow">
            <h3 className="text-sm font-semibold text-gray-600 mb-4 uppercase tracking-wider">
              ROAS（広告費用対効果）
            </h3>
            <div className="flex items-center justify-around gap-4">
              <div className="text-center">
                <div className="text-xs text-gray-500 mb-1">売上</div>
                <div className="text-xl font-bold">{formatCurrency(kpiData.sales)}</div>
                <ChangeIndicator value={kpiData.salesChange} />
              </div>
              <div className="text-2xl text-gray-400">÷</div>
              <div className="text-center">
                <div className="text-xs text-gray-500 mb-1">広告費</div>
                <div className="text-xl font-bold">{formatCurrency(kpiData.cost)}</div>
                <ChangeIndicator value={kpiData.costChange} isPositiveGood={false} />
              </div>
              <div className="text-2xl text-gray-400">=</div>
              <div className="text-center bg-amber-50 rounded-lg px-4 py-2">
                <div className="text-xs text-gray-600 mb-1">ROAS</div>
                <div className="text-xl font-bold text-amber-900">{kpiData.roas.toFixed(2)}</div>
                <ChangeIndicator value={kpiData.roasChange} />
              </div>
            </div>
          </div>

          {/* CVR */}
          <div className="bg-white rounded-xl p-6 shadow">
            <h3 className="text-sm font-semibold text-gray-600 mb-4 uppercase tracking-wider">
              CVR（コンバージョン率）
            </h3>
            <div className="flex items-center justify-around gap-4">
              <div className="text-center">
                <div className="text-xs text-gray-500 mb-1">CV</div>
                <div className="text-xl font-bold">{kpiData.cv}</div>
                <ChangeIndicator value={kpiData.cvChange} />
              </div>
              <div className="text-2xl text-gray-400">÷</div>
              <div className="text-center">
                <div className="text-xs text-gray-500 mb-1">アクセス</div>
                <div className="text-xl font-bold">{formatNumber(kpiData.clicks)}</div>
                <ChangeIndicator value={kpiData.clicksChange} />
              </div>
              <div className="text-lg text-gray-400">×100</div>
              <div className="text-2xl text-gray-400">=</div>
              <div className="text-center bg-amber-50 rounded-lg px-4 py-2">
                <div className="text-xs text-gray-600 mb-1">CVR</div>
                <div className="text-xl font-bold text-amber-900">{kpiData.cvr.toFixed(2)}%</div>
                <ChangeIndicator value={kpiData.cvrChange} />
              </div>
            </div>
          </div>
        </div>

        {/* 開発中のお知らせ */}
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <span className="font-semibold">開発中:</span> 各カードをクリックすると詳細な数式展開（IMP × CTR × CVRなど）が表示される機能を実装予定です。
          </p>
        </div>
      </div>
    </div>
  )
}