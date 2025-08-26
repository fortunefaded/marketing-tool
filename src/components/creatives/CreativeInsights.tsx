import React, { useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import {
  ExclamationTriangleIcon,
  CheckCircleIcon,
  PauseIcon,
  ArrowPathIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline'
// TODO: Replace with features/meta-api implementation
// import { FatigueAnalysis, CreativePerformanceData } from '../../services/creativeFatigueAnalyzer'
interface FatigueAnalysis {
  score: number
  trend: 'improving' | 'stable' | 'declining'
  factors: Array<{ name: string; impact: 'positive' | 'negative' | 'neutral' }>
  recommendation: string
  recommendedAction?: 'continue' | 'refresh' | 'pause' | 'replace'
  fatigueScore: number
  predictedEndOfLife?: string
  daysUntilEndOfLife?: number
  ctrTrend: number
  frequencySaturation: number
  daysSincePeak?: number
  peakPerformanceDate?: string
  message?: string
}

export interface CreativePerformanceData {
  date: string
  impressions: number
  clicks: number
  ctr: number
  cpm?: number
  spend: number
  frequency: number
}

interface CreativeInsightsProps {
  analysis: FatigueAnalysis
  performanceHistory: CreativePerformanceData[]
  creativeName?: string
  compact?: boolean
}

export const CreativeInsights: React.FC<CreativeInsightsProps> = ({
  analysis,
  performanceHistory,
  creativeName,
  compact: _compact = false,
}) => {
  // アクションに基づくアイコンとスタイル
  const getActionDisplay = () => {
    switch (analysis.recommendedAction) {
      case 'continue':
        return {
          icon: <CheckCircleIcon className="h-6 w-6" />,
          text: '継続推奨',
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          description: 'パフォーマンスは良好です。現状のまま継続してください。',
        }
      case 'refresh':
        return {
          icon: <ArrowPathIcon className="h-6 w-6" />,
          text: 'リフレッシュ推奨',
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          description: 'クリエイティブの小規模な更新を検討してください。',
        }
      case 'pause':
        return {
          icon: <PauseIcon className="h-6 w-6" />,
          text: '一時停止推奨',
          color: 'text-orange-600',
          bgColor: 'bg-orange-50',
          description: 'フリークエンシーが高いため、一時的な配信停止を推奨します。',
        }
      case 'replace':
        return {
          icon: <XCircleIcon className="h-6 w-6" />,
          text: '交換推奨',
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          description: '新しいクリエイティブへの交換を強く推奨します。',
        }
      default:
        return {
          icon: <CheckCircleIcon className="h-6 w-6" />,
          text: '継続推奨',
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          description: 'パフォーマンスは良好です。現状のまま継続してください。',
        }
    }
  }

  // 疲労度スコアに基づく色を取得
  const getFatigueColor = (score: number) => {
    if (score < 30) return '#10B981' // green
    if (score < 50) return '#F59E0B' // yellow
    if (score < 70) return '#F97316' // orange
    return '#EF4444' // red
  }

  // ゲージの角度を計算
  const getGaugeAngle = (score: number) => {
    return (score / 100) * 180 - 90
  }

  // チャートデータの準備
  const chartData = useMemo(() => {
    return performanceHistory.map((data) => ({
      date: new Date(data.date).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' }),
      CTR: data.ctr,
      フリークエンシー: data.frequency,
    }))
  }, [performanceHistory])

  const actionDisplay = getActionDisplay()

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">
          {creativeName ? `${creativeName} の疲労度分析` : 'クリエイティブ疲労度分析'}
        </h3>
        {analysis.predictedEndOfLife && (
          <div className="text-sm text-gray-500">
            予測効果終了日: {new Date(analysis.predictedEndOfLife).toLocaleDateString('ja-JP')}(
            {analysis.daysUntilEndOfLife}日後)
          </div>
        )}
      </div>

      {/* 疲労度ゲージとアクション */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 疲労度ゲージ */}
        <div className="bg-white rounded-lg shadow p-6">
          <h4 className="text-sm font-medium text-gray-700 mb-4">疲労度スコア</h4>
          <div className="relative">
            <svg width="200" height="120" viewBox="0 0 200 120" className="mx-auto">
              {/* 背景円弧 */}
              <path
                d="M 20 100 A 80 80 0 0 1 180 100"
                fill="none"
                stroke="#E5E7EB"
                strokeWidth="20"
                strokeLinecap="round"
              />
              {/* 疲労度円弧 */}
              <path
                d="M 20 100 A 80 80 0 0 1 180 100"
                fill="none"
                stroke={getFatigueColor(analysis.fatigueScore)}
                strokeWidth="20"
                strokeLinecap="round"
                strokeDasharray={`${(analysis.fatigueScore / 100) * 251.33} 251.33`}
              />
              {/* 針 */}
              <line
                x1="100"
                y1="100"
                x2={100 + 70 * Math.cos((getGaugeAngle(analysis.fatigueScore) * Math.PI) / 180)}
                y2={100 + 70 * Math.sin((getGaugeAngle(analysis.fatigueScore) * Math.PI) / 180)}
                stroke="#374151"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <circle cx="100" cy="100" r="5" fill="#374151" />

              {/* スコアテキスト */}
              <text x="100" y="90" textAnchor="middle" className="text-2xl font-bold fill-gray-900">
                {analysis.fatigueScore}
              </text>
              <text x="100" y="110" textAnchor="middle" className="text-sm fill-gray-500">
                / 100
              </text>
            </svg>

            {/* ラベル */}
            <div className="flex justify-between mt-2 text-xs text-gray-500">
              <span>低</span>
              <span>中</span>
              <span>高</span>
            </div>
          </div>
        </div>

        {/* 推奨アクション */}
        <div className={`rounded-lg shadow p-6 ${actionDisplay.bgColor}`}>
          <div className={`flex items-center mb-4 ${actionDisplay.color}`}>
            {actionDisplay.icon}
            <h4 className="ml-2 text-lg font-medium">{actionDisplay.text}</h4>
          </div>
          <p className="text-gray-700">{actionDisplay.description}</p>

          {/* 追加メトリクス */}
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">CTRトレンド:</span>
              <span className={analysis.ctrTrend < 0 ? 'text-red-600' : 'text-green-600'}>
                {analysis.ctrTrend.toFixed(1)}%/日
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">フリークエンシー飽和度:</span>
              <span className="text-gray-900">{analysis.frequencySaturation.toFixed(0)}%</span>
            </div>
            {analysis.daysSincePeak !== undefined && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">ピークからの経過日数:</span>
                <span className="text-gray-900">{analysis.daysSincePeak}日</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* パフォーマンス推移チャート */}
      <div className="bg-white rounded-lg shadow p-6">
        <h4 className="text-sm font-medium text-gray-700 mb-4">パフォーマンス推移</h4>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis
              yAxisId="left"
              label={{ value: 'CTR (%)', angle: -90, position: 'insideLeft' }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              label={{ value: 'フリークエンシー', angle: 90, position: 'insideRight' }}
            />
            <Tooltip />
            <Legend />

            {/* ピーク日のマーカー */}
            {analysis.peakPerformanceDate && (
              <ReferenceLine
                x={new Date(analysis.peakPerformanceDate).toLocaleDateString('ja-JP', {
                  month: 'short',
                  day: 'numeric',
                })}
                stroke="#9CA3AF"
                strokeDasharray="5 5"
                label="ピーク"
              />
            )}

            <Line
              yAxisId="left"
              type="monotone"
              dataKey="CTR"
              stroke="#3B82F6"
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="フリークエンシー"
              stroke="#F59E0B"
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* メッセージ表示 */}
      {analysis.message && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-blue-400 mr-2" />
            <p className="text-sm text-blue-800">{analysis.message}</p>
          </div>
        </div>
      )}
    </div>
  )
}
