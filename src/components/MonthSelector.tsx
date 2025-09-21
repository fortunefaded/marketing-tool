import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'

interface MonthSelectorProps {
  selectedMonth: 'last' | 'current' | 'next'
  onChange: (month: 'last' | 'current' | 'next') => void
}

export function MonthSelector({ selectedMonth, onChange }: MonthSelectorProps) {
  // 現在の月を基準に月名を取得
  const getMonthLabel = (type: 'last' | 'current' | 'next') => {
    const now = new Date()
    let targetDate = new Date(now)

    switch (type) {
      case 'last':
        targetDate.setMonth(now.getMonth() - 1)
        break
      case 'next':
        targetDate.setMonth(now.getMonth() + 1)
        break
    }

    const year = targetDate.getFullYear()
    const month = targetDate.getMonth() + 1
    return `${year}年${month}月`
  }

  const months: Array<{ value: 'last' | 'current' | 'next'; label: string }> = [
    { value: 'last', label: '先月' },
    { value: 'current', label: '今月' },
    { value: 'next', label: '来月' },
  ]

  const currentIndex = months.findIndex(m => m.value === selectedMonth)

  const handlePrevious = () => {
    if (currentIndex > 0) {
      onChange(months[currentIndex - 1].value)
    }
  }

  const handleNext = () => {
    if (currentIndex < months.length - 1) {
      onChange(months[currentIndex + 1].value)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handlePrevious}
        disabled={currentIndex === 0}
        className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <ChevronLeftIcon className="w-5 h-5" />
      </button>

      <div className="flex gap-1">
        {months.map((month) => (
          <button
            key={month.value}
            onClick={() => onChange(month.value)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              selectedMonth === month.value
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <div>{month.label}</div>
            <div className="text-xs opacity-80 mt-0.5">
              {getMonthLabel(month.value)}
            </div>
          </button>
        ))}
      </div>

      <button
        onClick={handleNext}
        disabled={currentIndex === months.length - 1}
        className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <ChevronRightIcon className="w-5 h-5" />
      </button>
    </div>
  )
}