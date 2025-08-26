import { Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { FatigueData } from '@/types'
import { SimplePhoneMockup } from './SimplePhoneMockup'
import { MiniFrequencyChart } from './MiniFrequencyChart'
import { MiniMetricChart, MetricType } from './MiniMetricChart'

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
  chartType
}: MetricRowProps) {
  const formatValue = (val: number | string) => {
    if (typeof val === 'number') {
      return val.toLocaleString('ja-JP', { maximumFractionDigits: 2 })
    }
    return val
  }

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'danger': return 'text-red-600'
      case 'warning': return 'text-yellow-600'
      case 'safe': return 'text-green-600'
      default: return 'text-gray-600'
    }
  }

  return (
    <div className="py-2 border-b border-gray-100 last:border-b-0">
      <div className="flex justify-between items-center">
        <div>
          <span className="text-sm font-medium text-gray-700">{label}</span>
          {description && (
            <p className="text-xs text-gray-500 mt-1">{description}</p>
          )}
        </div>
        <div className="text-right">
          {!showChart && (
            <>
              <span className={`text-sm font-semibold ${getStatusColor(thresholdStatus)}`}>
                {unit === '¥' ? (
                  <>{unit}{formatValue(value)}</>
                ) : (
                  <>{formatValue(value)}{unit && <span className="text-gray-400 ml-1">{unit}</span>}</>
                )}
              </span>
              {thresholdStatus === 'danger' && (
                <p className="text-xs text-red-500">危険水準</p>
              )}
              {thresholdStatus === 'warning' && (
                <p className="text-xs text-yellow-600">注意水準</p>
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
            <MiniFrequencyChart 
              data={chartData}
              currentValue={value}
              threshold={chartThreshold}
            />
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
  insight
}: CreativeDetailModalProps) {
  
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
              <Dialog.Panel className="w-full max-w-6xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
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

                {/* Content */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left Column - Basic Metrics */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h5 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">基本指標</h5>
                    
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
                      value={(item.metrics.conversions || 0) > 0 ? Math.ceil(item.metrics.spend / (item.metrics.conversions || 1)) : 0}
                      unit="¥"
                      description="1件あたりの獲得コスト"
                    />
                  </div>

                  {/* Right Column - Instagram Metrics & Preview */}
                  <div className="space-y-4">
                    {/* Instagram Metrics */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h5 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">Instagram特有のメトリクス</h5>
                      
                      {item.metrics.instagram_metrics ? (
                        <>
                          <MetricRow 
                            label="Profile Visit Rate" 
                            value={item.metrics.instagram_metrics.profile_views}
                            description="プロフィール訪問数"
                          />
                          
                          <MetricRow 
                            label="Engagement Rate" 
                            value={item.metrics.instagram_metrics.engagement_rate}
                            unit="%"
                            thresholdStatus={getEngagementStatus(item.metrics.instagram_metrics.engagement_rate)}
                            description="業界平均0.7%、Reelsでは1.23%"
                          />
                        </>
                      ) : (
                        <>
                          <MetricRow 
                            label="Profile Visit Rate" 
                            value="データなし"
                            description="Instagram広告でない、またはデータが不足"
                          />
                          
                          <MetricRow 
                            label="Engagement Rate" 
                            value="データなし"
                            description="Instagram広告でない、またはデータが不足"
                          />
                        </>
                      )}

                      <div className="mt-4 p-3 bg-green-50 rounded-lg">
                        <p className="text-sm text-green-800">
                          <strong>✓ 改善完了:</strong> Instagram特有のメトリクスは
                          Meta API の actions フィールドから取得しています。
                        </p>
                      </div>
                    </div>
                    
                    {/* スマートフォンモックアップ */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h6 className="text-sm font-semibold text-gray-700 mb-3">広告プレビュー（モックアップ）</h6>
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
                      <p className="text-xs text-gray-500 text-center mt-2">
                        ※ 実際のクリエイティブデータが利用できない場合は、プレースホルダーが表示されます
                      </p>
                    </div>
                  </div>
                </div>

                {/* Fatigue Analysis */}
                <div className="bg-gray-50 rounded-lg p-4 mt-6">
                  <h5 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">広告疲労度分析</h5>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-white rounded-lg shadow">
                      <h6 className="text-sm font-medium text-gray-700 mb-2">クリエイティブの疲労</h6>
                      <div className={`text-3xl font-bold ${getCtrStatus(item.metrics.ctr) === 'danger' ? 'text-red-600' : 'text-gray-600'}`}>
                        {getCtrStatus(item.metrics.ctr) === 'danger' ? '高' : '低'}
                      </div>
                      <p className="text-xs text-gray-500 mt-2">CTR低下率がベースラインから25％を下回るなど、広告コンテンツ自体が陳腐化しているケース。</p>
                    </div>
                    
                    <div className="text-center p-4 bg-white rounded-lg shadow">
                      <h6 className="text-sm font-medium text-gray-700 mb-2">視聴者側の疲労</h6>
                      <div className={`text-3xl font-bold ${getFrequencyStatus(item.metrics.frequency) === 'danger' ? 'text-red-600' : 'text-gray-600'}`}>
                        {getFrequencyStatus(item.metrics.frequency) === 'danger' ? '高' : '低'}
                      </div>
                      <p className="text-xs text-gray-500 mt-2">Frequencyが3.5を超えるなど、単一の視聴者に多く表示されすぎてしまっているケース</p>
                    </div>
                    
                    <div className="text-center p-4 bg-white rounded-lg shadow">
                      <h6 className="text-sm font-medium text-gray-700 mb-2">Metaアルゴリズムによる疲労</h6>
                      <div className={`text-3xl font-bold ${getCpmStatus(item.metrics.cpm) === 'danger' ? 'text-red-600' : 'text-gray-600'}`}>
                        {getCpmStatus(item.metrics.cpm) === 'danger' ? '高' : '低'}
                      </div>
                      <p className="text-xs text-gray-500 mt-2">CPM上昇率がベースラインから20％を超えるなど、meta側が動画の露出を減らしているケース</p>
                    </div>
                  </div>

                  {/* 総合スコア */}
                  <div className="mt-6 text-center">
                    <div className="inline-flex items-center justify-center">
                      <div className="text-center p-6 bg-white rounded-lg shadow-lg">
                        <h6 className="text-lg font-semibold text-gray-700 mb-2">総合疲労度スコア</h6>
                        <div className={`text-4xl font-bold ${
                          item.score >= 80 ? 'text-red-600' :
                          item.score >= 60 ? 'text-yellow-600' :
                          'text-green-600'
                        }`}>
                          {item.score}
                        </div>
                        <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mt-2 ${
                          item.status === 'critical' ? 'bg-red-100 text-red-800' :
                          item.status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                          item.status === 'caution' ? 'bg-orange-100 text-orange-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {item.status}
                        </div>
                        <p className="text-sm text-gray-500 mt-2">
                          上記３つの項目を用いた総合スコア
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}