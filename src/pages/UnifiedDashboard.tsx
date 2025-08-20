import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MetaAccountManager } from '../services/metaAccountManager'
import { MetaInsightsData } from '../services/metaApiService'
import { MetaDataCache } from '../services/metaDataCache'
import { useECForceData } from '../hooks/useECForceData'
import {
  ChartBarIcon,
  CurrencyYenIcon,
  ShoppingCartIcon,
  UserGroupIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ArrowPathIcon,
  ArrowTopRightOnSquareIcon,
  CalendarIcon,
  PhotoIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { MetricCard } from '../components/metrics/MetricCard'
import { PerformanceChart } from '../components/charts/PerformanceChart'
import { ECForceIntegration } from '../components/ecforce/ECForceIntegration'
import { KPIDashboard } from '../components/analytics/KPIDashboard'
import { ECForceSalesChart } from '../components/ecforce/ECForceSalesChart'
import { ECForceCustomerAnalysis } from '../components/ecforce/ECForceCustomerAnalysis'
import { ECForceOfferAnalysis } from '../components/ecforce/ECForceOfferAnalysis'
import { ECForceDateFilter } from '../components/ecforce/ECForceDateFilter'
import { CohortAnalysis } from '../components/integrated/CohortAnalysis'
import { LTVAnalysis } from '../components/integrated/LTVAnalysis'
import { RFMAnalysis } from '../components/integrated/RFMAnalysis'

export const UnifiedDashboard: React.FC = () => {
  const navigate = useNavigate()
  const [manager] = useState(() => MetaAccountManager.getInstance())
  // const [apiService, setApiService] = useState<MetaApiService | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Metaデータ
  const [metaInsights, setMetaInsights] = useState<MetaInsightsData[]>([])
  const [metaSyncStatus, setMetaSyncStatus] = useState<any>(null)
  // const [metaCacheInfo, setMetaCacheInfo] = useState({ sizeKB: 0, records: 0 })
  
  // ECForceデータ
  // const [selectedPeriod, setSelectedPeriod] = useState('last_30_days')
  const [ecforceDateRange, setEcforceDateRange] = useState<{
    start: Date | null
    end: Date | null
  }>({
    start: null,
    end: null
  })
  
  // ConvexからECForceデータを取得
  const { orders: ecforceOrders, isLoading: ecforceLoading } = useECForceData({
    startDate: ecforceDateRange.start?.toISOString().split('T')[0],
    endDate: ecforceDateRange.end?.toISOString().split('T')[0],
  })
  
  // タブ管理
  const [activeTab, setActiveTab] = useState<'overview' | 'meta' | 'ecforce' | 'integrated'>('overview')

  useEffect(() => {
    try {
      // Meta広告データの初期化
      const activeAccount = manager.getActiveAccount()
      if (!activeAccount) {
        // Metaアカウントが設定されていない場合でも続行
        setIsLoading(false)
        return
      }
    
    // キャッシュされたデータを読み込み
    const cachedData = MetaDataCache.getInsights(activeAccount.accountId)
    const status = MetaDataCache.getSyncStatus(activeAccount.accountId)
    
    if (cachedData.length > 0) {
      setMetaInsights(cachedData)
      setMetaSyncStatus(status)
      // const cacheUsage = MetaDataCache.getCacheUsage(activeAccount.accountId)
      // setMetaCacheInfo(cacheUsage)
    }
    
    const service = manager.getActiveApiService()
    if (service) {
      // setApiService(service)
    }
    
    setIsLoading(false)
    } catch (err) {
      console.error('Dashboard initialization error:', err)
      setError('ダッシュボードの初期化中にエラーが発生しました')
      setIsLoading(false)
    }
  }, [])


  // ECForceデータはすでにフィルタリング済みなので、そのまま使用
  const filteredEcforceOrders = ecforceOrders

  // メトリクスの計算
  const calculateMetrics = () => {
    // Meta広告メトリクス
    const totalAdSpend = metaInsights.reduce((sum, insight) => sum + Number(insight.spend || 0), 0)
    const totalImpressions = metaInsights.reduce((sum, insight) => sum + Number(insight.impressions || 0), 0)
    const totalClicks = metaInsights.reduce((sum, insight) => sum + Number(insight.clicks || 0), 0)
    const totalConversions = metaInsights.reduce((sum, insight) => sum + Number(insight.conversions || 0), 0)
    
    // ECForce売上メトリクス（フィルタリングされたデータを使用）
    const totalRevenue = filteredEcforceOrders.reduce((sum, order) => sum + (order.小計 || 0), 0)
    const totalOrders = filteredEcforceOrders.length
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0
    
    // 統合メトリクス
    const trueROAS = totalAdSpend > 0 ? totalRevenue / totalAdSpend : 0
    const trueCPA = totalOrders > 0 ? totalAdSpend / totalOrders : 0
    
    return {
      // Meta広告
      totalAdSpend,
      totalImpressions,
      totalClicks,
      totalConversions,
      ctr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
      cpc: totalClicks > 0 ? totalAdSpend / totalClicks : 0,
      
      // ECForce
      totalRevenue,
      totalOrders,
      avgOrderValue,
      
      // 統合
      trueROAS,
      trueCPA
    }
  }

  const metrics = calculateMetrics()

  // チャートデータの準備
  const prepareChartData = () => {
    // 日付ごとにデータを集計
    const dataByDate = new Map<string, { adSpend: number, revenue: number, orders: number }>()
    
    // Meta広告データを集計
    metaInsights.forEach(insight => {
      const dateValue = insight.date_start || insight.dateStart || ''
      const date = String(dateValue)
      if (!date) return
      
      const existing = dataByDate.get(date) || { adSpend: 0, revenue: 0, orders: 0 }
      dataByDate.set(date, {
        ...existing,
        adSpend: existing.adSpend + Number(insight.spend || 0)
      })
    })
    
    // ECForceデータを集計
    ecforceOrders.forEach(order => {
      const date = order.注文日
      if (!date) return
      
      const existing = dataByDate.get(date) || { adSpend: 0, revenue: 0, orders: 0 }
      dataByDate.set(date, {
        ...existing,
        revenue: existing.revenue + (order.小計 || 0),
        orders: existing.orders + 1
      })
    })
    
    // ソートして配列に変換
    return Array.from(dataByDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-30) // 最新30日分
      .map(([date, data]) => ({
        date,
        cost: data.adSpend,
        revenue: data.revenue,
        orders: data.orders,
        roas: data.adSpend > 0 ? data.revenue / data.adSpend : 0
      }))
  }

  if (isLoading || ecforceLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <ArrowPathIcon className="h-12 w-12 text-gray-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">データを読み込んでいます...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">統合ダッシュボード</h1>
              <p className="mt-1 text-sm text-gray-500">
                Meta広告とECForceの売上データを統合して分析
              </p>
            </div>
            <div className="flex gap-3">
              {!manager.getActiveAccount() && (
                <button
                  onClick={() => navigate('/meta-api-setup')}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Meta広告を接続
                </button>
              )}
              <button
                onClick={() => navigate('/ecforce')}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                ECForceデータ管理
              </button>
            </div>
          </div>
        </div>

        {/* エラー表示 */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-3" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        )}

        {/* タブナビゲーション */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              概要
            </button>
            <button
              onClick={() => setActiveTab('meta')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'meta'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Meta広告
            </button>
            <button
              onClick={() => setActiveTab('ecforce')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'ecforce'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              ECForce
            </button>
            <button
              onClick={() => setActiveTab('integrated')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'integrated'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              統合分析
            </button>
          </nav>
        </div>

        {/* コンテンツ */}
        {activeTab === 'overview' && (
          <>
            {/* 統合KPIダッシュボード */}
            <KPIDashboard 
              insights={metaInsights}
              ecforceOrders={filteredEcforceOrders}
              dateRange={{
                start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                end: new Date().toISOString().split('T')[0]
              }}
              showComparison={false}
            />

            {/* パフォーマンスチャート */}
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4">売上とROASの推移</h3>
              <PerformanceChart 
                data={prepareChartData()}
                metrics={['revenue', 'roas']}
                height={400}
              />
            </div>

            {/* クイックアクセス */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <button
                onClick={() => navigate('/meta-dashboard')}
                className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 shadow-sm hover:shadow-lg transition-shadow text-left"
              >
                <div className="flex items-center justify-between text-white">
                  <div className="flex items-center space-x-4">
                    <ChartBarIcon className="h-10 w-10" />
                    <div>
                      <h3 className="text-lg font-bold">Meta広告ダッシュボード</h3>
                      <p className="text-sm text-blue-100">詳細な広告パフォーマンスを分析</p>
                    </div>
                  </div>
                  <ArrowTopRightOnSquareIcon className="h-6 w-6" />
                </div>
              </button>
              
              <button
                onClick={() => navigate('/ecforce')}
                className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-6 shadow-sm hover:shadow-lg transition-shadow text-left"
              >
                <div className="flex items-center justify-between text-white">
                  <div className="flex items-center space-x-4">
                    <ShoppingCartIcon className="h-10 w-10" />
                    <div>
                      <h3 className="text-lg font-bold">ECForce分析</h3>
                      <p className="text-sm text-green-100">売上データの詳細分析</p>
                    </div>
                  </div>
                  <ArrowTopRightOnSquareIcon className="h-6 w-6" />
                </div>
              </button>
            </div>
          </>
        )}

        {activeTab === 'meta' && (
          <div className="space-y-6">
            {/* Meta広告サマリー */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <MetricCard
                title="インプレッション"
                value={metrics.totalImpressions}
                format="number"
                icon={<UserGroupIcon className="h-6 w-6" />}
              />
              <MetricCard
                title="クリック数"
                value={metrics.totalClicks}
                format="number"
                icon={<PhotoIcon className="h-6 w-6" />}
              />
              <MetricCard
                title="コンバージョン"
                value={metrics.totalConversions}
                format="number"
                icon={<ArrowTrendingUpIcon className="h-6 w-6" />}
              />
              <MetricCard
                title="CPC"
                value={metrics.cpc}
                format="currency"
                icon={<CurrencyYenIcon className="h-6 w-6" />}
              />
            </div>

            {/* Meta広告詳細メトリクス */}
            {manager.getActiveAccount() && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">詳細メトリクス</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div>
                    <p className="text-sm text-gray-500">CTR</p>
                    <p className="text-xl font-semibold">{metrics.ctr.toFixed(2)}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">広告費</p>
                    <p className="text-xl font-semibold">{new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(metrics.totalAdSpend)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">CPA</p>
                    <p className="text-xl font-semibold">
                      {metrics.totalConversions > 0 
                        ? new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(metrics.totalAdSpend / metrics.totalConversions)
                        : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">ROAS</p>
                    <p className="text-xl font-semibold">
                      {metrics.totalAdSpend > 0 
                        ? `${((metrics.totalConversions * 10000) / metrics.totalAdSpend * 100).toFixed(0)}%`
                        : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">CPM</p>
                    <p className="text-xl font-semibold">
                      {metrics.totalImpressions > 0 
                        ? new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format((metrics.totalAdSpend / metrics.totalImpressions) * 1000)
                        : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">リーチ</p>
                    <p className="text-xl font-semibold">{new Intl.NumberFormat('ja-JP').format(metaInsights.reduce((sum, i) => sum + Number(i.reach || 0), 0))}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">フリークエンシー</p>
                    <p className="text-xl font-semibold">
                      {(() => {
                        const totalReach = metaInsights.reduce((sum, i) => sum + Number(i.reach || 0), 0);
                        return totalReach > 0 ? (metrics.totalImpressions / totalReach).toFixed(2) : '-';
                      })()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">CV率</p>
                    <p className="text-xl font-semibold">
                      {metrics.totalClicks > 0 
                        ? `${((metrics.totalConversions / metrics.totalClicks) * 100).toFixed(2)}%`
                        : '-'}
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {!manager.getActiveAccount() && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
                <p className="text-blue-800 mb-4">Meta広告アカウントが接続されていません</p>
                <button
                  onClick={() => navigate('/meta-api-setup')}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                >
                  アカウントを接続
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'ecforce' && (
          <div className="space-y-6">
            {/* 日付フィルター */}
            <ECForceDateFilter 
              dateRange={ecforceDateRange}
              onDateRangeChange={setEcforceDateRange}
            />

            {/* ECForceサマリー */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <MetricCard
                title="総売上"
                value={metrics.totalRevenue}
                format="currency"
                icon={<CurrencyYenIcon className="h-6 w-6" />}
              />
              <MetricCard
                title="注文数"
                value={metrics.totalOrders}
                format="number"
                icon={<ShoppingCartIcon className="h-6 w-6" />}
              />
              <MetricCard
                title="平均注文額"
                value={metrics.avgOrderValue}
                format="currency"
                icon={<ChartBarIcon className="h-6 w-6" />}
              />
            </div>

            {/* ECForce詳細メトリクス */}
            {filteredEcforceOrders.length > 0 && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {/* ユニーク顧客数 */}
                  <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-gray-600">ユニーク顧客数</p>
                      </div>
                      <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                        <UserGroupIcon className="w-6 h-6 text-purple-600" />
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      {new Intl.NumberFormat('ja-JP').format(new Set(filteredEcforceOrders.map(o => o.顧客番号)).size)}
                    </p>
                  </div>
                  {/* 最高注文額 */}
                  <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-gray-600">最高注文額</p>
                      </div>
                      <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                        <ArrowTrendingUpIcon className="w-6 h-6 text-yellow-600" />
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      {new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(
                        Math.max(...filteredEcforceOrders.map(o => o.小計 || 0))
                      )}
                    </p>
                  </div>
                  {/* 最低注文額 */}
                  <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-gray-600">最低注文額</p>
                      </div>
                      <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                        <ArrowTrendingDownIcon className="w-6 h-6 text-red-600" />
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      {new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(
                        Math.min(...filteredEcforceOrders.map(o => o.小計 || 0))
                      )}
                    </p>
                  </div>
                  {/* 注文頻度 */}
                  <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-gray-600">注文頻度</p>
                      </div>
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <CalendarIcon className="w-6 h-6 text-blue-600" />
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      {(() => {
                        const dateRange = 30; // 30日間
                        return (metrics.totalOrders / dateRange).toFixed(1);
                      })()}
                      <span className="text-base font-normal text-gray-600 ml-1">件/日</span>
                    </p>
                  </div>
                  {/* 売上成長率 */}
                  <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-gray-600">売上成長率</p>
                      </div>
                      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                        <ChartBarIcon className="w-6 h-6 text-green-600" />
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      {(() => {
                        const midPoint = Math.floor(filteredEcforceOrders.length / 2);
                        const firstHalf = filteredEcforceOrders.slice(0, midPoint).reduce((sum, o) => sum + (o.小計 || 0), 0);
                        const secondHalf = filteredEcforceOrders.slice(midPoint).reduce((sum, o) => sum + (o.小計 || 0), 0);
                        const growth = firstHalf > 0 ? ((secondHalf - firstHalf) / firstHalf) * 100 : 0;
                        return growth > 0 ? `+${growth.toFixed(1)}%` : `${growth.toFixed(1)}%`;
                      })()}
                    </p>
                  </div>
                  {/* リピート率 */}
                  <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-gray-600">リピート率</p>
                      </div>
                      <div className="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center">
                        <ArrowPathIcon className="w-6 h-6 text-pink-600" />
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      {(() => {
                        const customerIds = filteredEcforceOrders.map(o => o.顧客番号);
                        const uniqueCustomers = new Set(customerIds).size;
                        const repeatRate = uniqueCustomers > 0 ? ((filteredEcforceOrders.length - uniqueCustomers) / filteredEcforceOrders.length) * 100 : 0;
                        return `${repeatRate.toFixed(1)}%`;
                      })()}
                    </p>
                  </div>
                  {/* 平均注文回数 */}
                  <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-gray-600">顧客あたり平均注文数</p>
                      </div>
                      <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                        <ShoppingCartIcon className="w-6 h-6 text-indigo-600" />
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      {(() => {
                        const uniqueCustomers = new Set(filteredEcforceOrders.map(o => o.顧客番号)).size;
                        return uniqueCustomers > 0 ? (filteredEcforceOrders.length / uniqueCustomers).toFixed(1) : '0';
                      })()}
                      <span className="text-base font-normal text-gray-600 ml-1">回</span>
                    </p>
                  </div>
                  {/* 顧客単価（LTV） */}
                  <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-gray-600">顧客単価（LTV推定）</p>
                      </div>
                      <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                        <CurrencyYenIcon className="w-6 h-6 text-orange-600" />
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      {(() => {
                        const uniqueCustomers = new Set(filteredEcforceOrders.map(o => o.顧客番号)).size;
                        return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(
                          uniqueCustomers > 0 ? metrics.totalRevenue / uniqueCustomers : 0
                        );
                      })()}
                    </p>
                  </div>
                </div>

                {/* 売上推移チャート */}
                <ECForceSalesChart orders={filteredEcforceOrders} />

                {/* 顧客分析 */}
                <ECForceCustomerAnalysis orders={filteredEcforceOrders} />

                {/* オファー分析 */}
                <ECForceOfferAnalysis orders={filteredEcforceOrders} />

                {/* 高度な分析 */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold mb-4">高度な分析</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button
                      onClick={() => setActiveTab('integrated')}
                      className="p-4 border border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-colors"
                    >
                      <div className="text-indigo-600 font-medium mb-2">コホート分析</div>
                      <p className="text-sm text-gray-600">月別の顧客リテンション率を分析</p>
                    </button>
                    <button
                      onClick={() => setActiveTab('integrated')}
                      className="p-4 border border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-colors"
                    >
                      <div className="text-indigo-600 font-medium mb-2">LTV分析</div>
                      <p className="text-sm text-gray-600">顧客生涯価値の予測と分析</p>
                    </button>
                    <button
                      onClick={() => setActiveTab('integrated')}
                      className="p-4 border border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-colors"
                    >
                      <div className="text-indigo-600 font-medium mb-2">RFM分析</div>
                      <p className="text-sm text-gray-600">顧客セグメンテーション分析</p>
                    </button>
                  </div>
                  <p className="text-sm text-gray-500 mt-4">
                    詳細な分析は「統合分析」タブで確認できます
                  </p>
                </div>
              </>
            )}
            
            {filteredEcforceOrders.length === 0 && ecforceOrders.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                <p className="text-yellow-800">指定された期間にデータがありません</p>
              </div>
            )}
            
            {ecforceOrders.length === 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                <p className="text-green-800 mb-4">ECForceのデータがインポートされていません</p>
                <button
                  onClick={() => navigate('/ecforce')}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700"
                >
                  データをインポート
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'integrated' && (
          <div className="space-y-6">
            {/* 日付フィルター */}
            <ECForceDateFilter 
              dateRange={ecforceDateRange}
              onDateRangeChange={setEcforceDateRange}
            />

            {/* 統合KPIダッシュボード */}
            <KPIDashboard 
              insights={metaInsights}
              ecforceOrders={filteredEcforceOrders}
              dateRange={{
                start: ecforceDateRange.start?.toISOString().split('T')[0] || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                end: ecforceDateRange.end?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0]
              }}
              showComparison={true}
            />

            {/* ECForce統合分析 */}
            <ECForceIntegration 
              metaInsights={metaInsights}
              dateRange={metaSyncStatus?.dateRange}
            />

            {/* コホート分析 */}
            {filteredEcforceOrders.length > 0 && (
              <CohortAnalysis orders={filteredEcforceOrders} />
            )}

            {/* LTV分析 */}
            {filteredEcforceOrders.length > 0 && (
              <LTVAnalysis orders={filteredEcforceOrders} />
            )}

            {/* RFM分析 */}
            {filteredEcforceOrders.length > 0 && (
              <RFMAnalysis orders={filteredEcforceOrders} />
            )}
          </div>
        )}
      </div>
    </div>
  )
}