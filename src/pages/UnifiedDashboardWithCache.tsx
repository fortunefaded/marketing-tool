/**
 * UnifiedDashboard with 3層キャッシュシステム統合版
 *
 * データ不整合問題を解決し、パフォーマンスを向上
 */

import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useConvex } from 'convex/react'
import { vibe } from '@/lib/vibelogger'
import { SimpleAccountStore } from '@/features/meta-api/account/account-store'
import { SimpleTokenStore } from '@/features/meta-api/core/token'
import { useAdFatigueWithCache } from '@/features/convex-cache/hooks/useAdFatigueWithCache'
import { useConvexCacheStats, useDataFreshness } from '@/features/convex-cache/hooks/useConvexCache'
import { useECForceData } from '../hooks/useECForceData'
import type { DateRangePreset } from '@/features/common/types/date'
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
  ExclamationTriangleIcon,
  CloudArrowDownIcon,
  ServerIcon,
  CpuChipIcon,
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

// ============================================================================
// キャッシュステータスコンポーネント
// ============================================================================

const CacheStatusIndicator: React.FC<{
  source: 'memory' | 'convex' | 'api' | 'none'
  isStale: boolean
  lastUpdated: Date | null
}> = ({ source, isStale, lastUpdated }) => {
  const sourceConfig = {
    memory: {
      icon: <CpuChipIcon className="h-4 w-4" />,
      label: 'メモリ',
      color: 'text-green-600 bg-green-100',
    },
    convex: {
      icon: <ServerIcon className="h-4 w-4" />,
      label: 'Convex',
      color: 'text-blue-600 bg-blue-100',
    },
    api: {
      icon: <CloudArrowDownIcon className="h-4 w-4" />,
      label: 'API',
      color: 'text-purple-600 bg-purple-100',
    },
    none: {
      icon: <ExclamationTriangleIcon className="h-4 w-4" />,
      label: '未取得',
      color: 'text-gray-600 bg-gray-100',
    },
  }

  const config = sourceConfig[source]

  return (
    <div className="flex items-center gap-2">
      <div className={`flex items-center gap-1 px-2 py-1 rounded-md ${config.color}`}>
        {config.icon}
        <span className="text-xs font-medium">{config.label}</span>
      </div>
      {isStale && (
        <span className="text-xs text-yellow-600 bg-yellow-100 px-2 py-1 rounded-md">要更新</span>
      )}
      {lastUpdated && (
        <span className="text-xs text-gray-500">最終更新: {lastUpdated.toLocaleTimeString()}</span>
      )}
    </div>
  )
}

// ============================================================================
// キャッシュ統計パネル
// ============================================================================

