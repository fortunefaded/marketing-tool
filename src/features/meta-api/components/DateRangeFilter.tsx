import { Calendar } from 'lucide-react'
import type { DateRangeFilter } from '../hooks/useAdFatigueSimplified'

interface DateRangeFilterProps {
  value: DateRangeFilter
  onChange: (value: DateRangeFilter) => void
}

export function DateRangeFilter({ value, onChange }: DateRangeFilterProps) {
  const options = [
    { label: '今日', value: 'today' as DateRangeFilter },
    { label: '昨日', value: 'yesterday' as DateRangeFilter },
    { label: '過去7日間', value: 'last_7d' as DateRangeFilter },
    { label: '過去14日間', value: 'last_14d' as DateRangeFilter },
    { label: '過去30日間', value: 'last_30d' as DateRangeFilter },
    { label: '先月', value: 'last_month' as DateRangeFilter },
    { label: '過去90日間', value: 'last_90d' as DateRangeFilter },
    { label: 'すべて', value: 'all' as DateRangeFilter }
  ]
  
  return (
    <div className="flex items-center space-x-2 bg-white rounded-lg shadow-sm border p-2">
      <Calendar className="h-4 w-4 text-gray-500" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as DateRangeFilter)}
        className="text-sm border-none focus:ring-0 cursor-pointer bg-transparent"
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}