import { useState } from 'react'
import { FatigueData } from '@/types'
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import { SimplePhoneMockup } from './SimplePhoneMockup'
import { MiniFrequencyChart } from './MiniFrequencyChart'
import { MiniMetricChart, MetricType } from './MiniMetricChart'

interface FatigueAccordionProps {
  data: FatigueData[]
  insights?: any[] // 元のAdInsightデータ
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

export function FatigueAccordion({ data, insights }: FatigueAccordionProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

  const toggleExpanded = (uniqueKey: string) => {
    const newExpanded = new Set(expandedItems)
    if (expandedItems.has(uniqueKey)) {
      newExpanded.delete(uniqueKey)
    } else {
      newExpanded.add(uniqueKey)
    }
    setExpandedItems(newExpanded)
  }

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
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {data.map((item, index) => {
        const uniqueKey = `${item.adId}-${index}`
        const isExpanded = expandedItems.has(uniqueKey)
        
        // Instagram Reelかどうかを判定
        const isInstagramReel = item.metrics.instagram_metrics?.publisher_platform?.toLowerCase().includes('reel') || 
                                insights?.find(i => i.ad_id === item.adId)?.creative_media_type?.toLowerCase().includes('reel')
        
        return (
          <div key={uniqueKey} className="border-b border-gray-200 last:border-b-0">
            {/* Header Row */}
            <div 
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
              onClick={() => toggleExpanded(uniqueKey)}
            >
              <div className="flex items-center space-x-4 flex-1">
                <div className="flex-shrink-0">
                  {isExpanded ? (
                    <ChevronDownIcon className="h-5 w-5 text-gray-400" />
                  ) : (
                    <ChevronRightIcon className="h-5 w-5 text-gray-400" />
                  )}
                </div>
                
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-gray-900 truncate">
                    {item.adName}
                  </h4>
                  <p className="text-xs text-gray-500">ID: {item.adId}</p>
                </div>
                
                <div className="flex items-center space-x-6">
                  <div className="text-center">
                    <p className="text-lg font-semibold text-gray-900">{item.score}</p>
                    <p className="text-xs text-gray-500">スコア</p>
                  </div>
                  
                  <div className="text-center">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full
                      ${item.status === 'critical' ? 'bg-red-100 text-red-800' : ''}
                      ${item.status === 'warning' ? 'bg-yellow-100 text-yellow-800' : ''}
                      ${item.status === 'caution' ? 'bg-orange-100 text-orange-800' : ''}
                      ${item.status === 'healthy' ? 'bg-green-100 text-green-800' : ''}
                    `}>
                      {item.status}
                    </span>
                  </div>
                  
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-900">{item.metrics.frequency.toFixed(2)}</p>
                    <p className="text-xs text-gray-500">フリーク</p>
                  </div>
                  
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-900">{item.metrics.ctr.toFixed(2)}%</p>
                    <p className="text-xs text-gray-500">CTR</p>
                  </div>
                  
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-900">¥{Math.ceil(item.metrics.cpm)}</p>
                    <p className="text-xs text-gray-500">CPM</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Expanded Content */}
            {isExpanded && (
              <div className="bg-gray-50 px-4 pb-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                  {/* Basic Metrics */}
                  <div className="bg-white rounded-lg p-4">
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
                      label="ファーストCV（F-CV）"
                      value="N/A"
                      description="初回コンバージョン"
                    />
                    
                    <MetricRow 
                      label="First Time Impression Ratio（推定値）" 
                      value={item.metrics.frequency > 0 ? ((1 / item.metrics.frequency) * 100).toFixed(1) : "0"}
                      unit="%"
                      thresholdStatus={
                        item.metrics.frequency > 2 ? 'danger' : 
                        item.metrics.frequency > 1.5 ? 'warning' : 
                        'safe'
                      }
                      description="初回インプレッションの推定比>
                        {getCtrStatus(item.metrics.ctr) === 'danger' ? '高' : '低'}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">CTR低下率ベース</p>
                    </div>
                    
                    <div className="text-center p-3 bg-gray-50 rounded">
                      <h6 className="text-sm font-medium text-gray-700 mb-2">視聴者側の疲労</h6>
                      <div className={`text-2xl font-bold ${getFrequencyStatus(item.metrics.frequency) === 'danger' ? 'text-red-600' : 'text-gray-600'}`}>
                        {getFrequencyStatus(item.metrics.frequency) === 'danger' ? '高' : '低'}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Frequency 3.5+ で高</p>
                    </div>
                    
                    <div className="text-center p-3 bg-gray-50 rounded">
                      <h6 className="text-sm font-medium text-gray-700 mb-2">アルゴリズムの疲労</h6>
                      <div className={`text-2xl font-bold ${getCpmStatus(item.metrics.cpm) === 'danger' ? 'text-red-600' : 'text-gray-600'}`}>
                        {getCpmStatus(item.metrics.cpm) === 'danger' ? '高' : '低'}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">CPM上昇率ベース</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}