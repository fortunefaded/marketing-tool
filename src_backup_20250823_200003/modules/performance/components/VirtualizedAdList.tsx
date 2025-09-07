import React, { memo, useCallback } from 'react'
import { FixedSizeList as List } from 'react-window'
import AutoSizer from 'react-virtualized-auto-sizer'
import { AdFatigueMetrics } from '@ad-fatigue/types'

interface VirtualizedAdListProps {
  ads: AdFatigueMetrics[]
  onAdSelect?: (ad: AdFatigueMetrics) => void
}

// 各行のコンポーネント（メモ化）
const AdRow = memo<{ 
  index: number
  style: React.CSSProperties
  data: { ads: AdFatigueMetrics[], onAdSelect?: (ad: AdFatigueMetrics) => void }
}>(({ index, style, data }) => {
  const ad = data.ads[index]
  const { onAdSelect } = data
  
  const handleClick = useCallback(() => {
    onAdSelect?.(ad)
  }, [ad, onAdSelect])
  
  // パフォーマンス指標の色分け
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-red-600 bg-red-100'
    if (score >= 60) return 'text-yellow-600 bg-yellow-100'
    return 'text-green-600 bg-green-100'
  }
  
  return (
    <div style={style} className="px-4">
      <div 
        className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-2 hover:shadow-md transition-shadow cursor-pointer"
        onClick={handleClick}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h4 className="text-sm font-medium text-gray-900">{ad.ad_name}</h4>
            <p className="text-xs text-gray-500">{ad.campaign_name}</p>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-center">
              <p className="text-xs text-gray-500">Frequency</p>
              <p className="text-sm font-medium">{ad.frequency.toFixed(2)}</p>
            </div>
            
            <div className="text-center">
              <p className="text-xs text-gray-500">CTR</p>
              <p className="text-sm font-medium">{ad.ctr.toFixed(2)}%</p>
            </div>
            
            <div className={`px-3 py-1 rounded-full text-xs font-bold ${getScoreColor(ad.fatigue_score || 0)}`}>
              {ad.fatigue_score || 0}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})

// 仮想化されたリストコンポーネント
export const VirtualizedAdList: React.FC<VirtualizedAdListProps> = memo(({ 
  ads, 
  onAdSelect 
}) => {
  // データとコールバックをまとめてitemDataとして渡す
  const itemData = React.useMemo(() => ({ 
    ads, 
    onAdSelect 
  }), [ads, onAdSelect])
  
  return (
    <div className="h-full w-full">
      <AutoSizer>
        {({ height, width }) => (
          <List
            height={height}
            itemCount={ads.length}
            itemSize={88} // 各行の高さ
            width={width}
            itemData={itemData}
            overscanCount={5} // ビューポート外に先読みする行数
          >
            {AdRow}
          </List>
        )}
      </AutoSizer>
    </div>
  )
})