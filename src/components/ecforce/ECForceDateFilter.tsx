/* eslint-env browser */
import React from 'react'
import { Calendar } from 'lucide-react'

interface DateRange {
  start: Date | null
  end: Date | null
}

interface ECForceDateFilterProps {
  dateRange: DateRange
  onDateRangeChange: (range: DateRange) => void
}

export const ECForceDateFilter: React.FC<ECForceDateFilterProps> = ({
  dateRange,
  onDateRangeChange
}) => {
  const handlePresetClick = (days: number) => {
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - days)
    
    onDateRangeChange({ start, end })
  }

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value ? new Date(e.target.value) : null
    onDateRangeChange({ ...dateRange, start: date })
  }

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value ? new Date(e.target.value) : null
    onDateRangeChange({ ...dateRange, end: date })
  }

  const formatDateForInput = (date: Date | null) => {
    if (!date) return ''
    return date.toISOString().split('T')[0]
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">期間フィルター:</span>
        </div>

        {/* プリセットボタン */}
        <div className="flex gap-2">
          <button
            onClick={() => handlePresetClick(7)}
            className="px-3 py-1 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            過去7日間
          </button>
          <button
            onClick={() => handlePresetClick(30)}
            className="px-3 py-1 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            過去30日間
          </button>
          <button
            onClick={() => handlePresetClick(90)}
            className="px-3 py-1 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            過去90日間
          </button>
        </div>

        {/* カスタム日付範囲 */}
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={formatDateForInput(dateRange.start)}
            onChange={handleStartDateChange}
            className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <span className="text-gray-500">〜</span>
          <input
            type="date"
            value={formatDateForInput(dateRange.end)}
            onChange={handleEndDateChange}
            className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* リセットボタン */}
        {(dateRange.start || dateRange.end) && (
          <button
            onClick={() => onDateRangeChange({ start: null, end: null })}
            className="px-3 py-1 text-sm font-medium text-red-600 hover:text-red-700 transition-colors"
          >
            フィルターをクリア
          </button>
        )}
      </div>
    </div>
  )
}