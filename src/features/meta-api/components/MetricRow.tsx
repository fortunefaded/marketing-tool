/**
 * MetricRow.tsx
 * メトリクスの行表示コンポーネント（データソースと信頼性を表示）
 */

import React from 'react'
import { ExtractedMetric } from '../utils/detailed-metrics-extractor'

interface MetricRowProps {
  label: string
  metric: ExtractedMetric
  unit?: string
  tooltip?: string
  className?: string
}

/**
 * データソースのアイコンを取得
 */
function getSourceIcon(source: ExtractedMetric['source']): string {
  switch (source) {
    case 'direct': return '🎯' // API直接
    case 'actions': return '🔄' // actions配列から
    case 'calculated': return '📊' // 計算値
    case 'unavailable': return '❌' // 取得不可
    default: return '❓'
  }
}

/**
 * データソースの説明を取得
 */
function getSourceDescription(source: ExtractedMetric['source']): string {
  switch (source) {
    case 'direct': return 'API直接取得'
    case 'actions': return 'actions配列から抽出'
    case 'calculated': return '他のデータから計算'
    case 'unavailable': return '取得不可'
    default: return '不明'
  }
}

/**
 * 信頼性の色を取得
 */
function getConfidenceColor(confidence?: ExtractedMetric['confidence']): string {
  switch (confidence) {
    case 'high': return 'text-green-600'
    case 'medium': return 'text-yellow-600'
    case 'low': return 'text-orange-600'
    default: return 'text-gray-500'
  }
}

/**
 * メトリクス行コンポーネント
 */
export const MetricRow: React.FC<MetricRowProps> = ({
  label,
  metric,
  unit = '',
  tooltip,
  className = ''
}) => {
  const isAvailable = metric.source !== 'unavailable' && metric.value !== null
  const displayValue = isAvailable 
    ? (typeof metric.value === 'number' ? metric.value.toFixed(2) : metric.value)
    : 'N/A'

  return (
    <div className={`flex items-center justify-between py-2 px-3 border-b border-gray-100 ${className}`}>
      {/* ラベル部分 */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <span className="text-sm font-medium text-gray-700 truncate">
          {label}
        </span>
        {tooltip && (
          <div 
            className="w-4 h-4 rounded-full bg-gray-300 flex items-center justify-center text-xs text-white cursor-help"
            title={tooltip}
          >
            ?
          </div>
        )}
        {metric.isEstimated && (
          <span className="text-xs bg-amber-100 text-amber-800 px-1 rounded">
            推定
          </span>
        )}
      </div>

      {/* 値とデータソース */}
      <div className="flex items-center gap-3">
        {/* 値 */}
        <div className="text-right">
          <div className={`text-sm font-semibold ${
            isAvailable ? 'text-gray-900' : 'text-gray-400'
          }`}>
            {displayValue}
            {unit && isAvailable && (
              <span className="text-xs text-gray-500 ml-1">{unit}</span>
            )}
          </div>
        </div>

        {/* データソースアイコン */}
        <div className="flex items-center">
          <div 
            className={`text-sm ${getConfidenceColor(metric.confidence)} cursor-help`}
            title={`${getSourceDescription(metric.source)}${
              metric.confidence ? ` (信頼性: ${metric.confidence})` : ''
            }`}
          >
            {getSourceIcon(metric.source)}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * メトリクスセクション
 */
interface MetricsSectionProps {
  title: string
  metrics: Record<string, ExtractedMetric>
  fieldMapping: Record<string, { label: string; unit?: string; tooltip?: string }>
  className?: string
}

export const MetricsSection: React.FC<MetricsSectionProps> = ({
  title,
  metrics,
  fieldMapping,
  className = ''
}) => {
  const availableMetrics = Object.entries(fieldMapping).filter(
    ([field]) => metrics[field] && metrics[field].source !== 'unavailable'
  )

  if (availableMetrics.length === 0) {
    return null
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      <div className="px-4 py-3 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      </div>
      <div className="divide-y divide-gray-100">
        {availableMetrics.map(([field, config]) => (
          <MetricRow
            key={field}
            label={config.label}
            metric={metrics[field]}
            unit={config.unit}
            tooltip={config.tooltip}
          />
        ))}
      </div>
    </div>
  )
}

/**
 * データ品質サマリー
 */
interface DataQualitySummaryProps {
  reliabilityScore: {
    score: number
    breakdown: {
      directData: number
      calculatedData: number
      missingData: number
    }
  }
}

export const DataQualitySummary: React.FC<DataQualitySummaryProps> = ({
  reliabilityScore
}) => {
  const { score, breakdown } = reliabilityScore
  // const total = breakdown.directData + breakdown.calculatedData + breakdown.missingData // 未使用

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">データ品質</h3>
        <div className={`text-lg font-bold ${
          score >= 80 ? 'text-green-600' : 
          score >= 60 ? 'text-yellow-600' : 'text-red-600'
        }`}>
          {score}/100
        </div>
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-green-500 rounded"></span>
            <span>API直接取得</span>
          </div>
          <span className="font-medium">{breakdown.directData}</span>
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-yellow-500 rounded"></span>
            <span>計算・推定値</span>
          </div>
          <span className="font-medium">{breakdown.calculatedData}</span>
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-gray-400 rounded"></span>
            <span>取得不可</span>
          </div>
          <span className="font-medium">{breakdown.missingData}</span>
        </div>
        
        {/* プログレスバー */}
        <div className="mt-3">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${score}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}