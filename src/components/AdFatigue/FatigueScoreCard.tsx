import React from 'react'
import {
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/solid'
import { FatigueScore, FatigueType, FatigueLevel } from '../../../convex/adFatigue'
import { ThresholdExplainer } from './ThresholdExplainer'

interface FatigueScoreCardProps {
  adName: string
  fatigueScore: FatigueScore
  metrics?: {
    frequency: number
    firstTimeRatio: number
    ctrDeclineRate: number
    cpmIncreaseRate: number
  }
  onViewDetails?: () => void
}

export const FatigueScoreCard: React.FC<FatigueScoreCardProps> = ({
  adName,
  fatigueScore,
  metrics,
  onViewDetails,
}) => {
  // 信号機の色を取得
  const getSignalColor = (level: FatigueLevel) => {
    switch (level) {
      case 'healthy':
        return { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircleIcon }
      case 'caution':
        return { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: InformationCircleIcon }
      case 'warning':
        return { bg: 'bg-orange-100', text: 'text-orange-800', icon: ExclamationTriangleIcon }
      case 'critical':
        return { bg: 'bg-red-100', text: 'text-red-800', icon: XCircleIcon }
    }
  }

  // 疲労タイプの日本語表記
  const getFatigueTypeName = (type: FatigueType) => {
    switch (type) {
      case 'audience':
        return 'オーディエンス疲労'
      case 'creative':
        return 'クリエイティブ疲労'
      case 'algorithm':
        return 'アルゴリズム疲労'
    }
  }

  // スコアゲージの描画
  const renderScoreGauge = (score: number, label: string, type?: FatigueType) => {
    const circumference = 2 * Math.PI * 40
    const strokeDashoffset = circumference - (score / 100) * circumference

    // スコアに応じた色
    const getGaugeColor = (score: number) => {
      if (score >= 70) return '#ef4444' // red-500
      if (score >= 50) return '#f97316' // orange-500
      if (score >= 30) return '#eab308' // yellow-500
      return '#22c55e' // green-500
    }

    const gaugeColor = getGaugeColor(score)
    const isPrimary = type === fatigueScore.primaryIssue

    return (
      <div className={`relative ${isPrimary ? 'scale-110' : ''}`}>
        <svg className="w-24 h-24 transform -rotate-90">
          {/* 背景の円 */}
          <circle cx="48" cy="48" r="40" stroke="#e5e7eb" strokeWidth="8" fill="none" />
          {/* スコアの円 */}
          <circle
            cx="48"
            cy="48"
            r="40"
            stroke={gaugeColor}
            strokeWidth="8"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-500 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-gray-900">{score}</span>
          <span className="text-xs text-gray-600">{label}</span>
        </div>
        {isPrimary && (
          <div className="absolute -top-2 -right-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              主要因
            </span>
          </div>
        )}
      </div>
    )
  }

  const signalColor = getSignalColor(fatigueScore.status)
  const SignalIcon = signalColor.icon

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{adName}</h3>
          <p className="text-sm text-gray-500 mt-1">広告疲労度分析</p>
        </div>
        <div
          className={`inline-flex items-center px-3 py-1 rounded-full ${signalColor.bg} ${signalColor.text}`}
        >
          <SignalIcon className="h-5 w-5 mr-1" />
          <span className="font-medium">
            {fatigueScore.status === 'healthy'
              ? '健全'
              : fatigueScore.status === 'caution'
                ? '注意'
                : fatigueScore.status === 'warning'
                  ? '警告'
                  : '危険'}
          </span>
        </div>
      </div>

      {/* 総合スコア */}
      <div className="text-center mb-8">
        <div className="inline-block relative">
          <svg className="w-32 h-32 transform -rotate-90">
            <circle cx="64" cy="64" r="56" stroke="#e5e7eb" strokeWidth="12" fill="none" />
            <circle
              cx="64"
              cy="64"
              r="56"
              stroke={getSignalColor(fatigueScore.status)
                .text.replace('text-', '#')
                .replace('-800', '500')}
              strokeWidth="12"
              fill="none"
              strokeDasharray={`${2 * Math.PI * 56}`}
              strokeDashoffset={`${2 * Math.PI * 56 * (1 - fatigueScore.total / 100)}`}
              className="transition-all duration-500 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-bold text-gray-900">{fatigueScore.total}</span>
            <span className="text-sm text-gray-600">総合スコア</span>
          </div>
        </div>
      </div>

      {/* 内訳スコア */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center">
          {renderScoreGauge(fatigueScore.breakdown.audience, 'オーディエンス', 'audience')}
        </div>
        <div className="text-center">
          {renderScoreGauge(fatigueScore.breakdown.creative, 'クリエイティブ', 'creative')}
        </div>
        <div className="text-center">
          {renderScoreGauge(fatigueScore.breakdown.algorithm, 'アルゴリズム', 'algorithm')}
        </div>
      </div>

      {/* メトリクス詳細 */}
      {metrics && (
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">主要指標</h4>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 flex items-center">
                フリークエンシー:
                <ThresholdExplainer
                  metric="frequency"
                  value={metrics.frequency}
                  status={
                    metrics.frequency >= 3.5
                      ? 'critical'
                      : metrics.frequency >= 3.0
                        ? 'warning'
                        : 'safe'
                  }
                  compact
                />
              </span>
              <span
                className={`font-medium ${metrics.frequency >= 3.5 ? 'text-red-600' : metrics.frequency >= 3.0 ? 'text-orange-600' : 'text-gray-900'}`}
              >
                {metrics.frequency.toFixed(1)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 flex items-center">
                新規リーチ率:
                <ThresholdExplainer
                  metric="firstTimeRatio"
                  value={metrics.firstTimeRatio}
                  status={
                    metrics.firstTimeRatio <= 0.3
                      ? 'critical'
                      : metrics.firstTimeRatio <= 0.4
                        ? 'warning'
                        : 'safe'
                  }
                  compact
                />
              </span>
              <span
                className={`font-medium ${metrics.firstTimeRatio <= 0.3 ? 'text-red-600' : metrics.firstTimeRatio <= 0.4 ? 'text-orange-600' : 'text-gray-900'}`}
              >
                {(metrics.firstTimeRatio * 100).toFixed(0)}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 flex items-center">
                CTR低下率:
                <ThresholdExplainer
                  metric="ctrDecline"
                  value={metrics.ctrDeclineRate}
                  status={
                    metrics.ctrDeclineRate >= 0.4
                      ? 'critical'
                      : metrics.ctrDeclineRate >= 0.25
                        ? 'warning'
                        : 'safe'
                  }
                  compact
                />
              </span>
              <span
                className={`font-medium ${metrics.ctrDeclineRate >= 0.25 ? 'text-red-600' : metrics.ctrDeclineRate >= 0.15 ? 'text-orange-600' : 'text-gray-900'}`}
              >
                {(metrics.ctrDeclineRate * 100).toFixed(0)}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 flex items-center">
                CPM上昇率:
                <ThresholdExplainer
                  metric="cpmIncrease"
                  value={metrics.cpmIncreaseRate}
                  status={
                    metrics.cpmIncreaseRate >= 0.3
                      ? 'critical'
                      : metrics.cpmIncreaseRate >= 0.2
                        ? 'warning'
                        : 'safe'
                  }
                  compact
                />
              </span>
              <span
                className={`font-medium ${metrics.cpmIncreaseRate >= 0.35 ? 'text-red-600' : metrics.cpmIncreaseRate >= 0.2 ? 'text-orange-600' : 'text-gray-900'}`}
              >
                {(metrics.cpmIncreaseRate * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 主要問題 */}
      <div className={`mt-4 p-3 rounded-lg ${getSignalColor(fatigueScore.status).bg}`}>
        <div className="flex items-start">
          <SignalIcon
            className={`h-5 w-5 mr-2 flex-shrink-0 ${getSignalColor(fatigueScore.status).text}`}
          />
          <div>
            <p className={`text-sm font-medium ${getSignalColor(fatigueScore.status).text}`}>
              主要な問題: {getFatigueTypeName(fatigueScore.primaryIssue)}
            </p>
          </div>
        </div>
      </div>

      {/* 詳細ボタン */}
      {onViewDetails && (
        <button
          onClick={onViewDetails}
          className="mt-4 w-full px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          詳細を見る
        </button>
      )}
    </div>
  )
}
