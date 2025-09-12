import React, { Fragment, useState, useEffect, useCallback, useMemo } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { XMarkIcon, ChartBarIcon } from '@heroicons/react/24/outline'
import { FatigueData } from '@/types'
import { SimplePhoneMockup } from './SimplePhoneMockup'
import { MiniFrequencyChart } from './MiniFrequencyChart'
import { MiniMetricChart, MetricType } from './MiniMetricChart'
import { FatigueDonutChart } from './FatigueDonutChart'
import { calculateAllFatigueScores, FATIGUE_FORMULAS } from '../utils/fatigueCalculations'
import { getSafeMetrics } from '../utils/safe-data-access'
import { extractInstagramMetrics, InstagramMetricsDisplay } from './InstagramMetricsExtractor'
import {
  extractDetailedMetrics,
  calculateReliabilityScore,
} from '../utils/detailed-metrics-extractor'
import { InsightFetcher } from '../utils/insight-fetcher'
import { ComprehensiveDataTabs } from './ComprehensiveDataTabs'
import { ActionMetricsDisplay } from './ActionMetricsExtractor'

interface CreativeDetailModalProps {
  isOpen: boolean
  onClose: () => void
  item: FatigueData | any // AggregatedCreativeも受け入れる
  insight: any
  accessToken?: string // アクセストークン
  accountId?: string // アカウントID
  dateRange?: {
    // 日付範囲を追加
    start: Date | string
    end: Date | string
  }
}

interface MetricRowProps {
  label: string
  value: number | string
  unit?: string
  thresholdStatus?: 'safe' | 'warning' | 'danger'
  description?: string
  showChart?: boolean
  chartData?: Array<{ date: string; value: number }>
  chartThreshold?: number
  metricType?: MetricType
  chartType?: 'line' | 'area'
  dailyData?: Array<any> // 日別データ配列
  ranking?: 'above_average' | 'average' | 'below_average' | 'unknown'
  tooltip?: string
  dataSource?: 'api' | 'calculated' | 'estimated'
}

