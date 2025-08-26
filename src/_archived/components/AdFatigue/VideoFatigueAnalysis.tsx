/**
 * 動画広告の疲労度分析コンポーネント
 * 動画特有のメトリクスを視覚的に表示
 */

import React from 'react'
import {
  PlayIcon,
  SpeakerWaveIcon,
  ClockIcon,
  EyeIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'

interface VideoMetrics {
  videoViews: number
  videoCompletionRate: number
  averageWatchTime: number
  soundOnRate: number
  threeSecondViews: number
  engagementRate: number
}

interface VideoFatigueAnalysisProps {
  metrics: VideoMetrics
  fatigueScore?: number
  className?: string
}

export const VideoFatigueAnalysis: React.FC<VideoFatigueAnalysisProps> = ({
  metrics,
  fatigueScore = 0,
  className = ''
}) => {
  // 動画パフォーマンス指標の評価
  const getPerformanceLevel = (metric: string, value: number): 'good' | 'warning' | 'poor' => {
    switch (metric) {
      case 'completionRate':
        return value >= 0.7 ? 'good' : value >= 0.5 ? 'warning' : 'poor'
      case 'soundOnRate':
        return value >= 0.6 ? 'good' : value >= 0.4 ? 'warning' : 'poor'
      case 'averageWatchTime':
        return value >= 15 ? 'good' : value >= 10 ? 'warning' : 'poor'
      case 'engagementRate':
        return value >= 0.03 ? 'good' : value >= 0.02 ? 'warning' : 'poor'
      default:
        return 'warning'
    }
  }

  const getColorClass = (level: 'good' | 'warning' | 'poor') => {
    switch (level) {
      case 'good': return 'text-green-600 bg-green-50 border-green-200'
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'poor': return 'text-red-600 bg-red-50 border-red-200'
    }
  }

  const completionLevel = getPerformanceLevel('completionRate', metrics.videoCompletionRate)
  const soundLevel = getPerformanceLevel('soundOnRate', metrics.soundOnRate)
  const watchTimeLevel = getPerformanceLevel('averageWatchTime', metrics.averageWatchTime)
  const engagementLevel = getPerformanceLevel('engagementRate', metrics.engagementRate)

  return (
    <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <PlayIcon className="h-5 w-5 mr-2" />
          動画パフォーマンス分析
        </h3>
        {fatigueScore > 60 && (
          <div className="flex items-center text-red-600">
            <ExclamationTriangleIcon className="h-5 w-5 mr-1" />
            <span className="text-sm font-medium">疲労度注意</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* 完了率 */}
        <div className={`rounded-lg border p-4 ${getColorClass(completionLevel)}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <ChartBarIcon className="h-5 w-5 mr-2" />
              <span className="text-sm font-medium">完了率</span>
            </div>
            <span className="text-2xl font-bold">
              {(metrics.videoCompletionRate * 100).toFixed(1)}%
            </span>
          </div>
          <div className="mt-2">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${
                  completionLevel === 'good' ? 'bg-green-500' :
                  completionLevel === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${metrics.videoCompletionRate * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* サウンドオン率 */}
        <div className={`rounded-lg border p-4 ${getColorClass(soundLevel)}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <SpeakerWaveIcon className="h-5 w-5 mr-2" />
              <span className="text-sm font-medium">音声ON率</span>
            </div>
            <span className="text-2xl font-bold">
              {(metrics.soundOnRate * 100).toFixed(1)}%
            </span>
          </div>
          <div className="mt-2">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${
                  soundLevel === 'good' ? 'bg-green-500' :
                  soundLevel === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${metrics.soundOnRate * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* 平均視聴時間 */}
        <div className={`rounded-lg border p-4 ${getColorClass(watchTimeLevel)}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <ClockIcon className="h-5 w-5 mr-2" />
              <span className="text-sm font-medium">平均視聴時間</span>
            </div>
            <span className="text-2xl font-bold">
              {metrics.averageWatchTime.toFixed(1)}秒
            </span>
          </div>
          <p className="text-xs mt-1 opacity-75">
            目標: 15秒以上
          </p>
        </div>

        {/* エンゲージメント率 */}
        <div className={`rounded-lg border p-4 ${getColorClass(engagementLevel)}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <EyeIcon className="h-5 w-5 mr-2" />
              <span className="text-sm font-medium">エンゲージメント率</span>
            </div>
            <span className="text-2xl font-bold">
              {(metrics.engagementRate * 100).toFixed(2)}%
            </span>
          </div>
          <p className="text-xs mt-1 opacity-75">
            業界平均: 2-3%
          </p>
        </div>
      </div>

      {/* 詳細メトリクス */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-700 mb-3">詳細指標</h4>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">動画再生数</span>
            <span className="font-medium">{metrics.videoViews.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">3秒再生数</span>
            <span className="font-medium">{metrics.threeSecondViews.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">3秒再生率</span>
            <span className="font-medium">
              {metrics.videoViews > 0 
                ? `${((metrics.threeSecondViews / metrics.videoViews) * 100).toFixed(1)}%`
                : 'N/A'
              }
            </span>
          </div>
        </div>
      </div>

      {/* 推奨事項 */}
      {(completionLevel === 'poor' || soundLevel === 'poor' || fatigueScore > 60) && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="text-sm font-medium text-blue-900 mb-2">改善推奨事項</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            {completionLevel === 'poor' && (
              <li>• 動画の冒頭3秒でより強いフックを作成</li>
            )}
            {soundLevel === 'poor' && (
              <li>• 字幕やビジュアル要素を強化して無音でも伝わる内容に</li>
            )}
            {watchTimeLevel === 'poor' && (
              <li>• 動画の長さを短縮し、コアメッセージに集中</li>
            )}
            {fatigueScore > 60 && (
              <li>• 新しいクリエイティブバリエーションをテスト</li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}