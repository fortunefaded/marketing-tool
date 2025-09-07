import React from 'react'
import { Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import {
  ChartBarIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
  FireIcon,
  BoltIcon,
} from '@heroicons/react/24/solid'
import { CreativeInsights, CreativePerformanceData } from './CreativeInsights'
import { VideoPlayer } from './VideoPlayer'
// TODO: Replace with features/meta-api implementation
// import { CreativeFatigueAnalysis } from '../../services/creativeFatigueAnalyzer'
interface CreativeFatigueAnalysis {
  score: number
  status: 'healthy' | 'caution' | 'warning' | 'critical'
  factors: {
    frequency: { value: number; trend: 'up' | 'down' | 'stable' }
    ctr: { value: number; trend: 'up' | 'down' | 'stable' }
    cpm: { value: number; trend: 'up' | 'down' | 'stable' }
  }
}

interface MobileCreativeInsightsProps {
  isOpen: boolean
  onClose: () => void
  creativeName: string
  creativeType: string
  thumbnailUrl?: string
  videoUrl?: string
  videoId?: string
  carouselCards?: Array<{
    name: string
    description: string
    image_url: string
    link: string
  }>
  analysis: CreativeFatigueAnalysis
  performanceHistory: Array<{
    date: string
    ctr: number
    frequency: number
    impressions: number
    clicks: number
    spend: number
  }>
}

export const MobileCreativeInsights: React.FC<MobileCreativeInsightsProps> = ({
  isOpen,
  onClose,
  creativeName,
  creativeType,
  thumbnailUrl,
  videoUrl,
  videoId,
  carouselCards,
  analysis,
  performanceHistory,
}) => {
  const [currentCarouselIndex, setCurrentCarouselIndex] = React.useState(0)

  // 疲労度レベルに応じたアイコンと色
  const getFatigueIcon = () => {
    switch (analysis.status) {
      case 'healthy':
        return { icon: SparklesIcon, color: 'text-green-600', bg: 'bg-green-100' }
      case 'warning':
        return { icon: ExclamationTriangleIcon, color: 'text-yellow-600', bg: 'bg-yellow-100' }
      case 'critical':
        return { icon: FireIcon, color: 'text-red-600', bg: 'bg-red-100' }
      default:
        return { icon: BoltIcon, color: 'text-gray-600', bg: 'bg-gray-100' }
    }
  }

  const fatigueIcon = getFatigueIcon()

  // Convert CreativeFatigueAnalysis to FatigueAnalysis for CreativeInsights component
  const fatigueAnalysis = {
    score: analysis.score,
    trend: analysis.factors.ctr.trend === 'up' ? 'improving' as const : 
           analysis.factors.ctr.trend === 'down' ? 'declining' as const : 'stable' as const,
    factors: [
      { name: 'Frequency', impact: analysis.factors.frequency.trend === 'up' ? 'negative' as const : 'positive' as const },
      { name: 'CTR', impact: analysis.factors.ctr.trend === 'down' ? 'negative' as const : 'positive' as const },
      { name: 'CPM', impact: analysis.factors.cpm.trend === 'up' ? 'negative' as const : 'positive' as const }
    ],
    recommendation: analysis.status === 'critical' ? 'Replace creative immediately' : 
                    analysis.status === 'warning' ? 'Consider refreshing creative' : 
                    'Continue monitoring',
    recommendedAction: analysis.status === 'critical' ? 'replace' as const : 
                       analysis.status === 'warning' ? 'refresh' as const : 'continue' as const,
    fatigueScore: analysis.score,
    ctrTrend: analysis.factors.ctr.trend === 'up' ? 5 : 
              analysis.factors.ctr.trend === 'down' ? -5 : 0,
    frequencySaturation: Math.min((analysis.factors.frequency.value || 1) * 20, 100),
    daysSincePeak: 0,
    peakPerformanceDate: new Date().toISOString(),
    message: `Current status: ${analysis.status}`
  }

  // Convert performance history to match CreativePerformanceData interface
  const convertedPerformanceHistory: CreativePerformanceData[] = performanceHistory.map(data => ({
    date: data.date,
    impressions: data.impressions,
    clicks: data.clicks,
    ctr: data.ctr,
    cpm: data.spend > 0 && data.impressions > 0 ? (data.spend / data.impressions) * 1000 : 0,
    spend: data.spend,
    frequency: data.frequency
  }))

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
          <div className="flex min-h-full items-center justify-center p-4">
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
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Dialog.Title
                        as="h3"
                        className="text-xl font-bold text-white flex items-center gap-2"
                      >
                        <ChartBarIcon className="h-6 w-6" />
                        クリエイティブ疲労度分析
                      </Dialog.Title>
                      <p className="text-sm text-purple-100 mt-1">{creativeName}</p>
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
                <div className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left side - Phone mockup */}
                    <div className="flex justify-center items-center">
                      <div className="relative">
                        {/* iPhone mockup */}
                        <div
                          className="relative mx-auto"
                          style={{ width: '320px', height: '640px' }}
                        >
                          {/* Phone frame */}
                          <div className="absolute inset-0 bg-gray-900 rounded-[3rem] shadow-2xl"></div>

                          {/* Screen bezel */}
                          <div className="absolute inset-[12px] bg-black rounded-[2.5rem] overflow-hidden">
                            {/* Notch */}
                            <div
                              className="absolute top-0 inset-x-0 h-6 bg-gray-900 rounded-b-2xl"
                              style={{ width: '150px', margin: '0 auto' }}
                            ></div>

                            {/* Screen content */}
                            <div className="absolute inset-[2px] bg-white rounded-[2.4rem] overflow-hidden">
                              {/* Status bar */}
                              <div className="h-6 bg-white flex items-center justify-end px-6 text-xs">
                                <div className="flex items-center gap-1">
                                  {/* Signal bars */}
                                  <div className="flex gap-0.5">
                                    <div className="w-1 h-2 bg-gray-900 rounded-sm"></div>
                                    <div className="w-1 h-3 bg-gray-900 rounded-sm"></div>
                                    <div className="w-1 h-4 bg-gray-900 rounded-sm"></div>
                                  </div>
                                  {/* WiFi icon */}
                                  <svg
                                    className="w-3 h-3 text-gray-900"
                                    fill="currentColor"
                                    viewBox="0 0 640 512"
                                  >
                                    <path d="M320 128c88.4 0 160 71.6 160 160v96H160v-96c0-88.4 71.6-160 160-160zm0 32c-70.7 0-128 57.3-128 128v64h256v-64c0-70.7-57.3-128-128-128zm0 64c35.3 0 64 28.7 64 64h-128c0-35.3 28.7-64 64-64z" />
                                  </svg>
                                  {/* Battery with charging indicator */}
                                  <div className="relative">
                                    <div className="w-6 h-3 border border-gray-900 rounded-sm">
                                      <div
                                        className="absolute inset-0.5 bg-green-500 rounded-sm"
                                        style={{ width: '70%' }}
                                      ></div>
                                    </div>
                                    <div className="absolute -right-0.5 top-1 w-0.5 h-1 bg-gray-900 rounded-r"></div>
                                    {/* Lightning bolt for charging */}
                                    <svg
                                      className="absolute left-1 top-0 w-3 h-3"
                                      viewBox="0 0 12 12"
                                      fill="none"
                                    >
                                      <path
                                        d="M7 1L3 6h2.5L4 11l4-5H5.5L7 1z"
                                        fill="white"
                                        stroke="currentColor"
                                        strokeWidth="0.5"
                                        className="text-gray-700"
                                      />
                                    </svg>
                                  </div>
                                </div>
                              </div>

                              {/* Content area */}
                              <div className="h-[calc(100%-24px)] bg-gray-100 overflow-hidden">
                                {creativeType === 'video' && videoUrl ? (
                                  <div className="w-full h-full bg-black flex items-center justify-center">
                                    <VideoPlayer
                                      videoUrl={videoUrl}
                                      thumbnailUrl={thumbnailUrl}
                                      videoId={videoId}
                                      creativeName={creativeName}
                                      mobileOptimized={true}
                                    />
                                  </div>
                                ) : creativeType === 'carousel' &&
                                  carouselCards &&
                                  carouselCards.length > 0 ? (
                                  <div className="relative w-full h-full">
                                    <img
                                      src={carouselCards[currentCarouselIndex].image_url}
                                      alt={carouselCards[currentCarouselIndex].name}
                                      className="w-full h-full object-cover"
                                    />
                                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4">
                                      <h5 className="text-white font-medium">
                                        {carouselCards[currentCarouselIndex].name}
                                      </h5>
                                      <p className="text-white text-sm opacity-90 mt-1">
                                        {carouselCards[currentCarouselIndex].description}
                                      </p>
                                    </div>
                                    {/* Carousel indicators */}
                                    <div className="absolute bottom-20 left-0 right-0 flex justify-center gap-2">
                                      {carouselCards.map((_, index) => (
                                        <button
                                          key={index}
                                          onClick={() => setCurrentCarouselIndex(index)}
                                          className={`w-2 h-2 rounded-full transition-colors ${
                                            index === currentCarouselIndex
                                              ? 'bg-white'
                                              : 'bg-white bg-opacity-50'
                                          }`}
                                        />
                                      ))}
                                    </div>
                                  </div>
                                ) : thumbnailUrl ? (
                                  <div className="w-full h-full flex items-center justify-center bg-black">
                                    <img
                                      src={thumbnailUrl}
                                      alt={creativeName}
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

                        {/* Fatigue status below phone */}
                        <div className="mt-6 text-center">
                          <div
                            className={`inline-flex items-center px-4 py-2 rounded-full ${fatigueIcon.bg}`}
                          >
                            <fatigueIcon.icon className={`h-5 w-5 ${fatigueIcon.color} mr-2`} />
                            <span className={`text-sm font-medium ${fatigueIcon.color}`}>
                              疲労度:{' '}
                              {analysis.status === 'healthy'
                                ? '健全'
                                : analysis.status === 'warning'
                                  ? '警告'
                                  : analysis.status === 'critical'
                                    ? '危険'
                                    : '不明'}{' '}
                              ({(analysis.score ?? 0).toFixed(0)}%)
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right side - Fatigue Analysis */}
                    <div className="flex items-center">
                      <div className="w-full">
                        <CreativeInsights
                          analysis={fatigueAnalysis}
                          performanceHistory={convertedPerformanceHistory}
                          creativeName={creativeName}
                          compact={true}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="bg-gray-50 px-6 py-4 flex justify-end">
                  <button
                    type="button"
                    className="px-6 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all"
                    onClick={onClose}
                  >
                    閉じる
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  )
}