const CacheStatsPanel: React.FC<{
  stats: {
    cacheHitRate: number
    apiCallsSaved: number
    totalEntries?: number
    totalSizeMB?: number
  }
  accountId?: string
}> = ({ stats, accountId }) => {
  const convexStats = useConvexCacheStats(accountId)
  const freshness = useDataFreshness(accountId || '')

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-sm font-medium text-gray-900 mb-3">キャッシュパフォーマンス</h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <p className="text-xs text-gray-500">ヒット率</p>
          <p className="text-lg font-semibold text-green-600">{stats.cacheHitRate.toFixed(1)}%</p>
        </div>

        <div>
          <p className="text-xs text-gray-500">API削減</p>
          <p className="text-lg font-semibold text-blue-600">{stats.apiCallsSaved}回</p>
        </div>

        {convexStats && (
          <>
            <div>
              <p className="text-xs text-gray-500">キャッシュサイズ</p>
              <p className="text-lg font-semibold text-gray-900">
                {convexStats.totalSizeMB?.toFixed(1) || 0} MB
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500">エントリ数</p>
              <p className="text-lg font-semibold text-gray-900">{convexStats.totalEntries || 0}</p>
            </div>
          </>
        )}
      </div>

      {freshness.needsUpdate.length > 0 && (
        <div className="mt-3 pt-3 border-t">
          <p className="text-xs text-yellow-600">
            {freshness.needsUpdate.length}件のデータが更新待ち
          </p>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// メインコンポーネント
// ============================================================================

export const UnifiedDashboardWithCache: React.FC = () => {
  const navigate = useNavigate()
  const convexClient = useConvex()
  const [accountStore] = useState(() => new SimpleAccountStore(convexClient))
  const [tokenStore] = useState(() => new SimpleTokenStore(convexClient))
  const [activeAccount, setActiveAccount] = useState<any>(null)
  const [dateRange, setDateRange] = useState<DateRangePreset>('last_30d')
  const [forceRefresh, setForceRefresh] = useState(false)

  // タブ管理
  const [activeTab, setActiveTab] = useState<'overview' | 'fatigue' | 'ecforce' | 'integrated'>(
    'overview'
  )

  // ECForceデータ範囲
  const [ecforceDateRange, setEcforceDateRange] = useState<{
    start: Date | null
    end: Date | null
  }>({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    end: new Date(),
  })

  // 初期化
  useEffect(() => {
    const initialize = async () => {
      try {
        const account = await accountStore.getActiveAccount()
        setActiveAccount(account)
      } catch (error) {
        vibe.error('Failed to initialize account', error)
      }
    }
    initialize()
  }, [accountStore])

  // 3層キャッシュシステムを使用してAd Fatigueデータを取得
  const fatigueData = useAdFatigueWithCache({
    accountId: activeAccount?.accountId || '',
    dateRange,
    enableCache: true,
    forceRefresh,
    onCacheHit: (source) => {
      vibe.info(`Cache hit from ${source}`)
    },
    onError: (error) => {
      vibe.error('Failed to fetch fatigue data', error)
    },
  })

  // ECForceデータ取得
  const { orders: ecforceOrders, isLoading: ecforceLoading } = useECForceData({
    startDate: ecforceDateRange.start?.toISOString().split('T')[0],
    endDate: ecforceDateRange.end?.toISOString().split('T')[0],
  })

  // リフレッシュハンドラ
  const handleRefresh = async () => {
    setForceRefresh(true)
    await fatigueData.refresh()
    setForceRefresh(false)
  }

  // サマリー統計
  const summaryStats = useMemo(() => {
    const data = fatigueData.data || []
    const totalSpend = data.reduce((sum, d) => sum + (d.metrics?.spend || 0), 0)
    const totalImpressions = data.reduce((sum, d) => sum + (d.metrics?.impressions || 0), 0)
    const totalClicks = data.reduce((sum, d) => sum + (d.metrics?.clicks || 0), 0)
    const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0

    return {
      totalAds: data.length,
      totalSpend,
      totalImpressions,
      totalClicks,
      avgCtr,
      criticalAds: fatigueData.stats.criticalAds,
      warningAds: fatigueData.stats.warningAds,
      avgFatigueScore: fatigueData.stats.avgFatigueScore,
    }
  }, [fatigueData.data, fatigueData.stats])

  if (!activeAccount) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            アカウントが設定されていません
          </h2>
          <button
            onClick={() => navigate('/settings')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            設定画面へ
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">統合ダッシュボード</h1>
              <p className="text-sm text-gray-500 mt-1">3層キャッシュシステム搭載版</p>
            </div>

            <div className="flex items-center gap-4">
              {/* キャッシュステータス */}
              <CacheStatusIndicator
                source={fatigueData.cacheSource}
                isStale={fatigueData.isStale}
                lastUpdated={fatigueData.lastUpdated}
              />

              {/* リフレッシュボタン */}
              <button
                onClick={handleRefresh}
                disabled={fatigueData.loading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                <ArrowPathIcon className={`h-4 w-4 ${fatigueData.loading ? 'animate-spin' : ''}`} />
                更新
              </button>
            </div>
          </div>

          {/* タブ */}
          <div className="flex space-x-8 border-b">
            {['overview', 'fatigue', 'ecforce', 'integrated'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab === 'overview' && '概要'}
                {tab === 'fatigue' && '広告疲労度'}
                {tab === 'ecforce' && 'ECForce'}
                {tab === 'integrated' && '統合分析'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* コンテンツ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* キャッシュ統計パネル */}
        <div className="mb-6">
          <CacheStatsPanel stats={fatigueData.stats} accountId={activeAccount.accountId} />
        </div>

        {/* 概要タブ */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* サマリーカード */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                title="広告数"
                value={summaryStats.totalAds}
                icon={<PhotoIcon className="h-5 w-5" />}
                trend={fatigueData.stats.criticalAds > 0 ? 'down' : 'up'}
                trendValue={`${fatigueData.stats.criticalAds} 要対応`}
              />

              <MetricCard
                title="平均疲労度スコア"
                value={`${summaryStats.avgFatigueScore}`}
                icon={<ExclamationTriangleIcon className="h-5 w-5" />}
                trend={summaryStats.avgFatigueScore > 50 ? 'down' : 'up'}
                suffix="/ 100"
              />

              <MetricCard
                title="広告費"
                value={summaryStats.totalSpend}
                icon={<CurrencyYenIcon className="h-5 w-5" />}
                format="currency"
              />

              <MetricCard
                title="平均CTR"
                value={summaryStats.avgCtr}
                icon={<ChartBarIcon className="h-5 w-5" />}
                suffix="%"
                format="percentage"
              />
            </div>

            {/* エラー・警告 */}
            {fatigueData.error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800">エラー: {fatigueData.error.message}</p>
              </div>
            )}

            {fatigueData.isStale && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-800">データが古くなっています。更新をお勧めします。</p>
              </div>
            )}
          </div>
        )}

        {/* 広告疲労度タブ */}
        {activeTab === 'fatigue' && (
          <div className="space-y-6">
            {fatigueData.loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : fatigueData.data && fatigueData.data.length > 0 ? (
              <>
                {/* 疲労度分析結果をここに表示 */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">広告疲労度分析</h3>
                  <div className="space-y-4">
                    {fatigueData.data
                      .filter(
                        (d) =>
                          d.fatigueScore.status === 'critical' ||
                          d.fatigueScore.status === 'warning'
                      )
                      .slice(0, 10)
                      .map((ad) => (
                        <div key={ad.adId} className="border-l-4 border-red-500 pl-4 py-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-medium text-gray-900">{ad.adName}</h4>
                              <p className="text-sm text-gray-500">{ad.campaignName}</p>
                            </div>
                            <div className="text-right">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  ad.fatigueScore.status === 'critical'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}
                              >
                                スコア: {ad.fatigueScore.total}
                              </span>
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 mt-2">{ad.recommendedAction}</p>
                        </div>
                      ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500">データがありません</p>
              </div>
            )}
          </div>
        )}

        {/* ECForceタブ */}
        {activeTab === 'ecforce' && (
          <div className="space-y-6">
            <ECForceDateFilter
              dateRange={ecforceDateRange}
              onDateRangeChange={setEcforceDateRange}
            />

            {ecforceLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <>
                <ECForceSalesChart orders={ecforceOrders} />
                <ECForceCustomerAnalysis orders={ecforceOrders} />
                <ECForceOfferAnalysis orders={ecforceOrders} />
              </>
            )}
          </div>
        )}

        {/* 統合分析タブ */}
        {activeTab === 'integrated' && (
          <div className="space-y-6">
            <CohortAnalysis metaData={fatigueData.data || []} ecforceData={ecforceOrders} />
            <LTVAnalysis metaData={fatigueData.data || []} ecforceData={ecforceOrders} />
            <RFMAnalysis orders={ecforceOrders} />
          </div>
        )}
      </div>
    </div>
  )
}

export default UnifiedDashboardWithCache
