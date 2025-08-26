import { useMemo, useState } from 'react'

interface FatigueDonutChartProps {
  value: number // 0-100の値
  label: string
  description: string
  formula: string // 計算式
  currentValue: string // 現在の値（例: "CTR: 1.34%"）
  size?: number // チャートのサイズ
}

export function FatigueDonutChart({ 
  value, 
  label, 
  description, 
  formula,
  currentValue,
  size = 120 
}: FatigueDonutChartProps) {
  const [isHovered, setIsHovered] = useState(false)
  // 値を0-100の範囲に制限
  const normalizedValue = Math.max(0, Math.min(100, value))
  
  // SVGの設定
  const radius = 40
  const strokeWidth = 8
  const normalizedRadius = radius - strokeWidth * 0.5
  const circumference = normalizedRadius * 2 * Math.PI
  const strokeDasharray = `${circumference} ${circumference}`
  const strokeDashoffset = circumference - (normalizedValue / 100) * circumference

  // 色の決定（値に基づいて）
  const getColor = useMemo(() => {
    if (normalizedValue >= 80) return '#DC2626' // red-600
    if (normalizedValue >= 60) return '#D97706' // amber-600
    if (normalizedValue >= 40) return '#EAB308' // yellow-500
    return '#16A34A' // green-600
  }, [normalizedValue])

  return (
    <div className="flex flex-col items-center relative">
      {/* ドーナツチャート */}
      <div 
        className="relative cursor-pointer"
        style={{ width: size, height: size }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <svg
          className="transform -rotate-90 transition-transform duration-200 hover:scale-105"
          width={size}
          height={size}
        >
          {/* 背景の円 */}
          <circle
            stroke="#E5E7EB"
            fill="transparent"
            strokeWidth={strokeWidth}
            r={normalizedRadius}
            cx={size / 2}
            cy={size / 2}
          />
          {/* 進捗の円 */}
          <circle
            stroke={getColor}
            fill="transparent"
            strokeWidth={strokeWidth}
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            r={normalizedRadius}
            cx={size / 2}
            cy={size / 2}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        
        {/* 中央の値表示 */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div 
              className="font-bold leading-none"
              style={{ 
                color: getColor,
                fontSize: size > 100 ? '24px' : '18px'
              }}
            >
              {Math.round(normalizedValue)}
            </div>
          </div>
        </div>

        {/* ホバーツールチップ */}
        {isHovered && (
          <div className="absolute z-50 bg-gray-900 text-white text-xs rounded-lg p-3 shadow-lg max-w-xs"
               style={{
                 bottom: '100%',
                 left: '50%',
                 transform: 'translateX(-50%)',
                 marginBottom: '8px',
                 whiteSpace: 'nowrap'
               }}>
            {/* 矢印 */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2">
              <div className="border-4 border-transparent border-t-gray-900"></div>
            </div>
            
            <div className="space-y-1">
              <div className="font-semibold">{label}: {Math.round(normalizedValue)}</div>
              <div className="text-gray-300">計算式: {formula}</div>
              <div className="text-gray-300">{currentValue}</div>
              <div className="text-gray-300 whitespace-normal max-w-48">{description}</div>
            </div>
          </div>
        )}
      </div>
      
      {/* ラベルと説明 */}
      <div className="mt-3 text-center">
        <h3 className="text-xs font-medium text-gray-900 mb-1">{label}</h3>
        <p className="text-xs text-gray-500 max-w-24 leading-tight">{description.substring(0, 20)}...</p>
      </div>
    </div>
  )
}