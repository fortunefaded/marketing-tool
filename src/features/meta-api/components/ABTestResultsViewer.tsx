/**
 * ABTestResultsViewer.tsx
 * A/Bテスト結果を表示するビューアコンポーネント
 */

import React, { useState } from 'react'
import { ABTestAnalyzer, ABTestResult, TestVariant } from '../core/ab-test-analysis'
import { SafeMetrics } from '../utils/safe-data-access'
import {
  ChartBarIcon,
  CheckCircleIcon,
  XCircleIcon,
  InformationCircleIcon,
  BeakerIcon,
  TrophyIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ScaleIcon,
} from '@heroicons/react/24/outline'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from 'recharts'

interface ABTestResultsViewerProps {
  control: TestVariant
  variant: TestVariant
  primaryMetric?: keyof SafeMetrics
  confidenceLevel?: number
  isLoading?: boolean
}

/**
 * 信頼度レベルのカラーマップ
 */
const getConfidenceColor = (confidence: number) => {
  if (confidence >= 95) return 'text-green-600 bg-green-50'
  if (confidence >= 90) return 'text-yellow-600 bg-yellow-50'
  return 'text-gray-600 bg-gray-50'
}

/**
 * p値の解釈
 */
const interpretPValue = (pValue: number) => {
  if (pValue < 0.01) return '非常に有意 (p < 0.01)'
  if (pValue < 0.05) return '有意 (p < 0.05)'
  if (pValue < 0.1) return 'やや有意 (p < 0.10)'
  return '有意差なし'
}

/**
 * メトリック名の日本語表示
 */
const getMetricLabel = (metric: string): string => {
  const labels: Record<string, string> = {
    ctr: 'CTR',
    cpm: 'CPM',
    cpc: 'CPC',
    conversions: 'コンバージョン数',
    roas: 'ROAS',
    impressions: 'インプレッション',
    clicks: 'クリック数',
    spend: '広告費',
    reach: 'リーチ',
    frequency: 'フリークエンシー',
  }
  return labels[metric] || metric
}

/**
 * A/Bテスト結果ビューア
 */
