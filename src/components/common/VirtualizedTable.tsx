import React, { useRef, useEffect, useState, useCallback } from 'react'

interface Column<T> {
  key: keyof T | string
  header: string
  width?: number
  render?: (item: T) => React.ReactNode
}

interface VirtualizedTableProps<T> {
  data: T[]
  columns: Column<T>[]
  rowHeight?: number
  height?: number
  getRowKey: (item: T, index: number) => string | number
  onRowClick?: (item: T) => void
}

export function VirtualizedTable<T>({
  data,
  columns,
  rowHeight = 48,
  height = 600,
  getRowKey,
  onRowClick
}: VirtualizedTableProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 0 })

  // 表示範囲の計算
  const calculateVisibleRange = useCallback(() => {
    const visibleCount = Math.ceil(height / rowHeight)
    const buffer = 5 // 上下に余分に描画する行数
    const start = Math.max(0, Math.floor(scrollTop / rowHeight) - buffer)
    const end = Math.min(data.length, start + visibleCount + buffer * 2)
    
    setVisibleRange({ start, end })
  }, [scrollTop, rowHeight, height, data.length])

  useEffect(() => {
    calculateVisibleRange()
  }, [calculateVisibleRange])

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
  }

  const visibleData = data.slice(visibleRange.start, visibleRange.end)
  const offsetY = visibleRange.start * rowHeight
  const totalHeight = data.length * rowHeight

  return (
    <div className="relative border border-gray-200 rounded-lg overflow-hidden">
      {/* ヘッダー */}
      <div className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200">
        <div className="flex">
          {columns.map((column) => (
            <div
              key={column.key as string}
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              style={{ width: column.width || 'auto', flex: column.width ? 'none' : 1 }}
            >
              {column.header}
            </div>
          ))}
        </div>
      </div>

      {/* 仮想スクロールコンテナ */}
      <div
        ref={containerRef}
        className="overflow-auto"
        style={{ height: `${height}px` }}
        onScroll={handleScroll}
      >
        <div style={{ height: `${totalHeight}px`, position: 'relative' }}>
          <div
            style={{
              transform: `translateY(${offsetY}px)`,
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0
            }}
          >
            {visibleData.map((item, index) => {
              const actualIndex = visibleRange.start + index
              const key = getRowKey(item, actualIndex)
              
              return (
                <div
                  key={key}
                  className={`flex border-b border-gray-200 hover:bg-gray-50 ${
                    onRowClick ? 'cursor-pointer' : ''
                  }`}
                  style={{ height: `${rowHeight}px` }}
                  onClick={() => onRowClick?.(item)}
                >
                  {columns.map((column) => (
                    <div
                      key={`${key}-${column.key as string}`}
                      className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 flex items-center"
                      style={{ width: column.width || 'auto', flex: column.width ? 'none' : 1 }}
                    >
                      {column.render 
                        ? column.render(item)
                        : (item[column.key as keyof T] as React.ReactNode)
                      }
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* 行数情報 */}
      <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-2 text-sm text-gray-600">
        表示中: {visibleRange.start + 1} - {Math.min(visibleRange.end, data.length)} / 全{data.length}件
      </div>
    </div>
  )
}