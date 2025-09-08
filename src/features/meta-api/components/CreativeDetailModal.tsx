import React, { Fragment, useState, useEffect, useCallback, useMemo } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { XMarkIcon, ChartBarIcon } from '@heroicons/react/24/outline'
import { FatigueData } from '@/types'
import { SimplePhoneMockup } from './SimplePhoneMockup'
import { MiniFrequencyChart } from './MiniFrequencyChart'
import { MiniMetricChart, MetricType } from './MiniMetricChart'
import { FatigueDonutChart } from './FatigueDonutChart'
import { calculateAllFatigueScores, FATIGUE_FORMULAS } from '../utils/fatigueCalculations'
import { InstagramMetricsPanel } from './InstagramMetricsPanel'
import { getSafeMetrics } from '../utils/safe-data-access'
import { extractInstagramMetrics, InstagramMetricsDisplay } from './InstagramMetricsExtractor'

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

  const [activeTab, setActiveTab] = useState<'metrics' | 'platform' | 'daily' | 'raw'>('metrics')
  const [dailyData, setDailyData] = useState<any[]>([]) // 日別データ
  const [isLoadingDaily, setIsLoadingDaily] = useState(false) // ローディング状態
  const [dailyDataError, setDailyDataError] = useState<string | null>(null) // エラー状態

  // 日別データがあるかチェック（既存データまたは取得したデータ）
  const hasDailyData = (item.dailyData && item.dailyData.length > 0) || dailyData.length > 0

  // 日別データを取得する関数（useCallbackでラップ）
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

      // 日別データ取得のAPIエンドポイント
      // accountIdがact_で始まらない場合は追加
      const formattedAccountId = accountId.startsWith('act_') ? accountId : `act_${accountId}`
      const url = `https://graph.facebook.com/v23.0/${formattedAccountId}/insights`

      // 日付範囲の処理（effectiveDateRangeを使用）
      let dateParams: any = {}
      if (effectiveDateRange && effectiveDateRange.start && effectiveDateRange.end) {
        // 日付をYYYY-MM-DD形式にフォーマット（ローカルタイムゾーン）
        const formatDate = (date: Date | string) => {
          const d = typeof date === 'string' ? new Date(date) : date
          const year = d.getFullYear()
          const month = String(d.getMonth() + 1).padStart(2, '0')
          const day = String(d.getDate()).padStart(2, '0')
          return `${year}-${month}-${day}`
        }

        dateParams.time_range = JSON.stringify({
          since: formatDate(effectiveDateRange.start),
          until: formatDate(effectiveDateRange.end),
        })

        console.log('🔍 API call with date range:', {
          since: formatDate(effectiveDateRange.start),
          until: formatDate(effectiveDateRange.end),
          startDate: new Date(effectiveDateRange.start).toLocaleDateString('ja-JP'),
          endDate: new Date(effectiveDateRange.end).toLocaleDateString('ja-JP'),
          raw: effectiveDateRange,
        })
      } else {
        // デフォルトは過去30日間（これは起こらないはず）
        dateParams.date_preset = 'last_30d'
        console.log('📅 Using default date preset: last_30d (no effectiveDateRange provided)')
      }

      const params = new URLSearchParams({
        access_token: accessToken,
        time_increment: '1', // 日別データを取得
        fields: [
          // === 基本フィールド（必須） ===
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

          // === 品質評価指標（API v23.0） ===
          'quality_ranking',
          'engagement_rate_ranking',
          'conversion_rate_ranking',

          // === コンバージョン関連（検証済み） ===
          'conversions',
          'conversion_values',
          'cost_per_conversion',
          // 'purchase', // 削除（#100エラー回避）
          // 'purchases', // 削除（#100エラー回避）
          // 'omni_purchase', // 削除（#100エラー回避）
          // 'website_purchases', // 削除（#100エラー回避）

          // === 動画メトリクス（API v23.0） ===
          'video_play_actions',
          'video_p25_watched_actions',
          'video_p50_watched_actions',
          'video_p75_watched_actions',
          // 'video_p95_watched_actions', // 削除（存在しない可能性）
          'video_p100_watched_actions',
          'video_thruplay_watched_actions',
          'video_avg_time_watched_actions',
          'video_continuous_2_sec_watched_actions',
          'video_15_sec_watched_actions',

          // === リンククリック詳細（検証済み） ===
          'inline_link_clicks',
          'inline_link_click_ctr',
          'unique_inline_link_clicks',
          // 'unique_inline_link_click_ctr', // 削除（#100エラー回避）
          'outbound_clicks',
          // 'outbound_clicks_ctr', // 削除（#100エラー回避）
          // 'unique_outbound_clicks', // 削除（#100エラー回避）
          // 'unique_outbound_clicks_ctr', // 削除（#100エラー回避）
          // 'link_clicks', // 削除（#100エラー回避）
          // 'unique_link_clicks', // 削除（#100エラー回避）
          'website_ctr',

          // === ROAS関連 ===
          'purchase_roas',
          'website_purchase_roas',
          // 'mobile_app_purchase_roas', // 削除（#100エラー回避）

          // === アクション関連の詳細 ===
          'actions',
          'action_values',
          'unique_actions',
          'cost_per_action_type',
          'cost_per_unique_action_type',
          'cost_per_thruplay',
          'cost_per_unique_click',

          // === その他の有用なフィールド ===
          'unique_clicks',
          'social_spend',
          'unique_ctr',
          // 'objective', // 削除（insightsエンドポイントでは使用不可）
          // 'optimization_goal', // 削除（insightsエンドポイントでは使用不可）
          // 'buying_type', // 削除（insightsエンドポイントでは使用不可）
          // 'bid_strategy', // 削除（insightsエンドポイントでは使用不可）
          // 'daily_budget', // 削除（insightsエンドポイントでは使用不可）
          // 'lifetime_budget', // 削除（insightsエンドポイントでは使用不可）
          'account_currency',
          'account_name',
          // 'created_time', // 削除（insightsエンドポイントでは使用不可）
          // 'updated_time', // 削除（insightsエンドポイントでは使用不可）
          // 'status', // 削除（insightsエンドポイントでは使用不可）
          // 'effective_status', // 削除（insightsエンドポイントでは使用不可）
          'date_start',
          'date_stop',
        ].join(','),
        filtering: `[{"field":"ad.id","operator":"IN","value":["${item.adId}"]}]`,
        limit: '100',
      })

      // 日付範囲パラメータを追加
      if (dateParams.time_range) {
        params.append('time_range', dateParams.time_range)
      } else if (dateParams.date_preset) {
        params.append('date_preset', dateParams.date_preset)
      }

      const response = await fetch(`${url}?${params}`)
      const data = await response.json()

      if (data.error) {
        throw new Error(data.error.message || '日別データの取得に失敗しました')
      }

      // APIレスポンスのデバッグログ
      if (data.data && data.data.length > 0) {
        console.log('📊 取得したフィールド一覧:', Object.keys(data.data[0]))
        console.log('🔍 品質評価:', {
          quality: data.data[0].quality_ranking,
          engagement: data.data[0].engagement_rate_ranking,
          conversion: data.data[0].conversion_rate_ranking,
        })
        console.log('🎬 動画メトリクス:', {
          play: data.data[0].video_play_actions,
          p25: data.data[0].video_p25_watched_actions,
          p50: data.data[0].video_p50_watched_actions,
          p75: data.data[0].video_p75_watched_actions,
          p100: data.data[0].video_p100_watched_actions,
        })
        console.log('🔗 リンククリック:', {
          inline: data.data[0].inline_link_clicks,
          inline_ctr: data.data[0].inline_link_click_ctr,
          outbound: data.data[0].outbound_clicks,
        })
        console.log('💰 ROAS:', {
          purchase: data.data[0].purchase_roas,
          website: data.data[0].website_purchase_roas,
        })
        
        // Instagram関連メトリクスの抽出結果をログ出力
        const instagramMetrics = extractInstagramMetrics(data.data[0])
        console.log('📸 Instagram関連メトリクス:', instagramMetrics)
        
        if (instagramMetrics && Object.keys(instagramMetrics.actions).length > 0) {
          console.log('✅ Instagramアクション検出:', instagramMetrics.actions)
        }
        if (instagramMetrics && instagramMetrics.calculated) {
          console.log('📊 Instagram計算メトリクス:', instagramMetrics.calculated)
        }
      }

      // 日別データをフォーマット
      const formattedDailyData = (data.data || []).map((day: any) => {
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

  // モーダルが開かれた時に日別データを取得
  useEffect(() => {
    if (isOpen && item.adId && accessToken && accountId) {
      console.log(
        '📍 useEffect calling fetchDailyData with effectiveDateRange:',
        effectiveDateRange
      )
      fetchDailyData()
    }
  }, [isOpen, fetchDailyData]) // fetchDailyDataを依存配列に

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
                            指定期間: {new Date(effectiveDateRange.start).toLocaleDateString('ja-JP')} 〜{' '}
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

                    {/* Middle Column - Smartphone Mockup & Instagram Metrics */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h6 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">
                        広告プレビュー（モックアップ）
                      </h6>
                      <div className="flex justify-center">
                        <SimplePhoneMockup
                          mediaType={insight?.creative_media_type}
                          thumbnailUrl={insight?.thumbnail_url}
                          videoUrl={insight?.video_url}
                          videoId={insight?.video_id}
                          platform={item.metrics.instagram_metrics?.publisher_platform}
                          creativeName={item.adName}
                          adId={item.adId}
                          accountId={accountId}
                        />
                      </div>
                      <p className="text-xs text-gray-500 text-center mt-4">
                        ※
                        実際のクリエイティブデータが利用できない場合は、プレースホルダーが表示されます
                      </p>

                      {/* Instagram Metrics - モックアップの下に移動 */}
                      <div className="mt-6 pt-4 border-t border-gray-300">
                        <InstagramMetricsPanel
                          data={insight}
                          metrics={getSafeMetrics(item.metrics)}
                          isLoading={false}
                        />
                      </div>
                    </div>

                    {/* Right Column - Basic Metrics */}
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
                  </div>
                ) : activeTab === 'raw' ? (
                  /* Raw Data Tab - 生データの完全表示 */
                  <div className="space-y-6">
                    {/* Instagram関連メトリクスセクション */}
                    <div className="bg-white rounded-lg border border-purple-200 p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <svg className="w-5 h-5 mr-2 text-purple-600" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zM5.838 12a6.162 6.162 0 1112.324 0 6.162 6.162 0 01-12.324 0zM12 16a4 4 0 110-8 4 4 0 010 8zm4.965-10.405a1.44 1.44 0 112.881.001 1.44 1.44 0 01-2.881-.001z"/>
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

                        {/* actionsフィールドの詳細表示 */}
                        {(item.actions || insight?.actions) && (
                          <div>
                            <h4 className="font-medium text-gray-700 mb-2">Actions配列詳細</h4>
                            <div className="bg-blue-50 rounded-lg p-4 max-h-64 overflow-y-auto">
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
                                  {(item.actions || insight?.actions || []).map(
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

                        {/* フィールド説明テーブル */}
                        <div>
                          <h4 className="font-medium text-gray-700 mb-2">
                            主要フィールドの詳細説明
                            <span className="ml-2 text-xs text-blue-500 font-normal">
                              Meta Ads API Documentation
                            </span>
                          </h4>
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
                                  <td
                                    colSpan={4}
                                    className="px-4 py-2 font-bold text-sm text-gray-700"
                                  >
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
                                    {insight?.campaign_name || 'N/A'}
                                  </td>
                                </tr>
                                <tr className="hover:bg-gray-50">
                                  <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                    status
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-600">
                                    広告のステータス（ACTIVE、PAUSED、DELETED、ARCHIVED等）
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-500">string</td>
                                  <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                    {item.status || insight?.status || 'N/A'}
                                  </td>
                                </tr>

                                {/* ===== パフォーマンス指標 ===== */}
                                <tr className="bg-gray-100">
                                  <td
                                    colSpan={4}
                                    className="px-4 py-2 font-bold text-sm text-gray-700"
                                  >
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
                                    {item.impressions?.toLocaleString() || 'N/A'}
                                  </td>
                                </tr>
                                <tr className="hover:bg-gray-50">
                                  <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                    reach
                                  </td>
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
                                    {item.frequency?.toFixed(2) || 'N/A'}
                                  </td>
                                </tr>
                                <tr className="hover:bg-gray-50">
                                  <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                    clicks
                                  </td>
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
                                    クリック率。表示回数に対するクリック数の割合（clicks ÷
                                    impressions × 100）
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-500">number</td>
                                  <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                    {item.ctr?.toFixed(2) || 'N/A'}%
                                  </td>
                                </tr>

                                {/* ===== コスト指標 ===== */}
                                <tr className="bg-gray-100">
                                  <td
                                    colSpan={4}
                                    className="px-4 py-2 font-bold text-sm text-gray-700"
                                  >
                                    💰 コスト指標
                                  </td>
                                </tr>
                                <tr className="hover:bg-gray-50">
                                  <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                    spend
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-600">
                                    消化金額。広告に費やされた総額（円）
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-500">number</td>
                                  <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                    ¥{item.spend?.toLocaleString() || 'N/A'}
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
                                    1000インプレッション単価。1000回表示あたりのコスト
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-500">number</td>
                                  <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                    ¥{item.cpm?.toFixed(0) || 'N/A'}
                                  </td>
                                </tr>

                                {/* ===== コンバージョン指標 ===== */}
                                <tr className="bg-gray-100">
                                  <td
                                    colSpan={4}
                                    className="px-4 py-2 font-bold text-sm text-gray-700"
                                  >
                                    🎯 コンバージョン指標
                                  </td>
                                </tr>
                                <tr className="hover:bg-gray-50">
                                  <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                    conversions
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-600">
                                    総コンバージョン数。設定した全てのコンバージョンイベントの合計
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-500">number</td>
                                  <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                    {item.conversions || 'N/A'}
                                  </td>
                                </tr>
                                <tr className="hover:bg-gray-50">
                                  <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                    conversions_1d_click
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-600">
                                    1日クリックアトリビューション。クリック後1日以内のコンバージョン
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-500">number</td>
                                  <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                    {item.conversions_1d_click || 'N/A'}
                                  </td>
                                </tr>
                                <tr className="hover:bg-gray-50">
                                  <td className="px-4 py-2 font-mono text-sm text-gray-900">cpa</td>
                                  <td className="px-4 py-2 text-sm text-gray-600">
                                    獲得単価。1コンバージョンあたりのコスト（spend ÷ conversions）
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-500">number</td>
                                  <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                    ¥{item.cpa?.toFixed(0) || 'N/A'}
                                  </td>
                                </tr>
                                <tr className="hover:bg-gray-50">
                                  <td className="px-4 py-2 font-mono text-sm text-gray-900">cvr</td>
                                  <td className="px-4 py-2 text-sm text-gray-600">
                                    コンバージョン率。クリック数に対するコンバージョンの割合
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-500">number</td>
                                  <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                    {item.cvr?.toFixed(2) || 'N/A'}%
                                  </td>
                                </tr>
                                <tr className="hover:bg-gray-50">
                                  <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                    roas
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-600">
                                    広告費用対効果。広告費に対する売上の倍率（revenue ÷ spend）
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-500">number</td>
                                  <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                    {item.roas?.toFixed(2) || 'N/A'}
                                  </td>
                                </tr>

                                <tr className="hover:bg-gray-50">
                                  <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                    conversion_values
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-600">
                                    コンバージョンの金額的価値。売上やLTV等の合計値
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-500">number</td>
                                  <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                    ¥{insight?.conversion_values?.toLocaleString() || 'N/A'}
                                  </td>
                                </tr>
                                <tr className="hover:bg-gray-50">
                                  <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                    cost_per_conversion
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-600">
                                    コンバージョン単価。1件のコンバージョンにかかった平均費用
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-500">number</td>
                                  <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                    ¥{insight?.cost_per_conversion?.toFixed(0) || 'N/A'}
                                  </td>
                                </tr>
                                <tr className="hover:bg-gray-50">
                                  <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                    revenue
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-600">
                                    収益。広告経由で発生した売上高
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-500">number</td>
                                  <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                    ¥{item.revenue?.toLocaleString() || 'N/A'}
                                  </td>
                                </tr>

                                {/* ===== ROASとパフォーマンス評価 ===== */}
                                <tr className="bg-gray-100">
                                  <td
                                    colSpan={4}
                                    className="px-4 py-2 font-bold text-sm text-gray-700"
                                  >
                                    📈 ROASとパフォーマンス評価
                                  </td>
                                </tr>
                                <tr className="hover:bg-gray-50">
                                  <td className="px-4 py-2 font-mono text-sm text-gray-900 align-top">
                                    purchase_roas
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-600 align-top">
                                    購入ROAS。購入イベントベースの広告費用対効果
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-500 align-top">
                                    object
                                  </td>
                                  <td className="px-4 py-2 text-sm">
                                    {insight?.purchase_roas ? (
                                      <div className="bg-purple-50 p-2 rounded text-xs">
                                        <div className="font-semibold text-purple-800 mb-1">
                                          購入ROAS詳細:
                                        </div>
                                        {Array.isArray(insight.purchase_roas) ? (
                                          insight.purchase_roas.map((roas: any, idx: number) => (
                                            <div
                                              key={idx}
                                              className="border-b border-purple-100 pb-1 mb-1 last:border-0"
                                            >
                                              <div className="space-y-1">
                                                <div>
                                                  <span className="text-purple-600">
                                                    アクションタイプ:
                                                  </span>
                                                  <span className="font-mono ml-1 text-xs">
                                                    {roas.action_type}
                                                  </span>
                                                </div>
                                                <div className="grid grid-cols-3 gap-1">
                                                  <div>
                                                    <span className="text-purple-600">
                                                      合計ROAS:
                                                    </span>
                                                    <span className="font-mono ml-1">
                                                      {roas.value || 0}
                                                    </span>
                                                    <span className="text-gray-500 text-xs ml-1">
                                                      (売上÷広告費)
                                                    </span>
                                                  </div>
                                                  <div>
                                                    <span className="text-purple-600">
                                                      1日クリック:
                                                    </span>
                                                    <span className="font-mono ml-1">
                                                      {roas['1d_click'] || '-'}
                                                    </span>
                                                  </div>
                                                  <div>
                                                    <span className="text-purple-600">
                                                      7日クリック:
                                                    </span>
                                                    <span className="font-mono ml-1">
                                                      {roas['7d_click'] || '-'}
                                                    </span>
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                          ))
                                        ) : (
                                          <div className="font-mono text-xs">
                                            {JSON.stringify(insight.purchase_roas)}
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="font-mono text-gray-900">N/A</span>
                                    )}
                                  </td>
                                </tr>
                                <tr className="hover:bg-gray-50">
                                  <td className="px-4 py-2 font-mono text-sm text-gray-900 align-top">
                                    website_purchase_roas
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-600 align-top">
                                    ウェブサイト購入ROAS。ECサイトでの購入に特化したROAS計測
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-500 align-top">
                                    object
                                  </td>
                                  <td className="px-4 py-2 text-sm">
                                    {insight?.website_purchase_roas ? (
                                      <div className="bg-indigo-50 p-2 rounded text-xs">
                                        <div className="font-semibold text-indigo-800 mb-1">
                                          ウェブサイト購入ROAS詳細:
                                        </div>
                                        {Array.isArray(insight.website_purchase_roas) ? (
                                          insight.website_purchase_roas.map(
                                            (roas: any, idx: number) => (
                                              <div
                                                key={idx}
                                                className="border-b border-indigo-100 pb-1 mb-1 last:border-0"
                                              >
                                                <div className="space-y-1">
                                                  <div>
                                                    <span className="text-indigo-600">
                                                      アクションタイプ:
                                                    </span>
                                                    <span className="font-mono ml-1 text-xs">
                                                      {roas.action_type}
                                                    </span>
                                                    <span className="text-gray-600 text-xs ml-1">
                                                      {roas.action_type?.includes(
                                                        'offsite_conversion'
                                                      ) && '(オフサイトコンバージョン)'}
                                                      {roas.action_type?.includes('fb_pixel') &&
                                                        '(Facebookピクセル計測)'}
                                                    </span>
                                                  </div>
                                                  <div className="grid grid-cols-3 gap-1">
                                                    <div>
                                                      <span className="text-indigo-600">
                                                        合計ROAS:
                                                      </span>
                                                      <span className="font-mono ml-1">
                                                        {parseFloat(roas.value || 0).toFixed(2)}
                                                      </span>
                                                      <span className="text-gray-500 text-xs ml-1">
                                                        {parseFloat(roas.value || 0) >= 1
                                                          ? '✓ 黒字'
                                                          : '⚠️ 赤字'}
                                                      </span>
                                                    </div>
                                                    <div>
                                                      <span className="text-indigo-600">1日:</span>
                                                      <span className="font-mono ml-1">
                                                        {parseFloat(roas['1d_click'] || 0).toFixed(
                                                          2
                                                        )}
                                                      </span>
                                                    </div>
                                                    <div>
                                                      <span className="text-indigo-600">7日:</span>
                                                      <span className="font-mono ml-1">
                                                        {parseFloat(roas['7d_click'] || 0).toFixed(
                                                          2
                                                        )}
                                                      </span>
                                                    </div>
                                                  </div>
                                                </div>
                                              </div>
                                            )
                                          )
                                        ) : (
                                          <div className="font-mono text-xs">
                                            {JSON.stringify(insight.website_purchase_roas)}
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="font-mono text-gray-900">N/A</span>
                                    )}
                                  </td>
                                </tr>
                                <tr className="hover:bg-gray-50">
                                  <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                    score
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-600">
                                    パフォーマンススコア。広告の総合的な効果を示す内部指標
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-500">number</td>
                                  <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                    {item.score?.toFixed(1) || 'N/A'}
                                  </td>
                                </tr>

                                {/* ===== 疲労度指標 ===== */}
                                <tr className="bg-gray-100">
                                  <td
                                    colSpan={4}
                                    className="px-4 py-2 font-bold text-sm text-gray-700"
                                  >
                                    🔥 疲労度指標
                                  </td>
                                </tr>
                                <tr className="hover:bg-gray-50">
                                  <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                    fatigue_score
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-600">
                                    総合疲労度スコア。0-100の値で、高いほど広告疲労が進んでいる
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-500">number</td>
                                  <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                    {item.fatigue_score?.toFixed(0) || 'N/A'}
                                  </td>
                                </tr>

                                <tr className="hover:bg-gray-50">
                                  <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                    fatigueScore
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-600">
                                    疲労度スコア（APIレスポンス）。広告の疲労度を示す独自指標
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-500">number</td>
                                  <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                    {insight?.fatigueScore?.toFixed(0) || 'N/A'}
                                  </td>
                                </tr>

                                {/* ===== 日付関連 ===== */}
                                <tr className="bg-gray-100">
                                  <td
                                    colSpan={4}
                                    className="px-4 py-2 font-bold text-sm text-gray-700"
                                  >
                                    📅 日付関連
                                  </td>
                                </tr>
                                <tr className="hover:bg-gray-50">
                                  <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                    date_start
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-600">
                                    データ期間の開始日。このデータが対象とする期間の始まり
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-500">string</td>
                                  <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                    {item.firstDate || insight?.date_start || 'N/A'}
                                  </td>
                                </tr>
                                <tr className="hover:bg-gray-50">
                                  <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                    date_stop
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-600">
                                    データ期間の終了日。このデータが対象とする期間の終わり
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-500">string</td>
                                  <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                    {item.lastDate || insight?.date_stop || 'N/A'}
                                  </td>
                                </tr>

                                <tr className="hover:bg-gray-50">
                                  <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                    firstDate
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-600">
                                    データ開始日（処理済み）。集計期間の最初の日付
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-500">string</td>
                                  <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                    {item.firstDate || 'N/A'}
                                  </td>
                                </tr>
                                <tr className="hover:bg-gray-50">
                                  <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                    lastDate
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-600">
                                    データ終了日（処理済み）。集計期間の最後の日付
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-500">string</td>
                                  <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                    {item.lastDate || 'N/A'}
                                  </td>
                                </tr>
                                <tr className="hover:bg-gray-50">
                                  <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                    dayCount
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-600">
                                    日数。データ取得期間の日数
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-500">number</td>
                                  <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                    {item.dayCount || 'N/A'}日
                                  </td>
                                </tr>

                                {/* ===== アクション関連 ===== */}
                                <tr className="bg-gray-100">
                                  <td
                                    colSpan={4}
                                    className="px-4 py-2 font-bold text-sm text-gray-700"
                                  >
                                    🎬 アクション関連
                                  </td>
                                </tr>
                                <tr className="hover:bg-gray-50">
                                  <td className="px-4 py-2 font-mono text-sm text-gray-900 align-top">
                                    actions
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-600 align-top">
                                    アクション配列。購入、登録、カート追加など様々なアクションの詳細データ
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-500 align-top">
                                    object[]
                                  </td>
                                  <td className="px-4 py-2 text-sm">
                                    {(item.actions || insight?.actions)?.length > 0 ? (
                                      <div className="space-y-2">
                                        <div className="font-mono text-gray-900">
                                          {(item.actions || insight?.actions)?.length}件
                                        </div>
                                        <div className="bg-blue-50 p-2 rounded text-xs">
                                          <div className="font-semibold text-blue-800 mb-1">
                                            アクション詳細:
                                          </div>
                                          {(item.actions || insight?.actions)?.map(
                                            (action: any, idx: number) => (
                                              <div
                                                key={idx}
                                                className="border-b border-blue-100 pb-1 mb-1 last:border-0"
                                              >
                                                <div className="grid grid-cols-2 gap-1">
                                                  <div>
                                                    <span className="text-blue-600">
                                                      action_type:
                                                    </span>
                                                    <span className="font-mono ml-1">
                                                      {action.action_type}
                                                    </span>
                                                  </div>
                                                  <div className="text-gray-700 text-xs italic">
                                                    {action.action_type?.includes('purchase') &&
                                                      '購入イベント'}
                                                    {action.action_type?.includes('add_to_cart') &&
                                                      'カート追加'}
                                                    {action.action_type?.includes('lead') &&
                                                      'リード獲得'}
                                                    {action.action_type?.includes('view_content') &&
                                                      'コンテンツ閲覧'}
                                                    {action.action_type?.includes(
                                                      'complete_registration'
                                                    ) && '登録完了'}
                                                    {action.action_type?.includes('link_click') &&
                                                      'リンククリック'}
                                                    {action.action_type?.includes(
                                                      'landing_page_view'
                                                    ) && 'LP表示'}
                                                    {action.action_type?.includes('omni_') &&
                                                      'オムニチャネル'}
                                                    {action.action_type?.includes(
                                                      'page_engagement'
                                                    ) && 'ページエンゲージメント'}
                                                    {action.action_type?.includes(
                                                      'post_engagement'
                                                    ) && '投稿エンゲージメント'}
                                                  </div>
                                                </div>
                                                <div className="grid grid-cols-3 gap-1 mt-1">
                                                  <div>
                                                    <span className="text-blue-600">合計:</span>
                                                    <span className="font-mono ml-1">
                                                      {action.value || 0}
                                                    </span>
                                                  </div>
                                                  <div>
                                                    <span className="text-blue-600">1日:</span>
                                                    <span className="font-mono ml-1">
                                                      {action['1d_click'] ||
                                                        action['1d_view'] ||
                                                        '-'}
                                                    </span>
                                                  </div>
                                                  <div>
                                                    <span className="text-blue-600">7日:</span>
                                                    <span className="font-mono ml-1">
                                                      {action['7d_click'] ||
                                                        action['7d_view'] ||
                                                        '-'}
                                                    </span>
                                                  </div>
                                                </div>
                                              </div>
                                            )
                                          )}
                                        </div>
                                      </div>
                                    ) : (
                                      <span className="font-mono text-gray-900">N/A</span>
                                    )}
                                  </td>
                                </tr>
                                <tr className="hover:bg-gray-50">
                                  <td className="px-4 py-2 font-mono text-sm text-gray-900 align-top">
                                    unique_actions
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-600 align-top">
                                    ユニークアクション配列。重複を除いたユーザー単位のアクションデータ
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-500 align-top">
                                    object[]
                                  </td>
                                  <td className="px-4 py-2 text-sm">
                                    {(item.unique_actions || insight?.unique_actions)?.length >
                                    0 ? (
                                      <div className="space-y-2">
                                        <div className="font-mono text-gray-900">
                                          {(item.unique_actions || insight?.unique_actions)?.length}
                                          件
                                        </div>
                                        <div className="bg-green-50 p-2 rounded text-xs max-h-64 overflow-y-auto">
                                          <div className="font-semibold text-green-800 mb-1">
                                            ユニークアクション詳細:
                                          </div>
                                          {(item.unique_actions || insight?.unique_actions)?.map(
                                            (action: any, idx: number) => (
                                              <div
                                                key={idx}
                                                className="border-b border-green-100 pb-1 mb-1 last:border-0"
                                              >
                                                <div className="grid grid-cols-2 gap-1">
                                                  <div>
                                                    <span className="text-green-600">
                                                      action_type:
                                                    </span>
                                                    <span className="font-mono ml-1">
                                                      {action.action_type}
                                                    </span>
                                                  </div>
                                                  <div className="text-gray-700 text-xs italic">
                                                    {action.action_type?.includes('purchase') &&
                                                      'ユニーク購入者数'}
                                                    {action.action_type?.includes('add_to_cart') &&
                                                      'ユニークカート追加者'}
                                                    {action.action_type?.includes('lead') &&
                                                      'ユニークリード数'}
                                                    {action.action_type?.includes('view_content') &&
                                                      'ユニーク閲覧者'}
                                                  </div>
                                                </div>
                                                <div className="grid grid-cols-3 gap-1 mt-1">
                                                  <div>
                                                    <span className="text-green-600">合計:</span>
                                                    <span className="font-mono ml-1">
                                                      {action.value || 0}人
                                                    </span>
                                                  </div>
                                                  <div>
                                                    <span className="text-green-600">1日:</span>
                                                    <span className="font-mono ml-1">
                                                      {action['1d_click'] || '-'}人
                                                    </span>
                                                  </div>
                                                  <div>
                                                    <span className="text-green-600">7日:</span>
                                                    <span className="font-mono ml-1">
                                                      {action['7d_click'] || '-'}人
                                                    </span>
                                                  </div>
                                                </div>
                                              </div>
                                            )
                                          )}
                                        </div>
                                      </div>
                                    ) : (
                                      <span className="font-mono text-gray-900">N/A</span>
                                    )}
                                  </td>
                                </tr>
                                <tr className="hover:bg-gray-50">
                                  <td className="px-4 py-2 font-mono text-sm text-gray-900 align-top">
                                    action_values
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-600 align-top">
                                    アクション価値。各アクションの金額的価値（購入金額等）
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-500 align-top">
                                    object
                                  </td>
                                  <td className="px-4 py-2 text-sm">
                                    {insight?.action_values ? (
                                      <div className="bg-yellow-50 p-2 rounded text-xs max-h-64 overflow-y-auto">
                                        <div className="font-semibold text-yellow-800 mb-1">
                                          アクション価値詳細:
                                        </div>
                                        {Array.isArray(insight.action_values) ? (
                                          insight.action_values.map((val: any, idx: number) => (
                                            <div
                                              key={idx}
                                              className="border-b border-yellow-100 pb-1 mb-1 last:border-0"
                                            >
                                              <div className="space-y-1">
                                                <div>
                                                  <span className="text-yellow-600">
                                                    アクション:
                                                  </span>
                                                  <span className="font-mono ml-1 text-xs">
                                                    {val.action_type}
                                                  </span>
                                                  <span className="text-gray-600 text-xs ml-1">
                                                    {val.action_type?.includes('purchase') &&
                                                      '(購入金額)'}
                                                    {val.action_type?.includes('add_to_cart') &&
                                                      '(カート金額)'}
                                                    {val.action_type?.includes('lead') &&
                                                      '(リード価値)'}
                                                  </span>
                                                </div>
                                                <div className="grid grid-cols-3 gap-1">
                                                  <div>
                                                    <span className="text-yellow-600">総価値:</span>
                                                    <span className="font-mono ml-1">
                                                      ¥{parseFloat(val.value || 0).toLocaleString()}
                                                    </span>
                                                  </div>
                                                  <div>
                                                    <span className="text-yellow-600">1日:</span>
                                                    <span className="font-mono ml-1">
                                                      ¥
                                                      {parseFloat(
                                                        val['1d_click'] || 0
                                                      ).toLocaleString()}
                                                    </span>
                                                  </div>
                                                  <div>
                                                    <span className="text-yellow-600">7日:</span>
                                                    <span className="font-mono ml-1">
                                                      ¥
                                                      {parseFloat(
                                                        val['7d_click'] || 0
                                                      ).toLocaleString()}
                                                    </span>
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                          ))
                                        ) : (
                                          <div className="font-mono text-xs">
                                            {JSON.stringify(insight.action_values)}
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="font-mono text-gray-900">N/A</span>
                                    )}
                                  </td>
                                </tr>
                                <tr className="hover:bg-gray-50">
                                  <td className="px-4 py-2 font-mono text-sm text-gray-900 align-top">
                                    cost_per_action_type
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-600 align-top">
                                    アクション別単価。各アクションタイプごとのコスト
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-500 align-top">
                                    object
                                  </td>
                                  <td className="px-4 py-2 text-sm">
                                    {insight?.cost_per_action_type ? (
                                      <div className="bg-rose-50 p-2 rounded text-xs max-h-64 overflow-y-auto">
                                        <div className="font-semibold text-rose-800 mb-1">
                                          アクション別単価詳細:
                                        </div>
                                        {Array.isArray(insight.cost_per_action_type) ? (
                                          insight.cost_per_action_type.map(
                                            (cost: any, idx: number) => (
                                              <div
                                                key={idx}
                                                className="border-b border-rose-100 pb-1 mb-1 last:border-0"
                                              >
                                                <div>
                                                  <span className="text-rose-600">アクション:</span>
                                                  <span className="font-mono ml-1 text-xs">
                                                    {cost.action_type}
                                                  </span>
                                                </div>
                                                <div className="grid grid-cols-3 gap-1 mt-1">
                                                  <div>
                                                    <span className="text-rose-600">単価:</span>
                                                    <span className="font-mono ml-1">
                                                      ¥{parseFloat(cost.value || 0).toFixed(0)}
                                                    </span>
                                                  </div>
                                                  <div>
                                                    <span className="text-rose-600">1日:</span>
                                                    <span className="font-mono ml-1">
                                                      ¥
                                                      {parseFloat(cost['1d_click'] || 0).toFixed(0)}
                                                    </span>
                                                  </div>
                                                  <div>
                                                    <span className="text-rose-600">7日:</span>
                                                    <span className="font-mono ml-1">
                                                      ¥
                                                      {parseFloat(cost['7d_click'] || 0).toFixed(0)}
                                                    </span>
                                                  </div>
                                                </div>
                                              </div>
                                            )
                                          )
                                        ) : (
                                          <div className="font-mono text-xs">
                                            {JSON.stringify(insight.cost_per_action_type)}
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="font-mono text-gray-900">N/A</span>
                                    )}
                                  </td>
                                </tr>
                                <tr className="hover:bg-gray-50">
                                  <td className="px-4 py-2 font-mono text-sm text-gray-900 align-top">
                                    cost_per_unique_action_type
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-600 align-top">
                                    ユニークアクション別単価。重複を除いたアクション単価
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-500 align-top">
                                    object
                                  </td>
                                  <td className="px-4 py-2 text-sm">
                                    {insight?.cost_per_unique_action_type ? (
                                      <div className="bg-amber-50 p-2 rounded text-xs max-h-64 overflow-y-auto">
                                        <div className="font-semibold text-amber-800 mb-1">
                                          ユニークアクション単価:
                                        </div>
                                        {Array.isArray(insight.cost_per_unique_action_type) ? (
                                          insight.cost_per_unique_action_type.map(
                                            (cost: any, idx: number) => (
                                              <div
                                                key={idx}
                                                className="border-b border-amber-100 pb-1 mb-1 last:border-0"
                                              >
                                                <div>
                                                  <span className="text-amber-600">
                                                    アクション:
                                                  </span>
                                                  <span className="font-mono ml-1 text-xs">
                                                    {cost.action_type}
                                                  </span>
                                                </div>
                                                <div className="text-xs text-gray-600 mb-1">
                                                  重複除外でユニークユーザーあたりのコスト
                                                </div>
                                                <div className="grid grid-cols-3 gap-1">
                                                  <div>
                                                    <span className="text-amber-600">単価:</span>
                                                    <span className="font-mono ml-1">
                                                      ¥{parseFloat(cost.value || 0).toFixed(0)}
                                                    </span>
                                                  </div>
                                                  <div>
                                                    <span className="text-amber-600">1日:</span>
                                                    <span className="font-mono ml-1">
                                                      ¥
                                                      {parseFloat(cost['1d_click'] || 0).toFixed(0)}
                                                    </span>
                                                  </div>
                                                  <div>
                                                    <span className="text-amber-600">7日:</span>
                                                    <span className="font-mono ml-1">
                                                      ¥
                                                      {parseFloat(cost['7d_click'] || 0).toFixed(0)}
                                                    </span>
                                                  </div>
                                                </div>
                                              </div>
                                            )
                                          )
                                        ) : (
                                          <div className="font-mono text-xs">
                                            {JSON.stringify(insight.cost_per_unique_action_type)}
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="font-mono text-gray-900">N/A</span>
                                    )}
                                  </td>
                                </tr>

                                {/* ===== デバッグ・詳細データ ===== */}
                                <tr className="bg-gray-100">
                                  <td
                                    colSpan={4}
                                    className="px-4 py-2 font-bold text-sm text-gray-700"
                                  >
                                    🔍 デバッグ・詳細データ
                                  </td>
                                </tr>
                                <tr className="hover:bg-gray-50">
                                  <td className="px-4 py-2 font-mono text-sm text-gray-900 align-top">
                                    conversion_debug
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-600 align-top">
                                    コンバージョンデバッグ情報。トラッキング問題の診断用データ
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-500 align-top">
                                    object
                                  </td>
                                  <td className="px-4 py-2 text-sm">
                                    {insight?.conversion_debug ? (
                                      <div className="bg-red-50 p-2 rounded text-xs">
                                        <div className="font-semibold text-red-800 mb-1">
                                          コンバージョントラッキングデバッグ:
                                        </div>
                                        {typeof insight.conversion_debug === 'object' ? (
                                          <div className="space-y-1">
                                            {Object.entries(insight.conversion_debug).map(
                                              ([key, value]: [string, any]) => (
                                                <div
                                                  key={key}
                                                  className="border-b border-red-100 pb-1 last:border-0"
                                                >
                                                  <div className="grid grid-cols-2 gap-2">
                                                    <div>
                                                      <span className="text-red-600 font-semibold">
                                                        {key}:
                                                      </span>
                                                    </div>
                                                    <div className="text-gray-700">
                                                      {key === 'calculated_cv' && (
                                                        <span className="text-xs">
                                                          計算されたCV数
                                                        </span>
                                                      )}
                                                      {key === 'action_type_used' && (
                                                        <span className="text-xs">
                                                          使用されたアクションタイプ
                                                        </span>
                                                      )}
                                                      {key === 'is_valid' && (
                                                        <span className="text-xs">
                                                          データ検証結果
                                                        </span>
                                                      )}
                                                      {key === 'missing_data' && (
                                                        <span className="text-xs">欠損データ</span>
                                                      )}
                                                      {key === 'pixel_status' && (
                                                        <span className="text-xs">
                                                          ピクセル状態
                                                        </span>
                                                      )}
                                                    </div>
                                                  </div>
                                                  <div className="mt-1 font-mono text-xs bg-white p-1 rounded">
                                                    {typeof value === 'object'
                                                      ? JSON.stringify(value)
                                                      : String(value)}
                                                  </div>
                                                </div>
                                              )
                                            )}
                                          </div>
                                        ) : (
                                          <div className="font-mono text-xs">
                                            {JSON.stringify(insight.conversion_debug)}
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="font-mono text-gray-900">N/A</span>
                                    )}
                                  </td>
                                </tr>
                                <tr className="hover:bg-gray-50">
                                  <td className="px-4 py-2 font-mono text-sm text-gray-900 align-top">
                                    conversions_1d_click
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-600 align-top">
                                    1日クリックアトリビューション詳細。クリック後1日以内の詳細CV
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-500 align-top">
                                    object
                                  </td>
                                  <td className="px-4 py-2 text-sm">
                                    {item.conversions_1d_click || insight?.conversions_1d_click ? (
                                      <div className="bg-orange-50 p-2 rounded text-xs">
                                        <div className="font-semibold text-orange-800 mb-1">
                                          1日クリックCV詳細:
                                        </div>
                                        <div className="font-mono">
                                          {typeof (
                                            item.conversions_1d_click ||
                                            insight?.conversions_1d_click
                                          ) === 'number' ? (
                                            <span className="text-orange-700">
                                              合計:{' '}
                                              {item.conversions_1d_click ||
                                                insight?.conversions_1d_click}
                                              件
                                              <span className="text-xs text-gray-600 ml-2">
                                                (クリック後24時間以内のコンバージョン)
                                              </span>
                                            </span>
                                          ) : (
                                            <span className="text-xs">
                                              {JSON.stringify(
                                                item.conversions_1d_click ||
                                                  insight?.conversions_1d_click
                                              )}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    ) : (
                                      <span className="font-mono text-gray-900">null</span>
                                    )}
                                  </td>
                                </tr>
                                <tr className="hover:bg-gray-50">
                                  <td className="px-4 py-2 font-mono text-sm text-gray-900 align-top">
                                    metrics
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-600 align-top">
                                    メトリクス集計オブジェクト。各種指標の集約データ
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-500 align-top">
                                    object
                                  </td>
                                  <td className="px-4 py-2 text-sm">
                                    {item.metrics ? (
                                      <div className="bg-cyan-50 p-2 rounded text-xs max-h-64 overflow-y-auto">
                                        <div className="font-semibold text-cyan-800 mb-1">
                                          メトリクス詳細:
                                        </div>
                                        <div className="space-y-1">
                                          {Object.entries(item.metrics).map(
                                            ([key, value]: [string, any]) => (
                                              <div
                                                key={key}
                                                className="grid grid-cols-2 gap-2 border-b border-cyan-100 pb-1 last:border-0"
                                              >
                                                <div className="font-mono text-cyan-700">
                                                  {key}:
                                                </div>
                                                <div className="font-mono text-gray-700">
                                                  {typeof value === 'number'
                                                    ? value.toLocaleString()
                                                    : String(value)}
                                                  <span className="text-xs text-gray-500 ml-1">
                                                    {key === 'impressions' && '(表示回数)'}
                                                    {key === 'clicks' && '(クリック数)'}
                                                    {key === 'spend' && '(円)'}
                                                    {key === 'ctr' && '(%)'}
                                                    {key === 'cpm' && '(千回あたり)'}
                                                    {key === 'cpc' && '(クリック単価)'}
                                                    {key === 'frequency' && '(平均表示回数)'}
                                                    {key === 'reach' && '(リーチ数)'}
                                                    {key === 'conversions' && '(CV数)'}
                                                    {key === 'cvr' && '(CV率%)'}
                                                    {key === 'cpa' && '(獲得単価)'}
                                                  </span>
                                                </div>
                                              </div>
                                            )
                                          )}
                                        </div>
                                      </div>
                                    ) : (
                                      <span className="font-mono text-gray-900">N/A</span>
                                    )}
                                  </td>
                                </tr>
                                <tr className="hover:bg-gray-50">
                                  <td className="px-4 py-2 font-mono text-sm text-gray-900 align-top">
                                    dailyData
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-600 align-top">
                                    日別データ配列。time_increment=1で取得した日次パフォーマンス
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-500 align-top">
                                    object
                                  </td>
                                  <td className="px-4 py-2 text-sm">
                                    {item.dailyData ? (
                                      <div className="bg-teal-50 p-2 rounded text-xs">
                                        <div className="font-semibold text-teal-800 mb-1">
                                          日別データ詳細:{' '}
                                          {Array.isArray(item.dailyData)
                                            ? item.dailyData.length
                                            : Object.keys(item.dailyData).length}
                                          日分
                                        </div>
                                        {Array.isArray(item.dailyData) &&
                                          item.dailyData.length > 0 && (
                                            <div className="space-y-1 max-h-64 overflow-y-auto">
                                              <div className="text-xs text-teal-700 mb-1">
                                                全{item.dailyData.length}日間のデータ:
                                              </div>
                                              {item.dailyData.map((day: any, idx: number) => (
                                                <div
                                                  key={idx}
                                                  className="border-b border-teal-100 pb-1 last:border-0"
                                                >
                                                  <div className="font-mono text-xs text-teal-800">
                                                    日付: {day.date}
                                                  </div>
                                                  <div className="grid grid-cols-4 gap-1 text-xs mt-1">
                                                    <div>
                                                      <span className="text-teal-600">表示:</span>{' '}
                                                      {day.impressions?.toLocaleString()}
                                                    </div>
                                                    <div>
                                                      <span className="text-teal-600">
                                                        クリック:
                                                      </span>{' '}
                                                      {day.clicks}
                                                    </div>
                                                    <div>
                                                      <span className="text-teal-600">費用:</span> ¥
                                                      {day.spend?.toLocaleString()}
                                                    </div>
                                                    <div>
                                                      <span className="text-teal-600">CV:</span>{' '}
                                                      {day.conversions || 0}
                                                    </div>
                                                  </div>
                                                  {day.ctr && (
                                                    <div className="grid grid-cols-3 gap-1 text-xs mt-1">
                                                      <div>
                                                        <span className="text-teal-600">CTR:</span>{' '}
                                                        {day.ctr}%
                                                      </div>
                                                      <div>
                                                        <span className="text-teal-600">CPM:</span>{' '}
                                                        ¥{day.cpm}
                                                      </div>
                                                      <div>
                                                        <span className="text-teal-600">CPC:</span>{' '}
                                                        ¥{day.cpc}
                                                      </div>
                                                    </div>
                                                  )}
                                                  {day.fatigue_score !== undefined && (
                                                    <div className="mt-1">
                                                      <span className="text-teal-600 text-xs">
                                                        疲労度スコア:
                                                      </span>
                                                      <span
                                                        className={`font-mono ml-1 text-xs ${
                                                          day.fatigue_score > 70
                                                            ? 'text-red-600'
                                                            : day.fatigue_score > 40
                                                              ? 'text-yellow-600'
                                                              : 'text-green-600'
                                                        }`}
                                                      >
                                                        {day.fatigue_score}
                                                      </span>
                                                    </div>
                                                  )}
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                      </div>
                                    ) : (
                                      <span className="font-mono text-gray-900">0日分</span>
                                    )}
                                  </td>
                                </tr>

                                {/* ===== 品質評価指標（API v23.0） ===== */}
                                <tr className="bg-gray-100">
                                  <td
                                    colSpan={4}
                                    className="px-4 py-2 font-bold text-sm text-gray-700"
                                  >
                                    ⭐ 品質評価指標
                                    <span className="ml-2 text-xs font-normal text-blue-600">
                                      (API v23.0 - 2019年4月30日より relevance_score から移行)
                                    </span>
                                  </td>
                                </tr>
                                <tr className="hover:bg-gray-50">
                                  <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                    quality_ranking
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-600">
                                    品質ランキング。広告の品質を他の広告と比較した評価
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-500">string</td>
                                  <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                    <span
                                      className={`inline-flex px-2 py-1 text-xs rounded-full ${
                                        insight?.quality_ranking === 'above_average'
                                          ? 'bg-green-100 text-green-800'
                                          : insight?.quality_ranking === 'average'
                                            ? 'bg-yellow-100 text-yellow-800'
                                            : insight?.quality_ranking === 'below_average'
                                              ? 'bg-red-100 text-red-800'
                                              : 'bg-gray-100 text-gray-800'
                                      }`}
                                    >
                                      {insight?.quality_ranking || 'N/A'}
                                    </span>
                                  </td>
                                </tr>
                                <tr className="hover:bg-gray-50">
                                  <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                    engagement_rate_ranking
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-600">
                                    エンゲージメント率ランキング。いいね、コメント、シェア等の反応率評価
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-500">string</td>
                                  <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                    <span
                                      className={`inline-flex px-2 py-1 text-xs rounded-full ${
                                        insight?.engagement_rate_ranking === 'above_average'
                                          ? 'bg-green-100 text-green-800'
                                          : insight?.engagement_rate_ranking === 'average'
                                            ? 'bg-yellow-100 text-yellow-800'
                                            : insight?.engagement_rate_ranking === 'below_average'
                                              ? 'bg-red-100 text-red-800'
                                              : 'bg-gray-100 text-gray-800'
                                      }`}
                                    >
                                      {insight?.engagement_rate_ranking || 'N/A'}
                                    </span>
                                  </td>
                                </tr>
                                <tr className="hover:bg-gray-50">
                                  <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                    conversion_rate_ranking
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-600">
                                    コンバージョン率ランキング。目標達成率を他の広告と比較した評価
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-500">string</td>
                                  <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                    <span
                                      className={`inline-flex px-2 py-1 text-xs rounded-full ${
                                        insight?.conversion_rate_ranking === 'above_average'
                                          ? 'bg-green-100 text-green-800'
                                          : insight?.conversion_rate_ranking === 'average'
                                            ? 'bg-yellow-100 text-yellow-800'
                                            : insight?.conversion_rate_ranking === 'below_average'
                                              ? 'bg-red-100 text-red-800'
                                              : 'bg-gray-100 text-gray-800'
                                      }`}
                                    >
                                      {insight?.conversion_rate_ranking || 'N/A'}
                                    </span>
                                  </td>
                                </tr>

                                {/* ===== 動画メトリクス（API v23.0） ===== */}
                                <tr className="bg-gray-100">
                                  <td
                                    colSpan={4}
                                    className="px-4 py-2 font-bold text-sm text-gray-700"
                                  >
                                    🎬 動画メトリクス
                                    <span className="ml-2 text-xs font-normal text-gray-600">
                                      (動画広告のみ利用可能)
                                    </span>
                                  </td>
                                </tr>
                                <tr className="hover:bg-gray-50">
                                  <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                    video_play_actions
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-600">
                                    動画再生アクション。動画が再生された回数
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-500">array</td>
                                  <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                    {insight?.video_play_actions?.[0]?.value || 'N/A'}
                                  </td>
                                </tr>
                                <tr className="hover:bg-gray-50">
                                  <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                    video_p25_watched_actions
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-600">
                                    25%視聴完了。動画の25%以上が視聴された回数
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-500">array</td>
                                  <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                    {insight?.video_p25_watched_actions?.[0]?.value || 'N/A'}
                                  </td>
                                </tr>
                                <tr className="hover:bg-gray-50">
                                  <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                    video_p50_watched_actions
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-600">
                                    50%視聴完了。動画の半分以上が視聴された回数
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-500">array</td>
                                  <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                    {insight?.video_p50_watched_actions?.[0]?.value || 'N/A'}
                                  </td>
                                </tr>
                                <tr className="hover:bg-gray-50">
                                  <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                    video_p75_watched_actions
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-600">
                                    75%視聴完了。動画の75%以上が視聴された回数
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-500">array</td>
                                  <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                    {insight?.video_p75_watched_actions?.[0]?.value || 'N/A'}
                                  </td>
                                </tr>
                                <tr className="hover:bg-gray-50">
                                  <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                    video_p100_watched_actions
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-600">
                                    完全視聴。動画が最後まで視聴された回数
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-500">array</td>
                                  <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                    {insight?.video_p100_watched_actions?.[0]?.value || 'N/A'}
                                  </td>
                                </tr>
                                <tr className="hover:bg-gray-50">
                                  <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                    video_thruplay_watched_actions
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-600">
                                    ThruPlay視聴。15秒以上または全体（短い方）を視聴した回数
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-500">array</td>
                                  <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                    {insight?.video_thruplay_watched_actions?.[0]?.value || 'N/A'}
                                  </td>
                                </tr>

                                {/* ===== リンククリック詳細（API v23.0） ===== */}
                                <tr className="bg-gray-100">
                                  <td
                                    colSpan={4}
                                    className="px-4 py-2 font-bold text-sm text-gray-700"
                                  >
                                    🔗 リンククリック詳細
                                  </td>
                                </tr>
                                <tr className="hover:bg-gray-50">
                                  <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                    inline_link_clicks
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-600">
                                    広告内リンククリック。広告内のリンクがクリックされた総回数
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-500">number</td>
                                  <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                    {insight?.inline_link_clicks?.toLocaleString() || 'N/A'}
                                  </td>
                                </tr>
                                <tr className="hover:bg-gray-50">
                                  <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                    inline_link_click_ctr
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-600">
                                    広告内リンクCTR。インプレッションに対する広告内リンククリック率
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-500">number</td>
                                  <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                    {insight?.inline_link_click_ctr
                                      ? `${parseFloat(insight.inline_link_click_ctr).toFixed(2)}%`
                                      : 'N/A'}
                                  </td>
                                </tr>
                                <tr className="hover:bg-gray-50">
                                  <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                    unique_inline_link_clicks
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-600">
                                    ユニーク広告内リンククリック。重複を除いたユニークユーザー数
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-500">number</td>
                                  <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                    {insight?.unique_inline_link_clicks?.toLocaleString() || 'N/A'}
                                  </td>
                                </tr>
                                <tr className="hover:bg-gray-50">
                                  <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                    outbound_clicks
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-600">
                                    外部クリック。Facebook/Instagram外へのリンククリック数
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-500">array</td>
                                  <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                    {insight?.outbound_clicks?.[0]?.value || 'N/A'}
                                  </td>
                                </tr>

                                {/* ===== 廃止されたフィールド ===== */}
                                <tr className="bg-red-50">
                                  <td
                                    colSpan={4}
                                    className="px-4 py-2 font-bold text-sm text-red-700"
                                  >
                                    ⚠️ 廃止されたフィールド
                                  </td>
                                </tr>
                                <tr className="hover:bg-red-50">
                                  <td className="px-4 py-2 font-mono text-sm text-gray-900 line-through">
                                    relevance_score
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-600">
                                    <span className="text-red-600">【廃止】</span>{' '}
                                    2019年4月30日に廃止。 quality_ranking, engagement_rate_ranking,
                                    conversion_rate_ranking に置き換え
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-500">-</td>
                                  <td className="px-4 py-2 font-mono text-sm text-gray-500">
                                    廃止済み
                                  </td>
                                </tr>
                              </tbody>
                            </table>

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
                                    quality_ranking, engagement_rate_ranking,
                                    conversion_rate_ranking
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
                          </div>
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
