import React, { Fragment, useState } from 'react'
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
  item: FatigueData
  insight: any
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

export function CreativeDetailModal({ isOpen, onClose, item, insight }: CreativeDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'metrics' | 'platform'>('metrics')

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
                  </nav>
                </div>

                {/* Content - Conditional based on active tab */}
                {activeTab === 'metrics' ? (
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
