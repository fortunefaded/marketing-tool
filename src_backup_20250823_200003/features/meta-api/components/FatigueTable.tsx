import React from 'react'
import { FatigueData } from '../fatigue/types'

interface FatigueTableProps {
  data: FatigueData[]
}

export function FatigueTable({ data }: FatigueTableProps) {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="min-w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ad Name</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Frequency</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">CTR (%)</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">CPM ($)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {data.map(item => (
            <tr key={item.adId}>
              <td className="px-6 py-4 text-sm text-gray-900">{item.adName}</td>
              <td className="px-6 py-4 text-sm text-gray-500">{item.score}</td>
              <td className="px-6 py-4">
                <span className={`px-2 py-1 text-xs font-semibold rounded-full
                  ${item.status === 'critical' ? 'bg-red-100 text-red-800' : ''}
                  ${item.status === 'warning' ? 'bg-yellow-100 text-yellow-800' : ''}
                  ${item.status === 'caution' ? 'bg-orange-100 text-orange-800' : ''}
                  ${item.status === 'healthy' ? 'bg-green-100 text-green-800' : ''}
                `}>
                  {item.status}
                </span>
              </td>
              <td className="px-6 py-4 text-sm text-gray-500">{item.metrics.frequency.toFixed(2)}</td>
              <td className="px-6 py-4 text-sm text-gray-500">{item.metrics.ctr.toFixed(2)}</td>
              <td className="px-6 py-4 text-sm text-gray-500">{item.metrics.cpm.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}