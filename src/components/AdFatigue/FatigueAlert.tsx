import React from 'react'
import {
  ExclamationTriangleIcon,
  XCircleIcon,
  LightBulbIcon,
  XMarkIcon,
} from '@heroicons/react/24/solid'
import { FatigueLevel } from '../../../convex/adFatigue'

interface FatigueAlertProps {
  adName: string
  level: FatigueLevel
  primaryIssue: string
  recommendedAction: string
  metrics?: {
    frequency?: number
    ctrDeclineRate?: number
    cpmIncreaseRate?: number
    firstTimeRatio?: number
  }
  onDismiss?: () => void
  onTakeAction?: () => void
}

export const FatigueAlert: React.FC<FatigueAlertProps> = ({
  adName,
  level,
  primaryIssue,
  recommendedAction,
  metrics,
  onDismiss,
  onTakeAction,
}) => {
  // アラートレベルに応じたスタイル
  const getAlertStyle = () => {
    switch (level) {
      case 'critical':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          text: 'text-red-800',
          icon: XCircleIcon,
          iconBg: 'bg-red-100',
          iconColor: 'text-red-600',
          title: '危険: 即座の対応が必要です',
        }
      case 'warning':
        return {
          bg: 'bg-orange-50',
          border: 'border-orange-200',
          text: 'text-orange-800',
          icon: ExclamationTriangleIcon,
          iconBg: 'bg-orange-100',
          iconColor: 'text-orange-600',
          title: '警告: 対応を検討してください',
        }
      case 'caution':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          text: 'text-yellow-800',
          icon: ExclamationTriangleIcon,
          iconBg: 'bg-yellow-100',
          iconColor: 'text-yellow-600',
          title: '注意: 監視を継続してください',
        }
      default:
        return null
    }
  }

  const alertStyle = getAlertStyle()
  if (!alertStyle || level === 'healthy') return null

  const AlertIcon = alertStyle.icon

  // メトリクスの問題を特定
  const getMetricIssues = () => {
    const issues = []
    if (metrics?.frequency && metrics.frequency >= 3.5) {
      issues.push(`フリークエンシー: ${metrics.frequency.toFixed(1)} (危険域)`)
    }
    if (metrics?.ctrDeclineRate && metrics.ctrDeclineRate >= 0.25) {
      issues.push(`CTR低下: ${(metrics.ctrDeclineRate * 100).toFixed(0)}%`)
    }
    if (metrics?.cpmIncreaseRate && metrics.cpmIncreaseRate >= 0.35) {
      issues.push(`CPM上昇: ${(metrics.cpmIncreaseRate * 100).toFixed(0)}%`)
    }
    if (metrics?.firstTimeRatio && metrics.firstTimeRatio <= 0.3) {
      issues.push(`新規リーチ率: ${(metrics.firstTimeRatio * 100).toFixed(0)}% (低下)`)
    }
    return issues
  }

  const metricIssues = getMetricIssues()

  return (
    <div className={`rounded-lg border ${alertStyle.border} ${alertStyle.bg} p-4 mb-4`}>
      <div className="flex">
        {/* アイコン */}
        <div className="flex-shrink-0">
          <div className={`p-2 rounded-full ${alertStyle.iconBg}`}>
            <AlertIcon className={`h-6 w-6 ${alertStyle.iconColor}`} />
          </div>
        </div>

        {/* コンテンツ */}
        <div className="ml-3 flex-1">
          {/* ヘッダー */}
          <div className="flex items-start justify-between">
            <div>
              <h3 className={`text-sm font-medium ${alertStyle.text}`}>{alertStyle.title}</h3>
              <p className={`mt-1 text-sm ${alertStyle.text}`}>
                <span className="font-semibold">{adName}</span> - {primaryIssue}
              </p>
            </div>
            {onDismiss && (
              <button
                onClick={onDismiss}
                className={`ml-4 inline-flex rounded-md p-1.5 ${alertStyle.iconBg} hover:bg-opacity-75 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-red-50 focus:ring-red-600`}
              >
                <span className="sr-only">閉じる</span>
                <XMarkIcon className={`h-5 w-5 ${alertStyle.iconColor}`} />
              </button>
            )}
          </div>

          {/* メトリクスの問題 */}
          {metricIssues.length > 0 && (
            <div className="mt-3">
              <p className={`text-sm font-medium ${alertStyle.text}`}>検出された問題:</p>
              <ul className={`mt-1 text-sm ${alertStyle.text} list-disc list-inside`}>
                {metricIssues.map((issue, index) => (
                  <li key={index}>{issue}</li>
                ))}
              </ul>
            </div>
          )}

          {/* 推奨アクション */}
          <div className="mt-4">
            <div className="flex items-start">
              <LightBulbIcon
                className={`h-5 w-5 ${alertStyle.iconColor} mr-2 flex-shrink-0 mt-0.5`}
              />
              <div className="flex-1">
                <p className={`text-sm font-medium ${alertStyle.text}`}>推奨アクション:</p>
                <p className={`mt-1 text-sm ${alertStyle.text}`}>{recommendedAction}</p>
              </div>
            </div>
          </div>

          {/* アクションボタン */}
          {onTakeAction && (
            <div className="mt-4">
              <button
                onClick={onTakeAction}
                className={`inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white ${
                  level === 'critical'
                    ? 'bg-red-600 hover:bg-red-700'
                    : level === 'warning'
                      ? 'bg-orange-600 hover:bg-orange-700'
                      : 'bg-yellow-600 hover:bg-yellow-700'
                } focus:outline-none focus:ring-2 focus:ring-offset-2`}
              >
                対応する
              </button>
            </div>
          )}
        </div>
      </div>

      {/* タイムスタンプ */}
      <div className="mt-3 text-xs text-gray-500">{new Date().toLocaleString('ja-JP')}</div>
    </div>
  )
}
