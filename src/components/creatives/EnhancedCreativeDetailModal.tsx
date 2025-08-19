import React, { useState, useMemo, useEffect } from 'react'
import { Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import {
  ChartBarIcon,
  CurrencyYenIcon,
  EyeIcon,
  CursorArrowRaysIcon,
  ShoppingBagIcon,
  ArrowTrendingUpIcon,
  SparklesIcon,
  FireIcon,
  BoltIcon,
  TrophyIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/solid'
import { CreativeData } from './CreativePerformanceGrid'
import { VideoPlayer } from './VideoPlayer'
import { CreativeInsights } from './CreativeInsights'
import { CreativeFatigueAnalyzer } from '../../services/creativeFatigueAnalyzer'
import { useAdFatigueRealSafe as useAdFatigueReal } from '../../hooks/useAdFatigueRealSafe'
import { FatigueScoreCard } from '../AdFatigue/FatigueScoreCard'
import { FatigueAlert } from '../AdFatigue/FatigueAlert'
import { MetaAccountManager } from '../../services/metaAccountManager'

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
  }>
}

export const EnhancedCreativeDetailModal: React.FC<CreativeDetailModalProps> = ({
  creative,
  isOpen,
  onClose,
  performanceHistory = []
}) => {
  const [currentCarouselIndex, setCurrentCarouselIndex] = useState(0)
  const [activeTab, setActiveTab] = useState<'metrics' | 'insights'>('metrics')
  const analyzer = useMemo(() => new CreativeFatigueAnalyzer(), [])

  // アカウントIDを取得
  const manager = MetaAccountManager.getInstance()
  const activeAccount = manager.getActiveAccount()
  const accountId = activeAccount?.accountId || ''
  
  // 実際のMeta APIデータから疲労度分析を使用
  const { fatigueData, isCalculating, error, analyzeFatigue } = useAdFatigueReal(
    accountId, 
    creative?.adId && activeTab === 'insights' ? creative.adId : undefined
  )
  
  // 手動で疲労度分析を実行（必要に応じて）
  useEffect(() => {
    if (activeTab === 'insights' && creative?.adId && !fatigueData && !isCalculating && !error) {
      // 疲労度分析を実行
      analyzeFatigue(creative.adId).catch(console.error)
    }
  }, [activeTab, creative?.adId, fatigueData, isCalculating, error, analyzeFatigue])

  if (!creative) return null

  // 既存の疲労度分析も実行（比較用）
  const fatigueAnalysis = useMemo(() => {
    if (performanceHistory.length > 0) {
      return analyzer.analyzeFatigue(creative.id, performanceHistory)
    }
    return null
  }, [creative.id, performanceHistory, analyzer])

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

  // メトリクスをカラフルに表示するための設定
  const metrics = [
    {
      icon: EyeIcon,
      label: 'インプレッション',
      value: formatNumber(creative.metrics.impressions),
      gradientFrom: 'from-blue-400',
      gradientTo: 'to-cyan-400',
      iconBg: 'bg-gradient-to-br from-blue-500 to-cyan-500',
      description: '広告が表示された回数',
    },
    {
      icon: CursorArrowRaysIcon,
      label: 'クリック数',
      value: formatNumber(creative.metrics.clicks),
      subValue: `CTR: ${formatPercentage(creative.metrics.ctr)}`,
      gradientFrom: 'from-purple-400',
      gradientTo: 'to-pink-400',
      iconBg: 'bg-gradient-to-br from-purple-500 to-pink-500',
      description: 'ユーザーがクリックした回数',
    },
    {
      icon: ShoppingBagIcon,
      label: 'コンバージョン',
      value: formatNumber(creative.metrics.conversions),
      subValue: `CVR: ${formatPercentage((creative.metrics.conversions / creative.metrics.clicks) * 100)}`,
      gradientFrom: 'from-green-400',
      gradientTo: 'to-emerald-400',
      iconBg: 'bg-gradient-to-br from-green-500 to-emerald-500',
      description: '購入や登録などの成果',
    },
    {
      icon: CurrencyYenIcon,
      label: '広告費用',
      value: formatCurrency(creative.metrics.spend),
      subValue: `CPC: ${formatCurrency(creative.metrics.cpc)}`,
      gradientFrom: 'from-amber-400',
      gradientTo: 'to-orange-400',
      iconBg: 'bg-gradient-to-br from-amber-500 to-orange-500',
      description: '使用した広告予算',
    },
    {
      icon: ArrowTrendingUpIcon,
      label: '売上',
      value: formatCurrency(creative.metrics.revenue),
      subValue: `ROAS: ${creative.metrics.roas.toFixed(1)}x`,
      gradientFrom: 'from-indigo-400',
      gradientTo: 'to-purple-400',
      iconBg: 'bg-gradient-to-br from-indigo-500 to-purple-500',
      description: '広告から生まれた収益',
    },
    {
      icon: TrophyIcon,
      label: 'CPA',
      value: formatCurrency(creative.metrics.cpa),
      gradientFrom: 'from-rose-400',
      gradientTo: 'to-pink-400',
      iconBg: 'bg-gradient-to-br from-rose-500 to-pink-500',
      description: '1件の成果にかかった費用',
    },
  ]

  // パフォーマンス評価
  const getPerformanceRating = () => {
    const roas = creative.metrics.roas
    if (roas >= 4) return { label: '優秀', color: 'text-green-600', icon: FireIcon }
    if (roas >= 2) return { label: '良好', color: 'text-blue-600', icon: SparklesIcon }
    if (roas >= 1) return { label: '平均的', color: 'text-yellow-600', icon: BoltIcon }
    return { label: '改善必要', color: 'text-red-600', icon: null }
  }

  const performanceRating = getPerformanceRating()

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
          <div className="fixed inset-0 bg-gray-900 bg-opacity-75 transition-opacity" />
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
              <Dialog.Panel className="relative transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all w-full h-full">
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Dialog.Title as="h3" className="text-xl font-bold text-white">
                        {creative.name}
                      </Dialog.Title>
                      <p className="text-sm text-indigo-100 mt-1">
                        {creative.campaignName}
                      </p>
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
                </div>

                {/* Content */}
                <div className="p-6 h-[calc(100vh-80px)] overflow-y-auto">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left side - Phone mockup */}
                    <div className="flex flex-col justify-center items-center">
                      <div className="relative mx-auto" style={{ width: '320px', height: '640px' }}>
                        {/* Phone frame */}
                        <div className="absolute inset-0 bg-gray-900 rounded-[3rem] shadow-2xl"></div>
                        
                        {/* Screen bezel */}
                        <div className="absolute inset-[12px] bg-black rounded-[2.5rem] overflow-hidden">
                          {/* Notch */}
                          <div className="absolute top-0 inset-x-0 h-6 bg-gray-900 rounded-b-2xl" style={{ width: '150px', margin: '0 auto' }}></div>
                          
                          {/* Screen content */}
                          <div className="absolute inset-[2px] bg-white rounded-[2.4rem] overflow-hidden">
                            {/* Status bar */}
                            <div className="h-6 bg-white flex items-center justify-end px-6 text-xs">
                              <div className="flex items-center gap-1">
                                {/* Signal bars */}
                                <div className="flex gap-0.5 items-end">
                                  <div className="w-1 h-1 bg-gray-900 rounded-sm"></div>
                                  <div className="w-1 h-2 bg-gray-900 rounded-sm"></div>
                                  <div className="w-1 h-3 bg-gray-900 rounded-sm"></div>
                                  <div className="w-1 h-4 bg-gray-400 rounded-sm"></div>
                                </div>
                                {/* WiFi icon */}
                                <svg className="w-3 h-3 text-gray-900" fill="currentColor" viewBox="0 0 640 512">
                                  <path d="M320 128c88.4 0 160 71.6 160 160v96H160v-96c0-88.4 71.6-160 160-160zm0 32c-70.7 0-128 57.3-128 128v64h256v-64c0-70.7-57.3-128-128-128zm0 64c35.3 0 64 28.7 64 64h-128c0-35.3 28.7-64 64-64z"/>
                                </svg>
                                {/* Battery with charging indicator */}
                                <div className="relative">
                                  <div className="w-6 h-3 border border-gray-900 rounded-sm">
                                    <div className="absolute inset-0.5 bg-green-500 rounded-sm" style={{ width: '70%' }}></div>
                                  </div>
                                  <div className="absolute -right-0.5 top-1 w-0.5 h-1 bg-gray-900 rounded-r"></div>
                                  {/* Lightning bolt for charging */}
                                  <svg className="absolute left-1 top-0 w-3 h-3" viewBox="0 0 12 12" fill="none">
                                    <path d="M7 1L3 6h2.5L4 11l4-5H5.5L7 1z" fill="white" stroke="currentColor" strokeWidth="0.5" className="text-gray-700"/>
                                  </svg>
                                </div>
                              </div>
                            </div>
                              
                            {/* Content area */}
                            <div className="h-[calc(100%-24px)] bg-gray-100 overflow-hidden">
                              {creative.type === 'VIDEO' && creative.videoUrl ? (
                                <div className="w-full h-full bg-black flex items-center justify-center">
                                  <VideoPlayer
                                    videoUrl={creative.videoUrl}
                                    thumbnailUrl={creative.thumbnailUrl}
                                    videoId={creative.videoId}
                                    creativeName={creative.name}
                                    mobileOptimized={true}
                                  />
                                </div>
                              ) : creative.type === 'CAROUSEL' && creative.carouselCards && creative.carouselCards.length > 0 ? (
                                <div className="relative w-full h-full">
                                  <img
                                    src={creative.carouselCards[currentCarouselIndex].image_url}
                                    alt={creative.carouselCards[currentCarouselIndex].name}
                                    className="w-full h-full object-cover"
                                  />
                                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4">
                                    <h5 className="text-white font-medium">
                                      {creative.carouselCards[currentCarouselIndex].name}
                                    </h5>
                                    <p className="text-white text-sm opacity-90 mt-1">
                                      {creative.carouselCards[currentCarouselIndex].description}
                                    </p>
                                  </div>
                                  {/* Carousel indicators */}
                                  <div className="absolute bottom-20 left-0 right-0 flex justify-center gap-2">
                                    {creative.carouselCards.map((_, index) => (
                                      <button
                                        key={index}
                                        onClick={() => setCurrentCarouselIndex(index)}
                                        className={`w-2 h-2 rounded-full transition-colors ${
                                          index === currentCarouselIndex ? 'bg-white' : 'bg-white bg-opacity-50'
                                        }`}
                                      />
                                    ))}
                                  </div>
                                </div>
                              ) : creative.thumbnailUrl ? (
                                <div className="w-full h-full flex items-center justify-center bg-black">
                                  <img
                                    src={creative.thumbnailUrl}
                                    alt={creative.name}
                                    className="max-w-full max-h-full object-contain"
                                  />
                                </div>
                              ) : (
                                <div className="flex items-center justify-center h-full">
                                  <span className="text-gray-400">プレビューなし</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Creative info below phone */}
                      <div className="mt-6 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                            creative.status === 'ACTIVE' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {creative.status === 'ACTIVE' ? 'アクティブ' : '一時停止'}
                          </span>
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            {creative.type === 'IMAGE' ? '画像' : creative.type === 'VIDEO' ? '動画' : 'カルーセル'}
                          </span>
                          {performanceRating.icon && (
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 ${performanceRating.color}`}>
                              <performanceRating.icon className="h-3 w-3 mr-1" />
                              {performanceRating.label}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right side - Metrics & Insights */}
                    <div className="space-y-4">
                      {/* Tab Navigation */}
                      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
                        <button
                          onClick={() => setActiveTab('metrics')}
                          className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                            activeTab === 'metrics'
                              ? 'bg-white text-gray-900 shadow-sm'
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          パフォーマンス指標
                        </button>
                        <button
                          onClick={() => setActiveTab('insights')}
                          className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                            activeTab === 'insights'
                              ? 'bg-white text-gray-900 shadow-sm'
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          疲労度分析
                        </button>
                      </div>

                      {/* Tab Content */}
                      {activeTab === 'metrics' ? (
                        <div className="space-y-4">
                          <h4 className="text-lg font-bold text-gray-900">パフォーマンス指標</h4>
                          
                          <div className="grid grid-cols-2 gap-4">
                            {metrics.map((metric) => (
                              <div
                                key={metric.label}
                                className="relative bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow overflow-hidden group"
                              >
                                {/* Background gradient effect */}
                                <div className={`absolute inset-0 bg-gradient-to-br ${metric.gradientFrom} ${metric.gradientTo} opacity-5 group-hover:opacity-10 transition-opacity`}></div>
                                
                                <div className="relative p-4">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <p className="text-sm text-gray-600 font-medium">{metric.label}</p>
                                      <p className="text-2xl font-bold text-gray-900 mt-1">
                                        {metric.value}
                                      </p>
                                      {metric.subValue && (
                                        <p className="text-sm text-gray-700 mt-1 font-medium">{metric.subValue}</p>
                                      )}
                                      <p className="text-xs text-gray-500 mt-2">{metric.description}</p>
                                    </div>
                                    <div className={`p-3 rounded-xl ${metric.iconBg} shadow-lg`}>
                                      <metric.icon className="h-6 w-6 text-white" />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Performance Summary Card */}
                          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-100">
                            <h5 className="text-sm font-bold text-indigo-900 mb-4 flex items-center">
                              <ChartBarIcon className="h-5 w-5 mr-2" />
                              パフォーマンスサマリー
                            </h5>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="bg-white rounded-lg p-3">
                                <span className="text-xs text-gray-600">エンゲージメント率</span>
                                <p className="text-lg font-bold text-indigo-600 mt-1">
                                  {((creative.metrics.clicks / creative.metrics.impressions) * 100).toFixed(2)}%
                                </p>
                              </div>
                              <div className="bg-white rounded-lg p-3">
                                <span className="text-xs text-gray-600">コンバージョン率</span>
                                <p className="text-lg font-bold text-green-600 mt-1">
                                  {((creative.metrics.conversions / creative.metrics.clicks) * 100).toFixed(2)}%
                                </p>
                              </div>
                              <div className="bg-white rounded-lg p-3">
                                <span className="text-xs text-gray-600">平均注文額</span>
                                <p className="text-lg font-bold text-purple-600 mt-1">
                                  {formatCurrency(creative.metrics.revenue / creative.metrics.conversions)}
                                </p>
                              </div>
                              <div className="bg-white rounded-lg p-3">
                                <span className="text-xs text-gray-600">利益率</span>
                                <p className="text-lg font-bold text-amber-600 mt-1">
                                  {(((creative.metrics.revenue - creative.metrics.spend) / creative.metrics.revenue) * 100).toFixed(1)}%
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        // Insights Tab - 高度な疲労度分析
                        <div className="space-y-4">
                          {isCalculating ? (
                            <div className="text-center py-12">
                              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto"></div>
                              <p className="mt-2 text-sm text-gray-500">
                                疲労度を分析中...
                              </p>
                            </div>
                          ) : error ? (
                            <div className="text-center py-12">
                              <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-400" />
                              <p className="mt-2 text-sm text-red-500">
                                {error}
                              </p>
                            </div>
                          ) : fatigueData ? (
                            <>
                              {/* Phase 2の高度な疲労度分析表示 */}
                              <FatigueScoreCard
                                fatigueScore={fatigueData.fatigueScore}
                                metrics={fatigueData.metrics}
                                adName={fatigueData.adName}
                              />
                              
                              {/* 疲労度アラート */}
                              {fatigueData.fatigueScore.status === 'critical' && (
                                <FatigueAlert
                                  level="critical"
                                  message={fatigueData.recommendedAction}
                                  metrics={fatigueData.metrics}
                                />
                              )}
                              
                              {/* 既存のCreativeInsightsも表示（追加情報として） */}
                              {fatigueAnalysis && (
                                <div className="mt-6 pt-6 border-t border-gray-200">
                                  <CreativeInsights
                                    analysis={fatigueAnalysis}
                                    performanceHistory={performanceHistory}
                                    creativeName={creative.name}
                                    compact={true}
                                  />
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="text-center py-12">
                              <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
                              <p className="mt-2 text-sm text-gray-500">
                                データを取得中...しばらくお待ちください
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  )
}