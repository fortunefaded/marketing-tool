/**
 * PredictiveAnalysisDashboard.tsx
 * 7日後の予測を表示するダッシュボードコンポーネント
 */

import React, { useState } from 'react'
import {
  PredictiveAnalyzer,
  // PredictionResult, - 未使用
  TimeSeriesDataPoint,
} from '../core/predictive-analysis'
import { FatigueScoreDetail } from '../core/fatigue-calculator-v2'
// import { SafeMetrics } from '../utils/safe-data-access' - 未使用
import {
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ExclamationTriangleIcon,
  // CheckCircleIcon, - 未使用
  ClockIcon,
  LightBulbIcon,
  ChartBarIcon,
  FireIcon,
} from '@heroicons/react/24/outline'
import {
  // LineChart, - 未使用
  Line,
  Area,
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

interface PredictiveAnalysisDashboardProps {
  historicalData: TimeSeriesDataPoint[]
  currentFatigue?: FatigueScoreDetail
  isLoading?: boolean
}

/**
 * リスクレベルのカラーマップ
 */
const getRiskColor = (level: string) => {
  switch (level) {
    case 'critical':
      return 'text-red-600 bg-red-50'
    case 'high':
      return 'text-orange-600 bg-orange-50'
    case 'medium':
      return 'text-yellow-600 bg-yellow-50'
    case 'low':
      return 'text-green-600 bg-green-50'
    default:
      return 'text-gray-600 bg-gray-50'
  }
}

/**
 * トレンド方向のアイコン取得
 */
const getTrendIcon = (direction: string) => {
  switch (direction) {
    case 'improving':
      return <ArrowTrendingUpIcon className="h-5 w-5 text-green-600" />
    case 'declining':
      return <ArrowTrendingDownIcon className="h-5 w-5 text-red-600" />
    case 'critical':
      return <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
    default:
      return <ChartBarIcon className="h-5 w-5 text-gray-600" />
  }
}

/**
 * 予測分析ダッシュボード
 */
export const PredictiveAnalysisDashboard: React.FC<PredictiveAnalysisDashboardProps> = ({
  historicalData,
  currentFatigue,
  isLoading = false,
}) => {
  const [selectedMetric, setSelectedMetric] = useState<'fatigueScore' | 'ctr' | 'cpm'>(
    'fatigueScore'
  )

  // 予測結果の計算
  const prediction = React.useMemo(() => {
    if (historicalData.length < 7) return null
    return PredictiveAnalyzer.predict7Days(historicalData, currentFatigue)
  }, [historicalData, currentFatigue])

  // チャート用データの準備
  const chartData = React.useMemo(() => {
    if (!prediction) return []

    const historical = historicalData.slice(-14).map((d) => ({
      date: new Date(d.date).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' }),
      type: 'historical',
      fatigueScore: d.fatigueScore || 0,
      ctr: d.metrics.ctr,
      cpm: d.metrics.cpm,
    }))

    const predicted = prediction.predictions.map((p) => ({
      date: new Date(p.date).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' }),
      type: 'predicted',
      fatigueScore: p.fatigueScore,
      ctr: p.metrics.ctr || 0,
      cpm: p.metrics.cpm || 0,
      confidence: p.confidence,
    }))

    return [...historical, ...predicted]
  }, [historicalData, prediction])

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
        <div className="h-64 bg-gray-200 rounded-lg"></div>
      </div>
    )
  }

  if (!prediction) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-4 text-lg font-medium text-gray-900">
          予測分析には7日分以上のデータが必要です
        </p>
        <p className="mt-2 text-sm text-gray-500">現在のデータ: {historicalData.length}日分</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">7日後予測分析</h2>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <ClockIcon className="h-4 w-4" />
          <span>信頼度: {(prediction.statistics.confidence * 100).toFixed(0)}%</span>
        </div>
      </div>

      {/* リスク評価カード */}
      <div className={`rounded-lg p-4 ${getRiskColor(prediction.risk.level)}`}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              {prediction.risk.level === 'critical' && <FireIcon className="h-5 w-5" />}
              <h3 className="text-lg font-bold">
                リスクレベル: {prediction.risk.level.toUpperCase()}
              </h3>
            </div>
            <div className="mt-2 space-y-1">
              {prediction.risk.factors.map((factor, index) => (
                <p key={index} className="text-sm">
                  • {factor}
                </p>
              ))}
            </div>
          </div>
          <div className="ml-4">{getTrendIcon(prediction.trend.direction)}</div>
        </div>
      </div>

      {/* 主要指標の変化予測 */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <div className="text-sm text-gray-600">インプレッション変化率</div>
          <div
            className={`text-2xl font-bold mt-1 ${
              prediction.risk.estimatedImpact.impressions < 0 ? 'text-red-600' : 'text-green-600'
            }`}
          >
            {prediction.risk.estimatedImpact.impressions > 0 ? '+' : ''}
            {prediction.risk.estimatedImpact.impressions.toFixed(1)}%
          </div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-sm text-gray-600">CTR変化率</div>
          <div
            className={`text-2xl font-bold mt-1 ${
              prediction.risk.estimatedImpact.ctr < 0 ? 'text-red-600' : 'text-green-600'
            }`}
          >
            {prediction.risk.estimatedImpact.ctr > 0 ? '+' : ''}
            {prediction.risk.estimatedImpact.ctr.toFixed(1)}%
          </div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-sm text-gray-600">支出変化率</div>
          <div
            className={`text-2xl font-bold mt-1 ${
              prediction.risk.estimatedImpact.spend > 10 ? 'text-red-600' : 'text-green-600'
            }`}
          >
            {prediction.risk.estimatedImpact.spend > 0 ? '+' : ''}
            {prediction.risk.estimatedImpact.spend.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* 予測グラフ */}
      <div className="bg-white rounded-lg border p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">トレンド予測</h3>
          <div className="flex gap-2">
            {(['fatigueScore', 'ctr', 'cpm'] as const).map((metric) => (
              <button
                key={metric}
                onClick={() => setSelectedMetric(metric)}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  selectedMetric === metric
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {metric === 'fatigueScore' ? '疲労度' : metric.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorHistorical" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorPredicted" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Area
              type="monotone"
              dataKey={selectedMetric}
              stroke="#3B82F6"
              fill="url(#colorHistorical)"
              strokeWidth={2}
              name="実績"
              connectNulls
            />
            <Line
              type="monotone"
              dataKey={selectedMetric}
              stroke="#F59E0B"
              strokeWidth={2}
              strokeDasharray="5 5"
              name="予測"
              dot={false}
              data={chartData.filter((d) => d.type === 'predicted')}
            />
          </AreaChart>
        </ResponsiveContainer>

        {prediction.trend.inflectionPoint && (
          <div className="mt-2 text-sm text-gray-600">
            転換点: {new Date(prediction.trend.inflectionPoint).toLocaleDateString('ja-JP')}
          </div>
        )}
      </div>

      {/* 推奨アクション */}
      <div className="space-y-4">
        {prediction.recommendations.immediate.length > 0 && (
          <div className="bg-red-50 rounded-lg border border-red-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
              <h3 className="text-lg font-bold text-red-900">今すぐ実施</h3>
            </div>
            <ul className="space-y-2">
              {prediction.recommendations.immediate.map((rec, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-red-800">
                  <span className="mt-0.5">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {prediction.recommendations.shortTerm.length > 0 && (
          <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <ClockIcon className="h-5 w-5 text-yellow-600" />
              <h3 className="text-lg font-bold text-yellow-900">3日以内に実施</h3>
            </div>
            <ul className="space-y-2">
              {prediction.recommendations.shortTerm.map((rec, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-yellow-800">
                  <span className="mt-0.5">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {prediction.recommendations.preventive.length > 0 && (
          <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <LightBulbIcon className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-bold text-blue-900">予防的措置</h3>
            </div>
            <ul className="space-y-2">
              {prediction.recommendations.preventive.map((rec, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-blue-800">
                  <span className="mt-0.5">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* 統計情報 */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-2">予測精度</h3>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-600">決定係数 (R²):</span>
            <span className="ml-2 font-bold">{prediction.statistics.r2Score.toFixed(2)}</span>
          </div>
          <div>
            <span className="text-gray-600">MAPE:</span>
            <span className="ml-2 font-bold">{prediction.statistics.mape.toFixed(1)}%</span>
          </div>
          <div>
            <span className="text-gray-600">モメンタム:</span>
            <span
              className={`ml-2 font-bold ${
                prediction.trend.momentum > 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {prediction.trend.momentum > 0 ? '+' : ''}
              {prediction.trend.momentum.toFixed(0)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PredictiveAnalysisDashboard
