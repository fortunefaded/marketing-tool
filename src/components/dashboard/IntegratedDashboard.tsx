import React, { useMemo } from 'react'
import {
  BarChart, Bar, LineChart, Line, FunnelChart, Funnel, LabelList,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Cell, ComposedChart, Area
} from 'recharts'

interface IntegratedDashboardProps {
  metaData: any[]      // Meta APIデータ（MainDashboardから渡される）
  ecforceData: any[]   // ECForceデータ（MainDashboardから渡される）
  dateRange: { start: string; end: string } | null
  selectedAccountId: string | null
}

// カラーパレット
const COLORS = {
  primary: '#3B82F6',
  secondary: '#10B981',
  tertiary: '#F59E0B',
  danger: '#EF4444',
  purple: '#8B5CF6',
  indigo: '#6366F1',
  pink: '#EC4899',
  cyan: '#06B6D4'
}

// ファネル分析パネル
const FunnelAnalysisPanel: React.FC<{ metaData: any[], ecforceData: any[] }> = ({
  metaData = [],
  ecforceData = []
}) => {
  const funnelData = useMemo(() => {
    // ファネルステップの定義
    const totalImpressions = metaData.reduce((sum, d) => sum + (d.impressions || 0), 0)
    const totalClicks = metaData.reduce((sum, d) => sum + (d.clicks || 0), 0)
    const totalAccess = ecforceData.reduce((sum, d) => sum + (d.access || 0), 0)
    const totalOrders = ecforceData.reduce((sum, d) => sum + (d.cvOrder || 0), 0)
    const totalPayments = ecforceData.reduce((sum, d) => sum + (d.cvPayment || 0), 0)
    const totalUpsells = ecforceData.reduce((sum, d) => sum + (d.cvThanksUpsell || 0), 0)

    const steps = [
      { name: '広告表示', value: totalImpressions, fill: COLORS.primary },
      { name: 'クリック', value: totalClicks, fill: COLORS.secondary },
      { name: 'アクセス', value: totalAccess, fill: COLORS.tertiary },
      { name: '受注', value: totalOrders, fill: COLORS.purple },
      { name: '決済', value: totalPayments, fill: COLORS.indigo },
      { name: 'アップセル', value: totalUpsells, fill: COLORS.pink }
    ]

    // 各ステップ間のコンバージョン率を計算
    return steps.map((step, index) => {
      const conversionRate = index === 0
        ? 100
        : steps[index - 1].value > 0
          ? (step.value / steps[index - 1].value * 100).toFixed(2)
          : 0

      return {
        ...step,
        conversionRate: `${conversionRate}%`
      }
    })
  }, [metaData, ecforceData])

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-full">
      <div className="bg-white px-4 py-3 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900">ファネル分析</h3>
      </div>
      <div className="p-4">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={funnelData} layout="horizontal">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip formatter={(value: number) => value.toLocaleString()} />
            <Bar dataKey="value">
              {funnelData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
              <LabelList
                dataKey="conversionRate"
                position="top"
                style={{ fontSize: '12px', fill: '#666' }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// 収益効率パネル
const RevenueEfficiencyPanel: React.FC<{ metaData: any[], ecforceData: any[] }> = ({
  metaData = [],
  ecforceData = []
}) => {
  const metrics = useMemo(() => {
    const totalSpend = metaData.reduce((sum, d) => sum + (d.spend || 0), 0)
    const totalRevenue = ecforceData.reduce((sum, d) => sum + (d.revenue || 0), 0)
    const totalOrderRevenue = ecforceData.reduce((sum, d) => sum + (d.orderRevenue || 0), 0)

    const roas = totalSpend > 0 ? totalRevenue / totalSpend : 0
    const roi = totalSpend > 0
      ? ((totalRevenue - totalSpend) / totalSpend * 100)
      : 0

    return {
      totalSpend,
      totalRevenue,
      totalOrderRevenue,
      roas,
      roi
    }
  }, [metaData, ecforceData])

  // 日別データの集計
  const dailyData = useMemo(() => {
    const dataMap = new Map()

    // デバッグ: データ構造を確認
    console.log('📊 日別データ集計:', {
      metaDataSample: metaData[0],
      ecforceDataSample: ecforceData[0]
    })

    // ECForceデータから日付のリストを作成
    ecforceData.forEach(item => {
      const date = item.date || item.dataDate || new Date().toISOString().split('T')[0]
      if (!dataMap.has(date)) {
        dataMap.set(date, {
          date,
          spend: 0,
          revenue: 0,
          roas: 0
        })
      }
      const dayData = dataMap.get(date)
      dayData.revenue += item.revenue || 0

      // ECForceデータにもcostがある場合は使用
      if (item.cost) {
        dayData.spend += item.cost
      }
    })

    // Meta APIデータが日別データでない場合は、総計を日数で割る
    if (metaData.length > 0) {
      const totalMetaSpend = metaData.reduce((sum, d) => sum + (d.spend || 0), 0)

      if (dataMap.size > 0) {
        // ECForceデータの日数で割る
        const dailySpend = totalMetaSpend / dataMap.size
        dataMap.forEach(dayData => {
          if (!dayData.spend) { // ECForceからのcostがない場合
            dayData.spend = dailySpend
          }
          dayData.roas = dayData.spend > 0 ? dayData.revenue / dayData.spend : 0
        })
      } else if (metaData.length === 1 && metaData[0].date_start) {
        // Meta APIから単一期間データの場合、その日付を使用
        const date = metaData[0].date_start
        dataMap.set(date, {
          date,
          spend: totalMetaSpend,
          revenue: ecforceData.reduce((sum, d) => sum + (d.revenue || 0), 0),
          roas: 0
        })
        const dayData = dataMap.get(date)
        dayData.roas = dayData.spend > 0 ? dayData.revenue / dayData.spend : 0
      }
    }

    const result = Array.from(dataMap.values()).sort((a, b) => a.date.localeCompare(b.date))
    console.log('📊 日別データ結果:', result)
    return result
  }, [metaData, ecforceData])

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-full">
      <div className="bg-white px-4 py-3 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900">収益効率</h3>
      </div>
      <div className="p-4">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-xs text-gray-500">ROAS</p>
            <p className="text-2xl font-bold text-gray-900">{metrics.roas.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">ROI</p>
            <p className="text-2xl font-bold text-gray-900">{metrics.roi.toFixed(1)}%</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={250}>
          <ComposedChart data={dailyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip />
            <Legend />
            <Bar yAxisId="left" dataKey="spend" fill={COLORS.primary} name="広告費" />
            <Bar yAxisId="left" dataKey="revenue" fill={COLORS.secondary} name="売上" />
            <Line yAxisId="right" type="monotone" dataKey="roas" stroke={COLORS.danger} name="ROAS" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// コンバージョン率パネル
const ConversionRatePanel: React.FC<{ metaData: any[], ecforceData: any[] }> = ({
  metaData = [],
  ecforceData = []
}) => {
  const cvrMetrics = useMemo(() => {
    const totalImpressions = metaData.reduce((sum, d) => sum + (d.impressions || 0), 0)
    const totalClicks = metaData.reduce((sum, d) => sum + (d.clicks || 0), 0)
    const totalAccess = ecforceData.reduce((sum, d) => sum + (d.access || 0), 0)
    const totalOrders = ecforceData.reduce((sum, d) => sum + (d.cvOrder || 0), 0)
    const totalPayments = ecforceData.reduce((sum, d) => sum + (d.cvPayment || 0), 0)

    return {
      ctr: totalImpressions > 0 ? (totalClicks / totalImpressions * 100) : 0,
      accessRate: totalClicks > 0 ? (totalAccess / totalClicks * 100) : 0,
      cvrOrder: totalAccess > 0 ? (totalOrders / totalAccess * 100) : 0,
      cvrPayment: totalOrders > 0 ? (totalPayments / totalOrders * 100) : 0,
      upsellRate: ecforceData.length > 0
        ? ecforceData.reduce((sum, d) => sum + (d.offerSuccessRate || 0), 0) / ecforceData.length
        : 0
    }
  }, [metaData, ecforceData])

  // 日別CVRデータ
  const dailyCvrData = useMemo(() => {
    const dataMap = new Map()

    // ECForceデータから日付リストを作成
    ecforceData.forEach(item => {
      const date = item.date || item.dataDate || new Date().toISOString().split('T')[0]
      if (!dataMap.has(date)) {
        dataMap.set(date, {
          date,
          impressions: 0,
          clicks: 0,
          ctr: 0,
          cvrOrder: 0,
          cvrPayment: 0,
          access: 0,
          orders: 0,
          payments: 0
        })
      }
      const dayData = dataMap.get(date)
      dayData.access = item.access || 0
      dayData.orders = item.cvOrder || 0
      dayData.payments = item.cvPayment || 0
      dayData.cvrOrder = dayData.access > 0 ? (dayData.orders / dayData.access * 100) : 0
      dayData.cvrPayment = dayData.orders > 0 ? (dayData.payments / dayData.orders * 100) : 0
    })

    // Meta APIデータの処理（期間集約の場合は日数で分割）
    if (metaData.length > 0) {
      const totalImpressions = metaData.reduce((sum, d) => sum + (d.impressions || 0), 0)
      const totalClicks = metaData.reduce((sum, d) => sum + (d.clicks || 0), 0)

      if (dataMap.size > 0) {
        // 日数で割って各日に配分
        const dailyImpressions = totalImpressions / dataMap.size
        const dailyClicks = totalClicks / dataMap.size

        dataMap.forEach(dayData => {
          dayData.impressions = dailyImpressions
          dayData.clicks = dailyClicks
          dayData.ctr = dailyImpressions > 0 ? (dailyClicks / dailyImpressions * 100) : 0
        })
      }
    }

    return Array.from(dataMap.values()).sort((a, b) => a.date.localeCompare(b.date))
  }, [metaData, ecforceData])

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-full">
      <div className="bg-white px-4 py-3 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900">コンバージョン率</h3>
      </div>
      <div className="p-4">
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="text-center">
            <p className="text-xs text-gray-500">CTR</p>
            <p className="text-lg font-bold text-gray-900">{cvrMetrics.ctr.toFixed(2)}%</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500">CVR（受注）</p>
            <p className="text-lg font-bold text-gray-900">{cvrMetrics.cvrOrder.toFixed(2)}%</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500">CVR（決済）</p>
            <p className="text-lg font-bold text-gray-900">{cvrMetrics.cvrPayment.toFixed(2)}%</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={dailyCvrData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="ctr" stroke={COLORS.primary} name="CTR" />
            <Line type="monotone" dataKey="cvrOrder" stroke={COLORS.secondary} name="CVR（受注）" />
            <Line type="monotone" dataKey="cvrPayment" stroke={COLORS.tertiary} name="CVR（決済）" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// 単価分析パネル
const UnitPricePanel: React.FC<{ metaData: any[], ecforceData: any[] }> = ({
  metaData = [],
  ecforceData = []
}) => {
  const unitPrices = useMemo(() => {
    const totalClicks = metaData.reduce((sum, d) => sum + (d.clicks || 0), 0)
    const totalSpend = metaData.reduce((sum, d) => sum + (d.spend || 0), 0)
    const totalPayments = ecforceData.reduce((sum, d) => sum + (d.cvPayment || 0), 0)
    const totalRevenue = ecforceData.reduce((sum, d) => sum + (d.revenue || 0), 0)
    const upsellRevenue = ecforceData.reduce((sum, d) => sum + (d.upsellRevenue || 0), 0)

    return {
      cpc: totalClicks > 0 ? totalSpend / totalClicks : 0,
      cpa: totalPayments > 0 ? totalSpend / totalPayments : 0,
      customerUnitPrice: totalPayments > 0 ? totalRevenue / totalPayments : 0,
      upsellContribution: upsellRevenue
    }
  }, [metaData, ecforceData])

  // 日別単価データ
  const dailyUnitPriceData = useMemo(() => {
    const dataMap = new Map()

    // ECForceデータから日付リストを作成
    ecforceData.forEach(item => {
      const date = item.date || item.dataDate || new Date().toISOString().split('T')[0]
      if (!dataMap.has(date)) {
        dataMap.set(date, {
          date,
          clicks: 0,
          spend: 0,
          cpc: 0,
          cpa: 0,
          customerUnitPrice: 0,
          payments: 0,
          revenue: 0
        })
      }
      const dayData = dataMap.get(date)
      dayData.payments = item.cvPayment || 0
      dayData.revenue = item.revenue || 0
      dayData.customerUnitPrice = dayData.payments > 0 ? dayData.revenue / dayData.payments : 0

      // ECForceデータにcostがある場合
      if (item.cost) {
        dayData.spend = item.cost
      }
    })

    // Meta APIデータの処理（期間集約の場合は日数で分割）
    if (metaData.length > 0) {
      const totalSpend = metaData.reduce((sum, d) => sum + (d.spend || 0), 0)
      const totalClicks = metaData.reduce((sum, d) => sum + (d.clicks || 0), 0)

      if (dataMap.size > 0) {
        const dailySpend = totalSpend / dataMap.size
        const dailyClicks = totalClicks / dataMap.size

        dataMap.forEach(dayData => {
          if (!dayData.spend) { // ECForceからのcostがない場合
            dayData.spend = dailySpend
          }
          dayData.clicks = dailyClicks
          dayData.cpc = dayData.clicks > 0 ? dayData.spend / dayData.clicks : 0
          dayData.cpa = dayData.payments > 0 ? dayData.spend / dayData.payments : 0
        })
      }
    }

    return Array.from(dataMap.values()).sort((a, b) => a.date.localeCompare(b.date))
  }, [metaData, ecforceData])

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-full">
      <div className="bg-white px-4 py-3 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900">単価分析</h3>
      </div>
      <div className="p-4">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-xs text-gray-500">CPC</p>
            <p className="text-lg font-bold text-gray-900">¥{Math.floor(unitPrices.cpc).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">CPA</p>
            <p className="text-lg font-bold text-gray-900">¥{Math.floor(unitPrices.cpa).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">顧客単価</p>
            <p className="text-lg font-bold text-gray-900">¥{Math.floor(unitPrices.customerUnitPrice).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">アップセル貢献</p>
            <p className="text-lg font-bold text-gray-900">¥{Math.floor(unitPrices.upsellContribution).toLocaleString()}</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={250}>
          <ComposedChart data={dailyUnitPriceData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip formatter={(value: number) => `¥${Math.floor(value).toLocaleString()}`} />
            <Legend />
            <Bar dataKey="cpc" fill={COLORS.primary} name="CPC" />
            <Bar dataKey="cpa" fill={COLORS.secondary} name="CPA" />
            <Line type="monotone" dataKey="customerUnitPrice" stroke={COLORS.tertiary} name="顧客単価" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// メインコンポーネント
export const IntegratedDashboard: React.FC<IntegratedDashboardProps> = ({
  metaData = [],
  ecforceData = [],
  dateRange,
  selectedAccountId
}) => {
  // デバッグ: データ内容を確認
  React.useEffect(() => {
    console.log('🔍 IntegratedDashboard - データ確認:', {
      metaData: {
        count: metaData?.length || 0,
        sample: metaData?.[0],
        totalSpend: metaData?.reduce((sum, d) => sum + (d.spend || 0), 0) || 0
      },
      ecforceData: {
        count: ecforceData?.length || 0,
        sample: ecforceData?.[0],
        totalRevenue: ecforceData?.reduce((sum, d) => sum + (d.revenue || 0), 0) || 0
      },
      dateRange
    })
  }, [metaData, ecforceData, dateRange])

  if (!selectedAccountId) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8 text-center">
        <p className="text-gray-500">アカウントを選択してください</p>
      </div>
    )
  }

  if (!dateRange) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8 text-center">
        <p className="text-gray-500">期間を選択してください</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
        <h2 className="text-lg font-semibold text-gray-900">
          統合分析ダッシュボード（{dateRange.start} ～ {dateRange.end}）
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* ファネル分析パネル */}
        <FunnelAnalysisPanel metaData={metaData} ecforceData={ecforceData} />

        {/* 収益効率パネル */}
        <RevenueEfficiencyPanel metaData={metaData} ecforceData={ecforceData} />

        {/* コンバージョン率パネル */}
        <ConversionRatePanel metaData={metaData} ecforceData={ecforceData} />

        {/* 単価分析パネル */}
        <UnitPricePanel metaData={metaData} ecforceData={ecforceData} />
      </div>
    </div>
  )
}