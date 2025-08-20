import React, { useState } from 'react'
import { QuestionMarkCircleIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { 
  THRESHOLD_RATIONALE, 
  interpretThreshold,
  getRecommendedActions 
} from '../../../convex/config/thresholdRationale'

interface ThresholdExplainerProps {
  metric: 'frequency' | 'ctrDecline' | 'firstTimeRatio' | 'cpmIncrease' | 'negativeFeedback'
  value: number
  status: 'safe' | 'warning' | 'critical'
  compact?: boolean
}

export const ThresholdExplainer: React.FC<ThresholdExplainerProps> = ({
  metric,
  value,
  status,
  compact = false
}) => {
  const [showDetails, setShowDetails] = useState(false)
  
  const metricData = THRESHOLD_RATIONALE[metric]
  if (!metricData) return null
  
  const interpretation = interpretThreshold(metric, value, status)
  const actions = getRecommendedActions(metric, status)
  
  const metricLabels = {
    frequency: 'Frequency（平均表示回数）',
    ctrDecline: 'CTR減少率',
    firstTimeRatio: '初回インプレッション比率',
    cpmIncrease: 'CPM上昇率',
    negativeFeedback: 'ネガティブフィードバック率'
  }
  
  const statusColors = {
    safe: 'text-green-600 bg-green-50',
    warning: 'text-yellow-600 bg-yellow-50',
    critical: 'text-red-600 bg-red-50'
  }
  
  if (compact) {
    return (
      <button
        onClick={() => setShowDetails(true)}
        className="ml-1 text-gray-400 hover:text-gray-600"
        title="詳細を表示"
      >
        <QuestionMarkCircleIcon className="h-4 w-4" />
      </button>
    )
  }
  
  return (
    <>
      <button
        onClick={() => setShowDetails(true)}
        className="inline-flex items-center text-sm text-indigo-600 hover:text-indigo-800"
      >
        なぜこの判定？
        <QuestionMarkCircleIcon className="ml-1 h-4 w-4" />
      </button>
      
      {showDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* ヘッダー */}
            <div className="sticky top-0 bg-white border-b px-6 py-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  {metricLabels[metric]}の判定根拠
                </h3>
                <button
                  onClick={() => setShowDetails(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
            </div>
            
            {/* コンテンツ */}
            <div className="p-6 space-y-6">
              {/* 現在の状態 */}
              <div className={`rounded-lg p-4 ${statusColors[status]}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">現在の値: {value}</span>
                  <span className="font-semibold uppercase">{status}</span>
                </div>
                <p className="text-sm">{interpretation}</p>
              </div>
              
              {/* 閾値の説明 */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">閾値設定</h4>
                <div className="space-y-2">
                  {Object.entries(metricData.thresholds).map(([level, threshold]) => (
                    <div key={level} className="flex items-center justify-between py-2 border-b">
                      <div className="flex items-center">
                        <span className={`inline-block w-3 h-3 rounded-full mr-2 ${
                          level === 'safe' ? 'bg-green-500' :
                          level === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                        }`} />
                        <span className="capitalize">{level}</span>
                      </div>
                      <span className="font-mono">{threshold}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* 根拠 */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">科学的根拠</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-700 mb-2">
                    {'evidence' in metricData ? metricData.evidence : '業界標準および実証研究に基づく'}
                  </p>
                  {'mathematical' in metricData && metricData.mathematical && (
                    <p className="text-sm text-gray-600 italic">
                      {metricData.mathematical}
                    </p>
                  )}
                  {'mechanism' in metricData && metricData.mechanism && (
                    <p className="text-sm text-gray-600 mt-2">
                      {metricData.mechanism}
                    </p>
                  )}
                </div>
              </div>
              
              {/* 段階説明（CTR減少率の場合） */}
              {metric === 'ctrDecline' && 'stages' in metricData && metricData.stages && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">疲労の段階</h4>
                  <div className="space-y-2">
                    {Object.entries(metricData.stages).map(([range, description]) => (
                      <div key={range} className="flex items-center justify-between py-2">
                        <span className="font-mono text-sm">{range}</span>
                        <span className="text-sm text-gray-600">{description as string}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* 業界ベンチマーク */}
              {'industryBenchmarks' in metricData && metricData.industryBenchmarks && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">業界別ベンチマーク</h4>
                  <div className="grid grid-cols-3 gap-4">
                    {Object.entries(metricData.industryBenchmarks).map(([industry, benchmark]) => (
                      <div key={industry} className="text-center p-3 bg-gray-50 rounded">
                        <div className="text-xs text-gray-600 mb-1">
                          {industry.replace(/_/g, ' ').toUpperCase()}
                        </div>
                        <div className="font-semibold">{String(benchmark)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* 推奨アクション */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">推奨アクション</h4>
                <ul className="space-y-2">
                  {actions.map((action, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-indigo-500 mr-2">•</span>
                      <span className="text-sm text-gray-700">{action}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            
            {/* フッター */}
            <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t">
              <button
                onClick={() => setShowDetails(false)}
                className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}