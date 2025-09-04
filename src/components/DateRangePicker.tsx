import React, { useState } from 'react'
import DatePicker from 'react-datepicker'
import { CalendarIcon } from 'lucide-react'
import { ja } from 'date-fns/locale'

interface DateRangePickerProps {
  startDate: Date | null
  endDate: Date | null
  onChange: (start: Date | null, end: Date | null) => void
  onApply?: () => void
  isLoading?: boolean
  maxDate?: Date
  minDate?: Date
  disabled?: boolean
  className?: string
}

export function DateRangePicker({
  startDate,
  endDate,
  onChange,
  onApply,
  isLoading = false,
  maxDate = new Date(), // デフォルトは今日まで
  minDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // デフォルトは1年前まで
  disabled = false,
  className = ''
}: DateRangePickerProps) {
  const [localStartDate, setLocalStartDate] = useState<Date | null>(startDate)
  const [localEndDate, setLocalEndDate] = useState<Date | null>(endDate)
  
  // propsの変更を反映
  React.useEffect(() => {
    setLocalStartDate(startDate)
    setLocalEndDate(endDate)
  }, [startDate, endDate])

  const handleStartDateChange = (date: Date | null) => {
    setLocalStartDate(date)
    // 開始日が終了日より後の場合、終了日をリセット
    if (date && localEndDate && date > localEndDate) {
      setLocalEndDate(null)
      onChange(date, null)
    } else {
      onChange(date, localEndDate)
    }
  }

  const handleEndDateChange = (date: Date | null) => {
    setLocalEndDate(date)
    onChange(localStartDate, date)
  }

  const handleApply = () => {
    console.log('🔵 DateRangePicker: Apply button handler called', {
      localStartDate: localStartDate?.toISOString(),
      localEndDate: localEndDate?.toISOString(),
      hasOnApply: !!onApply
    })
    if (localStartDate && localEndDate) {
      // まずonChangeを呼んで親コンポーネントの状態を更新
      onChange(localStartDate, localEndDate)
      // その後、onApplyを呼ぶ
      if (onApply) {
        console.log('🔵 DateRangePicker: Calling onApply callback')
        onApply()
      }
    } else {
      console.warn('🔵 DateRangePicker: Cannot apply - missing dates', {
        hasStart: !!localStartDate,
        hasEnd: !!localEndDate
      })
    }
  }

  // クイック選択ボタン
  const setPresetRange = (days: number) => {
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - days)
    
    console.log('🔵 DateRangePicker: Quick select', {
      days,
      start: start.toISOString(),
      end: end.toISOString()
    })
    
    setLocalStartDate(start)
    setLocalEndDate(end)
    onChange(start, end)
    // クイック選択は即座に適用
    if (onApply) {
      console.log('🔵 DateRangePicker: Auto-applying quick selection')
      // setTimeoutを使って、状態更新後に確実にonApplyを呼ぶ
      setTimeout(() => onApply(), 0)
    }
  }

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="flex items-center gap-2">
        {/* 開始日 */}
        <div className="relative">
          <DatePicker
            selected={localStartDate}
            onChange={handleStartDateChange}
            selectsStart
            startDate={localStartDate}
            endDate={localEndDate}
            maxDate={maxDate}
            minDate={minDate}
            dateFormat="yyyy/MM/dd"
            locale={ja}
            placeholderText="開始日"
            disabled={disabled}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-32"
            showMonthDropdown
            showYearDropdown
            dropdownMode="select"
            popperPlacement="bottom"
            popperModifiers={[
              {
                name: 'offset',
                options: {
                  offset: [0, 8],
                },
              },
              {
                name: 'preventOverflow',
                options: {
                  rootBoundary: 'viewport',
                  tether: false,
                  altAxis: true,
                },
              },
              {
                name: 'flip',
                options: {
                  fallbackPlacements: ['top'],
                },
              },
            ]}
            withPortal
          />
          <CalendarIcon className="absolute right-2 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
        </div>

        <span className="text-gray-500">〜</span>

        {/* 終了日 */}
        <div className="relative">
          <DatePicker
            selected={localEndDate}
            onChange={handleEndDateChange}
            selectsEnd
            startDate={localStartDate}
            endDate={localEndDate}
            minDate={localStartDate || minDate}
            maxDate={maxDate}
            dateFormat="yyyy/MM/dd"
            locale={ja}
            placeholderText="終了日"
            disabled={disabled || !localStartDate}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-32"
            showMonthDropdown
            showYearDropdown
            dropdownMode="select"
            popperPlacement="bottom"
            popperModifiers={[
              {
                name: 'offset',
                options: {
                  offset: [0, 8],
                },
              },
              {
                name: 'preventOverflow',
                options: {
                  rootBoundary: 'viewport',
                  tether: false,
                  altAxis: true,
                },
              },
              {
                name: 'flip',
                options: {
                  fallbackPlacements: ['top'],
                },
              },
            ]}
            withPortal
          />
          <CalendarIcon className="absolute right-2 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
        </div>

        {/* 適用ボタン */}
        {localStartDate && localEndDate && (
          <button
            onClick={handleApply}
            disabled={isLoading}
            className={`px-4 py-2 rounded-lg text-white text-sm font-medium transition-all ${
              isLoading 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700 active:scale-95'
            }`}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                取得中...
              </span>
            ) : '適用'}
          </button>
        )}
      </div>

      {/* クイック選択 */}
      <div className="flex gap-2">
        <button
          onClick={() => setPresetRange(7)}
          className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 transition-colors"
        >
          過去7日
        </button>
        <button
          onClick={() => setPresetRange(14)}
          className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 transition-colors"
        >
          過去14日
        </button>
        <button
          onClick={() => setPresetRange(30)}
          className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 transition-colors"
        >
          過去30日
        </button>
        <button
          onClick={() => setPresetRange(90)}
          className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 transition-colors"
        >
          過去90日
        </button>
        
        {/* 選択クリア */}
        {(localStartDate || localEndDate) && (
          <button
            onClick={() => {
              setLocalStartDate(null)
              setLocalEndDate(null)
              onChange(null, null)
            }}
            className="px-3 py-1 text-xs text-red-600 border border-red-300 rounded hover:bg-red-50 transition-colors ml-auto"
          >
            クリア
          </button>
        )}
      </div>
    </div>
  )
}