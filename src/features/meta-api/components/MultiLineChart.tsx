/**
 * TASK-204: Multi-Line Chart Component - マルチラインチャート
 * 要件: REQ-002, REQ-003, REQ-005 (媒体別グラフと色分け)
 *
 * Rechartsを使用したプラットフォーム別複数線表示チャートコンポーネント
 */

import React, { useCallback } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  TooltipProps,
} from 'recharts'

/**
 * 線種タイプ
 */
export type LineStyleType = 'solid' | 'dashed' | 'dotted'

/**
 * MultiLineChart プロパティ
 */
export interface MultiLineChartProps {
  // 必須プロパティ
  data: Record<string, any>[]
  colors: Record<string, string>
  metric: string

  // オプショナルプロパティ
  height?: number
  width?: number
  unit?: string
  decimals?: number
  yAxisLabel?: string

  // 線種設定
  lineStyles?: Record<string, LineStyleType>
  accessibilityMode?: boolean

  // インタラクション
  showTooltip?: boolean
  tooltipFormatter?: (value: number, platform: string) => [string, string]
  enableZoom?: boolean

  // レスポンシブ
  responsive?: boolean
}

/**
 * 線種を線画スタイルに変換
 */
const getStrokeDashArray = (style: LineStyleType): string | undefined => {
  switch (style) {
    case 'solid':
      return undefined
    case 'dashed':
      return '5 5'
    case 'dotted':
      return '2 2'
    default:
      return undefined
  }
}

/**
 * アクセシビリティ対応の線種を自動生成
 */
const getAccessibilityLineStyle = (index: number): LineStyleType => {
  const styles: LineStyleType[] = ['solid', 'dashed', 'dotted']
  return styles[index % styles.length]
}

/**
 * カスタムツールチップコンポーネント
 */
const CustomTooltip: React.FC<{
  active?: boolean
  payload?: any[]
  label?: string
  unit?: string
  decimals?: number
  formatter?: (value: number, platform: string) => [string, string]
}> = ({ active, payload, label, unit = '', decimals = 2, formatter }) => {
  if (!active || !payload || !payload.length) {
    return null
  }

  return (
    <div className="bg-white p-4 border border-gray-200 shadow-lg rounded-lg">
      <p className="text-sm font-medium text-gray-900 mb-2">{label}</p>
      {payload.map((entry, index) => {
        const value = entry.value as number
        const platform = entry.dataKey as string

        let displayValue: string
        let displayPlatform: string

        if (formatter) {
          ;[displayValue, displayPlatform] = formatter(value, platform)
        } else {
          displayValue = `${value.toFixed(decimals)}${unit}`
          displayPlatform = platform
        }

        return (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            <span
              className="inline-block w-3 h-3 rounded-full mr-2"
              style={{ backgroundColor: entry.color }}
            />
            {displayPlatform}: {displayValue}
          </p>
        )
      })}
    </div>
  )
}

/**
 * MultiLineChart コンポーネント
 *
 * @example
 * ```tsx
 * // 基本的な使用例
 * const data = [
 *   { date: '2025-08-01', Facebook: 5.0, Instagram: 4.0, 'Audience Network': 3.0 },
 *   { date: '2025-08-02', Facebook: 5.2, Instagram: 3.8, 'Audience Network': 3.2 }
 * ]
 * const colors = { Facebook: '#1877F2', Instagram: '#E4405F', 'Audience Network': '#42B883' }
 *
 * <MultiLineChart
 *   data={data}
 *   colors={colors}
 *   metric="CTR"
 *   unit="%"
 *   yAxisLabel="クリック率 (%)"
 * />
 * ```
 */
export const MultiLineChart: React.FC<MultiLineChartProps> = ({
  data,
  colors,
  metric,
  height = 400,
  width,
  unit = '',
  decimals = 2,
  yAxisLabel,
  lineStyles = {},
  accessibilityMode = false,
  showTooltip = true,
  tooltipFormatter,
  enableZoom = false,
  responsive = true,
}) => {
  // データ検証と詳細エラーハンドリング
  if (!data || data.length === 0) {
    return (
      <div
        className="flex items-center justify-center h-64 text-gray-500"
        role="status"
        aria-label="チャートデータが利用できません"
      >
        <div className="text-center">
          <div className="text-lg mb-2">📊</div>
          <div>データがありません</div>
          {metric && (
            <div className="text-sm text-gray-400 mt-1">{metric} のデータを読み込み中...</div>
          )}
        </div>
      </div>
    )
  }

  // データ形式の検証
  const hasValidData = data.some((entry) => entry && typeof entry === 'object' && entry.date)

  if (!hasValidData) {
    console.warn('[MultiLineChart] Invalid data format detected')
    return (
      <div
        className="flex items-center justify-center h-64 text-red-500"
        role="alert"
        aria-label="チャートデータの形式が無効です"
      >
        <div className="text-center">
          <div className="text-lg mb-2">⚠️</div>
          <div>データ形式が無効です</div>
        </div>
      </div>
    )
  }

  // プラットフォーム一覧を取得（最初のデータエントリから）- メモ化
  const platforms = React.useMemo(() => {
    return Object.keys(data[0] || {}).filter((key) => key !== 'date')
  }, [data])

  // アクセシビリティモード時の線種を決定 - useCallback
  const getLineStyle = useCallback(
    (platform: string, index: number): LineStyleType => {
      if (lineStyles[platform]) {
        return lineStyles[platform]
      }
      if (accessibilityMode) {
        return getAccessibilityLineStyle(index)
      }
      return 'solid'
    },
    [lineStyles, accessibilityMode]
  )

  // Y軸のフォーマッタ - useCallback
  const formatYAxisTick = useCallback(
    (value: number) => {
      return `${value.toFixed(decimals)}${unit}`
    },
    [decimals, unit]
  )

  const chartContent = (
    <LineChart
      width={width}
      height={height}
      data={data}
      margin={{
        top: 20,
        right: 30,
        left: 20,
        bottom: 20,
      }}
    >
      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
      <XAxis
        dataKey="date"
        tick={{ fontSize: 12 }}
        tickLine={{ stroke: '#9ca3af' }}
        axisLine={{ stroke: '#9ca3af' }}
      />
      <YAxis
        tick={{ fontSize: 12 }}
        tickLine={{ stroke: '#9ca3af' }}
        axisLine={{ stroke: '#9ca3af' }}
        tickFormatter={formatYAxisTick}
        label={
          yAxisLabel
            ? {
                value: yAxisLabel,
                angle: -90,
                position: 'insideLeft',
                style: { textAnchor: 'middle' },
              }
            : undefined
        }
      />
      {showTooltip && (
        <Tooltip
          content={<CustomTooltip unit={unit} decimals={decimals} formatter={tooltipFormatter} />}
        />
      )}
      {platforms.map((platform, index) => {
        const color = colors[platform] || '#6b7280'
        const lineStyle = getLineStyle(platform, index)

        return (
          <Line
            key={platform}
            type="monotone"
            dataKey={platform}
            stroke={color}
            strokeWidth={2}
            strokeDasharray={getStrokeDashArray(lineStyle)}
            dot={{ r: 4, fill: color }}
            activeDot={{ r: 6, fill: color }}
            connectNulls={false}
          />
        )
      })}
    </LineChart>
  )

  // レスポンシブ対応
  if (responsive) {
    return (
      <div className="w-full" style={{ height: height }}>
        <ResponsiveContainer width="100%" height="100%">
          {chartContent}
        </ResponsiveContainer>
      </div>
    )
  }

  return chartContent
}

export default MultiLineChart
