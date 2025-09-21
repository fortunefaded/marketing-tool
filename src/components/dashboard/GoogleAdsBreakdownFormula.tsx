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
      ${isResult ? 'bg-gradient-to-br from-orange-50 to-white border-2 border-orange-300' : 'bg-white border border-gray-200'}
    `}>
      <div className="font-medium tracking-wider mb-2 text-xs text-gray-500 uppercase">
        {label}
      </div>
      <div className={`font-bold text-3xl ${isResult ? 'text-orange-600' : 'text-gray-900'}`}>
        {unit && unit === '円' ? '¥' : ''}{formatValue(value)}{unit && unit !== '円' ? unit : ''}
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

interface GoogleAdsBreakdownData {
  total: number
  pmax: number
  demandgen: number
  general: number
}

interface GoogleAdsBreakdownFormulaProps {
  data: GoogleAdsBreakdownData | null
  conversions: number
  cpo: number
  isLoading?: boolean
}


export const GoogleAdsBreakdownFormula: React.FC<GoogleAdsBreakdownFormulaProps> = ({
  data,
  conversions,
  cpo,
  isLoading = false
}) => {
  const [isExpanded, setIsExpanded] = useState(false)


  // ローディング状態
  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-8">
        <div className="relative rounded-xl transition-all duration-300 p-6 min-w-[180px] shadow-md bg-white border border-gray-200">
          <div className="font-medium tracking-wider mb-2 text-xs text-gray-500 uppercase">Google広告費</div>
          <div className="animate-pulse">
            <div className="h-9 bg-gray-200 rounded w-32 mb-2"></div>
            <div className="h-4 bg-gray-100 rounded w-24"></div>
          </div>
        </div>
        <Operator symbol="÷" />
        <FormulaCard label="ECForce CV" value={0} />
        <Operator symbol="=" />
        <FormulaCard label="Google CPO" value={0} unit="円" isResult />
      </div>
    )
  }

  // データがない場合
  if (!data) {
    return (
      <div className="flex items-center justify-center gap-8">
        <div className="relative rounded-xl transition-all duration-300 p-6 min-w-[180px] shadow-md bg-white border border-gray-200">
          <div className="font-medium tracking-wider mb-2 text-xs text-gray-500 uppercase">Google広告費</div>
          <div className="font-bold text-3xl text-gray-900">¥0</div>
          <div className="text-xs text-gray-400 mt-2">データなし</div>
        </div>
        <Operator symbol="÷" />
        <FormulaCard label="ECForce CV" value={0} />
        <Operator symbol="=" />
        <FormulaCard label="Google CPO" value={0} unit="円" isResult />
      </div>
    )
  }


  return (
    <div className="flex items-center justify-center gap-8">
      {/* 展開時は青い枠線コンテナで囲む */}
      {isExpanded ? (
        <div className="relative rounded-xl p-6 border-2 border-blue-300 bg-white shadow-lg flex items-center gap-8">
          {/* 左側：Google広告費の合計 */}
          <div
            className="cursor-pointer"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <div className="text-gray-600 text-sm mb-2">Google広告費</div>
            <div className="text-4xl font-bold text-gray-900">
              ¥{Math.round(data.total).toLocaleString()}
            </div>
            <div className="flex items-center text-xs text-red-500 mt-2">
              <span>前月比 +59%</span>
            </div>
          </div>

          <Operator symbol="=" size="lg" />

          {/* 内訳カード */}
          <div className="rounded-xl p-4 min-w-[140px] bg-blue-50 border border-blue-200">
            <div className="text-xs text-gray-600 mb-1">P-Max</div>
            <div className="font-bold text-xl text-gray-900">
              ¥{Math.round(data.pmax).toLocaleString()}
            </div>
          </div>

          <Operator symbol="+" size="sm" />

          <div className="rounded-xl p-4 min-w-[140px] bg-green-50 border border-green-200">
            <div className="text-xs text-gray-600 mb-1">Demand Gen</div>
            <div className="font-bold text-xl text-gray-900">
              ¥{Math.round(data.demandgen).toLocaleString()}
            </div>
          </div>

          <Operator symbol="+" size="sm" />

          <div className="rounded-xl p-4 min-w-[140px] bg-gray-50 border border-gray-200">
            <div className="text-xs text-gray-600 mb-1">一般</div>
            <div className="font-bold text-xl text-gray-900">
              ¥{Math.round(data.general).toLocaleString()}
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
          <div className="font-medium tracking-wider mb-2 text-xs text-gray-500 uppercase">Google広告費</div>
          <div className="font-bold text-3xl text-gray-900">
            ¥{Math.round(data.total).toLocaleString()}
          </div>
          <div className="flex items-center text-xs text-red-500 mt-2">
            <span>前月比 +59%</span>
          </div>
          <div className="absolute bottom-2 right-2">
            <ChevronDownIcon className="w-4 h-4 text-gray-400" />
          </div>
        </div>
      )}

      {/* CPO計算部分（コンテナの外） */}
      <Operator symbol="÷" />

      <FormulaCard
        label="ECForce CV"
        value={conversions}
      />

      <Operator symbol="=" />

      <FormulaCard
        label="Google CPO"
        value={cpo}
        unit="円"
        isResult
      />
    </div>
  )
}