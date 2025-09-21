import React, { useState } from 'react'
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline'

interface GoogleAdsBreakdownData {
  total: number
  pmax: number
  demandgen: number
  general: number
}

interface GoogleAdsBreakdownProps {
  data: GoogleAdsBreakdownData | null
  isLoading?: boolean
}

export const GoogleAdsBreakdown: React.FC<GoogleAdsBreakdownProps> = ({
  data,
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
      <div
        className="relative rounded-xl transition-all duration-300 p-6 min-w-[180px] shadow-md bg-white border border-gray-200"
      >
        <div className="font-medium tracking-wider mb-2 text-xs text-gray-500 uppercase">Google広告費</div>
        <div className="animate-pulse">
          <div className="h-9 bg-gray-200 rounded w-32 mb-2"></div>
          <div className="h-4 bg-gray-100 rounded w-24"></div>
        </div>
      </div>
    )
  }

  // データがない場合
  if (!data) {
    return (
      <div
        className="relative rounded-xl transition-all duration-300 p-6 min-w-[180px] shadow-md bg-white border border-gray-200"
      >
        <div className="font-medium tracking-wider mb-2 text-xs text-gray-500 uppercase">Google広告費</div>
        <div className="font-bold text-3xl text-gray-900">¥0</div>
        <div className="text-xs text-gray-400 mt-2">データなし</div>
      </div>
    )
  }

  const pmaxPercentage = calculatePercentage(data.pmax, data.total)
  const demandgenPercentage = calculatePercentage(data.demandgen, data.total)
  const generalPercentage = calculatePercentage(data.general, data.total)

  // 内訳が展開されている場合は幅を広げる
  const containerClass = isExpanded
    ? "relative rounded-xl transition-all duration-300 p-6 min-w-[280px] shadow-md bg-white border border-gray-200 cursor-pointer"
    : "relative rounded-xl transition-all duration-300 p-6 min-w-[180px] shadow-md bg-white border border-gray-200 cursor-pointer hover:shadow-lg hover:scale-105"

  return (
    <div
      className={containerClass}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <div className="font-medium tracking-wider mb-2 text-xs text-gray-500 uppercase">Google広告費</div>
      <div className="font-bold text-3xl text-gray-900">
        ¥{data.total.toLocaleString()}
      </div>

      {/* 展開/折りたたみインジケーター - 右下に配置 */}
      <div className="absolute bottom-2 right-2">
        {isExpanded ? (
          <ChevronUpIcon className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDownIcon className="w-4 h-4 text-gray-400" />
        )}
      </div>

      {/* 内訳表示 */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
          {/* P-Max */}
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-2 h-2 rounded-full bg-blue-500 mr-2"></div>
              <span className="text-xs text-gray-600">P-Max</span>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold text-gray-900">
                ¥{data.pmax.toLocaleString()}
              </span>
              <span className="text-xs text-gray-500 ml-1">
                ({pmaxPercentage}%)
              </span>
            </div>
          </div>

          {/* Demand Gen */}
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
              <span className="text-xs text-gray-600">Demand Gen</span>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold text-gray-900">
                ¥{data.demandgen.toLocaleString()}
              </span>
              <span className="text-xs text-gray-500 ml-1">
                ({demandgenPercentage}%)
              </span>
            </div>
          </div>

          {/* 一般 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-2 h-2 rounded-full bg-gray-500 mr-2"></div>
              <span className="text-xs text-gray-600">一般</span>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold text-gray-900">
                ¥{data.general.toLocaleString()}
              </span>
              <span className="text-xs text-gray-500 ml-1">
                ({generalPercentage}%)
              </span>
            </div>
          </div>

          {/* 構成比バー */}
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden flex">
              {pmaxPercentage > 0 && (
                <div
                  className="bg-blue-500"
                  style={{ width: `${pmaxPercentage}%` }}
                  title={`P-Max: ${pmaxPercentage}%`}
                ></div>
              )}
              {demandgenPercentage > 0 && (
                <div
                  className="bg-green-500"
                  style={{ width: `${demandgenPercentage}%` }}
                  title={`Demand Gen: ${demandgenPercentage}%`}
                ></div>
              )}
              {generalPercentage > 0 && (
                <div
                  className="bg-gray-500"
                  style={{ width: `${generalPercentage}%` }}
                  title={`一般: ${generalPercentage}%`}
                ></div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}