import React, { useState } from 'react'
import { Calendar } from 'lucide-react'
import type { DateRangeFilter } from '../hooks/useAdFatigueSimplified'
import { DateRangePicker } from '@/components/DateRangePicker'

interface DateRangeFilterProps {
  value: DateRangeFilter
  onChange: (value: DateRangeFilter) => void
  onCustomDateRange?: (start: Date, end: Date) => void
  customDateRange?: { start: Date; end: Date } | null
  isLoading?: boolean
}

export function DateRangeFilter({ 
  value, 
  onChange,
  onCustomDateRange,
  customDateRange,
  isLoading = false
}: DateRangeFilterProps) {
  const [showDatePicker, setShowDatePicker] = useState(false)
  // カスタム日付範囲が設定されている場合はそれを初期値とする
  const [pendingDates, setPendingDates] = useState<{ start: Date | null; end: Date | null }>({
    start: customDateRange?.start || null,
    end: customDateRange?.end || null
  })
  
  const options = [
    { label: '過去7日間', value: 'last_7d' as DateRangeFilter },
    { label: '過去14日間', value: 'last_14d' as DateRangeFilter },
    { label: '過去30日間', value: 'last_30d' as DateRangeFilter },
    { label: '先月', value: 'last_month' as DateRangeFilter },
    { label: '過去90日間', value: 'last_90d' as DateRangeFilter },
    { label: 'すべて', value: 'all' as DateRangeFilter },
    { label: 'カスタム期間', value: 'custom' as DateRangeFilter }
  ]
  
  const handleSelectChange = (newValue: DateRangeFilter) => {
    onChange(newValue)
    if (newValue === 'custom') {
      setShowDatePicker(true)
    } else {
      setShowDatePicker(false)
    }
  }
  
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center space-x-2 bg-white rounded-lg shadow-sm border p-2">
        <Calendar className="h-4 w-4 text-gray-500" />
        <select
          value={value}
          onChange={(e) => handleSelectChange(e.target.value as DateRangeFilter)}
          className="text-sm border-none focus:ring-0 cursor-pointer bg-transparent"
        >
          {options.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      
      {/* カスタム期間選択時にDateRangePickerを表示 */}
      {(showDatePicker || value === 'custom') && (
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="mb-2 text-sm text-gray-600">
            期間を選択してください
          </div>
          <DateRangePicker
            startDate={pendingDates.start}
            endDate={pendingDates.end}
            onChange={(start, end) => {
              // 選択中の日付を保持
              console.log('📅 DateRangeFilter: Date selection changed', {
                start: start?.toISOString(),
                end: end?.toISOString()
              })
              setPendingDates({ start, end })
            }}
            onApply={() => {
              // 適用ボタンが押されたらデータ取得
              console.log('📅 DateRangeFilter: Apply button clicked', {
                start: pendingDates.start?.toISOString(),
                end: pendingDates.end?.toISOString(),
                hasCallback: !!onCustomDateRange
              })
              if (pendingDates.start && pendingDates.end && onCustomDateRange) {
                console.log('📅 DateRangeFilter: Calling onCustomDateRange with dates')
                onCustomDateRange(pendingDates.start, pendingDates.end)
              } else {
                console.warn('📅 DateRangeFilter: Cannot apply - missing dates or callback', {
                  hasStart: !!pendingDates.start,
                  hasEnd: !!pendingDates.end,
                  hasCallback: !!onCustomDateRange
                })
              }
            }}
            isLoading={isLoading}
          />
          {customDateRange && (
            <div className="mt-2 text-xs text-gray-500">
              選択期間: {customDateRange.start.toLocaleDateString('ja-JP')} 〜 {customDateRange.end.toLocaleDateString('ja-JP')}
            </div>
          )}
        </div>
      )}
    </div>
  )
}