import React, { useState, useMemo, useCallback, memo } from 'react'
import { MetaInsightsData } from '@/types'
import { normalizeCreativeMediaType } from '@/features/meta-api/utils/creative-type'
import {
  PhotoIcon,
  VideoCameraIcon,
  DocumentTextIcon,
  ViewColumnsIcon,
  PlayIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline'
import { EnhancedCreativeDetailModal } from '../creatives/EnhancedCreativeDetailModal'
import { CreativeData } from '../creatives/CreativePerformanceGrid'
// TODO: Replace with features/meta-api implementation
// import { CreativeFatigueAnalyzer } from '../../services/creativeFatigueAnalyzer'
import { MobileCreativeInsights } from '../creatives/MobileCreativeInsights'
import { VideoPlayer } from '../creatives/VideoPlayer'

// Temporary mock implementation for CreativeFatigueAnalyzer
class CreativeFatigueAnalyzer {
  analyzeFatigue(_creativeId: string, performanceData: any[]) {
    // Mock fatigue analysis
    const latestData = performanceData[performanceData.length - 1] || {}
    const firstData = performanceData[0] || {}
    const ctrTrend = latestData.ctr && firstData.ctr ? ((latestData.ctr - firstData.ctr) / firstData.ctr) * 100 : 0
    
    return {
      score: 50,
      status: 'healthy' as const,
      factors: {
        frequency: { value: latestData.frequency || 1, trend: 'stable' as const },
        ctr: { value: latestData.ctr || 0, trend: ctrTrend > 0 ? 'up' as const : ctrTrend < 0 ? 'down' as const : 'stable' as const },
        cpm: { value: 0, trend: 'stable' as const }
      }
    }
  }
}

interface CreativePerformanceProps {
  insights: MetaInsightsData[]
  dateRange?: { start: string; end: string }
  aggregationPeriod?: 'daily' | 'weekly' | 'monthly'
  onPeriodChange?: (period: 'daily' | 'weekly' | 'monthly') => void
}

interface CreativeMetrics {
  creative_id: string
  creative_name: string
  creative_type: string
  creative_url?: string
  thumbnail_url?: string
  video_url?: string
  video_id?: string
  campaign_name?: string
  ad_id?: string
  carousel_cards?: Array<{
    name?: string
    description?: string
    image_url?: string
    link?: string
    video_url?: string
  }>
  impressions: number
  clicks: number
  spend: number
  conversions: number
  conversion_value: number
  ctr: number
  cpc: number
  cpa: number
  roas: number
  frequency?: number
}

// メモ化されたクリエイティブカード
const CreativeCard = memo<{
  metric: CreativeMetrics
  onClick: (metric: CreativeMetrics) => void
  onInsightsClick: (creativeId: string) => void
  onVideoPlay: (creativeId: string) => void
  isVideoPlaying: boolean
}>(({ metric, onClick, onInsightsClick, onVideoPlay, isVideoPlaying }) => {
  const formatNumber = useCallback((num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toFixed(0)
  }, [])

  const formatCurrency = useCallback((num: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      minimumFractionDigits: 0,
    }).format(num)
  }, [])

  const getCreativeIcon = useCallback((type: string) => {
    switch (type) {
      case 'image':
        return <PhotoIcon className="h-5 w-5 text-blue-500" />
      case 'video':
        return <VideoCameraIcon className="h-5 w-5 text-purple-500" />
      case 'carousel':
        return <ViewColumnsIcon className="h-5 w-5 text-green-500" />
      default:
        return <DocumentTextIcon className="h-5 w-5 text-gray-500" />
    }
  }, [])

  return (
    <div
      className="relative bg-gray-50 rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
      onClick={() => onClick(metric)}
    >
      {/* サムネイル */}
      <div className="relative aspect-video bg-gray-200 group">
        {metric.creative_type === 'video' && isVideoPlaying ? (
          <VideoPlayer
            videoUrl={metric.video_url}
            thumbnailUrl={metric.thumbnail_url || metric.creative_url}
            videoId={metric.video_id}
            creativeName={metric.creative_name}
          />
        ) : metric.creative_type === 'carousel' &&
          metric.carousel_cards &&
          metric.carousel_cards.length > 0 ? (
          <>
            <img
              src={metric.carousel_cards[0].image_url}
              alt={metric.creative_name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            <div className="absolute bottom-2 right-2 bg-black bg-opacity-60 text-white px-2 py-1 rounded text-xs">
              {metric.carousel_cards.length}枚
            </div>
          </>
        ) : metric.thumbnail_url || metric.creative_url ? (
          <>
            <img
              src={metric.thumbnail_url || metric.creative_url}
              alt={metric.creative_name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            {metric.creative_type === 'video' && (
              <div
                className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation()
                  onVideoPlay(metric.creative_id)
                }}
              >
                <PlayIcon className="h-12 w-12 text-white opacity-80 group-hover:opacity-100 transition-opacity" />
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            {getCreativeIcon(metric.creative_type)}
          </div>
        )}
        {/* タイプバッジ */}
        <div className="absolute top-2 left-2">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-gray-900 text-white">
            {metric.creative_type === 'image'
              ? '画像'
              : metric.creative_type === 'video'
                ? '動画'
                : metric.creative_type === 'carousel'
                  ? 'カルーセル'
                  : 'テキスト'}
          </span>
        </div>
      </div>
      {/* 情報 */}
      <div className="p-4">
        <h4 className="text-sm font-medium text-gray-900 truncate">{metric.creative_name}</h4>
        <p className="text-xs text-gray-500 mt-1 truncate">
          {metric.campaign_name || 'キャンペーン名なし'}
        </p>
        {/* メトリクス */}
        <div className="mt-3 space-y-2">
          {/* 主要指標 */}
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="text-center">
              <p className="text-gray-500">表示</p>
              <p className="text-gray-900 font-medium">{formatNumber(metric.impressions)}</p>
            </div>
            <div className="text-center">
              <p className="text-gray-500">クリック</p>
              <p className="text-gray-900 font-medium">{formatNumber(metric.clicks)}</p>
            </div>
            <div className="text-center">
              <p className="text-gray-500">CV</p>
              <p className="text-gray-900 font-medium">{formatNumber(metric.conversions)}</p>
            </div>
          </div>

          {/* パフォーマンス指標 */}
          <div className="grid grid-cols-3 gap-2 text-xs border-t pt-2">
            <div className="text-center">
              <p className="text-gray-500">CTR</p>
              <p className="text-blue-600 font-medium">{metric.ctr.toFixed(2)}%</p>
            </div>
            <div className="text-center">
              <p className="text-gray-500">CVR</p>
              <p className="text-green-600 font-medium">
                {metric.clicks > 0
                  ? ((metric.conversions / metric.clicks) * 100).toFixed(2)
                  : '0.00'}
                %
              </p>
            </div>
            <div className="text-center">
              <p className="text-gray-500">ROAS</p>
              <p className="text-purple-600 font-medium">{metric.roas.toFixed(2)}x</p>
            </div>
          </div>

          {/* 費用と収益 */}
          <div className="flex justify-between text-xs border-t pt-2">
            <div>
              <span className="text-gray-500">費用:</span>
              <span className="ml-1 font-medium">{formatCurrency(metric.spend)}</span>
            </div>
            <div>
              <span className="text-gray-500">収益:</span>
              <span className="ml-1 font-medium text-green-600">
                {formatCurrency(metric.conversion_value)}
              </span>
            </div>
          </div>

          {/* 疲労度分析ボタン */}
          <div className="mt-3 border-t pt-3">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onInsightsClick(metric.creative_id)
              }}
              className="w-full px-3 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-md text-xs font-medium flex items-center justify-center gap-1"
            >
              <ChartBarIcon className="h-4 w-4" />
              疲労度分析を表示
            </button>
          </div>
        </div>
      </div>
    </div>
  )
})

