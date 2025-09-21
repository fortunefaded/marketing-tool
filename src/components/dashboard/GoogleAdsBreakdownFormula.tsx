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

// 内訳用の小さなカード
const BreakdownCard: React.FC<{
  label: string
  value: number
  percentage: number
}> = ({ label, value, percentage }) => (
  <div className="relative rounded-xl p-4 min-w-[140px] bg-white/80 border border-gray-200">
    <div className="text-xs text-gray-500 mb-1">{label}</div>
    <div className="font-bold text-lg text-gray-900">
      ¥{Math.round(value).toLocaleString()}
    </div>
    <div className="text-xs text-gray-500">({percentage}%)</div>
  </div>
)

export const GoogleAdsBreakdownFormula: React.FC<GoogleAdsBreakdownFormulaProps> = ({
  data,
  conversions,
  cpo,
  isLoading = false
}) => {
  const [isExpanded, setIsExpanded] = useState(false)

  // 構成比率を計算
  const calculatePercentage = (value: number, total: number) => {
    if (total === 0) return 0
    return Math.round((value / total) * 100)
  }

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

  const pmaxPercentage = calculatePercentage(data.pmax, data.total)
  const demandgenPercentage = calculatePercentage(data.demandgen, data.total)
  const generalPercentage = calculatePercentage(data.general, data.total)

  return (
    <div className="flex items-center justify-center gap-8">
      {/* Google広告費カード（クリック可能） */}
      <div
        className={`
          relative rounded-xl transition-all duration-300
          p-6 min-w-[180px] shadow-md
          bg-white border border-gray-200
          cursor-pointer hover:shadow-lg hover:scale-105
          ${isExpanded ? 'ring-2 ring-blue-400' : ''}
        `}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="font-medium tracking-wider mb-2 text-xs text-gray-500 uppercase">Google広告費</div>
        <div className="font-bold text-3xl text-gray-900">
          ¥{Math.round(data.total).toLocaleString()}
        </div>

        {/* 展開インジケーター - 右下に配置 */}
        <div className="absolute bottom-2 right-2">
          {isExpanded ? (
            <ChevronUpIcon className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDownIcon className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </div>

      {/* 展開時の内訳（横並び） */}
      {isExpanded && (
        <>
          <Operator symbol="(" size="sm" />
          <BreakdownCard
            label="P-Max"
            value={data.pmax}
            percentage={pmaxPercentage}
          />
          <Operator symbol="+" size="sm" />
          <BreakdownCard
            label="Demand Gen"
            value={data.demandgen}
            percentage={demandgenPercentage}
          />
          <Operator symbol="+" size="sm" />
          <BreakdownCard
            label="一般"
            value={data.general}
            percentage={generalPercentage}
          />
          <Operator symbol=")" size="sm" />
        </>
      )}

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