import React, { Fragment, useState, useEffect } from 'react'
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
import { MultiLineChart } from './MultiLineChart'

interface CreativeDetailModalProps {
  isOpen: boolean
  onClose: () => void
  item: FatigueData | any // AggregatedCreativeも受け入れる
  insight: any
  accessToken?: string // アクセストークン
  accountId?: string // アカウントID
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
            />
          ) : null}
        </div>
      )}
    </div>
  )
}

export function CreativeDetailModal({
  isOpen,
  onClose,
  item,
  insight,
  accessToken,
  accountId,
}: CreativeDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'metrics' | 'platform' | 'daily' | 'raw'>('metrics')
  const [dailyData, setDailyData] = useState<any[]>([]) // 日別データ
  const [isLoadingDaily, setIsLoadingDaily] = useState(false) // ローディング状態
  const [dailyDataError, setDailyDataError] = useState<string | null>(null) // エラー状態

  // 日別データがあるかチェック（既存データまたは取得したデータ）
  const hasDailyData = (item.dailyData && item.dailyData.length > 0) || dailyData.length > 0

  // モーダルが開かれた時に日別データを取得
  useEffect(() => {
    if (isOpen && item.adId && accessToken && accountId) {
      fetchDailyData()
    }
  }, [isOpen, item.adId, accessToken, accountId])

  // 日別データを取得する関数
  const fetchDailyData = async () => {
    setIsLoadingDaily(true)
    setDailyDataError(null)

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

      const params = new URLSearchParams({
        access_token: accessToken,
        time_increment: '1', // 日別データを取得
        date_preset: 'last_30d', // 過去30日間
        fields: 'ad_id,ad_name,impressions,clicks,spend,ctr,cpc,cpm,frequency,conversions,reach',
        filtering: `[{"field":"ad.id","operator":"IN","value":["${item.adId}"]}]`,
        limit: '100',
      })

      const response = await fetch(`${url}?${params}`)
      const data = await response.json()

      if (data.error) {
        throw new Error(data.error.message || '日別データの取得に失敗しました')
      }

      // 日別データをフォーマット
      const formattedDailyData = (data.data || []).map((day: any) => ({
        date: day.date_start,
        impressions: day.impressions || 0,
        clicks: day.clicks || 0,
        spend: parseFloat(day.spend || '0'),
        ctr: parseFloat(day.ctr || '0'),
        cpc: parseFloat(day.cpc || '0'),
        cpm: parseFloat(day.cpm || '0'),
        frequency: parseFloat(day.frequency || '0'),
        conversions: day.conversions || 0,
        reach: day.reach || 0,
        fatigue_score: calculateFatigueScore(day), // 疲労度スコア計算
      }))

      setDailyData(formattedDailyData)
      console.log('日別データ取得成功:', formattedDailyData)
    } catch (error) {
      console.error('日別データ取得エラー:', error)
      setDailyDataError(error instanceof Error ? error.message : '日別データの取得に失敗しました')
    } finally {
      setIsLoadingDaily(false)
    }
  }

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
  const platformData = React.useMemo(() => {
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

  const getEngagementStatus = (engagementRate: number, isReel: boolean = false) => {
    const benchmark = isReel ? 1.23 : 0.7
    if (engagementRate < benchmark * 0.7) return 'danger'
    if (engagementRate < benchmark * 0.9) return 'warning'
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
                      onClick={() => setActiveTab('timeseries')}
                      className={`${
                        activeTab === 'timeseries'
                          ? 'border-indigo-500 text-indigo-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
                    >
                      <ChartBarIcon className="h-4 w-4" />
                      時系列分析
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

                      {/* 集計行 */}
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                        <div className="grid grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">合計表示回数:</span>
                            <span className="ml-2 font-semibold">
                              {dailyData.length > 0
                                ? dailyData
                                    .reduce((sum, day) => sum + day.impressions, 0)
                                    .toLocaleString()
                                : (item.impressions || 0).toLocaleString()}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600">合計クリック:</span>
                            <span className="ml-2 font-semibold">
                              {dailyData.length > 0
                                ? dailyData
                                    .reduce((sum, day) => sum + day.clicks, 0)
                                    .toLocaleString()
                                : (item.clicks || 0).toLocaleString()}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600">合計消化金額:</span>
                            <span className="ml-2 font-semibold">
                              ¥
                              {dailyData.length > 0
                                ? dailyData
                                    .reduce((sum, day) => sum + day.spend, 0)
                                    .toLocaleString()
                                : (item.spend || 0).toLocaleString()}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600">合計CV:</span>
                            <span className="ml-2 font-semibold">
                              {dailyData.length > 0
                                ? dailyData.reduce((sum, day) => sum + day.conversions, 0)
                                : item.conversions || 0}
                            </span>
                          </div>
                        </div>
                      </div>
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
                      />

                      <MetricRow
                        label="インプレッション"
                        value={item.metrics.impressions}
                        description="表示回数"
                        showChart={true}
                        metricType="impressions"
                        chartType="area"
                      />

                      <MetricRow
                        label="Frequency"
                        value={item.metrics.frequency}
                        thresholdStatus={getFrequencyStatus(item.metrics.frequency)}
                        description="3.5を超えると危険水準"
                        showChart={true}
                        chartThreshold={3.5}
                        metricType="frequency"
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
                                {/* 基本情報 */}
                                <tr className="hover:bg-gray-50">
                                  <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                    ad_id
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-600">
                                    広告の一意識別子。広告を特定するための固有ID
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-500">string</td>
                                  <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                    {item.adId || 'N/A'}
                                  </td>
                                </tr>
                                <tr className="hover:bg-gray-50">
                                  <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                    ad_name
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-600">
                                    広告の名称。管理画面で設定した広告名
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-500">string</td>
                                  <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                    {item.adName || 'N/A'}
                                  </td>
                                </tr>
                                <tr className="hover:bg-gray-50">
                                  <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                    status
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-600">
                                    広告のステータス（ACTIVE、PAUSED、DELETED等）
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-500">string</td>
                                  <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                    {item.status || insight?.status || 'N/A'}
                                  </td>
                                </tr>

                                {/* パフォーマンス指標 */}
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

                                {/* コスト指標 */}
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

                                {/* コンバージョン指標 */}
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

                                {/* 疲労度指標 */}
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

                                {/* 日付関連 */}
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

                                {/* アクション関連 */}
                                <tr className="hover:bg-gray-50">
                                  <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                    actions
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-600">
                                    アクション配列。購入、登録、カート追加など様々なアクションの詳細データ
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-500">object[]</td>
                                  <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                    {(item.actions || insight?.actions)?.length || 0}件
                                  </td>
                                </tr>
                                <tr className="hover:bg-gray-50">
                                  <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                    unique_actions
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-600">
                                    ユニークアクション配列。重複を除いたユーザー単位のアクションデータ
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-500">object[]</td>
                                  <td className="px-4 py-2 font-mono text-sm text-gray-900">
                                    {(item.unique_actions || insight?.unique_actions)?.length || 0}
                                    件
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
                                  • <span className="font-mono">video_metrics</span>:
                                  動画広告の詳細な視聴データ（再生率、完了率など）
                                </li>
                                <li>
                                  • <span className="font-mono">cost_per_action_type</span>:
                                  アクション毎のコスト分析が可能
                                </li>
                                <li>
                                  • <span className="font-mono">relevance_score</span>:
                                  広告の関連性スコア（1-10）による品質評価
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