export const ABTestResultsViewer: React.FC<ABTestResultsViewerProps> = ({
  control,
  variant,
  primaryMetric = 'ctr',
  confidenceLevel = 95,
  isLoading = false,
}) => {
  const [selectedMetric, setSelectedMetric] = useState<keyof SafeMetrics>(primaryMetric)

  // テスト結果の分析
  const result = React.useMemo(() => {
    if (!control || !variant) return null
    return ABTestAnalyzer.analyzeTest(control, variant, selectedMetric, confidenceLevel)
  }, [control, variant, selectedMetric, confidenceLevel])

  // チャート用データ
  const chartData = React.useMemo(() => {
    if (!result) return []

    return [
      {
        name: control.name || 'Control',
        value: result.control.mean,
        fill: '#3B82F6',
      },
      {
        name: variant.name || 'Variant',
        value: result.variant.mean,
        fill: result.winner?.variant === 'variant' ? '#10B981' : '#F59E0B',
      },
    ]
  }, [result, control.name, variant.name])

  // 複数メトリクスの比較データ
  const multiMetricData = React.useMemo(() => {
    if (!control || !variant) return []

    const metrics: (keyof SafeMetrics)[] = ['ctr', 'cpm', 'conversions', 'roas']
    return metrics.map((metric) => {
      const testResult = ABTestAnalyzer.analyzeTest(control, variant, metric, confidenceLevel)
      return {
        metric: getMetricLabel(metric),
        control: testResult.control.mean,
        variant: testResult.variant.mean,
        improvement: testResult.absoluteDifference,
        improvementRate: testResult.relativeDifference * 100,
        significant: testResult.isSignificant,
      }
    })
  }, [control, variant, confidenceLevel])

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="grid grid-cols-2 gap-4 mb-6">
          {[1, 2].map((i) => (
            <div key={i} className="h-40 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
        <div className="h-64 bg-gray-200 rounded-lg"></div>
      </div>
    )
  }

  if (!result) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <BeakerIcon className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-4 text-lg font-medium text-gray-900">A/Bテストデータが不足しています</p>
        <p className="mt-2 text-sm text-gray-500">
          テスト結果を分析するにはコントロールとバリアントの両方のデータが必要です
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">A/Bテスト分析結果</h2>
        <div className="flex items-center gap-4">
          <select
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value as keyof SafeMetrics)}
            className="rounded-md border-gray-300 text-sm"
          >
            <option value="ctr">CTR</option>
            <option value="cpm">CPM</option>
            <option value="cpc">CPC</option>
            <option value="conversions">コンバージョン</option>
            <option value="roas">ROAS</option>
          </select>
          <span className="text-sm text-gray-500">信頼水準: {confidenceLevel}%</span>
        </div>
      </div>

      {/* 勝者判定 */}
      {result.winner && (
        <div
          className={`rounded-lg p-6 ${
            result.isSignificant
              ? 'bg-green-50 border-2 border-green-300'
              : 'bg-yellow-50 border-2 border-yellow-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <TrophyIcon
                className={`h-8 w-8 ${result.isSignificant ? 'text-green-600' : 'text-yellow-600'}`}
              />
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  {result.winner.variant === 'control' ? control.name : variant.name} が優勢
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {getMetricLabel(selectedMetric)}が
                  {Math.abs(result.relativeDifference * 100).toFixed(1)}%
                  {result.relativeDifference > 0 ? '改善' : '低下'}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p
                className={`text-2xl font-bold ${
                  result.relativeDifference > 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {result.relativeDifference > 0 ? '+' : ''}
                {(result.relativeDifference * 100).toFixed(1)}%
              </p>
              <p className="text-sm text-gray-500">{interpretPValue(result.pValue)}</p>
            </div>
          </div>
        </div>
      )}

      {/* 統計的有意性 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-2 mb-2">
            <ScaleIcon className="h-5 w-5 text-gray-600" />
            <h3 className="font-bold text-gray-900">統計的有意性</h3>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">p値</span>
              <span
                className={`text-sm font-bold ${
                  result.pValue < 0.05 ? 'text-green-600' : 'text-gray-900'
                }`}
              >
                {result.pValue.toFixed(4)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">統計的検出力</span>
              <span className="text-sm font-bold">{(result.power * 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">有意差</span>
              <span className="text-sm font-bold">
                {result.isSignificant ? (
                  <span className="text-green-600">あり ✓</span>
                ) : (
                  <span className="text-gray-500">なし</span>
                )}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-2 mb-2">
            <InformationCircleIcon className="h-5 w-5 text-gray-600" />
            <h3 className="font-bold text-gray-900">信頼区間 ({confidenceLevel}%)</h3>
          </div>
          <div className="space-y-2">
            <div>
              <span className="text-sm text-gray-600">Control:</span>
              <p className="text-sm font-mono">
                [{result.confidenceInterval.control.lower.toFixed(4)},{' '}
                {result.confidenceInterval.control.upper.toFixed(4)}]
              </p>
            </div>
            <div>
              <span className="text-sm text-gray-600">Variant:</span>
              <p className="text-sm font-mono">
                [{result.confidenceInterval.variant.lower.toFixed(4)},{' '}
                {result.confidenceInterval.variant.upper.toFixed(4)}]
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 主要メトリクスの比較チャート */}
      <div className="bg-white rounded-lg border p-4">
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          {getMetricLabel(selectedMetric)}の比較
        </h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip formatter={(value: number) => value.toFixed(4)} />
            <Bar dataKey="value" radius={[8, 8, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 複数メトリクスの概要 */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b">
          <h3 className="text-lg font-bold text-gray-900">全メトリクス比較</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  メトリクス
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                  Control
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                  Variant
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                  変化率
                </th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                  有意差
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {multiMetricData.map((item, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.metric}</td>
                  <td className="px-4 py-3 text-sm text-right text-gray-600">
                    {item.control.toFixed(4)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-600">
                    {item.variant.toFixed(4)}
                  </td>
                  <td
                    className={`px-4 py-3 text-sm text-right font-bold ${
                      item.improvementRate > 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {item.improvementRate > 0 ? '+' : ''}
                    {item.improvementRate.toFixed(1)}%
                  </td>
                  <td className="px-4 py-3 text-center">
                    {item.significant ? (
                      <CheckCircleIcon className="h-5 w-5 text-green-600 mx-auto" />
                    ) : (
                      <XCircleIcon className="h-5 w-5 text-gray-400 mx-auto" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* サンプルサイズ推奨 */}
      <div className="bg-blue-50 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <InformationCircleIcon className="h-5 w-5 text-blue-600 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-bold text-blue-900">サンプルサイズ分析</h3>
            <div className="mt-2 space-y-1 text-sm text-blue-800">
              <p>
                現在のサンプルサイズ - Control: {control.sampleSize.toLocaleString()}, Variant:{' '}
                {variant.sampleSize.toLocaleString()}
              </p>
              <p>
                推奨最小サンプルサイズ: {result.requiredSampleSize.toLocaleString()}
                (各グループ)
              </p>
              {result.requiredSampleSize > Math.max(control.sampleSize, variant.sampleSize) && (
                <p className="text-orange-600 font-bold">
                  ⚠️ より確実な結果のため、さらに{' '}
                  {(
                    result.requiredSampleSize - Math.max(control.sampleSize, variant.sampleSize)
                  ).toLocaleString()}
                  件のデータ収集を推奨します
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 推奨事項 */}
      {result.recommendations.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-bold text-gray-900 mb-3">推奨事項</h3>
          <ul className="space-y-2">
            {result.recommendations.map((rec, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-indigo-600 mt-0.5">•</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export default ABTestResultsViewer