function MetricRow({
  label,
  value,
  unit,
  thresholdStatus,
  description,
  showChart,
  chartData,
  chartThreshold,
  metricType,
  chartType,
  dailyData,
  ranking,
  tooltip,
  dataSource,
}: MetricRowProps) {
  const formatValue = (val: number | string) => {
    if (typeof val === 'number') {
      return val.toLocaleString('ja-JP', { maximumFractionDigits: 2 })
    }
    return val
  }

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'danger':
        return 'text-red-600'
      case 'warning':
        return 'text-yellow-600'
      case 'safe':
        return 'text-green-600'
      default:
        return 'text-gray-600'
    }
  }

  return (
    <div className="py-2 border-b border-gray-100 last:border-b-0">
      <div className="flex justify-between items-center">
        <div>
          <span className="text-sm font-medium text-gray-700">{label}</span>
          {description && <p className="text-xs text-gray-500 mt-1">{description}</p>}
        </div>
        <div className="text-right">
          {!showChart && (
            <>
              <span className={`text-sm font-semibold ${getStatusColor(thresholdStatus)}`}>
                {unit === '¥' ? (
                  <>
                    {unit}
                    {formatValue(value)}
                  </>
                ) : (
                  <>
                    {formatValue(value)}
                    {unit && <span className="text-gray-400 ml-1">{unit}</span>}
                  </>
                )}
              </span>
              {thresholdStatus === 'danger' && <p className="text-xs text-red-500">危険水準</p>}
              {thresholdStatus === 'warning' && <p className="text-xs text-yellow-600">注意水準</p>}

              {/* ランキングバッジの表示 */}
              {ranking && (
                <span
                  className={`ml-2 px-2 py-1 text-xs rounded ${
                    ranking === 'above_average'
                      ? 'bg-green-100 text-green-800'
                      : ranking === 'average'
                        ? 'bg-yellow-100 text-yellow-800'
                        : ranking === 'below_average'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {ranking === 'above_average'
                    ? '↑ 平均以上'
                    : ranking === 'average'
                      ? '→ 平均'
                      : ranking === 'below_average'
                        ? '↓ 平均以下'
                        : 'データ不足'}
                </span>
              )}
            </>
          )}
          {showChart && typeof value === 'number' && (
            <span className={`text-sm font-semibold ${getStatusColor(thresholdStatus)}`}>
              {formatValue(value)}
            </span>
          )}
        </div>
      </div>
      {showChart && typeof value === 'number' && (
        <div className="mt-2 w-full">
          {metricType === 'frequency' ? (
            <MiniFrequencyChart data={chartData} currentValue={value} threshold={chartThreshold} />
          ) : metricType ? (
            <MiniMetricChart
              data={chartData}
              currentValue={value}
              metricType={metricType}
              chartType={chartType}
              dailyData={dailyData}
            />
          ) : null}
        </div>
      )}
    </div>
  )
}

export function CreativeDetailModal(props: CreativeDetailModalProps) {
  // propsを直接確認
  console.log('🚀 CreativeDetailModal - Raw props:', {
    allKeys: Object.keys(props),
    dateRangeProp: props.dateRange,
    hasDateRange: 'dateRange' in props,
    dateRangeValue: props.dateRange,
    dateRangeStringified: JSON.stringify(props.dateRange),
    propsStringified: JSON.stringify(props),
  })

  const { isOpen, onClose, item, insight, accessToken, accountId, dateRange } = props

  // デストラクチャリング後も確認
  console.log('📅 After destructuring:', {
    dateRange,
    dateRangeType: typeof dateRange,
    dateRangeValue: dateRange ? JSON.stringify(dateRange) : 'undefined/null',
  })

  // デフォルト値を設定（dateRangeがundefinedの場合の対策）
  const effectiveDateRange = useMemo(() => {
    if (dateRange && dateRange.start && dateRange.end) {
      console.log('📅 Using provided dateRange:', dateRange)
      return dateRange
    }

    // デフォルト値：過去30日間
    const defaultRange = {
      start: new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000),
      end: new Date(),
    }
    console.log('📅 Using default dateRange (last 30 days):', defaultRange)
    return defaultRange
  }, [dateRange])

  // デバッグ：受け取ったpropsと実効値を確認
  console.log('📅 CreativeDetailModal - Received props:', {
    dateRange,
    effectiveDateRange,
    hasDateRange: !!dateRange,
    dateRangeType: typeof dateRange,
    dateRangeValue: dateRange ? JSON.stringify(dateRange) : 'null/undefined',
  })

  const [activeTab, setActiveTab] = useState<'metrics' | 'platform' | 'daily' | 'raw' | 'debug'>(
    'metrics'
  )
  const [showDebugMode, setShowDebugMode] = useState(false)
  const [dailyData, setDailyData] = useState<any[]>([]) // 日別データ
  const [isLoadingDaily, setIsLoadingDaily] = useState(false) // ローディング状態
  const [dailyDataError, setDailyDataError] = useState<string | null>(null) // エラー状態

  // 統一されたデータソース（最新の日別データまたはinsight）
  const [currentInsight, setCurrentInsight] = useState<any>(null)

  // クリエイティブ情報のstate
  const [creativeInfo, setCreativeInfo] = useState<any>(null)
  const [isLoadingCreative, setIsLoadingCreative] = useState(false)

  // 日別データがあるかチェック（既存データまたは取得したデータ）
  const hasDailyData = (item.dailyData && item.dailyData.length > 0) || dailyData.length > 0

  // 日別データを取得する関数（新しいInsightFetcherを使用）
  const fetchDailyData = useCallback(async () => {
    setIsLoadingDaily(true)
    setDailyDataError(null)

    console.log('🎯 CreativeDetailModal - fetchDailyData called with:', {
      effectiveDateRange,
      adId: item.adId,
      accessToken: !!accessToken,
      accountId,
    })

    try {
      // propsから認証情報を取得
      if (!accessToken || !accountId) {
        console.warn('認証情報が指定されていません')
        setDailyDataError('認証情報が利用できません')
        return
      }

      // 日付範囲の処理（effectiveDateRangeを使用）
      let dateRange = {
        since: '',
        until: '',
      }

      if (effectiveDateRange && effectiveDateRange.start && effectiveDateRange.end) {
        // 日付をYYYY-MM-DD形式にフォーマット（ローカルタイムゾーン）
        const formatDate = (date: Date | string) => {
          const d = typeof date === 'string' ? new Date(date) : date
          const year = d.getFullYear()
          const month = String(d.getMonth() + 1).padStart(2, '0')
          const day = String(d.getDate()).padStart(2, '0')
          return `${year}-${month}-${day}`
        }

        dateRange.since = formatDate(effectiveDateRange.start)
        dateRange.until = formatDate(effectiveDateRange.end)

        console.log('🔍 API call with date range:', {
          since: dateRange.since,
          until: dateRange.until,
          startDate: new Date(effectiveDateRange.start).toLocaleDateString('ja-JP'),
          endDate: new Date(effectiveDateRange.end).toLocaleDateString('ja-JP'),
          raw: effectiveDateRange,
        })
      } else {
        // デフォルトは過去30日間
        const end = new Date()
        const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000)
        dateRange.since = start.toISOString().split('T')[0]
        dateRange.until = end.toISOString().split('T')[0]
        console.log('📅 Using default date range: last 30 days')
      }

      // InsightFetcherを使用して広告レベルのデータを取得
      const insightResponse = await InsightFetcher.fetchAdInsights({
        adId: item.adId,
        accessToken,
        dateRange,
        timeIncrement: true,
        // 品質指標も含めて全フィールドを要求（失敗したものは代替データで補完）
        fields: [
          // 基本メトリクス
          'ad_id',
          'ad_name',
          'adset_id',
          'adset_name',
          'campaign_id',
          'campaign_name',
          'impressions',
          'clicks',
          'spend',
          'reach',
          'frequency',
          'ctr',
          'cpc',
          'cpm',

          // 品質指標（取得できない場合は代替データで補完）
          'quality_ranking',
          'engagement_rate_ranking',
          'conversion_rate_ranking',

          // リンククリック詳細
          'inline_link_clicks',
          'inline_link_click_ctr',
          'unique_inline_link_clicks',
          'outbound_clicks',

          // エンゲージメント・アクション
          'actions',
          'action_values',
          'unique_actions',
          'cost_per_action_type',

          // 動画メトリクス
          'video_play_actions',
          'video_p25_watched_actions',
          'video_p50_watched_actions',
          'video_p75_watched_actions',
          'video_p100_watched_actions',

          // コンバージョン・ROAS
          'conversions',
          'conversion_values',
          'cost_per_conversion',
          'purchase_roas',
          'website_purchase_roas',

          // その他
          'unique_clicks',
          'unique_ctr',
          'website_ctr',
          'account_currency',
          'account_name',
          'date_start',
          'date_stop',
        ],
      })

      if (!insightResponse.success || !insightResponse.data) {
        // APIエラーの詳細分析
        if (insightResponse.error) {
          const errorMessage = InsightFetcher.analyzeApiError(insightResponse.error)
          console.error('❌ Meta API エラー詳細:', errorMessage)
          throw new Error(errorMessage)
        }
        throw new Error('日別データの取得に失敗しました')
      }

      // APIレスポンスの詳細分析
      console.log('✅ 広告レベルAPI成功:', {
        取得データ日数: insightResponse.data.length,
        要求フィールド数: insightResponse.requestedFields?.length || 0,
        取得フィールド数: insightResponse.returnedFields?.length || 0,
        欠損フィールド数: insightResponse.missingFields?.length || 0,
      })

      if (insightResponse.missingFields && insightResponse.missingFields.length > 0) {
        console.warn('⚠️ 取得できなかったフィールド:', insightResponse.missingFields)

        // 品質指標の状態を詳細分析
        const qualityFields = [
          'quality_ranking',
          'engagement_rate_ranking',
          'conversion_rate_ranking',
        ]
        const missingQualityFields = insightResponse.missingFields.filter((f) =>
          qualityFields.includes(f)
        )

        if (missingQualityFields.length > 0 && insightResponse.data.length > 0) {
          const firstResult = insightResponse.data[0]
          const impressions = parseInt(firstResult.impressions || '0')

          for (const field of missingQualityFields) {
            const diagnosis = InsightFetcher.diagnoseFieldUnavailability(field, impressions)
            console.log(`📊 ${field}: ${diagnosis}`)
          }
        }
      } else {
        console.log('🎉 すべてのフィールドが正常に取得されました')
      }

      // 最初の日のデータで詳細分析
      if (insightResponse.data.length > 0) {
        const firstResult = insightResponse.data[0]

        // 詳細メトリクスを抽出（代替データを含む）
        const detailedMetrics = extractDetailedMetrics(firstResult)
        const reliabilityScore = calculateReliabilityScore(detailedMetrics)

        console.log('🔍 詳細メトリクス抽出結果:', {
          信頼性スコア: `${reliabilityScore.score}/100`,
          直接データ: reliabilityScore.breakdown.directData,
          計算データ: reliabilityScore.breakdown.calculatedData,
          欠失データ: reliabilityScore.breakdown.missingData,
        })

        // 取得できた代替データを表示
        const availableAlternatives = Object.entries(detailedMetrics)
          .filter(([_, metric]) => metric.source === 'actions' || metric.source === 'calculated')
          .map(([field, metric]) => `${field}: ${metric.value} (${metric.source})`)

        if (availableAlternatives.length > 0) {
          console.log('✨ 代替データで補完できたメトリクス:', availableAlternatives)
        }

        // 品質指標の取得確認
        console.log('📊 品質指標:', {
          quality: firstResult.quality_ranking || 'N/A - 500インプレッション以上で利用可能',
          engagement: firstResult.engagement_rate_ranking || 'N/A',
          conversion: firstResult.conversion_rate_ranking || 'N/A',
        })

        // Instagram関連メトリクスの抽出結果をログ出力
        const instagramMetrics = extractInstagramMetrics(firstResult)
        console.log('📸 Instagram関連メトリクス:', instagramMetrics)

        if (instagramMetrics && Object.keys(instagramMetrics.actions).length > 0) {
          console.log('✅ Instagramアクション検出:', Object.keys(instagramMetrics.actions))
        }
      }

      // 日別データをフォーマット
      const formattedDailyData = (insightResponse.data || []).map((day: any) => {
        // コンバージョンを取得（aggregation.tsと同じロジックを使用）
        let conversions = 0

        // 1. actionsフィールドから優先順位に従って取得
        if (day.actions && Array.isArray(day.actions)) {
          // 最優先: Facebook Pixelによる購入追跡
          const fbPixelPurchase = day.actions.find(
            (action: any) => action.action_type === 'offsite_conversion.fb_pixel_purchase'
          )

          if (fbPixelPurchase) {
            // 1d_click値を優先、なければvalue値を使用
            conversions = parseInt(fbPixelPurchase['1d_click'] || fbPixelPurchase.value || '0')
          }
          // 次の優先: 通常のpurchaseアクション
          else {
            const purchaseAction = day.actions.find(
              (action: any) => action.action_type === 'purchase'
            )
            if (purchaseAction) {
              conversions = parseInt(purchaseAction['1d_click'] || purchaseAction.value || '0')
            }
          }
        }

        // 2. conversionsフィールドは使用しない（不正確な値の可能性があるため）
        // Note: conversionsフィールドは合計値が含まれている可能性があるため使用しない

        return {
          // 基本メトリクス
          date: day.date_start,
          impressions: day.impressions || 0,
          clicks: day.clicks || 0,
          spend: parseFloat(day.spend || '0'),
          reach: day.reach || 0,
          frequency: parseFloat(day.frequency || '0'),
          ctr: parseFloat(day.ctr || '0'),
          cpc: parseFloat(day.cpc || '0'),
          cpm: parseFloat(day.cpm || '0'),

          // 品質評価（新規追加）
          quality_ranking: day.quality_ranking || 'unknown',
          engagement_rate_ranking: day.engagement_rate_ranking || 'unknown',
          conversion_rate_ranking: day.conversion_rate_ranking || 'unknown',

          // コンバージョン（新規追加）
          conversions,
          conversion_values: day.conversion_values || 0,

          // リンククリック（新規追加）
          inline_link_clicks: day.inline_link_clicks || 0,
          inline_link_click_ctr: parseFloat(day.inline_link_click_ctr || '0'),
          outbound_clicks: day.outbound_clicks?.[0]?.value || 0,

          // 動画メトリクス（新規追加）
          video_play_actions: day.video_play_actions?.[0]?.value || null,
          video_p25_watched: day.video_p25_watched_actions?.[0]?.value || null,
          video_p50_watched: day.video_p50_watched_actions?.[0]?.value || null,
          video_p75_watched: day.video_p75_watched_actions?.[0]?.value || null,
          video_p100_watched: day.video_p100_watched_actions?.[0]?.value || null,

          // ROAS（新規追加）
          purchase_roas: day.purchase_roas?.[0]?.value || null,
          website_purchase_roas: day.website_purchase_roas?.[0]?.value || null,

          // 疲労度スコア
          fatigue_score: calculateFatigueScore(day),
        }
      })

      setDailyData(formattedDailyData)
      console.log('日別データ取得成功:', formattedDailyData)
    } catch (error) {
      console.error('日別データ取得エラー:', error)
      setDailyDataError(error instanceof Error ? error.message : '日別データの取得に失敗しました')
    } finally {
      setIsLoadingDaily(false)
    }
  }, [effectiveDateRange, item.adId, accessToken, accountId]) // 依存配列に含める

  // クリエイティブ情報を取得する関数
  const fetchCreativeInfo = useCallback(async () => {
    if (!accessToken || !item.adId) {
      console.warn('クリエイティブ取得に必要な情報がありません')
      return
    }

    setIsLoadingCreative(true)
    console.log('🎨 Fetching creative info for ad:', item.adId)

    try {
      const apiUrl = `https://graph.facebook.com/v23.0/${item.adId}`

      // fieldsを修正（権限エラー回避のためpage_idを追加、preview_shareable_linkも追加）
      const params = new URLSearchParams({
        access_token: accessToken,
        fields:
          'preview_shareable_link,creative{id,name,title,body,image_url,video_id,thumbnail_url,object_type,link_url,effective_object_story_id,object_story_spec{page_id,video_data{video_id,image_url,title,call_to_action},link_data{link,message,picture,call_to_action}}}',
      })

      const response = await fetch(`${apiUrl}?${params.toString()}`)
      const data = await response.json()

      if (data.error) {
        console.error('Creative fetch error:', data.error)
        return
      }

      if (data.creative) {
        // 動画IDを様々な場所から探す
        let extractedVideoId = data.creative.video_id
        let videoUrl = null
        let actualObjectType = data.creative.object_type

        // object_story_specから動画情報を取得
        if (data.creative.object_story_spec) {
          // video_dataがある場合
          if (data.creative.object_story_spec.video_data) {
            extractedVideoId =
              data.creative.object_story_spec.video_data.video_id || extractedVideoId
            // STATUSでも動画があればVIDEO扱いにする
            if (extractedVideoId) {
              actualObjectType = 'VIDEO'
            }
          }

          // page_idとvideo_idから動画URLを構築
          if (extractedVideoId && data.creative.object_story_spec.page_id) {
            // Facebook動画の標準URLフォーマット
            videoUrl = `https://www.facebook.com/${data.creative.object_story_spec.page_id}/videos/${extractedVideoId}/`
            console.log('📹 Constructed video URL:', videoUrl)
          }
        }

        // effective_object_story_idがある場合でも、権限エラーを避けるため追加取得はしない
        if (data.creative.effective_object_story_id && !extractedVideoId) {
          console.log(
            '⚠️ effective_object_story_id exists but skipping due to permissions:',
            data.creative.effective_object_story_id
          )
          // IDから動画IDを推測（最後の数字部分）
          const match = data.creative.effective_object_story_id.match(/_(\d+)$/)
          if (match) {
            extractedVideoId = match[1]
            actualObjectType = 'VIDEO'
            console.log('📹 Extracted video ID from story ID:', extractedVideoId)
          }
        }

        // クリエイティブ情報を保存（object_typeを上書き）
        const enrichedCreative = {
          ...data.creative,
          video_id: extractedVideoId,
          object_type: actualObjectType,
          preview_shareable_link: data.preview_shareable_link, // プレビューリンクを追加
          // デバッグ用の元のタイプも保存
          original_object_type: data.creative.object_type,
        }

        // 詳細なAPIレスポンスデバッグ
        console.log('📡 API Response Debug:', {
          hasPreviewLink: !!data.preview_shareable_link,
          previewLink: data.preview_shareable_link,
          previewLinkType: typeof data.preview_shareable_link,
          hasCreative: !!data.creative,
          creativeData: data.creative,
          rawResponse: data,
        })

        console.log('✅ Creative info enriched:', {
          original_type: data.creative.object_type,
          enriched_type: actualObjectType,
          video_id: extractedVideoId,
          thumbnail_url: data.creative.thumbnail_url,
          preview_shareable_link: data.preview_shareable_link,
          has_video: !!extractedVideoId,
        })

        setCreativeInfo(enrichedCreative)
      }
    } catch (error) {
      console.error('Failed to fetch creative info:', error)
    } finally {
      setIsLoadingCreative(false)
    }
  }, [accessToken, item.adId])

  // モーダルが開かれた時に日別データとクリエイティブ情報を取得
  useEffect(() => {
    if (isOpen && item.adId && accessToken && accountId) {
      console.log(
        '📍 useEffect calling fetchDailyData with effectiveDateRange:',
        effectiveDateRange
      )
      fetchDailyData()
      fetchCreativeInfo()
    }
  }, [isOpen, fetchDailyData, fetchCreativeInfo]) // fetchDailyData, fetchCreativeInfoを依存配列に

  // dailyDataが更新されたらcurrentInsightを更新
  useEffect(() => {
    if (dailyData.length > 0) {
      // 最新のデータ（最後の日のデータ）を使用
      const latestData = dailyData[dailyData.length - 1]
      setCurrentInsight(latestData)
      console.log('📊 currentInsight updated from dailyData:', {
        quality_ranking: latestData.quality_ranking,
        engagement_rate_ranking: latestData.engagement_rate_ranking,
        conversion_rate_ranking: latestData.conversion_rate_ranking,
        actions: latestData.actions,
        hasActions: !!latestData.actions && latestData.actions.length > 0,
      })
    } else if (insight) {
      // dailyDataがない場合はinsightを使用
      setCurrentInsight(insight)
      console.log('📊 currentInsight updated from insight prop:', {
        quality_ranking: insight.quality_ranking,
        hasActions: !!insight.actions,
      })
    }
  }, [dailyData, insight])

  // 疲労度スコアを計算する関数
  const calculateFatigueScore = (day: any) => {
    const scores = calculateAllFatigueScores({
      ctr: parseFloat(day.ctr || '0'),
      frequency: parseFloat(day.frequency || '0'),
      cpm: parseFloat(day.cpm || '0'),
    })
    return scores.overallScore
  }

  // 疲労度スコアを計算
  const fatigueScores = calculateAllFatigueScores({
    ctr: item.metrics.ctr || 0,
    frequency: item.metrics.frequency || 0,
    cpm: item.metrics.cpm || 0,
  })

  // 時系列データの抽出と処理
  const timeSeriesData = React.useMemo(() => {
    if (!insight) {
      console.log('[TimeSeriesData] No insight data available')
      return { hasData: false, chartData: [], summary: null }
    }

    try {
      // time_incrementで取得されたデータは、各insightが日別データを表している
      console.log('[TimeSeriesData] Processing insight:', {
        ad_id: insight.ad_id,
        date_start: insight.date_start,
        date_stop: insight.date_stop,
        impressions: insight.impressions,
        ctr: insight.ctr,
        cpm: insight.cpm,
        frequency: insight.frequency,
      })

      // 単一の時系列ポイントとして処理
      const chartData = [
        {
          date: insight.date_start || new Date().toISOString().split('T')[0],
          ctr: insight.ctr || 0,
          cpm: insight.cpm || 0,
          frequency: insight.frequency || 0,
          spend: insight.spend || 0,
          impressions: insight.impressions || 0,
          clicks: insight.clicks || 0,
          conversions: insight.conversions || 0,
        },
      ]

      const summary = {
        totalDays: 1,
        avgCTR: insight.ctr || 0,
        avgCPM: insight.cpm || 0,
        avgFrequency: insight.frequency || 0,
        totalSpend: insight.spend || 0,
      }

      return { hasData: true, chartData, summary }
    } catch (error) {
      console.error('[TimeSeriesData] Error processing data:', error)
      return { hasData: false, chartData: [], summary: null }
    }
  }, [insight])

  // プラットフォーム別データを処理（レガシー）
  React.useMemo(() => {
    console.log('[CreativeDetailModal] Processing platform data:', { item, insight })

    // insightがない場合はサンプルデータを返す
    if (!insight || !insight.breakdowns) {
      return {
        chartData: [
          { date: '2025-01-01', facebook: 2.5, instagram: 3.2, audience_network: 1.8 },
          { date: '2025-01-02', facebook: 2.7, instagram: 3.5, audience_network: 2.0 },
          { date: '2025-01-03', facebook: 2.3, instagram: 3.8, audience_network: 1.9 },
          { date: '2025-01-04', facebook: 2.9, instagram: 3.3, audience_network: 2.1 },
          { date: '2025-01-05', facebook: 3.1, instagram: 3.6, audience_network: 2.3 },
        ],
        stats: {
          facebook: 2.9,
          instagram: 3.5,
          audience_network: 2.0,
        },
      }
    }

    // 実データからプラットフォーム別データを抽出
    try {
      const { publisher_platform } = insight.breakdowns

      // 時系列データの生成（現在は単一ポイント）
      const chartData = [
        {
          date: new Date().toISOString().split('T')[0],
          facebook: publisher_platform?.facebook?.ctr || 0,
          instagram: publisher_platform?.instagram?.ctr || 0,
          audience_network: publisher_platform?.audience_network?.ctr || 0,
        },
      ]

      const stats = {
        facebook: publisher_platform?.facebook?.ctr || 0,
        instagram: publisher_platform?.instagram?.ctr || 0,
        audience_network: publisher_platform?.audience_network?.ctr || 0,
      }

      console.log('[CreativeDetailModal] Extracted platform data:', { chartData, stats })

      return { chartData, stats }
    } catch (error) {
      console.error('[CreativeDetailModal] Error processing platform data:', error)
      // エラー時はサンプルデータを返す
      return {
        chartData: [
          { date: '2025-01-01', facebook: 2.5, instagram: 3.2, audience_network: 1.8 },
          { date: '2025-01-02', facebook: 2.7, instagram: 3.5, audience_network: 2.0 },
          { date: '2025-01-03', facebook: 2.3, instagram: 3.8, audience_network: 1.9 },
          { date: '2025-01-04', facebook: 2.9, instagram: 3.3, audience_network: 2.1 },
          { date: '2025-01-05', facebook: 3.1, instagram: 3.6, audience_network: 2.3 },
        ],
        stats: {
          facebook: 2.9,
          instagram: 3.5,
          audience_network: 2.0,
        },
      }
    }
  }, [item, insight])

  // Helper functions for threshold checking
  const getFrequencyStatus = (frequency: number) => {
    if (frequency > 3.5) return 'danger'
    if (frequency > 2.8) return 'warning'
    return 'safe'
  }

  const getCtrStatus = (ctr: number, baseline: number = 2.0) => {
    const decline = ((baseline - ctr) / baseline) * 100
    if (decline >= 25) return 'danger'
    if (decline >= 15) return 'warning'
    return 'safe'
  }

  const getCpmStatus = (cpm: number, baseline: number = 30) => {
    const increase = ((cpm - baseline) / baseline) * 100
    if (increase >= 20) return 'danger'
    if (increase >= 10) return 'warning'
    return 'safe'
  }

  return (
    <Transition appear show={isOpen} as={Fragment}>
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
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-[80vw] transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all mx-4">
                {/* Modal Header */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                      クリエイティブ詳細分析
                    </Dialog.Title>
                    <p className="mt-1 text-sm text-gray-500">
                      {item.adName} (ID: {item.adId})
                    </p>
                  </div>
                  <button
                    type="button"
                    className="inline-flex justify-center rounded-md border border-transparent bg-gray-100 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2"
                    onClick={onClose}
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>

                {/* Tab Navigation */}
                <div className="border-b border-gray-200 mb-4">
                  <nav className="-mb-px flex space-x-8">
                    <button
                      onClick={() => setActiveTab('metrics')}
                      className={`${
                        activeTab === 'metrics'
                          ? 'border-indigo-500 text-indigo-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
                    >
                      パフォーマンス指標
                    </button>
                    <button
                      onClick={() => setActiveTab('daily')}
                      className={`${
                        activeTab === 'daily'
                          ? 'border-indigo-500 text-indigo-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
                    >
                      <ChartBarIcon className="h-4 w-4" />
                      日別推移
                      {isLoadingDaily ? (
                        <span className="text-xs">（取得中...）</span>
                      ) : (
                        <span>
                          （{dailyData.length > 0 ? dailyData.length : item.dayCount || 0}日間）
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => setActiveTab('raw')}
                      className={`${
                        activeTab === 'raw'
                          ? 'border-indigo-500 text-indigo-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
                        />
                      </svg>
                      生データ（全フィールド）
                    </button>
                    <button
                      onClick={() => setActiveTab('debug')}
                      className={`${
                        activeTab === 'debug'
                          ? 'border-indigo-500 text-indigo-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                        />
                      </svg>
                      API完全データ
                    </button>
                  </nav>
                </div>

                {/* Content - Conditional based on active tab */}
                {activeTab === 'daily' ? (
                  // 日別データテーブル
                  isLoadingDaily ? (
                    // ローディング中の表示
                    <div className="flex items-center justify-center h-96">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                          日別データを取得中...
                        </h3>
                        <p className="text-sm text-gray-500">
                          time_increment=1で過去30日間のデータを取得しています
                        </p>
                      </div>
                    </div>
                  ) : dailyDataError ? (
                    // エラーの表示
                    <div className="flex items-center justify-center h-96">
                      <div className="text-center">
                        <div className="text-red-500 mb-4">
                          <svg
                            className="mx-auto h-12 w-12"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">データ取得エラー</h3>
                        <p className="text-sm text-red-600">{dailyDataError}</p>
                      </div>
                    </div>
                  ) : hasDailyData ? (
                    <div className="overflow-x-auto">
                      <div className="mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">
                          日別パフォーマンス推移
                          {dailyData.length > 0 && (
                            <span className="ml-2 text-sm text-green-600">
                              (取得成功: {dailyData.length}日分)
                            </span>
                          )}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {dailyData.length > 0
                            ? `${dailyData[0].date} 〜 ${dailyData[dailyData.length - 1].date}（${dailyData.length}日間）`
                            : `${item.firstDate || '-'} 〜 ${item.lastDate || '-'}（${item.dayCount || 0}日間）`}
                        </p>
                        {effectiveDateRange && (
                          <p className="text-xs text-gray-500 mt-1">
                            指定期間:{' '}
                            {new Date(effectiveDateRange.start).toLocaleDateString('ja-JP')} 〜{' '}
                            {new Date(effectiveDateRange.end).toLocaleDateString('ja-JP')}
                          </p>
                        )}
                      </div>

                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              日付
                            </th>
                            <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              表示回数
                            </th>
                            <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              クリック
                            </th>
                            <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              CTR
                            </th>
                            <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              CPM
                            </th>
                            <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              CPC
                            </th>
                            <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              消化金額
                            </th>
                            <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              CV
                            </th>
                            <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              疲労度
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {/* 合計行 */}
                          <tr className="bg-blue-50 font-semibold">
                            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                              合計
                            </td>
                            <td className="px-3 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                              {(dailyData.length > 0 ? dailyData : item.dailyData || [])
                                .reduce(
                                  (sum: number, day: any) => sum + Number(day.impressions || 0),
                                  0
                                )
                                .toLocaleString()}
                            </td>
                            <td className="px-3 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                              {(dailyData.length > 0 ? dailyData : item.dailyData || [])
                                .reduce((sum: number, day: any) => sum + Number(day.clicks || 0), 0)
                                .toLocaleString()}
                            </td>
                            <td className="px-3 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                              {(() => {
                                const data = dailyData.length > 0 ? dailyData : item.dailyData || []
                                const totalClicks = data.reduce(
                                  (sum: number, day: any) => sum + Number(day.clicks || 0),
                                  0
                                )
                                const totalImpressions = data.reduce(
                                  (sum: number, day: any) => sum + Number(day.impressions || 0),
                                  0
                                )
                                return totalImpressions > 0
                                  ? ((totalClicks / totalImpressions) * 100).toFixed(2)
                                  : '0.00'
                              })()}
                              %
                            </td>
                            <td className="px-3 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                              ¥
                              {(() => {
                                const data = dailyData.length > 0 ? dailyData : item.dailyData || []
                                const totalSpend = data.reduce(
                                  (sum: number, day: any) => sum + Number(day.spend || 0),
                                  0
                                )
                                const totalImpressions = data.reduce(
                                  (sum: number, day: any) => sum + Number(day.impressions || 0),
                                  0
                                )
                                return totalImpressions > 0
                                  ? Math.round((totalSpend / totalImpressions) * 1000)
                                  : 0
                              })()}
                            </td>
                            <td className="px-3 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                              ¥
                              {(() => {
                                const data = dailyData.length > 0 ? dailyData : item.dailyData || []
                                const totalSpend = data.reduce(
                                  (sum: number, day: any) => sum + Number(day.spend || 0),
                                  0
                                )
                                const totalClicks = data.reduce(
                                  (sum: number, day: any) => sum + Number(day.clicks || 0),
                                  0
                                )
                                return totalClicks > 0 ? Math.round(totalSpend / totalClicks) : 0
                              })()}
                            </td>
                            <td className="px-3 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                              ¥
                              {(dailyData.length > 0 ? dailyData : item.dailyData || [])
                                .reduce((sum: number, day: any) => sum + Number(day.spend || 0), 0)
                                .toLocaleString()}
                            </td>
                            <td className="px-3 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                              {(dailyData.length > 0 ? dailyData : item.dailyData || []).reduce(
                                (sum: number, day: any) => sum + Number(day.conversions || 0),
                                0
                              )}
                            </td>
                            <td className="px-3 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                              -
                            </td>
                          </tr>

                          {/* 各日付の行 */}
                          {(dailyData.length > 0 ? dailyData : item.dailyData || []).map(
                            (day: any, index: number) => (
                              <tr key={index} className="hover:bg-gray-50">
                                <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {day.date}
                                </td>
                                <td className="px-3 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                                  {day.impressions.toLocaleString()}
                                </td>
                                <td className="px-3 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                                  {day.clicks.toLocaleString()}
                                </td>
                                <td className="px-3 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                                  {day.ctr.toFixed(2)}%
                                </td>
                                <td className="px-3 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                                  ¥{day.cpm.toFixed(0)}
                                </td>
                                <td className="px-3 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                                  ¥{day.cpc.toFixed(0)}
                                </td>
                                <td className="px-3 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                                  ¥{day.spend.toLocaleString()}
                                </td>
                                <td className="px-3 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                                  {day.conversions}
                                </td>
                                <td className="px-3 py-4 whitespace-nowrap text-sm text-right">
                                  <span
                                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                      day.fatigue_score >= 70
                                        ? 'bg-red-100 text-red-800'
                                        : day.fatigue_score >= 40
                                          ? 'bg-yellow-100 text-yellow-800'
                                          : 'bg-green-100 text-green-800'
                                    }`}
                                  >
                                    {day.fatigue_score.toFixed(0)}
                                  </span>
                                </td>
                              </tr>
                            )
                          )}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    // データがない場合の表示
                    <div className="flex items-center justify-center h-96">
                      <div className="text-center">
                        <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                          日別データはありません
                        </h3>
                        <p className="text-sm text-gray-500">
                          このクリエイティブの日別パフォーマンスデータは取得されていません
                        </p>
                      </div>
                    </div>
                  )
                ) : activeTab === 'metrics' ? (
                  <div className="grid grid-cols-3 gap-6">
                    {/* Left Column - Fatigue Analysis with Donut Charts */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h5 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">
                        広告疲労度分析
                      </h5>

                      {/* 総合疲労度スコア */}
                      <div className="flex justify-center mb-4">
                        <FatigueDonutChart
                          value={fatigueScores.overallScore}
                          label="総合疲労度スコア"
                          description=""
                          formula="(クリエイティブ疲労 + 視聴者疲労 + アルゴリズム疲労) / 3"
                          currentValue={`現在の総合スコア: ${fatigueScores.overallScore}`}
                          size={200}
                        />
                      </div>

                      {/* 個別疲労度スコア */}
                      <div className="grid grid-cols-3 gap-2">
                        <FatigueDonutChart
                          value={fatigueScores.creativeFatigue}
                          label="クリエイティブの疲労"
                          description=""
                          formula={FATIGUE_FORMULAS.creative}
                          currentValue={`CTR: ${item.metrics.ctr?.toFixed(2) || 0}%`}
                          size={120}
                        />

                        <FatigueDonutChart
                          value={fatigueScores.audienceFatigue}
                          label="視聴者側の疲労"
                          description=""
                          formula={FATIGUE_FORMULAS.audience}
                          currentValue={`Frequency: ${item.metrics.frequency?.toFixed(2) || 0}`}
                          size={120}
                        />

                        <FatigueDonutChart
                          value={fatigueScores.algorithmFatigue}
                          label="アルゴリズムの疲労"
                          description=""
                          formula={FATIGUE_FORMULAS.algorithm}
                          currentValue={`CPM: ¥${Math.round(item.metrics.cpm || 0)}`}
                          size={120}
                        />
                      </div>
                    </div>

                    {/* Middle Column - Basic Metrics */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h5 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">
                        基本指標
                      </h5>

                      <MetricRow
                        label="広告費用"
                        value={item.metrics.spend}
                        unit="¥"
                        description="Meta APIから取得"
                        showChart={true}
                        metricType="spend"
                        chartType="area"
                        dailyData={dailyData.length > 0 ? dailyData : item.dailyData}
                      />

                      <MetricRow
                        label="インプレッション"
                        value={item.metrics.impressions}
                        description="表示回数"
                        showChart={true}
                        metricType="impressions"
                        chartType="area"
                        dailyData={dailyData.length > 0 ? dailyData : item.dailyData}
                      />

                      <MetricRow
                        label="Frequency"
                        value={item.metrics.frequency}
                        thresholdStatus={getFrequencyStatus(item.metrics.frequency)}
                        description="3.5を超えると危険水準"
                        showChart={true}
                        chartThreshold={3.5}
                        metricType="frequency"
                        dailyData={dailyData.length > 0 ? dailyData : item.dailyData}
                      />

                      <MetricRow
                        label="クリック数"
                        value={item.metrics.clicks}
                        description="Meta APIから取得"
                      />

                      <MetricRow
                        label="コンバージョン（CV）"
                        value={item.metrics.conversions || 0}
                        description="購入・申込などの成果"
                        showChart={true}
                        metricType="conversions"
                        chartType="line"
                        dailyData={(() => {
                          const data = dailyData.length > 0 ? dailyData : item.dailyData
                          // デバッグ: 最初のデータ確認
                          if (data && data.length > 0) {
                            console.log('🎯 Conversion MetricRow - First day data:', data[0])
                            console.log('🎯 Conversion MetricRow - Total days:', data.length)
                            console.log(
                              '🎯 Conversion MetricRow - Current value:',
                              item.metrics.conversions
                            )
                          }
                          return data
                        })()}
                      />

                      <MetricRow
                        label="ファーストCV（F-CV）"
                        value="N/A"
                        description="初回コンバージョン"
                      />

                      <MetricRow
                        label="CTR（クリック率）"
                        value={item.metrics.ctr}
                        unit="%"
                        thresholdStatus={getCtrStatus(item.metrics.ctr)}
                        description="ベースラインから25%以上低下で危険水準"
                        showChart={true}
                        metricType="ctr"
                        chartType="line"
                        dailyData={dailyData.length > 0 ? dailyData : item.dailyData}
                      />

                      <MetricRow
                        label="Unique CTR"
                        value={item.metrics.unique_ctr}
                        unit="%"
                        thresholdStatus={getCtrStatus(item.metrics.unique_ctr)}
                        description="ユニークユーザーのCTR"
                      />

                      <MetricRow
                        label="CPC（クリック単価）"
                        value={item.metrics.cpc}
                        unit="¥"
                        description="Meta APIから取得"
                      />

                      <MetricRow
                        label="CPM（1000インプレッション単価）"
                        value={Math.ceil(item.metrics.cpm)}
                        unit="¥"
                        thresholdStatus={getCpmStatus(item.metrics.cpm)}
                        description="20%以上上昇かつCTR低下で危険水準"
                        showChart={true}
                        metricType="cpm"
                        chartType="line"
                        dailyData={dailyData.length > 0 ? dailyData : item.dailyData}
                      />

                      <MetricRow
                        label="CPA（獲得単価）"
                        value={
                          (item.metrics.conversions || 0) > 0
                            ? Math.ceil(item.metrics.spend / (item.metrics.conversions || 1))
                            : 0
                        }
                        unit="¥"
                        description="1件あたりの獲得コスト"
                      />
                    </div>

                    {/* Right Column - Smartphone Mockup */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h6 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">
                        広告プレビュー（モックアップ）
                      </h6>
                      <div className="flex justify-center">
                        <SimplePhoneMockup
                          mediaType={
                            creativeInfo?.object_type ||
                            currentInsight?.creative_media_type ||
                            insight?.creative_media_type
                          }
                          thumbnailUrl={
                            creativeInfo?.thumbnail_url ||
                            currentInsight?.thumbnail_url ||
                            insight?.thumbnail_url
                          }
                          videoUrl={undefined}
                          videoId={
                            creativeInfo?.video_id || currentInsight?.video_id || insight?.video_id
                          }
                          imageUrl={
                            creativeInfo?.image_url ||
                            currentInsight?.image_url ||
                            insight?.image_url
                          }
                          objectType={creativeInfo?.object_type}
                          title={creativeInfo?.title || currentInsight?.title || insight?.title}
                          body={creativeInfo?.body || currentInsight?.body || insight?.body}
                          instagramPermalinkUrl={
                            creativeInfo?.instagram_permalink_url ||
                            currentInsight?.instagram_permalink_url ||
                            insight?.instagram_permalink_url
                          }
                          platform={item.metrics.instagram_metrics?.publisher_platform}
                          creativeName={item.adName}
                          adId={item.adId}
                          accountId={accountId}
                          creativeId={creativeInfo?.id}
                          creativeNameFull={creativeInfo?.name}
                          previewShareableLink={creativeInfo?.preview_shareable_link}
                        />
                      </div>
                    </div>

                    {/* 品質指標 */}
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <h3 className="font-semibold text-gray-900 mb-3">品質評価</h3>
                      <div className="space-y-2">
                        <MetricRow
                          label="品質ランキング"
                          value={currentInsight?.quality_ranking || 'N/A'}
                          ranking={currentInsight?.quality_ranking}
                          tooltip="他の広告と比較した広告の品質"
                          dataSource={currentInsight?.quality_ranking ? 'api' : 'estimated'}
                        />
                        <MetricRow
                          label="エンゲージメント率"
                          value={currentInsight?.engagement_rate_ranking || 'N/A'}
                          ranking={currentInsight?.engagement_rate_ranking}
                          dataSource={currentInsight?.engagement_rate_ranking ? 'api' : 'estimated'}
                        />
                        <MetricRow
                          label="コンバージョン率"
                          value={currentInsight?.conversion_rate_ranking || 'N/A'}
                          ranking={currentInsight?.conversion_rate_ranking}
                          dataSource={currentInsight?.conversion_rate_ranking ? 'api' : 'estimated'}
                        />
                      </div>
                      {/* 品質指標が取得できない場合の説明 */}
                      {(!currentInsight?.quality_ranking ||
                        currentInsight?.quality_ranking === 'unknown') && (
                        <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                          <p className="text-yellow-800">
                            ⚠️ 品質指標はインプレッションが500以上で利用可能になります
                          </p>
                        </div>
                      )}
                    </div>

                    {/* デバッグ情報（開発環境のみ） */}
                    {process.env.NODE_ENV === 'development' && (
                      <div className="col-span-3 bg-gray-100 rounded-lg p-3 text-xs mt-4">
                        <h4 className="font-semibold mb-2">🔍 デバッグ情報</h4>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <span className="text-gray-600">insight exists:</span>
                            <span className="ml-2 font-mono">{String(!!insight)}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">currentInsight exists:</span>
                            <span className="ml-2 font-mono">{String(!!currentInsight)}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">dailyData length:</span>
                            <span className="ml-2 font-mono">{dailyData.length}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">quality_ranking:</span>
                            <span className="ml-2 font-mono">
                              {currentInsight?.quality_ranking || 'N/A'}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600">has actions:</span>
                            <span className="ml-2 font-mono">
                              {String(!!(currentInsight?.actions || item.actions))}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600">impressions:</span>
                            <span className="ml-2 font-mono">
                              {currentInsight?.impressions || item.metrics?.impressions || 'N/A'}
                            </span>
                          </div>
                        </div>
                        {currentInsight?.quality_ranking === 'unknown' && (
                          <div className="mt-2 p-2 bg-yellow-100 border border-yellow-300 rounded">
                            <p className="text-yellow-800">
                              品質指標が「unknown」です。インプレッション数が
                              {currentInsight?.impressions || 0}で、 500未満の可能性があります。
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* アクション分析 - 3カラム幅で表示 */}
                    {(currentInsight?.actions || item.actions) && (
                      <div className="col-span-3 mt-4">
                        <ActionMetricsDisplay
                          actions={currentInsight?.actions || item.actions}
                          costPerAction={
                            currentInsight?.cost_per_action_type || item.cost_per_action_type
                          }
                        />
                      </div>
                    )}
                  </div>
                ) : activeTab === 'raw' ? (
                  /* Raw Data Tab - 生データの完全表示 */
                  <div className="space-y-6">
                    {/* フィールド説明テーブル - 最優先で表示 */}
                    <div className="bg-white rounded-lg border border-indigo-200 p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        主要フィールドの詳細説明
                        <span className="ml-2 text-xs text-blue-500 font-normal">
                          Meta Ads API Documentation
                        </span>
                      </h3>
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-300">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                項目名
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                説明
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                データ型
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                現在値
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {/* ===== 基本情報 ===== */}
                            <tr className="bg-gray-100">
                              <td colSpan={4} className="px-4 py-2 font-bold text-sm text-gray-700">
                                📋 基本情報
                              </td>
                            </tr>
                            <tr className="hover:bg-gray-50">
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                ad_id / adId
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-600">
                                広告の一意識別子。広告を特定するための固有ID
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-500">string</td>
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                {item.adId || insight?.ad_id || 'N/A'}
                              </td>
                            </tr>
                            <tr className="hover:bg-gray-50">
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                ad_name / adName
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-600">
                                広告の名称。管理画面で設定した広告名
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-500">string</td>
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                {item.adName || insight?.ad_name || 'N/A'}
                              </td>
                            </tr>
                            <tr className="hover:bg-gray-50">
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                adset_id
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-600">
                                広告セットID。この広告が属する広告セットの識別子
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-500">string</td>
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                {insight?.adset_id || 'N/A'}
                              </td>
                            </tr>
                            <tr className="hover:bg-gray-50">
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                adset_name
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-600">
                                広告セット名。ターゲティングや予算設定の単位
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-500">string</td>
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                {insight?.adset_name || 'N/A'}
                              </td>
                            </tr>
                            <tr className="hover:bg-gray-50">
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                campaign_id
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-600">
                                キャンペーンID。最上位の広告グループ識別子
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-500">string</td>
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                {insight?.campaign_id || 'N/A'}
                              </td>
                            </tr>
                            <tr className="hover:bg-gray-50">
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                campaign_name
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-600">
                                キャンペーン名。広告の目的やビジネス目標を表す
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-500">string</td>
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                {item.campaignName || insight?.campaign_name || 'N/A'}
                              </td>
                            </tr>
                            <tr className="hover:bg-gray-50">
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">status</td>
                              <td className="px-4 py-2 text-sm text-gray-600">
                                広告のステータス（ACTIVE、PAUSED、DELETED、ARCHIVED等）
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-500">string</td>
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                {item.status || insight?.status || 'N/A'}
                              </td>
                            </tr>
                            <tr className="bg-gray-100">
                              <td colSpan={4} className="px-4 py-2 font-bold text-sm text-gray-700">
                                📊 パフォーマンス指標
                              </td>
                            </tr>
                            <tr className="hover:bg-gray-50">
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                impressions
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-600">
                                広告の表示回数。広告がユーザーの画面に表示された総回数
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-500">number</td>
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                {item.metrics?.impressions?.toLocaleString() || 'N/A'}
                              </td>
                            </tr>
                            <tr className="hover:bg-gray-50">
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">reach</td>
                              <td className="px-4 py-2 text-sm text-gray-600">
                                リーチ数。広告を少なくとも1回見たユニークユーザー数
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-500">number</td>
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                {item.reach?.toLocaleString() ||
                                  insight?.reach?.toLocaleString() ||
                                  'N/A'}
                              </td>
                            </tr>
                            <tr className="hover:bg-gray-50">
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                frequency
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-600">
                                フリークエンシー。1人あたりの平均表示回数（impressions ÷ reach）
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-500">number</td>
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                {item.metrics?.frequency?.toFixed(2) || 'N/A'}
                              </td>
                            </tr>
                            <tr className="hover:bg-gray-50">
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">clicks</td>
                              <td className="px-4 py-2 text-sm text-gray-600">
                                クリック数。広告がクリックされた総回数
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-500">number</td>
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                {item.clicks?.toLocaleString() || 'N/A'}
                              </td>
                            </tr>
                            <tr className="hover:bg-gray-50">
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">ctr</td>
                              <td className="px-4 py-2 text-sm text-gray-600">
                                クリック率。表示回数に対するクリック数の割合（clicks ÷ impressions ×
                                100）
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-500">number</td>
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                {item.metrics?.ctr?.toFixed(2) || 'N/A'}%
                              </td>
                            </tr>
                            <tr className="hover:bg-gray-50">
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                unique_ctr
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-600">
                                ユニークCTR。ユニークユーザーのCTR
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-500">number</td>
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                {item.unique_ctr?.toFixed(2) ||
                                  insight?.unique_ctr?.toFixed(2) ||
                                  'N/A'}
                                %
                              </td>
                            </tr>
                            <tr className="bg-gray-100">
                              <td colSpan={4} className="px-4 py-2 font-bold text-sm text-gray-700">
                                💰 コスト指標
                              </td>
                            </tr>
                            <tr className="hover:bg-gray-50">
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">spend</td>
                              <td className="px-4 py-2 text-sm text-gray-600">
                                消化金額。広告に費やされた総額（円）
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-500">number</td>
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                ¥{item.metrics?.spend?.toLocaleString() || 'N/A'}
                              </td>
                            </tr>
                            <tr className="hover:bg-gray-50">
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">cpc</td>
                              <td className="px-4 py-2 text-sm text-gray-600">
                                クリック単価。1クリックあたりの平均コスト（spend ÷ clicks）
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-500">number</td>
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                ¥{item.cpc?.toFixed(0) || 'N/A'}
                              </td>
                            </tr>
                            <tr className="hover:bg-gray-50">
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">cpm</td>
                              <td className="px-4 py-2 text-sm text-gray-600">
                                CPM（Cost Per Mille）。1000インプレッションあたりのコスト
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-500">number</td>
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                ¥{item.metrics?.cpm?.toFixed(2) || 'N/A'}
                              </td>
                            </tr>
                            <tr className="hover:bg-gray-50">
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                cost_per_conversion
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-600">
                                CPA。1コンバージョンあたりの平均コスト
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-500">number</td>
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                ¥{item.cost_per_conversion?.toFixed(0) || 'N/A'}
                              </td>
                            </tr>
                            <tr className="bg-gray-100">
                              <td colSpan={4} className="px-4 py-2 font-bold text-sm text-gray-700">
                                🎯 コンバージョン
                              </td>
                            </tr>
                            <tr className="hover:bg-gray-50">
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                conversions
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-600">コンバージョン数</td>
                              <td className="px-4 py-2 text-sm text-gray-500">number</td>
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                {item.metrics?.conversions || 'N/A'}
                              </td>
                            </tr>
                            <tr className="bg-gray-100">
                              <td colSpan={4} className="px-4 py-2 font-bold text-sm text-gray-700">
                                ⭐ 品質指標
                              </td>
                            </tr>
                            <tr className="hover:bg-gray-50">
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                quality_ranking
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-600">
                                品質ランキング（500imp以上で利用可）
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-500">string</td>
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                {dailyData.length > 0 && dailyData[0].quality_ranking
                                  ? dailyData[0].quality_ranking
                                  : 'N/A'}
                              </td>
                            </tr>
                            <tr className="hover:bg-gray-50">
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                engagement_rate_ranking
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-600">
                                エンゲージメント率ランキング
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-500">string</td>
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                {dailyData.length > 0 && dailyData[0].engagement_rate_ranking
                                  ? dailyData[0].engagement_rate_ranking
                                  : 'N/A'}
                              </td>
                            </tr>
                            <tr className="hover:bg-gray-50">
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                conversion_rate_ranking
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-600">
                                コンバージョン率ランキング
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-500">string</td>
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                {dailyData.length > 0 && dailyData[0].conversion_rate_ranking
                                  ? dailyData[0].conversion_rate_ranking
                                  : 'N/A'}
                              </td>
                            </tr>
                            {/* ===== 動画メトリクス ===== */}
                            <tr className="bg-gray-100">
                              <td colSpan={4} className="px-4 py-2 font-bold text-sm text-gray-700">
                                🎬 動画メトリクス
                              </td>
                            </tr>
                            <tr className="hover:bg-gray-50">
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                video_play_actions
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-600">
                                動画再生アクション数（自動再生含む）
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-500">array</td>
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                {dailyData.length > 0 && dailyData[0].video_play_actions
                                  ? JSON.stringify(dailyData[0].video_play_actions)
                                  : 'N/A'}
                              </td>
                            </tr>
                            <tr className="hover:bg-gray-50">
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                video_p25_watched_actions
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-600">
                                25%視聴完了アクション
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-500">array</td>
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                {dailyData.length > 0 && dailyData[0].video_p25_watched_actions
                                  ? JSON.stringify(dailyData[0].video_p25_watched_actions)
                                  : 'N/A'}
                              </td>
                            </tr>
                            <tr className="hover:bg-gray-50">
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                video_p50_watched_actions
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-600">
                                50%視聴完了アクション
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-500">array</td>
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                {dailyData.length > 0 && dailyData[0].video_p50_watched_actions
                                  ? JSON.stringify(dailyData[0].video_p50_watched_actions)
                                  : 'N/A'}
                              </td>
                            </tr>
                            <tr className="hover:bg-gray-50">
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                video_p75_watched_actions
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-600">
                                75%視聴完了アクション
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-500">array</td>
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                {dailyData.length > 0 && dailyData[0].video_p75_watched_actions
                                  ? JSON.stringify(dailyData[0].video_p75_watched_actions)
                                  : 'N/A'}
                              </td>
                            </tr>
                            <tr className="hover:bg-gray-50">
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                video_p95_watched_actions
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-600">
                                95%視聴完了アクション
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-500">array</td>
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                {dailyData.length > 0 && dailyData[0].video_p95_watched_actions
                                  ? JSON.stringify(dailyData[0].video_p95_watched_actions)
                                  : 'N/A'}
                              </td>
                            </tr>
                            <tr className="hover:bg-gray-50">
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                video_p100_watched_actions
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-600">
                                100%視聴完了アクション
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-500">array</td>
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                {dailyData.length > 0 && dailyData[0].video_p100_watched_actions
                                  ? JSON.stringify(dailyData[0].video_p100_watched_actions)
                                  : 'N/A'}
                              </td>
                            </tr>
                            <tr className="hover:bg-gray-50">
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                video_avg_time_watched_actions
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-600">
                                平均視聴時間（秒）
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-500">array</td>
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                {dailyData.length > 0 && dailyData[0].video_avg_time_watched_actions
                                  ? JSON.stringify(dailyData[0].video_avg_time_watched_actions)
                                  : 'N/A'}
                              </td>
                            </tr>
                            <tr className="hover:bg-gray-50">
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                video_thruplay_watched_actions
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-600">
                                ThruPlay視聴（15秒以上または完全視聴）
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-500">array</td>
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                {dailyData.length > 0 && dailyData[0].video_thruplay_watched_actions
                                  ? JSON.stringify(dailyData[0].video_thruplay_watched_actions)
                                  : 'N/A'}
                              </td>
                            </tr>
                            {/* ===== ROAS・購買メトリクス ===== */}
                            <tr className="bg-gray-100">
                              <td colSpan={4} className="px-4 py-2 font-bold text-sm text-gray-700">
                                💰 ROAS・購買メトリクス
                              </td>
                            </tr>
                            <tr className="hover:bg-gray-50">
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                purchase_roas
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-600">
                                購入ROAS（購入収益 ÷ 広告費）
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-500">array</td>
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                {dailyData.length > 0 && dailyData[0].purchase_roas
                                  ? JSON.stringify(dailyData[0].purchase_roas)
                                  : 'N/A'}
                              </td>
                            </tr>
                            <tr className="hover:bg-gray-50">
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                website_purchase_roas
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-600">
                                ウェブサイト購入ROAS
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-500">array</td>
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                {dailyData.length > 0 && dailyData[0].website_purchase_roas
                                  ? JSON.stringify(dailyData[0].website_purchase_roas)
                                  : 'N/A'}
                              </td>
                            </tr>
                            <tr className="hover:bg-gray-50">
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">actions</td>
                              <td className="px-4 py-2 text-sm text-gray-600">
                                全アクションタイプの詳細配列
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-500">array</td>
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                {dailyData.length > 0 && dailyData[0].actions
                                  ? `${dailyData[0].actions.length}個のアクション`
                                  : 'N/A'}
                              </td>
                            </tr>
                            <tr className="hover:bg-gray-50">
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                cost_per_action_type
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-600">
                                アクションタイプ別のコスト
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-500">array</td>
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                {dailyData.length > 0 && dailyData[0].cost_per_action_type
                                  ? JSON.stringify(dailyData[0].cost_per_action_type)
                                  : 'N/A'}
                              </td>
                            </tr>
                            {/* ===== リンククリック詳細 ===== */}
                            <tr className="bg-gray-100">
                              <td colSpan={4} className="px-4 py-2 font-bold text-sm text-gray-700">
                                🔗 リンククリック詳細
                              </td>
                            </tr>
                            <tr className="hover:bg-gray-50">
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                inline_link_clicks
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-600">
                                広告内リンクのクリック数
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-500">string</td>
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                {dailyData.length > 0 && dailyData[0].inline_link_clicks
                                  ? dailyData[0].inline_link_clicks
                                  : 'N/A'}
                              </td>
                            </tr>
                            <tr className="hover:bg-gray-50">
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                inline_link_click_ctr
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-600">
                                内部リンクのクリック率
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-500">string</td>
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                {dailyData.length > 0 && dailyData[0].inline_link_click_ctr
                                  ? `${dailyData[0].inline_link_click_ctr}%`
                                  : 'N/A'}
                              </td>
                            </tr>
                            <tr className="hover:bg-gray-50">
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                outbound_clicks
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-600">
                                外部サイトへのクリック数
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-500">array</td>
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                {dailyData.length > 0 && dailyData[0].outbound_clicks
                                  ? JSON.stringify(dailyData[0].outbound_clicks)
                                  : 'N/A'}
                              </td>
                            </tr>
                            <tr className="hover:bg-gray-50">
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                outbound_clicks_ctr
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-600">
                                外部サイトへのクリック率
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-500">array</td>
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                {dailyData.length > 0 && dailyData[0].outbound_clicks_ctr
                                  ? JSON.stringify(dailyData[0].outbound_clicks_ctr)
                                  : 'N/A'}
                              </td>
                            </tr>
                            <tr className="hover:bg-gray-50">
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                unique_clicks
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-600">
                                ユニーククリック数（重複除外）
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-500">string</td>
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                {dailyData.length > 0 && dailyData[0].unique_clicks
                                  ? dailyData[0].unique_clicks
                                  : 'N/A'}
                              </td>
                            </tr>
                            <tr className="hover:bg-gray-50">
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                unique_ctr
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-600">
                                ユニーククリック率
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-500">string</td>
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                {dailyData.length > 0 && dailyData[0].unique_ctr
                                  ? `${dailyData[0].unique_ctr}%`
                                  : 'N/A'}
                              </td>
                            </tr>
                            <tr className="hover:bg-gray-50">
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                unique_link_clicks_ctr
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-600">
                                ユニークリンククリック率
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-500">string</td>
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                {dailyData.length > 0 && dailyData[0].unique_link_clicks_ctr
                                  ? `${dailyData[0].unique_link_clicks_ctr}%`
                                  : 'N/A'}
                              </td>
                            </tr>
                            {/* ===== エンゲージメント ===== */}
                            <tr className="bg-gray-100">
                              <td colSpan={4} className="px-4 py-2 font-bold text-sm text-gray-700">
                                ❤️ エンゲージメント
                              </td>
                            </tr>
                            <tr className="hover:bg-gray-50">
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                engagement
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-600">
                                総エンゲージメント数
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-500">string</td>
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                {dailyData.length > 0 && dailyData[0].engagement
                                  ? dailyData[0].engagement
                                  : 'N/A'}
                              </td>
                            </tr>
                            <tr className="hover:bg-gray-50">
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                social_spend
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-600">
                                ソーシャルインプレッションに対する広告費
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-500">string</td>
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                {dailyData.length > 0 && dailyData[0].social_spend
                                  ? `¥${dailyData[0].social_spend}`
                                  : 'N/A'}
                              </td>
                            </tr>
                            <tr className="hover:bg-gray-50">
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                unique_actions
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-600">
                                ユニークアクション配列
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-500">array</td>
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                {dailyData.length > 0 && dailyData[0].unique_actions
                                  ? `${dailyData[0].unique_actions.length}個のユニークアクション`
                                  : 'N/A'}
                              </td>
                            </tr>
                            {/* ===== 追加フィールド ===== */}
                            <tr className="bg-gray-100">
                              <td colSpan={4} className="px-4 py-2 font-bold text-sm text-gray-700">
                                📊 その他のメトリクス
                              </td>
                            </tr>
                            <tr className="hover:bg-gray-50">
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                unique_inline_link_clicks
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-600">
                                ユニーク内部リンククリック数
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-500">string</td>
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                {dailyData.length > 0 && dailyData[0].unique_inline_link_clicks
                                  ? dailyData[0].unique_inline_link_clicks
                                  : 'N/A'}
                              </td>
                            </tr>
                            <tr className="hover:bg-gray-50">
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                action_values
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-600">
                                アクションの価値（収益データ）
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-500">array</td>
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                {dailyData.length > 0 && dailyData[0].action_values
                                  ? JSON.stringify(dailyData[0].action_values)
                                  : 'N/A'}
                              </td>
                            </tr>
                            <tr className="hover:bg-gray-50">
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                conversion_values
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-600">
                                コンバージョンの価値
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-500">array</td>
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                {dailyData.length > 0 && dailyData[0].conversion_values
                                  ? JSON.stringify(dailyData[0].conversion_values)
                                  : 'N/A'}
                              </td>
                            </tr>
                            <tr className="hover:bg-gray-50">
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                website_ctr
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-600">
                                ウェブサイトクリック率
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-500">array</td>
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                {dailyData.length > 0 && dailyData[0].website_ctr
                                  ? JSON.stringify(dailyData[0].website_ctr)
                                  : 'N/A'}
                              </td>
                            </tr>
                            <tr className="hover:bg-gray-50">
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                account_currency
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-600">アカウント通貨</td>
                              <td className="px-4 py-2 text-sm text-gray-500">string</td>
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                {dailyData.length > 0 && dailyData[0].account_currency
                                  ? dailyData[0].account_currency
                                  : 'N/A'}
                              </td>
                            </tr>
                            <tr className="hover:bg-gray-50">
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                account_name
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-600">アカウント名</td>
                              <td className="px-4 py-2 text-sm text-gray-500">string</td>
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                {dailyData.length > 0 && dailyData[0].account_name
                                  ? dailyData[0].account_name
                                  : 'N/A'}
                              </td>
                            </tr>
                            <tr className="hover:bg-gray-50">
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                date_start
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-600">データ開始日</td>
                              <td className="px-4 py-2 text-sm text-gray-500">string</td>
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                {dailyData.length > 0 && dailyData[0].date_start
                                  ? dailyData[0].date_start
                                  : 'N/A'}
                              </td>
                            </tr>
                            <tr className="hover:bg-gray-50">
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                date_stop
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-600">データ終了日</td>
                              <td className="px-4 py-2 text-sm text-gray-500">string</td>
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                {dailyData.length > 0 && dailyData[0].date_stop
                                  ? dailyData[0].date_stop
                                  : 'N/A'}
                              </td>
                            </tr>
                            <tr className="hover:bg-gray-50">
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                video_avg_time_watched_actions
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-600">動画平均視聴時間</td>
                              <td className="px-4 py-2 text-sm text-gray-500">array</td>
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                {dailyData.length > 0 && dailyData[0].video_avg_time_watched_actions
                                  ? JSON.stringify(dailyData[0].video_avg_time_watched_actions)
                                  : 'N/A'}
                              </td>
                            </tr>
                            <tr className="hover:bg-gray-50">
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                objective
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-600">キャンペーン目的</td>
                              <td className="px-4 py-2 text-sm text-gray-500">string</td>
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                {dailyData.length > 0 && dailyData[0].objective
                                  ? dailyData[0].objective
                                  : 'N/A'}
                              </td>
                            </tr>
                            <tr className="hover:bg-gray-50">
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                optimization_goal
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-600">最適化目標</td>
                              <td className="px-4 py-2 text-sm text-gray-500">string</td>
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                {dailyData.length > 0 && dailyData[0].optimization_goal
                                  ? dailyData[0].optimization_goal
                                  : 'N/A'}
                              </td>
                            </tr>
                            <tr className="hover:bg-gray-50">
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                buying_type
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-600">
                                購入タイプ（AUCTION/RESERVED）
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-500">string</td>
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                {dailyData.length > 0 && dailyData[0].buying_type
                                  ? dailyData[0].buying_type
                                  : 'N/A'}
                              </td>
                            </tr>
                            <tr className="hover:bg-gray-50">
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                created_time
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-600">広告作成日時</td>
                              <td className="px-4 py-2 text-sm text-gray-500">string</td>
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                {dailyData.length > 0 && dailyData[0].created_time
                                  ? dailyData[0].created_time
                                  : 'N/A'}
                              </td>
                            </tr>
                            <tr className="hover:bg-gray-50">
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                updated_time
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-600">広告更新日時</td>
                              <td className="px-4 py-2 text-sm text-gray-500">string</td>
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                {dailyData.length > 0 && dailyData[0].updated_time
                                  ? dailyData[0].updated_time
                                  : 'N/A'}
                              </td>
                            </tr>
                            <tr className="hover:bg-gray-50">
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                relevance_score
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-600">
                                関連性スコア（廃止予定）
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-500">object</td>
                              <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                {dailyData.length > 0 && dailyData[0].relevance_score
                                  ? JSON.stringify(dailyData[0].relevance_score)
                                  : 'N/A'}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                      <div className="mt-2 text-xs text-gray-500">
                        ※ 詳細な全フィールドの説明は下部のセクションを参照してください
                      </div>
                    </div>

                    {/* API診断情報セクション */}
                    <div className="bg-white rounded-lg border border-blue-200 p-6 mb-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <svg
                          className="w-5 h-5 mr-2 text-blue-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        API診断結果
                      </h3>

                      {/* API接続状態 */}
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="p-3 bg-gray-50 rounded">
                          <div className="text-sm text-gray-600">APIエンドポイント</div>
                          <div className="text-sm font-mono mt-1">
                            {item.adId ? (
                              <span className="text-green-600">✅ 広告レベル ({item.adId})</span>
                            ) : (
                              <span className="text-yellow-600">⚠️ アカウントレベル</span>
                            )}
                          </div>
                        </div>
                        <div className="p-3 bg-gray-50 rounded">
                          <div className="text-sm text-gray-600">データ取得状態</div>
                          <div className="text-sm font-medium mt-1">
                            {dailyData.length > 0 ? (
                              <span className="text-green-600">
                                ✅ 成功 ({dailyData.length}日分)
                              </span>
                            ) : dailyDataError ? (
                              <span className="text-red-600">❌ エラー</span>
                            ) : (
                              <span className="text-gray-500">未取得</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* 品質指標の可用性 */}
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">品質指標の可用性</h4>
                        <div className="space-y-2">
                          {[
                            'quality_ranking',
                            'engagement_rate_ranking',
                            'conversion_rate_ranking',
                          ].map((field) => {
                            const impressions = parseInt(item.metrics?.impressions || '0')
                            const isAvailable = impressions >= 500
                            const diagnosis = InsightFetcher.diagnoseFieldUnavailability(
                              field,
                              impressions
                            )

                            return (
                              <div
                                key={field}
                                className="flex items-center justify-between p-2 bg-gray-50 rounded"
                              >
                                <span className="text-sm font-mono">{field}</span>
                                <span
                                  className={`text-xs ${isAvailable ? 'text-green-600' : 'text-yellow-600'}`}
                                >
                                  {isAvailable ? '✅ 利用可能' : `⚠️ ${diagnosis}`}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      {/* データ信頼性スコア */}
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">データ信頼性</h4>
                        <div className="p-3 bg-gray-50 rounded">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-gray-600">総合信頼性スコア</span>
                            <span className="text-sm font-bold">
                              {dailyData.length > 0 ? '計算中...' : 'N/A'}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500">
                            直接取得データ、代替データ、欠損データの割合から算出
                          </div>
                        </div>
                      </div>

                      {/* エラー情報 */}
                      {dailyDataError && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded">
                          <div className="text-sm font-medium text-red-800 mb-1">エラー詳細</div>
                          <div className="text-xs text-red-600">{dailyDataError}</div>
                        </div>
                      )}

                      {/* データ取得ボタン */}
                      {!dailyData.length && !isLoadingDaily && (
                        <button
                          onClick={fetchDailyData}
                          className="w-full mt-4 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors"
                        >
                          詳細データを取得
                        </button>
                      )}
                    </div>

                    {/* Instagram関連メトリクスセクション */}
                    <div className="bg-white rounded-lg border border-purple-200 p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <svg
                          className="w-5 h-5 mr-2 text-purple-600"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zM5.838 12a6.162 6.162 0 1112.324 0 6.162 6.162 0 01-12.324 0zM12 16a4 4 0 110-8 4 4 0 010 8zm4.965-10.405a1.44 1.44 0 112.881.001 1.44 1.44 0 01-2.881-.001z" />
                        </svg>
                        Instagram 関連メトリクス
                      </h3>
                      <InstagramMetricsDisplay insight={insight || item} />
                    </div>

                    {/* APIレスポンス生データ */}
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        APIレスポンス生データ（全フィールド）
                        <span className="ml-2 text-xs text-blue-500 font-normal">
                          Meta Graph API v23.0
                        </span>
                      </h3>

                      {/* 重要フィールドのサマリー */}
                      <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <h4 className="font-medium text-yellow-800 mb-2">
                          重要フィールドのクイックビュー
                        </h4>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">ad_id:</span>
                            <span className="ml-2 font-mono">{item.adId || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">conversions:</span>
                            <span className="ml-2 font-mono">{item.conversions || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">conversions_1d_click:</span>
                            <span className="ml-2 font-mono">
                              {item.conversions_1d_click || 'N/A'}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600">spend:</span>
                            <span className="ml-2 font-mono">
                              ¥{item.spend?.toLocaleString() || 'N/A'}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600">impressions:</span>
                            <span className="ml-2 font-mono">
                              {item.impressions?.toLocaleString() || 'N/A'}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600">clicks:</span>
                            <span className="ml-2 font-mono">
                              {item.clicks?.toLocaleString() || 'N/A'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* 全フィールドの表示 */}
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-medium text-gray-700 mb-2">
                            itemオブジェクト（処理済みデータ）
                          </h4>
                          <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                            <pre className="text-xs font-mono whitespace-pre-wrap break-all">
                              {JSON.stringify(item, null, 2)}
                            </pre>
                          </div>
                        </div>

                        {insight && (
                          <div>
                            <h4 className="font-medium text-gray-700 mb-2">
                              insightオブジェクト（APIレスポンス）
                            </h4>
                            <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                              <pre className="text-xs font-mono whitespace-pre-wrap break-all">
                                {JSON.stringify(insight, null, 2)}
                              </pre>
                            </div>
                          </div>
                        )}

                        {/* actionsフィールドの詳細表示（拡張版） */}
                        {(item.actions || insight?.actions) && (
                          <div className="mb-6 p-4 bg-yellow-50 rounded-lg">
                            <h4 className="font-semibold text-gray-900 mb-3">
                              📊 Actions配列詳細（{(item.actions || insight?.actions || []).length}
                              個のアクション）
                            </h4>

                            {/* 検索フィルター */}
                            <div className="mb-3">
                              <input
                                type="text"
                                placeholder="アクションタイプで検索..."
                                className="px-3 py-2 border rounded-lg text-sm w-full"
                                onChange={(e) => {
                                  const searchTerm = e.target.value.toLowerCase()
                                  const table =
                                    e.target.parentElement?.nextElementSibling?.querySelector(
                                      'tbody'
                                    )
                                  if (table) {
                                    const rows = table.querySelectorAll('tr')
                                    rows.forEach((row: any) => {
                                      const actionType =
                                        row.querySelector('td')?.textContent?.toLowerCase() || ''
                                      row.style.display = actionType.includes(searchTerm)
                                        ? ''
                                        : 'none'
                                    })
                                  }
                                }}
                              />
                            </div>

                            <div className="bg-white rounded border border-yellow-200 p-3 max-h-96 overflow-y-auto">
                              <table className="min-w-full divide-y divide-gray-200 text-xs">
                                <thead className="bg-yellow-100 sticky top-0">
                                  <tr>
                                    <th className="px-2 py-2 text-left font-semibold">
                                      Action Type
                                    </th>
                                    <th className="px-2 py-2 text-right font-semibold">
                                      Total Value
                                    </th>
                                    <th className="px-2 py-2 text-right font-semibold">1d Click</th>
                                    <th className="px-2 py-2 text-right font-semibold">7d Click</th>
                                    <th className="px-2 py-2 text-right font-semibold">
                                      28d Click
                                    </th>
                                    <th className="px-2 py-2 text-right font-semibold">1d View</th>
                                    <th className="px-2 py-2 text-right font-semibold">7d View</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                  {(item.actions || insight?.actions || []).map(
                                    (action: any, idx: number) => (
                                      <tr key={idx} className="hover:bg-yellow-50">
                                        <td className="px-2 py-2 font-mono text-gray-900">
                                          {action.action_type}
                                        </td>
                                        <td className="px-2 py-2 text-right font-mono font-semibold">
                                          {action.value || 0}
                                        </td>
                                        <td className="px-2 py-2 text-right font-mono text-gray-600">
                                          {action['1d_click'] || '-'}
                                        </td>
                                        <td className="px-2 py-2 text-right font-mono text-gray-600">
                                          {action['7d_click'] || '-'}
                                        </td>
                                        <td className="px-2 py-2 text-right font-mono text-gray-600">
                                          {action['28d_click'] || '-'}
                                        </td>
                                        <td className="px-2 py-2 text-right font-mono text-gray-600">
                                          {action['1d_view'] || '-'}
                                        </td>
                                        <td className="px-2 py-2 text-right font-mono text-gray-600">
                                          {action['7d_view'] || '-'}
                                        </td>
                                      </tr>
                                    )
                                  )}
                                </tbody>
                              </table>
                            </div>

                            {/* エンゲージメント系アクションの抽出結果 */}
                            <div className="mt-4 p-3 bg-blue-50 rounded">
                              <h5 className="text-sm font-semibold mb-2">
                                🔍 抽出されたエンゲージメント指標：
                              </h5>
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                  👍 Likes:{' '}
                                  <span className="font-semibold">
                                    {(item.actions || insight?.actions || []).find(
                                      (a: any) => a.action_type === 'like'
                                    )?.value || 'なし'}
                                  </span>
                                </div>
                                <div>
                                  💬 Comments:{' '}
                                  <span className="font-semibold">
                                    {(item.actions || insight?.actions || []).find(
                                      (a: any) => a.action_type === 'comment'
                                    )?.value || 'なし'}
                                  </span>
                                </div>
                                <div>
                                  🔄 Shares:{' '}
                                  <span className="font-semibold">
                                    {(item.actions || insight?.actions || []).find(
                                      (a: any) => a.action_type === 'post'
                                    )?.value || 'なし'}
                                  </span>
                                </div>
                                <div>
                                  💾 Saves:{' '}
                                  <span className="font-semibold">
                                    {(item.actions || insight?.actions || []).find(
                                      (a: any) => a.action_type === 'post_save'
                                    )?.value || 'なし'}
                                  </span>
                                </div>
                                <div>
                                  🔗 Link Clicks:{' '}
                                  <span className="font-semibold">
                                    {(item.actions || insight?.actions || []).find(
                                      (a: any) => a.action_type === 'link_click'
                                    )?.value || 'なし'}
                                  </span>
                                </div>
                                <div>
                                  🛒 Purchases:{' '}
                                  <span className="font-semibold">
                                    {(item.actions || insight?.actions || []).find(
                                      (a: any) => a.action_type === 'purchase'
                                    )?.value || 'なし'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* 全アクションタイプの生データ表示 */}
                            <details className="mt-3">
                              <summary className="cursor-pointer text-sm text-blue-600 hover:text-blue-800">
                                🔧 Actions配列の生JSONデータを表示
                              </summary>
                              <pre className="mt-2 text-xs bg-gray-100 p-3 rounded overflow-x-auto">
                                {JSON.stringify(item.actions || insight?.actions || [], null, 2)}
                              </pre>
                            </details>
                          </div>
                        )}

                        {/* 動画メトリクスの専用表示セクション */}
                        {(insight?.video_play_actions ||
                          insight?.video_p25_watched_actions ||
                          insight?.video_p50_watched_actions ||
                          insight?.video_p75_watched_actions ||
                          insight?.video_p100_watched_actions) && (
                          <div className="mb-6 p-4 bg-green-50 rounded-lg">
                            <h4 className="font-semibold text-gray-900 mb-3">
                              🎥 動画メトリクス詳細
                            </h4>

                            {/* 動画視聴ファネル */}
                            <div className="bg-white rounded border border-green-200 p-4">
                              <h5 className="text-sm font-semibold mb-3">視聴ファネル分析</h5>
                              <div className="space-y-2">
                                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                  <span className="text-sm">▶️ 再生開始</span>
                                  <span className="font-mono font-semibold">
                                    {insight?.video_play_actions?.[0]?.value || 0}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                  <span className="text-sm">📊 25%視聴</span>
                                  <span className="font-mono font-semibold">
                                    {insight?.video_p25_watched_actions?.[0]?.value || 0}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                  <span className="text-sm">📊 50%視聴</span>
                                  <span className="font-mono font-semibold">
                                    {insight?.video_p50_watched_actions?.[0]?.value || 0}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                  <span className="text-sm">📊 75%視聴</span>
                                  <span className="font-mono font-semibold">
                                    {insight?.video_p75_watched_actions?.[0]?.value || 0}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                  <span className="text-sm">📊 95%視聴</span>
                                  <span className="font-mono font-semibold">
                                    {insight?.video_p95_watched_actions?.[0]?.value || 0}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between p-2 bg-green-100 rounded">
                                  <span className="text-sm font-semibold">✅ 完全視聴</span>
                                  <span className="font-mono font-semibold">
                                    {insight?.video_p100_watched_actions?.[0]?.value || 0}
                                  </span>
                                </div>
                              </div>

                              {/* 視聴完了率 */}
                              <div className="mt-4 p-3 bg-blue-50 rounded">
                                <h5 className="text-sm font-semibold mb-2">視聴完了率</h5>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                  <div>
                                    25%到達率:
                                    <span className="ml-2 font-semibold">
                                      {insight?.video_play_actions?.[0]?.value > 0
                                        ? `${(((insight?.video_p25_watched_actions?.[0]?.value || 0) / insight.video_play_actions[0].value) * 100).toFixed(1)}%`
                                        : 'N/A'}
                                    </span>
                                  </div>
                                  <div>
                                    50%到達率:
                                    <span className="ml-2 font-semibold">
                                      {insight?.video_play_actions?.[0]?.value > 0
                                        ? `${(((insight?.video_p50_watched_actions?.[0]?.value || 0) / insight.video_play_actions[0].value) * 100).toFixed(1)}%`
                                        : 'N/A'}
                                    </span>
                                  </div>
                                  <div>
                                    75%到達率:
                                    <span className="ml-2 font-semibold">
                                      {insight?.video_play_actions?.[0]?.value > 0
                                        ? `${(((insight?.video_p75_watched_actions?.[0]?.value || 0) / insight.video_play_actions[0].value) * 100).toFixed(1)}%`
                                        : 'N/A'}
                                    </span>
                                  </div>
                                  <div>
                                    完全視聴率:
                                    <span className="ml-2 font-semibold">
                                      {insight?.video_play_actions?.[0]?.value > 0
                                        ? `${(((insight?.video_p100_watched_actions?.[0]?.value || 0) / insight.video_play_actions[0].value) * 100).toFixed(1)}%`
                                        : 'N/A'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* 生データ表示 */}
                            <details className="mt-3">
                              <summary className="cursor-pointer text-sm text-blue-600 hover:text-blue-800">
                                🔧 動画メトリクスの生JSONデータを表示
                              </summary>
                              <pre className="mt-2 text-xs bg-gray-100 p-3 rounded overflow-x-auto">
                                {JSON.stringify(
                                  {
                                    video_play_actions: insight?.video_play_actions,
                                    video_p25_watched_actions: insight?.video_p25_watched_actions,
                                    video_p50_watched_actions: insight?.video_p50_watched_actions,
                                    video_p75_watched_actions: insight?.video_p75_watched_actions,
                                    video_p95_watched_actions: insight?.video_p95_watched_actions,
                                    video_p100_watched_actions: insight?.video_p100_watched_actions,
                                    video_avg_time_watched_actions:
                                      insight?.video_avg_time_watched_actions,
                                    video_thruplay_watched_actions:
                                      insight?.video_thruplay_watched_actions,
                                  },
                                  null,
                                  2
                                )}
                              </pre>
                            </details>
                          </div>
                        )}

                        {/* unique_actionsフィールドの詳細表示 */}
                        {(item.unique_actions || insight?.unique_actions) && (
                          <div>
                            <h4 className="font-medium text-gray-700 mb-2">
                              Unique Actions配列詳細
                            </h4>
                            <div className="bg-green-50 rounded-lg p-4 max-h-64 overflow-y-auto">
                              <table className="min-w-full divide-y divide-gray-200 text-xs">
                                <thead>
                                  <tr>
                                    <th className="px-2 py-1 text-left">action_type</th>
                                    <th className="px-2 py-1 text-right">value</th>
                                    <th className="px-2 py-1 text-right">1d_click</th>
                                    <th className="px-2 py-1 text-right">7d_click</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                  {(item.unique_actions || insight?.unique_actions || []).map(
                                    (action: any, idx: number) => (
                                      <tr key={idx}>
                                        <td className="px-2 py-1 font-mono">
                                          {action.action_type}
                                        </td>
                                        <td className="px-2 py-1 text-right font-mono">
                                          {action.value}
                                        </td>
                                        <td className="px-2 py-1 text-right font-mono">
                                          {action['1d_click'] || '-'}
                                        </td>
                                        <td className="px-2 py-1 text-right font-mono">
                                          {action['7d_click'] || '-'}
                                        </td>
                                      </tr>
                                    )
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {/* 全フィールドのキー一覧 */}
                        <div>
                          <h4 className="font-medium text-gray-700 mb-2">利用可能な全フィールド</h4>
                          <div className="bg-purple-50 rounded-lg p-4">
                            <div className="grid grid-cols-4 gap-2 text-xs">
                              <div>
                                <h5 className="font-semibold mb-1">itemのフィールド</h5>
                                <ul className="space-y-1">
                                  {Object.keys(item)
                                    .sort()
                                    .map((key) => (
                                      <li key={key} className="font-mono text-purple-700">
                                        {key}: {typeof item[key]}
                                      </li>
                                    ))}
                                </ul>
                              </div>
                              {insight && (
                                <div>
                                  <h5 className="font-semibold mb-1">insightのフィールド</h5>
                                  <ul className="space-y-1">
                                    {Object.keys(insight)
                                      .sort()
                                      .map((key) => (
                                        <li key={key} className="font-mono text-purple-700">
                                          {key}: {typeof insight[key]}
                                        </li>
                                      ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        {/* 追加ヒント */}
                        <div className="mt-4 p-3 bg-yellow-100 border border-yellow-300 rounded-lg">
                          <h5 className="font-semibold text-yellow-800 mb-2">
                            💡 新機能開発のヒント
                          </h5>
                          <ul className="text-xs text-yellow-700 space-y-1">
                            <li>
                              •{' '}
                              <span className="font-mono">
                                video_play_actions, video_p25_watched_actions等
                              </span>
                              : 動画広告の詳細な視聴データ（個別フィールドとして提供）
                            </li>
                            <li>
                              • <span className="font-mono">cost_per_action_type</span>:
                              アクション毎のコスト分析が可能
                            </li>
                            <li>
                              •{' '}
                              <span className="font-mono">
                                quality_ranking, engagement_rate_ranking, conversion_rate_ranking
                              </span>
                              : 品質評価指標（relevance_scoreの後継）
                            </li>
                            <li>
                              • <span className="font-mono">website_purchase_roas</span>:
                              ウェブサイト購入に特化したROAS測定
                            </li>
                            <li>
                              • <span className="font-mono">inline_link_clicks</span>:
                              広告内リンクのクリック詳細
                            </li>
                          </ul>
                        </div>

                        {/* デバッグ情報 */}
                        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-xs">
                          <p className="font-semibold text-red-800">デバッグ情報</p>
                          <p>item type: {typeof item}</p>
                          <p>insight type: {typeof insight}</p>
                          <p>item keys: {Object.keys(item).length}</p>
                          <p>insight keys: {insight ? Object.keys(insight).length : 0}</p>
                          <p>has actions: {!!(item.actions || insight?.actions)}</p>
                          <p>
                            has unique_actions: {!!(item.unique_actions || insight?.unique_actions)}
                          </p>
                          <p>
                            conversions field exists:{' '}
                            {item.conversions !== undefined ? 'Yes' : 'No'}
                          </p>
                          <p>conversions value: {item.conversions}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : activeTab === 'debug' ? (
                  /* Debug Mode - Comprehensive Data Tabs */
                  <div className="space-y-6">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-blue-900">
                            Meta Ads API 完全データビュー
                          </h3>
                          <p className="text-sm text-blue-700 mt-1">
                            すべてのAPI エンドポイントから取得可能なデータを表示します
                          </p>
                        </div>
                        <button
                          onClick={() => setShowDebugMode(!showDebugMode)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          {showDebugMode ? 'タブを隠す' : 'データを表示'}
                        </button>
                      </div>
                    </div>

                    {showDebugMode && (
                      <ComprehensiveDataTabs
                        adId={item.adId}
                        accessToken={accessToken || ''}
                        accountId={accountId || ''}
                        adsetId={insight?.adset_id}
                        campaignId={insight?.campaign_id}
                      />
                    )}
                  </div>
                ) : (
                  /* Time Series Analysis Tab */
                  <div className="space-y-6">
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        パフォーマンス推移分析（過去30日間）
                        <span className="ml-2 text-xs text-blue-500 font-normal">
                          (time_increment データ使用)
                        </span>
                      </h3>

                      {/* 疲労度推移グラフ */}
                      <div className="mb-6">
                        {timeSeriesData.hasData ? (
                          <div>
                            <div className="text-sm font-medium text-gray-700 mb-2">
                              疲労度指標の推移
                              <span className="ml-2 text-xs text-green-600">
                                ({timeSeriesData.chartData.length}データポイント)
                              </span>
                            </div>
                            <div className="bg-white border rounded-lg p-4">
                              <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
                                <div className="text-center">
                                  <div className="font-medium text-blue-600">
                                    CTR: {(timeSeriesData.summary.avgCTR * 100).toFixed(2)}%
                                  </div>
                                </div>
                                <div className="text-center">
                                  <div className="font-medium text-green-600">
                                    CPM: ¥{timeSeriesData.summary.avgCPM.toFixed(0)}
                                  </div>
                                </div>
                                <div className="text-center">
                                  <div className="font-medium text-orange-600">
                                    Frequency: {timeSeriesData.summary.avgFrequency.toFixed(2)}
                                  </div>
                                </div>
                              </div>
                              <div className="text-xs text-gray-600 text-center">
                                期間: {timeSeriesData.chartData[0]?.date || 'N/A'}
                                {timeSeriesData.chartData.length > 1 &&
                                  ` ～ ${timeSeriesData.chartData[timeSeriesData.chartData.length - 1]?.date}`}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-gray-50 rounded-lg p-4 h-64 flex items-center justify-center">
                            <div className="text-center">
                              <div className="text-4xl text-gray-400 mb-2">📈</div>
                              <div className="text-sm text-gray-600">時系列データを準備中</div>
                              <div className="text-xs text-gray-500 mt-1">
                                insight データを取得してください
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* パフォーマンス推移グラフ */}
                      <div className="mb-6">
                        {timeSeriesData.hasData ? (
                          <div>
                            <div className="text-sm font-medium text-gray-700 mb-2">
                              広告費・コンバージョンの推移
                            </div>
                            <div className="bg-white border rounded-lg p-4">
                              <div className="grid grid-cols-4 gap-4 mb-4 text-sm">
                                <div className="text-center">
                                  <div className="font-medium text-purple-600">
                                    広告費: ¥{timeSeriesData.summary.totalSpend.toLocaleString()}
                                  </div>
                                </div>
                                <div className="text-center">
                                  <div className="font-medium text-blue-600">
                                    インプレッション:{' '}
                                    {timeSeriesData.chartData[0]?.impressions.toLocaleString()}
                                  </div>
                                </div>
                                <div className="text-center">
                                  <div className="font-medium text-green-600">
                                    クリック: {timeSeriesData.chartData[0]?.clicks.toLocaleString()}
                                  </div>
                                </div>
                                <div className="text-center">
                                  <div className="font-medium text-red-600">
                                    CV: {timeSeriesData.chartData[0]?.conversions || 0}
                                  </div>
                                </div>
                              </div>
                              <div className="text-xs text-gray-600 text-center">
                                CPA: ¥
                                {timeSeriesData.chartData[0]?.conversions > 0
                                  ? (
                                      timeSeriesData.summary.totalSpend /
                                      timeSeriesData.chartData[0].conversions
                                    ).toLocaleString()
                                  : 'N/A'}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-gray-50 rounded-lg p-4 h-64 flex items-center justify-center">
                            <div className="text-center">
                              <div className="text-4xl text-gray-400 mb-2">💰</div>
                              <div className="text-sm text-gray-600">
                                パフォーマンスデータを準備中
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                insight データから算出
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* データ取得状況 */}
                      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-xs">
                        <p className="font-semibold text-blue-800">データ取得状況:</p>
                        <p>✅ time_increment=1 でAPI取得</p>
                        <p>✅ ブレークダウンデータは利用せず数値整合性を優先</p>
                        <p>Data source: {insight ? '✅ Meta API (time-series)' : '⏳ 取得中'}</p>
                        <p>
                          Time-series data: {timeSeriesData.hasData ? '✅ 処理済み' : '❌ 未処理'}
                        </p>
                        {timeSeriesData.hasData && (
                          <p>Period: {timeSeriesData.chartData[0]?.date}</p>
                        )}
                      </div>

                      {/* 時系列分析の概要 */}
                      <div className="mb-6">
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div className="bg-gray-50 rounded-lg p-4">
                            <div className="text-lg font-semibold text-gray-900">疲労度推移</div>
                            <div className="text-sm text-gray-600">CTR・CPM・Frequency</div>
                            <div className="mt-2 text-xs text-blue-600">日別データで分析</div>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-4">
                            <div className="text-lg font-semibold text-gray-900">
                              パフォーマンス
                            </div>
                            <div className="text-sm text-gray-600">CV・CPA・ROAS</div>
                            <div className="mt-2 text-xs text-blue-600">収益性の変化</div>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-4">
                            <div className="text-lg font-semibold text-gray-900">投資効率</div>
                            <div className="text-sm text-gray-600">広告費・リーチ</div>
                            <div className="mt-2 text-xs text-blue-600">配信最適化</div>
                          </div>
                        </div>
                      </div>

                      {/* 実装予告 */}
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <h4 className="font-medium text-green-800 mb-2">
                          時系列分析機能（開発中）
                        </h4>
                        <ul className="text-sm text-green-700 space-y-1">
                          <li>• 日別パフォーマンス推移グラフ</li>
                          <li>• 疲労度スコアの時系列変化</li>
                          <li>• トレンド分析とアラート機能</li>
                          <li>• 予測モデルによる将来性評価</li>
                        </ul>
                        <div className="mt-3 text-xs text-green-600">
                          ※ time_increment=1 データを使用し、数値の整合性を保証
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
