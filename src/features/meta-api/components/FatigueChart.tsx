import { FatigueData } from '@/types'

interface Props {
  data: FatigueData[]
  metric: 'score' | 'frequency' | 'ctr' | 'cpm'
}

export function FatigueChart({ data, metric }: Props) {
  const getValue = (item: FatigueData) => {
    switch (metric) {
      case 'score': return item.score
      case 'frequency': return item.metrics.frequency
      case 'ctr': return item.metrics.ctr
      case 'cpm': return item.metrics.cpm
    }
  }
  
  const maxValue = Math.max(...data.map(getValue))
  const sortedData = [...data].sort((a, b) => getValue(b) - getValue(a)).slice(0, 10)
  
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-semibold mb-4">
        Top 10 by {metric.toUpperCase()}
      </h3>
      <div className="space-y-2">
        {sortedData.map((item) => {
          const value = getValue(item)
          const percentage = (value / maxValue) * 100
          
          return (
            <div key={item.adId} className="flex items-center gap-2">
              <div className="w-32 text-sm truncate">{item.adName}</div>
              <div className="flex-1 bg-gray-200 rounded-full h-4 relative">
                <div
                  className="absolute top-0 left-0 h-full bg-indigo-600 rounded-full"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <div className="w-16 text-sm text-right">
                {metric === 'cpm' ? `$${value.toFixed(2)}` : value.toFixed(2)}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}