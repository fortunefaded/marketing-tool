import React, { useState } from 'react'
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline'

// FormulaCard コンポーネント
const FormulaCard = ({
  label,
  value,
  unit = '',
  isResult = false,
  platformColor = 'gray',
}: {
  label: string
  value: number | string
  unit?: string
  isResult?: boolean
  platformColor?: string
}) => {
  const formatValue = (val: number | string) => {
    if (typeof val === 'number') {
      return val.toLocaleString()
    }
    return val
  }

  const getBgColor = () => {
    if (isResult) {
      return `bg-gradient-to-br from-orange-50 to-white border-2 border-orange-300`
    }
    return 'bg-white border border-gray-200'
  }

  const getTextColor = () => {
    return isResult ? 'text-orange-600' : 'text-gray-900'
  }

  return (
    <div className={`
      relative rounded-xl transition-all duration-300
      p-6 min-w-[180px] shadow-md
      ${getBgColor()}
    `}>
      <div className="font-medium tracking-wider mb-2 text-xs text-gray-500 uppercase">
        {label}
      </div>
      <div className={`font-bold text-3xl ${getTextColor()}`}>
        {unit === '円' ? '¥' : ''}{formatValue(value)}{unit && unit !== '円' ? unit : ''}
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

interface PlatformKPIData {
  // 広告費データ
  adSpend: {
    total: number
    breakdown: {
      label: string
      value: number
      color: string
    }[]
  }
  // CVデータ
  conversions: number
  // CPOデータ
  cpo: number
  // その他メトリクス
  impressions?: number
  clicks?: number
  ctr?: number
  cvr?: number
  cpc?: number
}

interface PlatformKPIFormulaProps {
  platformName: string  // Meta, Google, Yahoo
  platformConfig: {
    color: string  // blue, yellow, purple など
    icon?: React.ReactNode
    bgGradient: string  // from-blue-50 to-indigo-50 など
  }
  data: PlatformKPIData | null
  isLoading?: boolean
}

export const PlatformKPIFormula: React.FC<PlatformKPIFormulaProps> = ({
  platformName,
  platformConfig,
  data,
  isLoading = false
}) => {
  const [expandedSection, setExpandedSection] = useState<'adSpend' | 'cv' | 'cpo' | null>(null)

  // ローディング状態
  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="flex items-center justify-center gap-8">
          <div className="h-32 bg-gray-200 rounded-xl w-48"></div>
          <div className="h-32 bg-gray-200 rounded-xl w-48"></div>
          <div className="h-32 bg-gray-200 rounded-xl w-48"></div>
        </div>
      </div>
    )
  }

  // データがない場合
  if (!data) {
    return (
      <div className="flex items-center justify-center gap-8">
        <FormulaCard label={`${platformName}広告費`} value={0} unit="円" />
        <Operator symbol="÷" />
        <FormulaCard label="ECForce CV" value={0} />
        <Operator symbol="=" />
        <FormulaCard label={`${platformName} CPO`} value={0} unit="円" isResult />
      </div>
    )
  }

  const borderColorClass = `border-${platformConfig.color}-300`
  const bgColorClass = `bg-${platformConfig.color}-50`

  return (
    <div className="space-y-6">
      {/* メインの式: 広告費 ÷ CV = CPO */}
      <div className="flex items-center justify-center gap-8 flex-wrap">

        {/* 広告費セクション */}
        {expandedSection === 'adSpend' ? (
          <div className={`relative rounded-xl p-6 border-2 ${borderColorClass} bg-white shadow-lg flex items-center gap-6`}>
            <div className="cursor-pointer" onClick={() => setExpandedSection(null)}>
              <div className="text-gray-600 text-sm mb-2">{platformName}広告費</div>
              <div className="text-4xl font-bold text-gray-900">
                ¥{Math.round(data.adSpend.total).toLocaleString()}
              </div>
            </div>
            <Operator symbol="=" size="lg" />
            {data.adSpend.breakdown.map((item, index) => (
              <React.Fragment key={item.label}>
                {index > 0 && <Operator symbol="+" size="sm" />}
                <div className={`rounded-xl p-4 min-w-[120px] ${bgColorClass} border border-${platformConfig.color}-200`}>
                  <div className="text-xs text-gray-600 mb-1">{item.label}</div>
                  <div className="font-bold text-lg text-gray-900">
                    ¥{Math.round(item.value).toLocaleString()}
                  </div>
                </div>
              </React.Fragment>
            ))}
            <div className="absolute bottom-2 right-2">
              <ChevronUpIcon className="w-4 h-4 text-gray-400 cursor-pointer" onClick={() => setExpandedSection(null)} />
            </div>
          </div>
        ) : (
          <div
            className="relative rounded-xl transition-all duration-300 p-6 min-w-[180px] shadow-md bg-white border border-gray-200 cursor-pointer hover:shadow-lg hover:scale-105"
            onClick={() => setExpandedSection('adSpend')}
          >
            <div className="font-medium tracking-wider mb-2 text-xs text-gray-500 uppercase">
              {platformName}広告費
            </div>
            <div className="font-bold text-3xl text-gray-900">
              ¥{Math.round(data.adSpend.total).toLocaleString()}
            </div>
            <div className="absolute bottom-2 right-2">
              <ChevronDownIcon className="w-4 h-4 text-gray-400" />
            </div>
          </div>
        )}

        <Operator symbol="÷" />

        {/* CVセクション */}
        {expandedSection === 'cv' && data.impressions && data.ctr && data.cvr ? (
          <div className={`relative rounded-xl p-6 border-2 ${borderColorClass} bg-white shadow-lg flex items-center gap-6`}>
            <div className="cursor-pointer" onClick={() => setExpandedSection(null)}>
              <div className="text-gray-600 text-sm mb-2">ECForce CV</div>
              <div className="text-4xl font-bold text-gray-900">
                {Math.round(data.conversions).toLocaleString()}
              </div>
            </div>
            <Operator symbol="=" size="lg" />
            <div className={`rounded-xl p-4 min-w-[120px] ${bgColorClass} border border-${platformConfig.color}-200`}>
              <div className="text-xs text-gray-600 mb-1">IMP</div>
              <div className="font-bold text-lg text-gray-900">
                {Math.round(data.impressions).toLocaleString()}
              </div>
            </div>
            <Operator symbol="×" size="sm" />
            <div className="rounded-xl p-4 min-w-[80px] bg-orange-50 border border-orange-200">
              <div className="text-xs text-gray-600 mb-1">CTR</div>
              <div className="font-bold text-lg text-gray-900">
                {data.ctr.toFixed(2)}%
              </div>
            </div>
            <Operator symbol="×" size="sm" />
            <div className="rounded-xl p-4 min-w-[80px] bg-green-50 border border-green-200">
              <div className="text-xs text-gray-600 mb-1">CVR</div>
              <div className="font-bold text-lg text-gray-900">
                {data.cvr.toFixed(2)}%
              </div>
            </div>
            <div className="absolute bottom-2 right-2">
              <ChevronUpIcon className="w-4 h-4 text-gray-400 cursor-pointer" onClick={() => setExpandedSection(null)} />
            </div>
          </div>
        ) : (
          <div
            className="relative rounded-xl transition-all duration-300 p-6 min-w-[180px] shadow-md bg-white border border-gray-200 cursor-pointer hover:shadow-lg hover:scale-105"
            onClick={() => setExpandedSection('cv')}
          >
            <div className="font-medium tracking-wider mb-2 text-xs text-gray-500 uppercase">
              ECForce CV
            </div>
            <div className="font-bold text-3xl text-gray-900">
              {Math.round(data.conversions).toLocaleString()}
            </div>
            {data.cvr && (
              <div className="text-xs text-gray-500 mt-2">
                CVR: {data.cvr.toFixed(2)}%
              </div>
            )}
            <div className="absolute bottom-2 right-2">
              <ChevronDownIcon className="w-4 h-4 text-gray-400" />
            </div>
          </div>
        )}

        <Operator symbol="=" />

        {/* CPOセクション */}
        {expandedSection === 'cpo' && data.cpc && data.cvr ? (
          <div className={`relative rounded-xl p-6 border-2 border-orange-300 bg-white shadow-lg flex items-center gap-6`}>
            <div className="cursor-pointer" onClick={() => setExpandedSection(null)}>
              <div className="text-gray-600 text-sm mb-2">{platformName} CPO</div>
              <div className="text-4xl font-bold text-orange-600">
                ¥{Math.round(data.cpo).toLocaleString()}
              </div>
            </div>
            <Operator symbol="=" size="lg" />
            <div className={`rounded-xl p-4 min-w-[120px] ${bgColorClass} border border-${platformConfig.color}-200`}>
              <div className="text-xs text-gray-600 mb-1">CPC</div>
              <div className="font-bold text-lg text-gray-900">
                ¥{Math.round(data.cpc).toLocaleString()}
              </div>
            </div>
            <Operator symbol="÷" size="sm" />
            <div className="rounded-xl p-4 min-w-[80px] bg-green-50 border border-green-200">
              <div className="text-xs text-gray-600 mb-1">CVR</div>
              <div className="font-bold text-lg text-gray-900">
                {data.cvr.toFixed(2)}%
              </div>
            </div>
            <div className="absolute bottom-2 right-2">
              <ChevronUpIcon className="w-4 h-4 text-gray-400 cursor-pointer" onClick={() => setExpandedSection(null)} />
            </div>
          </div>
        ) : (
          <div
            className="relative rounded-xl transition-all duration-300 p-6 min-w-[180px] shadow-md bg-gradient-to-br from-orange-50 to-white border-2 border-orange-300 cursor-pointer hover:shadow-lg hover:scale-105"
            onClick={() => setExpandedSection('cpo')}
          >
            <div className="font-medium tracking-wider mb-2 text-xs text-gray-500 uppercase">
              {platformName} CPO
            </div>
            <div className="font-bold text-3xl text-orange-600">
              ¥{Math.round(data.cpo).toLocaleString()}
            </div>
            {data.cpc && (
              <div className="text-xs text-gray-500 mt-2">
                CPC: ¥{Math.round(data.cpc).toLocaleString()}
              </div>
            )}
            <div className="absolute bottom-2 right-2">
              <ChevronDownIcon className="w-4 h-4 text-gray-400" />
            </div>
          </div>
        )}
      </div>

      {/* 補助的なメトリクス表示 */}
      {data.impressions && data.clicks && (
        <div className="flex justify-center gap-4 text-xs text-gray-500">
          <span>インプレッション: {data.impressions.toLocaleString()}</span>
          <span>•</span>
          <span>クリック数: {data.clicks.toLocaleString()}</span>
          {data.ctr && (
            <>
              <span>•</span>
              <span>CTR: {data.ctr.toFixed(2)}%</span>
            </>
          )}
        </div>
      )}
    </div>
  )
}