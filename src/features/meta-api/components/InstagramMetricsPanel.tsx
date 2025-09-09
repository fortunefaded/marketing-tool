/**
 * InstagramMetricsPanel.tsx
 * Instagram特有のメトリクスを表示するパネルコンポーネント
 */

import React from 'react'
import {
  InstagramMetricsCalculator,
  // InstagramMetrics, - 未使用
  InstagramPerformanceScore,
} from '../core/instagram-metrics'
import { SafeMetrics } from '../utils/safe-data-access'

interface InstagramMetricsPanelProps {
  data: any // Meta API response data
  metrics: SafeMetrics
  isLoading?: boolean
}

/**
 * メトリクスカード
 */
const MetricCard: React.FC<{
  label: string
  value: string | number | null | undefined
  unit?: string
  benchmark?: number
  isGood?: boolean
  isEstimated?: boolean
}> = ({ label, value, unit = '', benchmark, isGood, isEstimated = false }) => {
  // 値が存在しない場合はN/A表示
  const displayValue = 
    value === null || value === undefined || value === 0 
      ? 'N/A' 
      : typeof value === 'number' 
        ? value.toFixed(2) 
        : value

  return (
    <div className="bg-white rounded-lg p-3 border border-gray-200">
      <div className="text-xs text-gray-600 mb-1">
        {label}
        {isEstimated && (
          <span className="ml-1 text-xs text-amber-600">(推定)</span>
        )}
      </div>
      <div className="flex items-baseline gap-1">
        <span
          className={`text-lg font-bold ${
            displayValue === 'N/A' 
              ? 'text-gray-400'
              : isGood 
                ? 'text-green-600' 
                : isGood === false 
                  ? 'text-red-600' 
                  : 'text-gray-900'
          }`}
        >
          {displayValue}
        </span>
        {unit && displayValue !== 'N/A' && (
          <span className="text-sm text-gray-500">{unit}</span>
        )}
      </div>
      {benchmark !== undefined && (
        <div className="text-xs text-gray-500 mt-1">
          業界平均: {benchmark}
          {unit}
        </div>
      )}
    </div>
  )
}

/**
 * パフォーマンスグレード表示
 */
const PerformanceGrade: React.FC<{ score: InstagramPerformanceScore }> = ({ score }) => {
  const gradeColors = {
    S: 'bg-purple-500',
    A: 'bg-green-500',
    B: 'bg-blue-500',
    C: 'bg-yellow-500',
    D: 'bg-orange-500',
    F: 'bg-red-500',
  }

  return (
    <div className="flex items-center gap-4">
      <div
        className={`${gradeColors[score.grade]} text-white text-2xl font-bold w-12 h-12 rounded-full flex items-center justify-center`}
      >
        {score.grade}
      </div>
      <div>
        <div className="text-sm font-medium text-gray-900">総合スコア: {score.totalScore}/100</div>
        <div className="text-xs text-gray-600">Instagram パフォーマンス</div>
      </div>
    </div>
  )
}

/**
 * スコアブレイクダウン
 */
