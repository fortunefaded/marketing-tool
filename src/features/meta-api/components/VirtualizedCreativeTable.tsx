/**
 * VirtualizedCreativeTable.tsx
 * 
 * 仮想スクロール対応の高性能テーブルコンポーネント
 * 大量データ（1000件以上）でも60fpsを維持
 */

import React, { useMemo, memo, CSSProperties } from 'react'
import { FixedSizeList as List } from 'react-window'
import { UnifiedAdData } from '../utils/safe-data-access'
import { FatigueScoreDetail } from '../core/fatigue-calculator-v2'

interface VirtualizedCreativeTableProps {
  data: UnifiedAdData[]
  fatigueScores?: Map<string, FatigueScoreDetail>
  onRowClick?: (item: UnifiedAdData) => void
  height?: number // テーブルの高さ（デフォルト: 600px）
}

/**
 * 行のレンダリングコンポーネント（メモ化）
 */
const Row = memo(({ 
  index, 
  style, 
  data 
}: { 
  index: number
  style: CSSProperties
  data: {
    items: UnifiedAdData[]
    fatigueScores?: Map<string, FatigueScoreDetail>
    onRowClick?: (item: UnifiedAdData) => void
  }
}) => {
  const item = data.items[index]
  const fatigueScore = data.fatigueScores?.get(item.ad_id)
  
  // スコアに基づく背景色
  const getRowClassName = () => {
    if (!fatigueScore) return 'bg-white hover:bg-gray-50'
    
    if (fatigueScore.status === 'critical') {
      return 'bg-red-50 hover:bg-red-100'
    } else if (fatigueScore.status === 'warning') {
      return 'bg-yellow-50 hover:bg-yellow-100'
    }
    return 'bg-white hover:bg-gray-50'
  }
  
  // スコアバッジの色
  const getScoreBadgeColor = (score: number) => {
    if (score >= 70) return 'bg-red-600 text-white'
    if (score >= 50) return 'bg-yellow-500 text-white'
    return 'bg-green-600 text-white'
  }

  return (
    <div
      style={style}
      className={`${getRowClassName()} border-b border-gray-200 cursor-pointer transition-colors`}
      onClick={() => data.onRowClick?.(item)}
    >
      <div className="flex items-center px-4 py-3">
        {/* 疲労度スコア */}
        <div className="w-24 flex-shrink-0">
          {fatigueScore ? (
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 rounded-full text-xs font-bold ${getScoreBadgeColor(fatigueScore.totalScore)}`}>
                {fatigueScore.totalScore}
              </span>
              <div className="flex flex-col">
                <span className="text-xs text-gray-500">C:{fatigueScore.scores.creative}</span>
                <span className="text-xs text-gray-500">A:{fatigueScore.scores.audience}</span>
              </div>
            </div>
          ) : (
            <span className="text-gray-400 text-sm">-</span>
          )}
        </div>

        {/* 広告名 */}
        <div className="flex-1 min-w-0 px-4">
          <div className="font-medium text-gray-900 truncate">
            {item.ad_name}
          </div>
          <div className="text-sm text-gray-500 truncate">
            {item.campaign_name}
          </div>
        </div>

        {/* メトリクス */}
        <div className="grid grid-cols-6 gap-4 flex-shrink-0 w-[600px]">
          {/* インプレッション */}
          <div className="text-right">
            <div className="text-sm font-medium text-gray-900">
              {item.metrics.impressions.toLocaleString()}
            </div>
            <div className="text-xs text-gray-500">Imp</div>
          </div>

          {/* CTR */}
          <div className="text-right">
            <div className="text-sm font-medium text-gray-900">
              {item.metrics.ctr.toFixed(2)}%
            </div>
            <div className="text-xs text-gray-500">CTR</div>
          </div>

          {/* Frequency */}
          <div className="text-right">
            <div className={`text-sm font-medium ${item.metrics.frequency > 3.5 ? 'text-red-600' : 'text-gray-900'}`}>
              {item.metrics.frequency.toFixed(2)}
            </div>
            <div className="text-xs text-gray-500">Freq</div>
          </div>

          {/* CPM */}
          <div className="text-right">
            <div className="text-sm font-medium text-gray-900">
              ¥{item.metrics.cpm.toFixed(0)}
            </div>
            <div className="text-xs text-gray-500">CPM</div>
          </div>

          {/* 支出 */}
          <div className="text-right">
            <div className="text-sm font-medium text-gray-900">
              ¥{item.metrics.spend.toLocaleString()}
            </div>
            <div className="text-xs text-gray-500">Spend</div>
          </div>

          {/* ROAS */}
          <div className="text-right">
            <div className={`text-sm font-medium ${item.metrics.roas < 1 ? 'text-red-600' : 'text-green-600'}`}>
              {item.metrics.roas.toFixed(2)}
            </div>
            <div className="text-xs text-gray-500">ROAS</div>
          </div>
        </div>

        {/* 推奨アクション */}
        {fatigueScore && fatigueScore.recommendations.length > 0 && (
          <div className="w-8 flex-shrink-0 flex justify-center">
            <div 
              className="group relative"
              title={fatigueScore.recommendations[0]}
            >
              <svg className="w-5 h-5 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              
              {/* ホバー時のツールチップ */}
              <div className="hidden group-hover:block absolute z-10 right-0 top-6 w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg">
                {fatigueScore.recommendations[0]}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
})

Row.displayName = 'VirtualizedRow'

/**
 * ヘッダーコンポーネント
 */
const Header = memo(() => (
  <div className="sticky top-0 z-10 bg-gray-100 border-b-2 border-gray-300">
    <div className="flex items-center px-4 py-3 font-medium text-gray-700 text-sm">
      <div className="w-24 flex-shrink-0">疲労度</div>
      <div className="flex-1 px-4">広告名 / キャンペーン</div>
      <div className="grid grid-cols-6 gap-4 flex-shrink-0 w-[600px] text-right">
        <div>インプレッション</div>
        <div>CTR</div>
        <div>Frequency</div>
        <div>CPM</div>
        <div>支出</div>
        <div>ROAS</div>
      </div>
      <div className="w-8 flex-shrink-0"></div>
    </div>
  </div>
))

Header.displayName = 'VirtualizedHeader'

/**
 * 仮想スクロール対応テーブル
 */
export const VirtualizedCreativeTable: React.FC<VirtualizedCreativeTableProps> = ({
  data,
  fatigueScores,
  onRowClick,
  height = 600
}) => {
  // データをメモ化
  const itemData = useMemo(() => ({
    items: data,
    fatigueScores,
    onRowClick
  }), [data, fatigueScores, onRowClick])

  // データがない場合
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
        <p className="text-gray-500">表示するデータがありません</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      {/* ヘッダー */}
      <Header />
      
      {/* 仮想スクロールリスト */}
      <List
        height={height}
        itemCount={data.length}
        itemSize={80} // 各行の高さ（px）
        width="100%"
        itemData={itemData}
        overscanCount={5} // 表示領域外にレンダリングする行数
      >
        {Row}
      </List>
      
      {/* フッター統計 */}
      <div className="border-t border-gray-200 bg-gray-50 px-4 py-3">
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600">
            全 {data.length} 件の広告
          </span>
          {fatigueScores && (
            <div className="flex gap-4">
              <span className="text-red-600">
                Critical: {Array.from(fatigueScores.values()).filter(s => s.status === 'critical').length}
              </span>
              <span className="text-yellow-600">
                Warning: {Array.from(fatigueScores.values()).filter(s => s.status === 'warning').length}
              </span>
              <span className="text-green-600">
                Healthy: {Array.from(fatigueScores.values()).filter(s => s.status === 'healthy').length}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default VirtualizedCreativeTable