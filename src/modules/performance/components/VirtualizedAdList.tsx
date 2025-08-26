import React, { memo } from 'react'
// import { FixedSizeList as List } from 'react-window'
// import AutoSizer from 'react-virtualized-auto-sizer'
import { AdFatigueMetrics } from '@/types'

interface VirtualizedAdListProps {
  ads: AdFatigueMetrics[]
  onAdSelect?: (ad: AdFatigueMetrics) => void
}

/**
 * 仮想化された広告リスト
 * react-window依存のため、一時的にシンプルなリストで代替
 */
export const VirtualizedAdList = memo<VirtualizedAdListProps>(({ ads, onAdSelect }) => {
  return (
    <div className="space-y-2 max-h-96 overflow-y-auto">
      {ads.map((ad, index) => (
        <div 
          key={ad.adId || index}
          className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
          onClick={() => onAdSelect?.(ad)}
        >
          <div className="flex justify-between items-center">
            <div>
              <h4 className="font-medium">{ad.adName || `Ad ${index + 1}`}</h4>
              <p className="text-sm text-gray-500">ID: {ad.adId}</p>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold">
                {ad.score || 0}
              </div>
              <div className="text-xs text-gray-500">
                疲労度スコア
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
})

VirtualizedAdList.displayName = 'VirtualizedAdList'