const ScoreBreakdown: React.FC<{ breakdown: InstagramPerformanceScore['breakdown'] }> = ({
  breakdown,
}) => {
  const items = [
    { label: 'エンゲージメント', value: breakdown.engagement, emoji: '💬' },
    { label: 'リーチ効率', value: breakdown.reach, emoji: '🎯' },
    { label: 'コンバージョン', value: breakdown.conversion, emoji: '🛒' },
    { label: 'ブランド構築', value: breakdown.brandBuilding, emoji: '🏢' },
  ]

  return (
    <div className="grid grid-cols-2 gap-2">
      {items.map((item) => (
        <div key={item.label} className="bg-gray-50 rounded p-2">
          <div className="flex items-center gap-1 mb-1">
            <span>{item.emoji}</span>
            <span className="text-xs text-gray-600">{item.label}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${
                  item.value >= 80
                    ? 'bg-green-500'
                    : item.value >= 60
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                }`}
                style={{ width: `${item.value}%` }}
              />
            </div>
            <span className="text-xs font-bold">{item.value}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Instagram メトリクスパネル
 */
export const InstagramMetricsPanel: React.FC<InstagramMetricsPanelProps> = ({
  data,
  metrics,
  isLoading = false,
}) => {
  // Instagram メトリクスを計算
  const { instagramMetrics, performanceScore, reelsAnalysis } = React.useMemo(() => {
    if (!data || !metrics) {
      return {
        instagramMetrics: null,
        performanceScore: null,
        reelsAnalysis: null,
      }
    }

    const instagramMetrics = InstagramMetricsCalculator.calculateMetrics(data, metrics)
    const performanceScore = InstagramMetricsCalculator.calculatePerformanceScore(
      instagramMetrics,
      metrics
    )

    // Reelsデータがある場合は分析
    const reelsAnalysis =
      data.video_views || data.reel_plays
        ? InstagramMetricsCalculator.analyzeReelsPerformance(data)
        : null

    return { instagramMetrics, performanceScore, reelsAnalysis }
  }, [data, metrics])

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  if (!instagramMetrics || !performanceScore) {
    return (
      <div className="text-center text-gray-500 py-4">
        <p className="text-sm">Instagram広告でない、またはデータが不足しています。</p>
        <p className="text-xs mt-2">データが取得されるまでしばらくお待ちください。</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900">Instagram特有のメトリクス</h3>
        <PerformanceGrade score={performanceScore} />
      </div>

      {/* 主要メトリクス */}
      <div className="grid grid-cols-2 gap-3">
        <MetricCard
          label="保存数"
          value={instagramMetrics.saves}
          unit="件"
        />
        <MetricCard
          label="エンゲージメント率"
          value={instagramMetrics.engagementRate > 0 ? instagramMetrics.engagementRate : null}
          unit="%"
          benchmark={instagramMetrics.benchmark.industryAvgEngagementRate}
          isGood={instagramMetrics.benchmark.isAboveAverage}
        />
        {instagramMetrics.profileVisitRate > 0 && (
          <MetricCard
            label="プロフィール訪問率"
            value={instagramMetrics.profileVisitRate}
            unit="%"
            benchmark={2.0}
            isGood={instagramMetrics.profileVisitRate > 2.0}
          />
        )}
        {instagramMetrics.firstTimeImpressionRatio > 0 && (
          <MetricCard
            label="初回インプレッション比率"
            value={instagramMetrics.firstTimeImpressionRatio}
            unit="%"
            isGood={instagramMetrics.firstTimeImpressionRatio > 50}
            isEstimated={true}
          />
        )}
      </div>

      {/* エンゲージメント詳細 */}
      {(instagramMetrics.likes > 0 || instagramMetrics.comments > 0 || 
        instagramMetrics.saves > 0 || instagramMetrics.shares > 0) && (
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-sm font-medium text-gray-700 mb-2">エンゲージメント内訳</div>
          <div className="grid grid-cols-4 gap-2 text-center">
            <div>
              <div className="text-lg font-bold text-gray-900">
                {instagramMetrics.likes > 0 ? instagramMetrics.likes.toLocaleString() : 'N/A'}
              </div>
              <div className="text-xs text-gray-600">いいね</div>
            </div>
            <div>
              <div className="text-lg font-bold text-gray-900">
                {instagramMetrics.comments > 0 ? instagramMetrics.comments.toLocaleString() : 'N/A'}
              </div>
              <div className="text-xs text-gray-600">コメント</div>
            </div>
            <div>
              <div className="text-lg font-bold text-gray-900">
                {instagramMetrics.saves > 0 ? instagramMetrics.saves.toLocaleString() : 'N/A'}
              </div>
              <div className="text-xs text-gray-600">保存</div>
            </div>
            <div>
              <div className="text-lg font-bold text-gray-900">
                {instagramMetrics.shares > 0 ? instagramMetrics.shares.toLocaleString() : 'N/A'}
              </div>
              <div className="text-xs text-gray-600">シェア</div>
            </div>
          </div>
        </div>
      )}

      {/* パフォーマンススコアの内訳 */}
      <div>
        <div className="text-sm font-medium text-gray-700 mb-2">パフォーマンス分析</div>
        <ScoreBreakdown breakdown={performanceScore.breakdown} />
      </div>

      {/* Reels分析（データがある場合） */}
      {reelsAnalysis && (
        <div className="bg-blue-50 rounded-lg p-3">
          <div className="text-sm font-medium text-blue-900 mb-2">
            Reels パフォーマンス: {reelsAnalysis.performance.toUpperCase()}
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-sm font-bold text-blue-900">
                {reelsAnalysis.metrics.viewsPerReach.toFixed(2)}x
              </div>
              <div className="text-xs text-blue-700">視聴/リーチ</div>
            </div>
            <div>
              <div className="text-sm font-bold text-blue-900">
                {reelsAnalysis.metrics.completionRate.toFixed(1)}%
              </div>
              <div className="text-xs text-blue-700">完了率</div>
            </div>
            <div>
              <div className="text-sm font-bold text-blue-900">
                {reelsAnalysis.metrics.shareRate.toFixed(2)}%
              </div>
              <div className="text-xs text-blue-700">シェア率</div>
            </div>
          </div>
          {reelsAnalysis.tips.length > 0 && (
            <div className="mt-2 space-y-1">
              {reelsAnalysis.tips.map((tip, index) => (
                <div key={index} className="text-xs text-blue-800">
                  {tip}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 推奨事項 */}
      {performanceScore.recommendations.length > 0 && (
        <div className="border-t pt-3">
          <div className="text-sm font-medium text-gray-700 mb-2">改善の推奨事項</div>
          <div className="space-y-2">
            {performanceScore.recommendations.slice(0, 3).map((rec, index) => (
              <div key={index} className="flex items-start gap-2 text-sm">
                <span className="text-indigo-600 mt-0.5">•</span>
                <span className="text-gray-700">{rec}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 改善完了チェック */}
      <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
        <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
        <span className="text-sm text-green-800">
          Instagram特有のメトリクスは Meta API の actions フィールドから取得しています。
        </span>
      </div>
    </div>
  )
}

export default InstagramMetricsPanel
