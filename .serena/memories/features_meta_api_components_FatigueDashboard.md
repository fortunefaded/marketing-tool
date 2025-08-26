# src/features/meta-api/components/FatigueDashboard.tsx

```typescript
import React from 'react'
import { useAdFatigue } from '../hooks/useAdFatigue'

interface Props {
  accountId: string
}

export function FatigueDashboard({ accountId }: Props) {
  const { data, isLoading, error, refetch } = useAdFatigue(accountId)
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600">Error: {error.message}</p>
        <button onClick={refetch} className="mt-2 text-red-600 underline">
          Retry
        </button>
      </div>
    )
  }
  
  const stats = {
    total: data.length,
    critical: data.filter(d => d.status === 'critical').length,
    warning: data.filter(d => d.status === 'warning').length,
    healthy: data.filter(d => d.status === 'healthy').length
  }
  
  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard title="Total Ads" value={stats.total} />
        <StatCard title="Critical" value={stats.critical} color="red" />
        <StatCard title="Warning" value={stats.warning} color="yellow" />
        <StatCard title="Healthy" value={stats.healthy} color="green" />
      </div>
      
      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Ad Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Score
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Frequency
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                CTR
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {data.map((item) => (
              <tr key={item.adId}>
                <td className="px-6 py-4 text-sm text-gray-900">{item.adName}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{item.score}</td>
                <td className="px-6 py-4">
                  <StatusBadge status={item.status} />
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {item.metrics.frequency.toFixed(2)}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {item.metrics.ctr.toFixed(2)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function StatCard({ title, value, color = 'gray' }: any) {
  const colorClasses = {
    red: 'text-red-600',
    yellow: 'text-yellow-600',
    green: 'text-green-600',
    gray: 'text-gray-900'
  }
  
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <p className="text-sm text-gray-600">{title}</p>
      <p className={`text-3xl font-bold ${colorClasses[color]}`}>{value}</p>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const colors = {
    critical: 'bg-red-100 text-red-800',
    warning: 'bg-yellow-100 text-yellow-800',
    caution: 'bg-orange-100 text-orange-800',
    healthy: 'bg-green-100 text-green-800'
  }
  
  return (
    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${colors[status]}`}>
      {status}
    </span>
  )
}
```
