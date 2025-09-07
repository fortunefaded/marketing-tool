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
  isLoading = false,
}: DateRangeFilterProps) {
  // カスタム日付範囲が設定されている場合はそれを初期値とする
  const [pendingDates, setPendingDates] = useState<{ start: Date | null; end: Date | null }>({
    start: customDateRange?.start || null,
    end: customDateRange?.end || null,
  })

  const presetOptions = [
    { label: '過去7日', value: 'last_7d' as DateRangeFilter },
    { label: '過去14日', value: 'last_14d' as DateRangeFilter },
    { label: '過去30日', value: 'last_30d' as DateRangeFilter },
    { label: '先月', value: 'last_month' as DateRangeFilter },
    { label: '過去90日', value: 'last_90d' as DateRangeFilter },
  ]

  return (
    <div className="bg-white rounded-lg shadow-sm border p-4">
      {/* プリセット期間ボタン */}
      <div className="flex items-center gap-2 mb-4">
        {presetOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              value === option.value
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* カスタム期間選択 */}
      <div className="border-t pt-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-700">カスタム期間</span>
          {value === 'custom' && (
            <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded">選択中</span>
          )}
        </div>
        <DateRangePicker
          startDate={pendingDates.start}
          endDate={pendingDates.end}
          onChange={(start, end) => {
            // 選択中の日付を保持
            console.log('📅 DateRangeFilter: Date selection changed', {
              start: start?.toISOString(),
              end: end?.toISOString(),
            })
            setPendingDates({ start, end })
          }}
          onApply={() => {
            // 適用ボタンが押されたら自動的にcustomモードに切り替えてデータ取得
            console.log('📅 DateRangeFilter: Apply button clicked', {
              start: pendingDates.start?.toISOString(),
              end: pendingDates.end?.toISOString(),
              hasCallback: !!onCustomDateRange,
            })
            if (pendingDates.start && pendingDates.end) {
              // customモードに切り替え
              onChange('custom')
              // コールバックがあれば実行
              if (onCustomDateRange) {
                console.log('📅 DateRangeFilter: Calling onCustomDateRange with dates')
                onCustomDateRange(pendingDates.start, pendingDates.end)
              }
            } else {
              console.warn('📅 DateRangeFilter: Cannot apply - missing dates', {
                hasStart: !!pendingDates.start,
                hasEnd: !!pendingDates.end,
                hasCallback: !!onCustomDateRange,
              })
            }
          }}
          isLoading={isLoading}
        />
        {customDateRange && value === 'custom' && (
          <div className="mt-2 text-xs text-gray-500">
            現在の期間: {customDateRange.start.toLocaleDateString('ja-JP')} 〜{' '}
            {customDateRange.end.toLocaleDateString('ja-JP')}
          </div>
        )}
      </div>
    </div>
  )
}