CreativeCard.displayName = 'CreativeCard'

// メモ化されたフィルターボタングループ
const FilterButtons = memo<{
  selectedType: string
  onTypeChange: (type: string) => void
  viewMode: 'grid' | 'table'
  onViewModeChange: (mode: 'grid' | 'table') => void
  aggregationPeriod?: 'daily' | 'weekly' | 'monthly'
  onPeriodChange?: (period: 'daily' | 'weekly' | 'monthly') => void
}>(
  ({
    selectedType,
    onTypeChange,
    viewMode,
    onViewModeChange,
    aggregationPeriod,
    onPeriodChange,
  }) => (
    <div className="flex gap-4">
      {/* 期間選択 */}
      {onPeriodChange && aggregationPeriod && (
        <select
          value={aggregationPeriod}
          onChange={(e) => onPeriodChange(e.target.value as 'daily' | 'weekly' | 'monthly')}
          className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="daily">日別</option>
          <option value="weekly">週別</option>
          <option value="monthly">月別</option>
        </select>
      )}
      {/* 表示モード切替 */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-md">
        <button
          onClick={() => onViewModeChange('grid')}
          className={`px-3 py-1 rounded text-sm font-medium ${
            viewMode === 'grid'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          グリッド
        </button>
        <button
          onClick={() => onViewModeChange('table')}
          className={`px-3 py-1 rounded text-sm font-medium ${
            viewMode === 'table'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          テーブル
        </button>
      </div>
      {/* タイプフィルター */}
      <div className="flex gap-2">
        <button
          onClick={() => onTypeChange('all')}
          className={`px-4 py-2 rounded-md text-sm font-medium ${
            selectedType === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          すべて
        </button>
        <button
          onClick={() => onTypeChange('image')}
          className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 ${
            selectedType === 'image'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <PhotoIcon className="h-4 w-4" />
          画像
        </button>
        <button
          onClick={() => onTypeChange('video')}
          className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 ${
            selectedType === 'video'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <VideoCameraIcon className="h-4 w-4" />
          動画
        </button>
        <button
          onClick={() => onTypeChange('carousel')}
          className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 ${
            selectedType === 'carousel'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <ViewColumnsIcon className="h-4 w-4" />
          カルーセル
        </button>
      </div>
    </div>
  )
)

FilterButtons.displayName = 'FilterButtons'

export const OptimizedCreativePerformance: React.FC<CreativePerformanceProps> = ({
  insights,
  dateRange: _dateRange, // 未使用パラメータ
  aggregationPeriod = 'daily',
  onPeriodChange,
}) => {
  const [selectedType, setSelectedType] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
  const [selectedCreative, setSelectedCreative] = useState<CreativeData | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null)
  const [showInsights, setShowInsights] = useState(false)
  const [selectedCreativeForInsights, setSelectedCreativeForInsights] = useState<string | null>(
    null
  )

  const analyzer = useMemo(() => new CreativeFatigueAnalyzer(), [])

  // クリエイティブメトリクスの集計（メモ化）
  const creativeMetrics = useMemo(() => {
    const metricsMap = new Map<string, CreativeMetrics>()

    // 広告レベルのデータのみを処理
    const adLevelInsights = insights.filter((insight) => insight.ad_id)

    adLevelInsights.forEach((insight) => {
      const key = insight.creative_id || insight.ad_id || 'unknown'
      const existing = metricsMap.get(key) || {
        creative_id: key,
        creative_name: insight.creative_name || insight.ad_name || 'Unknown',
        creative_type: normalizeCreativeMediaType(insight.creative_type || insight.creative_media_type),
        creative_url: insight.creative_url,
        thumbnail_url: insight.thumbnail_url,
        video_url: insight.video_url,
        video_id: insight.video_id,
        campaign_name: insight.campaign_name,
        ad_id: insight.ad_id,
        carousel_cards: insight.carousel_cards,
        impressions: 0,
        clicks: 0,
        spend: 0,
        conversions: 0,
        conversion_value: 0,
        ctr: 0,
        cpc: 0,
        cpa: 0,
        roas: 0,
      }

      existing.impressions += Number(insight.impressions || 0)
      existing.clicks += Number(insight.clicks || 0)
      existing.spend += Number(insight.spend || 0)
      existing.conversions += Number(insight.conversions || 0)
      existing.conversion_value += Number(insight.conversion_value || 0)

      metricsMap.set(key, existing)
    })

    // CTR, CPC, CPA, ROASを計算
    return Array.from(metricsMap.values()).map((m) => ({
      ...m,
      ctr: m.impressions > 0 ? (m.clicks / m.impressions) * 100 : 0,
      cpc: m.clicks > 0 ? m.spend / m.clicks : 0,
      cpa: m.conversions > 0 ? m.spend / m.conversions : 0,
      roas: m.spend > 0 ? m.conversion_value / m.spend : 0,
    }))
  }, [insights])

  // フィルタリング（メモ化）
  const filteredMetrics = useMemo(() => {
    if (selectedType === 'all') return creativeMetrics
    return creativeMetrics.filter((m) => m.creative_type === selectedType)
  }, [creativeMetrics, selectedType])

  // コールバック関数（メモ化）
  const handleCreativeClick = useCallback((metric: CreativeMetrics) => {
    const creative: CreativeData = {
      id: metric.creative_id,
      name: metric.creative_name,
      type:
        metric.creative_type === 'video'
          ? 'VIDEO'
          : metric.creative_type === 'carousel'
            ? 'CAROUSEL'
            : 'IMAGE',
      thumbnailUrl: metric.thumbnail_url || metric.creative_url,
      videoUrl: metric.video_url,
      campaignName: metric.campaign_name || 'Unknown Campaign',
      carouselCards: metric.carousel_cards,
      metrics: {
        impressions: metric.impressions,
        clicks: metric.clicks,
        conversions: metric.conversions,
        spend: metric.spend,
        revenue: metric.conversion_value,
        ctr: metric.ctr,
        cpc: metric.cpc,
        cpa: metric.cpa,
        roas: metric.roas,
      },
      status: 'ACTIVE',
    }
    setSelectedCreative(creative)
    setIsModalOpen(true)
  }, [])

  const handleInsightsClick = useCallback((creativeId: string) => {
    setSelectedCreativeForInsights(creativeId)
    setShowInsights(true)
  }, [])

  const handleVideoPlay = useCallback((creativeId: string) => {
    setPlayingVideoId((prev) => (prev === creativeId ? null : creativeId))
  }, [])

  return (
    <>
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">クリエイティブパフォーマンス</h2>
          <FilterButtons
            selectedType={selectedType}
            onTypeChange={setSelectedType}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            aggregationPeriod={aggregationPeriod}
            onPeriodChange={onPeriodChange}
          />
        </div>

        {filteredMetrics.length === 0 ? (
          <div className="text-center py-12">
            <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              クリエイティブデータがありません
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              広告レベルのデータを取得するには、「全同期」を実行してください。
            </p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMetrics.map((metric) => (
              <CreativeCard
                key={metric.creative_id}
                metric={metric}
                onClick={handleCreativeClick}
                onInsightsClick={handleInsightsClick}
                onVideoPlay={handleVideoPlay}
                isVideoPlaying={playingVideoId === metric.creative_id}
              />
            ))}
          </div>
        ) : (
          // テーブルビューは別途最適化可能
          <div>テーブルビュー</div>
        )}
      </div>

      {/* 詳細モーダル */}
      <EnhancedCreativeDetailModal
        creative={selectedCreative}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setSelectedCreative(null)
        }}
      />

      {/* 疲労度分析モーダル */}
      {showInsights &&
        selectedCreativeForInsights &&
        (() => {
          const selectedMetric = creativeMetrics.find(
            (m) => m.creative_id === selectedCreativeForInsights
          )
          if (!selectedMetric) return null

          const performanceData = insights
            .filter((insight) => insight.creative_id === selectedCreativeForInsights)
            .map((insight) => ({
              date: (insight.date_start || (insight as any).dateStart || '') as string,
              ctr: Number(insight.ctr) || 0,
              frequency: Number(insight.frequency) || 1,
              impressions: Number(insight.impressions) || 0,
              clicks: Number(insight.clicks) || 0,
              spend: Number(insight.spend) || 0,
            }))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

          const analysis = analyzer.analyzeFatigue(selectedCreativeForInsights, performanceData)

          return (
            <MobileCreativeInsights
              isOpen={showInsights}
              onClose={() => {
                setShowInsights(false)
                setSelectedCreativeForInsights(null)
              }}
              creativeName={selectedMetric.creative_name}
              creativeType={selectedMetric.creative_type}
              thumbnailUrl={selectedMetric.thumbnail_url || selectedMetric.creative_url}
              videoUrl={selectedMetric.video_url}
              videoId={selectedMetric.video_id}
              carouselCards={selectedMetric.carousel_cards?.map(card => ({
                name: card.name || '',
                description: card.description || '',
                image_url: card.image_url || '',
                link: card.link || ''
              }))}
              analysis={analysis}
              performanceHistory={performanceData}
            />
          )
        })()}
    </>
  )
}
