/* eslint-env browser */
import React, { useState, useEffect } from 'react'
import { MetaInsightsData } from '../../services/metaApiService'
import {
  PhotoIcon,
  VideoCameraIcon,
  DocumentTextIcon,
  ViewColumnsIcon,
  PlayIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import { EnhancedCreativeDetailModal } from '../creatives/EnhancedCreativeDetailModal'
import { CreativeData } from '../creatives/CreativePerformanceGrid'
import { VideoPlayer } from '../creatives/VideoPlayer'

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
    name: string
    description: string
    image_url: string
    link: string
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

export const CreativePerformance: React.FC<CreativePerformanceProps> = ({
  insights,
  dateRange: _dateRange, // 未使用パラメータ
  aggregationPeriod = 'daily',
  onPeriodChange,
}) => {
  const [creativeMetrics, setCreativeMetrics] = useState<CreativeMetrics[]>([])
  const [selectedType, setSelectedType] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
  const [selectedCreative, setSelectedCreative] = useState<CreativeData | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null)
  const [selectedCreativeForInsights, setSelectedCreativeForInsights] = useState<string | null>(
    null
  )

  useEffect(() => {
    // クリエイティブごとに集計
    const metricsMap = new Map<string, CreativeMetrics>()

    // 広告レベルのデータのみを処理
    const adLevelInsights = insights.filter((insight) => insight.ad_id)
    console.log(`クリエイティブ分析: ${adLevelInsights.length}件の広告レベルデータを処理`)

    // クリエイティブタイプの分布を確認
    const typeDistribution = adLevelInsights.reduce(
      (acc, insight) => {
        const type = insight.creative_type || 'text'
        acc[type] = (acc[type] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )
    console.log('クリエイティブタイプ分布:', typeDistribution)

    adLevelInsights.forEach((insight) => {
      const key = insight.creative_id || insight.ad_id || 'unknown'
      const existing = metricsMap.get(key) || {
        creative_id: key,
        creative_name: insight.creative_name || insight.ad_name || 'Unknown',
        creative_type: insight.creative_type || 'text',
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
    const metrics = Array.from(metricsMap.values()).map((m) => ({
      ...m,
      ctr: m.impressions > 0 ? (m.clicks / m.impressions) * 100 : 0,
      cpc: m.clicks > 0 ? m.spend / m.clicks : 0,
      cpa: m.conversions > 0 ? m.spend / m.conversions : 0,
      roas: m.spend > 0 ? m.conversion_value / m.spend : 0,
    }))

    setCreativeMetrics(metrics)
  }, [insights])

  const filteredMetrics =
    selectedType === 'all'
      ? creativeMetrics
      : creativeMetrics.filter((m) => m.creative_type === selectedType)

  const getCreativeIcon = (type: string) => {
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
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toFixed(0)
  }

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      minimumFractionDigits: 0,
    }).format(num)
  }

  const handleCreativeClick = (metric: CreativeMetrics) => {
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
      videoId: metric.video_id,
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
    setSelectedCreativeForInsights(metric.creative_id) // 同時に疲労度分析用のIDもセット
    setIsModalOpen(true)
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">クリエイティブパフォーマンス</h2>
          <div className="flex gap-4">
            {/* 期間選択 */}
            {onPeriodChange && (
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
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1 rounded text-sm font-medium ${
                  viewMode === 'grid'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                グリッド
              </button>
              <button
                onClick={() => setViewMode('table')}
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
                onClick={() => setSelectedType('all')}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  selectedType === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                すべて
              </button>
              <button
                onClick={() => setSelectedType('image')}
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
                onClick={() => setSelectedType('video')}
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
                onClick={() => setSelectedType('carousel')}
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
              <div
                key={metric.creative_id}
                className="relative bg-gray-50 rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => handleCreativeClick(metric)}
              >
                {/* サムネイル */}
                <div className="relative aspect-video bg-gray-200 group">
                  {metric.creative_type === 'video' && playingVideoId === metric.creative_id ? (
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
                            if (metric.video_url) {
                              setPlayingVideoId(
                                playingVideoId === metric.creative_id ? null : metric.creative_id
                              )
                            } else {
                              handleCreativeClick(metric)
                            }
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
                  {/* 疲労度インジケーター（仮実装） */}
                  {metric.ctr < 0.5 && metric.frequency && metric.frequency > 3.0 && (
                    <div className="absolute top-2 right-2">
                      <div className="bg-red-100 p-1.5 rounded-full">
                        <ExclamationTriangleIcon className="h-4 w-4 text-red-600" />
                      </div>
                    </div>
                  )}
                </div>
                {/* 情報 */}
                <div className="p-4">
                  <h4 className="text-sm font-medium text-gray-900 truncate">
                    {metric.creative_name}
                  </h4>
                  <p className="text-xs text-gray-500 mt-1 truncate">
                    {metric.campaign_name || 'キャンペーン名なし'}
                  </p>
                  {/* メトリクス - 拡張版 */}
                  <div className="mt-3 space-y-2">
                    {/* 主要指標 */}
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="text-center">
                        <p className="text-gray-500">表示</p>
                        <p className="text-gray-900 font-medium">
                          {formatNumber(metric.impressions)}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-gray-500">クリック</p>
                        <p className="text-gray-900 font-medium">{formatNumber(metric.clicks)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-gray-500">CV</p>
                        <p className="text-gray-900 font-medium">
                          {formatNumber(metric.conversions)}
                        </p>
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

                    {/* コスト指標 */}
                    <div className="grid grid-cols-3 gap-2 text-xs border-t pt-2">
                      <div className="text-center">
                        <p className="text-gray-500">CPC</p>
                        <p className="text-gray-900 font-medium">{formatCurrency(metric.cpc)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-gray-500">CPM</p>
                        <p className="text-gray-900 font-medium">
                          {metric.impressions > 0
                            ? formatCurrency((metric.spend / metric.impressions) * 1000)
                            : '¥0'}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-gray-500">CPA</p>
                        <p className="text-orange-600 font-medium">
                          {metric.conversions > 0 ? formatCurrency(metric.cpa) : '-'}
                        </p>
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
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : viewMode === 'table' ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    クリエイティブ
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    インプレッション
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    クリック数
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    CTR
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    費用
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    CPC
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    CV
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    CPA
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ROAS
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    CVR
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    CPM
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredMetrics.map((metric) => (
                  <tr
                    key={metric.creative_id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleCreativeClick(metric)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {/* サムネイル */}
                        <div className="flex-shrink-0 h-16 w-16 relative">
                          {metric.thumbnail_url || metric.creative_url ? (
                            <>
                              <img
                                src={metric.thumbnail_url || metric.creative_url}
                                alt={metric.creative_name}
                                className="h-16 w-16 object-cover rounded"
                                loading="lazy"
                                onError={(e) => {
                                  // エラー時は非表示にしてアイコンを表示
                                  e.currentTarget.style.display = 'none'
                                  const fallback = e.currentTarget.nextElementSibling
                                  if (fallback && fallback instanceof HTMLElement) {
                                    fallback.style.display = 'flex'
                                  }
                                }}
                              />
                              {/* フォールバックアイコン（初期は非表示） */}
                              <div
                                className="h-16 w-16 bg-gray-100 rounded flex items-center justify-center"
                                style={{ display: 'none' }}
                              >
                                {getCreativeIcon(metric.creative_type)}
                              </div>
                            </>
                          ) : (
                            <div className="h-16 w-16 bg-gray-100 rounded flex items-center justify-center">
                              {getCreativeIcon(metric.creative_type)}
                            </div>
                          )}
                          {/* タイプバッジ */}
                          <span className="absolute -top-1 -right-1 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-900 text-white">
                            {metric.creative_type === 'image'
                              ? '画'
                              : metric.creative_type === 'video'
                                ? '動'
                                : metric.creative_type === 'carousel'
                                  ? 'カ'
                                  : 'テ'}
                          </span>
                          {/* カルーセル枚数 */}
                          {metric.creative_type === 'carousel' && metric.carousel_cards && (
                            <span className="absolute -bottom-1 -right-1 inline-flex items-center px-1.5 py-0.5 rounded bg-blue-600 text-white text-xs font-medium">
                              {metric.carousel_cards.length}
                            </span>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {metric.creative_name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {metric.campaign_name || 'キャンペーン名なし'}
                          </div>
                          <div className="text-xs text-gray-400">ID: {metric.creative_id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      {formatNumber(metric.impressions)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      {formatNumber(metric.clicks)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      {metric.ctr.toFixed(2)}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      {formatCurrency(metric.spend)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      {formatCurrency(metric.cpc)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      {formatNumber(metric.conversions)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      {metric.conversions > 0 ? formatCurrency(metric.cpa) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      {metric.roas > 0 ? `${metric.roas.toFixed(2)}x` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      {metric.clicks > 0
                        ? `${((metric.conversions / metric.clicks) * 100).toFixed(2)}%`
                        : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      {metric.impressions > 0
                        ? formatCurrency((metric.spend / metric.impressions) * 1000)
                        : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

      {/* 詳細モーダル */}
      {selectedCreative && selectedCreativeForInsights && (
        <EnhancedCreativeDetailModal
          creative={selectedCreative}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false)
            setSelectedCreative(null)
            setSelectedCreativeForInsights(null)
          }}
          performanceHistory={insights
            .filter((insight) => insight.creative_id === selectedCreativeForInsights)
            .map((insight) => ({
              date: (insight.date_start || (insight as any).dateStart || '') as string,
              ctr: Number(insight.ctr) || 0,
              frequency: Number(insight.frequency) || 1,
              impressions: Number(insight.impressions) || 0,
              clicks: Number(insight.clicks) || 0,
              spend: Number(insight.spend) || 0,
            }))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())}
        />
      )}
    </>
  )
}
