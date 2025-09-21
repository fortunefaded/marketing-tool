import React, { useState } from 'react'
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline'

// FormulaCard コンポーネント
const FormulaCard = ({
  label,
  value,
  unit = '',
  isResult = false,
}: {
  label: string
  value: number | string
  unit?: string
  isResult?: boolean
}) => {
  const formatValue = (val: number | string) => {
    if (typeof val === 'number') {
      return val.toLocaleString()
    }
    return val
  }

  return (
    <div className={`
      relative rounded-xl transition-all duration-300
      p-6 min-w-[180px] shadow-md
      ${isResult ? 'bg-gradient-to-br from-green-50 to-white border-2 border-green-300' : 'bg-white border border-gray-200'}
    `}>
      <div className="font-medium tracking-wider mb-2 text-xs text-gray-500 uppercase">
        {label}
      </div>
      <div className={`font-bold text-3xl ${isResult ? 'text-green-600' : 'text-gray-900'}`}>
        {formatValue(value)}{unit}
      </div>
    </div>
  )
}

// Operator コンポーネント
const Operator = ({ symbol, size = 'lg' }: { symbol: string; size?: 'sm' | 'lg' }) => (
  <div className={`
    font-light text-gray-400
    ${size === 'lg' ? 'text-5xl' : 'text-2xl'}
  `}>
    {symbol}
  </div>
)

interface ConversionBreakdownData {
  impressions: number
  ctr: number  // パーセンテージ値
  cvr: number  // パーセンテージ値
  conversions: number
}

interface ConversionBreakdownFormulaProps {
  platformName: string  // Meta, Google, Yahoo
  platformColor: string  // blue, yellow, purple など
  data: ConversionBreakdownData | null
  isLoading?: boolean
}

export const ConversionBreakdownFormula: React.FC<ConversionBreakdownFormulaProps> = ({
  platformName,
  platformColor,
  data,
  isLoading = false
}) => {
  const [isExpanded, setIsExpanded] = useState(false)

  // ローディング状態
  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-8">
        <div className="relative rounded-xl transition-all duration-300 p-6 min-w-[180px] shadow-md bg-white border border-gray-200">
          <div className="font-medium tracking-wider mb-2 text-xs text-gray-500 uppercase">{platformName} CV</div>
          <div className="animate-pulse">
            <div className="h-9 bg-gray-200 rounded w-32"></div>
          </div>
        </div>
      </div>
    )
  }

  // データがない場合
  if (!data) {
    return (
      <div className="flex items-center justify-center gap-8">
        <div className="relative rounded-xl transition-all duration-300 p-6 min-w-[180px] shadow-md bg-white border border-gray-200">
          <div className="font-medium tracking-wider mb-2 text-xs text-gray-500 uppercase">{platformName} CV</div>
          <div className="font-bold text-3xl text-gray-900">0</div>
          <div className="text-xs text-gray-400 mt-2">データなし</div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center gap-8">
      {/* 展開時は青い枠線コンテナで囲む */}
      {isExpanded ? (
        <div className={`relative rounded-xl p-6 border-2 border-${platformColor}-300 bg-white shadow-lg flex items-center gap-8`}>
          {/* 左側：CVの合計 */}
          <div
            className="cursor-pointer"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <div className="text-gray-600 text-sm mb-2">{platformName} CV</div>
            <div className="text-4xl font-bold text-gray-900">
              {Math.round(data.conversions).toLocaleString()}
            </div>
          </div>

          <Operator symbol="=" size="lg" />

          {/* 内訳カード - インプレッション */}
          <div className={`rounded-xl p-4 min-w-[140px] bg-${platformColor}-50 border border-${platformColor}-200`}>
            <div className="text-xs text-gray-600 mb-1">インプレッション</div>
            <div className="font-bold text-xl text-gray-900">
              {Math.round(data.impressions).toLocaleString()}
            </div>
          </div>

          <Operator symbol="×" size="sm" />

          {/* 内訳カード - CTR */}
          <div className="rounded-xl p-4 min-w-[100px] bg-orange-50 border border-orange-200">
            <div className="text-xs text-gray-600 mb-1">CTR</div>
            <div className="font-bold text-xl text-gray-900">
              {data.ctr.toFixed(2)}%
            </div>
          </div>

          <Operator symbol="×" size="sm" />

          {/* 内訳カード - CVR */}
          <div className="rounded-xl p-4 min-w-[100px] bg-green-50 border border-green-200">
            <div className="text-xs text-gray-600 mb-1">CVR</div>
            <div className="font-bold text-xl text-gray-900">
              {data.cvr.toFixed(2)}%
            </div>
          </div>

          {/* 折りたたみインジケーター */}
          <div className="absolute bottom-2 right-2">
            <ChevronUpIcon className="w-4 h-4 text-gray-400 cursor-pointer" onClick={() => setIsExpanded(false)} />
          </div>
        </div>
      ) : (
        /* 折りたたみ時は独立したカード */
        <div
          className="relative rounded-xl transition-all duration-300 p-6 min-w-[180px] shadow-md bg-white border border-gray-200 cursor-pointer hover:shadow-lg hover:scale-105"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="font-medium tracking-wider mb-2 text-xs text-gray-500 uppercase">{platformName} CV</div>
          <div className="font-bold text-3xl text-gray-900">
            {Math.round(data.conversions).toLocaleString()}
          </div>
          <div className="text-xs text-gray-500 mt-2">
            CVR: {data.cvr.toFixed(2)}%
          </div>
          <div className="absolute bottom-2 right-2">
            <ChevronDownIcon className="w-4 h-4 text-gray-400" />
          </div>
        </div>
      )}
    </div>
  )
}