import { useState } from 'react'
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

      case 'last_3d':
        const threeDaysAgo = new Date(today)
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
        threeDaysAgo.setHours(0, 0, 0, 0)
        const yesterday3d = new Date(today)
        yesterday3d.setDate(yesterday3d.getDate() - 1)
        yesterday3d.setHours(23, 59, 59, 999)
        return { start: threeDaysAgo, end: yesterday3d }

      case 'last_7d':
        const sevenDaysAgo = new Date(today)
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
        sevenDaysAgo.setHours(0, 0, 0, 0)
        const yesterday7d = new Date(today)
        yesterday7d.setDate(yesterday7d.getDate() - 1)
        yesterday7d.setHours(23, 59, 59, 999)
        return { start: sevenDaysAgo, end: yesterday7d }

      case 'last_14d':
        const fourteenDaysAgo = new Date(today)
        fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)
        fourteenDaysAgo.setHours(0, 0, 0, 0)
        const yesterday14d = new Date(today)
        yesterday14d.setDate(yesterday14d.getDate() - 1)
        yesterday14d.setHours(23, 59, 59, 999)
        return { start: fourteenDaysAgo, end: yesterday14d }

      case 'last_28d':
        const twentyEightDaysAgo = new Date(today)
        twentyEightDaysAgo.setDate(twentyEightDaysAgo.getDate() - 28)
        twentyEightDaysAgo.setHours(0, 0, 0, 0)
        const yesterday28d = new Date(today)
        yesterday28d.setDate(yesterday28d.getDate() - 1)
        yesterday28d.setHours(23, 59, 59, 999)
        return { start: twentyEightDaysAgo, end: yesterday28d }

      case 'last_30d':
        const thirtyDaysAgo = new Date(today)
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        thirtyDaysAgo.setHours(0, 0, 0, 0)
        const yesterday30d = new Date(today)
        yesterday30d.setDate(yesterday30d.getDate() - 1)
        yesterday30d.setHours(23, 59, 59, 999)
        return { start: thirtyDaysAgo, end: yesterday30d }

      case 'last_60d':
        const sixtyDaysAgo = new Date(today)
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)
        sixtyDaysAgo.setHours(0, 0, 0, 0)
        const yesterday60d = new Date(today)
        yesterday60d.setDate(yesterday60d.getDate() - 1)
        yesterday60d.setHours(23, 59, 59, 999)
        return { start: sixtyDaysAgo, end: yesterday60d }

      case 'last_90d':
        const ninetyDaysAgo = new Date(today)
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
        ninetyDaysAgo.setHours(0, 0, 0, 0)
        const yesterday90d = new Date(today)
        yesterday90d.setDate(yesterday90d.getDate() - 1)
        yesterday90d.setHours(23, 59, 59, 999)
        return { start: ninetyDaysAgo, end: yesterday90d }

      case 'this_week':
        // 今週（日曜始まり）
        const weekStart = new Date(today)
        const dayOfWeek = weekStart.getDay() // 0=日曜, 1=月曜, ..., 6=土曜
        // 今週の日曜日を計算（今日から dayOfWeek 日前）
        weekStart.setDate(weekStart.getDate() - dayOfWeek)
        weekStart.setHours(0, 0, 0, 0)
        // 今週の土曜日（今日または未来の土曜日）
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekStart.getDate() + 6)
        weekEnd.setHours(23, 59, 59, 999)
        // 今日が土曜日より後の場合は今日を終了日とする
        const actualEnd = weekEnd > today ? today : weekEnd
        return { start: weekStart, end: actualEnd }

      case 'last_week':
        // 先週（日曜始まり）
        const currentDay = today.getDay() // 0=日曜, 1=月曜, ..., 6=土曜
        // 先週の土曜日を計算（今日から currentDay + 1 日前）
        const lastSaturday = new Date(today)
        lastSaturday.setDate(today.getDate() - currentDay - 1)
        lastSaturday.setHours(23, 59, 59, 999)
        // 先週の日曜日を計算（先週の土曜日から6日前）
        const lastSunday = new Date(lastSaturday)
        lastSunday.setDate(lastSaturday.getDate() - 6)
        lastSunday.setHours(0, 0, 0, 0)
        return { start: lastSunday, end: lastSaturday }

      case 'this_month':
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
        monthStart.setHours(0, 0, 0, 0)
        const monthEnd = new Date(today)
        monthEnd.setHours(23, 59, 59, 999)
        // useEffectで実行するか、削除
        // logFilter('DateRangeFilter', '今月の範囲', {
        //   start: monthStart.toISOString(),
        //   end: monthEnd.toISOString(),
        //   startFormatted: formatDate(monthStart),
        //   endFormatted: formatDate(monthEnd),
        // })
        return { start: monthStart, end: monthEnd }

      case 'last_month':
        const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0)
        lastMonthEnd.setHours(23, 59, 59, 999)
        const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1)
        lastMonthStart.setHours(0, 0, 0, 0)
        return { start: lastMonthStart, end: lastMonthEnd }

      case 'last_3_months':
        const threeMonthsAgo = new Date(today)
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
        threeMonthsAgo.setHours(0, 0, 0, 0)
        const yesterday3m = new Date(today)
        yesterday3m.setDate(yesterday3m.getDate() - 1)
        yesterday3m.setHours(23, 59, 59, 999)
        return { start: threeMonthsAgo, end: yesterday3m }

      case 'all':
        const allStart = new Date(2020, 0, 1) // 適当な過去の日付
        return { start: allStart, end: today }

      case 'custom':
        return customDateRange

      default:
        return null
    }
  }

  const presetOptions = [
    { label: '今日', value: 'today' as DateRangeFilter },
    { label: '昨日', value: 'yesterday' as DateRangeFilter },
    { label: '過去3日間', value: 'last_3d' as DateRangeFilter },
    { label: '過去7日間', value: 'last_7d' as DateRangeFilter },
    { label: '過去14日間', value: 'last_14d' as DateRangeFilter },
    { label: '過去28日間', value: 'last_28d' as DateRangeFilter },
    { label: '過去30日間', value: 'last_30d' as DateRangeFilter },
    { label: '過去60日間', value: 'last_60d' as DateRangeFilter },
    { label: '過去90日間', value: 'last_90d' as DateRangeFilter },
    { label: '今週', value: 'this_week' as DateRangeFilter },
    { label: '先週', value: 'last_week' as DateRangeFilter },
    { label: '今月', value: 'this_month' as DateRangeFilter },
    { label: '先月', value: 'last_month' as DateRangeFilter },
    { label: '過去3ヶ月', value: 'last_3_months' as DateRangeFilter },
  ]

  return (
    <div className="flex items-center gap-2">
      {/* プリセット期間ボタン */}
      {presetOptions.map((option) => {
        const range = getDateRangeForValue(option.value)
        const isSelected = value === option.value

        return (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={`px-3 py-1.5 h-[32px] text-xs rounded-md transition-colors whitespace-nowrap flex items-center justify-center ${
              isSelected ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            title={range ? `${formatDate(range.start)} ~ ${formatDate(range.end)}` : option.label}
          >
            {isSelected && range ? (
              <span>
                {option.label} ({formatDate(range.start)}~{formatDate(range.end)})
              </span>
            ) : (
              <span>{option.label}</span>
            )}
          </button>
        )
      })}

      {/* カスタム期間トグルボタン */}
      <button
        onClick={() => setShowCustomDatePicker(!showCustomDatePicker)}
        className={`px-3 py-1.5 h-[32px] text-xs rounded-md transition-colors whitespace-nowrap flex items-center justify-center gap-1 ${
          value === 'custom'
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        {value === 'custom' && customDateRange ? (
          <span>
            カスタム ({formatDate(customDateRange.start)}~{formatDate(customDateRange.end)})
          </span>
        ) : (
          <span>カスタム</span>
        )}
        <svg
          className={`w-4 h-4 transition-transform ${showCustomDatePicker ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

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
