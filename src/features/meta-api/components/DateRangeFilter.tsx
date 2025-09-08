import React, { useState } from 'react'
import { Calendar } from 'lucide-react'
import type { DateRangeFilter } from '../hooks/useAdFatigueSimplified'
import { DateRangePicker } from '@/components/DateRangePicker'
import { logFilter, logUI } from '@/utils/debugLogger'

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

  // カスタム日付設定の展開状態
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false)

  // 日付フォーマット関数を先に定義
  const formatDate = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // 選択された期間の実際の日付範囲を計算
  const getDateRangeForValue = (val: DateRangeFilter): { start: Date; end: Date } | null => {
    const today = new Date()
    today.setHours(23, 59, 59, 999)

    switch (val) {
      case 'today':
        const todayStart = new Date()
        todayStart.setHours(0, 0, 0, 0)
        return { start: todayStart, end: today }

      case 'yesterday':
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)
        yesterday.setHours(0, 0, 0, 0)
        const yesterdayEnd = new Date(yesterday)
        yesterdayEnd.setHours(23, 59, 59, 999)
        return { start: yesterday, end: yesterdayEnd }

      case 'last_2d':
        const twoDaysAgo = new Date(today)
        twoDaysAgo.setDate(twoDaysAgo.getDate() - 1)
        twoDaysAgo.setHours(0, 0, 0, 0)
        return { start: twoDaysAgo, end: today }

      case 'last_7d':
        const sevenDaysAgo = new Date(today)
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
        sevenDaysAgo.setHours(0, 0, 0, 0)
        return { start: sevenDaysAgo, end: today }

      case 'last_14d':
        const fourteenDaysAgo = new Date(today)
        fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 13)
        fourteenDaysAgo.setHours(0, 0, 0, 0)
        return { start: fourteenDaysAgo, end: today }

      case 'last_28d':
        const twentyEightDaysAgo = new Date(today)
        twentyEightDaysAgo.setDate(twentyEightDaysAgo.getDate() - 27)
        twentyEightDaysAgo.setHours(0, 0, 0, 0)
        return { start: twentyEightDaysAgo, end: today }

      case 'last_30d':
        const thirtyDaysAgo = new Date(today)
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29)
        thirtyDaysAgo.setHours(0, 0, 0, 0)
        return { start: thirtyDaysAgo, end: today }

      case 'this_week':
        const weekStart = new Date(today)
        const dayOfWeek = weekStart.getDay()
        const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1 // 月曜始まり
        weekStart.setDate(weekStart.getDate() - diff)
        weekStart.setHours(0, 0, 0, 0)
        return { start: weekStart, end: today }

      case 'last_week':
        const lastWeekEnd = new Date(today)
        const lastWeekDay = lastWeekEnd.getDay()
        const lastWeekDiff = lastWeekDay === 0 ? 7 : lastWeekDay
        lastWeekEnd.setDate(lastWeekEnd.getDate() - lastWeekDiff)
        lastWeekEnd.setHours(23, 59, 59, 999)
        const lastWeekStart = new Date(lastWeekEnd)
        lastWeekStart.setDate(lastWeekStart.getDate() - 6)
        lastWeekStart.setHours(0, 0, 0, 0)
        return { start: lastWeekStart, end: lastWeekEnd }

      case 'this_month':
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
        monthStart.setHours(0, 0, 0, 0)
        const monthEnd = new Date(today)
        monthEnd.setHours(23, 59, 59, 999)
        logFilter('DateRangeFilter', '今月の範囲', {
          start: monthStart.toISOString(),
          end: monthEnd.toISOString(),
          startFormatted: formatDate(monthStart),
          endFormatted: formatDate(monthEnd),
        })
        return { start: monthStart, end: monthEnd }

      case 'last_month':
        const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0)
        lastMonthEnd.setHours(23, 59, 59, 999)
        const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1)
        lastMonthStart.setHours(0, 0, 0, 0)
        return { start: lastMonthStart, end: lastMonthEnd }

      case 'all':
        const allStart = new Date(2020, 0, 1) // 適当な過去の日付
        return { start: allStart, end: today }

      case 'custom':
        return customDateRange

      default:
        return null
    }
  }

  const currentDateRange = getDateRangeForValue(value)

  const presetOptions = [
    { label: '今日', value: 'today' as DateRangeFilter },
    { label: '昨日', value: 'yesterday' as DateRangeFilter },
    { label: '今日と昨日', value: 'last_2d' as DateRangeFilter },
    { label: '過去7日間', value: 'last_7d' as DateRangeFilter },
    { label: '過去14日間', value: 'last_14d' as DateRangeFilter },
    { label: '過去28日間', value: 'last_28d' as DateRangeFilter },
    { label: '過去30日間', value: 'last_30d' as DateRangeFilter },
    { label: '今週', value: 'this_week' as DateRangeFilter },
    { label: '先週', value: 'last_week' as DateRangeFilter },
    { label: '今月', value: 'this_month' as DateRangeFilter },
    { label: '先月', value: 'last_month' as DateRangeFilter },
  ]

  return (
    <div className="flex items-center gap-2">
      {/* プリセット期間ボタン */}
      {presetOptions.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`px-3 py-1.5 text-sm rounded-md transition-colors whitespace-nowrap ${
            value === option.value
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
          title={(() => {
            const range = getDateRangeForValue(option.value)
            if (range) {
              return `${formatDate(range.start)} ~ ${formatDate(range.end)}`
            }
            return option.label
          })()}
        >
          {option.label}
        </button>
      ))}

      {/* カスタム期間トグルボタン */}
      <button
        onClick={() => setShowCustomDatePicker(!showCustomDatePicker)}
        className={`px-3 py-1.5 text-sm rounded-md transition-colors whitespace-nowrap flex items-center gap-1 ${
          value === 'custom'
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        <span>カスタム</span>
        <svg
          className={`w-4 h-4 transition-transform ${showCustomDatePicker ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* 区切り線 */}
      <div className="h-6 w-px bg-gray-300"></div>

      {/* 選択された期間の表示 */}
      {currentDateRange && (
        <div className="text-sm text-gray-600 px-2">
          <span className="font-medium">
            {presetOptions.find((opt) => opt.value === value)?.label || 'カスタム'}
          </span>
          <span className="text-gray-500 ml-1">
            : {formatDate(currentDateRange.start)} ~ {formatDate(currentDateRange.end)}
          </span>
        </div>
      )}

      {/* カスタム期間選択（折りたたみ） */}
      {showCustomDatePicker && (
        <>
          <div className="h-6 w-px bg-gray-300"></div>
          <DateRangePicker
            startDate={pendingDates.start}
            endDate={pendingDates.end}
            onChange={(start, end) => {
              // 選択中の日付を保持
              logUI('DateRangeFilter', 'Date selection changed', {
                start: start?.toISOString(),
                end: end?.toISOString(),
              })
              setPendingDates({ start, end })
            }}
            onApply={() => {
              // 適用ボタンが押されたら自動的にcustomモードに切り替えてデータ取得
              logUI('DateRangeFilter', 'Apply button clicked', {
                start: pendingDates.start?.toISOString(),
                end: pendingDates.end?.toISOString(),
                hasCallback: !!onCustomDateRange,
              })
              if (pendingDates.start && pendingDates.end) {
                // customモードに切り替え
                onChange('custom')
                // カスタム日付ピッカーを閉じる
                setShowCustomDatePicker(false)
                // コールバックがあれば実行
                if (onCustomDateRange) {
                  logFilter('DateRangeFilter', 'Calling onCustomDateRange with dates', null)
                  onCustomDateRange(pendingDates.start, pendingDates.end)
                }
              } else {
                logUI('DateRangeFilter', 'Cannot apply - missing dates', {
                  hasStart: !!pendingDates.start,
                  hasEnd: !!pendingDates.end,
                  hasCallback: !!onCustomDateRange,
                })
              }
            }}
            isLoading={isLoading}
          />
        </>
      )}
    </div>
  )
}
