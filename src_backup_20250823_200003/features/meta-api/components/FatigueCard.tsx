import React from 'react'
import { FatigueData } from '../fatigue/types'

interface Props {
  item: FatigueData
}

export function FatigueCard({ item }: Props) {
  const statusColors = {
    critical: 'bg-red-100 border-red-300 text-red-800',
    warning: 'bg-yellow-100 border-yellow-300 text-yellow-800',
    caution: 'bg-orange-100 border-orange-300 text-orange-800',
    healthy: 'bg-green-100 border-green-300 text-green-800'
  }
  
  return (
    <div className={`rounded-lg border p-4 ${statusColors[item.status]}`}>
      <h3 className="font-semibold text-lg mb-2">{item.adName}</h3>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <span className="font-medium">Score:</span> {item.score}
        </div>
        <div>
          <span className="font-medium">Status:</span> {item.status}
        </div>
        <div>
          <span className="font-medium">Frequency:</span> {item.metrics.frequency.toFixed(2)}
        </div>
        <div>
          <span className="font-medium">CTR:</span> {item.metrics.ctr.toFixed(2)}%
        </div>
        <div className="col-span-2">
          <span className="font-medium">CPM:</span> ${item.metrics.cpm.toFixed(2)}
        </div>
      </div>
    </div>
  )
}