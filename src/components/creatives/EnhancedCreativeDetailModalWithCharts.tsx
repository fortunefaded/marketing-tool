/**
 * Enhanced Creative Detail Modal with Platform-Specific Charts
 *
 * プラットフォーム別グラフ表示機能を統合したクリエイティブ詳細モーダル
 */

import React, { useState, useMemo } from 'react'
import { Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import {
  ChartBarIcon,
  CurrencyYenIcon,
  EyeIcon,
  CursorArrowRaysIcon,
  ShoppingBagIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  GlobeAltIcon,
} from '@heroicons/react/24/solid'

// 新規インポート - Phase 2実装
import { MultiLineChart } from '../../features/meta-api/components/MultiLineChart'
import { ChartDataTransformer } from '../../features/meta-api/utils/chart-data-transformer'
import { EnhancedAdDataAggregator } from '../../features/meta-api/core/enhanced-ad-data-aggregator'
import type {
  EnhancedAdPerformanceData,
  GraphDataPoint,
} from '../../features/meta-api/types/enhanced-data-structure'
import type { MetaApiInsight } from '../../features/meta-api/core/ad-data-aggregator'

// 既存のインポート
import { CreativeData } from './CreativePerformanceGrid'
// import { VideoPlayer } from './VideoPlayer' // 未使用のため一時的にコメントアウト
// import { CreativeInsights } from './CreativeInsights' // TODO: analysis と performanceHistory が必要

interface CreativeDetailModalProps {
  creative: CreativeData | null
  isOpen: boolean
  onClose: () => void
  performanceHistory?: Array<{
    date: string
    ctr: number
    frequency: number
    impressions: number
    clicks: number
    spend: number
    cpm?: number
    conversions?: number
    platform?: string // 新規追加：プラットフォーム情報
    // 動画メトリクス（オプション）
    videoViews?: number
    videoCompletionRate?: number
    averageWatchTime?: number
    soundOnRate?: number
  }>
  // 新規追加：生のMeta APIデータ（プラットフォーム別グラフ生成用）
  rawInsights?: MetaApiInsight[]
}

export const EnhancedCreativeDetailModalWithCharts: React.FC<CreativeDetailModalProps> = ({
  creative,
  isOpen,
  onClose,
  // performanceHistory = [], // 未使用のため一時的にコメントアウト
  rawInsights = [],
}) => {
  // const [currentCarouselIndex, setCurrentCarouselIndex] = useState(0) // 未使用のため一時的にコメントアウト
  const [activeTab, setActiveTab] = useState<'metrics' | 'insights' | 'platform'>('metrics')
  const [selectedMetric, setSelectedMetric] = useState<'ctr' | 'cpm' | 'cpc' | 'conversions'>('ctr')
  const [isProcessingData, setIsProcessingData] = useState(false)

  // プラットフォーム別データを生成
  const enhancedAdData = useMemo<EnhancedAdPerformanceData | null>(() => {
    console.log('[EnhancedCreativeDetailModal] データ生成開始:', {
      creative: creative,
      rawInsightsLength: rawInsights?.length || 0,
      creativeId: creative?.id,
      firstRawInsight: rawInsights?.[0],
    })

    if (!creative || !rawInsights || rawInsights.length === 0) {
      console.warn('[EnhancedCreativeDetailModal] データ不足:', {
        hasCreative: !!creative,
        hasRawInsights: !!rawInsights,
        rawInsightsLength: rawInsights?.length || 0,
      })
      return null
    }

    setIsProcessingData(true)

    try {
      // EnhancedAdDataAggregatorを使用してプラットフォーム別データを生成
      const result = EnhancedAdDataAggregator.aggregateEnhanced(rawInsights, {
        groupBy: 'ad',
        includePlatformBreakdown: true,
        includeDailyBreakdown: true,
        calculateFatigue: false,
        includeGraphData: true,
        performConsistencyCheck: false,
        graphMetrics: ['ctr', 'cpm', 'cpc', 'conversions', 'impressions', 'spend'],
      })

      console.log('[EnhancedCreativeDetailModal] 集約結果:', {
        resultDataCount: result.data.length,
        resultData: result.data,
        lookingForId: creative.id,
      })

      // 該当広告のデータを取得 - creative.id を使用
      const adData = result.data.find(
        (d) =>
          (d as any).ad_id === creative.id ||
          (d as any).ad_id === creative.adId ||
          (d as any).creative_id === creative.id
      )

      console.log('[EnhancedCreativeDetailModal] マッチしたデータ:', adData)

      setIsProcessingData(false)
      return adData || null
    } catch (error) {
      console.error('[EnhancedCreativeDetailModal] データ処理エラー:', error)
      setIsProcessingData(false)
      return null
    }
  }, [creative, rawInsights])

  // Rechartsフォーマットのチャートデータを生成
  const chartData = useMemo(() => {
    console.log('[EnhancedCreativeDetailModal] チャートデータ生成:', {
      hasEnhancedAdData: !!enhancedAdData,
      selectedMetric,
      platformGraphs: enhancedAdData?.platformGraphs,
      graphData: enhancedAdData?.platformGraphs?.[selectedMetric],
    })

    if (!enhancedAdData?.platformGraphs?.[selectedMetric]) {
      console.warn('[EnhancedCreativeDetailModal] グラフデータなし')
      return { data: [], colors: {} }
    }

    return ChartDataTransformer.toRechartsLineDataWithColors(
      enhancedAdData.platformGraphs[selectedMetric] as GraphDataPoint[]
    )
  }, [enhancedAdData, selectedMetric])

  // プラットフォーム別サマリー統計
  const platformStats = useMemo(() => {
    if (!enhancedAdData?.detailedPlatformMetrics) return null

    const metrics = enhancedAdData.detailedPlatformMetrics
    return {
      facebook: metrics.facebook,
      instagram: metrics.instagram,
      audience_network: metrics.audience_network,
      messenger: metrics.messenger,
    }
  }, [enhancedAdData])

  if (!creative) return null

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toFixed(0)
  }

  const formatCurrency = (num: number): string => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      minimumFractionDigits: 0,
    }).format(num)
  }

  const formatPercentage = (num: number): string => {
    return `${num.toFixed(1)}%`
  }

  const getMetricConfig = (metric: string) => {
    switch (metric) {
      case 'ctr':
        return { label: 'クリック率', unit: '%', decimals: 2, color: 'blue' }
      case 'cpm':
        return { label: 'CPM', unit: '円', decimals: 0, color: 'red' }
      case 'cpc':
        return { label: 'CPC', unit: '円', decimals: 2, color: 'green' }
      case 'conversions':
        return { label: 'コンバージョン', unit: '件', decimals: 0, color: 'purple' }
      default:
        return { label: metric, unit: '', decimals: 2, color: 'gray' }
    }
  }

  const metricConfig = getMetricConfig(selectedMetric)

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all w-full max-w-7xl">
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Dialog.Title as="h3" className="text-xl font-bold text-white">
                        {creative.name}
                      </Dialog.Title>
                      <p className="text-sm text-indigo-100 mt-1">{creative.campaignName}</p>
                    </div>
                    <button
                      type="button"
                      className="rounded-lg bg-white bg-opacity-20 p-2 text-white hover:bg-opacity-30 transition-colors"
                      onClick={onClose}
                    >
                      <span className="sr-only">閉じる</span>
                      <XMarkIcon className="h-6 w-6" />
                    </button>
                  </div>

                  {/* タブ切り替え */}
                  <div className="mt-4 flex space-x-4">
                    <button
                      onClick={() => setActiveTab('metrics')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        activeTab === 'metrics'
                          ? 'bg-white text-indigo-600'
                          : 'bg-white bg-opacity-20 text-white hover:bg-opacity-30'
                      }`}
                    >
                      パフォーマンス指標
                    </button>
                    <button
                      onClick={() => setActiveTab('platform')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        activeTab === 'platform'
                          ? 'bg-white text-indigo-600'
                          : 'bg-white bg-opacity-20 text-white hover:bg-opacity-30'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <ChartBarIcon className="h-4 w-4" />
                        プラットフォーム別分析
                      </span>
                    </button>
                    <button
                      onClick={() => setActiveTab('insights')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        activeTab === 'insights'
                          ? 'bg-white text-indigo-600'
                          : 'bg-white bg-opacity-20 text-white hover:bg-opacity-30'
                      }`}
                    >
                      インサイト
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 max-h-[calc(100vh-200px)] overflow-y-auto">
                  {activeTab === 'platform' && (
                    <div className="space-y-6">
                      {/* プラットフォーム別グラフ */}
                      <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <div className="mb-4">
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            プラットフォーム別パフォーマンス
                          </h3>

                          {/* 指標選択 */}
                          <div className="flex space-x-2 mb-4">
                            {(['ctr', 'cpm', 'cpc', 'conversions'] as const).map((metric) => {
                              const config = getMetricConfig(metric)
                              return (
                                <button
                                  key={metric}
                                  onClick={() => setSelectedMetric(metric)}
                                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                                    selectedMetric === metric
                                      ? 'bg-indigo-600 text-white'
                                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                  }`}
                                >
                                  {config.label}
                                </button>
                              )
                            })}
                          </div>
                        </div>

                        {/* グラフ表示エリア */}
                        {isProcessingData ? (
                          <div className="h-96 flex items-center justify-center">
                            <div className="text-center">
                              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                              <p className="text-gray-500">データを処理中...</p>
                            </div>
                          </div>
                        ) : chartData.data.length > 0 ? (
                          <MultiLineChart
                            data={chartData.data}
                            colors={chartData.colors}
                            metric={metricConfig.label}
                            unit={metricConfig.unit}
                            decimals={metricConfig.decimals}
                            height={400}
                            yAxisLabel={`${metricConfig.label} (${metricConfig.unit})`}
                            accessibilityMode={true}
                          />
                        ) : (
                          <div className="h-96 flex items-center justify-center">
                            <div className="text-center text-gray-500">
                              <ChartBarIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                              <p>プラットフォーム別データがありません</p>
                              <p className="text-sm mt-2">
                                Meta APIから詳細データを取得してください
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* プラットフォーム別統計 */}
                      {platformStats && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* Facebook統計 */}
                          {platformStats.facebook && (
                            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="font-semibold text-blue-900">Facebook</h4>
                                <ComputerDesktopIcon className="h-5 w-5 text-blue-600" />
                              </div>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">インプレッション</span>
                                  <span className="font-medium">
                                    {formatNumber(platformStats.facebook.impressions)}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">CTR</span>
                                  <span className="font-medium">
                                    {formatPercentage(platformStats.facebook.ctr)}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">CPM</span>
                                  <span className="font-medium">
                                    {formatCurrency(platformStats.facebook.cpm)}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">コンバージョン</span>
                                  <span className="font-medium">
                                    {platformStats.facebook.conversions || 0}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Instagram統計 */}
                          {platformStats.instagram && (
                            <div className="bg-pink-50 rounded-lg p-4 border border-pink-200">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="font-semibold text-pink-900">Instagram</h4>
                                <DevicePhoneMobileIcon className="h-5 w-5 text-pink-600" />
                              </div>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">インプレッション</span>
                                  <span className="font-medium">
                                    {formatNumber(platformStats.instagram.impressions)}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">CTR</span>
                                  <span className="font-medium">
                                    {formatPercentage(platformStats.instagram.ctr)}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">CPM</span>
                                  <span className="font-medium">
                                    {formatCurrency(platformStats.instagram.cpm)}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">コンバージョン</span>
                                  <span className="font-medium">
                                    {platformStats.instagram.conversions || 0}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Audience Network統計 */}
                          {platformStats.audience_network && (
                            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="font-semibold text-green-900">Audience Network</h4>
                                <GlobeAltIcon className="h-5 w-5 text-green-600" />
                              </div>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">インプレッション</span>
                                  <span className="font-medium">
                                    {formatNumber(platformStats.audience_network.impressions)}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">CTR</span>
                                  <span className="font-medium">
                                    {formatPercentage(platformStats.audience_network.ctr)}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">CPM</span>
                                  <span className="font-medium">
                                    {formatCurrency(platformStats.audience_network.cpm)}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">コンバージョン</span>
                                  <span className="font-medium">
                                    {platformStats.audience_network.conversions || 0}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'metrics' && (
                    <div className="space-y-6">
                      {/* 既存のメトリクス表示 */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-gray-50 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <EyeIcon className="h-5 w-5 text-gray-400" />
                            <span className="text-2xl font-bold">
                              {formatNumber((creative as any).impressions || 0)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-2">インプレッション</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <CursorArrowRaysIcon className="h-5 w-5 text-gray-400" />
                            <span className="text-2xl font-bold">
                              {formatPercentage((creative as any).ctr || 0)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-2">CTR</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <CurrencyYenIcon className="h-5 w-5 text-gray-400" />
                            <span className="text-2xl font-bold">
                              {formatCurrency((creative as any).spend || 0)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-2">広告費</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <ShoppingBagIcon className="h-5 w-5 text-gray-400" />
                            <span className="text-2xl font-bold">
                              {(creative as any).conversions || 0}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-2">コンバージョン</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'insights' && (
                    <div className="space-y-6">
                      {/* TODO: CreativeInsightsの統合 - analysis と performanceHistory が必要 */}
                      <div className="text-gray-500 text-center py-8">
                        インサイト分析機能は準備中です
                      </div>
                    </div>
                  )}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  )
}

export default EnhancedCreativeDetailModalWithCharts
